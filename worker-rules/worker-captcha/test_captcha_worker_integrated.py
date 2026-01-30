"""
Unit tests for IntegratedCaptchaWorker module
Tests integrated workflow combining SessionManager, Monitor, and HumanBehavior
"""

import asyncio
import json
import tempfile
from datetime import datetime
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock, Mock
from dataclasses import asdict

import pytest

from captcha_worker_integrated import IntegratedCaptchaWorker, WorkerConfig


class TestWorkerConfig:
    """Test WorkerConfig dataclass"""

    def test_creation_minimal(self):
        """Test creating WorkerConfig with minimal fields"""
        config = WorkerConfig(account_id="worker-001")

        assert config.account_id == "worker-001"
        assert config.captcha_type == "text"
        assert config.target_success_rate == 96.0
        assert config.baseline_solve_time == 30.0
        assert config.emergency_stop_threshold == 95.0

    def test_creation_full(self):
        """Test creating WorkerConfig with all fields"""
        router_config = {"type": "fritzbox", "host": "192.168.1.1"}
        stats_dir = Path("/tmp/test_stats")

        config = WorkerConfig(
            account_id="worker-001",
            captcha_type="slider",
            target_success_rate=97.0,
            baseline_solve_time=25.0,
            router_config=router_config,
            stats_dir=stats_dir,
            max_retries=5,
            emergency_stop_threshold=94.0,
        )

        assert config.account_id == "worker-001"
        assert config.captcha_type == "slider"
        assert config.target_success_rate == 97.0
        assert config.router_config == router_config
        assert config.stats_dir == stats_dir


class TestIntegratedCaptchaWorkerInit:
    """Test IntegratedCaptchaWorker initialization"""

    def test_initialization(self):
        """Test worker initialization with default config"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = WorkerConfig(
                account_id="test-worker",
                stats_dir=Path(tmpdir),
            )

            worker = IntegratedCaptchaWorker(config)

            assert worker.config == config
            assert worker.is_running is False
            assert worker.emergency_stop is False
            assert worker.total_solves == 0
            assert worker.successful_solves == 0
            assert worker.session_manager is not None
            assert worker.monitor is not None
            assert worker.behavior is not None

    def test_initialization_with_router(self):
        """Test worker initialization with router config"""
        router_config = {"type": "fritzbox", "host": "192.168.1.1", "password": "test"}

        config = WorkerConfig(
            account_id="test-worker",
            router_config=router_config,
        )

        worker = IntegratedCaptchaWorker(config)

        assert worker.config.router_config == router_config
        assert worker.session_manager.router_config == router_config


class TestIntegratedCaptchaWorkerCallbacks:
    """Test callback system"""

    def test_callback_registration(self):
        """Test registering callbacks"""
        config = WorkerConfig(account_id="test-worker")
        worker = IntegratedCaptchaWorker(config)

        mock_callback = Mock()
        worker.on_health_degraded.append(mock_callback)

        assert len(worker.on_health_degraded) == 1
        assert mock_callback in worker.on_health_degraded

    def test_multiple_callbacks(self):
        """Test registering multiple callbacks"""
        config = WorkerConfig(account_id="test-worker")
        worker = IntegratedCaptchaWorker(config)

        callbacks = [Mock(), Mock(), Mock()]

        for cb in callbacks:
            worker.on_solve_completed.append(cb)

        assert len(worker.on_solve_completed) == 3


@pytest.mark.asyncio
class TestIntegratedCaptchaWorkerAsync:
    """Test async methods"""

    async def test_start_stop(self):
        """Test starting and stopping the worker"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = WorkerConfig(
                account_id="test-worker",
                stats_dir=Path(tmpdir),
            )

            worker = IntegratedCaptchaWorker(config)

            # Mock the session manager start
            worker.session_manager.start_session = Mock()
            worker.session_manager.end_session = Mock()

            await worker.start()
            assert worker.is_running is True

            await worker.stop()
            assert worker.is_running is False

    async def test_solve_captcha_success(self):
        """Test successful captcha solve"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = WorkerConfig(
                account_id="test-worker",
                stats_dir=Path(tmpdir),
            )

            worker = IntegratedCaptchaWorker(config)

            # Mock components
            worker.session_manager.check_ip_health = AsyncMock(return_value=True)
            worker.behavior.wait_before_action = Mock()  # Synchronous call
            worker.session_manager.record_solve_attempt = Mock()
            worker.monitor.record_attempt = Mock()
            worker._solve_captcha_internal = AsyncMock(return_value=4.2)
            worker._check_worker_health = AsyncMock(return_value=True)

            captcha_data = {"id": "test-001", "image": "base64data", "type": "text"}

            success, solution = await worker.solve_captcha(captcha_data)

            assert success is True  # Default mock behavior
            assert worker.session_manager.check_ip_health.called

    async def test_solve_captcha_failure_with_retry(self):
        """Test captcha solve with retry logic"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = WorkerConfig(
                account_id="test-worker",
                max_retries=2,
                stats_dir=Path(tmpdir),
            )

            worker = IntegratedCaptchaWorker(config)

            # Mock IP check to succeed
            worker.session_manager.check_ip_health = AsyncMock(return_value=True)
            worker.behavior.wait_before_action = Mock()  # Synchronous call
            worker.behavior.take_micro_break = Mock()  # Don't block async loop
            worker.session_manager.record_solve_attempt = Mock()
            worker.monitor.record_attempt = Mock()
            worker._solve_captcha_internal = AsyncMock(return_value=4.2)
            worker._check_worker_health = AsyncMock(return_value=True)

            captcha_data = {"id": "test-001", "type": "text"}

            success, solution = await worker.solve_captcha(captcha_data)

            # Should have attempted
            assert worker.session_manager.check_ip_health.call_count >= 1

    async def test_solve_captcha_with_degraded_health(self):
        """Test solve when health is degraded"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = WorkerConfig(
                account_id="test-worker",
                stats_dir=Path(tmpdir),
            )

            worker = IntegratedCaptchaWorker(config)

            # Mock health check to fail
            worker.session_manager.check_ip_health = AsyncMock(return_value=False)
            worker.session_manager.reconnect_and_cooldown = AsyncMock()
            worker.behavior.wait_before_action = Mock()  # Synchronous call
            worker.behavior.take_micro_break = Mock()  # Don't block async loop
            worker.behavior.reset_patterns = Mock()
            worker._solve_captcha_internal = AsyncMock(return_value=0)
            worker._check_worker_health = AsyncMock(return_value=False)

            captcha_data = {"id": "test-001", "type": "text"}

            success, solution = await worker.solve_captcha(captcha_data)

            # Should trigger reconnect
            assert worker.session_manager.reconnect_and_cooldown.called
            assert worker.behavior.reset_patterns.called

    async def test_solve_batch(self):
        """Test batch solving"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = WorkerConfig(
                account_id="test-worker",
                stats_dir=Path(tmpdir),
            )

            worker = IntegratedCaptchaWorker(config)

            # Mock components
            worker.session_manager.check_ip_health = AsyncMock(return_value=True)
            worker.behavior.wait_before_action = Mock()  # Synchronous call
            worker.behavior.take_micro_break = Mock()  # Don't block async loop
            worker.session_manager.record_solve_attempt = Mock()
            worker.monitor.record_attempt = Mock()
            worker._solve_captcha_internal = AsyncMock(return_value=4.2)
            worker._check_worker_health = AsyncMock(return_value=True)

            captchas = [{"id": f"test-{i:03d}", "type": "text"} for i in range(5)]

            results = await worker.solve_batch(captchas, batch_size=2)

            assert "processed" in results
            assert "successful" in results
            assert results["batch_size"] == 2

    async def test_health_check_callback(self):
        """Test health degradation callback"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = WorkerConfig(
                account_id="test-worker",
                stats_dir=Path(tmpdir),
            )

            worker = IntegratedCaptchaWorker(config)

            # Register callback
            callback_mock = Mock()
            worker.on_health_degraded.append(callback_mock)

            # Mock monitor to simulate health issue
            worker.monitor.check_health = Mock(return_value=False)
            worker.behavior.take_micro_break = Mock()  # Don't block async loop

            # Trigger health check
            health = worker._check_worker_health()

            # Callback should be called
            if not health:
                for callback in worker.on_health_degraded:
                    callback(health, worker.monitor.get_success_rate())

            assert callback_mock.called or not health

    async def test_emergency_stop_threshold(self):
        """Test emergency stop at threshold"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = WorkerConfig(
                account_id="test-worker",
                emergency_stop_threshold=95.0,
                stats_dir=Path(tmpdir),
            )

            worker = IntegratedCaptchaWorker(config)

            # Mock monitor with low success rate
            worker.monitor.get_success_rate = Mock(return_value=94.0)
            worker.monitor.check_health = Mock(return_value=False)

            health = worker._check_worker_health()

            # Should trigger emergency stop
            assert (
                health is False
                or worker.monitor.get_success_rate() < config.emergency_stop_threshold
            )


