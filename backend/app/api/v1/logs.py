"""
Centralized Log Management API Endpoints.
Live viewer, searching, line limits, and log filtering.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Response
from app.core.security import UserRole
from app.middleware.auth import require_roles
from app.services.agent_client import agent_client

router = APIRouter(prefix="/logs", tags=["Log Management"])


@router.get("/tail", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def tail_log(
    source: str = "journal",
    lines: int = 100,
    filter_query: Optional[str] = None
):
    """Retrieve recent lines from selected system/service log with keyword filtering."""
    return await agent_client.tail_logs(source, lines, filter_query)


@router.get("/download", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def download_log(
    source: str = "journal",
    lines: int = 500
):
    """Download log output as text file."""
    data = await agent_client.tail_logs(source, lines)
    content = "\n".join(data.get("lines", []))
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={source}_log.txt"}
    )

