from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from .....core.database import get_db
from .....models.user import User
from .....models.credit_transaction import CreditTransaction
from ....deps import get_admin_user

router = APIRouter(prefix="/admin/credits", tags=["Admin Credits"])


class UserCreditResponse(BaseModel):
    id: int
    email: str
    username: str
    credits: int
    daily_generation_count: int
    total_generations: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreditListResponse(BaseModel):
    users: List[UserCreditResponse]
    total: int
    page: int
    page_size: int


class CreditTransactionResponse(BaseModel):
    id: int
    user_id: int
    amount: int
    balance_after: int
    transaction_type: str
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    transactions: List[CreditTransactionResponse]
    total: int
    page: int
    page_size: int


class RechargeRequest(BaseModel):
    user_id: int
    amount: int
    description: Optional[str] = None


@router.get("", response_model=UserCreditListResponse)
async def list_user_credits(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    offset = (page - 1) * page_size

    count_result = await db.execute(select(func.count(User.id)))
    total = count_result.scalar()

    result = await db.execute(
        select(User)
        .order_by(User.credits.desc())
        .offset(offset)
        .limit(page_size)
    )
    users = result.scalars().all()

    user_responses = [
        UserCreditResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            credits=user.credits,
            daily_generation_count=user.daily_generation_count,
            total_generations=user.total_generations,
            created_at=user.created_at,
        )
        for user in users
    ]

    return UserCreditListResponse(
        users=user_responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/transactions", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    offset = (page - 1) * page_size

    query = select(CreditTransaction).order_by(CreditTransaction.created_at.desc())
    count_query = select(func.count(CreditTransaction.id))

    if user_id is not None:
        query = query.where(CreditTransaction.user_id == user_id)
        count_query = count_query.where(CreditTransaction.user_id == user_id)

    if transaction_type is not None:
        query = query.where(CreditTransaction.transaction_type == transaction_type)
        count_query = count_query.where(CreditTransaction.transaction_type == transaction_type)

    if start_date is not None:
        query = query.where(CreditTransaction.created_at >= start_date)
        count_query = count_query.where(CreditTransaction.created_at >= start_date)

    if end_date is not None:
        query = query.where(CreditTransaction.created_at <= end_date)
        count_query = count_query.where(CreditTransaction.created_at <= end_date)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(
        query.offset(offset).limit(page_size)
    )
    transactions = result.scalars().all()

    transaction_responses = [
        CreditTransactionResponse(
            id=tx.id,
            user_id=tx.user_id,
            amount=tx.amount,
            balance_after=tx.balance_after,
            transaction_type=tx.transaction_type,
            reference_type=tx.reference_type,
            reference_id=tx.reference_id,
            description=tx.description,
            created_at=tx.created_at,
        )
        for tx in transactions
    ]

    return TransactionListResponse(
        transactions=transaction_responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/recharge")
async def recharge_credits(
    request: RechargeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    if request.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive",
        )

    result = await db.execute(select(User).where(User.id == request.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    old_credits = user.credits
    user.credits = user.credits + request.amount

    transaction = CreditTransaction(
        user_id=user.id,
        amount=request.amount,
        balance_after=user.credits,
        transaction_type="admin_recharge",
        description=request.description or f"Admin recharge by user {current_user.id}",
    )
    db.add(transaction)

    await db.commit()
    await db.refresh(user)

    return {
        "message": "Credits recharged successfully",
        "user_id": user.id,
        "old_credits": old_credits,
        "new_credits": user.credits,
        "amount_added": request.amount,
    }


@router.post("/deduct")
async def deduct_credits(
    request: RechargeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    if request.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive",
        )

    result = await db.execute(select(User).where(User.id == request.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.credits < request.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient credits",
        )

    old_credits = user.credits
    user.credits = user.credits - request.amount

    transaction = CreditTransaction(
        user_id=user.id,
        amount=-request.amount,
        balance_after=user.credits,
        transaction_type="admin_deduct",
        description=request.description or f"Admin deduct by user {current_user.id}",
    )
    db.add(transaction)

    await db.commit()
    await db.refresh(user)

    return {
        "message": "Credits deducted successfully",
        "user_id": user.id,
        "old_credits": old_credits,
        "new_credits": user.credits,
        "amount_deducted": request.amount,
    }


@router.get("/user/{user_id}")
async def get_user_credits(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    tx_result = await db.execute(
        select(CreditTransaction)
        .where(CreditTransaction.user_id == user_id)
        .order_by(CreditTransaction.created_at.desc())
        .limit(50)
    )
    transactions = tx_result.scalars().all()

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "credits": user.credits,
            "daily_generation_count": user.daily_generation_count,
            "total_generations": user.total_generations,
        },
        "recent_transactions": [
            {
                "id": tx.id,
                "amount": tx.amount,
                "balance_after": tx.balance_after,
                "transaction_type": tx.transaction_type,
                "description": tx.description,
                "created_at": tx.created_at,
            }
            for tx in transactions
        ],
    }