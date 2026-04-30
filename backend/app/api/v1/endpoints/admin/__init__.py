from .admin_users import router as admin_users_router
from .admin_stats import router as admin_stats_router
from .admin_orders import router as admin_orders_router
from .admin_generations import router as admin_generations_router
from .admin_credits import router as admin_credits_router
from .admin_templates import router as admin_templates_router
from .admin_config import router as admin_config_router

__all__ = [
    "admin_users_router",
    "admin_stats_router",
    "admin_orders_router",
    "admin_generations_router",
    "admin_credits_router",
    "admin_templates_router",
    "admin_config_router",
]