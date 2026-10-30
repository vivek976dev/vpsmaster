"""
AI Server Assistant API Endpoint.
Provides intelligent log error analysis, performance optimization suggestions,
and security auditing insights in a strictly read-only, advisory manner.
NEVER executes high-risk server mutations without explicit manual user approval.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import List, Optional

from app.core.security import UserRole
from app.middleware.auth import require_roles
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["AI Server Assistant"])


class LogAnalysisRequest(BaseModel):
    log_text: str = Field(..., description="Raw log excerpt or error trace")
    source: Optional[str] = Field("nginx", description="Log source: nginx, php, mysql, syslog, system")


class OptimizationRecommendation(BaseModel):
    category: str
    severity: str
    issue: str
    root_cause: str
    remediation_steps: List[str]
    suggested_command: Optional[str] = None
    requires_confirmation: bool = True


@router.post("/analyze", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def analyze_logs(req: LogAnalysisRequest):
    """
    Intelligently inspect error logs, detect failure patterns, and return
    actionable advisory resolutions without automated destructive side-effects.
    """
    text = req.log_text.lower()
    recommendations: List[OptimizationRecommendation] = []

    # 1. Nginx 502 Bad Gateway / Upstream connection refused
    if "502 bad gateway" in text or "connect() failed (111: connection refused)" in text or "connection refused while connecting to upstream" in text:
        recommendations.append(OptimizationRecommendation(
            category="Web Server / Gateway",
            severity="High",
            issue="Nginx 502 Bad Gateway (Upstream Unreachable)",
            root_cause="Nginx is running, but the backend application or PHP-FPM pool is either stopped or listening on a different socket/port.",
            remediation_steps=[
                "Check the PHP-FPM service status: systemctl status php8.3-fpm (or your configured PHP version).",
                "Ensure the FastCGI socket file /run/php/php8.3-fpm.sock exists and is owned by www-data.",
                "If running a Node.js or Python application, verify that your process manager (PM2 / systemd) is active on the expected upstream port."
            ],
            suggested_command="sudo systemctl restart php8.3-fpm && sudo systemctl reload nginx",
            requires_confirmation=True
        ))

    # 2. Database connection refused / MySQL crash
    if "access denied for user" in text or "cannot connect to mysql" in text or "can't connect to local mysql server through socket" in text:
        recommendations.append(OptimizationRecommendation(
            category="Database",
            severity="Critical",
            issue="Database Connection Failure",
            root_cause="Database daemon is down, disk partition is out of space, or credentials in .env do not match grants.",
            remediation_steps=[
                "Verify database process status: systemctl status mysql or systemctl status postgresql.",
                "Inspect available disk space: df -h (if /var is 100% full, MySQL will shut down to prevent table corruption).",
                "Confirm that the username, password, and database match the grants in the Database Manager."
            ],
            suggested_command="sudo systemctl restart mysql",
            requires_confirmation=True
        ))

    # 3. Out of Memory (OOM Killer)
    if "out of memory: kill process" in text or "oom-killer" in text or "killed process" in text:
        recommendations.append(OptimizationRecommendation(
            category="System Memory",
            severity="Critical",
            issue="Kernel OOM-Killer Terminated Application",
            root_cause="Total system RAM and swap was exhausted. Linux kernel terminated the highest memory-consuming process to protect host stability.",
            remediation_steps=[
                "Tune PHP-FPM pm.max_children to prevent pool overload (e.g. reduce from 50 to 10 on low-RAM VPS).",
                "Create or expand the system swap file: allocate a 2GB-4GB swap partition (/swapfile).",
                "Optimize MySQL innodb_buffer_pool_size to consume no more than 50% of available server RAM."
            ],
            suggested_command="sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile",
            requires_confirmation=True
        ))

    # 4. SSL Handshake / Certificate Expiration
    if "ssl_error" in text or "certificate has expired" in text or "sec_error_expired_certificate" in text:
        recommendations.append(OptimizationRecommendation(
            category="SSL / TLS",
            severity="High",
            issue="SSL Certificate Expired or Untrusted",
            root_cause="Let's Encrypt certificate reached its 90-day validity limit without successful renewal.",
            remediation_steps=[
                "Confirm that port 80 is accessible from public IPs (Let's Encrypt HTTP-01 requires port 80).",
                "Trigger the ACME renewal process via the SSL Manager in VPSMaster.",
                "Verify that your DNS A record points directly to this VPS server IP."
            ],
            suggested_command="sudo certbot renew --nginx",
            requires_confirmation=True
        ))

    # Fallback advisory if no specific pattern matched
    if not recommendations:
        recommendations.append(OptimizationRecommendation(
            category="General Diagnostics",
            severity="Info",
            issue="Log Analysis Summary",
            root_cause="No critical catastrophic errors identified in the provided log sample.",
            remediation_steps=[
                "Monitor ongoing traffic in the Centralized Log Viewer.",
                "Verify service uptime and load metrics on the Main Dashboard.",
                "Check UFW firewall rules if connections from external clients are intermittently failing."
            ],
            suggested_command=None,
            requires_confirmation=False
        ))

    return {
        "status": "success",
        "log_length": len(req.log_text),
        "source": req.source,
        "recommendations": recommendations,
        "disclaimer": "AI Server Assistant provides advisory diagnostics. It will never execute commands without explicit administrator confirmation."
    }

