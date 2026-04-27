from .admin_users import router as admin_users_router
from .admin_stats import router as admin_stats_router
from .admin_orders import router as admin_orders_router

__all__ = ["admin_users_router", "admin_stats_router", "admin_orders_router"]
