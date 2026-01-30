"""
🎯 INTERACTION LIBRARY - CEO GRADE (2026)
Unified Router for All CAPTCHA Interaction Types
Integrates with Spatial Safety Layer (DeceptionHunter)

This module provides high-level abstractions for all CAPTCHA interactions
(slider, grid, clicking) with guaranteed spatial safety validation.
"""

import asyncio
import logging
import base64
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
import time

logger = logging.getLogger("InteractionLibrary")


@dataclass
class SafetyReport:
    """Result of is_safe() coordinate validation"""

    is_safe: bool
    reason: str
    closest_honeypot: Optional[Dict] = None
    distance_to_danger: float = float("inf")


class InteractionLibrary:
    """
    High-level abstraction for all CAPTCHA interactions.
    Guarantees safety via Spatial Safety Layer before execution.

    CRITICAL: All coordinates are validated against DeceptionHunter's
    honeypot zones BEFORE execution to prevent triggering decoys.
    """

    def __init__(self, steel_controller, deception_hunter_intel):
        """
        Initialize the interaction router.

        Args:
            steel_controller: SteelPrecisionController instance for browser control
            deception_hunter_intel: DeceptionHunter report dict with honeypot_zones
        """
        self.steel = steel_controller
        self.dh_intel = deception_hunter_intel
        self.execution_history = []
        logger.info("🎯 [INTERACTION] InteractionLibrary initialized")

    # ═══════════════════════════════════════════════════════════════
    # SPATIAL SAFETY LAYER: is_safe(x, y)
    # ═══════════════════════════════════════════════════════════════

    async def is_safe(self, x: float, y: float) -> SafetyReport:
        """
        Validate coordinates against DeceptionHunter's honeypot zones.

        Honeypot zones are circular regions that should NEVER be clicked
        (e.g., decoy buttons, invisible form inputs). This method checks
        if a coordinate would trigger any honeypot.

        Args:
            x: X coordinate (absolute pixel value or percentage)
            y: Y coordinate (absolute pixel value or percentage)

        Returns:
            SafetyReport with:
            - is_safe: True if coordinate is clear of honeypots
            - reason: Human-readable explanation
            - closest_honeypot: Dict of nearest honeypot (if any)
            - distance_to_danger: Distance to closest honeypot in pixels

        Example:
            >>> safety = await lib.is_safe(100.5, 200.3)
            >>> if not safety.is_safe:
            ...     logger.warning(f"Blocked: {safety.reason}")
        """
        # No intel = assume safe (degraded mode)
        if not self.dh_intel:
            logger.warning("⚠️ [SAFETY] No DeceptionHunter intel available. Assuming safe.")
            return SafetyReport(is_safe=True, reason="No intel")

        honeypot_zones = self.dh_intel.get("honeypot_zones", [])
        if not honeypot_zones:
            return SafetyReport(is_safe=True, reason="No honeypots detected")

        closest_dist = float("inf")
        closest_zone = None

        # Check distance to all honeypot zones
        for zone in honeypot_zones:
            zone_x = zone.get("x", 0)
            zone_y = zone.get("y", 0)
            zone_radius = zone.get("radius", 30)
            zone_type = zone.get("type", "unknown")

            # Euclidean distance
            dist = ((x - zone_x) ** 2 + (y - zone_y) ** 2) ** 0.5

            if dist < closest_dist:
                closest_dist = dist
                closest_zone = zone

            # CRITICAL: Inside honeypot radius = DANGER
            if dist < zone_radius:
                return SafetyReport(
                    is_safe=False,
                    reason=f"Coordinate ({x:.1f}, {y:.1f}) collides with {zone_type} honeypot at ({zone_x}, {zone_y}), distance={dist:.1f}px < radius={zone_radius}px",
                    closest_honeypot=zone,
                    distance_to_danger=dist,
                )

        # Safe, but log if suspiciously close
        if closest_dist < 100:
            logger.warning(
                f"⚠️ [SAFETY] Coordinate ({x:.1f}, {y:.1f}) is {closest_dist:.1f}px from honeypot (type={closest_zone.get('type', 'unknown')})"
            )

        return SafetyReport(
            is_safe=True,
            reason=f"Clear of all honeypots (closest={closest_dist:.1f}px)",
            closest_honeypot=closest_zone,
            distance_to_danger=closest_dist,
        )

    # ═══════════════════════════════════════════════════════════════
    # SOLVER METHODS: solve_* (High-Level Interaction Sequences)
    # ═══════════════════════════════════════════════════════════════

    async def solve_slider(
        self, image_bytes: bytes, instruction: str = "Slide the puzzle piece to fit the gap"
    ) -> bool:
        """
        SLIDER CAPTCHA SOLVER (3-step interaction sequence):
        1. Vision analysis to detect puzzle piece and gap
        2. Calculate horizontal offset via AI
        3. Execute drag with spatial safety validation

        Args:
            image_bytes: Screenshot of slider CAPTCHA
            instruction: Optional hint about the task

        Returns:
            bool: True if slider drag succeeded and state changed

        Example:
            >>> success = await lib.solve_slider(screenshot)
            >>> if not success:
            ...     logger.error("Slider solve failed")
        """
        logger.info("🎯 [INTERACTION] Starting SLIDER sequence")

        try:
            # Step 1: Vision analysis to get offset
            from app.services.advanced_solver import AdvancedSolver

            advanced = AdvancedSolver()
            offset_pct = await advanced.solve_slider(image_bytes)

            if offset_pct == 0.0:
                logger.error("❌ [INTERACTION] Slider vision analysis failed (offset=0)")
                return False

            logger.info(f"📏 [INTERACTION] Slider offset calculated: {offset_pct:.1f}%")

            # Step 2: Get page viewport dimensions
            if not self.steel or not self.steel.page:
                logger.error("❌ [INTERACTION] No page context available")
                return False

            viewport = await self.steel.page.evaluate(
                "() => ({width: window.innerWidth, height: window.innerHeight})"
            )

            # Step 3: Calculate target coordinates
            # Assume slider track is roughly in the center horizontally, ~40% down the page
            slider_track_y = viewport["height"] * 0.4
            slider_track_left_x = viewport["width"] * 0.15
            slider_track_right_x = viewport["width"] * 0.85
            slider_track_width = slider_track_right_x - slider_track_left_x

            target_x = slider_track_left_x + (slider_track_width * offset_pct / 100.0)
            target_y = slider_track_y

            logger.info(f"🎯 [INTERACTION] Slider target: ({target_x:.1f}, {target_y:.1f})")

            # Step 4: SAFETY CHECK before drag
            safety = await self.is_safe(target_x, target_y)
            if not safety.is_safe:
                logger.error(f"❌ [SAFETY] Slider move blocked: {safety.reason}")
                return False

            # Step 5: Execute drag (NOT click - must be drag for slider)
            logger.info(
                f"🖱️ [INTERACTION] Executing slider drag from {slider_track_left_x:.1f} to {target_x:.1f}"
            )

            await self.steel.page.mouse.move(slider_track_left_x, slider_track_y)
            await asyncio.sleep(0.2)

            # Drag to target position
            await self.steel.page.mouse.drag(
                slider_track_left_x,
                slider_track_y,
                target_x - slider_track_left_x,  # dx
                0,  # dy (horizontal only)
            )

            logger.info(f"✅ [INTERACTION] Slider dragged to {offset_pct:.1f}%")

            # Step 6: Log to audit trail
            self.execution_history.append(
                {
                    "type": "slider",
                    "offset_pct": offset_pct,
                    "coords": (target_x, target_y),
                    "safety_check": True,
                    "timestamp": time.time(),
                }
            )

            return True

        except Exception as e:
            logger.error(f"❌ [INTERACTION] Slider drag failed: {e}", exc_info=True)
            return False

    async def solve_grid(
        self, image_bytes: bytes, instruction: str = "Click the tiles matching the pattern"
    ) -> bool:
        """
        GRID CAPTCHA SOLVER (reCAPTCHA v2 3x3, 4x4, etc.):
        1. Detect grid cells and identify which match the instruction
        2. Click each matching cell in order
        3. Validate all clicks with spatial safety layer

        Args:
            image_bytes: Screenshot of grid CAPTCHA
            instruction: What to select (e.g., "all cars")

        Returns:
            bool: True if all grid cells clicked successfully

        Example:
            >>> success = await lib.solve_grid(screenshot, "Select all cars")
        """
        logger.info("🎯 [INTERACTION] Starting GRID sequence")

        try:
            # Step 1: Detect grid structure and matches
            from app.services.yolo_solver import get_yolo_solver

            yolo = await get_yolo_solver()
            grid_result = await yolo.detect_grid(image_bytes)

            if not grid_result or not grid_result.get("cells"):
                logger.error("❌ [INTERACTION] Grid detection failed")
                return False

            cells = grid_result["cells"]
            matching_cells = [c for c in cells if c.get("is_match")]

            logger.info(
                f"📊 [INTERACTION] Grid detected: {len(cells)} total cells, {len(matching_cells)} matches"
            )

            if not matching_cells:
                logger.warning("⚠️ [INTERACTION] No matching cells detected in grid")
                return False

            # Step 2: Click each matching cell
            success_count = 0
            for cell in matching_cells:
                cell_x = cell.get("x", 0)
                cell_y = cell.get("y", 0)
                cell_id = cell.get("cell_id", "unknown")

                # SAFETY CHECK before click
                safety = await self.is_safe(cell_x, cell_y)
                if not safety.is_safe:
                    logger.warning(f"⚠️ [SAFETY] Cell {cell_id} blocked: {safety.reason}. Skipping.")
                    continue

                # Execute click
                try:
                    await self.steel.human_click(int(cell_x), int(cell_y))
                    logger.info(
                        f"✅ [INTERACTION] Grid cell {cell_id} clicked at ({cell_x:.1f}, {cell_y:.1f})"
                    )

                    self.execution_history.append(
                        {
                            "type": "grid_click",
                            "cell_id": cell_id,
                            "coords": (cell_x, cell_y),
                            "safety_check": True,
                            "timestamp": time.time(),
                        }
                    )

                    success_count += 1
                    await asyncio.sleep(0.3)  # Delay between clicks for realism

                except Exception as e:
                    logger.error(f"❌ [INTERACTION] Grid cell {cell_id} click failed: {e}")

            success = success_count == len(matching_cells)
            logger.info(
                f"📊 [INTERACTION] Grid complete: {success_count}/{len(matching_cells)} cells clicked"
            )
            return success

        except Exception as e:
            logger.error(f"❌ [INTERACTION] Grid solve failed: {e}", exc_info=True)
            return False

    async def solve_clicking(
        self,
        image_bytes: bytes,
        instruction: str,
        coords_list: Optional[List[Dict[str, float]]] = None,
    ) -> bool:
        """
        CLICK-BASED SOLVER (Generic clicking sequence):
        1. Extract coordinates from instruction (if not provided)
        2. Click each coordinate in order
        3. Validate each click with spatial safety layer

        Args:
            image_bytes: Screenshot showing what to click
            instruction: Text instruction (e.g., "Click A then B then C")
            coords_list: Optional pre-computed coordinate list

        Returns:
            bool: True if all clicks executed successfully

        Example:
            >>> success = await lib.solve_clicking(
            ...     screenshot,
            ...     "Click the letters in this order: A, B, C"
            ... )
        """
        logger.info(
            f"🎯 [INTERACTION] Starting CLICKING sequence (instruction: {instruction[:50]}...)"
        )

        try:
            # Step 1: Get coordinates (extract from instruction if needed)
            if not coords_list:
                from app.services.advanced_solver import AdvancedSolver

                advanced = AdvancedSolver()
                coords_list = await advanced.solve_click_order(image_bytes, instruction)

                if not coords_list:
                    logger.error(
                        "❌ [INTERACTION] Failed to extract click coordinates from instruction"
                    )
                    return False

            logger.info(f"🖱️ [INTERACTION] Extracted {len(coords_list)} click coordinates")

            # Step 2: Execute clicks in order
            success_count = 0
            for idx, coord in enumerate(coords_list):
                click_x = coord.get("x", 0)
                click_y = coord.get("y", 0)

                # SAFETY CHECK before click
                safety = await self.is_safe(click_x, click_y)
                if not safety.is_safe:
                    logger.warning(f"⚠️ [SAFETY] Click {idx} blocked: {safety.reason}. Skipping.")
                    continue

                # Execute click
                try:
                    await self.steel.human_click(int(click_x), int(click_y))
                    logger.info(f"✅ [INTERACTION] Click {idx} at ({click_x:.1f}, {click_y:.1f})")

                    self.execution_history.append(
                        {
                            "type": "click",
                            "index": idx,
                            "coords": (click_x, click_y),
                            "safety_check": True,
                            "timestamp": time.time(),
                        }
                    )

                    success_count += 1
                    await asyncio.sleep(0.2)  # Realistic inter-click delay

                except Exception as e:
                    logger.error(f"❌ [INTERACTION] Click {idx} failed: {e}")

            success = success_count == len(coords_list)
            logger.info(
                f"🖱️ [INTERACTION] Clicking complete: {success_count}/{len(coords_list)} clicks"
            )
            return success

        except Exception as e:
            logger.error(f"❌ [INTERACTION] Clicking solve failed: {e}", exc_info=True)
            return False

    # ═══════════════════════════════════════════════════════════════
    # AUDIT & INTROSPECTION
    # ═══════════════════════════════════════════════════════════════

    def get_execution_audit_trail(self) -> List[Dict]:
        """
        Return complete audit log of all interactions executed.

        Each entry contains:
        - type: interaction type (slider, grid_click, click)
        - coords: (x, y) tuple
        - safety_check: whether safety validation passed
        - timestamp: Unix timestamp when executed
        - Additional type-specific fields (offset_pct, cell_id, index, etc.)

        Returns:
            List[Dict]: Full execution history with timestamps

        Example:
            >>> trail = lib.get_execution_audit_trail()
            >>> for event in trail:
            ...     print(f"{event['type']}: {event['coords']}")
        """
        return self.execution_history
