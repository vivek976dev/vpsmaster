"""
Application configuration for VPSMaster Backend.
Supports environment variables with robust defaults for development and production.
"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "VPSMaster"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Security & Tokens
    SECRET_KEY: str = os.getenv("VPSMASTER_SECRET_KEY", "vpsmaster-super-secret-jwt-signing-key-32chars-min")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database: SQLite for instant zero-config setup, PostgreSQL for production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./vpsmaster.db")

    # Redis URL
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Server Agent Communication
    AGENT_URL: str = os.getenv("VPSMASTER_AGENT_URL", "http://127.0.0.1:8001")
    AGENT_SECRET: str = os.getenv("VPSMASTER_AGENT_SECRET", "vpsmaster-internal-agent-secret-key-32chars")

    # Initial Super Admin Seed
    DEFAULT_ADMIN_EMAIL: str = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@vpsmaster.local")
    DEFAULT_ADMIN_USERNAME: str = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
    DEFAULT_ADMIN_PASSWORD: str = os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@123456")

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
