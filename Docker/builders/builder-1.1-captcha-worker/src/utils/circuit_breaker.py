"""
Circuit Breaker Pattern
Production resilience pattern for external API calls
Extracted from captcha_detector_v2.py
"""

import asyncio
import logging
import threading
from enum import Enum
from typing import Optional, Callable, Any
from datetime import datetime, timedelta
from functools import wraps

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = 0      # Normal operation
    OPEN = 1        # Failing, reject requests
    HALF_OPEN = 2   # Testing if service recovered


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open"""
    pass


class CircuitBreaker:
    """
    Circuit Breaker Pattern Implementation
    Prevents cascade failures by stopping requests to failing services
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        expected_exception: type = Exception
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = CircuitState.CLOSED
        self._lock = threading.Lock()
        
        logger.info(f"🔧 Circuit breaker '{name}' initialized (threshold: {failure_threshold})")
    
    def _update_state(self, new_state: CircuitState):
        """Update circuit state"""
        with self._lock:
            old_state = self.state
            self.state = new_state
            
            if old_state != new_state:
                logger.info(f"🔄 Circuit {self.name}: {old_state.name} -> {new_state.name}")
    
    def can_execute(self) -> bool:
        """Check if request can be executed"""
        with self._lock:
            if self.state == CircuitState.CLOSED:
                return True
            elif self.state == CircuitState.OPEN:
                if self.last_failure_time and \
                   (datetime.utcnow() - self.last_failure_time).total_seconds() >= self.recovery_timeout:
                    self._update_state(CircuitState.HALF_OPEN)
                    return True
                return False
            else:  # HALF_OPEN
                return True
    
    def record_success(self):
        """Record successful execution"""
        with self._lock:
            self.failure_count = 0
            if self.state == CircuitState.HALF_OPEN:
                self._update_state(CircuitState.CLOSED)
    
    def record_failure(self):
        """Record failed execution"""
        with self._lock:
            self.failure_count += 1
            self.last_failure_time = datetime.utcnow()
            
            if self.state == CircuitState.HALF_OPEN:
                self._update_state(CircuitState.OPEN)
            elif self.failure_count >= self.failure_threshold:
                self._update_state(CircuitState.OPEN)
                logger.error(f"⛔ Circuit {self.name} OPENED after {self.failure_count} failures")
    
    def __call__(self, func: Callable):
        """Decorator for circuit breaker pattern"""
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            if not self.can_execute():
                raise CircuitBreakerOpenError(f"Circuit {self.name} is OPEN")
            
            try:
                result = await func(*args, **kwargs)
                self.record_success()
                return result
            except self.expected_exception as e:
                self.record_failure()
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            if not self.can_execute():
                raise CircuitBreakerOpenError(f"Circuit {self.name} is OPEN")
            
            try:
                result = func(*args, **kwargs)
                self.record_success()
                return result
            except self.expected_exception as e:
                self.record_failure()
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    def get_state(self) -> str:
        """Get current circuit state as string"""
        return self.state.name
