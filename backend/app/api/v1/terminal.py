"""
Web-Based Terminal API Endpoints.
Restricted command execution, session management, and audit logging.
Strictly restricted to Super Admins.
"""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.middleware.auth import require_roles, record_audit_log
from app.models.user import User
from app.services.agent_client import agent_client

router = APIRouter(prefix="/terminal", tags=["Terminal"])


class TerminalCommandReq(BaseModel):
    session_id: str = "default_session"
    command: str


@router.post("/exec", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value]))])
async def execute_command(
    req: TerminalCommandReq,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """Execute command in terminal session and return stdout/stderr/exit code."""
    res = await agent_client.execute_terminal(req.session_id, req.command)

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "TERMINAL_COMMAND", req.command[:100], client_ip)

    return res
