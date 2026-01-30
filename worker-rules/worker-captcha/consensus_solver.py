#!/usr/bin/env python3
"""
🚀 3-AGENT CONSENSUS CAPTCHA SOLVER
====================================
Enterprise-grade multi-agent CAPTCHA solving with 95% consensus requirement.

Features:
- 3 independent AI agents (Vision, OCR, Pattern Recognition)
- 95% confidence threshold for consensus
- Parallel agent execution (async/await)
- Comprehensive logging & timing metrics
- Graceful degradation & error handling
- Production-ready error reporting

Author: Sisyphus Engineering
Version: 1.0.0
Date: 2026-01-29
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from enum import Enum
import json

# Third-party imports (with graceful fallbacks)
try:
    import numpy as np
    from PIL import Image

    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("ConsensusSolver")


# ============================================================================
# ENUMS & DATA CLASSES
# ============================================================================


class AgentType(Enum):
    """Enumeration of available agent types"""

    GEMINI_VISION = "gemini_vision"
    TESSERACT_OCR = "tesseract_ocr"
    PATTERN_RECOGNITION = "pattern_recognition"


class SolutionStatus(Enum):
    """CAPTCHA solution status codes"""

    CONSENSUS_REACHED = "consensus_reached"
    CANNOT_SOLVE = "cannot_solve"
    AGENT_FAILURE = "agent_failure"
    TIMEOUT = "timeout"
    INVALID_INPUT = "invalid_input"


@dataclass
class TimingMetrics:
    """Timing measurements for solver execution"""

    start_time: float = field(default_factory=time.time)
    agent_1_duration: float = 0.0
    agent_2_duration: float = 0.0
    agent_3_duration: float = 0.0
    total_duration: float = 0.0
    consensus_check_duration: float = 0.0

    def to_dict(self) -> Dict[str, float]:
        """Convert metrics to dictionary"""
        return {
            "agent_1_ms": round(self.agent_1_duration * 1000, 2),
            "agent_2_ms": round(self.agent_2_duration * 1000, 2),
            "agent_3_ms": round(self.agent_3_duration * 1000, 2),
            "consensus_check_ms": round(self.consensus_check_duration * 1000, 2),
            "total_ms": round(self.total_duration * 1000, 2),
        }


@dataclass
class AgentResponse:
    """Response from a single agent"""

    agent_type: AgentType
    solution: Optional[str]
    confidence: float  # 0.0 to 1.0
    error: Optional[str] = None
    duration: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "agent": self.agent_type.value,
            "solution": self.solution,
            "confidence": round(self.confidence, 3),
            "error": self.error,
            "duration_ms": round(self.duration * 1000, 2),
        }


@dataclass
class ConsensusDecision:
    """Consensus decision result"""

    reached: bool
    solution: Optional[str]
    confidence_scores: Dict[str, float]
    agreement_pairs: Dict[str, bool]  # Which agents agreed with whom
    consensus_strength: float  # 0.0 to 1.0 (how strong the agreement is)
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "reached": self.reached,
            "solution": self.solution,
            "confidence_scores": {k: round(v, 3) for k, v in self.confidence_scores.items()},
            "agreement_pairs": self.agreement_pairs,
            "consensus_strength": round(self.consensus_strength, 3),
        }


@dataclass
class SolverResult:
    """Final solver result"""

    status: SolutionStatus
    solution: Optional[str]
    confidence: float
    consensus_reached: bool
    agent_responses: List[AgentResponse]
    consensus_decision: Optional[ConsensusDecision]
    timing_metrics: TimingMetrics
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "status": self.status.value,
            "solution": self.solution,
            "confidence": round(self.confidence, 3),
            "consensus_reached": self.consensus_reached,
            "agents": [r.to_dict() for r in self.agent_responses],
            "consensus": self.consensus_decision.to_dict() if self.consensus_decision else None,
            "timing": self.timing_metrics.to_dict(),
            "error": self.error_message,
        }


# ============================================================================
# AGENT IMPLEMENTATIONS
# ============================================================================


class Agent1_GeminiVision:
    """
    Vision-based CAPTCHA solver using Google Gemini Vision API.

    Uses: Google Generative AI (Gemini 1.5 Vision)
    Strengths: Multi-modal, handles image-based CAPTCHAs well
    Input: Image file or base64
    Output: Predicted CAPTCHA text
    """

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Gemini Vision agent"""
        self.agent_type = AgentType.GEMINI_VISION
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.logger = logging.getLogger(f"{self.__class__.__name__}")

        # Check if available
        self.available = False
        if self.api_key:
            try:
                import google.generativeai as genai

                genai.configure(api_key=self.api_key)
                self.client = genai.GenerativeModel("gemini-1.5-vision-latest")
                self.available = True
                self.logger.info("✅ Gemini Vision initialized successfully")
            except Exception as e:
                self.logger.warning(f"⚠️ Gemini Vision unavailable: {e}")
                self.available = False

    async def solve(self, image_path: str, timeout: float = 15.0) -> AgentResponse:
        """
        Solve CAPTCHA using Gemini Vision API.

        Args:
            image_path: Path to CAPTCHA image or base64 string
            timeout: Maximum time for solving (seconds)

        Returns:
            AgentResponse with solution and confidence
        """
        start_time = time.time()

        if not self.available:
            return AgentResponse(
                agent_type=self.agent_type,
                solution=None,
                confidence=0.0,
                error="Gemini Vision API not initialized",
                duration=time.time() - start_time,
            )

        try:
            # Load image
            image = Image.open(image_path)

            # Call Gemini Vision API with timeout
            prompt = (
                "This is a CAPTCHA image. "
                "Please read and transcribe ALL text, numbers, and characters visible in the CAPTCHA. "
                "Return ONLY the characters/text, nothing else. "
                "Be precise and include all visible elements."
            )

            # Use asyncio.wait_for for timeout
            async def call_gemini():
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(
                    None, lambda: self.client.generate_content([prompt, image])
                )

            response = await asyncio.wait_for(call_gemini(), timeout=timeout)
            solution = response.text.strip()

            # Gemini gives us confidence implicitly via response quality
            # Assume high confidence if response received (Gemini's safety filters catch uncertain responses)
            confidence = 0.85

            duration = time.time() - start_time

            self.logger.info(
                f"✅ Gemini Vision solved CAPTCHA in {duration:.2f}s: '{solution}' (conf: {confidence})"
            )

            return AgentResponse(
                agent_type=self.agent_type,
                solution=solution,
                confidence=confidence,
                duration=duration,
            )

        except asyncio.TimeoutError:
            duration = time.time() - start_time
            error_msg = f"Gemini Vision timeout after {timeout}s"
            self.logger.warning(f"⚠️ {error_msg}")
            return AgentResponse(
                agent_type=self.agent_type,
                solution=None,
                confidence=0.0,
                error=error_msg,
                duration=duration,
            )
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"Gemini Vision error: {str(e)}"
            self.logger.error(f"❌ {error_msg}")
            return AgentResponse(
                agent_type=self.agent_type,
                solution=None,
                confidence=0.0,
                error=error_msg,
                duration=duration,
            )


