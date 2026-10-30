"""
User and Role models.
"""

from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(32), default="website_owner", nullable=False)  # super_admin, administrator, reseller, website_owner
    is_active = Column(Boolean, default=True, nullable=False)
    is_totp_enabled = Column(Boolean, default=False, nullable=False)
    totp_secret = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)

    # Allowed website IDs for non-admin users (comma separated or JSON)
    assigned_websites = Column(Text, default="", nullable=True)

    # Relationships
    websites = relationship("Website", back_populates="owner", cascade="all, delete-orphan")

