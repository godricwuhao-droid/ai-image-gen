import logging
from typing import List
from celery import Celery
from app.tasks.celery_app import celery_app
import asyncio

logger = logging.getLogger(__name__)


def _run_async(coro):
    """在 Celery 任务中安全地运行异步代码"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    except RuntimeError as e:
        if "event loop" in str(e):
            raise RuntimeError(f"无法创建事件循环: {e}")
        raise


@celery_app.task(name="image_edit_task")
def process_image_edit(generation_id: int, user_id: int, prompt: str, images_base64: List[str], size: str, quality: str):
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import select, update
    from app.models.generation import Generation
    from app.models.user import User
    from app.models.credit_transaction import CreditTransaction
    from app.services.provider.relay_provider import ImageToImageProvider
    from app.services.provider.base import GenerateRequest
    from app.tasks.generate_image import minio_service, calculate_credits_cost, calculate_credits_cost_from_db
    from app.api.v1.endpoints.system.events import notify_generation_complete
    import uuid
    from datetime import datetime
    
    logger.info(f"[Celery-image_edit_task] 任务开始, generation_id={generation_id}, 图片数量={len(images_base64)}")
    logger.info(f"[Celery-image_edit_task] prompt: {prompt[:50]}...")
    
    async def _process():
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Generation).where(Generation.id == generation_id))
            generation = result.scalar_one_or_none()
            
            if not generation:
                logger.error(f"[Celery-image_edit_task] generation_id={generation_id} 未找到")
                return
            
            generation.status = "processing"
            await db.commit()
            
            try:
                provider = ImageToImageProvider()
                logger.info(f"[Celery-image_edit_task] 开始调用 ImageToImageProvider.generate")
                
                request_data = GenerateRequest(
                    prompt=prompt,
                    size=size,
                    quality=quality,
                    image_url=images_base64
                )
                
                response = await provider.generate(request_data)
                
                logger.info(f"[Celery-image_edit_task] 生成完成, 返回图片数量: {len(response.images)}")
                
                saved_images = []
                upload_failures = 0
                
                for idx, img_data in enumerate(response.images):
                    img_url = img_data.get("url")
                    if img_url:
                        object_name = f"edits/{user_id}/{datetime.now().strftime('%Y%m%d')}/{uuid.uuid4()}_{idx}.png"
                        saved_url, success = await minio_service.upload_from_url(img_url, object_name)
                        saved_images.append({
                            "url": saved_url,
                            "width": img_data.get("width", 1024),
                            "height": img_data.get("height", 1024),
                            "upload_success": success
                        })
                        if not success:
                            upload_failures += 1
                            logger.warning(f"[Celery] 图片{idx+1}上传MinIO失败")
                    else:
                        saved_images.append(img_data)
                
                if upload_failures > 0:
                    logger.warning(f"[Celery] 共{upload_failures}张图片上传失败")
                
                credits_cost = generation.credits_cost or await calculate_credits_cost_from_db(quality, size, 1, db)
                generation.images = saved_images
                generation.credits_cost = credits_cost
                generation.status = "completed"
                await db.commit()
                
                notify_generation_complete(
                    user_id=user_id,
                    generation_id=generation_id,
                    status="completed",
                    images=saved_images
                )
                
                logger.info(f"[Celery-image_edit_task] 任务完成, generation_id={generation_id}")
                    
            except Exception as e:
                error_msg = str(e)
                if len(error_msg) > 100:
                    error_msg = error_msg[:100] + "..."
                logger.error(f"[Celery-image_edit_task] 图片编辑失败: {error_msg}")
                generation.status = "failed"
                generation.error_message = str(e)
                await db.commit()
                
                credits_cost = generation.credits_cost or await calculate_credits_cost_from_db(quality, size, 1, db)
                
                if credits_cost > 0 and not generation.refunded:
                    await db.execute(
                        update(User)
                        .where(User.id == user_id)
                        .values(credits=User.credits + credits_cost)
                    )
                    user_result = await db.execute(select(User).where(User.id == user_id))
                    user_after = user_result.scalar_one_or_none()
                    
                    transaction = CreditTransaction(
                        user_id=user_id,
                        amount=credits_cost,
                        balance_after=user_after.credits if user_after else credits_cost,
                        transaction_type="image_edit_refund",
                        reference_type="generation",
                        reference_id=generation_id,
                        description=f"图片编辑失败返还积分: {prompt[:30]}..." if len(prompt) > 30 else f"图片编辑失败返还积分: {prompt}"
                    )
                    db.add(transaction)
                    
                    generation.refunded = True
                    await db.commit()
                    logger.info(f"[Celery-image_edit_task] 积分已返还: {credits_cost}, user_id={user_id}")
                
                try:
                    notify_generation_complete(
                        user_id=user_id,
                        generation_id=generation_id,
                        status="failed",
                        error=str(e)
                    )
                except:
                    pass
    
    # 在 Celery worker 中安全地运行异步代码
    _run_async(_process())
