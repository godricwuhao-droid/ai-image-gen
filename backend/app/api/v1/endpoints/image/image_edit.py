from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import base64
import logging
from datetime import datetime
import uuid

from .....core.database import get_db
from .....models.user import User
from .....models.generation import Generation
from ....deps import get_current_user
from app.tasks.generate_image import calculate_credits_cost, minio_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/image-edit", tags=["ImageEdit"])

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def create_image_edit(
    prompt: str = Form(...),
    image: UploadFile = File(...),
    quality: str = Form("standard"),
    size: str = Form("1024x1024"),
    n: int = Form(1),
    background: str = Form("auto"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ext = image.filename.split(".")[-1].lower() if image.filename else "png"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的图片格式，支持: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    credits_needed = calculate_credits_cost(quality, n)
    
    if current_user.is_superuser:
        pass
    elif current_user.credits and current_user.credits >= credits_needed:
        pass
    else:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"积分不足，需要{credits_needed}积分，当前剩余{current_user.credits or 0}积分",
        )
    
    image_data = await image.read()
    image_base64 = base64.b64encode(image_data).decode()
    content_type = image.content_type or f"image/{ext}"
    
    generation = Generation(
        user_id=current_user.id,
        prompt=f"[图片编辑] {prompt}",
        size=size,
        quality=quality,
        n=n,
        status="processing",
        provider="image_edit",
        images=[{"original_url": f"data:{content_type};base64,{image_base64[:100]}..."}]
    )
    db.add(generation)
    await db.commit()
    await db.refresh(generation)
    
    try:
        from app.services.provider.image_edit_provider import ImageEditProvider
        from app.services.provider.image_edit_provider import ImageEditResponse
        
        provider = ImageEditProvider()
        
        class EditRequest:
            def __init__(self):
                self.prompt = prompt
                self.image_url = image_base64
                self.n = n
                self.size = size
                self.quality = quality
                self.background = background
                self.output_format = ext

        response = await provider.generate(EditRequest())
        
        saved_images = []
        for idx, img_url in enumerate(response.images):
            object_name = f"edits/{current_user.id}/{datetime.now().strftime('%Y%m%d')}/{uuid.uuid4()}_{idx}.{ext}"
            saved_url = await minio_service.upload_from_url(img_url, object_name)
            saved_images.append({"url": saved_url, "original_url": img_url})
        
        generation.images = saved_images
        generation.credits_cost = credits_needed
        generation.status = "completed"
        await db.commit()
        
        if not current_user.is_superuser and current_user.credits:
            current_user.credits = max(0, current_user.credits - credits_needed)
            await db.commit()
            logger.info(f"[ImageEdit] 扣除用户 {current_user.id} 积分: {credits_needed}, 剩余: {current_user.credits}")
        
        return {
            "success": True,
            "images": saved_images,
            "generation_id": generation.id,
            "credits_cost": credits_needed,
            "message": "图片编辑成功"
        }
    except Exception as e:
        logger.error(f"Image edit failed: {e}")
        generation.status = "failed"
        generation.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
