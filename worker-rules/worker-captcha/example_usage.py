#!/usr/bin/env python3
"""
Example: Using SessionManager for Anti-Ban Protection
Demonstrates all key features and best practices
"""

import asyncio
import os
from pathlib import Path
from session_manager import SessionManager

# ========================
# EXAMPLE 1: Basic Usage
# ========================


async def example_basic_usage():
    """Basic session start/health check/save"""
    print("\n=== EXAMPLE 1: Basic Usage ===\n")

    # Initialize
    session = SessionManager(account_id="worker_001")
    session.start_session()

    try:
        # Check health
        is_healthy = await session.check_ip_health(detailed=True)

        if is_healthy:
            print("✓ IP is healthy")
            # Simulate some work
            for i in range(5):
                session.record_solve_attempt(success=True, solve_time=28.5)
        else:
            print("✗ IP is degraded")

    finally:
        session.end_session()


# ========================
# EXAMPLE 2: With Router Config
# ========================


async def example_with_router():
    """Use with FritzBox router for auto-reconnect"""
    print("\n=== EXAMPLE 2: With FritzBox Router ===\n")

    # Configure router
    router_config = {
        "type": "fritzbox",
        "host": os.getenv("FRITZBOX_HOST", "192.168.1.1"),
        "username": os.getenv("FRITZBOX_USER", "admin"),
        "password": os.getenv("FRITZBOX_PASS"),  # Set in environment
    }

    session = SessionManager(
        account_id="worker_002",
        router_config=router_config,
    )
    session.start_session()

    try:
        # Check health
        if not await session.check_ip_health():
            print("IP degraded, attempting reconnect...")

            # This will:
            # 1. Clear cookies
            # 2. Trigger router reconnect
            # 3. Wait for new IP
            # 4. Apply geographic cooldown
            success = await session.reconnect_and_cooldown()

            if success:
                print("✓ Reconnection successful, resuming work")
            else:
                print("✗ Reconnection failed")

    finally:
        session.end_session()


# ========================
# EXAMPLE 3: Custom Reconnect Command
# ========================


async def example_custom_command():
    """Use custom shell command for reconnect"""
    print("\n=== EXAMPLE 3: Custom Reconnect Command ===\n")

    router_config = {
        "type": "custom_command",
        "command": "systemctl restart networking",  # Or your custom command
    }

    session = SessionManager(
        account_id="worker_003",
        router_config=router_config,
    )

    session.start_session()
    try:
        await session.check_ip_health()
    finally:
        session.end_session()


# ========================
# EXAMPLE 4: Multi-Account Isolation
# ========================


async def example_multi_account():
    """Multiple accounts with separate sessions"""
    print("\n=== EXAMPLE 4: Multi-Account Isolation ===\n")

    accounts = ["worker_001", "worker_002", "worker_003"]
    sessions = {}

    # Initialize all accounts
    for account_id in accounts:
        sessions[account_id] = SessionManager(account_id=account_id)
        sessions[account_id].start_session()

    try:
        # Check health for all accounts
        tasks = [sessions[acc].check_ip_health(detailed=True) for acc in accounts]
        results = await asyncio.gather(*tasks)

        for account_id, is_healthy in zip(accounts, results):
            status = "✓ Healthy" if is_healthy else "✗ Degraded"
            print(f"{account_id}: {status}")

    finally:
        # Clean shutdown
        for session in sessions.values():
            session.end_session()


# ========================
# EXAMPLE 5: Health Monitoring Loop
# ========================


async def example_monitoring_loop():
    """Continuous health monitoring with auto-reconnect"""
    print("\n=== EXAMPLE 5: Health Monitoring Loop ===\n")

    session = SessionManager(account_id="worker_001")
    session.start_session()

    try:
        # Simulate work loop with health checks
        for iteration in range(10):
            print(f"\n--- Iteration {iteration + 1} ---")

            # Check health every 5 solves
            if iteration % 5 == 0:
                is_healthy = await session.check_ip_health()

                if not is_healthy:
                    print("Health check failed, reconnecting...")
                    success = await session.reconnect_and_cooldown()
                    if not success:
                        print("Reconnect failed, aborting")
                        break

            # Simulate solve
            success = True  # In real code, this would be actual solve result
            session.record_solve_attempt(success=success, solve_time=27.3)

            # Status
            status = session.get_status()
            print(
                f"Status: Solves={status['health']['total_solves']}, "
                f"Rate={status['health']['rejection_rate']}"
            )

            # Small delay
            await asyncio.sleep(1)

    finally:
        session.end_session()


# ========================
# EXAMPLE 6: Cookie Persistence
# ========================


async def example_cookie_persistence():
    """Demonstrate cookie save/load"""
    print("\n=== EXAMPLE 6: Cookie Persistence ===\n")

    session = SessionManager(account_id="worker_001")

    # Session 1: Save cookies
    session.start_session()

    # Simulate login and cookie acquisition
    session.cookies = {
        "session_id": "abc123def456",
        "token": "xyz789",
        "preferences": "dark_mode=1",
    }

    session.save_cookies()
    print(f"✓ Saved {len(session.cookies)} cookies")
    session.end_session()

    # Session 2: Load cookies
    session2 = SessionManager(account_id="worker_001")
    session2.start_session()

    session2.load_cookies()
    print(f"✓ Loaded {len(session2.cookies)} cookies")
    print(f"  Cookies: {session2.cookies}")
    session2.end_session()


# ========================
# EXAMPLE 7: Docker Container Multi-Account
# ========================


async def example_docker_setup():
    """
    Configuration for running multiple accounts in Docker
    Each container should have:

    Environment Variables:
    - ACCOUNT_ID: Unique account identifier
    - FRITZBOX_HOST: Router IP
    - FRITZBOX_USER: Router username
    - FRITZBOX_PASS: Router password

    Volume Mounts:
    - /app/sessions:/home/worker/.sin-solver/sessions
    """
    print("\n=== EXAMPLE 7: Docker Container Setup ===\n")

    # This would be run in Docker with environment variables
    account_id = os.getenv("ACCOUNT_ID", "worker_001")

    router_config = {
        "type": "fritzbox",
        "host": os.getenv("FRITZBOX_HOST"),
        "username": os.getenv("FRITZBOX_USER"),
        "password": os.getenv("FRITZBOX_PASS"),
    }

    session = SessionManager(
        account_id=account_id,
        router_config=router_config,
    )

    print(f"Account: {account_id}")
    print(f"Storage: {session.storage_dir}")
    print(f"Router: {router_config.get('host')}")


# ========================
# RUN ALL EXAMPLES
# ========================


async def main():
    """Run all examples"""

    # Choose which example to run:
    # await example_basic_usage()
    # await example_with_router()
    # await example_custom_command()
    # await example_multi_account()
    await example_monitoring_loop()
    # await example_cookie_persistence()
    # await example_docker_setup()


if __name__ == "__main__":
    asyncio.run(main())