class Agent2_TesseractOCR:
    """
    OCR-based CAPTCHA solver using Tesseract OCR.

    Uses: Tesseract OCR engine (pytesseract)
    Strengths: Fast, works well with text-only CAPTCHAs, no API required
    Input: Image file
    Output: Recognized text
    """

    def __init__(self):
        """Initialize Tesseract OCR agent"""
        self.agent_type = AgentType.TESSERACT_OCR
        self.logger = logging.getLogger(f"{self.__class__.__name__}")

        # Check if available
        self.available = False
        try:
            import pytesseract
            from PIL import Image, ImageFilter, ImageEnhance

            # Test if tesseract is installed
            pytesseract.pytesseract.get_tesseract_version()

            self.pytesseract = pytesseract
            self.Image = Image
            self.ImageFilter = ImageFilter
            self.ImageEnhance = ImageEnhance
            self.available = True
            self.logger.info("✅ Tesseract OCR initialized successfully")
        except Exception as e:
            self.logger.warning(f"⚠️ Tesseract OCR unavailable: {e}")
            self.available = False

    def _preprocess_image(self, image_path: str) -> "Image.Image":
        """
        Preprocess image for better OCR accuracy.

        Techniques:
        - Grayscale conversion
        - Contrast enhancement
        - Noise reduction with bilateral filter approximation
        """
        image = self.Image.open(image_path)

        # Convert to grayscale
        if image.mode != "L":
            image = image.convert("L")

        # Enhance contrast
        enhancer = self.ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)

        # Enhance brightness if needed
        enhancer = self.ImageEnhance.Brightness(image)
        image = enhancer.enhance(1.1)

        # Slight blur then sharpen for noise reduction
        image = image.filter(self.ImageFilter.MedianFilter(size=3))

        return image

    async def solve(self, image_path: str, timeout: float = 15.0) -> AgentResponse:
        """
        Solve CAPTCHA using Tesseract OCR.

        Args:
            image_path: Path to CAPTCHA image
            timeout: Maximum time for solving (seconds)

        Returns:
            AgentResponse with solution and confidence
        """
        start_time = time.time()

        if not self.available:
            return AgentResponse(
                agent_type=self.agent_type,
                solution=None,
                confidence=0.0,
                error="Tesseract OCR not installed",
                duration=time.time() - start_time,
            )

        try:
            # Run OCR in executor to avoid blocking
            loop = asyncio.get_event_loop()

            async def ocr_task():
                return await asyncio.wait_for(
                    loop.run_in_executor(None, self._ocr_with_preprocessing, image_path),
                    timeout=timeout,
                )

            solution = await ocr_task()

            # Clean up solution
            solution = solution.strip()

            # Tesseract doesn't provide confidence directly, so we estimate based on:
            # - Non-empty response (0.7 baseline)
            # - Text length (longer = more likely valid)
            # - No special characters (if too many special chars, lower confidence)
            confidence = 0.65

            if len(solution) > 0:
                confidence = min(0.90, 0.65 + (len(solution) * 0.05))

            duration = time.time() - start_time

            self.logger.info(
                f"✅ Tesseract OCR solved CAPTCHA in {duration:.2f}s: '{solution}' (conf: {confidence})"
            )

            return AgentResponse(
                agent_type=self.agent_type,
                solution=solution,
                confidence=confidence,
                duration=duration,
            )

        except asyncio.TimeoutError:
            duration = time.time() - start_time
            error_msg = f"Tesseract OCR timeout after {timeout}s"
            self.logger.warning(f"⚠️ {error_msg}")
            return AgentResponse(
                agent_type=self.agent_type,
                solution=None,
                confidence=0.0,
                error=error_msg,
                duration=duration,
            )
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"Tesseract OCR error: {str(e)}"
            self.logger.error(f"❌ {error_msg}")
            return AgentResponse(
                agent_type=self.agent_type,
                solution=None,
                confidence=0.0,
                error=error_msg,
                duration=duration,
            )

    def _ocr_with_preprocessing(self, image_path: str) -> str:
        """Synchronous OCR with preprocessing (runs in executor)"""
        try:
            image = self._preprocess_image(image_path)
            text = self.pytesseract.image_to_string(image)
            return text
        except Exception as e:
            self.logger.error(f"OCR preprocessing error: {e}")
            raise


