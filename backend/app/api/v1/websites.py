"""
Website Management API Endpoints.
Multi-tenant virtual hosting, Nginx server blocks, PHP versions, suspension, and logs.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.middleware.auth import get_current_user, record_audit_log
from app.models.database import DatabaseModel
from app.models.user import User
from app.models.website import Website
from app.schemas.all_schemas import WebsiteCreate, WebsiteOut, WebsiteUpdate
from app.services.agent_client import agent_client

router = APIRouter(prefix="/websites", tags=["Website Management"])


@router.get("", response_model=List[WebsiteOut])
def list_websites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List websites. Administrators see all; Website Owners see only their owned/assigned sites."""
    query = db.query(Website)
    if current_user.role not in [UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]:
        allowed_ids = []
        if current_user.assigned_websites:
            allowed_ids = [int(i.strip()) for i in current_user.assigned_websites.split(",") if i.strip().isdigit()]
        query = query.filter((Website.owner_id == current_user.id) | (Website.id.in_(allowed_ids)))

    return query.all()


@router.post("", response_model=WebsiteOut)
async def create_website(
    req: WebsiteCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new website with isolated web root and Nginx configuration."""
    domain_clean = req.domain.lower().strip()

    existing = db.query(Website).filter(Website.domain == domain_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Website for domain '{domain_clean}' already exists.")

    alias_list = [a.strip() for a in req.aliases.split(",") if a.strip()] if req.aliases else []

    # Provision on Server Agent
    agent_res = await agent_client.create_website(
        domain=domain_clean,
        php_version=req.php_version,
        aliases=alias_list,
        force_https=req.force_https
    )

    doc_root = agent_res.get("doc_root", f"/var/www/{domain_clean}/public_html")

    # Save to database
    website = Website(
        domain=domain_clean,
        aliases=req.aliases or "",
        document_root=doc_root,
        php_version=req.php_version,
        web_server=req.web_server,
        is_active=True,
        ssl_enabled=False,
        ssl_auto_renew=True,
        force_https=req.force_https,
        owner_id=current_user.id
    )
    db.add(website)
    db.commit()
    db.refresh(website)

    # Optional database provisioning
    if req.create_database and req.database_name:
        clean_db_name = req.database_name.strip()
        try:
            await agent_client.create_database(engine="mysql", name=clean_db_name)
            new_db = DatabaseModel(
                name=clean_db_name,
                engine="mysql",
                charset="utf8mb4",
                size_mb=0.1,
                website_id=website.id,
                owner_id=current_user.id
            )
            db.add(new_db)
            db.commit()
        except Exception:
            pass

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "WEBSITE_CREATE", domain_clean, client_ip)

    return website


@router.get("/{website_id}", response_model=WebsiteOut)
def get_website(
    website_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details for a specific website."""
    site = db.query(Website).filter(Website.id == website_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found.")

    if current_user.role not in [UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value] and site.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this website.")

    return site


@router.put("/{website_id}", response_model=WebsiteOut)
async def update_website(
    website_id: int,
    req: WebsiteUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update PHP version, aliases, or HTTPS redirection."""
    site = db.query(Website).filter(Website.id == website_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found.")

    if req.php_version is not None:
        site.php_version = req.php_version
    if req.aliases is not None:
        site.aliases = req.aliases
    if req.force_https is not None:
        site.force_https = req.force_https
    if req.ssl_auto_renew is not None:
        site.ssl_auto_renew = req.ssl_auto_renew

    alias_list = [a.strip() for a in site.aliases.split(",") if a.strip()] if site.aliases else []
    await agent_client.create_website(
        domain=site.domain,
        php_version=site.php_version,
        aliases=alias_list,
        force_https=site.force_https
    )

    db.commit()
    db.refresh(site)

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "WEBSITE_UPDATE", site.domain, client_ip)

    return site


@router.post("/{website_id}/suspend")
async def toggle_website_suspension(
    website_id: int,
    suspend: bool,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Suspend or re-enable a website."""
    site = db.query(Website).filter(Website.id == website_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found.")

    await agent_client.suspend_website(site.domain, suspend)
    site.is_active = not suspend
    db.commit()

    action = "SUSPEND" if suspend else "UNSUSPEND"
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, f"WEBSITE_{action}", site.domain, client_ip)

    return {"success": True, "domain": site.domain, "is_active": site.is_active}


@router.delete("/{website_id}")
async def delete_website(
    website_id: int,
    delete_files: bool = False,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a website and remove its server configuration."""
    site = db.query(Website).filter(Website.id == website_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found.")

    await agent_client.delete_website(site.domain, delete_files)
    db.delete(site)
    db.commit()

    client_ip = request.client.host if request and request.client else "unknown"
    record_audit_log(db, current_user, "WEBSITE_DELETE", site.domain, client_ip)

    return {"success": True, "domain": site.domain}


@router.get("/{website_id}/logs")
async def get_website_logs(
    website_id: int,
    log_type: str = "access",
    lines: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve access or error log lines for a website."""
    site = db.query(Website).filter(Website.id == website_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found.")

    return await agent_client.get_website_logs(site.domain, log_type, lines)
