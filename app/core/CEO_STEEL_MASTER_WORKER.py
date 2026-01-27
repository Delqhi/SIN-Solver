#!/usr/bin/env python3
"""
🚀 CEO STEEL MASTER WORKER (V2026.2) - PRODUCTION GRADE
======================================================
Architecture:
- Persistent Loop (Self-Healing)
- High-Performance Steel Connection (Port 3000 direct)
- Vision AI Integration (Mistral/Gemini)
- Internal Web UI for Dashboard Integration
"""

import asyncio
import logging
import os
import sys
import json
import time
from datetime import datetime
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
import httpx
import uvicorn
from contextlib import asynccontextmanager

# CEO-MANDAT: Absolute Paths for stability
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.STEEL_PRECISION_CONTROLLER import SteelPrecisionController
from app.core.config import settings
from app.services.analytics_engine import get_analytics_engine
from app.services.vision_orchestrator import RateLimitError

# Structured CEO Logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] ⚡ %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("SteelMaster")

class SteelMasterWorker:
    def __init__(self):
        self.controller = SteelPrecisionController()
        self.is_running = True
        self.role = settings.role
        self.worker_id = f"{self.role}-{os.getenv('HOSTNAME', 'unknown')}"
        self.log_history = []
        self.orchestrator_url = settings.orchestrator_url
        self.analytics = get_analytics_engine()
        self.client = httpx.AsyncClient(timeout=10.0)
        
        # Concurrency Control
        self.max_concurrent_missions = int(os.getenv("CONCURRENT_MISSIONS", "1"))
        self.semaphore = asyncio.Semaphore(self.max_concurrent_missions)
        
    def add_log(self, msg):
        log_entry = f"{datetime.now().strftime('%H:%M:%S')} - {msg}"
        self.log_history.append(log_entry)
        if len(self.log_history) > 100: self.log_history.pop(0)
        logger.info(msg)

    async def setup(self):
        self.add_log(f"🚀 [CEO] Initializing {self.role.upper()} mission stack...")
        
        # 🔥 ENTERPRISE 2026: Synchronize secrets with Zimmer-13 (API Koordinator)
        await settings.fetch_secrets_from_zimmer13()
        
        return await self.controller.initialize(stealth_mode=True)

    async def execute_mission(self, mission_data: Dict):
        """Execute a single CAPTCHA mission with parallel protection and precise routing"""
        async with self.semaphore:
            target_url = mission_data.get("url")
            mission_id = mission_data.get("mission_id", "unnamed")
            self.add_log(f"💰 [CEO] Mission START ({mission_id}). Targeting: {target_url}")
            solve_start = time.time()
            
            try:
                # 🔥 PRODUCTION SOLVER - Integrated with Proxy Rotation & Stealth
                success = await self.controller.solve_any_captcha(target_url)
                solve_time = int((time.time() - solve_start) * 1000)
                
                if success:
                    self.add_log(f"✅ [CEO] Mission SUCCESS ({mission_id})! Solved in {solve_time}ms. Revenue +$$$")
                    # Real-time Analytics Integration
                    self.analytics.record_solve(
                        success=True,
                        solve_time_ms=solve_time,
                        solver_used="steel-precision",
                        captcha_type="auto-detected"
                    )
                    
                    # Report success to orchestrator
                    try:
                        await self.client.post(
                            f"{self.orchestrator_url}/system/report_success",
                            json={
                                "worker_id": self.worker_id, 
                                "mission_id": mission_id,
                                "url": target_url, 
                                "solved": True,
                                "solve_time_ms": solve_time
                            }
                        )
                    except Exception as report_err:
                        logger.debug(f"Report success failed: {report_err}")
                else:
                    self.add_log(f"⚠️ [CEO] Mission FAILED ({mission_id}). CAPTCHA not detected or unsupported.")
                    self.analytics.record_solve(
                        success=False,
                        solve_time_ms=solve_time,
                        solver_used="steel-precision",
                        captcha_type="auto-detected"
                    )
                    # Report failure
                    await self.client.post(
                        f"{self.orchestrator_url}/system/report_failure",
                        json={"worker_id": self.worker_id, "mission_id": mission_id, "error": "not_solved"}
                    )
            except RateLimitError:
                self.add_log("🛑 [CEO] Rate limit hit! Triggering recovery...")
                self.analytics.record_error("rate_limit")
                # Trigger internal recovery in next loop iteration
                raise
            except Exception as e:
                self.add_log(f"❌ [CEO] Mission Error ({mission_id}): {e}")
                self.analytics.record_error("solver_error")
                await self.client.post(
                    f"{self.orchestrator_url}/system/report_failure",
                    json={"worker_id": self.worker_id, "mission_id": mission_id, "error": str(e)}
                )

    async def production_mission_loop(self):
        self.add_log(f"🏗️ [CEO] Mission Control ACTIVE. Concurrency: {self.max_concurrent_missions}")
        while self.is_running:
            try:
                # HEARTBEAT & SELF-HEALING
                if not self.controller.page or self.controller.page.is_closed():
                    self.add_log("⚠️ [CEO] Connection lost. Re-initializing...")
                    await self.setup()
                
                # POLL SYSTEM STATE / FETCH TASK
                try:
                    # Request a specific task from the orchestrator
                    resp = await self.client.get(f"{self.orchestrator_url}/system/fetch_task?worker_id={self.worker_id}")
                    if resp.status_code == 200:
                        mission_data = resp.json()
                        if mission_data.get("task_available"):
                            # Launch mission in background if semaphore allows
                            if self.semaphore._value > 0:
                                asyncio.create_task(self.execute_mission(mission_data))
                            else:
                                self.add_log("⏳ [CEO] At max concurrency. Waiting for worker slot...")
                        else:
                            # self.add_log(f"💤 [CEO] No tasks available. Sleeping...")
                            pass
                    elif resp.status_code == 404:
                         # Standby mode
                         pass
                except Exception as req_err:
                    self.add_log(f"⚠️ [CEO] API Poll Failed: {req_err}")

                await asyncio.sleep(1) # Faster polling for high throughput
            except RateLimitError:
                self.add_log("🔄 [CEO] Global Rate Limit Recovery initiated (Proxy Rotation)...")
                await self.controller.reconnect_with_new_proxy()
                await asyncio.sleep(5)
            except Exception as e:
                self.add_log(f"🚨 [CEO] Loop Error: {e}")
                await asyncio.sleep(5)

    async def run(self):
        try:
            if await self.setup():
                await self.production_mission_loop()
            else:
                self.add_log("🔥 [CEO] Setup failed. Exiting.")
                sys.exit(1)
        except Exception as e:
            self.add_log(f"🔥 [CEO] CRITICAL FAILURE: {e}")
            sys.exit(1)
        finally:
            await self.client.aclose()
            await self.controller.close()

