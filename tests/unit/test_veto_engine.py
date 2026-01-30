#!/usr/bin/env python3
"""
Unit Tests for Veto Engine (Multi-AI Consensus)
Best Practices 2026 - SIN-Solver Testing Framework
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, Mock, patch, MagicMock
import sys
from pathlib import Path

sys.path.insert(
    0, str(Path(__file__).parent.parent.parent / "Docker/builders/builder-1.1-captcha-worker")
)

from src.solvers.veto_engine import VetoEngine


class MockSolver:
    """Mock solver for testing"""

    def __init__(self, response="TEST"):
        self.response = response
        self.solve = AsyncMock(return_value=response)
        self.solve_with_context = AsyncMock(return_value=response)
        self.solve_image_grid = AsyncMock(return_value=response)


class MockSteelController:
    """Mock Steel controller for testing"""

    def __init__(self, success=True, solution="screenshot_b64"):
        self.solve_captcha = AsyncMock(
            return_value={
                "success": success,
                "solution": solution,
                "error": None if success else "Browser error",
            }
        )


class TestVetoEngine:
    """Test suite for Veto Engine"""

    @pytest.fixture
    def veto_engine(self):
        with (
            patch("src.solvers.veto_engine.MistralSolver") as mock_mistral,
            patch("src.solvers.veto_engine.QwenSolver") as mock_qwen,
            patch("src.solvers.veto_engine.KimiSolver") as mock_kimi,
            patch("src.solvers.veto_engine.SteelController") as mock_steel,
        ):
            mock_mistral.return_value = MockSolver("ABC123")
            mock_qwen.return_value = MockSolver("ABC123")  # Same response = consensus
            mock_kimi.return_value = MockSolver("ABC123")
            mock_steel.return_value = MockSteelController()

            yield VetoEngine()

    @pytest.mark.asyncio
    async def test_solve_text_captcha_consensus(self, veto_engine):
        """Both solvers agree - consensus reached"""
        result = await veto_engine.solve_text_captcha("fake_base64_image")

        assert result["success"] is True
        assert result["solution"] == "ABC123"
        assert result["solver_used"] == "consensus"
        assert result["confidence"] == 0.95

    @pytest.mark.asyncio
    async def test_solve_text_captcha_disagreement(self, veto_engine):
        """Solvers disagree - Kimi joker called"""
        veto_engine.mistral.solve = AsyncMock(return_value="ABC")
        veto_engine.qwen.solve = AsyncMock(return_value="XYZ")  # Different response

        result = await veto_engine.solve_text_captcha("fake_base64_image")

        assert result["success"] is True
        assert result["solver_used"] == "kimi_joker"
        assert result["confidence"] == 0.85
        # Kimi should have been called
        veto_engine.kimi.solve_with_context.assert_called_once()

    @pytest.mark.asyncio
    async def test_solve_text_captcha_mistral_only(self, veto_engine):
        """Only Mistral succeeds"""
        veto_engine.mistral.solve = AsyncMock(return_value="MISTRAL_ONLY")
        veto_engine.qwen.solve = AsyncMock(return_value=Exception("Qwen failed"))

        result = await veto_engine.solve_text_captcha("fake_base64_image")

        assert result["success"] is True
        assert result["solution"] == "MISTRAL_ONLY"
        assert result["solver_used"] == "mistral"
        assert result["confidence"] == 0.80

    @pytest.mark.asyncio
    async def test_solve_text_captcha_qwen_only(self, veto_engine):
        """Only Qwen succeeds"""
        veto_engine.mistral.solve = AsyncMock(return_value=Exception("Mistral failed"))
        veto_engine.qwen.solve = AsyncMock(return_value="QWEN_ONLY")

        result = await veto_engine.solve_text_captcha("fake_base64_image")

        assert result["success"] is True
        assert result["solution"] == "QWEN_ONLY"
        assert result["solver_used"] == "qwen"
        assert result["confidence"] == 0.80

    @pytest.mark.asyncio
    async def test_solve_text_captcha_all_fail(self, veto_engine):
        """All solvers fail"""
        veto_engine.mistral.solve = AsyncMock(return_value=Exception("Mistral failed"))
        veto_engine.qwen.solve = AsyncMock(return_value=Exception("Qwen failed"))

        result = await veto_engine.solve_text_captcha("fake_base64_image")

        assert result["success"] is False
        assert result["solution"] is None
        assert result["solver_used"] == "none"
        assert result["confidence"] == 0.0

    @pytest.mark.asyncio
    async def test_solve_image_grid(self, veto_engine):
        """Image grid solving uses Mistral"""
        veto_engine.mistral.solve_image_grid = AsyncMock(return_value="grid_result")

        result = await veto_engine.solve_image_grid("image_b64", "Click all cars")

        assert result["success"] is True
        assert result["solution"] == "grid_result"
        assert result["solver_used"] == "mistral_vision"
        assert result["confidence"] == 0.90
        veto_engine.mistral.solve_image_grid.assert_called_once_with("image_b64", "Click all cars")

    @pytest.mark.asyncio
    async def test_solve_with_browser_success(self, veto_engine):
        """Browser-based solving works"""
        veto_engine.steel.solve_captcha = AsyncMock(
            return_value={"success": True, "solution": "captcha_screenshot_b64"}
        )
        veto_engine.mistral.solve = AsyncMock(return_value="BROWSER_RESULT")
        veto_engine.qwen.solve = AsyncMock(return_value="BROWSER_RESULT")

        result = await veto_engine.solve_with_browser("https://example.com/captcha")

        assert result["success"] is True
        assert result["solver_used"].startswith("steel_browser")
        veto_engine.steel.solve_captcha.assert_called_once_with("https://example.com/captcha")

    @pytest.mark.asyncio
    async def test_solve_with_browser_failure(self, veto_engine):
        """Browser failure handled correctly"""
        veto_engine.steel.solve_captcha = AsyncMock(
            return_value={"success": False, "error": "Browser connection failed"}
        )

        result = await veto_engine.solve_with_browser("https://example.com/captcha")

        assert result["success"] is False
        assert "Browser failed" in result["error"]
        assert result["solver_used"] == "steel_browser"

    @pytest.mark.asyncio
    async def test_solve_with_browser_invalid_screenshot(self, veto_engine):
        """Invalid screenshot from browser handled"""
        veto_engine.steel.solve_captcha = AsyncMock(
            return_value={
                "success": True,
                "solution": "",  # Empty screenshot
            }
        )

        result = await veto_engine.solve_with_browser("https://example.com/captcha")

        assert result["success"] is False
        assert "Invalid visual data" in result["error"]


class TestVetoEngineConsensusLogic:
    """Test consensus logic edge cases"""

    @pytest.fixture
    def veto_engine(self):
        with (
            patch("src.solvers.veto_engine.MistralSolver") as mock_mistral,
            patch("src.solvers.veto_engine.QwenSolver") as mock_qwen,
            patch("src.solvers.veto_engine.KimiSolver") as mock_kimi,
            patch("src.solvers.veto_engine.SteelController") as mock_steel,
        ):
            mock_mistral.return_value = MockSolver()
            mock_qwen.return_value = MockSolver()
            mock_kimi.return_value = MockSolver()
            mock_steel.return_value = MockSteelController()

            yield VetoEngine()

    @pytest.mark.asyncio
    async def test_consensus_case_insensitive(self, veto_engine):
        """Consensus works with case differences"""
        veto_engine.mistral.solve = AsyncMock(return_value="ABC123")
        veto_engine.qwen.solve = AsyncMock(return_value="abc123")  # Different case

        result = await veto_engine.solve_text_captcha("fake_image")

        # Should reach consensus (case-insensitive comparison)
        assert result["solver_used"] == "consensus"

    @pytest.mark.asyncio
    async def test_consensus_whitespace_difference(self, veto_engine):
        """Consensus not reached with whitespace differences"""
        veto_engine.mistral.solve = AsyncMock(return_value="ABC123")
        veto_engine.qwen.solve = AsyncMock(return_value="ABC 123")  # Space difference

        result = await veto_engine.solve_text_captcha("fake_image")

        # Should call joker
        assert result["solver_used"] == "kimi_joker"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
