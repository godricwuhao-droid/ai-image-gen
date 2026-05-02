from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from .....core.database import get_db
from .....models.user import User
from .....models.generation import Generation
from .....schemas.gallery_api import GalleryListResponse, GalleryImage, PublishRequest
from ....deps import get_current_user

router = APIRouter(prefix="/galleries", tags=["Galleries"])


def convert_images(images_data):
    """Convert images data to list format"""
    if not images_data:
        return []
    if isinstance(images_data, list):
        return images_data
    if isinstance(images_data, dict):
        return [images_data]
    return []


@router.get("", response_model=GalleryListResponse)
async def get_public_galleries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query('latest', description="Sort by: latest, popular, views"),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size

    base_query = select(Generation, User).join(User).where(
        Generation.is_public == True,
        Generation.status == 'completed'
    )

    count_query = select(func.count(Generation.id)).where(
        Generation.is_public == True,
        Generation.status == 'completed'
    )

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    if sort == 'popular':
        query = base_query.order_by(Generation.likes_count.desc())
    elif sort == 'views':
        query = base_query.order_by(Generation.views_count.desc())
    else:
        query = base_query.order_by(Generation.created_at.desc())

    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    rows = result.all()

    images = []
    for gen, user in rows:
        masked_email = None
        if user.email:
            parts = user.email.split('@')
            if len(parts) == 2:
                masked_email = f"{parts[0][0]}***@{parts[1]}" if parts[0] else "***@{}"
        images.append(GalleryImage(
            id=gen.id,
            user_id=gen.user_id,
            prompt=gen.prompt,
            size=gen.size,
            quality=gen.quality,
            status=gen.status,
            images=convert_images(gen.images),
            likes_count=gen.likes_count or 0,
            views_count=gen.views_count or 0,
            username=user.username,
            user_email=masked_email,
            created_at=gen.created_at
        ))

    return GalleryListResponse(
        images=images,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/popular")
async def get_popular_galleries(
    limit: int = Query(8, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Generation, User)
        .join(User)
        .where(
            Generation.is_public == True,
            Generation.status == 'completed'
        )
        .order_by(Generation.likes_count.desc())
        .limit(limit)
    )
    rows = result.all()

    images = []
    for gen, user in rows:
        masked_email = None
        if user.email:
            parts = user.email.split('@')
            if len(parts) == 2:
                masked_email = f"{parts[0][0]}***@{parts[1]}" if parts[0] else "***@{}"
        images.append(GalleryImage(
            id=gen.id,
            user_id=gen.user_id,
            prompt=gen.prompt,
            size=gen.size,
            quality=gen.quality,
            status=gen.status,
            images=convert_images(gen.images),
            likes_count=gen.likes_count or 0,
            views_count=gen.views_count or 0,
            username=user.username,
            user_email=masked_email,
            created_at=gen.created_at
        ))

    return images


@router.get("/my", response_model=list[GalleryImage])
async def get_my_gallery(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size

    count_result = await db.execute(
        select(func.count(Generation.id)).where(
            Generation.user_id == current_user.id,
            Generation.is_public == True
        )
    )
    total = count_result.scalar()

    result = await db.execute(
        select(Generation, User)
        .join(User)
        .where(
            Generation.user_id == current_user.id,
            Generation.is_public == True
        )
        .order_by(Generation.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    rows = result.all()

    images = []
    for gen, user in rows:
        masked_email = None
        if user.email:
            parts = user.email.split('@')
            if len(parts) == 2:
                masked_email = f"{parts[0][0]}***@{parts[1]}" if parts[0] else "***@{}"
        images.append(GalleryImage(
            id=gen.id,
            user_id=gen.user_id,
            prompt=gen.prompt,
            size=gen.size,
            quality=gen.quality,
            status=gen.status,
            images=convert_images(gen.images),
            likes_count=gen.likes_count or 0,
            views_count=gen.views_count or 0,
            username=user.username,
            user_email=masked_email,
            created_at=gen.created_at
        ))

    return images


@router.get("/{generation_id}", response_model=GalleryImage)
async def get_gallery_detail(
    generation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Generation, User)
        .join(User)
        .where(Generation.id == generation_id)
    )
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    gen, user = row

    if not gen.is_public and gen.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )

    gen.views_count = (gen.views_count or 0) + 1
    await db.commit()

    masked_email = None
    if user.email:
        parts = user.email.split('@')
        if len(parts) == 2:
            masked_email = f"{parts[0][0]}***@{parts[1]}" if parts[0] else "***@{}"

    return GalleryImage(
        id=gen.id,
        user_id=gen.user_id,
        prompt=gen.prompt,
        size=gen.size,
        quality=gen.quality,
        status=gen.status,
        images=convert_images(gen.images),
        likes_count=gen.likes_count or 0,
        views_count=gen.views_count,
        username=user.username,
        user_email=masked_email,
        created_at=gen.created_at
    )


@router.post("/{generation_id}/publish")
async def publish_generation(
    generation_id: int,
    request: PublishRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Generation).where(
            Generation.id == generation_id,
            Generation.user_id == current_user.id
        )
    )
    generation = result.scalar_one_or_none()

    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )

    if generation.status != 'completed':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only completed generations can be published",
        )

    generation.is_public = request.is_public
    await db.commit()

    return {"message": "Updated successfully", "is_public": generation.is_public}