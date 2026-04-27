from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import base64
import logging

from .....core.database import get_db
from .....models.user import User
from .....models.generation import Generation
from .....schemas.generation import GenerationResponse
from ....deps import get_current_user
from app.services.provider.relay_provider import ImageToImageProvider
from app.services.provider.base import GenerateRequest
from app.tasks.generate_image import process_generation, calculate_credits_cost
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/image-edit", tags=["ImageEdit"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_image_edit(
    prompt: str = Form(...),
    image: UploadFile = File(...),
    quality: str = Form("standard"),
    size: str = Form("1024x1024"),
    n: int = Form(1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只支持图片文件"
        )
    
    image_data = await image.read()
    image_base64 = base64.b64encode(image_data).decode()
    
    if current_user.is_superuser:
        pass
    elif current_user.credits and current_user.credits > 0:
        credits_needed = calculate_credits_cost(quality, n)
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
    generation = Generation(
        user_id=current_user.id,
        prompt=f"[图片修改] {prompt}",
        size=size,
        quality=quality,
        n=n,
        status="pending",
        provider="relay_api_image_edit",
        images=[{"image_url": f"data:{image.content_type};base64,{image_base64[:100]}..."}]
    )
    db.add(generation)
    await db.commit()
    await db.refresh(generation)
    
    celery_app.send_task("image_edit_task", args=[
        generation.id, 
        current_user.id,
        prompt,
        image_base64,
        size,
        quality,
        n
    ])
    
    return {"id": generation.id, "status": "pending", "message": "图片修改任务已提交"}


@celery_app.task(name="image_edit_task")
def process_image_edit(generation_id: int, user_id: int, prompt: str, image_base64: str, size: str, quality: str, n: int):
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.generation import Generation
    from app.models.user import User
    import asyncio
    
    async def _process():
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Generation).where(Generation.id == generation_id))
            generation = result.scalar_one_or_none()
            
            if not generation:
                return
            
            generation.status = "processing"
            await db.commit()
            
            try:
                provider = ImageToImageProvider()
                request_data = GenerateRequest(
                    prompt=prompt,
                    size=size,
                    quality=quality,
                    n=n,
                    image_url=image_base64
                )
                
                response = await provider.generate(request_data)
                
                credits_cost = calculate_credits_cost(quality, n)
                generation.images = response.images
                generation.credits_cost = credits_cost
                generation.status = "completed"
                await db.commit()
                
                from app.api.v1.endpoints.events import notify_generation_complete
                notify_generation_complete(
                    user_id=user_id,
                    generation_id=generation_id,
                    status="completed",
                    images=response.images
                )
                
                user_result = await db.execute(select(User).where(User.id == user_id))
                user = user_result.scalar_one_or_none()
                if user and user.credits:
                    user.credits = max(0, user.credits - credits_cost)
                    await db.commit()
                    
            except Exception as e:
                logger.error(f"Image edit failed: {e}")
                generation.status = "failed"
                generation.error_message = str(e)
                await db.commit()
                
                try:
                    from app.api.v1.endpoints.events import notify_generation_complete
                    notify_generation_complete(
                        user_id=user_id,
                        generation_id=generation_id,
                        status="failed",
                        error=str(e)
                    )
                except:
                    pass
    
    asyncio.run(_process())