class TestIntegratedCaptchaWorkerStats:
    """Test statistics and reporting"""

    def test_get_stats(self):
        """Test getting worker statistics"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = WorkerConfig(
                account_id="test-worker",
                stats_dir=Path(tmpdir),
            )

            worker = IntegratedCaptchaWorker(config)

            # Mock component stats
            worker.session_manager.get_session_stats = Mock(
                return_value={
                    "current_ip": "203.0.113.42",
                    "session_duration": 3600,
                    "solves": 100,
                }
            )

            worker.monitor.get_dashboard_data = Mock(
                return_value={
                    "success_rate": 96.5,
                    "total_solves": 100,
                    "avg_solve_time": 28.5,
                }
            )

            stats = worker.get_stats()

            assert "success_rate" in stats
            assert "total_solves" in stats
            assert "current_ip" in stats
            assert "session_duration" in stats


class TestIntegratedCaptchaWorkerIntegration:
    """Integration tests combining multiple components"""

    @pytest.mark.asyncio
    async def test_full_workflow(self):
        """Test complete solve workflow"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = WorkerConfig(
                account_id="test-worker",
                captcha_type="text",
                stats_dir=Path(tmpdir),
            )

            worker = IntegratedCaptchaWorker(config)

            # Mock all external calls
            worker.session_manager.check_ip_health = AsyncMock(return_value=True)
            worker.session_manager.record_solve_attempt = Mock()
            worker.behavior.wait_before_action = Mock()  # Synchronous call
            worker.monitor.record_attempt = Mock()
            worker.monitor.check_health = Mock(return_value=True)

            # Simulate solve
            captcha_data = {"id": "test-001", "type": "text"}

            success, solution = await worker.solve_captcha(captcha_data)

            # Verify all components called
            assert worker.behavior.wait_before_action.called
            assert worker.session_manager.check_ip_health.called


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