worker = SteelMasterWorker()

@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    task = loop.create_task(worker.run())
    yield
    worker.is_running = False
    await task

app = FastAPI(lifespan=lifespan)

@app.get("/", response_class=HTMLResponse)
async def index():
    html_content = f"""
    <html>
        <head>
            <title>CEO Steel Master Worker</title>
            <style>
                body {{ font-family: monospace; background: #0e0e0e; color: #00ff00; padding: 20px; }}
                .log-container {{ background: #1a1a1a; padding: 10px; border-radius: 5px; height: 400px; overflow-y: scroll; }}
                .stats {{ display: flex; gap: 20px; margin-bottom: 20px; }}
                .stat-box {{ background: #222; padding: 10px; border: 1px solid #444; border-radius: 5px; }}
            </style>
            <script>
                setTimeout(() => location.reload(), 5000);
            </script>
        </head>
        <body>
            <h1>🚀 CEO STEEL MASTER WORKER (V2026.2)</h1>
            <div class="stats">
                <div class="stat-box">Role: {worker.role}</div>
                <div class="stat-box">ID: {worker.worker_id}</div>
                <div class="stat-box">Concurrency: {worker.max_concurrent_missions}</div>
            </div>
            <div class="log-container">
                {"<br>".join(worker.log_history[::-1])}
            </div>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
