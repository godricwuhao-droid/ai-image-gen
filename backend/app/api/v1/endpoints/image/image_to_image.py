from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import base64
import logging

from .....core.database import get_db
from .....models.user import User
from .....models.generation import Generation
from ....deps import get_current_user
from app.tasks.generate_image import calculate_credits_cost
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/image-to-image", tags=["ImageToImage"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_image_edit(
    prompt: str = Form(...),
    image: List[UploadFile] = File(...),
    quality: str = Form("low"),
    size: str = Form("1024x1024"),
    background: str = Form("auto"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请上传至少一张图片"
        )
    
    for img in image:
        if not img.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"文件 {img.filename} 不是图片类型"
            )
    
    images_base64 = []
    for img in image:
        image_data = await img.read()
        image_base64 = base64.b64encode(image_data).decode()
        images_base64.append(f"data:{img.content_type};base64,{image_base64}")
    
    credits_needed = calculate_credits_cost(quality, size, 1)
    
    if not current_user.is_superuser:
        if current_user.credits and current_user.credits > 0:
            if current_user.credits < credits_needed:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"积分不足，需要{credits_needed}积分，当前剩余{current_user.credits}积分",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="积分不足，请充值后重试",
            )
    
    from app.models.generation import Generation
    preview_images = [{"original_url": f"已上传 {len(images_base64)} 张图片"}]
    generation = Generation(
        user_id=current_user.id,
        prompt=f"[图片编辑] {prompt}",
        size=size,
        quality=quality,
        n=1,
        status="pending",
        provider="relay_api_image_edit",
        images=preview_images,
        credits_cost=credits_needed
    )
    db.add(generation)
    
    current_user.credits = max(0, current_user.credits - credits_needed)
    
    await db.commit()
    await db.refresh(generation)
    
    logger.info(f"[API] 开始发送任务 image_edit_task, generation_id={generation.id}")
    logger.info(f"[API] 图片数量: {len(images_base64)}")
    result = celery_app.send_task("image_edit_task", args=[
        generation.id, 
        current_user.id,
        prompt,
        images_base64,
        size,
        quality,
    ])
    logger.info(f"[API] 任务已发送, task_id={result.id}")
    
    return {"success": True, "generation_id": generation.id, "status": "pending", "message": f"图片编辑任务已提交"}