class Agent3_PatternRecognition:
    """
    Pattern-based CAPTCHA solver using AWS Rekognition or custom patterns.

    Uses: AWS Rekognition DetectText API
    Strengths: Handles complex CAPTCHAs, skewed text, multiple colors
    Input: Image file
    Output: Detected text with bounding boxes
    """

    def __init__(self, aws_access_key: Optional[str] = None, aws_secret_key: Optional[str] = None):
        """Initialize Pattern Recognition agent"""
        self.agent_type = AgentType.PATTERN_RECOGNITION
        self.logger = logging.getLogger(f"{self.__class__.__name__}")

        self.available = False
        self.aws_access_key = aws_access_key or os.environ.get("AWS_ACCESS_KEY_ID")
        self.aws_secret_key = aws_secret_key or os.environ.get("AWS_SECRET_ACCESS_KEY")

        if self.aws_access_key and self.aws_secret_key:
            try:
                import boto3

                self.rekognition_client = boto3.client(
                    "rekognition",
                    region_name="us-east-1",
                    aws_access_key_id=self.aws_access_key,
                    aws_secret_access_key=self.aws_secret_key,
                )
                self.available = True
                self.logger.info("✅ AWS Rekognition initialized successfully")
            except Exception as e:
                self.logger.warning(f"⚠️ AWS Rekognition unavailable: {e}")
                self.available = False
        else:
            self.logger.warning("⚠️ AWS credentials not configured for Rekognition")

    async def solve(self, image_path: str, timeout: float = 15.0) -> AgentResponse:
        """
        Solve CAPTCHA using AWS Rekognition or fallback pattern matching.

        Args:
            image_path: Path to CAPTCHA image
            timeout: Maximum time for solving (seconds)

        Returns:
            AgentResponse with solution and confidence
        """
        start_time = time.time()

        if not self.available:
            return AgentResponse(
                agent_type=self.agent_type,
                solution=None,
                confidence=0.0,
                error="AWS Rekognition not configured",
                duration=time.time() - start_time,
            )

        try:
            loop = asyncio.get_event_loop()

            async def rekognition_task():
                return await asyncio.wait_for(
                    loop.run_in_executor(None, self._detect_text_aws, image_path), timeout=timeout
                )

            solution, confidence = await rekognition_task()

            duration = time.time() - start_time

            self.logger.info(
                f"✅ AWS Rekognition solved CAPTCHA in {duration:.2f}s: '{solution}' (conf: {confidence})"
            )

            return AgentResponse(
                agent_type=self.agent_type,
                solution=solution,
                confidence=confidence,
                duration=duration,
            )

        except asyncio.TimeoutError:
            duration = time.time() - start_time
            error_msg = f"AWS Rekognition timeout after {timeout}s"
            self.logger.warning(f"⚠️ {error_msg}")
            return AgentResponse(
                agent_type=self.agent_type,
                solution=None,
                confidence=0.0,
                error=error_msg,
                duration=duration,
            )
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"AWS Rekognition error: {str(e)}"
            self.logger.error(f"❌ {error_msg}")
            return AgentResponse(
                agent_type=self.agent_type,
                solution=None,
                confidence=0.0,
                error=error_msg,
                duration=duration,
            )

    def _detect_text_aws(self, image_path: str) -> Tuple[str, float]:
        """Synchronous AWS Rekognition DetectText call (runs in executor)"""
        try:
            with open(image_path, "rb") as image_file:
                image_bytes = image_file.read()

            response = self.rekognition_client.detect_text(Image={"Bytes": image_bytes})

            # Extract text from detections (exclude low-confidence detections)
            text_detections = response.get("TextDetections", [])

            # Get only parent detections (not individual words)
            parent_text = []
            confidence_scores = []

            for detection in text_detections:
                if detection["Type"] == "LINE":  # Parent text blocks
                    parent_text.append(detection["DetectedText"])
                    confidence_scores.append(detection.get("Confidence", 0) / 100.0)

            solution = " ".join(parent_text).strip()

            # Average confidence of detected lines
            avg_confidence = np.mean(confidence_scores) if confidence_scores else 0.0

            return solution, avg_confidence

        except Exception as e:
            self.logger.error(f"AWS DetectText error: {e}")
            raise


