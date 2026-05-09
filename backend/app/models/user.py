from sqlalchemy import Column, BigInteger, Integer, String, Boolean, DateTime, Text, SmallInteger
from sqlalchemy.sql import func
from ..core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(64), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    credits = Column(Integer, default=0)
    daily_generation_count = Column(Integer, default=0)
    last_generation_date = Column(DateTime, nullable=True)
    total_generations = Column(Integer, default=0)
