import sys
from unittest.mock import MagicMock, AsyncMock

# Mock problematic dependencies before importing source modules
sys.modules["ddddocr"] = MagicMock()
sys.modules["ultralytics"] = MagicMock()
sys.modules["whisper"] = MagicMock()
sys.modules["stable-ts"] = MagicMock()
sys.modules["cv2"] = MagicMock()
sys.modules["pydub"] = MagicMock()
sys.modules["librosa"] = MagicMock()
sys.modules["soundfile"] = MagicMock()

import pytest
import base64
import json
import io
import os
from unittest.mock import patch
from typing import Dict, Any, List
from PIL import Image

from src.solvers.browser_automation_solver import (
    BrowserAutomationSolver,
    ElementDetector,
    LLMPlanner,
    BrowserController,
    Element,
    Action,
    ActionType,
    BrowserState,
)


@pytest.fixture
def mock_screenshot():
    # Create a larger valid JPEG (800x600) for proper element detection
    img = Image.new("RGB", (800, 600), color="red")
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode()


@pytest.fixture
def element_detector():
    return ElementDetector()


@pytest.fixture
def llm_planner():
    return LLMPlanner(api_key="test_key")


@pytest.fixture
def browser_controller():
    return BrowserController()


@pytest.mark.asyncio
async def test_element_detector(element_detector, mock_screenshot):
    # Force fallback to mock detection by setting model to None
    element_detector.model = None
    elements = element_detector.detect_elements(mock_screenshot)
    assert isinstance(elements, list)
    assert len(elements) > 0
    assert isinstance(elements[0], Element)


@pytest.mark.asyncio
async def test_find_captcha_elements(element_detector, mock_screenshot):
    with patch.object(ElementDetector, "detect_elements") as mock_detect:
        mock_detect.return_value = [
            Element(id="e1", type="button", x=10, y=10, width=50, height=20, text="Click here"),
            Element(
                id="e2",
                type="checkbox",
                x=100,
                y=100,
                width=20,
                height=20,
                text="I am not a robot recaptcha",
            ),
        ]
        captcha_elements = element_detector.find_captcha_elements(mock_screenshot)
        assert len(captcha_elements) == 1
        assert "recaptcha" in captcha_elements[0].text.lower()


@pytest.mark.asyncio
async def test_llm_planner_parsing(llm_planner):
    state = BrowserState(url="http://test.com", title="Test", elements=[])
    mock_json_response = json.dumps(
        [
            {"type": "click", "target": "e1", "reason": "test click"},
            {"type": "wait", "duration": 2.5, "reason": "test wait"},
        ]
    )

    with patch.object(LLMPlanner, "_call_gemini_vision", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = mock_json_response
        actions = await llm_planner.plan_actions("goal", state)

        assert len(actions) == 2
        assert actions[0].type == ActionType.CLICK
        assert actions[1].type == ActionType.WAIT


@pytest.mark.asyncio
async def test_browser_controller_connect(browser_controller):
    # Mock httpx response
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = MagicMock(
            status_code=201, json=lambda: {"sessionId": "test_session"}
        )
        success = await browser_controller.connect()
        assert success
        assert browser_controller.session_id == "test_session"


@pytest.mark.asyncio
async def test_browser_automation_solver_full_flow(mock_screenshot):
    solver = BrowserAutomationSolver()

    # Create valid image bytes for mock state
    img = Image.new("RGB", (100, 100), color="green")
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    valid_image_bytes = buffered.getvalue()

    with (
        patch.object(BrowserController, "connect", new_callable=AsyncMock) as mock_conn,
        patch.object(BrowserController, "get_state", new_callable=AsyncMock) as mock_state,
        patch.object(LLMPlanner, "plan_actions", new_callable=AsyncMock) as mock_plan,
        patch.object(BrowserController, "execute_action", new_callable=AsyncMock) as mock_exec,
    ):
        mock_conn.return_value = True
        mock_state.return_value = BrowserState(
            url="test.com", title="test", elements=[], screenshot=valid_image_bytes
        )
        mock_plan.return_value = [Action(type=ActionType.CLICK, target="e1")]
        mock_exec.return_value = {"success": True, "solution": "done"}

        result = await solver.solve_captcha("http://test.com", "recaptcha")

        assert result["success"]
        assert result["solver"] == "browser_automation"


@pytest.mark.asyncio
async def test_solve_with_vision(mock_screenshot):
    solver = BrowserAutomationSolver()

    with (
        patch.object(ElementDetector, "find_captcha_elements") as mock_find,
        patch.object(LLMPlanner, "plan_actions", new_callable=AsyncMock) as mock_plan,
    ):
        mock_find.return_value = [
            Element(id="e1", type="widget", x=50, y=50, width=100, height=100)
        ]
        mock_plan.return_value = [Action(type=ActionType.CLICK, target="e1")]

        result = await solver.solve_with_vision(mock_screenshot, "solve the puzzle")

        assert result["success"]
        assert result["solver"] == "vision_only"