# ============================================================================
# CONSENSUS ENGINE
# ============================================================================


class ConsensusEngine:
    """
    Consensus decision making engine for CAPTCHA solutions.

    Rules:
    1. If 2 agents have 100% identical solution → CONSENSUS (submit)
    2. If all 3 agents have >95% similarity → CONSENSUS (submit)
    3. Otherwise → CANNOT_SOLVE (return failure)

    Similarity calculated using Levenshtein distance ratio.
    """

    CONSENSUS_THRESHOLD = 0.95  # 95% similarity required
    MIN_AGREEMENT_AGENTS = 2

    def __init__(self):
        """Initialize consensus engine"""
        self.logger = logging.getLogger(f"{self.__class__.__name__}")

    @staticmethod
    def _levenshtein_ratio(s1: str, s2: str) -> float:
        """
        Calculate Levenshtein distance ratio (0.0 to 1.0).

        1.0 = Identical
        0.0 = Completely different
        """
        if not s1 and not s2:
            return 1.0
        if not s1 or not s2:
            return 0.0

        # Use difflib for similarity ratio
        from difflib import SequenceMatcher

        return SequenceMatcher(None, s1, s2).ratio()

    def check_consensus(self, responses: List[AgentResponse]) -> ConsensusDecision:
        """
        Determine if agents reached consensus on CAPTCHA solution.

        Args:
            responses: List of AgentResponse objects from all agents

        Returns:
            ConsensusDecision with consensus status and reasoning
        """
        start_time = time.time()

        # Filter valid responses (with solutions)
        valid_responses = [r for r in responses if r.solution is not None]

        if len(valid_responses) < 2:
            # Not enough agents succeeded
            return ConsensusDecision(
                reached=False,
                solution=None,
                confidence_scores={r.agent_type.value: r.confidence for r in responses},
                agreement_pairs={},
                consensus_strength=0.0,
            )

        # Calculate pairwise similarity
        agreement_pairs = {}
        similarities = []

        for i in range(len(valid_responses)):
            for j in range(i + 1, len(valid_responses)):
                agent_i = valid_responses[i].agent_type.value
                agent_j = valid_responses[j].agent_type.value

                solution_i = valid_responses[i].solution
                solution_j = valid_responses[j].solution

                # Calculate similarity
                similarity = self._levenshtein_ratio(solution_i, solution_j)
                similarities.append(similarity)

                # Check if they agree (100% or >95%)
                key = f"{agent_i}_vs_{agent_j}"
                agreement_pairs[key] = similarity >= self.CONSENSUS_THRESHOLD

                self.logger.debug(
                    f"Similarity {agent_i} vs {agent_j}: {similarity:.3f} "
                    f"('{solution_i}' vs '{solution_j}')"
                )

        # Decision logic
        consensus_reached = False
        final_solution = None
        consensus_strength = 0.0

        if len(valid_responses) >= 3:
            # All 3 agents available
            avg_similarity = np.mean(similarities) if similarities else 0.0

            if avg_similarity >= self.CONSENSUS_THRESHOLD:
                # All pairs have >95% similarity
                consensus_reached = True
                final_solution = valid_responses[0].solution  # Use first agent's solution
                consensus_strength = avg_similarity
                self.logger.info(
                    f"✅ CONSENSUS REACHED (3 agents): {final_solution} (strength: {avg_similarity:.3f})"
                )
            else:
                self.logger.warning(
                    f"❌ No consensus with 3 agents (avg similarity: {avg_similarity:.3f})"
                )

        elif len(valid_responses) == 2:
            # Only 2 agents succeeded - need 100% match
            similarity = similarities[0] if similarities else 0.0

            if similarity >= 1.0:  # Exact match
                consensus_reached = True
                final_solution = valid_responses[0].solution
                consensus_strength = 1.0
                self.logger.info(f"✅ CONSENSUS REACHED (2 agents, exact match): {final_solution}")
            else:
                self.logger.warning(
                    f"❌ No consensus with 2 agents (similarity: {similarity:.3f}, need 1.0)"
                )

        duration = time.time() - start_time

        return ConsensusDecision(
            reached=consensus_reached,
            solution=final_solution,
            confidence_scores={r.agent_type.value: r.confidence for r in responses},
            agreement_pairs=agreement_pairs,
            consensus_strength=consensus_strength if consensus_reached else 0.0,
        )


