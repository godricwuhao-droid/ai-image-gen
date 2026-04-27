from .generations import router as generations_router
from .galleries import router as galleries_router
from .favorites import router as favorites_router
from .templates import router as templates_router, router as templates_my_router
from .image_edit import router as image_edit_router
from .image_to_image import router as image_to_image_router

__all__ = [
    "generations_router",
    "galleries_router",
    "favorites_router",
    "templates_router",
    "templates_my_router",
    "image_edit_router",
    "image_to_image_router",
]
