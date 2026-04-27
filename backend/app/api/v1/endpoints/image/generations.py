from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from datetime import date
import os
import logging

from .....core.database import get_db
from .....models.user import User
from .....models.generation import Generation
from .....models.credit_transaction import CreditTransaction
from .....models.like_record import LikeRecord
from .....schemas.generation import GenerationRequest, GenerationResponse, GenerationListResponse, GenerationUpdateRequest
from ....deps import get_current_user
from .....tasks.generate_image import process_generation, calculate_credits_cost

router = APIRouter(prefix="/generations", tags=["Generation"])
logger = logging.getLogger(__name__)


@router.get("", response_model=GenerationListResponse)
async def get_generations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    
    count_result = await db.execute(
        select(func.count(Generation.id)).where(Generation.user_id == current_user.id)
    )
    total = count_result.scalar()
    
    result = await db.execute(
        select(Generation)
        .where(Generation.user_id == current_user.id)
        .order_by(Generation.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    generations = result.scalars().all()
    
    return GenerationListResponse(
        generations=generations,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{generation_id}", response_model=GenerationResponse)
async def get_generation(
    generation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Generation).where(
            Generation.id == generation_id,
            Generation.user_id == current_user.id,
        )
    )
    generation = result.scalar_one_or_none()
    
    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )
    
    return generation


@router.post("/{generation_id}/like", response_model=dict)
async def toggle_like(
    generation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Generation).where(
            Generation.id == generation_id,
        )
    )
    generation = result.scalar_one_or_none()
    
    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )
    
    like_result = await db.execute(
        select(LikeRecord).where(
            LikeRecord.user_id == current_user.id,
            LikeRecord.generation_id == generation_id,
        )
    )
    existing_like = like_result.scalar_one_or_none()
    
    if existing_like:
        await db.delete(existing_like)
        generation.likes_count = max((generation.likes_count or 0) - 1, 0)
        await db.commit()
        return {"success": True, "liked": False, "likes_count": generation.likes_count}
    
    new_like = LikeRecord(
        user_id=current_user.id,
        generation_id=generation_id,
    )
    db.add(new_like)
    generation.likes_count = (generation.likes_count or 0) + 1
    await db.commit()
    
    return {"success": True, "liked": True, "likes_count": generation.likes_count}


@router.patch("/{generation_id}", response_model=GenerationResponse)
async def update_generation(
    generation_id: int,
    request: GenerationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Generation).where(
            Generation.id == generation_id,
            Generation.user_id == current_user.id,
        )
    )
    generation = result.scalar_one_or_none()
    
    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )
    
    if request.is_public is not None:
        generation.is_public = request.is_public
    
    await db.commit()
    await db.refresh(generation)
    
    return generation


@router.delete("/{generation_id}", response_model=dict)
async def delete_generation(
    generation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Generation).where(
            Generation.id == generation_id,
            Generation.user_id == current_user.id,
        )
    )
    generation = result.scalar_one_or_none()
    
    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )
    
    await db.delete(generation)
    await db.commit()
    
    return {"success": True, "message": "Generation deleted"}


@router.post("", response_model=GenerationResponse, status_code=status.HTTP_201_CREATED)
async def create_generation(
    request: GenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    openai_key = os.getenv("OPENAI_API_KEY", "")
    relay_key = os.getenv("RELAY_API_KEY", "")
    
    if not openai_key or openai_key == "sk-your-api-key-here":
        if not relay_key or relay_key == "sk-your-api-key-here":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="图片生成服务未配置，请联系管理员配置RELAY_API_KEY或OPENAI_API_KEY环境变量",
            )
        provider_name = "relay_api"
    else:
        provider_name = "relay_api"
    
    credits_needed = calculate_credits_cost(request.quality, request.n)
    is_free_generation = False
    
    if not current_user.is_superuser:
        if current_user.credits and current_user.credits > 0:
            if current_user.credits < credits_needed:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"积分不足，需要{credits_needed}积分，当前剩余{current_user.credits}积分",
                )
        else:
            today = date.today()
            if current_user.last_generation_date and current_user.last_generation_date.date() == today:
                if current_user.daily_generation_count >= 10:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="免费额度已用完，请充值积分或明天再来",
                    )
                is_free_generation = True
            else:
                current_user.daily_generation_count = 0
                is_free_generation = True
    
    generation = Generation(
        user_id=current_user.id,
        prompt=request.prompt,
        size=request.size,
        quality=request.quality,
        n=request.n,
        status="pending",
        provider=provider_name,
        credits_cost=credits_needed if not is_free_generation else 0,
    )
    db.add(generation)
    
    if not current_user.is_superuser and not is_free_generation:
        result = await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .where(User.credits >= credits_needed)
            .values(credits=User.credits - credits_needed)
        )
        if result.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"积分不足，需要{credits_needed}积分，当前剩余{current_user.credits}积分",
            )
        
        transaction = CreditTransaction(
            user_id=current_user.id,
            amount=-credits_needed,
            balance_after=current_user.credits - credits_needed,
            transaction_type="generation_deduct",
            reference_type="generation",
            reference_id=None,
            description=f"图片生成预扣积分: {request.prompt[:50]}..." if len(request.prompt) > 50 else f"图片生成预扣积分: {request.prompt}"
        )
        db.add(transaction)
        logger.info(f"[Credits] Pre-deducted {credits_needed} credits for user {current_user.id}, transaction recorded")
    
    await db.commit()
    await db.refresh(generation)
    
    if not current_user.is_superuser and not is_free_generation:
        result = await db.execute(
            select(CreditTransaction)
            .where(CreditTransaction.user_id == current_user.id)
            .where(CreditTransaction.reference_id == None)
            .order_by(CreditTransaction.id.desc())
            .limit(1)
        )
        pending_transaction = result.scalar_one_or_none()
        if pending_transaction:
            pending_transaction.reference_id = generation.id
            await db.commit()
    
    process_generation.delay(generation.id, current_user.id, provider_name)

    return generation


@router.post("/{generation_id}/refund", response_model=dict)
async def refund_generation(
    generation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Generation).where(
            Generation.id == generation_id,
            Generation.user_id == current_user.id,
        )
    )
    generation = result.scalar_one_or_none()
    
    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )
    
    if generation.status == "completed":
        return {"refunded": False, "message": "Generation already completed, no refund needed"}
    
    if generation.refunded:
        return {"refunded": False, "message": "Already refunded"}
    
    credits_cost = calculate_credits_cost(generation.quality, generation.n)
    
    current_user.credits = (current_user.credits or 0) + credits_cost
    generation.refunded = True
    generation.error_message = "Generation failed, credits refunded"
    
    await db.commit()
    
    return {
        "refunded": True, 
        "refunded_credits": credits_cost,
        "message": f"Successfully refunded {credits_cost} credits"
    }