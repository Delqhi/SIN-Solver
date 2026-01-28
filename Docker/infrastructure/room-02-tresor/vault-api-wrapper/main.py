#!/usr/bin/env python3
"""
Vault API Wrapper Service for SIN-Solver
=========================================
FastAPI-based REST wrapper for HashiCorp Vault secrets management.
Provides unified secret access across all SIN-Solver services.

Author: SIN-Solver Team
Version: 1.0.0
Date: 2026-01-28
"""

import os
import json
import logging
import httpx
from typing import Any, Dict, List, Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("vault-api-wrapper")

# ============================================================================
# Configuration
# ============================================================================

class Settings:
    """Application settings from environment variables."""
    VAULT_ADDR: str = os.getenv("VAULT_ADDR", "http://room-02-tresor-vault:8200")
    VAULT_TOKEN: str = os.getenv("VAULT_TOKEN", "s.root2026SINSolver")
    VAULT_MOUNT_PATH: str = os.getenv("VAULT_MOUNT_PATH", "sin-solver")
    VERCEL_TOKEN: str = os.getenv("VERCEL_TOKEN", "")
    VERCEL_PROJECT_ID: str = os.getenv("VERCEL_PROJECT_ID", "")
    VERCEL_TEAM_ID: str = os.getenv("VERCEL_TEAM_ID", "")
    N8N_HOST: str = os.getenv("N8N_HOST", "http://agent-01-n8n-orchestrator:5678")
    N8N_API_KEY: str = os.getenv("N8N_API_KEY", "")

settings = Settings()

# ============================================================================
# Pydantic Models
# ============================================================================

class SecretData(BaseModel):
    """Model for secret data input."""
    data: Dict[str, Any] = Field(..., description="Secret key-value pairs")

class SecretResponse(BaseModel):
    """Model for secret response."""
    path: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None

class SyncResponse(BaseModel):
    """Model for sync operation response."""
    success: bool
    synced_secrets: List[str]
    failed_secrets: List[str] = []
    message: str

class HealthResponse(BaseModel):
    """Model for health check response."""
    status: str
    vault_connected: bool
    timestamp: str

class SecretListResponse(BaseModel):
    """Model for listing secrets."""
    paths: List[str]
    count: int

# ============================================================================
# Vault Client
# ============================================================================

