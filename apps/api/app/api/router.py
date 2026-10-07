from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.candidate import router as candidate_router
from app.api.credits import router as credits_router
from app.api.events import router as events_router
from app.api.health import router as health_router
from app.api.linkedin import router as linkedin_router
from app.api.mock_interviews import router as mock_interviews_router
from app.api.notifications import router as notifications_router
from app.api.rbac_demo import router as rbac_demo_router
from app.api.resumes import router as resumes_router

# /health is infrastructure-level and intentionally unversioned.
api_router = APIRouter()
api_router.include_router(health_router)

# Application APIs are versioned from the start.
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(auth_router)
v1_router.include_router(rbac_demo_router)
v1_router.include_router(candidate_router)
v1_router.include_router(resumes_router)
v1_router.include_router(linkedin_router)
v1_router.include_router(credits_router)
v1_router.include_router(events_router)
v1_router.include_router(mock_interviews_router)
v1_router.include_router(notifications_router)
v1_router.include_router(admin_router)

api_router.include_router(v1_router)
