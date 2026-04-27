from sqlalchemy import Column, BigInteger, Integer, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from ..core.database import Base


class LikeRecord(Base):
    __tablename__ = "like_records"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, index=True, nullable=False)
    generation_id = Column(BigInteger, index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('user_id', 'generation_id', name='unique_user_generation_like'),
    )
