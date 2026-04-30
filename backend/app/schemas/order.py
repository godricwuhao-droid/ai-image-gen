from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class OrderBase(BaseModel):
    user_id: int
    amount: float
    payment_method: Optional[str] = None


class OrderCreate(OrderBase):
    subscription_id: Optional[int] = None


class OrderUpdate(BaseModel):
    payment_status: Optional[str] = None
    transaction_id: Optional[str] = None


class OrderResponse(OrderBase):
    id: int
    subscription_id: Optional[int]
    payment_status: str
    transaction_id: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    orders: list[OrderResponse]
    total: int
    page: int
    page_size: int