class VaultClient:
    """Async client for HashiCorp Vault KV v2 secrets engine."""
    
    def __init__(self, addr: str, token: str, mount_path: str = "sin-solver"):
        self.addr = addr.rstrip("/")
        self.token = token
        self.mount_path = mount_path
        self.headers = {"X-Vault-Token": token}
    
    async def is_healthy(self) -> bool:
        """Check if Vault is healthy and reachable."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.addr}/v1/sys/health",
                    timeout=5.0
                )
                return response.status_code in (200, 429, 472, 473, 501, 503)
        except Exception as e:
            logger.error(f"Vault health check failed: {e}")
            return False
    
    async def read_secret(self, path: str) -> Dict[str, Any]:
        """Read a secret from Vault KV v2."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.addr}/v1/{self.mount_path}/data/{path}"
                response = await client.get(url, headers=self.headers, timeout=10.0)
                
                if response.status_code == 404:
                    raise HTTPException(status_code=404, detail=f"Secret not found: {path}")
                
                response.raise_for_status()
                data = response.json()
                return {
                    "data": data.get("data", {}).get("data", {}),
                    "metadata": data.get("data", {}).get("metadata", {})
                }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to read secret {path}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to read secret: {str(e)}")
    
    async def write_secret(self, path: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Write a secret to Vault KV v2."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.addr}/v1/{self.mount_path}/data/{path}"
                payload = {"data": data}
                response = await client.post(
                    url, 
                    headers=self.headers, 
                    json=payload,
                    timeout=10.0
                )
                response.raise_for_status()
                return response.json().get("data", {})
        except Exception as e:
            logger.error(f"Failed to write secret {path}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to write secret: {str(e)}")
    
    async def delete_secret(self, path: str) -> bool:
        """Delete a secret from Vault KV v2."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.addr}/v1/{self.mount_path}/data/{path}"
                response = await client.delete(url, headers=self.headers, timeout=10.0)
                return response.status_code in (200, 204)
        except Exception as e:
            logger.error(f"Failed to delete secret {path}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete secret: {str(e)}")
    
    async def list_secrets(self, path: str = "") -> List[str]:
        """List secrets at a path in Vault KV v2."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.addr}/v1/{self.mount_path}/metadata/{path}"
                response = await client.request(
                    "LIST", 
                    url, 
                    headers=self.headers,
                    timeout=10.0
                )
                
                if response.status_code == 404:
                    return []
                
                response.raise_for_status()
                return response.json().get("data", {}).get("keys", [])
        except Exception as e:
            logger.error(f"Failed to list secrets at {path}: {e}")
            return []
    
    async def enable_kv_engine(self) -> bool:
        """Enable the KV v2 secrets engine at mount path."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.addr}/v1/sys/mounts/{self.mount_path}"
                payload = {
                    "type": "kv",
                    "options": {"version": "2"}
                }
                response = await client.post(
                    url, 
                    headers=self.headers, 
                    json=payload,
                    timeout=10.0
                )
                return response.status_code in (200, 204)
        except Exception as e:
            logger.warning(f"KV engine enable (may already exist): {e}")
            return True

# Global vault client instance
vault_client = VaultClient(
    addr=settings.VAULT_ADDR,
    token=settings.VAULT_TOKEN,
    mount_path=settings.VAULT_MOUNT_PATH
)

# ============================================================================
# Sync Services
# ============================================================================

class VercelSync:
    """Sync secrets to Vercel environment variables."""
    
    def __init__(self, token: str, project_id: str, team_id: str = ""):
        self.token = token
        self.project_id = project_id
        self.team_id = team_id
        self.base_url = "https://api.vercel.com"
    
    async def sync_secret(self, key: str, value: str, target: str = "production") -> bool:
        """Sync a single secret to Vercel."""
        if not self.token or not self.project_id:
            logger.warning("Vercel credentials not configured")
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/v10/projects/{self.project_id}/env"
                if self.team_id:
                    url += f"?teamId={self.team_id}"
                
                headers = {
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "key": key,
                    "value": value,
                    "type": "encrypted",
                    "target": [target]
                }
                
                # Try to create, if exists update
                response = await client.post(url, headers=headers, json=payload, timeout=10.0)
                
                if response.status_code == 400 and "already exists" in response.text.lower():
                    # Update existing
                    env_id = await self._get_env_id(key)
                    if env_id:
                        update_url = f"{self.base_url}/v10/projects/{self.project_id}/env/{env_id}"
                        if self.team_id:
                            update_url += f"?teamId={self.team_id}"
                        response = await client.patch(update_url, headers=headers, json=payload, timeout=10.0)
                
                return response.status_code in (200, 201)
        except Exception as e:
            logger.error(f"Failed to sync to Vercel: {e}")
            return False
    
    async def _get_env_id(self, key: str) -> Optional[str]:
        """Get the ID of an existing environment variable."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/v10/projects/{self.project_id}/env"
                if self.team_id:
                    url += f"?teamId={self.team_id}"
                
                headers = {"Authorization": f"Bearer {self.token}"}
                response = await client.get(url, headers=headers, timeout=10.0)
                
                if response.status_code == 200:
                    envs = response.json().get("envs", [])
                    for env in envs:
                        if env.get("key") == key:
                            return env.get("id")
        except Exception:
            pass
        return None

class N8nSync:
    """Sync secrets to n8n credentials."""
    
    def __init__(self, host: str, api_key: str = ""):
        self.host = host.rstrip("/")
        self.api_key = api_key
    
    async def sync_credentials(self, name: str, data: Dict[str, Any], cred_type: str) -> bool:
        """Sync credentials to n8n."""
        if not self.host:
            logger.warning("N8N host not configured")
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.host}/api/v1/credentials"
                headers = {"Content-Type": "application/json"}
                if self.api_key:
                    headers["X-N8N-API-KEY"] = self.api_key
                
                payload = {
                    "name": name,
                    "type": cred_type,
                    "data": data
                }
                
                response = await client.post(url, headers=headers, json=payload, timeout=10.0)
                return response.status_code in (200, 201)
        except Exception as e:
            logger.error(f"Failed to sync to n8n: {e}")
            return False

# ============================================================================
# FastAPI Application
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Starting Vault API Wrapper...")
    logger.info(f"Vault Address: {settings.VAULT_ADDR}")
    
    # Initialize KV engine on startup
    await vault_client.enable_kv_engine()
    
    yield
    
    logger.info("Shutting down Vault API Wrapper...")

