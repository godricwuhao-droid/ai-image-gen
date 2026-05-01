from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
import asyncio
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["Events"])

generation_complete_events = {}


async def event_generator(user_id: int, generation_id: int):
    """Generate SSE events for a specific generation"""
    max_attempts = 60
    for _ in range(max_attempts):
        event_key = f"{user_id}_{generation_id}"
        if event_key in generation_complete_events:
            event_data = generation_complete_events.pop(event_key)
            yield f"data: {json.dumps(event_data)}\n\n"
            break
        yield f"data: {json.dumps({'status': 'processing'})}\n\n"
        await asyncio.sleep(2)


@router.get("/generation/{generation_id}")
async def sse_generation_status(
    generation_id: int,
    token: str = None,
):
    """
    SSE endpoint for generation status updates
    
    Client can subscribe to this endpoint to receive real-time updates
    when the generation is complete.
    """
    user_id = 0
    if token:
        try:
            from ....core.security import decode_access_token
            payload = decode_access_token(token)
            if payload:
                user_id = int(payload.get("sub", 0))
        except Exception:
            pass
    
    async def generate():
        max_attempts = 120
        for _ in range(max_attempts):
            event_key = f"{user_id}_{generation_id}"
            if event_key in generation_complete_events:
                event_data = generation_complete_events.pop(event_key)
                yield f"data: {json.dumps(event_data)}\n\n"
                break
            yield f"data: {json.dumps({'status': 'processing', 'generation_id': generation_id})}\n\n"
            await asyncio.sleep(2)
        yield f"data: {json.dumps({'status': 'timeout'})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


def notify_generation_complete(user_id: int, generation_id: int, status: str, images: list = None, error: str = None):
    """Notify that a generation is complete"""
    event_key = f"{user_id}_{generation_id}"
    generation_complete_events[event_key] = {
        "status": status,
        "generation_id": generation_id,
        "images": images or [],
        "error": error
    }
    logger.info(f"[SSE] 通知已发送: {event_key} -> {status}")