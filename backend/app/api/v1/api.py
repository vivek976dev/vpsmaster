"""
API v1 Router aggregation.
"""

from fastapi import APIRouter
from app.api.v1 import (
    auth,
    dashboard,
    servers,
    services,
    websites,
    dns,
    ssl,
    files,
    databases,
    php,
    email,
    docker,
    security,
    backups,
    cron,
    terminal,
    users,
    logs,
    settings,
    ws,
    ai,
    deployments
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(servers.router)
api_router.include_router(services.router)
api_router.include_router(websites.router)
api_router.include_router(dns.router)
api_router.include_router(ssl.router)
api_router.include_router(files.router)
api_router.include_router(databases.router)
api_router.include_router(php.router)
api_router.include_router(email.router)
api_router.include_router(docker.router)
api_router.include_router(security.router)
api_router.include_router(backups.router)
api_router.include_router(cron.router)
api_router.include_router(terminal.router)
api_router.include_router(users.router)
api_router.include_router(logs.router)
api_router.include_router(settings.router)
api_router.include_router(ws.router)
api_router.include_router(ai.router)
api_router.include_router(deployments.router)

