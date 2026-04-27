from sqlalchemy import Column, BigInteger, Integer, Boolean, DateTime, ForeignKey, Text, String
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    generation_id = Column(BigInteger, ForeignKey("generations.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", backref="favorites")
    generation = relationship("Generation", backref="favorited_by")

    __table_args__ = (
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}
    )


class Like(Base):
    __tablename__ = "likes"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    generation_id = Column(BigInteger, ForeignKey("generations.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", backref="likes")
    generation = relationship("Generation", backref="liked_by")

    __table_args__ = (
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}
    )


class Template(Base):
    __tablename__ = "templates"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    name = Column(String(100), nullable=False)
    prompt = Column(Text, nullable=False)
    category = Column(String(50), default="general")
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", backref="templates")

    __table_args__ = (
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}
    )