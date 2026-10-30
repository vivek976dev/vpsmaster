"""
Database Management API Endpoints.
MySQL/MariaDB and PostgreSQL instances, databases, users, privileges, and dumps.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.auth import get_current_user, record_audit_log
from app.models.database import DatabaseModel, DatabaseUserModel
from app.models.user import User
from app.schemas.all_schemas import DatabaseCreate, DatabaseOut, DatabaseUserCreate
from app.services.agent_client import agent_client

router = APIRouter(prefix="/databases", tags=["Database Management"])


@router.get("", response_model=List[DatabaseOut])
def list_databases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List databases."""
    return db.query(DatabaseModel).all()


@router.post("", response_model=DatabaseOut)
async def create_database(
    req: DatabaseCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a database in MySQL or PostgreSQL."""
    clean_name = req.name.strip().lower()

    existing = db.query(DatabaseModel).filter(DatabaseModel.name == clean_name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Database '{clean_name}' already exists.")

    await agent_client.create_database(engine=req.engine, name=clean_name)

    db_item = DatabaseModel(
        name=clean_name,
        engine=req.engine,
        charset="utf8mb4",
        collation="utf8mb4_unicode_ci",
        size_mb=0.1,
        website_id=req.website_id,
        owner_id=current_user.id
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "DATABASE_CREATE", f"{req.engine}:{clean_name}", client_ip)

    return db_item


@router.delete("/{db_id}")
async def delete_database(
    db_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Drop a database."""
    db_item = db.query(DatabaseModel).filter(DatabaseModel.id == db_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Database not found.")

    await agent_client.drop_database(db_item.engine, db_item.name)
    db.delete(db_item)
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "DATABASE_DROP", db_item.name, client_ip)

    return {"success": True, "name": db_item.name}


@router.post("/users")
async def create_database_user(
    req: DatabaseUserCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create database user and optionally grant privileges."""
    clean_user = req.username.strip()

    await agent_client.create_db_user(req.engine, clean_user, req.password)

    if req.database_name:
        await agent_client.grant_db_privileges(req.engine, req.database_name.strip(), clean_user)

    db_user = DatabaseUserModel(
        username=clean_user,
        engine=req.engine,
        host="localhost"
    )
    db.add(db_user)
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "DATABASE_USER_CREATE", clean_user, client_ip)

    return {"success": True, "username": clean_user}


@router.post("/{db_id}/backup")
async def backup_database(
    db_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a database dump."""
    db_item = db.query(DatabaseModel).filter(DatabaseModel.id == db_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Database not found.")

    res = await agent_client.backup_database(db_item.engine, db_item.name)
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "DATABASE_BACKUP", db_item.name, client_ip)

    return res
