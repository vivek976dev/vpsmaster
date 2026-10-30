"""
Cron job schedule model.
"""

from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String

from app.core.database import Base


class CronJobModel(Base):
    __tablename__ = "cron_jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(128), nullable=False)
    command = Column(String(512), nullable=False)
    schedule = Column(String(64), nullable=False)  # e.g. "*/5 * * * *"
    is_active = Column(Boolean, default=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    last_run = Column(DateTime, nullable=True)
    next_run = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

