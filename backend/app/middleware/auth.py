"""
Authentication and Authorization dependencies for VPSMaster Backend.
Enforces JWT validation, user existence, active status, and Role-Based Access Control (RBAC).
"""

from typing import List, Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token, UserRole
from app.models.user import User
from app.models.security import AuditLogModel

security_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """Retrieve the currently authenticated user from Bearer JWT."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(auth.credentials)
    user_id = payload.get("sub")
    token_type = payload.get("type")

    if not user_id or token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated.")

    return user


def require_roles(allowed_roles: List[str]):
    """Enforce that the authenticated user possesses one of the authorized roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == UserRole.SUPER_ADMIN.value:
            return current_user  # Super Admin has universal access

        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user

    return role_checker


def record_audit_log(
    db: Session,
    user: Optional[User],
    action: str,
    resource: Optional[str],
    ip_address: str,
    details: Optional[str] = None
):
    """Save an immutable audit trail entry."""
    entry = AuditLogModel(
        user_id=user.id if user else None,
        username=user.username if user else "system",
        action=action,
        resource=resource,
        ip_address=ip_address,
        details=details
    )
    db.add(entry)
    db.commit()
