"""
Database and Database User models.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class DatabaseModel(Base):
    __tablename__ = "databases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), unique=True, index=True, nullable=False)
    engine = Column(String(16), default="mysql", nullable=False)  # mysql, mariadb, postgresql
    charset = Column(String(32), default="utf8mb4", nullable=False)
    collation = Column(String(32), default="utf8mb4_unicode_ci", nullable=False)
    size_mb = Column(Float, default=0.0, nullable=False)
    website_id = Column(Integer, ForeignKey("websites.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    website = relationship("Website", back_populates="databases")


class DatabaseUserModel(Base):
    __tablename__ = "database_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    engine = Column(String(16), default="mysql", nullable=False)
    host = Column(String(64), default="localhost", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

