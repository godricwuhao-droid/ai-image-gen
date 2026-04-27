import os
import logging
from typing import List
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from .base import BaseProvider, GenerateRequest, GenerateResponse

logger = logging.getLogger(__name__)


class RelayAPIProvider(BaseProvider):
    """Image generation provider using relay API"""

    BASE_URL = os.getenv("RELAY_API_BASE_URL", "https://api.jiekou.ai/v3")

    def __init__(self):
        self.api_key = os.getenv("RELAY_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.timeout = 120

    async def health_check(self) -> bool:
        """Check if the relay API is accessible"""
        if not self.api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{self.BASE_URL}/health",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                return response.status_code == 200
        except Exception as e:
            logger.warning(f"Health check failed: {e}")
            return False

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=30))
    async def generate(self, req: GenerateRequest) -> GenerateResponse:
        """
        Generate images using the relay API
        
        Args:
            req: GenerateRequest with prompt and parameters
            
        Returns:
            GenerateResponse with generated images
            
        Note:
            - quality: standard→medium, hd→high
            - size: 1024x1792→1024x1536, 1792x1024→1536x1024
        """
        if not self.api_key:
            raise ValueError("RELAY_API_KEY not configured")

        quality_map = {
            "standard": "medium",
            "hd": "high",
            "low": "low",
            "medium": "medium",
            "high": "high"
        }
        api_quality = quality_map.get(req.quality, "medium")

        size_map = {
            "1024x1024": "1024x1024",
            "1024x1792": "1024x1536",
            "1792x1024": "1536x1024",
        }
        api_size = size_map.get(req.size, "1024x1024")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "prompt": req.prompt,
            "n": req.n,
            "size": api_size,
            "quality": api_quality,
            "background": "auto",
            "moderation": "auto",
            "output_format": "png"
        }

        logger.info(f"[RelayAPI] 请求参数: {payload}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.BASE_URL}/gpt-image-2-text-to-image",
                    headers=headers,
                    json=payload
                )

                if response.status_code == 401:
                    raise ValueError("Invalid API key")
                elif response.status_code == 429:
                    raise ValueError("Rate limit exceeded")
                elif response.status_code == 403:
                    raise ValueError("API key forbidden or invalid")
                elif response.status_code != 200:
                    raise ValueError(f"API error: {response.status_code} - {response.text}")

                data = response.json()
                logger.info(f"[RelayAPI] 响应数据: {data}")

                images = []
                if "data" in data:
                    for item in data["data"]:
                        if "url" in item:
                            images.append({
                                "url": item["url"],
                                "width": item.get("width", 1024),
                                "height": item.get("height", 1024)
                            })
                elif "images" in data:
                    for url in data["images"]:
                        if isinstance(url, str):
                            images.append({
                                "url": url,
                                "width": 1024,
                                "height": 1024
                            })

                return GenerateResponse(
                    images=images,
                    cost_usd=0.0,
                    provider="relay_api"
                )

        except httpx.TimeoutException:
            logger.error("[RelayAPI] 请求超时")
            raise ValueError("Request timeout, please try again")
        except httpx.HTTPError as e:
            logger.error(f"[RelayAPI] HTTP error: {e}")
            raise ValueError(f"Request failed: {str(e)}")


class ImageToImageProvider(BaseProvider):
    """Image to Image generation using relay API (for future extension)"""

    BASE_URL = os.getenv("RELAY_API_BASE_URL", "https://api.jiekou.ai/v3")

    def __init__(self):
        self.api_key = os.getenv("RELAY_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.timeout = 180

    async def health_check(self) -> bool:
        if not self.api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{self.BASE_URL}/health",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                return response.status_code == 200
        except Exception:
            return False

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=30))
    async def generate(self, req: GenerateRequest) -> GenerateResponse:
        """
        Generate images from image using the relay API
        
        Args:
            req: GenerateRequest with prompt and image URL
            
        Returns:
            GenerateResponse with generated images
        """
        if not self.api_key:
            raise ValueError("RELAY_API_KEY not configured")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        quality_map = {
            "standard": "medium",
            "hd": "high",
            "low": "low",
            "medium": "medium",
            "high": "high"
        }
        api_quality = quality_map.get(req.quality, "medium")

        size_map = {
            "1024x1024": "1024x1024",
            "1024x1792": "1024x1536",
            "1792x1024": "1536x1024",
        }
        api_size = size_map.get(req.size, "1024x1024")

        payload = {
            "prompt": req.prompt,
            "image": getattr(req, 'image_url', ''),
            "n": req.n,
            "size": api_size,
            "quality": api_quality,
            "output_format": "png"
        }

        logger.info(f"[ImageToImageAPI] 请求参数: {payload}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.BASE_URL}/gpt-image-2-edit",
                    headers=headers,
                    json=payload
                )

                if response.status_code != 200:
                    raise ValueError(f"API error: {response.status_code}")

                data = response.json()
                logger.info(f"[ImageToImageAPI] 响应数据: {data}")

                images = []
                if "images" in data:
                    for url in data["images"]:
                        if isinstance(url, str):
                            images.append({
                                "url": url,
                                "width": 1024,
                                "height": 1024
                            })

                return GenerateResponse(
                    images=images,
                    cost_usd=0.0,
                    provider="relay_api_image2image"
                )

        except httpx.TimeoutException:
            raise ValueError("Request timeout")
        except httpx.HTTPError as e:
            logger.error(f"[ImageToImageAPI] HTTP error: {e}")
            raise ValueError(f"Request failed: {str(e)}")
