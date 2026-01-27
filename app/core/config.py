from pydantic_settings import BaseSettings
from typing import Optional, Dict, Any
import httpx
import logging
import asyncio
import os
from pydantic import Field, field_validator

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    # API Security
    secret_key: str = Field(..., env="SECRET_KEY")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week
    refresh_token_expire_days: int = 30
    
    # Infrastructure IPs (Haus-Netzwerk 2026)
    role: str = Field(default="worker", env="ROLE")
    orchestrator_url: str = Field(default="http://172.20.0.31:8000", env="ORCHESTRATOR_URL")
    plugin_hub_url: str = Field(default="http://172.20.0.57:8000", env="PLUGIN_HUB_URL")
    steel_cdp_url: str = Field(default="ws://172.20.0.20:3000/", env="STEEL_CDP_URL")
    redis_url: str = Field(default="redis://172.20.0.10:6379", env="REDIS_URL")
    database_url: str = Field(..., env="DATABASE_URL")
    
    # Worker Credentials
    worker_email: Optional[str] = Field(default=None, env="WORKER_EMAIL")
    worker_password: Optional[str] = Field(default=None, env="WORKER_PASSWORD")
    
    # FREE AI Provider Keys (NO PAID SERVICES!)
    mistral_api_key: Optional[str] = Field(default=None, env="MISTRAL_API_KEY")
    gemini_api_key: Optional[str] = Field(default=None, env="GEMINI_API_KEY")
    groq_api_key: Optional[str] = Field(default=None, env="GROQ_API_KEY")
    cerebras_api_key: Optional[str] = Field(default=None, env="CEREBRAS_API_KEY")
    sambanova_api_key: Optional[str] = Field(default=None, env="SAMBANOVA_API_KEY")
    ollama_url: str = Field(default="http://localhost:11434", env="OLLAMA_URL")
    
    # Captcha Solving (Self-Hosted)
    captcha_solver_mode: str = Field(default="self_hosted", env="CAPTCHA_SOLVER_MODE")
    captcha_vision_provider: str = Field(default="gemini", env="CAPTCHA_VISION_PROVIDER")
    default_ai_provider: str = Field(default="gemini", env="DEFAULT_AI_PROVIDER")
    fallback_ai_provider: str = Field(default="mistral", env="FALLBACK_AI_PROVIDER")
    
    # Feature Flags
    headless: bool = True
    debug: bool = False
    
    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v):
        if not v.startswith("postgresql+asyncpg://"):
            raise ValueError("Database URL must use asyncpg driver")
        return v

    async def fetch_secrets_from_zimmer13(self):
        if self.debug:
            logger.info("Debug mode: Skipping secret retrieval from Zimmer-13")
            return

        if self.role == "orchestrator":
            logger.info("Role is orchestrator: Secrets already loaded from environment/vault")
            return

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.orchestrator_url}/secrets/all", 
                    headers={"X-Internal-Token": self.secret_key}
                )
                if response.status_code == 200:
                    secrets = response.json()
                    self.mistral_api_key = secrets.get("MISTRAL_API_KEY", self.mistral_api_key)
                    self.gemini_api_key = secrets.get("GEMINI_API_KEY", self.gemini_api_key)
                    self.groq_api_key = secrets.get("GROQ_API_KEY", self.groq_api_key)
                    logger.info("Successfully synchronized FREE API keys with Zimmer-13")
                else:
                    logger.warning(f"Failed to fetch secrets from Zimmer-13: {response.status_code}")
        except Exception as e:
            logger.error(f"Error connecting to Zimmer-13 for secrets: {str(e)}")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()


