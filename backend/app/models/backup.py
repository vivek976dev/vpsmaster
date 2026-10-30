"""
Backup management model.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String

from app.core.database import Base


class BackupModel(Base):
    __tablename__ = "backups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    backup_type = Column(String(32), default="website", nullable=False)  # full, website, database
    target_domain = Column(String(255), nullable=True)
    file_path = Column(String(512), nullable=False)
    file_size_mb = Column(Float, default=0.0, nullable=False)
    sha256 = Column(String(64), nullable=True)
    status = Column(String(32), default="completed", nullable=False)  # completed, in_progress, failed
    storage_driver = Column(String(32), default="local", nullable=False)  # local, s3, sftp
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

