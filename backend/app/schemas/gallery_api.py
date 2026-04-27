from pydantic import BaseModel, field_serializer
from datetime import datetime
from typing import Optional, List
from typing import Any


class GalleryImage(BaseModel):
    id: int
    user_id: int
    prompt: str
    size: str
    quality: str
    status: str
    images: Optional[List[Any]] = None
    likes_count: int
    views_count: int
    username: str
    user_email: str
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer('images')
    def serialize_images(self, images):
        if images is None:
            return None
        if isinstance(images, str):
            try:
                import json
                images = json.loads(images)
            except:
                return images
        
        if isinstance(images, list):
            return [
                img if isinstance(img, dict) else {"url": img, "width": 1024, "height": 1024}
                for img in images
            ]
        return images


class GalleryListResponse(BaseModel):
    images: List[GalleryImage]
    total: int
    page: int
    page_size: int


class PublishRequest(BaseModel):
    is_public: bool = True