from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from .....core.database import get_db
from .....models.user import User
from .....models.config import SystemConfig
from ....deps import get_admin_user

router = APIRouter(prefix="/admin/config", tags=["Admin Config"])


class ConfigItem(BaseModel):
    key: str
    value: Optional[str] = None
    description: Optional[str] = None


class ConfigListResponse(BaseModel):
    configs: List[ConfigItem]
    total: int


class ConfigUpdateRequest(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class ConfigCreateRequest(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


DEFAULT_CONFIGS = [
    {"key": "site_name", "value": "AI Image Generator", "description": "站点名称"},
    {"key": "default_size", "value": "1024x1024", "description": "默认图片尺寸"},
    {"key": "default_quality", "value": "standard", "description": "默认图片质量"},
    {"key": "default_n", "value": "1", "description": "默认生成数量"},
    {"key": "daily_free_generations", "value": "10", "description": "每日免费生成次数"},
    {"key": "max_prompt_length", "value": "4000", "description": "最大Prompt长度"},
    {"key": "openai_api_key", "value": "", "description": "OpenAI API Key"},
    {"key": "relay_api_key", "value": "", "description": "Relay API Key"},
    {"key": "relay_api_base_url", "value": "https://api.jiekou.ai/v3", "description": "Relay API Base URL"},
    # 价格配置 - low质量
    {"key": "price_low_1024x1024", "value": "0.0060", "description": "价格: low质量 1024x1024 (USD)"},
    {"key": "price_low_1024x1536", "value": "0.0050", "description": "价格: low质量 1024x1536 (USD)"},
    {"key": "price_low_1536x1024", "value": "0.0050", "description": "价格: low质量 1536x1024 (USD)"},
    {"key": "price_low_2048x2048", "value": "0.0119", "description": "价格: low质量 2048x2048 (USD)"},
    {"key": "price_low_2048x1152", "value": "0.0047", "description": "价格: low质量 2048x1152 (USD)"},
    {"key": "price_low_3840x2160", "value": "0.0111", "description": "价格: low质量 3840x2160 (USD)"},
    {"key": "price_low_2160x3840", "value": "0.0111", "description": "价格: low质量 2160x3840 (USD)"},
    # 价格配置 - medium质量
    {"key": "price_medium_1024x1024", "value": "0.0530", "description": "价格: medium质量 1024x1024 (USD)"},
    {"key": "price_medium_1024x1536", "value": "0.0410", "description": "价格: medium质量 1024x1536 (USD)"},
    {"key": "price_medium_1536x1024", "value": "0.0410", "description": "价格: medium质量 1536x1024 (USD)"},
    {"key": "price_medium_2048x2048", "value": "0.1070", "description": "价格: medium质量 2048x2048 (USD)"},
    {"key": "price_medium_2048x1152", "value": "0.0424", "description": "价格: medium质量 2048x1152 (USD)"},
    {"key": "price_medium_3840x2160", "value": "0.1001", "description": "价格: medium质量 3840x2160 (USD)"},
    {"key": "price_medium_2160x3840", "value": "0.1001", "description": "价格: medium质量 2160x3840 (USD)"},
    # 价格配置 - high质量
    {"key": "price_high_1024x1024", "value": "0.2110", "description": "价格: high质量 1024x1024 (USD)"},
    {"key": "price_high_1024x1536", "value": "0.1650", "description": "价格: high质量 1024x1536 (USD)"},
    {"key": "price_high_1536x1024", "value": "0.1650", "description": "价格: high质量 1536x1024 (USD)"},
    {"key": "price_high_2048x2048", "value": "0.4282", "description": "价格: high质量 2048x2048 (USD)"},
    {"key": "price_high_2048x1152", "value": "0.1695", "description": "价格: high质量 2048x1152 (USD)"},
    {"key": "price_high_3840x2160", "value": "0.4003", "description": "价格: high质量 3840x2160 (USD)"},
    {"key": "price_high_2160x3840", "value": "0.4003", "description": "价格: high质量 2160x3840 (USD)"},
    # 积分消耗配置 - low质量
    {"key": "credits_low_1024x1024", "value": "2", "description": "积分: low质量 1024x1024"},
    {"key": "credits_low_1024x1536", "value": "2", "description": "积分: low质量 1024x1536"},
    {"key": "credits_low_1536x1024", "value": "2", "description": "积分: low质量 1536x1024"},
    {"key": "credits_low_2048x2048", "value": "4", "description": "积分: low质量 2048x2048"},
    {"key": "credits_low_2048x1152", "value": "2", "description": "积分: low质量 2048x1152"},
    {"key": "credits_low_3840x2160", "value": "2", "description": "积分: low质量 3840x2160"},
    {"key": "credits_low_2160x3840", "value": "2", "description": "积分: low质量 2160x3840"},
    # 积分消耗配置 - medium质量
    {"key": "credits_medium_1024x1024", "value": "10", "description": "积分: medium质量 1024x1024"},
    {"key": "credits_medium_1024x1536", "value": "8", "description": "积分: medium质量 1024x1536"},
    {"key": "credits_medium_1536x1024", "value": "8", "description": "积分: medium质量 1536x1024"},
    {"key": "credits_medium_2048x2048", "value": "20", "description": "积分: medium质量 2048x2048"},
    {"key": "credits_medium_2048x1152", "value": "8", "description": "积分: medium质量 2048x1152"},
    {"key": "credits_medium_3840x2160", "value": "19", "description": "积分: medium质量 3840x2160"},
    {"key": "credits_medium_2160x3840", "value": "19", "description": "积分: medium质量 2160x3840"},
    # 积分消耗配置 - high质量
    {"key": "credits_high_1024x1024", "value": "40", "description": "积分: high质量 1024x1024"},
    {"key": "credits_high_1024x1536", "value": "32", "description": "积分: high质量 1024x1536"},
    {"key": "credits_high_1536x1024", "value": "32", "description": "积分: high质量 1536x1024"},
    {"key": "credits_high_2048x2048", "value": "81", "description": "积分: high质量 2048x2048"},
    {"key": "credits_high_2048x1152", "value": "32", "description": "积分: high质量 2048x1152"},
    {"key": "credits_high_3840x2160", "value": "76", "description": "积分: high质量 3840x2160"},
    {"key": "credits_high_2160x3840", "value": "76", "description": "积分: high质量 2160x3840"},
]


@router.get("", response_model=ConfigListResponse)
async def list_configs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(select(SystemConfig).order_by(SystemConfig.id))
    configs = result.scalars().all()
    
    config_list = [
        ConfigItem(
            key=c.key,
            value=c.value,
            description=c.description,
        )
        for c in configs
    ]
    
    return ConfigListResponse(
        configs=config_list,
        total=len(config_list),
    )


@router.get("/defaults")
async def get_default_configs(
    current_user: User = Depends(get_admin_user),
):
    return {"configs": DEFAULT_CONFIGS}


@router.get("/{config_key}")
async def get_config(
    config_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == config_key)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        for default_config in DEFAULT_CONFIGS:
            if default_config["key"] == config_key:
                return ConfigItem(
                    key=default_config["key"],
                    value=default_config["value"],
                    description=default_config["description"],
                )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Config not found",
        )
    
    return ConfigItem(
        key=config.key,
        value=config.value,
        description=config.description,
    )


@router.post("")
async def create_or_update_config(
    config_data: ConfigCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == config_data.key)
    )
    config = result.scalar_one_or_none()
    
    if config:
        config.value = config_data.value
        if config_data.description:
            config.description = config_data.description
    else:
        config = SystemConfig(
            key=config_data.key,
            value=config_data.value,
            description=config_data.description,
        )
        db.add(config)
    
    await db.commit()
    
    return ConfigItem(
        key=config.key,
        value=config.value,
        description=config.description,
    )


