from sqlalchemy import Column, BigInteger, String, Integer, DateTime, ForeignKey, Float, Text, JSON, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Generation(Base):
    __tablename__ = "generations"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    prompt = Column(Text, nullable=False)
    size = Column(String(50), nullable=False)
    quality = Column(String(50), nullable=False)
    n = Column(Integer, default=1)
    status = Column(String(50), default="pending")
    images = Column(JSON, nullable=True)
    cost_usd = Column(Float, default=0.0)
    credits_cost = Column(Integer, default=0)
    provider = Column(String(50), default="openai")
    error_message = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False)
    refunded = Column(Boolean, default=False)
    likes_count = Column(Integer, default=0)
    views_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    user = relationship("User", backref="generations")
