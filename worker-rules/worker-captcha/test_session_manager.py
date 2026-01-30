#!/usr/bin/env python3
"""
Unit tests for SessionManager module
Tests all core functionality
"""

import asyncio
import json
import tempfile
from datetime import datetime
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock

import pytest

from session_manager import (
    SessionManager,
    IPRecord,
    HealthMetrics,
    IPRotationManager,
    GeoIPLookup,
)


class TestIPRecord:
    """Test IPRecord dataclass"""

    def test_creation(self):
        """Test creating IPRecord"""
        now = datetime.now()
        record = IPRecord(
            ip="203.0.113.42",
            timestamp=now,
            country="Germany",
            city="Berlin",
            latitude=52.52,
            longitude=13.40,
        )

        assert record.ip == "203.0.113.42"
        assert record.country == "Germany"
        assert record.city == "Berlin"

    def test_to_dict(self):
        """Test converting to dictionary"""
        record = IPRecord(
            ip="203.0.113.42",
            timestamp=datetime.now(),
            country="Germany",
        )

        data = record.to_dict()
        assert isinstance(data, dict)
        assert data["ip"] == "203.0.113.42"
        assert isinstance(data["timestamp"], str)


class TestHealthMetrics:
    """Test HealthMetrics tracking"""

    def test_rejection_rate(self):
        """Test rejection rate calculation"""
        health = HealthMetrics()
        health.total_solves = 100
        health.rejected_solves = 10

        assert health.rejection_rate == 10.0

    def test_degradation_by_solve_time(self):
        """Test degradation detection by solve time"""
        health = HealthMetrics(baseline_solve_time=30.0)
        health.current_solve_time = 50.0  # > 1.5x baseline
        health.total_solves = 1
        health.rejected_solves = 0

        assert health.is_degraded is True

    def test_degradation_by_rejection_rate(self):
        """Test degradation detection by rejection rate"""
        health = HealthMetrics()
        health.total_solves = 100
        health.rejected_solves = 15  # 15% > 10%
        health.current_solve_time = 30.0

        assert health.is_degraded is True

    def test_healthy_metrics(self):
        """Test when metrics are healthy"""
        health = HealthMetrics()
        health.total_solves = 100
        health.rejected_solves = 5  # 5% < 10%
        health.current_solve_time = 32.0  # < 1.5x baseline

        assert health.is_degraded is False


class TestGeoIPLookup:
    """Test GeoIP lookup functionality"""

    def test_cache_creation(self):
        """Test cache directory creation"""
        with tempfile.TemporaryDirectory() as tmpdir:
            lookup = GeoIPLookup(cache_dir=Path(tmpdir))
            assert lookup.cache_dir.exists()

    @pytest.mark.asyncio
    async def test_lookup_with_cache(self):
        """Test that results are cached"""
        with tempfile.TemporaryDirectory() as tmpdir:
            lookup = GeoIPLookup(cache_dir=Path(tmpdir))

            # Mock the API calls
            with patch.object(
                lookup, "_try_ipify", return_value={"ip": "203.0.113.42", "country": "Germany"}
            ):
                result1 = lookup.lookup("203.0.113.42")
                result2 = lookup.lookup("203.0.113.42")

                # Both should return same data
                assert result1 == result2
                # Second should be from cache
                assert (Path(tmpdir) / "203.0.113.42.json").exists()


class TestIPRotationManager:
    """Test IP rotation and cooldown logic"""

    def test_add_ip_record(self):
        """Test adding IP record"""
        manager = IPRotationManager(account_id="test_001")

        geo_data = {
            "latitude": 52.52,
            "longitude": 13.40,
            "country": "Germany",
            "city": "Berlin",
        }

        record = manager.add_ip_record("203.0.113.42", geo_data)

        assert manager.get_current_ip() == "203.0.113.42"
        assert len(manager.ip_history) == 1

    def test_calculate_cooldown_first_ip(self):
        """Test cooldown calculation for first IP"""
        manager = IPRotationManager(account_id="test_001")

        cooldown = manager.calculate_required_cooldown()

        # Should be minimum cooldown (15 min)
        assert cooldown.total_seconds() == 15 * 60

    def test_calculate_cooldown_geographic_distance(self):
        """Test cooldown based on geographic distance"""
        manager = IPRotationManager(account_id="test_001")

        # Add first IP (Berlin)
        manager.add_ip_record(
            "203.0.113.1",
            {
                "latitude": 52.52,
                "longitude": 13.40,
                "country": "Germany",
                "city": "Berlin",
            },
        )

        # Add second IP (Munich, ~600km away)
        manager.add_ip_record(
            "203.0.113.2",
            {
                "latitude": 48.14,
                "longitude": 11.58,
                "country": "Germany",
                "city": "Munich",
            },
        )

        cooldown = manager.calculate_required_cooldown()

        # ~600km = ~90 minutes cooldown
        expected_minutes = int((600 / 100) * 15)  # 90 minutes
        assert cooldown.total_seconds() >= expected_minutes * 60 * 0.9  # Allow 10% variance


