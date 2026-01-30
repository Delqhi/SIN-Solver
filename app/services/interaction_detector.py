#!/usr/bin/env python3
"""
🚀 UNIVERSAL INTERACTION DETECTOR (UID V2) - CEO EMPIRE STATE 2026
==============================================================
SSoT for high-performance detection of ANY interactive gate, form, popup, or blockade.
Parallel Multi-Agent Architecture for millisecond execution.
"""

import logging
import asyncio
import tempfile
import os
import time
import base64
import re
from typing import Dict, Any, Optional, Tuple, List
from playwright.async_api import Page

from app.services.dom_detector import DOMCaptchaDetector
from app.services.network_detector import NetworkCaptchaDetector
from app.services.vision_orchestrator import CaptchaVisionSolver, parse_gemini_response_flexible
from app.services.skyvern_client import SkyvernClient
from app.services.stagehand_client import StagehandClient
from app.services.deception_hunter import get_deception_hunter

logger = logging.getLogger("InteractionDetector")


class UniversalInteractionDetector:
    """
    🚀 ALL-IN-ONE DETECTOR (UID V3) - CEO EMPIRE STATE 2026
    Advanced parallel swarm detector for any web obstacles.
    Uses multi-agent signal fusion (DOM, Network, Vision, Code, Skyvern, Semantic).
    """

    def __init__(self):
        self.dom_agent = DOMCaptchaDetector()
        self.network_agent = NetworkCaptchaDetector()
        self.vision_agent = CaptchaVisionSolver()
        self.skyvern = SkyvernClient()
        self.stagehand = StagehandClient()
        self.deception_hunter = get_deception_hunter()

    async def detect_all(self, page: Page) -> Dict[str, Any]:
        start_time = time.time()
        logger.info("📡 [UID V3] Engaging Massive Parallel Swarm Cluster (All-in-One Mode)...")

        # Optimized Screenshot for Vision Swarm
        try:
            screenshot = await page.screenshot(
                full_page=False, animations="disabled", type="jpeg", quality=85
            )
            screenshot_b64 = base64.b64encode(screenshot).decode()
        except Exception as e:
            logger.error(f"Screenshot failed: {e}")
            screenshot = b""
            screenshot_b64 = ""

        # 🔥 CEO 2026: MASSIVE PARALLEL EXECUTION (14 Streams)
        tasks = [
            self.dom_agent.detect(page),
            self.network_agent.get_detected_providers(),
            self._scan_code_listeners(page),
            self._scan_visual_fragmented(screenshot, screenshot_b64),
            self.deception_hunter.hunt(page),
            self._scan_skyvern_intent(screenshot_b64),
            self._scan_behavioral_entropy(page),
            self._scan_full_page_content(page),
            self._scan_network_logs(page),
            self._scan_accessibility_tree(page),
            self._scan_code_intelligence(page),
            self._scan_structural_anomalies(page),
            self._scan_semantic_intent(screenshot_b64),
            self._scan_interactive_heatmap(page),
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        dom_hits = results[0] if not isinstance(results[0], Exception) else []
        net_hits = results[1] if not isinstance(results[1], Exception) else []
        code_hits = results[2] if not isinstance(results[2], Exception) else []
        vis_hits = results[3] if not isinstance(results[3], Exception) else {}
        dec_hits = results[4] if not isinstance(results[4], Exception) else []
        sky_hits = results[5] if not isinstance(results[5], Exception) else {}
        beh_hits = results[6] if not isinstance(results[6], Exception) else []
        content_hits = results[7] if not isinstance(results[7], Exception) else []
        log_hits = results[8] if not isinstance(results[8], Exception) else []
        acc_hits = results[9] if not isinstance(results[9], Exception) else []
        code_intel = results[10] if not isinstance(results[10], Exception) else {}
        struct_hits = results[11] if not isinstance(results[11], Exception) else []
        semantic_hits = results[12] if not isinstance(results[12], Exception) else {}
        heat_hits = results[13] if not isinstance(results[13], Exception) else []

        duration_ms = int((time.time() - start_time) * 1000)

        report = self._perform_signal_fusion(
            dom_hits,
            net_hits,
            code_hits,
            vis_hits,
            dec_hits,
            sky_hits,
            beh_hits,
            content_hits,
            log_hits,
            acc_hits,
            code_intel,
            struct_hits,
            semantic_hits,
            heat_hits,
        )
        report["total_scan_ms"] = duration_ms
        report["screenshot_b64"] = screenshot_b64

        if report["found"]:
            logger.info(
                f"🚨 [UID V3] {report['primary_type'].upper()} Identified via {report['primary_layer']} in {duration_ms}ms"
            )
            logger.info(f"🎯 Mission: {report['mission_objective']}")

        return report

    async def _scan_semantic_intent(self, screenshot_b64: str) -> Dict[str, Any]:
        """🚀 CEO 2026: Use Vision AI to summarize the 'Intent' and 'Blockade Type'"""
        if not screenshot_b64:
            return {}
        try:
            prompt = """Analyze this screenshot.
            1. What is the main purpose of this page/view? (e.g., login, captcha challenge, cookie consent, product page)
            2. Is there a blockade preventing further access?
            3. Identify the EXACT type of verification required.
            JSON: {"intent": "string", "is_blockade": boolean, "blockade_type": "string", "confidence": 0.0-1.0}"""

            from app.services.mistral_solver import get_mistral_solver

            mistral = await get_mistral_solver()
            res = await mistral.solve_image(screenshot_b64, captcha_type="semantic_intent")

            cleaned = re.search(r"(\{.*?\})", res.solution, re.DOTALL)
            if cleaned:
                return json.loads(cleaned.group(1))
            return {}
        except Exception as e:
            logger.error(f"Semantic Intent Scan failed: {e}")
            return {}

    async def _scan_interactive_heatmap(self, page: Page) -> List[Dict[str, Any]]:
        """Identify dense clusters of interactive elements"""
        try:
            return await page.evaluate("""() => {
                const elements = document.querySelectorAll('button, a, input, select, [role="button"]');
                const hits = [];
                for (const el of elements) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 5 && rect.height > 5) {
                        hits.push({
                            tag: el.tagName,
                            type: el.type || 'none',
                            text: el.innerText.slice(0, 30),
                            box: [rect.top, rect.left, rect.bottom, rect.right]
                        });
                    }
                }
                return hits;
            }""")
        except:
            return []

    async def _scan_code_listeners(self, page: Page) -> List[Dict[str, str]]:
        """🚀 CEO 2026: Identify JS scripts that actively track bot behavior"""
        try:
            return await page.evaluate("""() => {
                const findings = [];
                // Check for Canvas Fingerprinting
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (ctx.toDataURL && ctx.toDataURL.toString().includes('native code') === false) {
                        findings.push({"type": "fingerprinting_hooked", "source": "code"});
                    }
                } catch(e) {}

                // Check for bot detection scripts in DOM content
                const content = document.documentElement.innerHTML.toLowerCase();
                const signatures = {
                    "cloudflare": ["cf-ray", "turnstile", "challenges.cloudflare.com", "_cf_chl_opt"],
                    "recaptcha": ["google.com/recaptcha", "recaptcha.net"],
                    "hcaptcha": ["hcaptcha.com"],
                    "datadome": ["datadome.co", "dd_check", "dd_captcha"],
                    "perimeterx": ["perimeterx.net", "px-challenge", "px.js"],
                    "akamai": ["akamai.com/cp", "akamaized.net", "_abck", "sensor_data"],
                    "bot_check": ["navigator.webdriver", "headless", "fingerprintjs", "automation", "selenium", "playwright"],
                    "kasada": ["k-solutions.io", "ips_id", "ips_sn"]
                };

                for (const [type, sigs] of Object.entries(signatures)) {
                    if (sigs.some(s => content.includes(s))) {
                        findings.push({"type": type, "source": "code_content"});
                    }
                }
                return findings;
            }""")
        except:
            return []

    async def _scan_behavioral_entropy(self, page: Page) -> List[Dict[str, str]]:
        """Detect tracking behavior and decoy honeypots"""
        try:
            return await page.evaluate("""() => {
                const results = [];
                // 1. Detect overlays blocking interaction
                const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
                if (el) {
                    const style = window.getComputedStyle(el);
                    if (parseInt(style.zIndex) > 1000 && (style.position === 'fixed' || style.position === 'absolute')) {
                        results.push({"type": "interaction_overlay", "source": "behavior"});
                    }
                }
                // 2. Detect Honeypot Links (invisible to humans)
                const links = document.querySelectorAll('a');
                for (const a of links) {
                    const s = window.getComputedStyle(a);
                    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.1 || (a.offsetWidth === 0 && a.offsetHeight === 0)) {
                        results.push({"type": "honeypot_trap", "source": "behavior"});
                    }
                }
                return results;
            }""")
        except:
            return []

    async def _scan_visual_fragmented(
        self, screenshot: bytes, screenshot_b64: str
    ) -> Dict[str, Any]:
        if not screenshot:
            return {"detections": [], "screenshot_b64": ""}
        try:
            # 🔥 CEO 2026: MASSIVE VISUAL FRAGMENTATION SWARM
            # Extended Prompts for All-in-One Detection
            prompts = {
                "Blockades": "Identify all CAPTCHAs, Turnstile boxes, verification walls, and robot-checks. JSON: {'ui': [{'type': 'blockade', 'label': 'turnstile|recaptcha|etc', 'box_2d': [y,x,y,x]}]}",
                "Interactions": "Identify login forms, sign-in buttons, search bars, account menus, and cookie consent banners. JSON: {'ui': [{'type': 'interaction', 'label': 'login_form|button|etc', 'box_2d': [y,x,y,x]}]}",
                "CustomGates": "Identify ANY element that is a custom clickbox, a verify button, or an interactive gate that might be a decoy. JSON: {'ui': [{'type': 'custom_gate', 'label': 'description', 'box_2d': [y,x,y,x]}]}",
            }

            # 2. Fragmented Slicing (Quad-Scan)
            from app.services.image_processor import ImageProcessor

            slices = ImageProcessor.slice_image_into_quadrants(screenshot)

            import io
            from PIL import Image as PILImage

            img = PILImage.open(io.BytesIO(screenshot))
            w, h = img.size
            mid_w, mid_h = w // 2, h // 2

            async def solve_task(image_data, prompt, slice_info=None):
                with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                    tmp.write(image_data)
                    path = tmp.name
                try:
                    res = await self.vision_agent.orchestrator.solve_visual_task(path, prompt)
                    sol = (
                        res.get("solution", "")
                        if isinstance(res, dict)
                        else getattr(res, "solution", "")
                    )
                    findings = parse_gemini_response_flexible(str(sol), "ui")

                    if slice_info:
                        offset_x, offset_y = slice_info
                        for f in findings:
                            if "box_2d" in f:
                                b = f["box_2d"]
                                b[0] = int(
                                    b[0] * (mid_h if offset_y else mid_h) / 1000
                                    + (mid_h if offset_y else 0)
                                )
                                b[1] = int(
                                    b[1] * (mid_w if offset_x else mid_w) / 1000
                                    + (mid_w if offset_x else 0)
                                )
                                b[2] = int(
                                    b[2] * (mid_h if offset_y else mid_h) / 1000
                                    + (mid_h if offset_y else 0)
                                )
                                b[3] = int(
                                    b[3] * (mid_w if offset_x else mid_w) / 1000
                                    + (mid_w if offset_x else 0)
                                )
                    return findings
                finally:
                    if os.path.exists(path):
                        os.unlink(path)

            tasks = []
            for name, p in prompts.items():
                tasks.append(solve_task(screenshot, p))

            slice_metadata = [(0, 0), (1, 0), (0, 1), (1, 1)]
            for i, s_data in enumerate(slices):
                tasks.append(
                    solve_task(
                        s_data,
                        "Identify any interactive elements, buttons, or blockers in this sector. JSON: {'ui': [{'type': 'sector_hit', 'label': 'description', 'box_2d': [y,x,y,x]}]}",
                        slice_info=slice_metadata[i],
                    )
                )

            results = await asyncio.gather(*tasks, return_exceptions=True)

            merged = []
            for r in results:
                if isinstance(r, list):
                    merged.extend(r)

            return {"detections": merged}
        except Exception as e:
            logger.error(f"Visual swarm failed: {e}")
            return {"detections": []}

    async def _scan_skyvern_intent(self, screenshot_b64: str) -> Dict[str, Any]:
        if not screenshot_b64:
            return {}
        try:
            return await self.skyvern.analyze_image(
                screenshot_b64, task="Analyze blockade intent and determine strategy for bypass"
            )
        except:
            return {}

    async def _scan_full_page_content(self, page: Page) -> List[Dict[str, str]]:
        try:
            content = await page.content()
            findings = []
            solver_blocker_sigs = [
                "bot_detection",
                "fingerprintjs",
                "perimeterx",
                "datadome",
                "challenge-platform",
                "webdriver",
                "selenium",
                "playwright",
                "automation",
                "headless",
            ]
            for sig in solver_blocker_sigs:
                if sig in content.lower():
                    findings.append(
                        {"type": "solver_blocker_marker", "value": sig, "source": "full_content"}
                    )
            return findings
        except:
            return []

    async def _scan_network_logs(self, page: Page) -> List[Dict[str, Any]]:
        try:
            return await page.evaluate("""() => {
                const results = [];
                const markers = {'__cf_chl_opt': 'cloudflare_challenge', '_cf_chl_ctx': 'cloudflare_context', 'grecaptcha': 'google_recaptcha', 'hcaptcha': 'hcaptcha_present', '__PXL': 'perimeterx_detected', 'dd_check': 'datadome_detected'};
                for (const [key, type] of Object.entries(markers)) {
                    if (window[key]) results.push({type: type, source: 'network_logs'});
                }
                return results;
            }""")
        except:
            return []

    async def _scan_accessibility_tree(self, page: Page) -> List[Dict[str, Any]]:
        try:
            return await page.evaluate("""() => {
                const results = [];
                const roles = ['button', 'checkbox', 'form', 'alert', 'dialog', 'link', 'menuitem', 'tab'];
                const targetPatterns = /captcha|verify|robot|human|challenge|secure|validate|check|submit|login|sign/i;

                for (const role of roles) {
                    const elements = document.querySelectorAll(`[role="${role}"]`);
                    for (const el of elements) {
                        const label = el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || '';
                        const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;

                        if (isVisible && targetPatterns.test(label)) {
                            results.push({
                                type: 'aom_hit',
                                role: role,
                                label: label.slice(0, 50).trim(),
                                source: 'accessibility',
                                confidence: 0.95
                            });
                        }
                    }
                }

                // Scan for labels with specific 'for' attributes
                const labels = document.querySelectorAll('label');
                for (const l of labels) {
                    if (targetPatterns.test(l.innerText)) {
                        results.push({
                            type: 'aom_label_hit',
                            label: l.innerText.slice(0, 50).trim(),
                            source: 'accessibility',
                            confidence: 0.9
                        });
                    }
                }

                return results;
            }""")
        except:
            return []

    async def _scan_code_intelligence(self, page: Page) -> Dict[str, Any]:
        try:
            dom_summary = await page.evaluate("""() => {
                const scripts = Array.from(document.scripts).map(s => s.src || s.innerHTML.slice(0, 200)).join('\\n');
                const forms = Array.from(document.forms).map(f => f.outerHTML.slice(0, 300)).join('\\n');
                const title = document.title;
                return { title, scripts, forms };
            }""")
            prompt = f'Analyze structure: {json.dumps(dom_summary)}. Identify if this is a \'Gate\' (CAPTCHA/Challenge) or \'Standard\' interaction. JSON: {{"type": "gate|standard", "reason": "why", "confidence": 0.0-1.0}}'
            from app.services.mistral_solver import get_mistral_solver

            mistral = await get_mistral_solver()
            res = await mistral.solve_text(prompt)
            if "gate" in res.solution.lower():
                return {
                    "type": "code_intelligence_gate",
                    "confidence": 0.9,
                    "details": res.solution,
                }
            return {}
        except:
            return {}

    async def _scan_structural_anomalies(self, page: Page) -> List[Dict[str, Any]]:
        try:
            return await page.evaluate("""() => {
                const findings = [];
                const iframes = document.querySelectorAll('iframe');
                for (const f of iframes) {
                    if (!f.src && f.contentDocument && f.contentDocument.body.innerHTML.length > 0) {
                        findings.push({type: 'src-less_iframe_anomaly', source: 'structure'});
                    }
                }
                const all = document.querySelectorAll('*');
                let highEntropyCount = 0;
                for (const el of all) {
                    if (el.className && el.className.length > 20 && /[a-z0-9]{20,}/.test(el.className)) highEntropyCount++;
                }
                if (highEntropyCount > 10) findings.push({type: 'obfuscated_dom_anomaly', source: 'structure'});
                return findings;
            }""")
        except:
            return []

    def _perform_signal_fusion(
        self,
        dom,
        net,
        code,
        vis,
        dec,
        sky,
        beh,
        content_hits=[],
        log_hits=[],
        acc_hits=[],
        code_intel={},
        struct_hits=[],
        semantic_hits={},
        heat_hits=[],
    ) -> Dict[str, Any]:
        observations = []
        screenshot_b64 = vis.get("screenshot_b64", "")

        if semantic_hits.get("intent"):
            observations.append(
                {
                    "type": f"semantic_{semantic_hits['intent']}",
                    "layer": "semantic",
                    "confidence": semantic_hits.get("confidence", 0.95),
                    "is_blockade": semantic_hits.get("is_blockade", False),
                    "details": semantic_hits,
                }
            )

        if code_intel.get("type"):
            observations.append(
                {
                    "type": code_intel["type"],
                    "layer": "ai_intelligence",
                    "confidence": code_intel.get("confidence", 0.85),
                    "details": code_intel,
                }
            )

        for sh in struct_hits:
            observations.append(
                {"type": sh["type"], "layer": "structure", "confidence": 0.88, "details": sh}
            )
        for lh in log_hits:
            observations.append(
                {"type": lh["type"], "layer": "logs", "confidence": 0.98, "details": lh}
            )
        for ah in acc_hits:
            observations.append(
                {
                    "type": ah["type"],
                    "layer": "accessibility",
                    "confidence": ah.get("confidence", 0.9),
                    "details": ah,
                }
            )
        for ch in content_hits:
            observations.append(
                {"type": ch["type"], "layer": "content", "confidence": 0.82, "details": ch}
            )

        traps = [d.get("details", {}) for d in dec if d.get("type") == "honeypot"]
        for d in dec:
            observations.append(
                {
                    "type": d.get("type", "deception"),
                    "layer": "deception",
                    "confidence": d.get("confidence", 0.94),
                    "details": d,
                }
            )

        for d_type, el in dom:
            is_trap = False
            if hasattr(el, "id") and any(t.get("id") == el.id for t in traps):
                is_trap = True
            if not is_trap:
                observations.append(
                    {"type": d_type, "layer": "dom", "confidence": 0.96, "element": el}
                )

        for n_type in net:
            observations.append({"type": n_type, "layer": "network", "confidence": 0.99})
        for c in code:
            observations.append({"type": c["type"], "layer": "code", "confidence": 0.92})
        for b in beh:
            observations.append(
                {"type": b.get("type", "behavior"), "layer": "behavior", "confidence": 0.85}
            )

        for v in vis.get("detections", []):
            conf = 0.88 if v.get("type") == "blockade" else 0.75
            observations.append(
                {
                    "type": v.get("type", "unknown"),
                    "layer": "vision",
                    "confidence": conf,
                    "box": v.get("box_2d"),
                    "label": v.get("label"),
                }
            )

        for h in heat_hits:
            observations.append(
                {
                    "type": "interactive_heat",
                    "layer": "heat",
                    "confidence": 0.65,
                    "box": h["box"],
                    "label": h["tag"],
                }
            )

        if sky.get("intent"):
            observations.append({"type": "complex_gate", "layer": "skyvern", "confidence": 0.93})

        if not observations:
            return {"found": False, "primary_type": "none", "screenshot_b64": screenshot_b64}

        observations.sort(key=lambda x: x["confidence"], reverse=True)

        types_seen = {}
        for o in observations:
            t = o["type"]
            types_seen[t] = types_seen.get(t, 0) + 1

        for o in observations:
            if types_seen.get(o["type"], 0) > 1:
                o["confidence"] = min(1.0, o["confidence"] * 1.05)

        observations.sort(key=lambda x: x["confidence"], reverse=True)
        primary = observations[0]

        resolver = "agent_zero"
        pt = str(primary["type"]).lower()

        if any(
            x in pt
            for x in [
                "captcha",
                "cloudflare",
                "hcaptcha",
                "recaptcha",
                "turnstile",
                "aws_waf",
                "datadome",
            ]
        ):
            resolver = "steel_precision"
        elif any(x in pt for x in ["form", "login", "modal", "overlay", "honeypot", "gate"]):
            resolver = "stagehand"
        elif (
            primary["layer"] == "skyvern"
            or primary.get("is_blockade")
            or primary["layer"] == "semantic"
        ):
            resolver = "skyvern" if primary.get("confidence", 0) > 0.9 else "stagehand"
        elif primary["layer"] in ["structure", "ai_intelligence"]:
            resolver = "stagehand"

        return {
            "found": True,
            "primary_type": primary["type"],
            "primary_layer": primary["layer"],
            "recommended_resolver": resolver,
            "all_observations": observations,
            "screenshot_b64": screenshot_b64,
            "traps": traps,
            "mission_objective": f"Bypass {primary['type']} blockade using {resolver}",
            "intent": semantic_hits.get("intent", "unknown"),
        }

        # Signal Fusion Resolution
        observations.sort(key=lambda x: x["confidence"], reverse=True)
        primary = observations[0]

        # 🚀 CEO 2026: ROUTING TO MASTER AGENTS
        resolver = "agent_zero"
        pt = str(primary["type"]).lower()
        if any(
            x in pt
            for x in ["captcha", "cloudflare", "hcaptcha", "recaptcha", "turnstile", "turnstile"]
        ):
            resolver = "steel_precision"
        elif any(x in pt for x in ["form", "login", "modal", "overlay", "honeypot", "gate"]):
            resolver = "stagehand"
        elif primary["layer"] == "skyvern":
            resolver = "skyvern"

        # If confidence is high on structural anomalies or code intelligence, default to Stagehand for semantic handling
        if primary["layer"] in ["structure", "ai_intelligence"]:
            resolver = "stagehand"

        return {
            "found": True,
            "primary_type": primary["type"],
            "primary_layer": primary["layer"],
            "recommended_resolver": resolver,
            "all_observations": observations,
            "screenshot_b64": screenshot_b64,
            "traps": traps,
            "mission_objective": f"Bypass {primary['type']} blockade using {resolver}",
        }


_uid_instance = None


async def get_universal_detector() -> UniversalInteractionDetector:
    global _uid_instance
    if _uid_instance is None:
        _uid_instance = UniversalInteractionDetector()
    return _uid_instance
