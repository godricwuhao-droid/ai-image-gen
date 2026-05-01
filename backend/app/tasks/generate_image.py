import os
import logging
import httpx
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.generation import Generation
from app.models.user import User
from app.models.credit_transaction import CreditTransaction
from app.services.provider.registry import get_provider
from app.services.provider.base import GenerateRequest
from app.tasks.celery_app import celery_app
import asyncio

logger = logging.getLogger(__name__)

# =====================================================
# 积分消耗对照表
# 基于中转站新定价文档：https://jiekou.ai/console/pricing-console
# 格式：质量 -> 尺寸 -> 积分
# =====================================================

CREDITS_MAP = {
    "low": {
        "1024x1024": 1,
        "1024x1536": 1,
        "1536x1024": 1,
        "2048x2048": 2,
        "2048x1152": 1,
        "3840x2160": 2,
        "2160x3840": 2,
    },
    "medium": {
        "1024x1024": 10,
        "1024x1536": 8,
        "1536x1024": 8,
        "2048x2048": 20,
        "2048x1152": 8,
        "3840x2160": 19,
        "2160x3840": 19,
    },
    "high": {
        "1024x1024": 40,
        "1024x1536": 32,
        "1536x1024": 32,
        "2048x2048": 81,
        "2048x1152": 32,
        "3840x2160": 76,
        "2160x3840": 76,
    },
}

# 质量映射（兼容旧版本）
QUALITY_MAP = {
    "low": "low",
    "medium": "medium",
    "high": "high",
    "standard": "medium",
    "hd": "high",
}

# 尺寸映射（兼容旧版本）
SIZE_MAP = {
    "1024x1024": "1024x1024",
    "1024x1536": "1024x1536",
    "1536x1024": "1536x1024",
    "2048x2048": "2048x2048",
    "2048x1152": "2048x1152",
    "3840x2160": "3840x2160",
    "2160x3840": "2160x3840",
    # 旧尺寸兼容
    "1024x1792": "1024x1536",
    "1792x1024": "1536x1024",
}


def calculate_credits_cost(quality: str, size: str, n: int = 1) -> int:
    """
    Calculate credits cost based on quality, size and count

    Args:
        quality: 质量等级 (low/medium/high)
        size: 尺寸 (1024x1024 等)
        n: 生成数量

    Returns:
        总积分消耗
    """
    normalized_quality = QUALITY_MAP.get(quality.lower(), "medium")
    normalized_size = SIZE_MAP.get(size, "1024x1024")

    credits_per_image = CREDITS_MAP.get(normalized_quality, {}).get(normalized_size, 10)
    return credits_per_image * n


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

    async def upload_from_url(self, url: str, object_name: str) -> tuple[str, bool]:
        """Download image from URL and upload to MinIO
        
        Returns:
            tuple: (saved_url, success_flag)
        """
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
                    logger.error(f"[MinIO] 下载图片失败: HTTP {response.status_code}, URL={url[:100]}...")
                    return url, False

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
            return saved_url, True
        except Exception as e:
            logger.error(f"[MinIO] 上传失败: {e}, URL={url[:100]}...")
            return url, False


minio_service = MinioService()


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
                upload_failures = 0
                for i, img_data in enumerate(response.images):
                    original_url = img_data.get("url")
                    if original_url:
                        object_name = f"generations/{generation.id}/{datetime.now().strftime('%Y%m%d%H%M%S')}_{i}.png"
                        saved_url, success = await minio_service.upload_from_url(original_url, object_name)
                        img_data["url"] = saved_url
                        if success:
                            logger.info(f"[Celery] 图片{i+1}已保存: {saved_url}")
                        else:
                            upload_failures += 1
                            logger.warning(f"[Celery] 图片{i+1}保存失败，使用原URL: {original_url[:50]}...")

                    images.append(img_data)

                credits_cost = generation.credits_cost or calculate_credits_cost(
                    generation.quality, generation.size, generation.n
                )
                generation.images = images
                generation.cost_usd = response.cost_usd
                generation.credits_cost = credits_cost
                generation.status = "completed"
                await db.commit()
                logger.info(f"[Celery] 生成完成, generation_id={generation_id}, status=completed, credits_cost={credits_cost}")

                try:
                    from app.api.v1.endpoints.system.events import notify_generation_complete
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
                    logger.info(f"[Celery] 用户统计更新: user_id={user_id}, daily_count={user.daily_generation_count}, total={user.total_generations}")

                    await db.commit()

            except Exception as e:
                logger.error(f"[Celery] 生成失败: {e}")
                generation.status = "failed"
                generation.error_message = str(e)
                await db.commit()

                credits_cost = generation.credits_cost or calculate_credits_cost(
                    generation.quality, generation.size, generation.n
                )

                if credits_cost > 0 and not generation.refunded:
                    result = await db.execute(
                        update(User)
                        .where(User.id == user_id)
                        .values(credits=User.credits + credits_cost)
                    )

                    user_result = await db.execute(select(User).where(User.id == user_id))
                    user_after = user_result.scalar_one_or_none()

                    transaction = CreditTransaction(
                        user_id=user_id,
                        amount=credits_cost,
                        balance_after=user_after.credits if user_after else 0,
                        transaction_type="generation_refund",
                        reference_type="generation",
                        reference_id=generation_id,
                        description=f"图片生成失败返还积分: {generation.prompt[:30]}..." if len(generation.prompt) > 30 else f"图片生成失败返还积分: {generation.prompt}"
                    )
                    db.add(transaction)

                    generation.refunded = True
                    await db.commit()
                    logger.info(f"[Celery] 积分已返还: credits_cost={credits_cost}, user_id={user_id}")
                elif generation.refunded:
                    logger.info(f"[Celery] 积分已返还过，跳过: generation_id={generation_id}")
                else:
                    logger.warning(f"[Celery] 无需返还积分: credits_cost={credits_cost}")

                try:
                    from app.api.v1.endpoints.system.events import notify_generation_complete
                    notify_generation_complete(
                        user_id=user_id,
                        generation_id=generation_id,
                        status="failed",
                        error=str(e)
                    )
                except Exception as notify_error:
                    logger.warning(f"[Celery] SSE通知失败: {notify_error}")

    asyncio.run(_process())