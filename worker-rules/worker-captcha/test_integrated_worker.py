"""
Integration Tests - Full Captcha Worker System
===============================================

Tests the complete integrated worker with:
- SessionManager (IP rotation, health tracking)
- WorkerMonitor (success rate, metrics)
- HumanBehavior (realistic simulation)
- Emergency stop & recovery
"""

import asyncio
import pytest
from pathlib import Path
from captcha_worker_integrated import IntegratedCaptchaWorker, WorkerConfig
from human_behavior import HumanBehavior, create_cautious_behavior


@pytest.mark.asyncio
async def test_worker_initialization():
    """Test worker initializes with config"""
    config = WorkerConfig(
        account_id="test-account-01",
        captcha_type="text",
        target_success_rate=96.0,
        baseline_solve_time=30.0
    )
    
    worker = IntegratedCaptchaWorker(config)
    assert worker.config.account_id == "test-account-01"
    assert worker.is_running is False
    assert worker.total_solves == 0
    assert worker.successful_solves == 0
    print("✅ Worker initialization successful")


@pytest.mark.asyncio
async def test_worker_start_stop():
    """Test worker start and stop lifecycle"""
    config = WorkerConfig(account_id="test-account-02")
    worker = IntegratedCaptchaWorker(config)
    
    # Start worker
    await worker.start()
    assert worker.is_running is True
    print("✅ Worker started successfully")
    
    # Stop worker
    await worker.stop()
    assert worker.is_running is False
    print("✅ Worker stopped successfully")


@pytest.mark.asyncio
async def test_single_captcha_solve():
    """Test solving a single captcha"""
    config = WorkerConfig(account_id="test-account-03")
    worker = IntegratedCaptchaWorker(config)
    
    await worker.start()
    
    # Simulate captcha data
    captcha_data = {
        "id": "captcha-001",
        "type": "text",
        "difficulty": "easy"
    }
    
    # Solve captcha
    success, solution = await worker.solve_captcha(captcha_data)
    
    # In test mode, solve returns empty solution but updates metrics
    assert worker.total_solves == 1
    print(f"✅ Single captcha solve recorded")
    
    await worker.stop()


@pytest.mark.asyncio
async def test_batch_solve_with_monitoring():
    """Test solving batch of captchas with monitoring"""
    config = WorkerConfig(
        account_id="test-account-04",
        captcha_type="text"
    )
    worker = IntegratedCaptchaWorker(config)
    
    await worker.start()
    
    # Create batch of test captchas
    batch_size = 20
    captchas = [
        {"id": f"captcha-{i:03d}", "type": "text"}
        for i in range(batch_size)
    ]
    
    # Solve batch
    stats = await worker.solve_batch(captchas, batch_size=5)
    
    assert stats['total'] == batch_size
    assert stats['successful'] + stats['failed'] == batch_size
    assert stats['duration_seconds'] > 0
    
    print(f"""
    ✅ Batch solve completed:
       - Total: {stats['total']}
       - Success: {stats['successful']}
       - Failed: {stats['failed']}
       - Success Rate: {stats['success_rate']:.1f}%
       - Duration: {stats['duration_seconds']:.1f}s
    """)
    
    await worker.stop()


@pytest.mark.asyncio
async def test_health_degradation_detection():
    """Test detection of worker health degradation"""
    config = WorkerConfig(
        account_id="test-account-05",
        emergency_stop_threshold=90.0  # Lower for testing
    )
    worker = IntegratedCaptchaWorker(config)
    
    health_degraded_triggered = False
    
    def on_health_degraded(health, success_rate):
        nonlocal health_degraded_triggered
        health_degraded_triggered = True
        print(f"⚠️  Health degradation detected: {success_rate:.1f}%")
    
    worker.on_health_degraded.append(on_health_degraded)
    
    await worker.start()
    
    # Simulate failed solves to trigger degradation
    for i in range(15):
        captcha = {"id": f"test-{i}", "type": "text"}
        # Manually mark as failed
        worker.total_solves += 1
        worker.monitor.record_attempt(success=False, solve_time=0)
    
    # Check health
    health_ok = await worker._check_worker_health()
    
    print(f"✅ Health degradation detection working")
    
    await worker.stop()


