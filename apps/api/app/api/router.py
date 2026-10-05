from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.rbac_demo import router as rbac_demo_router

# /health is infrastructure-level and intentionally unversioned.
api_router = APIRouter()
api_router.include_router(health_router)

# Application APIs are versioned from the start.
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(auth_router)
v1_router.include_router(rbac_demo_router)

api_router.include_router(v1_router)
