"""
Service management API Endpoints.
Controls system services (Nginx, MySQL, PostgreSQL, Redis, PHP-FPM, Docker, SSH, etc.).
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.middleware.auth import require_roles, record_audit_log
from app.models.user import User
from app.schemas.all_schemas import ServiceAction
from app.services.agent_client import agent_client

router = APIRouter(prefix="/services", tags=["Service Management"])


@router.get("", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def list_services():
    """List status and resource consumption of all managed services."""
    return await agent_client.list_services()


@router.post("/{service}/action", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def execute_action(
    service: str,
    req: ServiceAction,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value])),
    db: Session = Depends(get_db)
):
    """Start, stop, restart, reload, enable, or disable a service."""
    res = await agent_client.service_action(service, req.action)
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, f"SERVICE_{req.action.upper()}", service, client_ip)
    return res


@router.get("/{service}/logs", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def get_service_logs(service: str, lines: int = 100):
    """Fetch recent journalctl log lines for the service."""
    return await agent_client.get_service_logs(service, lines)
