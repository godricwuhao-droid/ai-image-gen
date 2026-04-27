from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from datetime import datetime

from .....core.database import get_db
from .....models.user import User
from .....models.generation import Generation
from .....models.gallery import Favorite, Like
from .....schemas.gallery import (
    FavoriteResponse, FavoriteListResponse,
    LikeResponse, LikeListResponse
)
from ....deps import get_current_user

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.get("", response_model=FavoriteListResponse)
async def get_my_favorites(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size

    count_result = await db.execute(
        select(func.count(Favorite.id)).where(Favorite.user_id == current_user.id)
    )
    total = count_result.scalar()

    result = await db.execute(
        select(Favorite)
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    favorites = result.scalars().all()

    return FavoriteListResponse(
        favorites=list(favorites),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    generation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.generation_id == generation_id
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already favorited",
        )

    favorite = Favorite(
        user_id=current_user.id,
        generation_id=generation_id
    )
    db.add(favorite)
    await db.commit()
    await db.refresh(favorite)

    return favorite


@router.delete("/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    favorite_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Favorite).where(
            Favorite.id == favorite_id,
            Favorite.user_id == current_user.id
        )
    )
    favorite = result.scalar_one_or_none()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )

    await db.delete(favorite)
    await db.commit()


@router.delete("/by-generation/{generation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite_by_generation(
    generation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Favorite).where(
            Favorite.generation_id == generation_id,
            Favorite.user_id == current_user.id
        )
    )
    favorite = result.scalar_one_or_none()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )

    await db.delete(favorite)
    await db.commit()


router_likes = APIRouter(prefix="/likes", tags=["Likes"])


@router_likes.get("", response_model=LikeListResponse)
async def get_my_likes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size

    count_result = await db.execute(
        select(func.count(Like.id)).where(Like.user_id == current_user.id)
    )
    total = count_result.scalar()

    result = await db.execute(
        select(Like)
        .where(Like.user_id == current_user.id)
        .order_by(Like.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    likes = result.scalars().all()

    return LikeListResponse(
        likes=list(likes),
        total=total,
        page=page,
        page_size=page_size,
    )


@router_likes.post("", response_model=LikeResponse, status_code=status.HTTP_201_CREATED)
async def add_like(
    generation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Like).where(
            Like.user_id == current_user.id,
            Like.generation_id == generation_id
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already liked",
        )

    like = Like(
        user_id=current_user.id,
        generation_id=generation_id
    )
    db.add(like)

    gen_result = await db.execute(
        select(Generation).where(Generation.id == generation_id)
    )
    generation = gen_result.scalar_one_or_none()
    if generation:
        generation.likes_count = (generation.likes_count or 0) + 1

    await db.commit()
    await db.refresh(like)

    return like


@router_likes.delete("/{like_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_like(
    like_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Like).where(
            Like.id == like_id,
            Like.user_id == current_user.id
        )
    )
    like = result.scalar_one_or_none()

    if not like:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Like not found",
        )

    gen_result = await db.execute(
        select(Generation).where(Generation.id == like.generation_id)
    )
    generation = gen_result.scalar_one_or_none()
    if generation and generation.likes_count > 0:
        generation.likes_count = generation.likes_count - 1

    await db.delete(like)
    await db.commit()