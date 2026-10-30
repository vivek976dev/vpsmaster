"""
Server management API Endpoints.
Configures hostname, timezone, network interfaces, updates, reboot, and shutdown.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.middleware.auth import require_roles, record_audit_log
from app.models.user import User
from app.schemas.all_schemas import HostnameUpdate, TimezoneUpdate
from app.services.agent_client import agent_client

router = APIRouter(prefix="/server", tags=["Server Management"])


@router.get("/info", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def get_server_info():
    """Retrieve detailed server hardware and operating system information."""
    return await agent_client.get_system_metrics()


@router.post("/hostname", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value]))])
async def update_hostname(
    req: HostnameUpdate,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """Set system hostname."""
    res = await agent_client.set_hostname(req.hostname)
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "SERVER_HOSTNAME_UPDATE", req.hostname, client_ip)
    return res


@router.get("/timezone", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def get_timezone():
    """Get system timezone."""
    return await agent_client.get_timezone()


@router.post("/timezone", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value]))])
async def update_timezone(
    req: TimezoneUpdate,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """Set system timezone."""
    res = await agent_client.set_timezone(req.timezone)
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "SERVER_TIMEZONE_UPDATE", req.timezone, client_ip)
    return res


@router.get("/interfaces", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def get_interfaces():
    """List network interfaces and addresses."""
    return await agent_client.get_interfaces()


@router.get("/updates", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def check_updates():
    """Check for pending system apt packages."""
    return await agent_client.check_updates()


@router.post("/updates/run", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value]))])
async def run_updates(
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """Apply system package upgrades."""
    res = await agent_client.run_updates()
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "SERVER_UPDATES_APPLIED", "apt", client_ip)
    return res


@router.post("/reboot", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value]))])
async def reboot_server(
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """Trigger graceful system reboot."""
    res = await agent_client.reboot()
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "SERVER_REBOOT", "system", client_ip)
    return res


@router.post("/shutdown", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value]))])
async def shutdown_server(
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """Trigger system shutdown."""
    res = await agent_client.shutdown()
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "SERVER_SHUTDOWN", "system", client_ip)
    return res
