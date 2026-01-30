"""
Advanced CAPTCHA Solver for Complex Interactive Puzzles
Handles Click-Order, Slider, and Rotate CAPTCHAs using Vision AI
"""

import logging
import base64
import json
import re
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from app.services.vision_orchestrator import VisionOrchestrator

logger = logging.getLogger("AdvancedSolver")


class AdvancedSolver:
    """
    High-performance solver for complex CAPTCHAs.
    Uses Gemini 3 Pro and Mistral Vision via VisionOrchestrator.
    """

    def __init__(self):
        self.vision = VisionOrchestrator()

    async def solve_click_order(
        self, image_bytes: bytes, instruction: str
    ) -> List[Dict[str, float]]:
        """
        Identify characters/symbols to click in order.
        Returns: List of coordinates [{'x': float, 'y': float}, ...]
        """
        image_b64 = base64.b64encode(image_bytes).decode()

        prompt = f"""
        This is a click-in-order CAPTCHA.
        Instruction: {instruction}

        Task: Identify all clickable elements (letters, numbers, icons) mentioned in the instruction.
        Return their approximate CENTER positions in order.

        Return coordinates as percentages of image size (0-100).

        Output JSON only:
        {{"order": ["A", "B", "C"], "coordinates": [[x1, y1], [x2, y2], [x3, y3]]}}
        """

        # Save temp image for VisionOrchestrator which expects path
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        try:
            # Use Gemini (Primary) for precise coordinates
            result = await self.vision.solve_visual_task(tmp_path, prompt)
            solution = result.get("solution", "")

            # Parse JSON
            from app.services.vision_orchestrator import repair_json_string

            cleaned = repair_json_string(solution)
            json_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if not json_match:
                logger.error("Failed to parse click-order coordinates from AI response")
                return []

            data = json.loads(json_match.group())
            coords = data.get("coordinates", [])

            return [{"x": c[0], "y": c[1]} for c in coords]
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    async def solve_slider(self, image_bytes: bytes) -> float:
        """
        Calculate the required slider X-offset.
        Returns: X-offset as percentage (0-100) or absolute pixel value if possible.
        """
        image_b64 = base64.b64encode(image_bytes).decode()

        prompt = """
        This is a slider puzzle CAPTCHA.
        1. Find the puzzle piece (usually on the left).
        2. Find the target gap (missing area) it fits into.
        3. Calculate the HORIZONTAL distance (offset) from the piece to the gap.

        Return the offset as a percentage of the total image width.

        IMPORTANT: Return a VALID JSON object.
        Example: {"offset_percentage": 45.2, "reasoning": "Piece is at 10%, gap is at 55.2%"}

        If you cannot find it, return 0.0.
        """

        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        try:
            result = await self.vision.solve_visual_task(tmp_path, prompt)
            solution = result.get("solution", "")

            json_match = re.search(r"\{.*\}", solution, re.DOTALL)
            if not json_match:
                return 0.0

            data = json.loads(json_match.group())
            return float(data.get("offset_percentage", 0.0))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    async def solve_rotate(self, image_bytes: bytes) -> float:
        """
        Determine the rotation angle to make the image upright.
        Returns: Angle in degrees.
        """
        prompt = """
        This image is rotated. Determine the rotation angle (0-360 degrees) required to make the object in the image appear upright and correctly oriented.

        IMPORTANT: Return a VALID JSON object.
        Example: {"angle": 180}

        If you cannot determine it, return 0.0.
        """

        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        try:
            result = await self.vision.solve_visual_task(tmp_path, prompt)
            solution = result.get("solution", "")

            from app.services.vision_orchestrator import repair_json_string

            cleaned = repair_json_string(solution)
            logger.info(f"DEBUG: Cleaned AI response: {cleaned}")
            json_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if not json_match:
                # Regex Fallback for offset_percentage
                offset_match = re.search(
                    r'offset_percentage["\']?\s*[:=]\s*(\d+\.?\d*)', cleaned, re.IGNORECASE
                )
                if offset_match:
                    return float(offset_match.group(1))
                # Regex Fallback for angle
                angle_match = re.search(r'angle["\']?\s*[:=]\s*(\d+\.?\d*)', cleaned, re.IGNORECASE)
                if angle_match:
                    return float(angle_match.group(1))
                return 0.0

            data = json.loads(json_match.group())
            return float(data.get("angle", 0.0))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)


# Singleton
_advanced_solver = None


def get_advanced_solver() -> AdvancedSolver:
    global _advanced_solver
    if _advanced_solver is None:
        _advanced_solver = AdvancedSolver()
    return _advanced_solver
