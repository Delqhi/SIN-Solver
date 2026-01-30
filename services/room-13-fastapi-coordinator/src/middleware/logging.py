"""
Request/Response Logging Middleware
Captures and logs all API requests for audit and debugging
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse
from datetime import datetime
import logging
import json
import uuid

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Logs all HTTP requests and responses"""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        start_time = datetime.utcnow()

        try:
            body = await request.body() if request.method in ["POST", "PUT", "PATCH"] else b""
        except:
            body = b""

        log_data = {
            "request_id": request_id,
            "timestamp": start_time.isoformat(),
            "method": request.method,
            "path": request.url.path,
            "client": request.client.host if request.client else "unknown",
            "body_size": len(body),
        }

        response = await call_next(request)

        process_time = (datetime.utcnow() - start_time).total_seconds()

        log_data.update(
            {"status_code": response.status_code, "response_time_seconds": process_time}
        )

        log_level = (
            "info"
            if response.status_code < 400
            else "warning"
            if response.status_code < 500
            else "error"
        )
        getattr(logger, log_level)(json.dumps(log_data))

        return response