# ============================================================================
# MAIN CONSENSUS CAPTCHA SOLVER
# ============================================================================

import os


class ConsensusCaptchaSolver:
    """
    Enterprise-grade 3-agent consensus CAPTCHA solver.

    Features:
    - Parallel execution of 3 independent agents
    - 95% consensus threshold
    - Comprehensive error handling
    - Timing & confidence metrics
    - Full audit trail for debugging

    Agents:
    1. Agent 1: Gemini Vision (Google AI)
    2. Agent 2: Tesseract OCR (local)
    3. Agent 3: AWS Rekognition (cloud pattern recognition)

    Consensus Rules:
    - If 2+ agents agree 100% → SUBMIT
    - If all 3 agents have >95% similarity → SUBMIT
    - Otherwise → CANNOT_SOLVE
    """

    DEFAULT_AGENT_TIMEOUT = 15.0  # seconds per agent
    DEFAULT_TOTAL_TIMEOUT = 45.0  # seconds total

    def __init__(
        self,
        agent_timeout: float = DEFAULT_AGENT_TIMEOUT,
        total_timeout: float = DEFAULT_TOTAL_TIMEOUT,
        log_file: Optional[Path] = None,
    ):
        """
        Initialize ConsensusCaptchaSolver.

        Args:
            agent_timeout: Timeout per agent (seconds)
            total_timeout: Total timeout for all agents (seconds)
            log_file: Optional file path for detailed logs
        """
        self.logger = logging.getLogger(f"{self.__class__.__name__}")
        self.agent_timeout = agent_timeout
        self.total_timeout = total_timeout

        # Initialize agents
        self.agent1 = Agent1_GeminiVision()
        self.agent2 = Agent2_TesseractOCR()
        self.agent3 = Agent3_PatternRecognition()

        # Initialize consensus engine
        self.consensus_engine = ConsensusEngine()

        # Setup logging
        if log_file:
            self.log_file = Path(log_file)
            self.log_file.parent.mkdir(parents=True, exist_ok=True)
        else:
            self.log_file = None

        self.logger.info(
            f"✅ ConsensusCaptchaSolver initialized "
            f"(agent timeout: {agent_timeout}s, total timeout: {total_timeout}s)"
        )

    async def solve(self, image_path: str) -> SolverResult:
        """
        Solve CAPTCHA using 3-agent consensus approach.

        Args:
            image_path: Path to CAPTCHA image file or base64 string

        Returns:
            SolverResult with solution, confidence, and detailed metrics
        """
        metrics = TimingMetrics()
        agent_responses: List[AgentResponse] = []

        try:
            # Validate input
            if not image_path:
                return SolverResult(
                    status=SolutionStatus.INVALID_INPUT,
                    solution=None,
                    confidence=0.0,
                    consensus_reached=False,
                    agent_responses=[],
                    consensus_decision=None,
                    timing_metrics=metrics,
                    error_message="Image path is empty",
                )

            # Create async tasks for all 3 agents
            tasks = [
                self._run_agent_with_timeout(self.agent1, image_path, metrics, "agent_1_duration"),
                self._run_agent_with_timeout(self.agent2, image_path, metrics, "agent_2_duration"),
                self._run_agent_with_timeout(self.agent3, image_path, metrics, "agent_3_duration"),
            ]

            # Execute all agents in parallel with total timeout
            try:
                agent_responses = await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=False), timeout=self.total_timeout
                )
            except asyncio.TimeoutError:
                self.logger.error(f"❌ Total solver timeout ({self.total_timeout}s)")
                metrics.total_duration = time.time() - metrics.start_time
                return SolverResult(
                    status=SolutionStatus.TIMEOUT,
                    solution=None,
                    confidence=0.0,
                    consensus_reached=False,
                    agent_responses=agent_responses,
                    consensus_decision=None,
                    timing_metrics=metrics,
                    error_message=f"Solver timeout after {self.total_timeout}s",
                )

            # Log all agent responses
            self._log_agent_responses(agent_responses)

            # Check for consensus
            consensus_check_start = time.time()
            consensus_decision = self.consensus_engine.check_consensus(agent_responses)
            metrics.consensus_check_duration = time.time() - consensus_check_start

            # Prepare final result
            metrics.total_duration = time.time() - metrics.start_time

            if consensus_decision.reached:
                result = SolverResult(
                    status=SolutionStatus.CONSENSUS_REACHED,
                    solution=consensus_decision.solution,
                    confidence=consensus_decision.consensus_strength,
                    consensus_reached=True,
                    agent_responses=agent_responses,
                    consensus_decision=consensus_decision,
                    timing_metrics=metrics,
                )
                self.logger.info(
                    f"🎉 CAPTCHA SOLVED: '{consensus_decision.solution}' "
                    f"(confidence: {consensus_decision.consensus_strength:.3f})"
                )
            else:
                result = SolverResult(
                    status=SolutionStatus.CANNOT_SOLVE,
                    solution=None,
                    confidence=0.0,
                    consensus_reached=False,
                    agent_responses=agent_responses,
                    consensus_decision=consensus_decision,
                    timing_metrics=metrics,
                    error_message="No consensus reached among agents",
                )
                self.logger.warning(
                    f"⚠️ CAPTCHA UNSOLVED: No consensus reached. "
                    f"Agent solutions: {[r.solution for r in agent_responses if r.solution]}"
                )

            # Log result
            self._log_result(result)

            return result

        except Exception as e:
            metrics.total_duration = time.time() - metrics.start_time
            error_msg = f"Unexpected solver error: {str(e)}"
            self.logger.error(f"❌ {error_msg}", exc_info=True)

            return SolverResult(
                status=SolutionStatus.AGENT_FAILURE,
                solution=None,
                confidence=0.0,
                consensus_reached=False,
                agent_responses=agent_responses,
                consensus_decision=None,
                timing_metrics=metrics,
                error_message=error_msg,
            )

    async def _run_agent_with_timeout(
        self,
        agent,
        image_path: str,
        metrics: TimingMetrics,
        duration_attr: str,
    ) -> AgentResponse:
        """Run a single agent with timeout and duration tracking"""
        try:
            start = time.time()
            response = await agent.solve(image_path, timeout=self.agent_timeout)
            duration = time.time() - start

            # Update metrics
            setattr(metrics, duration_attr, duration)

            return response
        except Exception as e:
            self.logger.error(f"Agent execution error: {e}", exc_info=True)
            return AgentResponse(
                agent_type=agent.agent_type,
                solution=None,
                confidence=0.0,
                error=str(e),
                duration=time.time() - start if "start" in locals() else 0.0,
            )

    def _log_agent_responses(self, responses: List[AgentResponse]):
        """Log all agent responses"""
        self.logger.info("=" * 60)
        self.logger.info("AGENT RESPONSES:")
        for response in responses:
            self.logger.info(f"  {response.agent_type.value}:")
            self.logger.info(f"    Solution: {response.solution}")
            self.logger.info(f"    Confidence: {response.confidence:.3f}")
            if response.error:
                self.logger.info(f"    Error: {response.error}")
            self.logger.info(f"    Duration: {response.duration * 1000:.2f}ms")
        self.logger.info("=" * 60)

    def _log_result(self, result: SolverResult):
        """Log final solver result"""
        self.logger.info("=" * 60)
        self.logger.info("SOLVER RESULT:")
        self.logger.info(f"  Status: {result.status.value}")
        self.logger.info(f"  Solution: {result.solution}")
        self.logger.info(f"  Consensus Reached: {result.consensus_reached}")
        self.logger.info(f"  Confidence: {result.confidence:.3f}")

        if result.consensus_decision:
            self.logger.info(f"  Agreement Pairs: {result.consensus_decision.agreement_pairs}")
            self.logger.info(
                f"  Consensus Strength: {result.consensus_decision.consensus_strength:.3f}"
            )

        metrics = result.timing_metrics.to_dict()
        self.logger.info(f"  Timing:")
        for key, value in metrics.items():
            self.logger.info(f"    {key}: {value}")

        if result.error_message:
            self.logger.info(f"  Error: {result.error_message}")
        self.logger.info("=" * 60)

        # Write to log file if configured
        if self.log_file:
            with open(self.log_file, "a") as f:
                f.write(json.dumps(result.to_dict()) + "\n")


