import openai
from tenacity import retry, stop_after_attempt, wait_exponential
from .base import BaseProvider, GenerateRequest, GenerateResponse
from ...core.config import settings


class OpenAIProvider(BaseProvider):
    """GPT Images 2.0 provider"""

    def __init__(self):
        openai.api_key = settings.OPENAI_API_KEY
        openai.base_url = settings.OPENAI_BASE_URL

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate(self, req: GenerateRequest) -> GenerateResponse:
        try:
            response = await openai.images.generate(
                model="dall-e-3",
                prompt=req.prompt,
                size=req.size,
                quality=req.quality,
                n=req.n,
            )

            images = [
                {
                    "url": img.url,
                    "width": int(req.size.split("x")[0]),
                    "height": int(req.size.split("x")[1]),
                }
                for img in response.data
            ]

            cost_map = {
                ("1024x1024", "standard"): 0.04,
                ("1024x1024", "hd"): 0.08,
                ("512x512", "standard"): 0.018,
                ("512x512", "hd"): 0.036,
                ("256x256", "standard"): 0.016,
                ("256x256", "hd"): 0.016,
            }
            cost_usd = cost_map.get((req.size, req.quality), 0.04) * req.n

            return GenerateResponse(
                images=images,
                cost_usd=cost_usd,
                provider="openai",
            )
        except Exception as e:
            return GenerateResponse(
                images=[],
                cost_usd=0.0,
                provider="openai",
            )

    async def health_check(self) -> bool:
        try:
            await openai.models.list()
            return True
        except Exception:
            return False
