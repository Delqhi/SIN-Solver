#!/usr/bin/env python3
"""
pytest Configuration for worker-captcha tests
Provides fixtures for SessionManager tmpdir, time mocking, and async support
"""

import asyncio
import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch
import time as real_time


@pytest.fixture(scope="function")
def temp_storage_dir():
    """Create a temporary directory for session storage"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture(autouse=True)
def mock_time_sleep():
    """
    Monkeypatch time.sleep() to use fast_sleep
    Speeds up tests that use time.sleep() for delays
    Runs automatically on all tests
    """

    def fast_sleep(seconds):
        """Speed up sleep for testing (0.01x scale)"""
        if seconds > 0:
            # For testing, reduce sleep to 1% of original
            # This keeps test timing realistic but much faster
            real_time.sleep(seconds * 0.01)

    with patch("time.sleep", side_effect=fast_sleep):
        yield


@pytest.fixture
def mock_session_manager_storage(temp_storage_dir):
    """
    Patch SessionManager to use temp directory instead of /data/sessions
    """
    with patch("session_manager.SessionManager.__init__") as mock_init:
        original_init = __import__(
            "session_manager", fromlist=["SessionManager"]
        ).SessionManager.__init__

        def patched_init(self, account_id, storage_dir=None, **kwargs):
            """Initialize with temp storage directory"""
            if storage_dir is None:
                storage_dir = temp_storage_dir / "sessions"
            original_init(self, account_id, storage_dir=storage_dir, **kwargs)

        mock_init.side_effect = patched_init
        yield temp_storage_dir


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


@pytest.fixture
def async_test_context():
    """Provide async context for tests"""
    return asyncio.get_event_loop()
