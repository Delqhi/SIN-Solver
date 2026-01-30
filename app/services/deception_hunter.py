#!/usr/bin/env python3
"""
🕵️ DECEPTION HUNTER - CEO 2026
==============================
Detects anti-bot deception techniques like:
1. Honeypots (Hidden fields)
2. Fake Challenges (Deceptive UI)
3. Invisible Gates (Behavioral trackers)
"""

import logging
import asyncio
from typing import List, Dict, Any
from playwright.async_api import Page

logger = logging.getLogger("DeceptionHunter")


class DeceptionHunter:
    async def hunt(self, page: Page) -> List[Dict[str, Any]]:
        findings = []

        # Parallel Deception Hunting
        tasks = [
            self._detect_honeypots(page),
            self._detect_invisible_trackers(page),
            self._detect_fake_challenges(page),
            self._detect_shadow_blockers(page),
            self._detect_behavioral_telemetry_scripts(page),
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                findings.extend(r)

        return findings

    async def _detect_honeypots(self, page: Page) -> List[Dict[str, Any]]:
        honeypots = []
        try:
            script = """
            () => {
                const results = [];
                const inputs = document.querySelectorAll('input, textarea, a, button');
                for (const el of inputs) {
                    const style = window.getComputedStyle(el);
                    const isHidden = style.display === 'none' ||
                                     style.visibility === 'hidden' ||
                                     style.opacity === '0' ||
                                     el.offsetWidth === 0 ||
                                     el.offsetHeight === 0 ||
                                     parseInt(style.left) < -1000 ||
                                     parseInt(style.top) < -1000;

                    const name = (el.name || el.id || el.className || '').toLowerCase();
                    const suspiciousNames = ['email_confirm', 'phone_confirm', 'honeypot', 'website', 'url_confirm', 'trap', 'bot_check'];

                    if (isHidden || suspiciousNames.some(sn => name.includes(sn))) {
                        results.push({
                            name: el.name || el.id,
                            tagName: el.tagName,
                            isHidden: isHidden,
                            reason: isHidden ? "CSS/Geometry Hidden" : "Suspicious Name"
                        });
                    }
                }
                return results;
            }
            """
            detected = await page.evaluate(script)
            for d in detected:
                logger.warning(
                    f"🍯 [Honeypot] Detected potential trap: {d['name']} ({d['reason']})"
                )
                honeypots.append(
                    {
                        "type": "honeypot",
                        "details": d,
                        "confidence": 0.95 if d["isHidden"] else 0.75,
                    }
                )
        except Exception as e:
            logger.error(f"Honeypot detection failed: {e}")

        return honeypots

    async def _detect_fake_challenges(self, page: Page) -> List[Dict[str, Any]]:
        """Detects UI elements that pretend to be CAPTCHAs but are decoy traps"""
        try:
            return await page.evaluate("""() => {
                const results = [];
                const buttons = document.querySelectorAll('button, div[role="button"], span');
                for (const b of buttons) {
                    const text = (b.innerText || '').toLowerCase();
                    const isFake = text.includes('i am not a robot') || text.includes('verify you are human');
                    // If it's not in an iframe but looks like a CAPTCHA, it might be a custom trap or a Cloudflare Turnstile clone
                    if (isFake && !window.location.host.includes('google.com') && !window.location.host.includes('hcaptcha.com')) {
                        results.push({type: 'potential_decoy_challenge', label: text, source: 'deception'});
                    }
                }
                return results;
            }""")
        except:
            return []

    async def _detect_shadow_blockers(self, page: Page) -> List[Dict[str, Any]]:
        try:
            return await page.evaluate("""() => {
                const results = [];
                const findInShadow = (root) => {
                    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
                    let node = walker.nextNode();
                    while (node) {
                        if (node.shadowRoot) {
                            const content = node.shadowRoot.innerHTML.toLowerCase();
                            if (/captcha|challenge|turnstile|verify|human|check/i.test(content)) {
                                results.push({
                                    type: 'shadow_blocker',
                                    tag: node.tagName,
                                    id: node.id,
                                    source: 'deception_recursive'
                                });
                            }
                            findInShadow(node.shadowRoot);
                        }
                        node = walker.nextNode();
                    }
                };
                findInShadow(document.body);
                return results;
            }""")
        except:
            return []

    async def _detect_invisible_trackers(self, page: Page) -> List[Dict[str, Any]]:
        trackers = []
        try:
            script = """
            () => {
                const results = [];
                const imgs = document.querySelectorAll('img, iframe, div');
                for (const el of imgs) {
                    const rect = el.getBoundingClientRect();
                    const isPixel = (rect.width <= 1 && rect.height <= 1) && (el.src || el.style.backgroundImage);
                    if (isPixel) {
                        results.push({
                            src: el.src || 'inline_style',
                            type: "Invisible Tracker",
                            tag: el.tagName
                        });
                    }
                }

                const trackerGlobals = ['_cf_chl_opt', '_phantom', '__webdriver_evaluate', '__selenium_evaluate'];
                for (const g of trackerGlobals) {
                    if (window[g]) results.push({type: "Tracker Global", value: g});
                }

                return results;
            }
            """
            detected = await page.evaluate(script)
            for d in detected:
                logger.info(
                    f"🕵️ [Tracker] Detected invisible signal: {d.get('src') or d.get('value')}"
                )
                trackers.append({"type": "tracker", "details": d, "confidence": 0.85})
        except Exception as e:
            logger.error(f"Tracker detection failed: {e}")

        return trackers


_hunter = None


def get_deception_hunter() -> DeceptionHunter:
    global _hunter
    if not _hunter:
        _hunter = DeceptionHunter()
    return _hunter
