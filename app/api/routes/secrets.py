from fastapi import APIRouter, HTTPException, Header, Depends
from app.core.config import settings
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

def verify_internal_token(x_internal_token: Optional[str] = Header(None)):
    """
    Verifies that the request comes from an internal service within the Haus-Netzwerk.
    """
    if not x_internal_token or x_internal_token != settings.secret_key:
        logger.warning(f"Unauthorized secret access attempt with token: {x_internal_token}")
        raise HTTPException(status_code=401, detail="Unauthorized")
    return x_internal_token

@router.get("/all", response_model=Dict[str, str])
async def get_all_secrets(token: str = Depends(verify_internal_token)):
    """
    Returns all FREE enterprise API keys. Only accessible internally.
    NO PAID SERVICES - 100% FREE TIER ONLY (Gemini, Mistral, Groq, Cerebras, SambaNova)
    """
    logger.info("Internal service requested all secrets (FREE providers only)")
    return {
        # Vision AI Providers (FREE)
        "GEMINI_API_KEY": settings.gemini_api_key or "",
        "MISTRAL_API_KEY": settings.mistral_api_key or "",
        # LLM Providers (FREE)
        "GROQ_API_KEY": settings.groq_api_key or "",
        "CEREBRAS_API_KEY": settings.cerebras_api_key or "",
        "SAMBANOVA_API_KEY": settings.sambanova_api_key or "",
        # Local/Self-hosted
        "OLLAMA_URL": settings.ollama_url or "http://localhost:11434",
    }

@router.get("/{secret_name}")
async def get_secret(secret_name: str, token: str = Depends(verify_internal_token)):
    """
    Returns a specific secret. FREE PROVIDERS ONLY.
    """
    secrets = {
        # Vision AI (FREE)
        "GEMINI_API_KEY": settings.gemini_api_key,
        "MISTRAL_API_KEY": settings.mistral_api_key,
        # LLM (FREE)
        "GROQ_API_KEY": settings.groq_api_key,
        "CEREBRAS_API_KEY": settings.cerebras_api_key,
        "SAMBANOVA_API_KEY": settings.sambanova_api_key,
        # Local
        "OLLAMA_URL": settings.ollama_url,
    }
    
    if secret_name not in secrets:
        raise HTTPException(status_code=404, detail="Secret not found")
        
    return {secret_name: secrets[secret_name] or ""}
