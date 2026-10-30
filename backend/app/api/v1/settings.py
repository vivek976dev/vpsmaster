"""
Admin Settings API Endpoints.
General configurations, SMTP mailer parameters, Telegram webhook, and alert thresholds.
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.middleware.auth import require_roles, record_audit_log
from app.models.settings import SystemSettingModel
from app.models.user import User

router = APIRouter(prefix="/settings", tags=["Admin Settings"])


class SettingsUpdateReq(BaseModel):
    settings: Dict[str, str]


@router.get("", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value, UserRole.ADMINISTRATOR.value]))])
def get_settings(db: Session = Depends(get_db)):
    """Retrieve all configurable panel settings with defaults."""
    records = db.query(SystemSettingModel).all()

    defaults = {
        "panel_name": "VPSMaster Enterprise",
        "primary_ip": "198.51.100.1",
        "smtp_host": "smtp.mailgun.org",
        "smtp_port": "587",
        "smtp_user": "postmaster@vpsmaster.local",
        "smtp_from": "no-reply@vpsmaster.local",
        "smtp_tls": "true",
        "telegram_bot_token": "",
        "telegram_chat_id": "",
        "alert_cpu_threshold": "85",
        "alert_ram_threshold": "90",
        "alert_disk_threshold": "85",
        "auto_ssl_enabled": "true",
        "dark_mode_default": "true"
    }

    for r in records:
        defaults[r.key] = r.value

    return defaults


@router.post("", dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN.value]))])
def update_settings(
    req: SettingsUpdateReq,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    """Save updated system configuration settings."""
    for key, value in req.settings.items():
        record = db.query(SystemSettingModel).filter(SystemSettingModel.key == key).first()
        if record:
            record.value = str(value)
        else:
            db.add(SystemSettingModel(key=key, value=str(value), category="general"))

    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "SETTINGS_UPDATE", f"{len(req.settings)} keys", client_ip)

    return {"success": True, "updated": len(req.settings)}
