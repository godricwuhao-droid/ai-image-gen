import os
import logging
import json
from typing import List
import httpx

from .base import BaseProvider, GenerateRequest, GenerateResponse

logger = logging.getLogger(__name__)

# 中转站官方错误码映射
RELAY_ERROR_MAP = {
    "INVALID_API_KEY": "API密钥无效，请联系管理员",
    "MODEL_NOT_FOUND": "服务配置错误，请联系管理员",
    "FAILED_TO_AUTH": "认证失败，请联系管理员",
    "NOT_ENOUGH_BALANCE": "账户余额不足，请联系管理员",
    "INVALID_REQUEST_BODY": "请求格式有误，请重试",
    "RATE_LIMIT_EXCEEDED": "请求过于频繁，请稍后再试",
    "TOKEN_LIMIT_EXCEEDED": "内容过长，请缩短提示词后重试",
    "SERVICE_NOT_AVAILABLE": "AI服务暂时不可用，请稍后再试",
    "ACCESS_DENY": "无权限访问，请联系管理员",
}

# 上游服务错误码映射
UPSTREAM_ERROR_MAP = {
    "moderation_blocked": "您的内容包含敏感信息，请修改提示词后重试",
    "NoCapacity": "AI服务当前负载较高，请稍后再试",
}

# HTTP状态码默认映射
HTTP_STATUS_MAP = {
    400: "请求参数有误，请重试",
    401: "认证失败，请联系管理员",
    403: "账户权限受限，请联系管理员",
    404: "服务配置错误，请联系管理员",
    429: "请求过于频繁，请稍后再试",
    500: "服务端暂时不可用，请稍后再试",
    502: "服务暂时不可用，请稍后再试",
    503: "服务暂时不可用，请稍后再试",
    504: "服务响应超时，请稍后再试",
}


def parse_error_response(response_text: str, status_code: int) -> str:
    """解析错误响应，返回用户友好的提示"""
    try:
        data = json.loads(response_text)
    except json.JSONDecodeError:
        return HTTP_STATUS_MAP.get(status_code, "服务暂时不可用，请稍后再试")
    
    error_code = None
    inner_code = None
    
    # 首先检查内层错误码（上游服务的错误）
    if "message" in data and isinstance(data["message"], dict):
        inner_error = data["message"].get("error", {})
        inner_code = inner_error.get("code")
        
        if not inner_code:
            metadata = data.get("metadata", {})
            details = metadata.get("details", {})
            if isinstance(details, dict):
                inner_code = details.get("code")
    
    # 优先检查上游服务错误码
    if inner_code and inner_code in UPSTREAM_ERROR_MAP:
        return UPSTREAM_ERROR_MAP[inner_code]
    
    # 检查中转站官方错误码
    error_code = data.get("reason") or data.get("code")
    if error_code and error_code in RELAY_ERROR_MAP:
        return RELAY_ERROR_MAP[error_code]
    
    return HTTP_STATUS_MAP.get(status_code, "生成失败，请稍后再试")


class RelayAPIProvider(BaseProvider):
    """Image generation provider using relay API"""

    BASE_URL = os.getenv("RELAY_API_BASE_URL", "https://api.jiekou.ai/v3")

    def __init__(self):
        self.api_key = os.getenv("RELAY_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.timeout = 300

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

        prompt = req.prompt.strip()
        
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
            "1536x1024": "1536x1024",
        }
        api_size = size_map.get(req.size, "1024x1024")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "prompt": prompt,
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

                if response.status_code != 200:
                    user_message = parse_error_response(response.text, response.status_code)
                    logger.error(f"[RelayAPI] 生成失败: {user_message}")
                    raise ValueError(user_message)

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
            "1536x1024": "1536x1024",
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
