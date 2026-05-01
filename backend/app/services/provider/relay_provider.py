import os
import logging
import json
from typing import List, Optional
import httpx

from .base import BaseProvider, GenerateRequest, ImageEditRequest, GenerateResponse

logger = logging.getLogger(__name__)

# =====================================================
# 参数一致性原则：
# 前端 → 自有后端 → Celery Worker → relay_provider → 中转站
# 所有层级使用统一的参数值，relay_provider 仅做旧值兼容
# =====================================================

# 完整的尺寸映射表（直接传递，无需转换）
SIZE_MAP = {
    # 标准尺寸直接透传
    "1024x1024": "1024x1024",
    "1024x1536": "1024x1536",
    "1536x1024": "1536x1024",
    "2048x2048": "2048x2048",
    "2048x1152": "2048x1152",
    "3840x2160": "3840x2160",
    "2160x3840": "2160x3840",
    # 旧尺寸兼容映射（仅兼容历史数据）
    "1024x1792": "1024x1536",
    "1792x1024": "1536x1024",
}

# 质量映射（仅兼容旧版本，新版直接透传）
QUALITY_MAP = {
    # 标准值直接透传（新版）
    "low": "low",
    "medium": "medium",
    "high": "high",
    # 旧值兼容映射（兼容历史数据）
    "standard": "medium",
    "hd": "high",
}


def normalize_quality(quality: str) -> str:
    """规范化质量参数"""
    return QUALITY_MAP.get(quality, quality)


def normalize_size(size: str) -> str:
    """规范化尺寸参数"""
    return SIZE_MAP.get(size, "1024x1024")


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

    if "message" in data and isinstance(data["message"], dict):
        inner_error = data["message"].get("error", {})
        inner_code = inner_error.get("code")

        if not inner_code:
            metadata = data.get("metadata", {})
            details = metadata.get("details", {})
            if isinstance(details, dict):
                inner_code = details.get("code")

    if inner_code and inner_code in UPSTREAM_ERROR_MAP:
        return UPSTREAM_ERROR_MAP[inner_code]

    error_code = data.get("reason") or data.get("code")
    if error_code and error_code in RELAY_ERROR_MAP:
        return RELAY_ERROR_MAP[error_code]

    return HTTP_STATUS_MAP.get(status_code, "生成失败，请稍后再试")


