from pydantic import BaseModel, Field, field_serializer
from datetime import datetime
from enum import Enum
from typing import Optional, Any, List
import json


class GenerationStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    size: str = Field(default="1024x1024")
    quality: str = Field(default="standard")
    n: int = Field(default=1, ge=1, le=10, description="生成数量，最多10张")


class ImageData(BaseModel):
    url: str
    width: int = 1024
    height: int = 1024


class GenerationResponse(BaseModel):
    id: int
    user_id: int
    prompt: str
    size: str
    quality: str
    n: int
    status: GenerationStatus
    images: Optional[List[Any]] = None
    error_message: Optional[str] = None
    cost_usd: float
    credits_cost: int = 0
    provider: str
    is_public: bool = False
    refunded: bool = False
    likes_count: int = 0
    views_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_serializer('images')
    def serialize_images(self, images):
        if images is None:
            return None
        if isinstance(images, str):
            try:
                images = json.loads(images)
            except:
                return images
        
        if isinstance(images, list):
            return [
                img if isinstance(img, dict) else {"url": img, "width": 1024, "height": 1024}
                for img in images
            ]
        return images

    @field_serializer('status')
    def serialize_status(self, status):
        if isinstance(status, str):
            return status
        return status.value

    class Config:
        from_attributes = True


class GenerationListResponse(BaseModel):
    generations: List[GenerationResponse]
    total: int
    page: int
    page_size: int


class GenerationUpdateRequest(BaseModel):
    is_public: Optional[bool] = None