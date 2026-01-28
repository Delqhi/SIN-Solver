"""
FREE AI Provider Router - Routes to FREE providers only!
Strategy: grok-code for TEXT, Gemini for VISION
NO PAID SERVICES ALLOWED!
"""
import httpx
import asyncio
import os
import base64
from typing import Optional, Literal, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


@dataclass
class ProviderConfig:
    name: str
    endpoint: str
    model: Optional[str]
    api_key: Optional[str]
    provider_type: Literal["text", "vision", "both"]
    priority: int
    rate_limit: Optional[int] = None
    requests_today: int = 0
    last_reset: datetime = field(default_factory=datetime.now)


class FreeAIRouter:
    def __init__(self):
        self.providers: Dict[str, ProviderConfig] = {
            "opencode_zen": ProviderConfig(
                name="OpenCode Zen (grok-code)",
                endpoint="https://api.opencode.ai/v1/chat/completions",
                model="grok-code",
                api_key=os.getenv("OPENCODE_ZEN_API_KEY"),
                provider_type="text",
                priority=1,
                rate_limit=None,
            ),
            "gemini": ProviderConfig(
                name="Google Gemini 2.0 Flash",
                endpoint="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
                model=None,
                api_key=os.getenv("GEMINI_API_KEY"),
                provider_type="vision",
                priority=1,
                rate_limit=1500,
            ),
            "mistral": ProviderConfig(
                name="Mistral AI",
                endpoint="https://api.mistral.ai/v1/chat/completions",
                model="mistral-small-latest",
                api_key=os.getenv("MISTRAL_API_KEY"),
                provider_type="text",
                priority=2,
                rate_limit=None,
            ),
            "groq": ProviderConfig(
                name="Groq (llama-3.2-90b-vision)",
                endpoint="https://api.groq.com/openai/v1/chat/completions",
                model="llama-3.2-90b-vision-preview",
                api_key=os.getenv("GROQ_API_KEY"),
                provider_type="both",
                priority=2,
                rate_limit=14400,
            ),
            "huggingface": ProviderConfig(
                name="HuggingFace Inference",
                endpoint="https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
                model=None,
                api_key=os.getenv("HUGGINGFACE_API_KEY"),
                provider_type="text",
                priority=3,
                rate_limit=None,
            ),
        }
        self._check_daily_reset()

    def _check_daily_reset(self):
        now = datetime.now()
        for provider in self.providers.values():
            if now.date() > provider.last_reset.date():
                provider.requests_today = 0
                provider.last_reset = now

    def _can_use_provider(self, name: str) -> bool:
        provider = self.providers.get(name)
        if not provider or not provider.api_key:
            return False
        if provider.rate_limit and provider.requests_today >= provider.rate_limit:
            return False
        return True

    async def route_text(self, prompt: str, system: Optional[str] = None) -> Dict[str, Any]:
        self._check_daily_reset()
        text_providers = ["opencode_zen", "mistral", "groq", "huggingface"]
        
        for provider_name in text_providers:
            if not self._can_use_provider(provider_name):
                continue
                
            result = await self._call_text_provider(provider_name, prompt, system)
            if result["success"]:
                self.providers[provider_name].requests_today += 1
                return result
        
        return {"success": False, "error": "All text providers failed or exhausted", "provider": None}

    async def route_vision(self, image_base64: str, prompt: str, system: Optional[str] = None) -> Dict[str, Any]:
        self._check_daily_reset()
        vision_providers = ["gemini", "groq"]
        
        for provider_name in vision_providers:
            provider = self.providers.get(provider_name)
            if not provider or provider.provider_type not in ["vision", "both"]:
                continue
            if not self._can_use_provider(provider_name):
                continue
                
            result = await self._call_vision_provider(provider_name, image_base64, prompt, system)
            if result["success"]:
                self.providers[provider_name].requests_today += 1
                return result
        
        return {"success": False, "error": "All vision providers failed or exhausted", "provider": None}

    async def _call_text_provider(self, name: str, prompt: str, system: Optional[str]) -> Dict[str, Any]:
        provider = self.providers[name]
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                if name == "opencode_zen":
                    return await self._call_opencode_zen(client, provider, prompt, system)
                elif name == "mistral":
                    return await self._call_mistral(client, provider, prompt, system)
                elif name == "groq":
                    return await self._call_groq_text(client, provider, prompt, system)
                elif name == "huggingface":
                    return await self._call_huggingface(client, provider, prompt, system)
                    
        except Exception as e:
            logger.warning(f"Provider {name} failed: {e}")
            return {"success": False, "error": str(e), "provider": name}
        
        return {"success": False, "error": "Unknown provider", "provider": name}

    async def _call_vision_provider(self, name: str, image_base64: str, prompt: str, system: Optional[str]) -> Dict[str, Any]:
        provider = self.providers[name]
        
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                if name == "gemini":
                    return await self._call_gemini_vision(client, provider, image_base64, prompt, system)
                elif name == "groq":
                    return await self._call_groq_vision(client, provider, image_base64, prompt, system)
                    
        except Exception as e:
            logger.warning(f"Vision provider {name} failed: {e}")
            return {"success": False, "error": str(e), "provider": name}
        
        return {"success": False, "error": "Unknown vision provider", "provider": name}

    async def _call_opencode_zen(self, client: httpx.AsyncClient, provider: ProviderConfig, prompt: str, system: Optional[str]) -> Dict[str, Any]:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        response = await client.post(
            provider.endpoint,
            headers={
                "Authorization": f"Bearer {provider.api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": provider.model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 2000
            }
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "success": True,
            "response": data["choices"][0]["message"]["content"],
            "provider": "opencode_zen",
            "model": provider.model
        }

    async def _call_mistral(self, client: httpx.AsyncClient, provider: ProviderConfig, prompt: str, system: Optional[str]) -> Dict[str, Any]:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        response = await client.post(
            provider.endpoint,
            headers={"Authorization": f"Bearer {provider.api_key}"},
            json={
                "model": provider.model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1000
            }
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "success": True,
            "response": data["choices"][0]["message"]["content"],
            "provider": "mistral",
            "model": provider.model
        }

    async def _call_groq_text(self, client: httpx.AsyncClient, provider: ProviderConfig, prompt: str, system: Optional[str]) -> Dict[str, Any]:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        response = await client.post(
            provider.endpoint,
            headers={"Authorization": f"Bearer {provider.api_key}"},
            json={
                "model": "llama-3.1-70b-versatile",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1000
            }
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "success": True,
            "response": data["choices"][0]["message"]["content"],
            "provider": "groq",
            "model": "llama-3.1-70b-versatile"
        }

    async def _call_huggingface(self, client: httpx.AsyncClient, provider: ProviderConfig, prompt: str, system: Optional[str]) -> Dict[str, Any]:
        full_prompt = f"{system}\n\nUser: {prompt}\n\nAssistant:" if system else f"User: {prompt}\n\nAssistant:"
        
        response = await client.post(
            provider.endpoint,
            headers={"Authorization": f"Bearer {provider.api_key}"},
            json={
                "inputs": full_prompt,
                "parameters": {
                    "max_new_tokens": 500,
                    "temperature": 0.7,
                    "return_full_text": False
                }
            }
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "success": True,
            "response": data[0]["generated_text"] if isinstance(data, list) else data.get("generated_text", ""),
            "provider": "huggingface",
            "model": "Mistral-7B-Instruct"
        }

    async def _call_gemini_vision(self, client: httpx.AsyncClient, provider: ProviderConfig, image_base64: str, prompt: str, system: Optional[str]) -> Dict[str, Any]:
        parts = []
        if system:
            parts.append({"text": system})
        parts.append({"text": prompt})
        parts.append({"inline_data": {"mime_type": "image/png", "data": image_base64}})
        
        response = await client.post(
            f"{provider.endpoint}?key={provider.api_key}",
            json={
                "contents": [{"parts": parts}],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 2000
                }
            }
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "success": True,
            "response": data["candidates"][0]["content"]["parts"][0]["text"],
            "provider": "gemini",
            "model": "gemini-2.0-flash"
        }

    async def _call_groq_vision(self, client: httpx.AsyncClient, provider: ProviderConfig, image_base64: str, prompt: str, system: Optional[str]) -> Dict[str, Any]:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_base64}"}}
            ]
        })
        
        response = await client.post(
            provider.endpoint,
            headers={"Authorization": f"Bearer {provider.api_key}"},
            json={
                "model": provider.model,
                "messages": messages,
                "temperature": 0.3,
                "max_tokens": 2000
            }
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "success": True,
            "response": data["choices"][0]["message"]["content"],
            "provider": "groq",
            "model": provider.model
        }

    def get_quota_status(self) -> Dict[str, Dict[str, Any]]:
        self._check_daily_reset()
        return {
            name: {
                "name": p.name,
                "configured": bool(p.api_key),
                "type": p.provider_type,
                "requests_today": p.requests_today,
                "rate_limit": p.rate_limit,
                "remaining": (p.rate_limit - p.requests_today) if p.rate_limit else "unlimited",
                "available": self._can_use_provider(name)
            }
            for name, p in self.providers.items()
        }

    def get_recommended_provider(self, task_type: Literal["text", "vision"]) -> Optional[str]:
        self._check_daily_reset()
        
        if task_type == "text":
            order = ["opencode_zen", "mistral", "groq", "huggingface"]
        else:
            order = ["gemini", "groq"]
        
        for name in order:
            if self._can_use_provider(name):
                provider = self.providers[name]
                if task_type == "vision" and provider.provider_type not in ["vision", "both"]:
                    continue
                return name
        
        return None


ai_router = FreeAIRouter()