@router.patch("/{config_key}")
async def update_config(
    config_key: str,
    config_data: ConfigUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == config_key)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Config not found",
        )
    
    config.value = config_data.value
    if config_data.description is not None:
        config.description = config_data.description
    
    await db.commit()
    await db.refresh(config)
    
    return ConfigItem(
        key=config.key,
        value=config.value,
        description=config.description,
    )


@router.delete("/{config_key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(
    config_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == config_key)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Config not found",
        )
    
    await db.delete(config)
    await db.commit()


@router.post("/batch")
async def batch_update_configs(
    configs: List[ConfigUpdateRequest],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    for config_data in configs:
        result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == config_data.key)
        )
        config = result.scalar_one_or_none()
        
        if config:
            config.value = config_data.value
            if config_data.description is not None:
                config.description = config_data.description
        else:
            config = SystemConfig(
                key=config_data.key,
                value=config_data.value,
                description=config_data.description,
            )
            db.add(config)
    
    await db.commit()
    
    return {"message": "Configs updated successfully"}


@router.post("/init")
async def init_default_configs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    for default_config in DEFAULT_CONFIGS:
        result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == default_config["key"])
        )
        config = result.scalar_one_or_none()
        
        if not config:
            config = SystemConfig(
                key=default_config["key"],
                value=default_config["value"],
                description=default_config["description"],
            )
            db.add(config)
    
    await db.commit()
    
    return {"message": "Default configs initialized"}
