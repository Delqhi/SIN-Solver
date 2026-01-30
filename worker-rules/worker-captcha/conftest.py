"""
Pytest Configuration and Fixtures
==================================

Provides:
- Mocked HumanBehavior for fast tests (eliminates time.sleep calls)
- Async test event loop
- Temporary stats directory
"""

import asyncio
import pytest
import time
from pathlib import Path
from unittest.mock import MagicMock, patch
from human_behavior import HumanBehavior


@pytest.fixture
def mock_human_behavior():
    """
    Mock HumanBehavior that removes all sleep() calls for fast testing.

    Instead of:
        time.sleep(4.2)  # Blocks for 4.2 seconds

    We get:
        time.sleep(0.001)  # Blocks for 1 millisecond

    This reduces test runtime from 120+ seconds to <5 seconds.
    """
    behavior = HumanBehavior()

    # Override all sleep-based methods to use minimal delays
    original_sleep = time.sleep

    def fast_sleep(duration):
        """Sleep for 1ms instead of actual duration (for testing)"""
        original_sleep(0.001)

    behavior.wait_before_action = lambda solution_length=0: fast_sleep(1)
    behavior.wait_natural_delay = lambda: fast_sleep(1)
    behavior.take_micro_break = lambda: fast_sleep(1)
    behavior.take_major_break = lambda: fast_sleep(1)

    # Mouse/typing remain instant (no sleep)
    behavior.move_mouse_to = MagicMock()
    behavior.click_with_variation = MagicMock()
    behavior.type_text = MagicMock()

    return behavior


@pytest.fixture
def mock_behavior_patch(monkeypatch):
    """
    Monkeypatch approach: Replace time.sleep with fast_sleep globally.

    This affects all code that calls time.sleep, not just HumanBehavior.
    """
    original_sleep = time.sleep

    def fast_sleep(duration):
        """Sleep for 1ms instead of actual duration"""
        original_sleep(0.001)

    monkeypatch.setattr(time, "sleep", fast_sleep)


@pytest.fixture(autouse=True)
def apply_fast_sleep(monkeypatch):
    """
    AUTO-APPLY: Make all time.sleep() calls instant for faster tests.

    This fixture is automatically applied to all tests (autouse=True).
    It reduces any test that calls time.sleep(X) to time.sleep(0.001).

    Example impact on test_batch_solve_with_monitoring():
    - Before: 20 captchas × 4-8 seconds each = 80-160 seconds (TIMEOUT)
    - After:  20 captchas × 0.001 seconds each = 0.02 seconds (FAST ✅)
    """
    original_sleep = time.sleep
    call_count = [0]  # Mutable counter for testing

    def fast_sleep(duration):
        """Replace time.sleep with minimal delay"""
        call_count[0] += 1
        original_sleep(0.001)  # Sleep for 1ms instead

    # Replace time.sleep globally
    monkeypatch.setattr(time, "sleep", fast_sleep)

    # Store call count for assertions if needed
    fast_sleep.call_count = lambda: call_count[0]


@pytest.fixture
def temp_stats_dir(tmp_path):
    """Provide temporary directory for monitor stats"""
    stats_dir = tmp_path / "monitor_stats"
    stats_dir.mkdir()
    return str(stats_dir)


@pytest.fixture
def event_loop():
    """
    Create asyncio event loop for async tests.

    This fixture ensures each test gets a fresh event loop.
    Required for @pytest.mark.asyncio tests.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# Pytest-asyncio configuration
pytest_plugins = ("pytest_asyncio",)

# Configure asyncio mode (for pytest-asyncio 0.13+)
asyncio_mode = "auto"
