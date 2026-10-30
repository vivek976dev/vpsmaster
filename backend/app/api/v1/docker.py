"""
Docker Management API Endpoints.
Container lifecycles, real-time statistics, logs, and images.
"""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import UserRole
from app.middleware.auth import require_roles, record_audit_log
from app.models.user import User
from app.services.agent_client import agent_client

router = APIRouter(prefix="/docker", tags=["Docker Management"])


class ContainerActionReq(BaseModel):
    action: str = Field(..., pattern="^(start|stop|restart|rm)$")


@router.get("/containers", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def list_containers():
    """List containers with state, ports, and image details."""
    return await agent_client.get_containers()


@router.post("/containers/{container_id}/action", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def container_action(
    container_id: str,
    req: ContainerActionReq,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value])),
    db: AsyncSession = Depends(get_db)
):
    """Start, stop, restart, or delete container."""
    res = await agent_client.container_action(container_id, req.action)
    client_ip = request.client.host if request.client else "unknown"
    await record_audit_log(db, current_user, f"DOCKER_{req.action.upper()}", container_id, client_ip)
    return res


@router.get("/containers/{container_id}/logs", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def get_container_logs(container_id: str, tail: int = 100):
    """Fetch recent container console logs."""
    return await agent_client.get_container_logs(container_id, tail)


@router.get("/images", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def list_images():
    """List local container images."""
    return await agent_client.get_docker_images()

