from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    generation_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class FavoriteListResponse(BaseModel):
    favorites: List[FavoriteResponse]
    total: int
    page: int
    page_size: int


class LikeResponse(BaseModel):
    id: int
    user_id: int
    generation_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class LikeListResponse(BaseModel):
    likes: List[LikeResponse]
    total: int
    page: int
    page_size: int


class TemplateBase(BaseModel):
    name: str
    prompt: str
    category: Optional[str] = "general"
    description: Optional[str] = None
    is_public: bool = False


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    prompt: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None


class TemplateResponse(TemplateBase):
    id: int
    user_id: Optional[int] = None
    usage_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    templates: List[TemplateResponse]
    total: int
    page: int
    page_size: int