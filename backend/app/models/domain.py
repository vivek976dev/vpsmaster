"""
Domain and DNS Zone Record models.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Domain(Base):
    __tablename__ = "domains"

    id = Column(Integer, primary_key=True, index=True)
    domain_name = Column(String(255), unique=True, index=True, nullable=False)
    website_id = Column(Integer, ForeignKey("websites.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    dns_records = relationship("DNSRecord", back_populates="domain", cascade="all, delete-orphan")


class DNSRecord(Base):
    __tablename__ = "dns_records"

    id = Column(Integer, primary_key=True, index=True)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=False)
    record_type = Column(String(10), nullable=False)  # A, AAAA, CNAME, MX, TXT, NS, CAA
    host = Column(String(255), nullable=False)  # e.g. '@', 'mail', 'www'
    value = Column(String(512), nullable=False)
    ttl = Column(Integer, default=3600, nullable=False)
    priority = Column(Integer, nullable=True)  # For MX, SRV
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship
    domain = relationship("Domain", back_populates="dns_records")

