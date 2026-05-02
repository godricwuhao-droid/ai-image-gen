#!/usr/bin/env python3
"""
创建测试管理员账号脚本
"""

import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal, get_db
from app.core.security import get_password_hash
from app.models.user import User
from sqlalchemy import select


async def create_admin_user():
    """创建测试管理员账号"""
    email = "admin@example.com"
    username = "admin"
    password = "admin123"
    
    async with AsyncSessionLocal() as db:
        # 检查是否已存在
        result = await db.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            # 更新为超级管理员
            existing_user.is_superuser = True
            existing_user.is_active = True
            await db.commit()
            print(f"✅ 用户已存在，已更新为超级管理员")
            print(f"   邮箱: {email}")
            print(f"   用户名: {username}")
            print(f"   密码: {password}")
        else:
            # 创建新用户
            user = User(
                email=email,
                username=username,
                hashed_password=get_password_hash(password),
                is_superuser=True,
                is_active=True,
                credits=1000,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            print(f"✅ 管理员账号创建成功")
            print(f"   用户ID: {user.id}")
            print(f"   邮箱: {email}")
            print(f"   用户名: {username}")
            print(f"   密码: {password}")
            print(f"   超级管理员: {user.is_superuser}")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🔧 创建测试管理员账号")
    print("="*60)
    
    asyncio.run(create_admin_user())
    
    print("\n" + "="*60)
    print("📝 测试账号信息")
    print("="*60)
    print("   邮箱: admin@example.com")
    print("   密码: admin123")
    print("="*60 + "\n")