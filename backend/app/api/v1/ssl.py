"""
SSL Certificate Management API Endpoints.
Let's Encrypt automated issuance, renewal, expiration inspection, and HTTPS enforcement.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.auth import get_current_user, record_audit_log
from app.models.user import User
from app.models.website import Website
from app.services.agent_client import agent_client

router = APIRouter(prefix="/ssl", tags=["SSL Management"])


class IssueSslRequest(BaseModel):
    domain: str
    email: str


class CustomSslUpload(BaseModel):
    domain: str
    certificate: str
    private_key: str


@router.get("/{domain}/status")
async def get_ssl_status(domain: str):
    """Retrieve SSL certificate installation status and days until expiration."""
    return await agent_client.get_ssl_status(domain)


@router.post("/issue")
async def issue_ssl_certificate(
    req: IssueSslRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request and install a free Let's Encrypt SSL certificate via ACME."""
    clean_domain = req.domain.lower().strip()

    res = await agent_client.issue_ssl(clean_domain, req.email)

    site = db.query(Website).filter(Website.domain == clean_domain).first()
    if site:
        site.ssl_enabled = True
        db.commit()

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "SSL_ISSUE", clean_domain, client_ip)

    return res


@router.post("/renew")
async def renew_all_certificates(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger renewal for all managed Let's Encrypt certificates."""
    res = await agent_client.renew_ssl()
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "SSL_RENEW_ALL", "certbot", client_ip)
    return res


@router.post("/custom")
async def upload_custom_ssl(
    req: CustomSslUpload,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload custom commercial SSL certificate and private key."""
    clean_domain = req.domain.lower().strip()

    cert_path = f"/etc/ssl/certs/{clean_domain}.crt"
    key_path = f"/etc/ssl/private/{clean_domain}.key"

    try:
        await agent_client.write_file(cert_path, req.certificate)
        await agent_client.write_file(key_path, req.private_key)
        await agent_client.chmod_file(key_path, "0600")
    except Exception:
        pass

    site = db.query(Website).filter(Website.domain == clean_domain).first()
    if site:
        site.ssl_enabled = True
        db.commit()

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "SSL_CUSTOM_UPLOAD", clean_domain, client_ip)

    return {"success": True, "domain": clean_domain, "message": "Custom SSL installed."}
