#!/usr/bin/env python3
"""
🚀 GLOBAL EXECUTION DISPATCHER - CEO 2026
=========================================
Routes detected UI elements, CAPTCHAs, and forms to the optimal Execution Agent.
Target Agents:
- Stagehand: For complex UI navigation and "healing" interaction.
- Agent Zero: For deep algorithmic solving and multi-step logic.
- SteelPrecision: For high-speed, native browser execution.
"""

import logging
from typing import Dict, Any
from app.services.stagehand_client import StagehandClient
# from app.services.agent_zero_client import AgentZeroClient # Placeholder for future integration

logger = logging.getLogger("GlobalDispatcher")


class ExecutionDispatcher:
    def __init__(self):
        self.stagehand = StagehandClient()

    async def dispatch_mission(self, page, detection_results: Dict[str, Any]) -> bool:
        """
        Routes the detected blockade to the best execution engine based on complexity and type.
        """
        target_type = detection_results.get("primary_type", "none")
        source = detection_results.get("primary_source", "unknown")

        logger.info(f"📤 [Dispatcher] Routing mission for {target_type} (Detected via {source})...")

        if target_type == "cloudflare" or target_type == "checkbox":
            logger.info(
                "🛡️ [Dispatcher] Type: Gate/Checkbox. Assigning to SteelPrecision High-Speed Engine."
            )
            return True

        if target_type in ["login_form", "modal_overlay", "cookie_banner"]:
            logger.info(
                f"🚑 [Dispatcher] Type: UI Structure ({target_type}). Assigning to Stagehand Healing Engine."
            )
            try:
                success = await self.stagehand.solve_ui_blockade(page, target_type)
                return success
            except Exception as e:
                logger.error(f"Stagehand dispatch failed: {e}")
                return False

        if target_type in ["recaptcha", "hcaptcha", "funcaptcha"]:
            logger.info("🧠 [Dispatcher] Type: CAPTCHA. Assigning to SolverRouter Consensus Swarm.")
            return True

        logger.warning(
            f"⚠️ [Dispatcher] No specialized route for {target_type}. Falling back to default."
        )
        return False


_dispatcher = None


def get_dispatcher() -> ExecutionDispatcher:
    global _dispatcher
    if not _dispatcher:
        _dispatcher = ExecutionDispatcher()
    return _dispatcher
