"""
Configuration Management
Environment-based settings for Zimmer-13 API Coordinator
"""

from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    app_name: str = "room-13-api-coordinator"
    app_version: str = "1.0.0"
    debug: bool = False

    postgres_url: str = (
        "postgresql://ceo_admin:secure_ceo_password_2026@localhost:5432/sin_solver_production"
    )
    redis_url: str = "redis://localhost:6379"

    encryption_key: str = "default-key-change-in-production"
    jwt_secret: str = "default-jwt-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    heartbeat_interval: int = 30
    heartbeat_timeout: int = 90

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
