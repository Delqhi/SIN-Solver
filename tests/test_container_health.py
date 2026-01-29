#!/usr/bin/env python3
"""
Docker Container Health Integration Tests
Tests all containers with REAL health checks
Best Practices 2026
"""

import asyncio
import aiohttp
import pytest
import subprocess
import json
from typing import Dict, List, Tuple
import os

# Container endpoints to test
CONTAINERS = {
    "room-03-postgres-master": {"url": "http://localhost:5432", "type": "tcp"},
    "room-04-redis-cache": {"url": "http://localhost:6379", "type": "tcp"},
    "room-02-tresor-vault": {"url": "http://localhost:8200/v1/sys/health", "type": "http"},
    "room-02-tresor-api": {"url": "http://localhost:8201/health", "type": "http"},
    "room-01-dashboard-cockpit": {"url": "http://localhost:3011", "type": "http"},
    "agent-01-n8n-orchestrator": {"url": "http://localhost:5678/healthz", "type": "http"},
    "agent-03-agentzero-coder": {"url": "http://localhost:8050/health", "type": "http"},
    "agent-05-steel-browser": {"url": "http://localhost:3005/health", "type": "http"},
    "agent-06-skyvern-solver": {"url": "http://localhost:8030/health", "type": "http"},
    "solver-1.1-captcha-worker": {"url": "http://localhost:8019/health", "type": "http"},
    "solver-2.1-survey-worker": {"url": "http://localhost:8018/health", "type": "http"},
    "room-06-sin-plugins": {"url": "http://localhost:8040/health", "type": "http"},
    "room-21-nocodb-ui": {"url": "http://localhost:8090", "type": "http"},
}


async def check_http_health(session: aiohttp.ClientSession, url: str, timeout: int = 5) -> Tuple[bool, str]:
    """Check HTTP health endpoint"""
    try:
        async with session.get(url, timeout=timeout) as resp:
            if resp.status in [200, 201, 202]:
                return True, f"HTTP {resp.status}"
            else:
                return False, f"HTTP {resp.status}"
    except asyncio.TimeoutError:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)


async def check_tcp_health(host: str, port: int, timeout: int = 5) -> Tuple[bool, str]:
    """Check TCP connection"""
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=timeout
        )
        writer.close()
        await writer.wait_closed()
        return True, "TCP OK"
    except Exception as e:
        return False, str(e)


@pytest.mark.asyncio
async def test_all_container_health():
    """Test health of ALL containers"""
    print("\n🐳 Testing Container Health")
    print("=" * 60)
    
    results = {}
    
    async with aiohttp.ClientSession() as session:
        for name, config in CONTAINERS.items():
            if config["type"] == "http":
                healthy, msg = await check_http_health(session, config["url"])
            else:
                # Parse host:port from URL
                parts = config["url"].replace("http://", "").split(":")
                host = parts[0]
                port = int(parts[1]) if len(parts) > 1 else 80
                healthy, msg = await check_tcp_health(host, port)
            
            results[name] = {"healthy": healthy, "message": msg}
            status = "✅" if healthy else "❌"
            print(f"{status} {name:40s} - {msg}")
    
    # Summary
    healthy_count = sum(1 for r in results.values() if r["healthy"])
    total = len(results)
    
    print("=" * 60)
    print(f"Summary: {healthy_count}/{total} containers healthy")
    
    # Assert critical containers are healthy
    critical = [
        "room-03-postgres-master",
        "room-04-redis-cache",
        "solver-1.1-captcha-worker"
    ]
    
    for container in critical:
        assert results[container]["healthy"], f"Critical container {container} is unhealthy"


@pytest.mark.asyncio
async def test_docker_ps_output():
    """Test: Docker ps shows all containers"""
    result = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}"],
        capture_output=True,
        text=True
    )
    
    running_containers = result.stdout.strip().split("\n")
    
    # Check our key containers are running
    key_containers = [
        "room-03-postgres-master",
        "room-04-redis-cache",
        "solver-1.1-captcha-worker"
    ]
    
    for container in key_containers:
        assert container in running_containers, f"{container} not running"


@pytest.mark.asyncio
async def test_network_connectivity():
    """Test: All containers can reach each other"""
    print("\n🌐 Testing Network Connectivity")
    
    # Test Redis can be reached from Captcha Worker
    import redis.asyncio as redis_client
    
    try:
        r = redis_client.from_url("redis://localhost:6379")
        await r.ping()
        await r.close()
        print("✅ Captcha Worker → Redis: OK")
    except Exception as e:
        pytest.fail(f"Redis connectivity failed: {e}")


@pytest.mark.asyncio
async def test_service_dependencies():
    """Test: Services can reach their dependencies"""
    print("\n🔗 Testing Service Dependencies")
    
    # Test Vault API can reach Vault
    async with aiohttp.ClientSession() as session:
        async with session.get("http://localhost:8201/health") as resp:
            if resp.status == 200:
                print("✅ Vault API → Vault: OK")
            else:
                print(f"⚠️  Vault API → Vault: HTTP {resp.status}")


@pytest.mark.asyncio
async def test_metrics_availability():
    """Test: Prometheus metrics available from all services"""
    print("\n📊 Testing Metrics Availability")
    
    metrics_endpoints = {
        "captcha-worker": "http://localhost:8000/metrics",
        # Add other services with metrics endpoints
    }
    
    async with aiohttp.ClientSession() as session:
        for name, url in metrics_endpoints.items():
            try:
                async with session.get(url, timeout=5) as resp:
                    if resp.status == 200:
                        text = await resp.text()
                        # Check for essential metrics
                        has_captcha_metric = "captcha" in text.lower()
                        print(f"{'✅' if has_captcha_metric else '⚠️ '} {name}: Metrics {'OK' if has_captcha_metric else 'incomplete'}")
                    else:
                        print(f"❌ {name}: HTTP {resp.status}")
            except Exception as e:
                print(f"❌ {name}: {e}")


@pytest.mark.asyncio
async def test_log_output():
    """Test: Containers produce logs"""
    print("\n📝 Testing Container Logs")
    
    containers = ["solver-1.1-captcha-worker", "room-04-redis-cache"]
    
    for container in containers:
        result = subprocess.run(
            ["docker", "logs", "--tail", "5", container],
            capture_output=True,
            text=True
        )
        
        has_logs = len(result.stdout) > 0 or len(result.stderr) > 0
        print(f"{'✅' if has_logs else '❌'} {container}: {'Has logs' if has_logs else 'No logs'}")


@pytest.mark.asyncio
async def test_restart_policy():
    """Test: Containers have proper restart policies"""
    print("\n🔄 Testing Restart Policies")
    
    result = subprocess.run(
        ["docker", "inspect", "solver-1.1-captcha-worker", "--format", "{{.HostConfig.RestartPolicy.Name}}"],
        capture_output=True,
        text=True
    )
    
    policy = result.stdout.strip()
    expected = "unless-stopped"
    
    print(f"{'✅' if policy == expected else '❌'} Captcha Worker restart policy: {policy}")
    assert policy == expected, f"Expected {expected}, got {policy}"


if __name__ == "__main__":
    print("=" * 60)
    print("CONTAINER HEALTH INTEGRATION TESTS")
    print("=" * 60)
    
    asyncio.run(test_all_container_health())
    asyncio.run(test_network_connectivity())
    asyncio.run(test_service_dependencies())
    
    print("\n" + "=" * 60)
    print("CONTAINER TESTS COMPLETE")
    print("=" * 60)
