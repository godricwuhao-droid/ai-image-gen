from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import List


class GenerateRequest(BaseModel):
    prompt: str
    size: str = "1024x1024"
    quality: str = "standard"
    n: int = 1


class GenerateResponse(BaseModel):
    images: List[dict]
    cost_usd: float = 0.0
    provider: str


class BaseProvider(ABC):
    """Base class for third-party image generation providers"""

    @abstractmethod
    async def generate(self, req: GenerateRequest) -> GenerateResponse:
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        pass
