from .auth import router as auth_router
from .generations import router as generations_router
from .admin_users import router as admin_users_router
from .admin_stats import router as admin_stats_router
from .admin_orders import router as admin_orders_router
from .favorites import router as favorites_router
from .templates import router as templates_router, router as templates_my_router
from .galleries import router as galleries_router
from .credits import router as credits_router
from .payment import router as payment_router
from .events import router as events_router
from .image_edit import router as image_edit_router

__all__ = [
    "auth_router",
    "generations_router",
    "admin_users_router",
    "admin_stats_router",
    "admin_orders_router",
    "favorites_router",
    "templates_router",
    "templates_my_router",
    "galleries_router",
    "credits_router",
    "payment_router",
    "events_router",
    "image_edit_router",
]
