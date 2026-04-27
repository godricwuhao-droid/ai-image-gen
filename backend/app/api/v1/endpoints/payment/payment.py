from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import logging
import stripe as stripe_lib

from .....core.database import get_db
from .....models.user import User
from .....models.payment import Package
from .....models.subscription import Order
from .....models.credit_transaction import CreditTransaction
from ....deps import get_current_user

router = APIRouter(prefix="/payment", tags=["Payment"])
logger = logging.getLogger(__name__)

stripe_api_key = os.getenv("STRIPE_API_KEY")
stripe_webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
if stripe_api_key:
    stripe_lib.api_key = stripe_api_key


class PackageResponse(BaseModel):
    id: int
    name: str
    credits: int
    price: float
    description: Optional[str] = None

    class Config:
        from_attributes = True


class CreateCheckoutRequest(BaseModel):
    package_id: int
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    session_id: str
    url: str
    is_demo: bool = False


class OrderResponse(BaseModel):
    id: int
    package_id: Optional[int] = None
    amount: float
    credits: int
    payment_status: str
    stripe_session_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    orders: List[OrderResponse]
    total: int
    page: int
    page_size: int


class CreditExchangeRequest(BaseModel):
    credits: int


class CreditExchangeResponse(BaseModel):
    success: bool
    credits_used: int
    remaining_credits: int
    message: str


class ExchangeRateResponse(BaseModel):
    rate: int
    description: str
    example: str


EXCHANGE_RATE = 10
EXCHANGE_CREDITS_PER_IMAGE = 1


@router.get("/packages", response_model=List[PackageResponse])
async def get_packages(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Package).where(Package.is_active == True).order_by(Package.price.asc())
    )
    packages = result.scalars().all()
    return packages


@router.get("/exchange-rate", response_model=ExchangeRateResponse)
async def get_exchange_rate():
    return ExchangeRateResponse(
        rate=EXCHANGE_RATE,
        description=f"{EXCHANGE_RATE} 积分可兑换1次标准图片生成",
        example=f"100积分 = {100 // EXCHANGE_RATE} 次图片生成"
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    request: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pkg_result = await db.execute(
        select(Package).where(Package.id == request.package_id, Package.is_active == True)
    )
    package = pkg_result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found",
        )

    order = Order(
        user_id=current_user.id,
        package_id=package.id,
        amount=package.price,
        credits=package.credits,
        payment_status='pending',
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    if stripe_api_key:
        try:
            session = stripe_lib.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': package.name,
                            'description': f"{package.credits} credits",
                        },
                        'unit_amount': int(float(package.price) * 100),
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=request.success_url,
                cancel_url=request.cancel_url,
                customer_email=current_user.email,
                metadata={
                    'order_id': str(order.id),
                    'user_id': str(current_user.id),
                },
            )
            order.stripe_session_id = session.id
            await db.commit()
            
            return CheckoutResponse(session_id=session.id, url=session.url, is_demo=False)
        except Exception as e:
            order.payment_status = 'failed'
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Payment initialization failed: {str(e)}",
            )
    else:
        return CheckoutResponse(
            session_id=f"demo_{order.id}",
            url=f"/payment/demo-confirm?order_id={order.id}&credits={package.credits}&amount={package.price}",
            is_demo=True
        )


@router.post("/confirm-demo", response_model=dict)
async def confirm_demo_payment(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order_result = await db.execute(
        select(Order).where(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
    )
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    if order.payment_status == 'completed':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order already completed",
        )
    
    order.payment_status = 'completed'
    
    user_result = await db.execute(
        select(User).where(User.id == current_user.id)
    )
    user = user_result.scalar_one_or_none()
    if user:
        old_credits = user.credits or 0
        user.credits = old_credits + order.credits
        
        transaction = CreditTransaction(
            user_id=user.id,
            amount=order.credits,
            balance_after=user.credits,
            transaction_type="purchase",
            reference_type="order",
            reference_id=order.id,
            description=f"购买套餐获得积分: {order.credits}积分"
        )
        db.add(transaction)
        logger.info(f"[Payment] Demo payment completed, added {order.credits} credits to user {user.id}")
    
    await db.commit()
    
    return {
        "success": True,
        "message": "Payment completed",
        "credits_added": order.credits,
        "new_balance": user.credits if user else 0
    }


@router.post("/cancel-order", response_model=dict)
async def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order_result = await db.execute(
        select(Order).where(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
    )
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    order.payment_status = 'cancelled'
    await db.commit()
    
    return {"success": True, "message": "Order cancelled"}


@router.get("/my-orders", response_model=OrderListResponse)
async def get_my_orders(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    
    count_result = await db.execute(
        select(Order).where(Order.user_id == current_user.id)
    )
    total = len(count_result.scalars().all())
    
    result = await db.execute(
        select(Order)
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    orders = result.scalars().all()
    
    return OrderListResponse(
        orders=orders,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if not stripe_webhook_secret:
        logger.error("[Webhook] STRIPE_WEBHOOK_SECRET not configured, webhook ignored")
        return {"error": "Webhook secret not configured"}
    
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    if not sig_header:
        logger.warning("[Webhook] Missing stripe-signature header")
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")
    
    try:
        event = stripe_lib.Webhook.construct_event(
            payload, sig_header, stripe_webhook_secret
        )
    except ValueError:
        logger.error("[Webhook] Invalid payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe_lib.error.SignatureVerificationError:
        logger.error("[Webhook] Invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    event_type = event.get('type', '')
    data = event.get('data', {}).get('object', {})
    logger.info(f"[Webhook] Received event: {event_type}")
    
    if event_type == 'checkout.session.completed':
        session_id = data.get('id')
        if session_id:
            order_result = await db.execute(
                select(Order).where(Order.stripe_session_id == session_id)
            )
            order = order_result.scalar_one_or_none()
            if order:
                if order.payment_status == 'completed':
                    logger.warning(f"[Webhook] Order {order.id} already completed, skipping")
                else:
                    order.payment_status = 'completed'
                    
                    user_result = await db.execute(
                        select(User).where(User.id == order.user_id)
                    )
                    user = user_result.scalar_one_or_none()
                    if user:
                        old_credits = user.credits or 0
                        user.credits = old_credits + order.credits
                        
                        transaction = CreditTransaction(
                            user_id=user.id,
                            amount=order.credits,
                            balance_after=user.credits,
                            transaction_type="purchase",
                            reference_type="order",
                            reference_id=order.id,
                            description=f"Stripe支付获得积分: {order.credits}积分"
                        )
                        db.add(transaction)
                        logger.info(f"[Webhook] Credits added: user_id={user.id}, old={old_credits}, added={order.credits}, new={user.credits}")
                    
                    await db.commit()
                    logger.info(f"[Webhook] Order {order.id} completed successfully")
    
    return {"received": True}


@router.get("/order/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order_result = await db.execute(
        select(Order).where(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
    )
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    return order