class RelayAPIProvider(BaseProvider):
    """Image generation provider using relay API"""

    BASE_URL = os.getenv("RELAY_API_BASE_URL", "https://api.jiekou.ai")

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
            - 前端传递的 quality/size 直接透传
            - 仅在 relay_provider 内部做旧值兼容映射
        """
        if not self.api_key:
            raise ValueError("RELAY_API_KEY not configured")

        prompt = req.prompt.strip()

        api_quality = normalize_quality(req.quality)
        api_size = normalize_size(req.size)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "prompt": prompt,
            "n": req.n,
            "size": api_size,
            "quality": api_quality,
            "background": req.background,
            "moderation": req.moderation,
            "output_format": req.output_format,
        }

        if req.output_format == "jpeg" and req.output_compression is not None:
            payload["output_compression"] = req.output_compression

        logger.info(f"[RelayAPI] 请求参数: {payload}")

        logger.info(f"[RelayAPI] 请求头: {headers}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.BASE_URL}/v3/gpt-image-2-text-to-image",
                    headers=headers,
                    json=payload
                )

                logger.info(f"[RelayAPI] 响应状态: {response.status_code}")
                logger.info(f"[RelayAPI] 响应头: {dict(response.headers)}")
                logger.info(f"[RelayAPI] 响应内容: {response.text}")

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

                cost_usd = data.get("cost_usd", 0.0)

                return GenerateResponse(
                    images=images,
                    cost_usd=cost_usd,
                    provider="relay_api"
                )

        except httpx.TimeoutException:
            logger.error("[RelayAPI] 请求超时")
            raise ValueError("Request timeout, please try again")
        except httpx.HTTPError as e:
            logger.error(f"[RelayAPI] HTTP error: {e}")
            raise ValueError(f"Request failed: {str(e)}")

    async def image_edit(self, req: ImageEditRequest) -> GenerateResponse:
        """
        Edit images using the relay API

        Args:
            req: ImageEditRequest with image, mask, and prompt

        Returns:
            GenerateResponse with generated images
        """
        if not self.api_key:
            raise ValueError("RELAY_API_KEY not configured")

        api_quality = normalize_quality(req.quality)
        api_size = normalize_size(req.size)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "image": req.image,  # 支持 string | string[]
            "prompt": req.prompt,
            "size": api_size,
            "quality": api_quality,
            "background": req.background,
            "output_format": req.output_format,
        }

        if req.mask:
            payload["mask"] = req.mask

        if req.output_format == "jpeg" and req.output_compression is not None:
            payload["output_compression"] = req.output_compression

        logger.info(f"[RelayAPI-ImageEdit] 请求参数: {payload}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.BASE_URL}/v3/gpt-image-2-edit",
                    headers=headers,
                    json=payload
                )

                if response.status_code != 200:
                    user_message = parse_error_response(response.text, response.status_code)
                    logger.error(f"[RelayAPI] 图片编辑失败: {user_message}")
                    raise ValueError(user_message)

                data = response.json()
                logger.info(f"[RelayAPI-ImageEdit] 响应数据: {data}")

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

                cost_usd = data.get("cost_usd", 0.0)

                return GenerateResponse(
                    images=images,
                    cost_usd=cost_usd,
                    provider="relay_api_image_edit"
                )

        except httpx.TimeoutException:
            logger.error("[RelayAPI-ImageEdit] 请求超时")
            raise ValueError("Request timeout, please try again")
        except httpx.HTTPError as e:
            logger.error(f"[RelayAPI-ImageEdit] HTTP error: {e}")
            raise ValueError(f"Request failed: {str(e)}")


class ImageToImageProvider(BaseProvider):
    """Image to Image generation using relay API (for future extension)"""

    BASE_URL = os.getenv("RELAY_API_BASE_URL", "https://api.jiekou.ai")

    def __init__(self):
        self.api_key = os.getenv("RELAY_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.timeout = 300

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
        if not self.api_key:
            raise ValueError("RELAY_API_KEY not configured")

        api_quality = normalize_quality(req.quality)
        api_size = normalize_size(req.size)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        output_format = getattr(req, 'output_format', 'png')
        
        payload = {
            "prompt": req.prompt,
            "image": getattr(req, 'image_url', ''),
            "n": req.n,
            "size": api_size,
            "quality": api_quality,
            "output_format": output_format
        }
        
        image_list = getattr(req, 'image_url', None)
        image_count = len(image_list) if isinstance(image_list, list) else 1
        logger.info(f"[ImageToImage] 请求参数: prompt={req.prompt[:50]}..., size={api_size}, quality={api_quality}, 图片数量={image_count}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.BASE_URL}/v3/gpt-image-2-edit",
                    headers=headers,
                    json=payload
                )

                if response.status_code != 200:
                    user_message = parse_error_response(response.text, response.status_code)
                    logger.error(f"[ImageToImage] 生成失败: {user_message}")
                    raise ValueError(user_message)

                data = response.json()
                logger.info(f"[ImageToImage] 响应数据: {data}")

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
                    cost_usd=data.get("cost_usd", 0.0),
                    provider="relay_api_image2image"
                )

        except httpx.TimeoutException:
            logger.error("[ImageToImage] 请求超时")
            raise ValueError("Request timeout, please try again")
        except httpx.HTTPError as e:
            logger.error(f"[ImageToImage] HTTP error: {e}")
            raise ValueError(f"Request failed: {str(e)}")

    async def image_edit(self, req: ImageEditRequest) -> GenerateResponse:
        raise NotImplementedError("Use RelayAPIProvider.image_edit instead")