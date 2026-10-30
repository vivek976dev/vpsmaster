"""
Security, Firewall, Audit Log, and Alert models.
"""

from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from app.core.database import Base


class FirewallRuleModel(Base):
    __tablename__ = "firewall_rules"

    id = Column(Integer, primary_key=True, index=True)
    port = Column(Integer, nullable=False)
    protocol = Column(String(8), default="tcp", nullable=False)  # tcp, udp, any
    action = Column(String(16), default="allow", nullable=False)  # allow, deny, reject
    source_ip = Column(String(64), default="Anywhere", nullable=False)
    comment = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(64), nullable=False)
    action = Column(String(64), nullable=False)  # e.g. "WEBSITE_CREATE", "FIREWALL_RULE_ADD"
    resource = Column(String(255), nullable=True)
    ip_address = Column(String(64), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SecurityAlertModel(Base):
    __tablename__ = "security_alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(128), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(16), default="medium", nullable=False)  # info, low, medium, high, critical
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

