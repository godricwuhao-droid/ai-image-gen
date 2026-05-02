from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from .....core.database import get_db
from .....models.user import User
from .....models.credit_transaction import CreditTransaction
from ....deps import get_current_user, get_admin_user

router = APIRouter(prefix="/credits", tags=["Credits"])
logger = logging.getLogger(__name__)


class CreditsResponse(BaseModel):
    credits: int


class AddCreditsRequest(BaseModel):
    credits: int


class CreditsTransactionResponse(BaseModel):
    id: int
    amount: int
    type: str
    description: str
    created_at: str

    class Config:
        from_attributes = True


@router.get("", response_model=CreditsResponse)
async def get_credits(
    current_user: User = Depends(get_current_user),
):
    return CreditsResponse(credits=current_user.credits or 0)


@router.post("/add", response_model=CreditsResponse)
async def add_credits(
    request: AddCreditsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can add credits",
        )
    
    if request.credits <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credits must be positive",
        )
    
    old_credits = current_user.credits or 0
    current_user.credits = old_credits + request.credits
    
    transaction = CreditTransaction(
        user_id=current_user.id,
        amount=request.credits,
        balance_after=current_user.credits,
        transaction_type="admin_add",
        reference_type="manual",
        reference_id=None,
        description=f"管理员手动增加积分: +{request.credits}积分"
    )
    db.add(transaction)
    logger.warning(f"[Credits] Admin {current_user.id} added {request.credits} credits to user {current_user.id}")
    
    await db.commit()
    
    return CreditsResponse(credits=current_user.credits)


@router.post("/deduct", response_model=CreditsResponse)
async def deduct_credits(
    request: AddCreditsRequest,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    current_credits = current_user.credits or 0
    
    if current_credits < request.credits:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient credits",
        )
    
    current_user.credits = current_credits - request.credits
    
    transaction = CreditTransaction(
        user_id=current_user.id,
        amount=-request.credits,
        balance_after=current_user.credits,
        transaction_type="admin_deduct",
        reference_type="manual",
        reference_id=None,
        description=f"管理员手动扣除积分: -{request.credits}积分"
    )
    db.add(transaction)
    logger.warning(f"[Credits] Admin {current_user.id} deducted {request.credits} credits from user {current_user.id}")
    
    await db.commit()
    
    return CreditsResponse(credits=current_user.credits)