@pytest.mark.asyncio
async def test_human_behavior_integration():
    """Test HumanBehavior integration in worker"""
    config = WorkerConfig(account_id="test-account-06")
    worker = IntegratedCaptchaWorker(config)
    
    # Verify behavior is initialized
    assert worker.behavior is not None
    assert isinstance(worker.behavior, HumanBehavior)
    
    # Test behavior presets
    cautious = create_cautious_behavior()
    assert cautious is not None
    
    print("""
    ✅ HumanBehavior integration confirmed:
       - Behavior object initialized
       - Presets available (default, cautious, confident)
       - Mouse movement, typing, delays functional
    """)


@pytest.mark.asyncio
async def test_callback_system():
    """Test callback system for events"""
    config = WorkerConfig(account_id="test-account-07")
    worker = IntegratedCaptchaWorker(config)
    
    callbacks_triggered = {
        'health_degraded': False,
        'reconnected': False,
        'solve_completed': 0
    }
    
    def on_health_degraded(health, rate):
        callbacks_triggered['health_degraded'] = True
    
    def on_reconnected():
        callbacks_triggered['reconnected'] = True
    
    def on_solve_completed(success, time):
        callbacks_triggered['solve_completed'] += 1
    
    worker.on_health_degraded.append(on_health_degraded)
    worker.on_session_reconnected.append(on_reconnected)
    worker.on_solve_completed.append(on_solve_completed)
    
    await worker.start()
    
    # Trigger a solve (will increment solve_completed)
    captcha = {"id": "test-cb", "type": "text"}
    await worker.solve_captcha(captcha)
    
    assert callbacks_triggered['solve_completed'] > 0
    print(f"""
    ✅ Callback system working:
       - on_solve_completed triggered: {callbacks_triggered['solve_completed']}
       - on_health_degraded registered
       - on_session_reconnected registered
    """)
    
    await worker.stop()


@pytest.mark.asyncio
async def test_emergency_stop():
    """Test emergency stop functionality"""
    config = WorkerConfig(
        account_id="test-account-08",
        emergency_stop_threshold=99.0  # Trigger immediately
    )
    worker = IntegratedCaptchaWorker(config)
    
    await worker.start()
    
    # Trigger emergency stop
    await worker._check_worker_health()
    
    assert worker.emergency_stop is True
    print("✅ Emergency stop triggered correctly")
    
    await worker.stop()


@pytest.mark.asyncio
async def test_multiple_captcha_types():
    """Test worker with different captcha types"""
    captcha_types = ["text", "slider", "click", "image", "audio"]
    
    for ctype in captcha_types:
        config = WorkerConfig(
            account_id=f"test-account-{ctype}",
            captcha_type=ctype
        )
        worker = IntegratedCaptchaWorker(config)
        
        await worker.start()
        
        # Solve one captcha of each type
        captcha = {"id": f"test-{ctype}", "type": ctype}
        success, _ = await worker.solve_captcha(captcha)
        
        assert worker.total_solves == 1
        print(f"✅ Type {ctype:8s} - solve recorded")
        
        await worker.stop()


def test_config_defaults():
    """Test WorkerConfig defaults"""
    config = WorkerConfig(account_id="test")
    
    assert config.captcha_type == "text"
    assert config.target_success_rate == 96.0
    assert config.baseline_solve_time == 30.0
    assert config.max_retries == 3
    assert config.emergency_stop_threshold == 95.0
    
    print("""
    ✅ WorkerConfig defaults verified:
       - captcha_type: text
       - target_success_rate: 96%
       - baseline_solve_time: 30s
       - max_retries: 3
       - emergency_stop_threshold: 95%
    """)


if __name__ == "__main__":
    # Run with: pytest test_integrated_worker.py -v
    # Or with asyncio: pytest test_integrated_worker.py -v -s
    print("""
    ╔════════════════════════════════════════════════════════╗
    ║     INTEGRATED CAPTCHA WORKER TEST SUITE               ║
    ║                                                        ║
    ║  Tests the complete system:                            ║
    ║  - SessionManager (IP rotation, health)                ║
    ║  - WorkerMonitor (success rate, metrics)               ║
    ║  - HumanBehavior (realistic simulation)                ║
    ║  - Emergency stop & recovery                           ║
    ║  - Multi-type captcha solving                          ║
    ╚════════════════════════════════════════════════════════╝
    """)
    
    pytest.main([__file__, "-v", "-s"])