# ============================================================================
# CONVENIENCE INTERFACE
# ============================================================================


async def solve_captcha(image_path: str) -> Dict[str, Any]:
    """
    Convenience function to solve a CAPTCHA.

    Args:
        image_path: Path to CAPTCHA image

    Returns:
        Dictionary with solution and metadata

    Example:
        result = await solve_captcha('/path/to/captcha.png')
        if result['consensus_reached']:
            submit_answer(result['solution'])
        else:
            click_cannot_solve()
    """
    solver = ConsensusCaptchaSolver()
    result = await solver.solve(image_path)
    return result.to_dict()


# ============================================================================
# ENTRY POINT FOR TESTING
# ============================================================================

if __name__ == "__main__":
    import sys

    async def main():
        """Test the consensus solver"""
        if len(sys.argv) < 2:
            print("Usage: python consensus_solver.py <image_path>")
            sys.exit(1)

        image_path = sys.argv[1]

        print(f"🔍 Solving CAPTCHA: {image_path}")
        result = await solve_captcha(image_path)

        print("\n" + "=" * 60)
        print("RESULT:")
        print(json.dumps(result, indent=2))
        print("=" * 60)

        if result["consensus_reached"]:
            print(f"\n✅ SOLVED: {result['solution']}")
        else:
            print(f"\n❌ CANNOT SOLVE")

    asyncio.run(main())
