from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.database import get_db
from ....models.user import User
from ...deps import get_current_user

router = APIRouter(prefix="/credits", tags=["Credits"])


class CreditsResponse(BaseModel):
    credits: int


class AddCreditsRequest(BaseModel):
    credits: int


class CreditsTransactionResponse(BaseModel):
    id: int
    amount: int
    type: str
    description: str
    created_at: str

    class Config:
        from_attributes = True


@router.get("", response_model=CreditsResponse)
async def get_credits(
    current_user: User = Depends(get_current_user),
):
    return CreditsResponse(credits=current_user.credits or 0)


@router.post("/add", response_model=CreditsResponse)
async def add_credits(
    request: AddCreditsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can add credits",
        )
    
    if request.credits <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credits must be positive",
        )
    
    current_user.credits = (current_user.credits or 0) + request.credits
    await db.commit()
    
    return CreditsResponse(credits=current_user.credits)


@router.post("/deduct", response_model=CreditsResponse)
async def deduct_credits(
    request: AddCreditsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_credits = current_user.credits or 0
    
    if current_credits < request.credits:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient credits",
        )
    
    current_user.credits = current_credits - request.credits
    await db.commit()
    
    return CreditsResponse(credits=current_user.credits)