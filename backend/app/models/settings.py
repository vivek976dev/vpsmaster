"""
System settings and preferences models.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String, Text

from app.core.database import Base


class SystemSettingModel(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(64), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    category = Column(String(32), default="general", nullable=False)  # general, smtp, telegram, backups, alerts
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

