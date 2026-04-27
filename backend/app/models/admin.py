from sqlalchemy import Column, BigInteger, String, DateTime, Boolean, ForeignKey, Table, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base

admin_roles = Table(
    'admin_roles',
    Base.metadata,
    Column('admin_id', BigInteger, ForeignKey('admins.id')),
    Column('role_id', BigInteger, ForeignKey('roles.id'))
)

role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', BigInteger, ForeignKey('roles.id')),
    Column('permission_id', BigInteger, ForeignKey('permissions.id'))
)


class Admin(Base):
    __tablename__ = "admins"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    real_name = Column(String(64), nullable=True)
    status = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    roles = relationship("Role", secondary=admin_roles, back_populates="admins")


class Role(Base):
    __tablename__ = "roles"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    name = Column(String(64), unique=True, nullable=False)
    display_name = Column(String(128), nullable=False)
    description = Column(String(512), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    admins = relationship("Admin", secondary=admin_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    code = Column(String(128), unique=True, nullable=False)
    name = Column(String(128), nullable=False)
    module = Column(String(64), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")
