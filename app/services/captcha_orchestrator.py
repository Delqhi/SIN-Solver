"""
CAPTCHA Orchestrator - Enterprise Edition
Routes CAPTCHAs to optimal solvers based on YOLO classification
"""

import asyncio
import time
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

from app.core.logging_config import get_logger
from app.core.monitoring import metrics, track_request
from app.core.security import RateLimiter

logger = get_logger(__name__)


class CaptchaType(Enum):
    TEXT = "Text_Captcha"
    RECAPTCHA_V2 = "reCAPTCHA_v2"
    RECAPTCHA_V3 = "reCAPTCHA_v3"
    HCAPTCHA = "hCaptcha"
    CLOUDFLARE = "Cloudflare_Turnstile"
    IMAGE_SELECT = "Image_Select"
    SLIDER = "Slider_Captcha"
    AUDIO = "Audio_Captcha"
    MATH = "Math_Captcha"
    GRID = "Grid_Captcha"
    ROTATE = "Rotate_Captcha"
    FUN_CAPTCHA = "FunCaptcha"


@dataclass
class SolveResult:
    success: bool
    solution: str
    confidence: float
    solve_time_ms: int
    solver: str
    cost_usd: float
    captcha_type: str
    error_message: Optional[str] = None


class CaptchaOrchestrator:
    """
    Enterprise CAPTCHA Orchestrator
    - Classifies CAPTCHA type using YOLO
    - Routes to optimal solver
    - Implements fallback chain
    - Collects comprehensive metrics
    """

    def __init__(self):
        self.yolo_classifier = None
        self.ocr_engines = {}
        self.ai_solvers = {}
        self.browser_solver = None
        self.rate_limiter = RateLimiter()
        self._initialized = False

    async def initialize(self):
        """Initialize all solver components."""
        if self._initialized:
            return

        logger.info("Initializing CAPTCHA Orchestrator...")

        # Initialize YOLO classifier
        try:
            from app.services.yolo_enterprise import YOLOEnterpriseService

            self.yolo_classifier = YOLOEnterpriseService()
            await self.yolo_classifier.load_model()
            logger.info("YOLO classifier loaded")
        except Exception as e:
            logger.error("Failed to load YOLO classifier", error=str(e))
            raise

        # Initialize OCR engines for text CAPTCHAs
        try:
            from app.captcha_solver_pipeline import TesseractOCREngine, PaddleOCREngine

            self.ocr_engines["tesseract"] = TesseractOCREngine()
            self.ocr_engines["paddle"] = PaddleOCREngine()
            logger.info("OCR engines initialized")
        except Exception as e:
            logger.warning("Some OCR engines failed to initialize", error=str(e))

        # Initialize AI solvers
        try:
            from app.services.gemini_solver import GeminiSolver
            from app.services.mistral_solver import MistralSolver
            from app.services.groq_solver import GroqSolver

            self.ai_solvers["gemini"] = GeminiSolver()
            self.ai_solvers["mistral"] = MistralSolver()
            self.ai_solvers["groq"] = GroqSolver()
            logger.info("AI solvers initialized")
        except Exception as e:
            logger.warning("Some AI solvers failed to initialize", error=str(e))

        self._initialized = True
        logger.info("CAPTCHA Orchestrator initialized successfully")

    @track_request("captcha_solve")
    async def solve(
        self, image_data: bytes, options: Optional[Dict[str, Any]] = None
    ) -> SolveResult:
        """
        Main solve method - classifies and routes CAPTCHA

        Args:
            image_data: Raw image bytes
            options: Optional solve parameters (timeout, preferred_solver, etc.)

        Returns:
            SolveResult with solution and metadata
        """
        start_time = time.time()
        options = options or {}

        try:
            # Step 1: Classify CAPTCHA type using YOLO
            classification = await self._classify(image_data)
            captcha_type = classification["type"]
            confidence = classification["confidence"]

            logger.info("CAPTCHA classified", type=captcha_type, confidence=confidence)

            metrics.increment("captcha_classified", tags={"type": captcha_type})

            # Step 2: Route to appropriate solver
            if captcha_type == CaptchaType.TEXT.value:
                result = await self._solve_text(image_data, options)
            elif captcha_type in [
                CaptchaType.RECAPTCHA_V2.value,
                CaptchaType.RECAPTCHA_V3.value,
                CaptchaType.HCAPTCHA.value,
                CaptchaType.CLOUDFLARE.value,
            ]:
                result = await self._solve_browser_based(image_data, captcha_type, options)
            elif captcha_type == CaptchaType.IMAGE_SELECT.value:
                result = await self._solve_image_select(image_data, options)
            elif captcha_type == CaptchaType.MATH.value:
                result = await self._solve_math(image_data, options)
            else:
                # Default to AI consensus
                result = await self._solve_ai_consensus(image_data, options)

            # Add metadata
            result.captcha_type = captcha_type
            result.solve_time_ms = int((time.time() - start_time) * 1000)

            # Record metrics
            metrics.increment(
                "captcha_solved" if result.success else "captcha_failed",
                tags={"type": captcha_type, "solver": result.solver},
            )
            metrics.histogram("solve_time_ms", result.solve_time_ms, tags={"type": captcha_type})

            return result

        except Exception as e:
            logger.error("Solve failed", error=str(e))
            metrics.increment("captcha_error")
            return SolveResult(
                success=False,
                solution="",
                confidence=0.0,
                solve_time_ms=int((time.time() - start_time) * 1000),
                solver="none",
                cost_usd=0.0,
                captcha_type="unknown",
                error_message=str(e),
            )

    async def _classify(self, image_data: bytes) -> Dict[str, Any]:
        """Classify CAPTCHA type using YOLO."""
        if not self.yolo_classifier:
            raise RuntimeError("YOLO classifier not initialized")

        result = await self.yolo_classifier.predict(image_data)
        return {
            "type": result["class"],
            "confidence": result["confidence"],
            "all_predictions": result.get("all_predictions", []),
        }

    async def _solve_text(self, image_data: bytes, options: Dict) -> SolveResult:
        """Solve text CAPTCHA using OCR consensus."""
        logger.info("Solving text CAPTCHA with OCR consensus")

        results = []

        # Run all available OCR engines
        for name, engine in self.ocr_engines.items():
            try:
                start = time.time()
                text = await engine.extract_text(image_data)
                elapsed = int((time.time() - start) * 1000)

                results.append(
                    {
                        "engine": name,
                        "text": text,
                        "time_ms": elapsed,
                        "success": bool(text and len(text) > 0),
                    }
                )
            except Exception as e:
                logger.warning(f"OCR engine {name} failed", error=str(e))

        # Consensus voting
        if not results:
            return SolveResult(
                success=False,
                solution="",
                confidence=0.0,
                solve_time_ms=0,
                solver="ocr_consensus",
                cost_usd=0.0,
            )

        # Find most common result
        texts = [r["text"] for r in results if r["success"]]
        if not texts:
            return SolveResult(
                success=False,
                solution="",
                confidence=0.0,
                solve_time_ms=0,
                solver="ocr_consensus",
                cost_usd=0.0,
            )

        from collections import Counter

        most_common = Counter(texts).most_common(1)[0]
        solution = most_common[0]
        agreement = most_common[1] / len(results)

        confidence = min(0.4 + (agreement * 0.5), 0.95)
        avg_time = int(sum(r["time_ms"] for r in results) / len(results))

        return SolveResult(
            success=True,
            solution=solution,
            confidence=confidence,
            solve_time_ms=avg_time,
            solver="ocr_consensus",
            cost_usd=0.001 * len(results),
        )

    async def _solve_browser_based(
        self, image_data: bytes, captcha_type: str, options: Dict
    ) -> SolveResult:
        """Solve browser-based CAPTCHAs (reCAPTCHA, hCaptcha)."""
        logger.info(f"Solving {captcha_type} with browser automation")

        # Use Steel Browser + AI consensus
        return await self._solve_ai_consensus(image_data, options)

    async def _solve_image_select(self, image_data: bytes, options: Dict) -> SolveResult:
        """Solve image selection CAPTCHA."""
        logger.info("Solving image select CAPTCHA")
        return await self._solve_ai_consensus(image_data, options)

    async def _solve_math(self, image_data: bytes, options: Dict) -> SolveResult:
        """Solve math CAPTCHA."""
        logger.info("Solving math CAPTCHA")
        # Try OCR first, then AI
        ocr_result = await self._solve_text(image_data, options)
        if ocr_result.success:
            return ocr_result
        return await self._solve_ai_consensus(image_data, options)

    async def _solve_ai_consensus(self, image_data: bytes, options: Dict) -> SolveResult:
        """Multi-AI consensus solving."""
        logger.info("Solving with AI consensus")

        start_time = time.time()
        results = []

        # Run all AI solvers in parallel
        tasks = []
        for name, solver in self.ai_solvers.items():
            tasks.append(self._run_solver(name, solver, image_data))

        solver_results = await asyncio.gather(*tasks, return_exceptions=True)

        valid_results = []
        for result in solver_results:
            if isinstance(result, Exception):
                continue
            if result and result.get("success"):
                valid_results.append(result)

        if not valid_results:
            return SolveResult(
                success=False,
                solution="",
                confidence=0.0,
                solve_time_ms=int((time.time() - start_time) * 1000),
                solver="ai_consensus",
                cost_usd=0.0,
            )

        # Weighted consensus (Gemini 0.4, Mistral 0.3, Groq 0.3)
        weights = {"gemini": 0.4, "mistral": 0.3, "groq": 0.3}

        # Group by solution
        solutions = {}
        for r in valid_results:
            sol = r["solution"]
            solver = r["solver"]
            weight = weights.get(solver, 0.3)

            if sol not in solutions:
                solutions[sol] = {"weight": 0, "solvers": []}
            solutions[sol]["weight"] += weight
            solutions[sol]["solvers"].append(solver)

        # Pick highest weighted solution
        best = max(solutions.items(), key=lambda x: x[1]["weight"])
        solution = best[0]
        confidence = min(best[1]["weight"] + 0.1, 0.95)

        return SolveResult(
            success=True,
            solution=solution,
            confidence=confidence,
            solve_time_ms=int((time.time() - start_time) * 1000),
            solver=f"ai_consensus({','.join(best[1]['sololvers'])})",
            cost_usd=sum(r.get("cost_usd", 0.01) for r in valid_results),
        )

    async def _run_solver(self, name: str, solver, image_data: bytes) -> Optional[Dict]:
        """Run a single solver with timeout."""
        try:
            result = await asyncio.wait_for(solver.solve(image_data), timeout=30.0)
            result["solver"] = name
            return result
        except asyncio.TimeoutError:
            logger.warning(f"Solver {name} timed out")
            return None
        except Exception as e:
            logger.warning(f"Solver {name} failed", error=str(e))
            return None


# Global orchestrator instance
_orchestrator: Optional[CaptchaOrchestrator] = None


async def get_orchestrator() -> CaptchaOrchestrator:
    """Get or create orchestrator singleton."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = CaptchaOrchestrator()
        await _orchestrator.initialize()
    return _orchestrator
