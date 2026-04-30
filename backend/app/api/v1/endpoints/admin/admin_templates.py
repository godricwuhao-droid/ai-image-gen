from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, List
from pydantic import BaseModel

from .....core.database import get_db
from .....models.user import User
from .....models.config import PromptTemplate
from ....deps import get_admin_user

router = APIRouter(prefix="/admin/templates", tags=["Admin Templates"])


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    prompt: str
    tags: Optional[List[str]] = None
    is_active: bool = True
    is_public: bool = False


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    prompt: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    prompt: str
    tags: Optional[List[str]] = None
    usage_count: int = 0
    is_active: bool = True
    is_public: bool = False
    creator_id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    templates: List[TemplateResponse]
    total: int
    page: int
    page_size: int


def template_to_response(t: PromptTemplate) -> TemplateResponse:
    return TemplateResponse(
        id=t.id,
        name=t.name,
        description=t.description,
        category=t.category,
        prompt=t.prompt,
        tags=t.tags or [],
        usage_count=t.usage_count,
        is_active=t.is_active,
        is_public=t.is_public,
        creator_id=t.creator_id,
        created_at=t.created_at.isoformat() if t.created_at else None,
        updated_at=t.updated_at.isoformat() if t.updated_at else None,
    )


@router.get("", response_model=TemplateListResponse)
async def list_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    offset = (page - 1) * page_size
    
    query = select(PromptTemplate).order_by(PromptTemplate.created_at.desc())
    count_query = select(func.count(PromptTemplate.id))
    
    if category:
        query = query.where(PromptTemplate.category == category)
        count_query = count_query.where(PromptTemplate.category == category)
    
    if is_active is not None:
        query = query.where(PromptTemplate.is_active == is_active)
        count_query = count_query.where(PromptTemplate.is_active == is_active)
    
    if search:
        search_filter = or_(
            PromptTemplate.name.ilike(f"%{search}%"),
            PromptTemplate.description.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    result = await db.execute(
        query.offset(offset).limit(page_size)
    )
    templates = result.scalars().all()
    
    return TemplateListResponse(
        templates=[template_to_response(t) for t in templates],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(PromptTemplate).where(PromptTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    return template_to_response(template)


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    template = PromptTemplate(
        name=template_data.name,
        description=template_data.description,
        category=template_data.category,
        prompt=template_data.prompt,
        tags=template_data.tags,
        is_active=template_data.is_active,
        is_public=template_data.is_public,
        creator_id=current_user.id,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    
    return template_to_response(template)


@router.patch("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    template_data: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(PromptTemplate).where(PromptTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    update_dict = template_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if value is not None:
            setattr(template, field, value)
    
    await db.commit()
    await db.refresh(template)
    
    return template_to_response(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(PromptTemplate).where(PromptTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    await db.delete(template)
    await db.commit()
