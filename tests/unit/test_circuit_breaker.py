#!/usr/bin/env python3
"""
Unit Tests for Circuit Breaker Pattern
Best Practices 2026 - SIN-Solver Testing Framework
"""

import asyncio
import pytest
import time
import sys
from pathlib import Path

# Add project paths
sys.path.insert(
    0, str(Path(__file__).parent.parent.parent / "Docker/builders/builder-1.1-captcha-worker")
)

from src.utils.circuit_breaker import CircuitBreaker, CircuitState, CircuitBreakerOpenError


class TestCircuitBreaker:
    """Test suite for Circuit Breaker pattern"""

    def test_initial_state(self):
        """Circuit breaker starts in CLOSED state"""
        cb = CircuitBreaker("test_service", failure_threshold=3)
        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 0
        assert cb.can_execute() is True

    def test_failure_count_increment(self):
        """Failure count increments on record_failure"""
        cb = CircuitBreaker("test_service", failure_threshold=3)

        cb.record_failure()
        assert cb.failure_count == 1

        cb.record_failure()
        assert cb.failure_count == 2

    def test_circuit_opens_after_threshold(self):
        """Circuit opens after reaching failure threshold"""
        cb = CircuitBreaker("test_service", failure_threshold=3)

        cb.record_failure()
        cb.record_failure()
        assert cb.state == CircuitState.CLOSED  # Not yet open

        cb.record_failure()  # Third failure
        assert cb.state == CircuitState.OPEN
        assert cb.can_execute() is False

    def test_circuit_closes_on_success(self):
        """Circuit closes when success is recorded in HALF_OPEN"""
        cb = CircuitBreaker("test_service", failure_threshold=2)

        # Open the circuit
        cb.record_failure()
        cb.record_failure()
        assert cb.state == CircuitState.OPEN

        # Manually set to HALF_OPEN for testing
        cb._update_state(CircuitState.HALF_OPEN)
        assert cb.state == CircuitState.HALF_OPEN

        # Success should close it
        cb.record_success()
        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 0

    def test_circuit_reopens_on_half_open_failure(self):
        """Circuit reopens if failure in HALF_OPEN state"""
        cb = CircuitBreaker("test_service", failure_threshold=2)

        # Open the circuit
        cb.record_failure()
        cb.record_failure()

        # Set to half-open
        cb._update_state(CircuitState.HALF_OPEN)

        # Failure should reopen
        cb.record_failure()
        assert cb.state == CircuitState.OPEN

    @pytest.mark.asyncio
    async def test_async_decorator_success(self):
        """Decorator allows execution when closed"""
        cb = CircuitBreaker("test_service", failure_threshold=3)

        @cb
        async def successful_operation():
            return "success"

        result = await successful_operation()
        assert result == "success"
        assert cb.failure_count == 0

    @pytest.mark.asyncio
    async def test_async_decorator_failure(self):
        """Decorator records failure on exception"""
        cb = CircuitBreaker("test_service", failure_threshold=3)

        @cb
        async def failing_operation():
            raise ValueError("Test error")

        with pytest.raises(ValueError):
            await failing_operation()

        assert cb.failure_count == 1

    @pytest.mark.asyncio
    async def test_async_decorator_blocks_when_open(self):
        """Decorator blocks execution when circuit is open"""
        cb = CircuitBreaker("test_service", failure_threshold=1)

        @cb
        async def any_operation():
            return "result"

        # Open the circuit
        cb.record_failure()
        assert cb.state == CircuitState.OPEN

        with pytest.raises(CircuitBreakerOpenError):
            await any_operation()

    def test_sync_decorator(self):
        """Sync decorator works correctly"""
        cb = CircuitBreaker("test_service", failure_threshold=3)

        @cb
        def sync_operation():
            return "sync_result"

        result = sync_operation()
        assert result == "sync_result"

    def test_get_state_returns_string(self):
        """get_state returns string representation"""
        cb = CircuitBreaker("test_service")

        assert cb.get_state() == "CLOSED"

        cb._update_state(CircuitState.OPEN)
        assert cb.get_state() == "OPEN"

        cb._update_state(CircuitState.HALF_OPEN)
        assert cb.get_state() == "HALF_OPEN"

    def test_recovery_timeout(self):
        """Circuit allows execution after recovery timeout"""
        cb = CircuitBreaker("test_service", failure_threshold=1, recovery_timeout=0.1)

        # Open the circuit
        cb.record_failure()
        assert cb.state == CircuitState.OPEN
        assert cb.can_execute() is False

        # Wait for recovery timeout
        time.sleep(0.15)

        # Should transition to HALF_OPEN and allow execution
        assert cb.can_execute() is True
        assert cb.state == CircuitState.HALF_OPEN


class TestCircuitBreakerEdgeCases:
    """Edge case tests for Circuit Breaker"""

    def test_zero_failure_threshold(self):
        """Circuit opens immediately with threshold of 0"""
        cb = CircuitBreaker("test_service", failure_threshold=0)

        # Any failure should open immediately
        cb.record_failure()
        assert cb.state == CircuitState.OPEN

    def test_multiple_successes_reset_count(self):
        """Multiple successes don't go below zero"""
        cb = CircuitBreaker("test_service", failure_threshold=3)

        cb.record_success()
        cb.record_success()
        assert cb.failure_count == 0  # Should stay at 0

    @pytest.mark.asyncio
    async def test_expected_exception_filtering(self):
        """Only expected exceptions trigger failure"""
        cb = CircuitBreaker("test_service", failure_threshold=1, expected_exception=ValueError)

        @cb
        async def raises_type_error():
            raise TypeError("Not expected")

        # TypeError should not trigger circuit breaker
        with pytest.raises(TypeError):
            await raises_type_error()

        assert cb.failure_count == 0
        assert cb.state == CircuitState.CLOSED


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
