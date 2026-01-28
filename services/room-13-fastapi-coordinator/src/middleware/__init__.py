"""
Authentication Middleware
JWT token validation for service-to-service communication
"""

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timedelta
import jwt
import logging

logger = logging.getLogger(__name__)


class AuthMiddleware(BaseHTTPMiddleware):
    """Validates JWT tokens for service authentication"""
    
    EXEMPT_PATHS = {"/health", "/docs", "/openapi.json", "/api/services/register"}
    SECRET_KEY = "your-secret-key-change-in-production"
    ALGORITHM = "HS256"
    
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        if any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS):
            return await call_next(request)
        
        auth_header = request.headers.get("Authorization")
        
        if not auth_header:
            logger.warning(f"Missing auth header for {path}")
            raise HTTPException(status_code=401, detail="Missing authorization header")
        
        try:
            scheme, token = auth_header.split()
            if scheme.lower() != "bearer":
                raise ValueError("Invalid scheme")
            
            payload = jwt.decode(token, self.SECRET_KEY, algorithms=[self.ALGORITHM])
            request.state.service_name = payload.get("service_name")
            request.state.user_id = payload.get("user_id")
            
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return await call_next(request)
    
    @staticmethod
    def create_token(service_name: str, user_id: str = None, expires_in_hours: int = 24) -> str:
        """Create a JWT token for service authentication"""
        payload = {
            "service_name": service_name,
            "user_id": user_id,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(hours=expires_in_hours)
        }
        return jwt.encode(payload, AuthMiddleware.SECRET_KEY, algorithm=AuthMiddleware.ALGORITHM)
