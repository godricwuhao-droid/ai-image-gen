from sqlalchemy import Column, BigInteger, String, DateTime, Boolean, Integer, Text, JSON
from sqlalchemy.sql import func
from ..core.database import Base


class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(64), nullable=True)
    prompt = Column(Text, nullable=False)
    tags = Column(JSON, nullable=True)
    usage_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=False)
    creator_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class SystemConfig(Base):
    __tablename__ = "system_configs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    key = Column(String(128), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(String(512), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
