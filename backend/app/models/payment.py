from sqlalchemy import Column, BigInteger, Integer, String, Boolean, DateTime, Numeric
from sqlalchemy.sql import func
from ..core.database import Base


class Package(Base):
    __tablename__ = "packages"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    credits = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    description = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())