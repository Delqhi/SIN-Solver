#!/usr/bin/env python3
"""
pytest Configuration and Fixtures
SIN-Solver Testing Framework - Best Practices 2026
"""

import asyncio
import pytest
import os
import sys
from pathlib import Path
from unittest.mock import Mock, AsyncMock

# Add project paths
sys.path.insert(0, str(Path(__file__).parent.parent / "Docker/builders/builder-1.1-captcha-worker"))


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_redis():
    """Mock Redis client"""
    redis = Mock()
    redis.get = AsyncMock(return_value="1")
    redis.set = AsyncMock(return_value=True)
    redis.increment = AsyncMock(return_value=1)
    redis.delete = AsyncMock(return_value=1)
    redis.is_connected = AsyncMock(return_value=True)
    return redis


@pytest.fixture
def test_image_base64():
    """Base64 encoded test image (1x1 pixel PNG)"""
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="


@pytest.fixture
def api_base_url():
    """API base URL for testing"""
    return os.getenv("CAPTCHA_API_URL", "http://localhost:8019")


@pytest.fixture(scope="session")
def fixtures_dir():
    """Path to test fixtures directory"""
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_captcha_paths(fixtures_dir):
    """Get paths to sample CAPTCHA images"""
    captchas_dir = fixtures_dir / "captchas"
    samples = {}
    
    for captcha_type in ["text", "math", "recaptcha", "hcaptcha"]:
        type_dir = captchas_dir / captcha_type
        if type_dir.exists():
            samples[captcha_type] = list(type_dir.glob("*.png"))
    
    return samples


@pytest.fixture
def ground_truth(fixtures_dir):
    """Load ground truth data"""
    import json
    gt_path = fixtures_dir / "ground_truth.json"
    
    if gt_path.exists():
        with open(gt_path) as f:
            return json.load(f)
    return {}


# Custom markers
def pytest_configure(config):
    """Configure custom markers"""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "performance: Performance tests")
    config.addinivalue_line("markers", "benchmark: Benchmark tests")
    config.addinivalue_line("markers", "slow: Slow tests")
    config.addinivalue_line("markers", "e2e: End-to-end tests")
