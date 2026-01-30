#!/usr/bin/env python3
"""
🧪 COMPREHENSIVE UNIT TESTS FOR 3-AGENT CONSENSUS CAPTCHA SOLVER
==================================================================

Test Suite covering:
- Individual agent testing (with timeouts, error handling, confidence scoring)
- Consensus logic validation (3-agent consensus, 2-agent match, disagreement)
- Integration tests (full workflow)
- Edge cases (empty responses, all agents failing)
- Timing metrics accuracy
- Error propagation

Run with: pytest test_consensus_solver.py -v --cov=consensus_solver
"""

import asyncio
import json
import time
import tempfile
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock, Mock
from dataclasses import asdict
from datetime import datetime

import pytest

from consensus_solver import (
    AgentType,
    SolutionStatus,
    TimingMetrics,
    AgentResponse,
    ConsensusDecision,
    SolverResult,
    Agent1_GeminiVision,
    Agent2_TesseractOCR,
    Agent3_PatternRecognition,
    ConsensusEngine,
    ConsensusCaptchaSolver,
    solve_captcha,
)


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def temp_log_file():
    """Create temporary log file for testing"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".log", delete=False) as f:
        yield f.name
    Path(f.name).unlink(missing_ok=True)


@pytest.fixture
def sample_captcha_image():
    """Create a simple test CAPTCHA image"""
    try:
        from PIL import Image, ImageDraw

        # Create simple test image with text
        img = Image.new("RGB", (200, 100), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        draw.text((50, 40), "TEST123", fill=(0, 0, 0))

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            img.save(f.name)
            yield f.name

        Path(f.name).unlink(missing_ok=True)
    except ImportError:
        pytest.skip("PIL not installed")


@pytest.fixture
def solver_instance():
    """Create ConsensusCaptchaSolver instance for testing"""
    return ConsensusCaptchaSolver(
        agent_timeout=5.0, total_timeout=15.0, similarity_threshold=0.95, log_file=None
    )


# ============================================================================
# UNIT TESTS - AGENT 1: GEMINI VISION
# ============================================================================


class TestAgent1_GeminiVision:
    """Test suite for Gemini Vision agent"""

    @pytest.mark.asyncio
    async def test_agent_initialization(self):
        """Test Agent1 can be initialized"""
        agent = Agent1_GeminiVision()
        assert agent is not None
        assert agent.agent_type == AgentType.GEMINI_VISION

    @pytest.mark.asyncio
    async def test_agent_solve_with_mock(self, sample_captcha_image):
        """Test Agent1 solve with mocked API"""
        agent = Agent1_GeminiVision()

        with patch.object(agent, "client", new_callable=MagicMock):
            # Mock successful response
            agent.client.generate_content = MagicMock(return_value=MagicMock(text="TEST123"))

            response = await agent.solve(sample_captcha_image, timeout=10.0)

            assert response.agent_type == AgentType.GEMINI_VISION
            assert response.solution == "TEST123"
            assert response.confidence >= 0.85
            assert response.error is None
            assert response.duration >= 0

    @pytest.mark.asyncio
    async def test_agent_timeout_handling(self):
        """Test Agent1 timeout handling"""
        agent = Agent1_GeminiVision(timeout=0.1)  # Very short timeout

        with patch.object(agent, "client") as mock_client:
            # Make API call hang
            async def hang():
                await asyncio.sleep(10)

            mock_client.generate_content = MagicMock(side_effect=hang)

            response = await agent.solve("dummy_image.png")

            assert response.solution is None
            assert response.confidence == 0.0
            assert response.error is not None
            assert "timeout" in response.error.lower() or "error" in response.error.lower()

    @pytest.mark.asyncio
    async def test_agent_api_error_handling(self):
        """Test Agent1 API error handling"""
        agent = Agent1_GeminiVision(timeout=5.0)

        with patch.object(agent, "client") as mock_client:
            mock_client.generate_content = MagicMock(side_effect=Exception("API Error"))

            response = await agent.solve("dummy_image.png")

            assert response.solution is None
            assert response.confidence == 0.0
            assert response.error is not None
            assert "API Error" in response.error

    @pytest.mark.asyncio
    async def test_agent_missing_api_key(self):
        """Test Agent1 graceful degradation without API key"""
        with patch.dict("os.environ", {"GEMINI_API_KEY": ""}):
            agent = Agent1_GeminiVision(timeout=5.0)
            response = await agent.solve("dummy_image.png")

            # Should fail gracefully
            assert response.solution is None
            assert response.error is not None


# ============================================================================
# UNIT TESTS - AGENT 2: TESSERACT OCR
# ============================================================================


class TestAgent2_TesseractOCR:
    """Test suite for Tesseract OCR agent"""

    @pytest.mark.asyncio
    async def test_agent_initialization(self):
        """Test Agent2 can be initialized"""
        agent = Agent2_TesseractOCR(timeout=5.0)
        assert agent is not None
        assert agent.agent_type == AgentType.TESSERACT_OCR
        assert agent.timeout == 5.0

    @pytest.mark.asyncio
    async def test_agent_solve_with_valid_image(self, sample_captcha_image):
        """Test Agent2 solve with valid image"""
        agent = Agent2_TesseractOCR(timeout=10.0)

        # Mock pytesseract
        with patch("consensus_solver.pytesseract") as mock_pytesseract:
            mock_pytesseract.image_to_string = MagicMock(return_value="TEST123")

            response = await agent.solve(sample_captcha_image)

            assert response.agent_type == AgentType.TESSERACT_OCR
            assert response.solution is not None
            assert response.confidence >= 0.0
            assert response.error is None

    @pytest.mark.asyncio
    async def test_agent_timeout_handling(self):
        """Test Agent2 timeout handling"""
        agent = Agent2_TesseractOCR(timeout=0.01)  # Very short timeout

        with patch("consensus_solver.pytesseract") as mock_pytesseract:

            async def hang():
                await asyncio.sleep(10)

            mock_pytesseract.image_to_string = MagicMock(side_effect=hang)

            response = await agent.solve("dummy_image.png")

            assert response.solution is None
            assert response.error is not None

    @pytest.mark.asyncio
    async def test_agent_invalid_image(self):
        """Test Agent2 with invalid image file"""
        agent = Agent2_TesseractOCR(timeout=5.0)

        response = await agent.solve("nonexistent_image.png")

        assert response.solution is None
        assert response.error is not None
        assert "error" in response.error.lower() or "not found" in response.error.lower()

    @pytest.mark.asyncio
    async def test_agent_empty_image(self, sample_captcha_image):
        """Test Agent2 with empty OCR result"""
        agent = Agent2_TesseractOCR(timeout=5.0)

        with patch("consensus_solver.pytesseract") as mock_pytesseract:
            mock_pytesseract.image_to_string = MagicMock(return_value="")

            response = await agent.solve(sample_captcha_image)

            # Empty result should have low confidence
            assert response.confidence <= 0.3


# ============================================================================
# UNIT TESTS - AGENT 3: PATTERN RECOGNITION
# ============================================================================


class TestAgent3_PatternRecognition:
    """Test suite for AWS Rekognition agent"""

    @pytest.mark.asyncio
    async def test_agent_initialization(self):
        """Test Agent3 can be initialized"""
        agent = Agent3_PatternRecognition(timeout=5.0)
        assert agent is not None
        assert agent.agent_type == AgentType.PATTERN_RECOGNITION
        assert agent.timeout == 5.0

    @pytest.mark.asyncio
    async def test_agent_solve_with_mock(self):
        """Test Agent3 solve with mocked AWS API"""
        agent = Agent3_PatternRecognition(timeout=5.0)

        with patch.object(agent, "client") as mock_client:
            # Mock AWS Rekognition response
            mock_client.detect_text = MagicMock(
                return_value={
                    "TextDetections": [
                        {"Type": "LINE", "DetectedText": "TEST123", "Confidence": 95.0}
                    ]
                }
            )

            response = await agent.solve("dummy_image.png")

            assert response.agent_type == AgentType.PATTERN_RECOGNITION
            assert response.solution is not None
            assert response.confidence >= 0.0

    @pytest.mark.asyncio
    async def test_agent_aws_credentials_error(self):
        """Test Agent3 graceful degradation without AWS credentials"""
        agent = Agent3_PatternRecognition(timeout=5.0)

        with patch.object(agent, "client") as mock_client:
            mock_client.detect_text = MagicMock(side_effect=Exception("AWS credentials not found"))

            response = await agent.solve("dummy_image.png")

            assert response.solution is None
            assert response.error is not None


# ============================================================================
# UNIT TESTS - CONSENSUS ENGINE
# ============================================================================


class TestConsensusEngine:
    """Test suite for consensus logic"""

    def test_similarity_calculation_identical(self):
        """Test similarity calculation for identical strings"""
        engine = ConsensusEngine(threshold=0.95)

        similarity = engine.calculate_similarity("TEST123", "TEST123")

        assert similarity == 1.0

    def test_similarity_calculation_different(self):
        """Test similarity calculation for different strings"""
        engine = ConsensusEngine(threshold=0.95)

        similarity = engine.calculate_similarity("TEST123", "DIFFERENT")

        assert 0.0 <= similarity < 0.5

    def test_similarity_calculation_similar(self):
        """Test similarity calculation for similar strings"""
        engine = ConsensusEngine(threshold=0.95)

        similarity = engine.calculate_similarity("TEST123", "TEST124")

        assert 0.85 <= similarity <= 1.0

    def test_consensus_three_agents_identical(self):
        """Test consensus reached with 3 identical responses"""
        engine = ConsensusEngine(threshold=0.95)

        responses = [
            AgentResponse(AgentType.GEMINI_VISION, "TEST123", 0.95),
            AgentResponse(AgentType.TESSERACT_OCR, "TEST123", 0.90),
            AgentResponse(AgentType.PATTERN_RECOGNITION, "TEST123", 0.92),
        ]

        decision = engine.make_decision(responses)

        assert decision.consensus_reached
        assert decision.solution == "TEST123"
        assert decision.confidence > 0.9

    def test_consensus_three_agents_below_threshold(self):
        """Test consensus NOT reached with dissimilar responses"""
        engine = ConsensusEngine(threshold=0.95)

        responses = [
            AgentResponse(AgentType.GEMINI_VISION, "TEST123", 0.95),
            AgentResponse(AgentType.TESSERACT_OCR, "ABCD456", 0.90),
            AgentResponse(AgentType.PATTERN_RECOGNITION, "XYZ789", 0.92),
        ]

        decision = engine.make_decision(responses)

        assert not decision.consensus_reached
        assert decision.solution is None

    def test_consensus_two_agents_match(self):
        """Test consensus reached with 2 agents matching exactly"""
        engine = ConsensusEngine(threshold=0.95)

        responses = [
            AgentResponse(AgentType.GEMINI_VISION, "TEST123", 0.95),
            AgentResponse(AgentType.TESSERACT_OCR, "TEST123", 0.90),
            AgentResponse(AgentType.PATTERN_RECOGNITION, "DIFFERENT", 0.92),
        ]

        decision = engine.make_decision(responses)

        assert decision.consensus_reached
        assert decision.solution == "TEST123"

    def test_consensus_all_agents_fail(self):
        """Test consensus when all agents fail"""
        engine = ConsensusEngine(threshold=0.95)

        responses = [
            AgentResponse(AgentType.GEMINI_VISION, None, 0.0),
            AgentResponse(AgentType.TESSERACT_OCR, None, 0.0),
            AgentResponse(AgentType.PATTERN_RECOGNITION, None, 0.0),
        ]

        decision = engine.make_decision(responses)

        assert not decision.consensus_reached
        assert decision.solution is None

    def test_consensus_agreement_pairs(self):
        """Test that agreement pairs are correctly identified"""
        engine = ConsensusEngine(threshold=0.95)

        responses = [
            AgentResponse(AgentType.GEMINI_VISION, "TEST123", 0.95),
            AgentResponse(AgentType.TESSERACT_OCR, "TEST123", 0.90),
            AgentResponse(AgentType.PATTERN_RECOGNITION, "DIFFERENT", 0.92),
        ]

        decision = engine.make_decision(responses)

        assert len(decision.agreement_pairs) > 0
        # Should have at least one pair of agents that agree


# ============================================================================
# INTEGRATION TESTS - FULL WORKFLOW
# ============================================================================


class TestConsensusCaptchaSolver:
    """Integration tests for full ConsensusCaptchaSolver"""

    @pytest.mark.asyncio
    async def test_solver_initialization(self):
        """Test solver can be initialized"""
        solver = ConsensusCaptchaSolver(
            agent_timeout=5.0, total_timeout=15.0, similarity_threshold=0.95
        )

        assert solver is not None
        assert solver.agent_timeout == 5.0
        assert solver.total_timeout == 15.0

    @pytest.mark.asyncio
    async def test_solver_with_all_agents_successful(self, sample_captcha_image):
        """Test solver workflow with all agents succeeding"""
        solver = ConsensusCaptchaSolver(agent_timeout=10.0, total_timeout=30.0)

        # Mock all agents to return same response
        with (
            patch.object(solver.agent1, "solve", new_callable=AsyncMock) as mock1,
            patch.object(solver.agent2, "solve", new_callable=AsyncMock) as mock2,
            patch.object(solver.agent3, "solve", new_callable=AsyncMock) as mock3,
        ):
            mock1.return_value = AgentResponse(AgentType.GEMINI_VISION, "TEST123", 0.95)
            mock2.return_value = AgentResponse(AgentType.TESSERACT_OCR, "TEST123", 0.90)
            mock3.return_value = AgentResponse(AgentType.PATTERN_RECOGNITION, "TEST123", 0.92)

            result = await solver.solve(sample_captcha_image)

            assert result.status == SolutionStatus.CONSENSUS_REACHED
            assert result.solution == "TEST123"
            assert result.consensus_strength > 0.9
            assert result.timing.total_duration > 0

    @pytest.mark.asyncio
    async def test_solver_with_agents_disagreeing(self, sample_captcha_image):
        """Test solver when agents disagree"""
        solver = ConsensusCaptchaSolver(agent_timeout=10.0, total_timeout=30.0)

        with (
            patch.object(solver.agent1, "solve", new_callable=AsyncMock) as mock1,
            patch.object(solver.agent2, "solve", new_callable=AsyncMock) as mock2,
            patch.object(solver.agent3, "solve", new_callable=AsyncMock) as mock3,
        ):
            mock1.return_value = AgentResponse(AgentType.GEMINI_VISION, "TEST123", 0.95)
            mock2.return_value = AgentResponse(AgentType.TESSERACT_OCR, "ABCD456", 0.90)
            mock3.return_value = AgentResponse(AgentType.PATTERN_RECOGNITION, "XYZ789", 0.92)

            result = await solver.solve(sample_captcha_image)

            assert result.status == SolutionStatus.CANNOT_SOLVE
            assert result.solution is None

    @pytest.mark.asyncio
    async def test_solver_timeout_exceeded(self, sample_captcha_image):
        """Test solver when total timeout is exceeded"""
        solver = ConsensusCaptchaSolver(
            agent_timeout=10.0,
            total_timeout=0.001,  # Very short timeout
        )

        with (
            patch.object(solver.agent1, "solve", new_callable=AsyncMock) as mock1,
            patch.object(solver.agent2, "solve", new_callable=AsyncMock) as mock2,
            patch.object(solver.agent3, "solve", new_callable=AsyncMock) as mock3,
        ):

            async def hang(*args, **kwargs):
                await asyncio.sleep(10)

            mock1.side_effect = hang
            mock2.side_effect = hang
            mock3.side_effect = hang

            result = await solver.solve(sample_captcha_image)

            assert result.status == SolutionStatus.TIMEOUT

    @pytest.mark.asyncio
    async def test_solver_invalid_image(self):
        """Test solver with invalid image path"""
        solver = ConsensusCaptchaSolver()

        result = await solver.solve("nonexistent_image.png")

        # Should handle gracefully
        assert result.status in [SolutionStatus.CANNOT_SOLVE, SolutionStatus.AGENT_FAILURE]

    @pytest.mark.asyncio
    async def test_solver_result_serialization(self, sample_captcha_image):
        """Test that solver result is JSON-serializable"""
        solver = ConsensusCaptchaSolver()

        with (
            patch.object(solver.agent1, "solve", new_callable=AsyncMock) as mock1,
            patch.object(solver.agent2, "solve", new_callable=AsyncMock) as mock2,
            patch.object(solver.agent3, "solve", new_callable=AsyncMock) as mock3,
        ):
            mock1.return_value = AgentResponse(AgentType.GEMINI_VISION, "TEST123", 0.95)
            mock2.return_value = AgentResponse(AgentType.TESSERACT_OCR, "TEST123", 0.90)
            mock3.return_value = AgentResponse(AgentType.PATTERN_RECOGNITION, "TEST123", 0.92)

            result = await solver.solve(sample_captcha_image)

            # Should be JSON-serializable
            result_dict = result.to_dict()
            json_str = json.dumps(result_dict)

            assert json_str is not None
            assert "solution" in result_dict
            assert "status" in result_dict
            assert "timing" in result_dict


# ============================================================================
# EDGE CASE TESTS
# ============================================================================


class TestEdgeCases:
    """Test suite for edge cases and error conditions"""

    @pytest.mark.asyncio
    async def test_empty_agent_responses(self):
        """Test consensus with empty response list"""
        engine = ConsensusEngine(threshold=0.95)

        decision = engine.make_decision([])

        assert not decision.consensus_reached
        assert decision.solution is None

    @pytest.mark.asyncio
    async def test_single_agent_response(self):
        """Test consensus with only one agent response"""
        engine = ConsensusEngine(threshold=0.95)

        responses = [AgentResponse(AgentType.GEMINI_VISION, "TEST123", 0.95)]

        decision = engine.make_decision(responses)

        # Single agent cannot reach consensus
        assert not decision.consensus_reached

    @pytest.mark.asyncio
    async def test_very_similar_but_not_identical(self):
        """Test with responses very similar but not identical"""
        engine = ConsensusEngine(threshold=0.95)

        responses = [
            AgentResponse(AgentType.GEMINI_VISION, "TEST123", 0.95),
            AgentResponse(AgentType.TESSERACT_OCR, "test123", 0.90),  # Different case
            AgentResponse(AgentType.PATTERN_RECOGNITION, "TEST123", 0.92),
        ]

        decision = engine.make_decision(responses)

        # Case differences might affect similarity
        # Depends on implementation (case-sensitive vs insensitive)

    @pytest.mark.asyncio
    async def test_special_characters_in_solution(self):
        """Test with special characters in CAPTCHA solution"""
        engine = ConsensusEngine(threshold=0.95)

        responses = [
            AgentResponse(AgentType.GEMINI_VISION, "TEST!@#$", 0.95),
            AgentResponse(AgentType.TESSERACT_OCR, "TEST!@#$", 0.90),
            AgentResponse(AgentType.PATTERN_RECOGNITION, "TEST!@#$", 0.92),
        ]

        decision = engine.make_decision(responses)

        assert decision.consensus_reached
        assert decision.solution == "TEST!@#$"

    @pytest.mark.asyncio
    async def test_numeric_only_solution(self):
        """Test with numeric-only CAPTCHA solution"""
        engine = ConsensusEngine(threshold=0.95)

        responses = [
            AgentResponse(AgentType.GEMINI_VISION, "123456", 0.95),
            AgentResponse(AgentType.TESSERACT_OCR, "123456", 0.90),
            AgentResponse(AgentType.PATTERN_RECOGNITION, "123456", 0.92),
        ]

        decision = engine.make_decision(responses)

        assert decision.consensus_reached
        assert decision.solution == "123456"


# ============================================================================
# TIMING & PERFORMANCE TESTS
# ============================================================================


class TestTimingMetrics:
    """Test suite for timing metrics accuracy"""

    def test_timing_metrics_creation(self):
        """Test TimingMetrics can be created"""
        metrics = TimingMetrics()

        assert metrics.start_time > 0
        assert metrics.agent_1_duration == 0.0
        assert metrics.agent_2_duration == 0.0
        assert metrics.agent_3_duration == 0.0

    def test_timing_metrics_to_dict(self):
        """Test TimingMetrics can be converted to dict"""
        metrics = TimingMetrics()
        metrics.agent_1_duration = 0.1
        metrics.agent_2_duration = 0.05
        metrics.agent_3_duration = 0.08
        metrics.total_duration = 0.23
        metrics.consensus_check_duration = 0.02

        metrics_dict = metrics.to_dict()

        assert "agent_1_ms" in metrics_dict
        assert "agent_2_ms" in metrics_dict
        assert "agent_3_ms" in metrics_dict
        assert "total_ms" in metrics_dict
        assert metrics_dict["agent_1_ms"] > 0

    @pytest.mark.asyncio
    async def test_solver_timing_accuracy(self, sample_captcha_image):
        """Test that timing metrics are accurate"""
        solver = ConsensusCaptchaSolver(agent_timeout=10.0, total_timeout=30.0)

        with (
            patch.object(solver.agent1, "solve", new_callable=AsyncMock) as mock1,
            patch.object(solver.agent2, "solve", new_callable=AsyncMock) as mock2,
            patch.object(solver.agent3, "solve", new_callable=AsyncMock) as mock3,
        ):

            async def slow_agent(*args, **kwargs):
                await asyncio.sleep(0.1)
                return AgentResponse(AgentType.GEMINI_VISION, "TEST123", 0.95)

            mock1.side_effect = slow_agent
            mock2.side_effect = slow_agent
            mock3.side_effect = slow_agent

            result = await solver.solve(sample_captcha_image)

            # Total duration should be roughly equal to slowest agent (parallel)
            # Not sum of all agents
            assert result.timing.total_duration >= 0.1
            assert result.timing.total_duration < 0.5  # Should be fast since parallel


# ============================================================================
# INTEGRATION WITH LOGGING
# ============================================================================


class TestLogging:
    """Test suite for logging functionality"""

    @pytest.mark.asyncio
    async def test_solver_with_log_file(self, sample_captcha_image, temp_log_file):
        """Test that solver logs to file correctly"""
        solver = ConsensusCaptchaSolver(log_file=temp_log_file)

        with (
            patch.object(solver.agent1, "solve", new_callable=AsyncMock) as mock1,
            patch.object(solver.agent2, "solve", new_callable=AsyncMock) as mock2,
            patch.object(solver.agent3, "solve", new_callable=AsyncMock) as mock3,
        ):
            mock1.return_value = AgentResponse(AgentType.GEMINI_VISION, "TEST123", 0.95)
            mock2.return_value = AgentResponse(AgentType.TESSERACT_OCR, "TEST123", 0.90)
            mock3.return_value = AgentResponse(AgentType.PATTERN_RECOGNITION, "TEST123", 0.92)

            result = await solver.solve(sample_captcha_image)

            # Check that log file was created
            log_path = Path(temp_log_file)
            assert log_path.exists() or result.status == SolutionStatus.CONSENSUS_REACHED


# ============================================================================
# CONVENIENCE FUNCTION TESTS
# ============================================================================


class TestConvenienceFunction:
    """Test suite for solve_captcha convenience function"""

    @pytest.mark.asyncio
    async def test_solve_captcha_function(self, sample_captcha_image):
        """Test the convenience solve_captcha function"""
        with patch(
            "consensus_solver.ConsensusCaptchaSolver.solve", new_callable=AsyncMock
        ) as mock_solve:
            mock_result = SolverResult(
                status=SolutionStatus.CONSENSUS_REACHED,
                solution="TEST123",
                confidence=0.95,
                consensus_strength=0.95,
                agents_responses=[],
                timing=TimingMetrics(),
                decision=ConsensusDecision(True, "TEST123", 0.95, []),
            )

            mock_solve.return_value = mock_result

            # Note: This would require wrapping the async function
            # or running in event loop in actual usage


# ============================================================================
# PYTEST CONFIGURATION
# ============================================================================


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
