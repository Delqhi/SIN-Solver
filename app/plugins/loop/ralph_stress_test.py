import asyncio
import logging
import time
import os
import sys
from typing import List, Dict, Any

sys.path.append("/Users/jeremy/dev/SIN-Solver")

from app.services.solver_router import get_solver_router
from app.core.forensic_ledger import forensics
from app.services.advanced_solver import get_advanced_solver

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("RalphLoop")

class RalphStressTester:
    def __init__(self):
        self.streak = 0
        self.target_streak = 100
        self.total_solved = 0
        self.failures = 0
        
    async def run_loop(self):
        logger.info("🚀 [CEO] INITIALIZING INFINITE RALPH-LOOP STRESS TEST")
        
        from app.core.config import settings
        await settings.fetch_secrets_from_zimmer13()
        
        router = await get_solver_router()
        advanced = get_advanced_solver()
        
        while self.streak < self.target_streak:
            try:
                # CEO Optimization: Check for multiple test images
                test_image = "/Users/jeremy/dev/SIN-Solver/demo_step1.png"
                if not os.path.exists(test_image):
                    # Local fallback if main step image missing
                    test_image = "demo_step1.png"
                
                if not os.path.exists(test_image):
                    logger.error(f"Test image missing: {test_image}")
                    await asyncio.sleep(5)
                    continue

                with open(test_image, "rb") as f:
                    image_bytes = f.read()
                
                offset = await advanced.solve_slider(image_bytes)
                
                if offset > 0:
                    self.streak += 1
                    self.total_solved += 1
                    logger.info(f"✅ [STREAK: {self.streak}/{self.target_streak}] Solve Successful. Offset: {offset}")
                else:
                    logger.warning("❌ Solve Failed or confidence too low.")
                    self.streak = 0
                    self.failures += 1
                    forensics.record_error(
                        "LOOP_SOLVE_FAILURE",
                        "Advanced solver returned zero offset for test image",
                        {"streak": self.streak, "total": self.total_solved}
                    )
                
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"🔥 Loop Crash: {e}")
                import traceback
                logger.error(traceback.format_exc())
                self.streak = 0
                await asyncio.sleep(5)

if __name__ == "__main__":
    tester = RalphStressTester()
    asyncio.run(tester.run_loop())

