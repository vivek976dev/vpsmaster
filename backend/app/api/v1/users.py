"""
User and Role Management API Endpoints.
Multi-tier administration (Super Admin, Administrator, Reseller, Website Owner).
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole, get_password_hash
from app.middleware.auth import require_roles, record_audit_log
from app.models.user import User
from app.schemas.all_schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("", response_model=List[UserOut], dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
def list_users(db: Session = Depends(get_db)):
    """List all user accounts."""
    return db.query(User).order_by(User.id.asc()).all()


@router.post("", response_model=UserOut, dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value]))])
def create_user(
    req: UserCreate,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """Create a new control panel user with assigned role and permissions."""
    clean_username = req.username.strip().lower()
    clean_email = req.email.strip().lower()

    existing = db.query(User).filter((User.username == clean_username) | (User.email == clean_email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already in use.")

    new_user = User(
        username=clean_username,
        email=clean_email,
        hashed_password=get_password_hash(req.password),
        role=req.role,
        is_active=True,
        assigned_websites=req.assigned_websites or ""
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "USER_CREATE", clean_username, client_ip)

    return new_user


@router.put("/{user_id}", response_model=UserOut, dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value]))])
def update_user(
    user_id: int,
    req: UserUpdate,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """Update role, status, assigned websites, or password."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if req.email:
        target_user.email = req.email.strip().lower()
    if req.role:
        target_user.role = req.role
    if req.is_active is not None:
        target_user.is_active = req.is_active
    if req.assigned_websites is not None:
        target_user.assigned_websites = req.assigned_websites
    if req.password:
        target_user.hashed_password = get_password_hash(req.password)

    db.commit()
    db.refresh(target_user)

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "USER_UPDATE", target_user.username, client_ip)

    return target_user


@router.delete("/{user_id}", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value]))])
def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """Delete a user account."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own user account.")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    db.delete(target_user)
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "USER_DELETE", target_user.username, client_ip)

    return {"success": True, "id": user_id}
