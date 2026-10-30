"""
Email Server Management API Endpoints.
Virtual mailbox creation, quota control, and DKIM/SPF/DMARC deliverability assistant.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import UserRole
from app.middleware.auth import require_roles, record_audit_log
from app.models.user import User
from app.services.agent_client import agent_client

router = APIRouter(prefix="/email", tags=["Email Server Management"])


class CreateMailboxReq(BaseModel):
    email: EmailStr
    password: str
    quota_mb: int = 1024


@router.get("/mailboxes")
async def list_mailboxes(domain: Optional[str] = None):
    """List virtual mailboxes."""
    return await agent_client.get_mailboxes(domain)


@router.post("/mailboxes", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def create_mailbox(
    req: CreateMailboxReq,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value])),
    db: AsyncSession = Depends(get_db)
):
    """Create a virtual email mailbox with quota."""
    res = await agent_client.create_mailbox(req.email, req.password, req.quota_mb)
    client_ip = request.client.host if request.client else "unknown"
    await record_audit_log(db, current_user, "EMAIL_MAILBOX_CREATE", req.email, client_ip)
    return res


@router.delete("/mailboxes", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def delete_mailbox(
    email: str,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value])),
    db: AsyncSession = Depends(get_db)
):
    """Delete a virtual mailbox."""
    res = await agent_client.delete_mailbox(email)
    client_ip = request.client.host if request.client else "unknown"
    await record_audit_log(db, current_user, "EMAIL_MAILBOX_DELETE", email, client_ip)
    return res


@router.get("/dns-records")
async def get_email_dns_records(domain: str, server_ip: str = "198.51.100.1"):
    """Generate exact SPF, DKIM, and DMARC DNS records for reliable delivery."""
    return await agent_client.get_email_dns(domain, server_ip)

