from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from .....core.database import get_db
from .....models.user import User
from .....models.generation import Generation
from ....deps import get_admin_user

router = APIRouter(prefix="/admin/generations", tags=["Admin Generations"])


class GenerationAdminResponse(BaseModel):
    id: int
    user_id: int
    prompt: str
    size: str
    quality: str
    n: int
    status: str
    images: Optional[List | dict] = None
    error_message: Optional[str] = None
    cost_usd: float
    credits_cost: int
    provider: str
    is_public: bool
    refunded: bool
    likes_count: int
    views_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: Optional[dict] = None

    class Config:
        from_attributes = True


class GenerationListResponse(BaseModel):
    generations: List[GenerationAdminResponse]
    total: int
    page: int
    page_size: int


@router.get("", response_model=GenerationListResponse)
async def list_generations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    provider: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    offset = (page - 1) * page_size

    query = select(Generation).order_by(Generation.created_at.desc())

    count_query = select(func.count(Generation.id))

    if user_id is not None:
        query = query.where(Generation.user_id == user_id)
        count_query = count_query.where(Generation.user_id == user_id)

    if status is not None:
        query = query.where(Generation.status == status)
        count_query = count_query.where(Generation.status == status)

    if provider is not None:
        query = query.where(Generation.provider == provider)
        count_query = count_query.where(Generation.provider == provider)

    if start_date is not None:
        query = query.where(Generation.created_at >= start_date)
        count_query = count_query.where(Generation.created_at >= start_date)

    if end_date is not None:
        query = query.where(Generation.created_at <= end_date)
        count_query = count_query.where(Generation.created_at <= end_date)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(
        query.offset(offset).limit(page_size)
    )
    generations = result.scalars().all()

    generation_list = []
    for gen in generations:
        user_result = await db.execute(select(User).where(User.id == gen.user_id))
        user = user_result.scalar_one_or_none()

        gen_dict = {
            "id": gen.id,
            "user_id": gen.user_id,
            "prompt": gen.prompt,
            "size": gen.size,
            "quality": gen.quality,
            "n": gen.n,
            "status": gen.status,
            "images": gen.images,
            "error_message": gen.error_message,
            "cost_usd": gen.cost_usd,
            "credits_cost": gen.credits_cost,
            "provider": gen.provider,
            "is_public": gen.is_public,
            "refunded": gen.refunded,
            "likes_count": gen.likes_count,
            "views_count": gen.views_count,
            "created_at": gen.created_at,
            "updated_at": gen.updated_at,
            "user": {
                "username": user.username if user else None,
                "email": user.email if user else None,
            } if user else None,
        }
        generation_list.append(gen_dict)

    return GenerationListResponse(
        generations=generation_list,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{generation_id}", response_model=GenerationAdminResponse)
async def get_generation(
    generation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Generation).where(Generation.id == generation_id)
    )
    generation = result.scalar_one_or_none()

    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )

    user_result = await db.execute(select(User).where(User.id == generation.user_id))
    user = user_result.scalar_one_or_none()

    return GenerationAdminResponse(
        id=generation.id,
        user_id=generation.user_id,
        prompt=generation.prompt,
        size=generation.size,
        quality=generation.quality,
        n=generation.n,
        status=generation.status,
        images=generation.images,
        error_message=generation.error_message,
        cost_usd=generation.cost_usd,
        credits_cost=generation.credits_cost,
        provider=generation.provider,
        is_public=generation.is_public,
        refunded=generation.refunded,
        likes_count=generation.likes_count,
        views_count=generation.views_count,
        created_at=generation.created_at,
        updated_at=generation.updated_at,
        user={
            "username": user.username if user else None,
            "email": user.email if user else None,
        } if user else None,
    )


@router.patch("/{generation_id}")
async def update_generation(
    generation_id: int,
    is_public: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Generation).where(Generation.id == generation_id)
    )
    generation = result.scalar_one_or_none()

    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )

    if is_public is not None:
        generation.is_public = is_public

    await db.commit()
    await db.refresh(generation)

    return generation


@router.delete("/{generation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_generation(
    generation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Generation).where(Generation.id == generation_id)
    )
    generation = result.scalar_one_or_none()

    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )

    await db.delete(generation)
    await db.commit()


@router.post("/{generation_id}/retry")
async def retry_generation(
    generation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Generation).where(Generation.id == generation_id)
    )
    generation = result.scalar_one_or_none()

    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )

    if generation.status != "failed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only failed generations can be retried",
        )

    generation.status = "pending"
    generation.error_message = None
    await db.commit()

    try:
        from .....tasks.generate_image import process_generation
        process_generation.delay(generation_id)
    except Exception as e:
        pass

    return {"message": "Generation retry scheduled"}