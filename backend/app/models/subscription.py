from sqlalchemy import Column, BigInteger, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    plan = Column(String(50), nullable=False)
    credits = Column(Integer, default=0)
    status = Column(String(50), default="active")
    start_date = Column(DateTime, server_default=func.now())
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    user = relationship("User", backref="subscriptions")


class Order(Base):
    __tablename__ = "orders"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    subscription_id = Column(BigInteger, ForeignKey("subscriptions.id"), nullable=True)
    package_id = Column(BigInteger, nullable=True)
    amount = Column(Float, nullable=False)
    credits = Column(Integer, default=0)
    payment_method = Column(String(50), nullable=True)
    payment_status = Column(String(50), default="pending")
    transaction_id = Column(String(128), nullable=True)
    stripe_session_id = Column(String(255), nullable=True)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    user = relationship("User", backref="orders")
