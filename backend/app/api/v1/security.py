"""
Security and Firewall API Endpoints.
UFW firewall rules, Fail2Ban jails, SSH hardening, security audit checks, and audit trails.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.middleware.auth import get_current_user, require_roles, record_audit_log
from app.models.security import AuditLogModel, FirewallRuleModel, SecurityAlertModel
from app.models.user import User
from app.schemas.all_schemas import AuditLogOut, FirewallRuleCreate, SecurityAlertOut
from app.services.agent_client import agent_client

router = APIRouter(prefix="/security", tags=["Security Management"])


@router.get("/firewall/status", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def get_firewall_status():
    """Retrieve UFW status and active firewall rules."""
    return await agent_client.get_ufw_status()


@router.post("/firewall/rules", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def add_firewall_rule(
    req: FirewallRuleCreate,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value])),
    db: Session = Depends(get_db)
):
    """Add a validated firewall rule."""
    res = await agent_client.add_ufw_rule(req.port, req.protocol, req.action, req.source_ip)

    rule = FirewallRuleModel(
        port=req.port,
        protocol=req.protocol,
        action=req.action,
        source_ip=req.source_ip or "Anywhere",
        comment=req.comment
    )
    db.add(rule)
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "FIREWALL_RULE_ADD", f"{req.action} {req.port}/{req.protocol}", client_ip)

    return res


@router.delete("/firewall/rules/{rule_num}", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def delete_firewall_rule(
    rule_num: int,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value])),
    db: Session = Depends(get_db)
):
    """Delete a firewall rule by index."""
    res = await agent_client.delete_ufw_rule(rule_num)
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "FIREWALL_RULE_DELETE", f"Rule #{rule_num}", client_ip)
    return res


class ToggleUfwReq(BaseModel):
    enable: bool

@router.post("/firewall/toggle", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def toggle_firewall(
    req: ToggleUfwReq,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value])),
    db: Session = Depends(get_db)
):
    """Enable or disable UFW firewall."""
    res = await agent_client.toggle_ufw(req.enable)
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "FIREWALL_TOGGLE", f"enabled={req.enable}", client_ip)
    return res


@router.get("/fail2ban", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def get_fail2ban_status():
    """Retrieve Fail2Ban active jails and banned IP addresses."""
    return await agent_client.get_fail2ban_status()


class UnbanIpReq(BaseModel):
    jail: str
    ip: str

@router.post("/fail2ban/unban", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def unban_ip(
    req: UnbanIpReq,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value])),
    db: Session = Depends(get_db)
):
    """Unban an IP from a Fail2Ban jail."""
    res = await agent_client.unban_ip(req.jail, req.ip)
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "FAIL2BAN_UNBAN", f"{req.ip} from {req.jail}", client_ip)
    return res


@router.get("/ssh", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def get_ssh_config():
    """Read SSH configuration and hardening parameters."""
    return await agent_client.get_ssh_config()


@router.get("/audit", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
async def run_security_audit():
    """Execute security audit checklist and calculate benchmark score."""
    return await agent_client.get_security_audit()


@router.get("/audit-logs", response_model=List[AuditLogOut], dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Retrieve system audit logs for administrative security tracking."""
    return db.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).limit(limit).all()


@router.get("/alerts", response_model=List[SecurityAlertOut])
def get_security_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get active security alerts."""
    alerts = db.query(SecurityAlertModel).order_by(SecurityAlertModel.created_at.desc()).limit(50).all()
    if not alerts:
        demo_alert = SecurityAlertModel(
            title="System Initialization",
            message="VPSMaster Security Module is active and monitoring all authentication events.",
            severity="info",
            is_read=False
        )
        db.add(demo_alert)
        db.commit()
        db.refresh(demo_alert)
        return [demo_alert]
    return alerts


@router.post("/alerts/{alert_id}/read")
def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark alert as read."""
    alert = db.query(SecurityAlertModel).filter(SecurityAlertModel.id == alert_id).first()
    if alert:
        alert.is_read = True
        db.commit()
    return {"success": True}
