"""
Database configuration and session management for VPSMaster Backend.
Supports PostgreSQL and SQLite for instant, zero-config local operation.
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import settings

engine_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    engine_args["connect_args"] = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    **engine_args
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency for acquiring database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
