"""
Smart Solver Router - 100% FREE Self-Hosted Captcha Solving
Coordinates between Gemini (primary), Mistral (backup), YOLO (local), and Groq
NO PAID SERVICES: No CapMonster, No 2Captcha, No OpenAI, No Claude!
"""

import time
import logging
import hashlib
import base64
import json
import tempfile
import os
from typing import Dict, Optional, Any, Union, List
from pydantic import BaseModel

from app.core.config import settings
from app.services.mistral_solver import MistralSolver, MistralSolution, get_mistral_solver
from app.services.gemini_solver import GeminiSolver
from app.services.groq_solver import GroqSolver
from app.services.yolo_solver import YOLOSolver
from app.services.human_fallback import HumanFallback
from app.core.redis_cache import RedisCache
from app.services.proxy_manager import get_proxy_manager
from app.services.analytics_engine import get_analytics_engine
from app.services.plugin_manager import get_plugin_manager

logger = logging.getLogger(__name__)


class UnifiedSolution(BaseModel):
    """Unified solution response from router"""

    solution: str
    confidence: float
    time_ms: int
    solver_used: str
    cost: float
    cache_hit: bool = False
    error: Optional[str] = None
    fallback_used: bool = False


import asyncio
from app.services.image_processor import ImageProcessor
from app.services.fuzzy_corrector import fuzzy_corrector

import httpx


class RemoteSolverRouter:
    """
    Remote router that delegates solving to a central orchestrator API.
    Used by workers to avoid hitting rate limits and share caching.
    """

    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        logger.info(f"RemoteSolverRouter initialized with API: {self.api_url}")

    async def solve_image(
        self, image_base64: str, captcha_type: str = "auto", use_cache: bool = True
    ) -> UnifiedSolution:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.api_url}/solve/image/base64",
                    json={
                        "image_base64": image_base64,
                        "captcha_type": captcha_type,
                        "use_cache": use_cache,
                    },
                    headers={"X-API-Key": self.api_key},
                )
                if response.status_code != 200:
                    logger.error(f"Remote solver failed: {response.status_code} - {response.text}")
                    return UnifiedSolution(
                        solution="",
                        confidence=0.0,
                        time_ms=0,
                        solver_used="remote",
                        cost=0.0,
                        error=f"API Error: {response.status_code}",
                    )

                data = response.json()
                return UnifiedSolution(**data)
        except Exception as e:
            logger.error(f"Remote solver connection error: {e}")
            return UnifiedSolution(
                solution="", confidence=0.0, time_ms=0, solver_used="remote", cost=0.0, error=str(e)
            )

    async def solve_text(self, question: str, use_cache: bool = True) -> UnifiedSolution:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.api_url}/solve/text",
                    json={"question": question, "use_cache": use_cache},
                    headers={"X-API-Key": self.api_key},
                )
                data = response.json()
                return UnifiedSolution(**data)
        except Exception as e:
            logger.error(f"Remote solver connection error: {e}")
            return UnifiedSolution(
                solution="", confidence=0.0, time_ms=0, solver_used="remote", cost=0.0, error=str(e)
            )

    async def solve_auto(
        self, image_base64: str = "", question: str = "", use_cache: bool = True
    ) -> UnifiedSolution:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.api_url}/solve/auto",
                    json={
                        "image_base64": image_base64,
                        "question": question,
                        "use_cache": use_cache,
                    },
                    headers={"X-API-Key": self.api_key},
                )
                data = response.json()
                return UnifiedSolution(**data)
        except Exception as e:
            logger.error(f"Remote solver connection error: {e}")
            return UnifiedSolution(
                solution="", confidence=0.0, time_ms=0, solver_used="remote", cost=0.0, error=str(e)
            )

    async def get_stats(self) -> Dict[str, Any]:
        return {"mode": "remote"}

    async def health_check(self) -> Dict[str, Any]:
        return {"status": "remote_ready"}


