"""
Website models for multi-tenant hosting.
"""

from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Website(Base):
    __tablename__ = "websites"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String(255), unique=True, index=True, nullable=False)
    aliases = Column(Text, default="", nullable=True)  # Comma separated
    document_root = Column(String(512), nullable=False)
    php_version = Column(String(16), default="8.3", nullable=False)
    web_server = Column(String(32), default="nginx", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    ssl_enabled = Column(Boolean, default=False, nullable=False)
    ssl_auto_renew = Column(Boolean, default=True, nullable=False)
    force_https = Column(Boolean, default=False, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="websites")
    databases = relationship("DatabaseModel", back_populates="website", cascade="all, delete-orphan")

