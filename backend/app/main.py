import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.v1.endpoints import (
    auth_router, generations_router, image_to_image_router,
    favorites_router, templates_router, templates_my_router, galleries_router,
    credits_router, payment_router, events_router,
    admin_users_router, admin_stats_router, admin_orders_router,
    admin_generations_router, admin_credits_router,
    admin_templates_router, admin_config_router,
)
from .api.v1.endpoints.system.credits_config import router as credits_config_router
from .api.v1.endpoints.system.events import start_cleanup_task

app = FastAPI(title="AI Image Generator API", version="1.0.0")


@app.on_event("startup")
async def startup_event():
    """应用启动时启动 SSE 清理任务"""
    start_cleanup_task()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(generations_router, prefix="/api/v1")
app.include_router(image_to_image_router, prefix="/api/v1")
app.include_router(favorites_router, prefix="/api/v1")
app.include_router(templates_router, prefix="/api/v1")
app.include_router(templates_my_router, prefix="/api/v1")
app.include_router(galleries_router, prefix="/api/v1")
app.include_router(credits_router, prefix="/api/v1")
app.include_router(payment_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(admin_users_router, prefix="/api/v1")
app.include_router(admin_stats_router, prefix="/api/v1")
app.include_router(admin_orders_router, prefix="/api/v1")
app.include_router(admin_generations_router, prefix="/api/v1")
app.include_router(admin_credits_router, prefix="/api/v1")
app.include_router(admin_templates_router, prefix="/api/v1")
app.include_router(admin_config_router, prefix="/api/v1")
app.include_router(credits_config_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "AI Image Generator API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "ok"}