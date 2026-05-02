from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Dict, Optional
from .....core.database import get_db
from .....models.config import SystemConfig
from .....tasks.generate_image import DEFAULT_CREDITS_MAP, QUALITY_MAP, SIZE_MAP

router = APIRouter(prefix="/credits-config", tags=["Credits Config"])


class CreditsConfigResponse(BaseModel):
    """积分配置响应：quality -> size -> credits"""
    low: Dict[str, int]
    medium: Dict[str, int]
    high: Dict[str, int]


@router.get("", response_model=CreditsConfigResponse)
async def get_credits_config(
    db: AsyncSession = Depends(get_db),
):
    """
    获取积分消耗配置（公开接口，无需认证）
    优先从数据库读取，数据库没有则返回默认配置
    """
    # 以默认配置为基底
    config = {
        "low": dict(DEFAULT_CREDITS_MAP["low"]),
        "medium": dict(DEFAULT_CREDITS_MAP["medium"]),
        "high": dict(DEFAULT_CREDITS_MAP["high"]),
    }

    # 从数据库读取所有 credits 相关配置并覆盖
    try:
        result = await db.execute(
            select(SystemConfig).where(SystemConfig.key.like("credits_%"))
        )
        configs = result.scalars().all()

        for cfg in configs:
            if not cfg.value:
                continue
            key = cfg.key  # e.g. "credits_medium_1024x1024"
            parts = key.split("_", 2)  # ["credits", "medium", "1024x1024"]
            if len(parts) == 3:
                quality = QUALITY_MAP.get(parts[1], parts[1])
                size = SIZE_MAP.get(parts[2], parts[2])
                try:
                    value = int(cfg.value)
                    if value >= 0 and quality in config:
                        config[quality][size] = value
                except (ValueError, TypeError):
                    pass
    except Exception:
        # 数据库查询失败，返回默认配置
        pass

    return CreditsConfigResponse(**config)
