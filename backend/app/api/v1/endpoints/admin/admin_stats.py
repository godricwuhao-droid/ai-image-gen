from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta

from .....core.database import get_db
from .....models.user import User
from .....models.generation import Generation
from .....models.subscription import Order
from ....deps import get_admin_user

router = APIRouter(prefix="/admin/stats", tags=["Admin Stats"])


@router.get("")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar()

    total_generations_result = await db.execute(select(func.count(Generation.id)))
    total_generations = total_generations_result.scalar()

    total_orders_result = await db.execute(select(func.count(Order.id)))
    total_orders = total_orders_result.scalar()

    completed_orders_result = await db.execute(
        select(func.count(Order.id)).where(Order.payment_status == "completed")
    )
    total_completed_orders = completed_orders_result.scalar()

    revenue_result = await db.execute(
        select(func.sum(Order.amount)).where(Order.payment_status == "completed")
    )
    total_revenue = revenue_result.scalar() or 0.0

    pending_generations_result = await db.execute(
        select(func.count(Generation.id)).where(Generation.status == "pending")
    )
    pending_generations = pending_generations_result.scalar()

    processing_generations_result = await db.execute(
        select(func.count(Generation.id)).where(Generation.status == "processing")
    )
    processing_generations = processing_generations_result.scalar()

    completed_generations_result = await db.execute(
        select(func.count(Generation.id)).where(Generation.status == "completed")
    )
    completed_generations = completed_generations_result.scalar()

    failed_generations_result = await db.execute(
        select(func.count(Generation.id)).where(Generation.status == "failed")
    )
    failed_generations = failed_generations_result.scalar()

    last_month = datetime.utcnow() - timedelta(days=30)
    last_month_users_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= last_month)
    )
    last_month_users = last_month_users_result.scalar()

    growth_rate = (last_month_users / total_users * 100) if total_users > 0 else 0

    return {
        "total_users": total_users,
        "total_generations": total_generations,
        "total_orders": total_orders,
        "completed_orders": total_completed_orders,
        "total_revenue": float(total_revenue),
        "pending_generations": pending_generations,
        "processing_generations": processing_generations,
        "completed_generations": completed_generations,
        "failed_generations": failed_generations,
        "monthly_new_users": last_month_users,
        "growth_rate": round(growth_rate, 2),
    }