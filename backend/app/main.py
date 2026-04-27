import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.v1.endpoints import (
    auth_router, generations_router,
    favorites_router, templates_router, galleries_router,
    credits_router, payment_router, events_router, image_edit_router
)

app = FastAPI(title="AI Image Generator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(generations_router, prefix="/api/v1")
app.include_router(favorites_router, prefix="/api/v1")
app.include_router(templates_router, prefix="/api/v1")
app.include_router(galleries_router, prefix="/api/v1")
app.include_router(credits_router, prefix="/api/v1")
app.include_router(payment_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(image_edit_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "AI Image Generator API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "ok"}
