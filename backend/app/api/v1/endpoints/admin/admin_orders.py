from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from .....core.database import get_db
from .....models.user import User
from .....models.subscription import Order
from .....schemas.order import OrderResponse, OrderListResponse
from ....deps import get_admin_user

router = APIRouter(prefix="/admin/orders", tags=["Admin Orders"])


@router.get("", response_model=OrderListResponse)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    offset = (page - 1) * page_size

    count_result = await db.execute(select(func.count(Order.id)))
    total = count_result.scalar()

    result = await db.execute(
        select(Order)
        .order_by(Order.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    orders = result.scalars().all()

    order_responses = [
        OrderResponse(
            id=order.id,
            user_id=order.user_id,
            amount=order.amount,
            payment_method=order.payment_method,
            subscription_id=order.subscription_id,
            payment_status=order.payment_status,
            transaction_id=order.transaction_id,
            created_at=order.created_at,
            updated_at=order.updated_at,
        )
        for order in orders
    ]

    return OrderListResponse(
        orders=order_responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return OrderResponse(
        id=order.id,
        user_id=order.user_id,
        amount=order.amount,
        payment_method=order.payment_method,
        subscription_id=order.subscription_id,
        payment_status=order.payment_status,
        transaction_id=order.transaction_id,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


@router.patch("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: int,
    payment_status: str,
    transaction_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    order.payment_status = payment_status
    if transaction_id:
        order.transaction_id = transaction_id

    await db.commit()
    await db.refresh(order)

    return OrderResponse(
        id=order.id,
        user_id=order.user_id,
        amount=order.amount,
        payment_method=order.payment_method,
        subscription_id=order.subscription_id,
        payment_status=order.payment_status,
        transaction_id=order.transaction_id,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    await db.delete(order)
    await db.commit()