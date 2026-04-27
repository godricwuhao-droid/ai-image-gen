import os
import logging
import httpx
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.generation import Generation
from app.models.user import User
from app.services.provider.registry import get_provider
from app.services.provider.base import GenerateRequest
from app.tasks.celery_app import celery_app
import asyncio

logger = logging.getLogger(__name__)


CREDITS_COST_MAP = {
    "low": 1,
    "standard": 10,
    "medium": 10,
    "hd": 40,
    "high": 40,
}


class MinioService:
    """MinIO service for image storage"""
    
    def __init__(self):
        self.endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000").replace("http://", "").replace("https://", "")
        self.public_url = os.getenv("MINIO_PUBLIC_URL", "http://localhost:9000")
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.bucket = os.getenv("MINIO_BUCKET", "ai-images")
        self.client = None
    
    def get_client(self):
        if self.client is None:
            from minio import Minio
            self.client = Minio(
                self.endpoint,
                access_key=self.access_key,
                secret_key=self.secret_key,
                secure=False
            )
        return self.client
    
    async def upload_from_url(self, url: str, object_name: str) -> str:
        """Download image from URL and upload to MinIO"""
        try:
            client = self.get_client()
            
            try:
                bucket_exists = client.bucket_exists(self.bucket)
                if not bucket_exists:
                    client.make_bucket(self.bucket)
            except Exception:
                pass
            
            async with httpx.AsyncClient(timeout=60) as http_client:
                response = await http_client.get(url)
                if response.status_code != 200:
                    logger.warning(f"Failed to download image: {response.status_code}, using original URL")
                    return url
                
                image_data = response.content
                content_type = response.headers.get("content-type", "image/png")
            
            from io import BytesIO
            client.put_object(
                self.bucket,
                object_name,
                BytesIO(image_data),
                len(image_data),
                content_type=content_type
            )
            
            saved_url = f"{self.public_url}/{self.bucket}/{object_name}"
            logger.info(f"[MinIO] 图片已保存: {saved_url}")
            return saved_url
        except Exception as e:
            logger.error(f"[MinIO] 上传失败: {e}")
            return url


minio_service = MinioService()


def calculate_credits_cost(quality: str, n: int) -> int:
    """Calculate credits cost based on quality and count"""
    base_cost = CREDITS_COST_MAP.get(quality.lower(), 2)
    return base_cost * n


@celery_app.task(name="generate_image")
def process_generation(generation_id: int, user_id: int, provider_name: str = "openai"):
    from app.core.database import AsyncSessionLocal

    async def _process():
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Generation).where(Generation.id == generation_id))
            generation = result.scalar_one_or_none()

            if not generation:
                return

            generation.status = "processing"
            await db.commit()

            try:
                provider = get_provider(provider_name)
                logger.info(f"[Celery] 开始生成图片, generation_id={generation_id}, prompt={generation.prompt}")

                request_data = {
                    "prompt": generation.prompt,
                    "size": generation.size,
                    "quality": generation.quality,
                    "n": generation.n,
                }
                logger.info(f"[Celery] 请求参数: {request_data}")

                response = await provider.generate(GenerateRequest(**request_data))
                logger.info(f"[Celery] API响应成功, images count={len(response.images)}")

                images = []
                for i, img_data in enumerate(response.images):
                    original_url = img_data.get("url")
                    if original_url:
                        object_name = f"generations/{generation.id}/{datetime.now().strftime('%Y%m%d%H%M%S')}_{i}.png"
                        try:
                            saved_url = await minio_service.upload_from_url(original_url, object_name)
                            img_data["url"] = saved_url
                            logger.info(f"[Celery] 图片{i+1}已处理: {saved_url}")
                        except Exception as e:
                            logger.warning(f"[Celery] 图片保存失败: {e}")
                            img_data["url"] = original_url
                    
                    images.append(img_data)

                credits_cost = calculate_credits_cost(generation.quality, generation.n)
                generation.images = images
                generation.cost_usd = response.cost_usd
                generation.credits_cost = credits_cost
                generation.status = "completed"
                await db.commit()
                logger.info(f"[Celery] 生成完成, generation_id={generation_id}, status=completed, credits_cost={credits_cost}")

                try:
                    from app.api.v1.endpoints.events import notify_generation_complete
                    notify_generation_complete(
                        user_id=user_id,
                        generation_id=generation_id,
                        status="completed",
                        images=images
                    )
                except Exception as e:
                    logger.warning(f"[Celery] SSE通知失败: {e}")

                user_result = await db.execute(select(User).where(User.id == user_id))
                user = user_result.scalar_one_or_none()
                if user:
                    today = date.today()
                    if user.last_generation_date and user.last_generation_date.date() == today:
                        user.daily_generation_count += generation.n
                    else:
                        user.daily_generation_count = generation.n
                    user.last_generation_date = datetime.utcnow()
                    user.total_generations += generation.n
                    
                    if credits_cost > 0:
                        if user.credits and user.credits >= credits_cost:
                            user.credits = user.credits - credits_cost
                            logger.info(f"[Celery] 扣除用户积分: {credits_cost}, 剩余: {user.credits}")
                        else:
                            logger.warning(f"[Celery] 用户积分不足: 需要{credits_cost}, 已有{user.credits}")
                    
                    await db.commit()

            except Exception as e:
                logger.error(f"[Celery] 生成失败: {e}")
                generation.status = "failed"
                generation.error_message = str(e)
                await db.commit()
                
                if not generation.refunded:
                    credits_cost = calculate_credits_cost(generation.quality, generation.n)
                    
                    user_result = await db.execute(select(User).where(User.id == user_id))
                    user = user_result.scalar_one_or_none()
                    
                    if user:
                        user.credits = (user.credits or 0) + credits_cost
                        generation.refunded = True
                        logger.info(f"[Celery] 自动返还积分: {credits_cost}, 用户剩余积分: {user.credits}")
                    
                    await db.commit()
                
                try:
                    from app.api.v1.endpoints.events import notify_generation_complete
                    notify_generation_complete(
                        user_id=user_id,
                        generation_id=generation_id,
                        status="failed",
                        error=str(e)
                    )
                except Exception as notify_error:
                    logger.warning(f"[Celery] SSE通知失败: {notify_error}")

    asyncio.run(_process())