app = FastAPI(
    title="SIN-Solver Vault API Wrapper",
    description="REST API wrapper for HashiCorp Vault secrets management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint."""
    is_healthy = await vault_client.is_healthy()
    return HealthResponse(
        status="healthy" if is_healthy else "degraded",
        vault_connected=is_healthy,
        timestamp=datetime.utcnow().isoformat()
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check."""
    is_healthy = await vault_client.is_healthy()
    return HealthResponse(
        status="healthy" if is_healthy else "degraded",
        vault_connected=is_healthy,
        timestamp=datetime.utcnow().isoformat()
    )

# --------------------------------------------------------------------------
# Secrets CRUD Operations
# --------------------------------------------------------------------------

@app.get("/secrets/{path:path}", response_model=SecretResponse)
async def get_secret(path: str):
    """
    Retrieve a secret from Vault.
    
    Example: GET /secrets/postgres -> Returns PostgreSQL credentials
    """
    result = await vault_client.read_secret(path)
    return SecretResponse(
        path=path,
        data=result["data"],
        metadata=result.get("metadata")
    )

@app.post("/secrets/{path:path}", response_model=SecretResponse)
async def create_secret(path: str, secret: SecretData):
    """
    Create or update a secret in Vault.
    
    Example: POST /secrets/postgres with {"data": {"host": "...", "password": "..."}}
    """
    metadata = await vault_client.write_secret(path, secret.data)
    return SecretResponse(
        path=path,
        data=secret.data,
        metadata=metadata
    )

@app.put("/secrets/{path:path}", response_model=SecretResponse)
async def update_secret(path: str, secret: SecretData):
    """Update an existing secret (same as create)."""
    return await create_secret(path, secret)

@app.delete("/secrets/{path:path}")
async def delete_secret(path: str):
    """Delete a secret from Vault."""
    success = await vault_client.delete_secret(path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete secret")
    return {"message": f"Secret {path} deleted successfully"}

@app.get("/secrets", response_model=SecretListResponse)
async def list_secrets(prefix: str = Query("", description="Path prefix to list")):
    """List all secrets at the given path prefix."""
    secrets = await vault_client.list_secrets(prefix)
    return SecretListResponse(
        paths=secrets,
        count=len(secrets)
    )

# --------------------------------------------------------------------------
# Sync Operations
# --------------------------------------------------------------------------

@app.post("/secrets/sync/vercel", response_model=SyncResponse)
async def sync_to_vercel(
    background_tasks: BackgroundTasks,
    target: str = Query("production", description="Vercel environment target")
):
    """
    Sync all secrets to Vercel environment variables.
    
    Maps Vault secrets to Vercel env vars:
    - sin-solver/postgres/* -> POSTGRES_*
    - sin-solver/redis/* -> REDIS_*
    - sin-solver/opencode/* -> OPENCODE_*
    """
    vercel_sync = VercelSync(
        token=settings.VERCEL_TOKEN,
        project_id=settings.VERCEL_PROJECT_ID,
        team_id=settings.VERCEL_TEAM_ID
    )
    
    # Mapping of Vault paths to Vercel env var prefixes
    secret_mappings = {
        "postgres": {
            "prefix": "POSTGRES_",
            "keys": ["host", "port", "username", "password", "database"]
        },
        "redis": {
            "prefix": "REDIS_",
            "keys": ["host", "port", "password"]
        },
        "opencode": {
            "prefix": "OPENCODE_",
            "keys": ["api_key", "base_url"]
        },
        "vercel": {
            "prefix": "",
            "keys": ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_CODESERVER_API_URL", "NEXT_PUBLIC_ENVIRONMENT"]
        }
    }
    
    synced = []
    failed = []
    
    for vault_path, mapping in secret_mappings.items():
        try:
            result = await vault_client.read_secret(vault_path)
            secret_data = result["data"]
            
            for key in mapping["keys"]:
                if key in secret_data:
                    env_key = f"{mapping['prefix']}{key.upper()}" if mapping['prefix'] else key
                    success = await vercel_sync.sync_secret(env_key, str(secret_data[key]), target)
                    if success:
                        synced.append(env_key)
                    else:
                        failed.append(env_key)
        except HTTPException:
            failed.append(f"{vault_path}/*")
        except Exception as e:
            logger.error(f"Error syncing {vault_path}: {e}")
            failed.append(f"{vault_path}/*")
    
    return SyncResponse(
        success=len(failed) == 0,
        synced_secrets=synced,
        failed_secrets=failed,
        message=f"Synced {len(synced)} secrets to Vercel ({target})"
    )

@app.post("/secrets/sync/n8n", response_model=SyncResponse)
async def sync_to_n8n(background_tasks: BackgroundTasks):
    """
    Sync relevant secrets to n8n credentials store.
    
    Creates n8n credentials for:
    - PostgreSQL database connection
    - Redis connection
    - OpenCode API
    """
    n8n_sync = N8nSync(
        host=settings.N8N_HOST,
        api_key=settings.N8N_API_KEY
    )
    
    synced = []
    failed = []
    
    # Sync PostgreSQL credentials
    try:
        result = await vault_client.read_secret("postgres")
        success = await n8n_sync.sync_credentials(
            name="SIN-Solver PostgreSQL",
            data={
                "host": result["data"].get("host", "room-03-postgres-master"),
                "database": result["data"].get("database", "sin_solver"),
                "user": result["data"].get("username", "postgres"),
                "password": result["data"].get("password"),
                "port": int(result["data"].get("port", 5432)),
                "ssl": False
            },
            cred_type="postgres"
        )
        (synced if success else failed).append("postgres")
    except Exception as e:
        logger.error(f"Failed to sync postgres to n8n: {e}")
        failed.append("postgres")
    
    # Sync Redis credentials
    try:
        result = await vault_client.read_secret("redis")
        success = await n8n_sync.sync_credentials(
            name="SIN-Solver Redis",
            data={
                "host": result["data"].get("host", "room-04-redis-cache"),
                "port": int(result["data"].get("port", 6379)),
                "password": result["data"].get("password")
            },
            cred_type="redis"
        )
        (synced if success else failed).append("redis")
    except Exception as e:
        logger.error(f"Failed to sync redis to n8n: {e}")
        failed.append("redis")
    
    return SyncResponse(
        success=len(failed) == 0,
        synced_secrets=synced,
        failed_secrets=failed,
        message=f"Synced {len(synced)} credentials to n8n"
    )

@app.post("/secrets/sync/all", response_model=Dict[str, SyncResponse])
async def sync_to_all(background_tasks: BackgroundTasks):
    """Sync secrets to all configured destinations (Vercel + n8n)."""
    vercel_result = await sync_to_vercel(background_tasks)
    n8n_result = await sync_to_n8n(background_tasks)
    
    return {
        "vercel": vercel_result,
        "n8n": n8n_result
    }

# --------------------------------------------------------------------------
# Initialization / Bootstrap
# --------------------------------------------------------------------------

@app.post("/secrets/init")
async def initialize_secrets():
    """
    Initialize Vault with all required SIN-Solver secrets.
    
    This endpoint populates Vault with the default secret structure.
    Should be called once after Vault is first set up.
    """
    # Read secrets from environment (loaded from .env)
    secrets_to_init = {
        "postgres": {
            "host": os.getenv("POSTGRES_HOST", "room-03-postgres-master"),
            "port": os.getenv("POSTGRES_PORT", "5432"),
            "username": os.getenv("POSTGRES_USER", "postgres"),
            "password": os.getenv("POSTGRES_PASSWORD", ""),
            "database": os.getenv("POSTGRES_DB", "sin_solver")
        },
        "redis": {
            "host": os.getenv("REDIS_HOST", "room-04-redis-cache"),
            "port": os.getenv("REDIS_PORT", "6379"),
            "password": os.getenv("REDIS_PASSWORD", "")
        },
        "n8n": {
            "encryption_key": os.getenv("N8N_ENCRYPTION_KEY", ""),
            "jwt_secret": os.getenv("N8N_USER_MANAGEMENT_JWT_SECRET", ""),
            "host": os.getenv("N8N_HOST", "http://agent-01-n8n-orchestrator:5678")
        },
        "opencode": {
            "api_key": os.getenv("OPENCODE_API_KEY", ""),
            "base_url": os.getenv("OPENCODE_BASE_URL", "https://api.opencode.ai/v1")
        },
        "vercel": {
            "token": os.getenv("VERCEL_TOKEN", ""),
            "project_id": os.getenv("VERCEL_PROJECT_ID", ""),
            "team_id": os.getenv("VERCEL_TEAM_ID", "")
        },
        "github": {
            "token": os.getenv("GITHUB_TOKEN", ""),
            "repo": os.getenv("GITHUB_REPO", "")
        },
        "codeserver": {
            "api_url": os.getenv("CODESERVER_API_URL", ""),
            "api_key": os.getenv("CODESERVER_API_KEY", "")
        }
    }
    
    initialized = []
    failed = []
    
    for path, data in secrets_to_init.items():
        try:
            await vault_client.write_secret(path, data)
            initialized.append(path)
            logger.info(f"Initialized secret: {path}")
        except Exception as e:
            logger.error(f"Failed to initialize {path}: {e}")
            failed.append(path)
    
    return {
        "success": len(failed) == 0,
        "initialized": initialized,
        "failed": failed,
        "message": f"Initialized {len(initialized)}/{len(secrets_to_init)} secrets"
    }

# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8201,
        reload=True,
        log_level="info"
    )
