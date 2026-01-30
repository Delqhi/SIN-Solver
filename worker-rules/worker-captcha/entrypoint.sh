#!/bin/bash
set -e

# Entrypoint script for Captcha Worker Container
# Sets Python path and starts the integrated worker

export PYTHONUNBUFFERED=1
export PYTHONDONTWRITEBYTECODE=1

python3 << 'PYTHON_SCRIPT'
import sys
import os
import asyncio

# Add app to path
sys.path.insert(0, '/app')

# Import required modules
from captcha_worker_integrated import IntegratedCaptchaWorker, WorkerConfig

async def main():
    """Main entry point for the captcha worker"""
    
    # Get configuration from environment variables
    account_id = os.getenv('ACCOUNT_ID', 'worker-001')
    captcha_type = os.getenv('CAPTCHA_TYPE', 'text')
    target_success_rate = float(os.getenv('TARGET_SUCCESS_RATE', '96.0'))
    emergency_stop_threshold = float(os.getenv('EMERGENCY_STOP_THRESHOLD', '95.0'))
    
    print(f"[STARTUP] Captcha Worker Starting")
    print(f"[CONFIG] Account ID: {account_id}")
    print(f"[CONFIG] Captcha Type: {captcha_type}")
    print(f"[CONFIG] Target Success Rate: {target_success_rate}%")
    print(f"[CONFIG] Emergency Stop Threshold: {emergency_stop_threshold}%")
    
    # Create worker configuration
    config = WorkerConfig(
        account_id=account_id,
        captcha_type=captcha_type,
        target_success_rate=target_success_rate,
        emergency_stop_threshold=emergency_stop_threshold
    )
    
    # Create and start the worker
    worker = IntegratedCaptchaWorker(config)
    print("[STARTUP] Initializing worker...")
    await worker.start()
    print("[STARTUP] Worker started successfully!")
    
    try:
        # Keep worker running (24 hours)
        print("[RUNNING] Worker is running. Press Ctrl+C to stop.")
        await asyncio.sleep(86400)
    except KeyboardInterrupt:
        print("[SHUTDOWN] Received interrupt signal, shutting down gracefully...")
    except Exception as e:
        print(f"[ERROR] Worker error: {e}")
        raise
    finally:
        print("[SHUTDOWN] Stopping worker...")
        await worker.stop()
        print("[SHUTDOWN] Worker stopped successfully!")

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"[FATAL] Failed to start worker: {e}")
        sys.exit(1)
PYTHON_SCRIPT
