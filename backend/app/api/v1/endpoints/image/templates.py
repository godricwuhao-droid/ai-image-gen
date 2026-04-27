from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from .....core.database import get_db
from .....models.user import User
from .....models.gallery import Template
from .....schemas.gallery import (
    TemplateCreate, TemplateUpdate, TemplateResponse, TemplateListResponse
)
from ....deps import get_current_user

router = APIRouter(prefix="/templates", tags=["Templates"])


@router.get("", response_model=TemplateListResponse)
async def get_public_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str = None,
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size

    query = select(Template).where(Template.is_public == True)
    if category:
        query = query.where(Template.category == category)

    count_query = select(func.count(Template.id)).where(Template.is_public == True)
    if category:
        count_query = count_query.where(Template.category == category)
    count_result = await db.execute(count_query)
    total = count_result.scalar()

    query = query.order_by(Template.usage_count.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    templates = result.scalars().all()

    return TemplateListResponse(
        templates=list(templates),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    template = Template(
        user_id=current_user.id,
        name=template_data.name,
        prompt=template_data.prompt,
        category=template_data.category,
        description=template_data.description,
        is_public=template_data.is_public,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)

    return template


router_my = APIRouter(prefix="/my-templates", tags=["My Templates"])


@router_my.get("", response_model=TemplateListResponse)
async def get_my_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size

    count_result = await db.execute(
        select(func.count(Template.id)).where(Template.user_id == current_user.id)
    )
    total = count_result.scalar()

    result = await db.execute(
        select(Template)
        .where(Template.user_id == current_user.id)
        .order_by(Template.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    templates = result.scalars().all()

    return TemplateListResponse(
        templates=list(templates),
        total=total,
        page=page,
        page_size=page_size,
    )


@router_my.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    template_data: TemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Template).where(
            Template.id == template_id,
            Template.user_id == current_user.id
        )
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    if template_data.name is not None:
        template.name = template_data.name
    if template_data.prompt is not None:
        template.prompt = template_data.prompt
    if template_data.category is not None:
        template.category = template_data.category
    if template_data.description is not None:
        template.description = template_data.description
    if template_data.is_public is not None:
        template.is_public = template_data.is_public

    await db.commit()
    await db.refresh(template)

    return template


@router_my.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Template).where(
            Template.id == template_id,
            Template.user_id == current_user.id
        )
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    await db.delete(template)
    await db.commit()