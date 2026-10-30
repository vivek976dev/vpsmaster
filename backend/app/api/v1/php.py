"""
PHP Management API Endpoints.
Multi-version detection, extensions list, and php.ini configuration editor.
"""

from typing import Dict
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import UserRole
from app.middleware.auth import require_roles, record_audit_log
from app.models.user import User
from app.services.agent_client import agent_client

router = APIRouter(prefix="/php", tags=["PHP Management"])


class UpdatePhpSettingsReq(BaseModel):
    settings: Dict[str, str]


@router.get("/versions")
async def get_php_versions():
    """List installed PHP versions and their FPM statuses."""
    return await agent_client.get_php_versions()


@router.get("/{version}/extensions")
async def get_php_extensions(version: str):
    """List common PHP extensions and their active status."""
    return await agent_client.get_php_extensions(version)


@router.get("/{version}/settings")
async def get_php_settings(version: str):
    """Retrieve php.ini directives (memory_limit, upload_max_filesize, etc.)."""
    return await agent_client.get_php_settings(version)


@router.post("/{version}/settings", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def update_php_settings(
    version: str,
    req: UpdatePhpSettingsReq,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value])),
    db: AsyncSession = Depends(get_db)
):
    """Update php.ini directives and reload PHP-FPM."""
    res = await agent_client.update_php_settings(version, req.settings)
    client_ip = request.client.host if request.client else "unknown"
    await record_audit_log(db, current_user, "PHP_SETTINGS_UPDATE", f"PHP {version}", client_ip)
    return res

