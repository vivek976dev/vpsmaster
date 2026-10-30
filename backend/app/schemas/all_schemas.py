"""
Pydantic validation schemas for VPSMaster Backend API.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field


# ================= AUTH & USER SCHEMAS =================

class UserLogin(BaseModel):
    username_or_email: str
    password: str
    totp_code: Optional[str] = None


class TwoFactorVerify(BaseModel):
    totp_code: str = Field(..., min_length=6, max_length=6)


class TwoFactorSetupResponse(BaseModel):
    secret: str
    qr_code_base64: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]
    requires_2fa: bool = False


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = "website_owner"
    assigned_websites: Optional[str] = ""


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    assigned_websites: Optional[str] = None
    password: Optional[str] = None


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    is_totp_enabled: bool
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    assigned_websites: Optional[str] = None

    class Config:
        from_attributes = True


# ================= WEBSITE SCHEMAS =================

class WebsiteCreate(BaseModel):
    domain: str
    aliases: Optional[str] = ""
    php_version: str = "8.3"
    web_server: str = "nginx"
    force_https: bool = False
    create_database: bool = False
    database_name: Optional[str] = None


class WebsiteUpdate(BaseModel):
    php_version: Optional[str] = None
    aliases: Optional[str] = None
    force_https: Optional[bool] = None
    ssl_auto_renew: Optional[bool] = None


class WebsiteOut(BaseModel):
    id: int
    domain: str
    aliases: Optional[str] = None
    document_root: str
    php_version: str
    web_server: str
    is_active: bool
    ssl_enabled: bool
    ssl_auto_renew: bool
    force_https: bool
    owner_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ================= DOMAIN & DNS SCHEMAS =================

class DomainCreate(BaseModel):
    domain_name: str
    website_id: Optional[int] = None


class DNSRecordCreate(BaseModel):
    record_type: str = Field(..., pattern="^(A|AAAA|CNAME|MX|TXT|NS|CAA)$")
    host: str = "@"
    value: str
    ttl: int = 3600
    priority: Optional[int] = None


class DNSRecordOut(BaseModel):
    id: int
    domain_id: int
    record_type: str
    host: str
    value: str
    ttl: int
    priority: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DomainOut(BaseModel):
    id: int
    domain_name: str
    website_id: Optional[int] = None
    owner_id: int
    created_at: Optional[datetime] = None
    dns_records: List[DNSRecordOut] = []

    class Config:
        from_attributes = True


# ================= DATABASE SCHEMAS =================

class DatabaseCreate(BaseModel):
    name: str
    engine: str = "mysql"
    website_id: Optional[int] = None


class DatabaseUserCreate(BaseModel):
    username: str
    password: str
    engine: str = "mysql"
    database_name: Optional[str] = None


class DatabaseOut(BaseModel):
    id: int
    name: str
    engine: str
    charset: str
    collation: str
    size_mb: float
    website_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ================= BACKUP SCHEMAS =================

class BackupTrigger(BaseModel):
    name: str
    backup_type: str = "website"  # full, website, database
    target_domain: Optional[str] = None
    storage_driver: str = "local"


class BackupOut(BaseModel):
    id: int
    name: str
    backup_type: str
    target_domain: Optional[str] = None
    file_path: str
    file_size_mb: float
    sha256: Optional[str] = None
    status: str
    storage_driver: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ================= CRON SCHEMAS =================

class CronCreate(BaseModel):
    title: str
    command: str
    schedule: str  # e.g. "0 2 * * *"
    is_active: bool = True


class CronOut(BaseModel):
    id: int
    title: str
    command: str
    schedule: str
    is_active: bool
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ================= SECURITY & FIREWALL SCHEMAS =================

class FirewallRuleCreate(BaseModel):
    port: int
    protocol: str = "tcp"
    action: str = "allow"
    source_ip: Optional[str] = "Anywhere"
    comment: Optional[str] = None


class FirewallRuleOut(BaseModel):
    id: int
    port: int
    protocol: str
    action: str
    source_ip: str
    comment: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SecurityAlertOut(BaseModel):
    id: int
    title: str
    message: str
    severity: str
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: str
    action: str
    resource: Optional[str] = None
    ip_address: str
    details: Optional[str] = None
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


# ================= SERVER MANAGEMENT SCHEMAS =================

class HostnameUpdate(BaseModel):
    hostname: str


class TimezoneUpdate(BaseModel):
    timezone: str


class ServiceAction(BaseModel):
    action: str = Field(..., pattern="^(start|stop|restart|reload|enable|disable)$")

