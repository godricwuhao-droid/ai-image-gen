import logging
import httpx
import os
from typing import Optional, List

logger = logging.getLogger(__name__)


class ImageEditResponse:
    def __init__(self, images: List[str], background: str = None, size: str = None, 
                 quality: str = None, output_format: str = None, cost_usd: float = 0.0):
        self.images = images
        self.background = background
        self.size = size
        self.quality = quality
        self.output_format = output_format
        self.cost_usd = cost_usd


class ImageEditProvider:
    BASE_URL = os.getenv("RELAY_API_BASE_URL", "https://api.jiekou.ai/v3")

    def __init__(self):
        self.api_key = os.getenv("RELAY_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.timeout = 180

    async def generate(self, request) -> ImageEditResponse:
        if not self.api_key:
            raise ValueError("RELAY_API_KEY not configured")

        quality_map = {
            "standard": "medium",
            "hd": "high",
            "low": "low",
            "medium": "medium",
            "high": "high"
        }
        api_quality = quality_map.get(request.quality, "medium")

        size_map = {
            "1024x1024": "1024x1024",
            "1024x1792": "1024x1536",
            "1792x1024": "1536x1024",
            "auto": "1024x1024"
        }
        api_size = size_map.get(request.size, "1024x1024")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "prompt": request.prompt,
            "image": request.image_url,
            "n": request.n,
            "size": api_size,
            "quality": api_quality,
            "background": getattr(request, 'background', 'auto'),
            "output_format": getattr(request, 'output_format', 'png'),
        }

        logger.info(f"[ImageEdit] 请求参数: {payload}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.BASE_URL}/gpt-image-2-edit",
                json=payload,
                headers=headers
            )

            if response.status_code != 200:
                logger.error(f"[ImageEdit] API错误: {response.status_code} - {response.text}")
                raise ValueError(f"API错误: {response.status_code}")

            data = response.json()
            logger.info(f"[ImageEdit] 响应: {data}")

            return ImageEditResponse(
                images=data.get("images", []),
                background=data.get("background"),
                size=data.get("size"),
                quality=data.get("quality"),
                output_format=data.get("output_format"),
                cost_usd=0.0
            )
