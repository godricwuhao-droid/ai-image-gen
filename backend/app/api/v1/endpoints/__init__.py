from app.api.v1.endpoints.user.auth import router as auth_router
from app.api.v1.endpoints.user.credits import router as credits_router
from app.api.v1.endpoints.image.generations import router as generations_router
from app.api.v1.endpoints.image.galleries import router as galleries_router
from app.api.v1.endpoints.image.favorites import router as favorites_router
from app.api.v1.endpoints.image.templates import router as templates_router, router_my as templates_my_router
from app.api.v1.endpoints.image.image_to_image import router as image_to_image_router
from app.api.v1.endpoints.payment.payment import router as payment_router
from app.api.v1.endpoints.admin.admin_users import router as admin_users_router
from app.api.v1.endpoints.admin.admin_stats import router as admin_stats_router
from app.api.v1.endpoints.admin.admin_orders import router as admin_orders_router
from app.api.v1.endpoints.admin.admin_generations import router as admin_generations_router
from app.api.v1.endpoints.admin.admin_credits import router as admin_credits_router
from app.api.v1.endpoints.admin.admin_templates import router as admin_templates_router
from app.api.v1.endpoints.admin.admin_config import router as admin_config_router
from app.api.v1.endpoints.system.events import router as events_router
from app.api.v1.endpoints.system.credits_config import router as credits_config_router

__all__ = [
    "auth_router",
    "credits_router",
    "credits_config_router",
    "generations_router",
    "admin_users_router",
    "admin_stats_router",
    "admin_orders_router",
    "admin_generations_router",
    "admin_credits_router",
    "admin_templates_router",
    "admin_config_router",
    "favorites_router",
    "templates_router",
    "templates_my_router",
    "galleries_router",
    "payment_router",
    "events_router",
    "image_to_image_router",
]