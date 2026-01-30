"""SIN-Solver FastAPI Application Package

This module exports the FastAPI application instance and core components for
simplified top-level imports.

Exports:
    - app: FastAPI application instance from CEO_STEEL_MASTER_WORKER
    - Settings: Pydantic settings class from core.config
    - settings: Global settings instance from core.config
    - SecurityManager: Security manager class from core.security
    - get_security_manager: Function to get security manager instance
    - require_api_key: Dependency for API key authentication
    - verify_token_dependency: Dependency for JWT token verification
    - Router modules: solve, auth, health, workers, steel, chat, docs,
                     pentest, secrets, resources, system

This enables imports like:
    from app import app
    from app import SecurityManager, settings
    from app import solve, auth, health, ...
"""

from app.core.config import Settings, settings

from app.core.security import (
    SecurityManager,
    get_security_manager,
    require_api_key,
    verify_token_dependency,
)

from app.api.routes import (
    solve,
    auth,
    health,
    workers,
    steel,
    chat,
    docs,
    pentest,
    secrets,
    resources,
    system,
)

# Import and expose the FastAPI application
from app.core.CEO_STEEL_MASTER_WORKER import app

__all__ = [
    "app",
    "settings",
    "Settings",
    "SecurityManager",
    "get_security_manager",
    "require_api_key",
    "verify_token_dependency",
    "solve",
    "auth",
    "health",
    "workers",
    "steel",
    "chat",
    "docs",
    "pentest",
    "secrets",
    "resources",
    "system",
]
