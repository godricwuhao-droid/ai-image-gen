from abc import ABC, abstractmethod
from pydantic import BaseModel, Field
from typing import List, Optional, Union


class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="文本提示词，最大 32000 字符")
    size: str = "1024x1024"
    quality: str = "medium"
    n: int = Field(default=1, ge=1, le=10)
    background: str = "auto"
    moderation: str = "auto"
    output_format: str = "png"
    output_compression: Optional[int] = Field(default=None, ge=0, le=100)
    image_url: Optional[Union[str, List[str]]] = Field(default=None, description="图片URL或base64，或图片数组")

    class Config:
        from_attributes = True


class ImageEditRequest(BaseModel):
    image: str = Field(..., description="要编辑的图片（URL/base64）")
    mask: Optional[str] = Field(None, description="遮罩图片（PNG 格式，带 alpha 通道）")
    prompt: str = Field(..., description="文本提示词，最大 32000 字符")
    size: str = "1024x1024"
    quality: str = "low"
    n: int = Field(default=1, ge=1, le=10)
    background: str = "auto"
    output_format: str = "png"
    output_compression: Optional[int] = Field(default=None, ge=0, le=100)

    class Config:
        from_attributes = True


class GenerateResponse(BaseModel):
    images: List[dict]
    cost_usd: float = 0.0
    provider: str


class BaseProvider(ABC):
    """Base class for third-party image generation providers"""

    @abstractmethod
    async def generate(self, req: GenerateRequest) -> GenerateResponse:
        pass

    async def image_edit(self, req: ImageEditRequest) -> GenerateResponse:
        """Optional method for image editing - override in subclass if supported"""
        raise NotImplementedError("Image edit not supported by this provider")

    @abstractmethod
    async def health_check(self) -> bool:
        pass