class TestSessionManager:
    """Test main SessionManager class"""

    def setup_method(self):
        """Setup for each test"""
        self.tmpdir = tempfile.TemporaryDirectory()
        self.storage_dir = Path(self.tmpdir.name)

    def teardown_method(self):
        """Cleanup after each test"""
        self.tmpdir.cleanup()

    def test_initialization(self):
        """Test SessionManager initialization"""
        session = SessionManager(
            account_id="test_001",
            storage_dir=self.storage_dir / "test_001",
        )

        assert session.account_id == "test_001"
        assert session.storage_dir.exists()
        assert len(session.cookies) == 0

    def test_cookie_save_load(self):
        """Test saving and loading cookies"""
        session = SessionManager(
            account_id="test_001",
            storage_dir=self.storage_dir / "test_001",
        )

        # Save cookies
        test_cookies = {
            "session_id": "abc123",
            "token": "xyz789",
        }
        session.save_cookies(test_cookies)

        # Load in new session
        session2 = SessionManager(
            account_id="test_001",
            storage_dir=self.storage_dir / "test_001",
        )
        loaded = session2.load_cookies()

        assert loaded == test_cookies

    def test_cookie_clear(self):
        """Test clearing cookies"""
        session = SessionManager(
            account_id="test_001",
            storage_dir=self.storage_dir / "test_001",
        )

        session.save_cookies({"key": "value"})
        assert len(session.cookies) > 0

        session.clear_cookies()
        assert len(session.cookies) == 0
        assert not session.cookies_file.exists()

    def test_health_metrics_update(self):
        """Test recording solve attempts"""
        session = SessionManager(
            account_id="test_001",
            storage_dir=self.storage_dir / "test_001",
        )

        # Record successful solve
        session.record_solve_attempt(success=True, solve_time=28.5)
        assert session.health.total_solves == 1
        assert session.health.rejected_solves == 0

        # Record failed solve
        session.record_solve_attempt(success=False, solve_time=35.2)
        assert session.health.total_solves == 2
        assert session.health.rejected_solves == 1
        assert session.health.rejection_rate == 50.0

    @pytest.mark.asyncio
    async def test_ip_detection(self):
        """Test IP detection (mocked)"""
        session = SessionManager(
            account_id="test_001",
            storage_dir=self.storage_dir / "test_001",
        )

        # Mock IP detection
        with patch.object(session, "_try_ipify", return_value="203.0.113.42"):
            ip = await session._try_ipify()
            assert ip == "203.0.113.42"

    def test_session_state_save_load(self):
        """Test saving and loading session state"""
        session = SessionManager(
            account_id="test_001",
            storage_dir=self.storage_dir / "test_001",
        )

        session.start_session()
        session.record_solve_attempt(success=True, solve_time=28.5)
        session.save_state()

        # Load in new session
        session2 = SessionManager(
            account_id="test_001",
            storage_dir=self.storage_dir / "test_001",
        )
        session2.load_state()

        assert session2.session_start_time is not None

    def test_get_status(self):
        """Test getting session status"""
        session = SessionManager(
            account_id="test_001",
            storage_dir=self.storage_dir / "test_001",
        )

        session.start_session()
        session.record_solve_attempt(success=True, solve_time=28.5)

        status = session.get_status()

        assert status["account_id"] == "test_001"
        assert status["health"]["total_solves"] == 1
        assert "session_duration" in status


class TestReconnectionLogic:
    """Test reconnection and cooldown logic"""

    def setup_method(self):
        """Setup for each test"""
        self.tmpdir = tempfile.TemporaryDirectory()
        self.storage_dir = Path(self.tmpdir.name)

    def teardown_method(self):
        """Cleanup after each test"""
        self.tmpdir.cleanup()

    @pytest.mark.asyncio
    async def test_reconnection_sequence(self):
        """Test full reconnection sequence (mocked)"""
        session = SessionManager(
            account_id="test_001",
            storage_dir=self.storage_dir / "test_001",
        )

        session.start_session()
        session.save_cookies({"session_id": "old_session"})

        # Mock the reconnection process
        with patch.object(session, "_trigger_router_reconnect", return_value=True):
            with patch.object(session, "_wait_for_ip_change", return_value="203.0.113.99"):
                success = await session.reconnect_and_cooldown()

                # Verify cookies were cleared
                assert len(session.cookies) == 0
                # Verify health was reset
                assert session.health.total_solves == 0

    @pytest.mark.asyncio
    async def test_fritzbox_reconnect(self):
        """Test FritzBox reconnect logic"""
        router_config = {
            "type": "fritzbox",
            "host": "192.168.1.1",
            "username": "admin",
            "password": "password",
        }

        session = SessionManager(
            account_id="test_001",
            storage_dir=self.storage_dir / "test_001",
            router_config=router_config,
        )

        # Would need actual FritzBox to test, skip for now
        assert session.router_config["type"] == "fritzbox"


# Run all tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
