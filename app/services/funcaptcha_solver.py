#!/usr/bin/env python3
"""
🌀 FUNCAPTCHA ROTATION SOLVER - CEO 2026
========================================
Specialized solver for Arkose Labs "Rotate the animal" challenges.
Uses Vision AI to calculate rotation degrees.
"""

import asyncio
import logging
import math
import random
import re
import tempfile
import base64
import os
from typing import Dict, Any, Tuple

logger = logging.getLogger("FunCaptcha")

class FunCaptchaSolver:
    """
    Solves FunCaptcha Rotation Challenges.
    """
    
    def __init__(self):
        from app.services.vision_orchestrator import CaptchaVisionSolver
        self.vision_solver = CaptchaVisionSolver()

    async def solve_rotation(self, image_b64: str, instruction: str = "make the animal stand up") -> float:
        """
        Returns the rotation angle (0-360) required.
        """
        logger.info(f"🌀 [FunCaptcha] Analyzing rotation for: {instruction}")
        
        prompt = f"""Du bist ein Orientierungs-Experte.
Aufgabe: {instruction}.
Wie viele Grad im Uhrzeigersinn muss das Bild gedreht werden, um die Aufgabe zu lösen?
Schätze den Winkel (0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330).
Gib NUR die Zahl zurück."""
        
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            tmp.write(base64.b64decode(image_b64))
            tmp_path = tmp.name

        try:
            result = await self.vision_solver.vision_orchestrator.solve_visual_task(tmp_path, prompt)
            solution = result.get("solution", "0").strip()
            
            match = re.search(r'(\d+)', solution)
            if match:
                angle = float(match.group(1))
                logger.info(f"✅ [FunCaptcha] Predicted Angle: {angle}")
                return angle
            return 0.0
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    async def execute_rotation(self, page, arrow_selector: str, angle: float):
        """
        Interacts with the arrow buttons to rotate the image.
        Arkose usually uses left/right arrows.
        """
        # Arkose standard: each click is 30 or 60 degrees
        # For now assume 30 degrees per click
        clicks = int(angle / 30)
        
        logger.info(f"🖱️ [FunCaptcha] Clicking arrow {clicks} times for {angle} degrees")
        
        arrow = await page.query_selector(arrow_selector)
        if arrow:
            for _ in range(clicks):
                await arrow.click()
                await asyncio.sleep(random.uniform(0.3, 0.7))
            
            # Submit
            submit = await page.query_selector('button:has-text("Submit"), .verify-button')
            if submit:
                await submit.click()
                return True
        return False
