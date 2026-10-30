"""
VPSMaster Control Panel Backend Application.
FastAPI REST API, WebSocket server, and Background Worker supervisor.
"""

import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash, UserRole
from app.models import (
    User,
    Website,
    Domain,
    DNSRecord,
    DatabaseModel,
    CronJobModel,
    FirewallRuleModel,
    SecurityAlertModel,
    SystemSettingModel
)
from app.workers.scheduler import start_scheduler_loop


def seed_initial_data():
    """Ensure database schema is created and seed initial Super Admin and demonstration records."""
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Super Admin Seed
        admin = db.query(User).filter(User.username == settings.DEFAULT_ADMIN_USERNAME).first()
        if not admin:
            admin = User(
                username=settings.DEFAULT_ADMIN_USERNAME,
                email=settings.DEFAULT_ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                role=UserRole.SUPER_ADMIN.value,
                is_active=True,
                is_totp_enabled=False
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # 2. Seed Default Website if empty
        site = db.query(Website).first()
        if not site:
            site = Website(
                domain="example.com",
                aliases="www.example.com",
                document_root="/var/www/example.com/public_html",
                php_version="8.3",
                web_server="nginx",
                is_active=True,
                ssl_enabled=True,
                ssl_auto_renew=True,
                force_https=True,
                owner_id=admin.id
            )
            db.add(site)
            db.commit()
            db.refresh(site)

            # Seed Domain and DNS records
            dom = Domain(domain_name="example.com", owner_id=admin.id, website_id=site.id)
            db.add(dom)
            db.commit()
            db.refresh(dom)

            records = [
                DNSRecord(domain_id=dom.id, record_type="A", host="@", value="198.51.100.1", ttl=3600),
                DNSRecord(domain_id=dom.id, record_type="CNAME", host="www", value="example.com.", ttl=3600),
                DNSRecord(domain_id=dom.id, record_type="MX", host="@", value="mail.example.com.", ttl=3600, priority=10),
                DNSRecord(domain_id=dom.id, record_type="TXT", host="@", value="v=spf1 mx a ~all", ttl=3600),
            ]
            db.add_all(records)

            # Seed Database
            database = DatabaseModel(
                name="wp_example",
                engine="mysql",
                charset="utf8mb4",
                collation="utf8mb4_unicode_ci",
                size_mb=42.8,
                website_id=site.id,
                owner_id=admin.id
            )
            db.add(database)

            # Seed Firewall rules
            fw_rules = [
                FirewallRuleModel(port=22, protocol="tcp", action="allow", source_ip="Anywhere", comment="SSH Access"),
                FirewallRuleModel(port=80, protocol="tcp", action="allow", source_ip="Anywhere", comment="HTTP Web"),
                FirewallRuleModel(port=443, protocol="tcp", action="allow", source_ip="Anywhere", comment="HTTPS Web"),
                FirewallRuleModel(port=8080, protocol="tcp", action="allow", source_ip="Anywhere", comment="VPSMaster Panel"),
            ]
            db.add_all(fw_rules)

            # Seed Alert
            alert = SecurityAlertModel(
                title="Panel Initialized Successfully",
                message="VPSMaster Enterprise Control Panel is online on Ubuntu Linux.",
                severity="info"
            )
            db.add(alert)

            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB and seed
    seed_initial_data()
    # Start background scheduler in background task if not running in test mode
    scheduler_task = None
    if not os.getenv("TESTING"):
        scheduler_task = asyncio.create_task(start_scheduler_loop())
    yield
    # Shutdown
    if scheduler_task:
        scheduler_task.cancel()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "vpsmaster-backend",
        "version": settings.VERSION
    }


# Static Frontend Mount for Production Builds
dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