class SolverRouter:
    """
    Smart router for CAPTCHA solving with Dual-Brain Architecture (Gemini + Mistral)
    100% FREE - No paid services!
    """

    def __init__(self):
        self.mistral: Optional[MistralSolver] = None
        self.gemini = GeminiSolver()
        self.groq = GroqSolver()
        self.yolo = YOLOSolver()
        self.human = HumanFallback()
        self.cache = RedisCache()
        self.analytics = get_analytics_engine()
        self.stats = {
            "total_requests": 0,
            "cache_hits": 0,
            "mistral_success": 0,
            "gemini_success": 0,
            "groq_success": 0,
            "yolo_success": 0,
            "human_success": 0,
            "total_fallbacks": 0,
            "total_time_ms": 0,
            "total_cost": 0.0,
            "fuzzy_corrections": 0,
        }

    async def _get_solvers(self):
        if self.mistral is None:
            self.mistral = await get_mistral_solver()
        return self.mistral

    async def _solve_yolo_local(self, image_base64: str, captcha_type: str) -> Dict[str, Any]:
        """Fast local YOLO fallback for grid/object tasks"""
        if captcha_type not in ["image_grid", "recaptcha", "object"]:
            return {"success": False}

        try:
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                tmp.write(base64.b64decode(image_base64))
                tmp_path = tmp.name

            try:
                detections = self.yolo.detect_objects(tmp_path)
                if detections:
                    # Map detections to solution string (e.g. tile indices)
                    # For simplicity, we just return a JSON of objects
                    return {
                        "success": True,
                        "solution": json.dumps(detections),
                        "confidence": max(d["confidence"] for d in detections),
                        "solver_used": "yolo-local",
                    }
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
        except Exception as e:
            logger.error(f"YOLO local solve failed: {e}")
        return {"success": False}

    async def _solve_plugin_fallback(self, image_base64: str, captcha_type: str) -> Dict[str, Any]:
        """Dynamic Plugin solve from Zimmer-17 Hub"""
        plugin_manager = get_plugin_manager()
        solution = await plugin_manager.execute_plugin_solve(captcha_type, image_base64)
        if solution:
            return {
                "success": True,
                "solution": solution,
                "confidence": 0.95,
                "solver_used": f"plugin-{captcha_type}",
            }
        return {"success": False}

    def _normalize_result(self, res: Any) -> Optional[Dict[str, Any]]:
        """Standardize different solver responses"""
        if res is None:
            return None

        if isinstance(res, dict):
            if not res.get("success"):
                return None
            return {
                "solution": res.get("solution", ""),
                "confidence": res.get("confidence", 0.0),
                "solver": res.get("solver_used", "unknown"),
                "cost": res.get("cost", 0.0),
            }
        elif hasattr(res, "solution") and res.solution:
            # Mistral/CapMonster/UnifiedSolution objects
            return {
                "solution": res.solution,
                "confidence": getattr(res, "confidence", 0.9),
                "solver": getattr(res, "solver_used", "mistral"),
                "cost": getattr(res, "cost", 0.0),
            }
        return None

    def _check_consensus(self, results: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Find majority agreement among results"""
        from collections import Counter

        solutions = [r["solution"].lower().strip() for r in results]
        counts = Counter(solutions)

        for sol, count in counts.items():
            if count >= 3:  # Majority of 5
                # Find original result for this solution
                orig = next(r for r in results if r["solution"].lower().strip() == sol)
                orig["confidence"] = 1.0  # High confidence on consensus
                return orig
        return None

    def _compute_image_hash(self, image_base64: str) -> str:
        return hashlib.sha256(image_base64.encode()).hexdigest()

    async def solve_image(
        self,
        image_base64: str,
        captcha_type: str = "auto",
        use_cache: bool = True,
        instruction: Optional[str] = None,
    ) -> UnifiedSolution:
        start_time = time.time()
        self.stats["total_requests"] += 1
        mistral = await self._get_solvers()

        if instruction and captcha_type == "auto":
            logger.info(f"📝 Injecting dynamic instruction: {instruction}")
            captcha_type = instruction

        proxy_manager = await get_proxy_manager()
        current_proxy = proxy_manager.get_sticky_proxy()
        if current_proxy:
            logger.info(f"🌐 Routing through proxy: {current_proxy}")

        if use_cache:
            cache_key = f"captcha:image:{self._compute_image_hash(image_base64)}"
            cached = await self.cache.get_json(cache_key)
            if cached:
                self.stats["cache_hits"] += 1
                solve_time_ms = int((time.time() - start_time) * 1000)
                self.analytics.record_solve(
                    True, solve_time_ms, "cache", captcha_type, from_cache=True
                )
                return UnifiedSolution(
                    solution=cached["solution"],
                    confidence=cached["confidence"],
                    time_ms=solve_time_ms,
                    solver_used="cache",
                    cost=0.0,
                    cache_hit=True,
                )

        logger.info(f"🧠 [FREE SOLVER] Engaging 100% Free Parallel Consensus for {captcha_type}...")

        try:
            tasks = [
                self.gemini.solve_image(image_base64, captcha_type),
                mistral.solve_image(image_base64, captcha_type) if mistral else None,
                self._solve_yolo_local(image_base64, captcha_type),
                self.groq.solve_image(image_base64, captcha_type)
                if settings.groq_api_key
                else None,
                self._solve_plugin_fallback(image_base64, captcha_type),
            ]

            valid_tasks = [t for t in tasks if t is not None]
            all_results = []

            # 🔥 CEO 2026: Exhaustive Consensus (Collect all for accuracy)
            try:
                # We wait for ALL results to ensure 1000% accuracy, with a 20s hard timeout
                finished, pending = await asyncio.wait(valid_tasks, timeout=20.0)

                for task in finished:
                    try:
                        res = await task
                        normalized_res = self._normalize_result(res)
                        if normalized_res:
                            all_results.append(normalized_res)
                    except Exception as e:
                        logger.warning(f"Solver in pool failed: {e}")

                # Cancel pending tasks
                for task in pending:
                    task.cancel()
            except asyncio.TimeoutError:
                logger.warning("⏱️ Consensus pool timed out. Proceeding with partial results.")

            if not all_results:
                return UnifiedSolution(
                    solution="",
                    confidence=0.0,
                    time_ms=0,
                    solver_used="none",
                    cost=0.0,
                    error="All solvers failed in pool",
                )

            # 🤝 ELITE CONSENSUS LOGIC
            logger.info(f"📊 [CONSENSUS] Gathered {len(all_results)} results. Analyzing...")

            # Step 1: Check for perfect matches
            from collections import Counter

            solutions = [r["solution"].lower().strip() for r in all_results]
            counts = Counter(solutions)

            winner = None
            for sol, count in counts.most_common():
                # TIER 1: MAJORITY (3+ agree)
                if count >= 3:
                    winner = next(r for r in all_results if r["solution"].lower().strip() == sol)
                    winner["confidence"] = 1.0
                    winner["solver"] = f"consensus-majority({count})"
                    break

                # TIER 2: STRONG DUAL (2 agree and at least one is high confidence)
                if count >= 2:
                    matching_results = [
                        r for r in all_results if r["solution"].lower().strip() == sol
                    ]
                    max_conf = max(r["confidence"] for r in matching_results)
                    if max_conf >= 0.9:
                        winner = matching_results[0]
                        winner["confidence"] = 0.99
                        winner["solver"] = f"consensus-strong-dual({count})"
                        break

            # TIER 3: BEST SINGLE (No consensus)
            if not winner:
                best_single = max(all_results, key=lambda x: x["confidence"])

                if best_single["confidence"] < 0.85:
                    logger.info(
                        "🆘 [RECOVERY] Confidence low and no consensus. Engaging High-Tier Gemini..."
                    )
                    high_tier_res = await self.gemini.solve_image(
                        image_base64, captcha_type, high_tier=True
                    )
                    if high_tier_res.get("success") and high_tier_res.get("confidence", 0) > 0.9:
                        winner = {
                            "solution": high_tier_res["solution"],
                            "confidence": high_tier_res["confidence"],
                            "solver": "high-tier-recovery",
                            "cost": high_tier_res.get("cost", 0.0),
                        }
                    else:
                        winner = best_single
                        logger.info(
                            f"🏆 [CONSENSUS] Recovery failed or low confidence, selecting best single: {winner['solver']} ({winner['confidence']})"
                        )
                else:
                    winner = best_single
                    logger.info(
                        f"🏆 [CONSENSUS] No consensus, selecting best single: {winner['solver']} ({winner['confidence']})"
                    )
            else:
                logger.info(
                    f"✅ [CONSENSUS] Final Decision: {winner['solution']} via {winner['solver']}"
                )

            if winner:
                solve_time_ms = int((time.time() - start_time) * 1000)
                self.stats[
                    f"{winner['solver'].split('-')[0]}_success"
                    if "-" in winner["solver"]
                    else "mistral_success"
                ] += 1
                self.analytics.record_solve(True, solve_time_ms, winner["solver"], captcha_type)

                # Cache successful solution
                if use_cache:
                    cache_key = f"captcha:image:{self._compute_image_hash(image_base64)}"
                    await self.cache.set_json(
                        cache_key,
                        {"solution": winner["solution"], "confidence": winner["confidence"]},
                        ttl=3600,
                    )

                return UnifiedSolution(
                    solution=winner["solution"],
                    confidence=winner["confidence"],
                    time_ms=solve_time_ms,
                    solver_used=winner["solver"],
                    cost=winner.get("cost", 0.0),
                )

        except Exception as e:
            logger.error(f"❌ Elite Consensus solve failed: {e}", exc_info=True)
            # Log additional forensics if possible
            if image_base64:
                logger.debug(f"Forensics: image_size={len(image_base64)}, type={captcha_type}")

        # 3. Last Resort: Human Fallback (if AI fails or confidence is too low)
        if not winner or winner["confidence"] < 0.8:
            logger.warning("⚠️ [CEO] AI Confidence low. Triggering Human Fallback...")
            human_result = await self.human.solve_with_humans(image_base64)
            if human_result:
                self.stats["human_success"] += 1
                solve_time_ms = int((time.time() - start_time) * 1000)
                return UnifiedSolution(
                    solution=human_result,
                    confidence=1.0,
                    time_ms=solve_time_ms,
                    solver_used="human-fallback",
                    cost=0.05,
                    fallback_used=True,
                )

        # 5. 🔥 CEO 2026: DYNAMIC PLUGIN FALLBACK (Zimmer-17 Hub)
        logger.info(f"🧩 [CEO] Attempting Dynamic Plugin Fallback for {captcha_type}...")
        plugin_manager = get_plugin_manager()
        plugin_solution = await plugin_manager.execute_plugin_solve(captcha_type, image_base64)
        if plugin_solution:
            logger.info(f"✅ [CEO] Plugin success for {captcha_type} (Zimmer-17)")
            solve_time_ms = int((time.time() - start_time) * 1000)
            return UnifiedSolution(
                solution=plugin_solution,
                confidence=0.95,
                time_ms=solve_time_ms,
                solver_used=f"plugin-{captcha_type}",
                cost=0.0,
            )

        # Record failure
        self.analytics.record_solve(
            success=False,
            solve_time_ms=int((time.time() - start_time) * 1000),
            solver_used="none",
            captcha_type=captcha_type,
        )

        return UnifiedSolution(
            solution="",
            confidence=0.0,
            time_ms=0,
            solver_used="none",
            cost=0.0,
            error="All solvers failed",
        )

    def _wrap_res(self, res: Any, start_time: float, name: Optional[str] = None) -> UnifiedSolution:
        solve_time_ms = int((time.time() - start_time) * 1000)

        if isinstance(res, dict):  # Gemini format
            solution = res.get("solution", "")
            success = bool(solution)
            solver_name = str(res.get("solver_used", "gemini"))

            # Record in analytics
            self.analytics.record_solve(
                success=success,
                solve_time_ms=solve_time_ms,
                solver_used=solver_name,
                captcha_type="auto",
            )

            return UnifiedSolution(
                solution=solution,
                confidence=res.get("confidence", 0.0),
                time_ms=solve_time_ms,
                solver_used=solver_name,
                cost=0.0,
            )
        else:  # Mistral/Capmonster format
            success = bool(res.solution)
            solver_name = name or "unknown"

            # Record in analytics
            self.analytics.record_solve(
                success=success,
                solve_time_ms=res.time_ms if hasattr(res, "time_ms") else solve_time_ms,
                solver_used=solver_name,
                captcha_type="auto",
            )

            return UnifiedSolution(
                solution=res.solution,
                confidence=res.confidence,
                time_ms=res.time_ms if hasattr(res, "time_ms") else solve_time_ms,
                solver_used=solver_name,
                cost=res.cost,
            )

    async def solve_text(self, question: str, use_cache: bool = True) -> UnifiedSolution:
        res = await self.gemini.solve_image(base64.b64encode(question.encode()).decode(), "text")
        return self._wrap_res(res, time.time(), "gemini-text")

    async def solve_auto(
        self, image_base64: str, question: Optional[str] = None, use_cache: bool = True
    ) -> UnifiedSolution:
        if image_base64:
            return await self.solve_image(image_base64, "auto", use_cache)
        if question:
            return await self.solve_text(question, use_cache)
        return UnifiedSolution(
            solution="", confidence=0.0, time_ms=0, solver_used="none", cost=0.0, error="No input"
        )

    async def get_stats(self) -> Dict[str, Any]:
        return self.stats

    async def health_check(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "solvers": ["gemini", "mistral", "groq", "yolo"],
            "paid_services": False,
        }


# Singleton
_router = None


async def get_solver_router() -> Union[SolverRouter, RemoteSolverRouter]:
    global _router
    if _router is None:
        import os

        orchestrator_url = os.getenv("ORCHESTRATOR_URL")
        worker_api_key = os.getenv("WORKER_API_KEY", "master-worker-key-2026")

        if orchestrator_url:
            _router = RemoteSolverRouter(orchestrator_url, worker_api_key)
        else:
            _router = SolverRouter()
    return _router
