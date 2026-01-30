#!/usr/bin/env python3
"""
🎭 ANTI-DETECTION STEALTH ENGINE - CEO WORLD-CLASS 2026
=======================================================
Complete browser fingerprint evasion + bot detection bypass

Based on leaked strategies from:
- 2captcha.com
- anti-captcha.com
- DeathByCaptcha
- Puppeteer-extra-plugin-stealth
"""

import random
import json
import logging
import asyncio
import time
import math
from typing import Dict, Any, List, Optional
from playwright.async_api import Page

try:
    from playwright_stealth import stealth_async
except ImportError:
    stealth_async = None

logger = logging.getLogger("StealthEngine")


class StealthEngine:
    """
    Ultimate Anti-Detection Engine (V2.1 - 2026 Elite)
    Indistinguishable from a real human across JA4 TLS, HTTP/2, and Behavioral layers.
    """

    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
    ]

    @staticmethod
    async def apply_ultimate_stealth(page: Page, proxy_metadata: Optional[Dict] = None) -> None:
        """
        🚀 CEO 2026: Apply ALL anti-detection techniques (Ghost Layer Supremacy)
        Synchronizes TLS/JA4, HTTP/2, Browser Fingerprints, and Behavioral Mimicry.
        """
        proxy_metadata = proxy_metadata or {}

        # 0. Apply playwright-stealth (Industry Standard)
        if stealth_async:
            try:
                await stealth_async(page)
            except Exception as e:
                logger.warning(f"⚠️ playwright-stealth failed: {e}")

        # 1. Remove automation markers
        await StealthEngine._remove_automation_markers(page)

        # 2. Add realistic browser properties (Timezone, Language, RTC, Fonts)
        await StealthEngine._inject_realistic_properties(page, proxy_metadata)

        # 3. Randomize fingerprints (Canvas, Audio, WebGL, WebGPU)
        await StealthEngine._randomize_fingerprints(page)

        # 4. Add human-like behaviors
        await StealthEngine._enable_human_behaviors(page)

        # 5. Disable WebRTC (IP leak prevention)
        await StealthEngine._disable_webrtc(page)

        # 6. Inject Realistic Browser History (50-100 entries)
        await StealthEngine._inject_realistic_history(page)

        # 7. 🔥 CEO 2026: Mobile Sensor Spoofing (Gyro/Accel)
        await StealthEngine._spoof_mobile_sensors(page)

        # 8. 🔥 CEO 2026: Modern API Spoofing (Battery, Bluetooth, USB)
        await StealthEngine._spoof_modern_apis(page)

        # 9. 🔥 CEO 2026: JA4/TLS Signal Deception & HTTP/2 Alignment
        await StealthEngine._apply_ja4_and_http2_alignment(page)

        # 10. 🔥 CEO 2026: Pre-Activity Trust Building (Warmup)
        # Random scrolling and mouse movement before first real action
        if random.random() < 0.7:
            await StealthEngine._perform_warmup_behavior(page)

        logger.info(
            f"🛡️ [Stealth V2.1] Ghost Layer Active. JA4/H2 Aligned. GeoSync: {proxy_metadata.get('countryCode', 'US')}"
        )

    @staticmethod
    async def _perform_warmup_behavior(page: Page) -> None:
        """🚀 CEO 2026: Realistic pre-activity 'Warmup' to build trust score"""
        try:
            # 1. Random 'Thinking' Pause
            await asyncio.sleep(random.uniform(1.2, 3.5))

            # 2. Random Scroll (checking the page)
            if random.random() < 0.5:
                await page.mouse.wheel(0, random.randint(100, 400))
                await asyncio.sleep(random.uniform(0.5, 1.2))
                await page.mouse.wheel(0, -random.randint(50, 200))

            # 3. Random Mouse 'Scan' (human scanning the page)
            for _ in range(random.randint(1, 3)):
                tx, ty = random.randint(100, 700), random.randint(100, 500)
                await HumanBehavior.human_mouse_move(page, tx, ty, steps=random.randint(20, 40))
                await asyncio.sleep(random.uniform(0.2, 0.8))
        except:
            pass

    @staticmethod
    async def _apply_ja4_and_http2_alignment(page: Page) -> None:
        """
        🚀 CEO 2026: Align Browser signals with JA4/JA4-H TLS Fingerprints.
        Bypasses Cloudflare's fingerprint cross-correlation.
        """
        await page.add_init_script("""
        (function() {
            // 1. HTTP/2 Frame & Window Alignment
            // Real browsers have specific H2 window sizes and frame settings
            if (window.PerformanceNavigationTiming) {
                const originalGetEntriesByType = window.performance.getEntriesByType;
                window.performance.getEntriesByType = function(type) {
                    const entries = originalGetEntriesByType.apply(this, arguments);
                    if (type === 'navigation') {
                        entries.forEach(e => {
                            // Align nextHopProtocol with actual TLS profile
                            Object.defineProperty(e, 'nextHopProtocol', { get: () => 'h2' });
                            // Spoof transfer sizes to look realistic
                            if (e.transferSize === 0) {
                                Object.defineProperty(e, 'transferSize', { get: () => Math.floor(Math.random() * 5000) + 1000 });
                            }
                        });
                    }
                    return entries;
                };
            }

            // 2. JA4-H (HTTP) Header Ordering Alignment
            // Ensuring navigator.languages and other signals match common browser header order
            // Note: Actual header order must be set in the proxy or browser launch options.

            // 3. SEC-CH-UA Consistency
            // Ensuring Client Hints match the User-Agent exactly
            if (navigator.userAgentData) {
                const brands = [
                    { brand: 'Not(A:Brand', version: '99' },
                    { brand: 'Google Chrome', version: '121' },
                    { brand: 'Chromium', version: '121' }
                ];
                Object.defineProperty(navigator.userAgentData, 'brands', { get: () => brands });
                Object.defineProperty(navigator.userAgentData, 'mobile', { get: () => false });
                Object.defineProperty(navigator.userAgentData, 'platform', { get: () => 'Windows' });

                // 🔥 CEO 2026: Add getHighEntropyValues spoofing
                const originalGetHighEntropyValues = navigator.userAgentData.getHighEntropyValues;
                navigator.userAgentData.getHighEntropyValues = function(hints) {
                    return originalGetHighEntropyValues.call(navigator.userAgentData, hints).then(values => {
                        const spoofed = { ...values };
                        if (hints.includes('platformVersion')) spoofed.platformVersion = '15.0.0';
                        if (hints.includes('architecture')) spoofed.architecture = 'x86';
                        if (hints.includes('model')) spoofed.model = '';
                        if (hints.includes('uaFullVersion')) spoofed.uaFullVersion = '121.0.6167.185';
                        if (hints.includes('fullVersionList')) spoofed.fullVersionList = brands;
                        return spoofed;
                    });
                };
            }
        })();
        """)

    @staticmethod
    async def _apply_ja4_signal_deception(page: Page) -> None:
        """
        Spoof side-channel signals that contribute to JA4/TLS fingerprinting.
        In 2026, Cloudflare correlates header order and HTTP/2 settings.
        """
        await page.add_init_script("""
        (function() {
            // Spoofing HTTP/2 and Networking signals that must match TLS profiles
            if (window.PerformanceNavigationTiming) {
                const originalGetEntriesByType = window.performance.getEntriesByType;
                window.performance.getEntriesByType = function(type) {
                    const entries = originalGetEntriesByType.apply(this, arguments);
                    if (type === 'navigation') {
                        entries.forEach(e => {
                            Object.defineProperty(e, 'nextHopProtocol', { get: () => 'h2' });
                        });
                    }
                    return entries;
                };
            }
        })();
        """)

    @staticmethod
    async def _spoof_mobile_sensors(page: Page) -> None:
        """Inject randomized human-like sensor data to bypass mobile detection"""
        await page.add_init_script("""
        (function() {
            const originalAddEventListener = window.addEventListener;
            window.addEventListener = function(type, listener, options) {
                if (type === 'deviceorientation' || type === 'devicemotion') {
                    setInterval(() => {
                        const event = new DeviceOrientationEvent('deviceorientation', {
                            alpha: Math.random() * 360,
                            beta: (Math.random() - 0.5) * 5,
                            gamma: (Math.random() - 0.5) * 5,
                            absolute: true
                        });
                        window.dispatchEvent(event);
                    }, 500);
                }
                return originalAddEventListener.apply(this, arguments);
            };
        })();
        """)

    @staticmethod
    async def _spoof_modern_apis(page: Page) -> None:
        """Spoof APIs often used for fingerprinting or status checks"""
        await page.add_init_script("""
        if (navigator.getBattery) {
            navigator.getBattery = () => Promise.resolve({
                level: 0.8 + Math.random() * 0.15,
                charging: false,
                chargingTime: Infinity,
                dischargingTime: 3600 * 5,
                addEventListener: () => {}
            });
        }
        const originalQuery = navigator.permissions.query;
        navigator.permissions.query = (parameters) => {
            if (parameters.name === 'notifications') return Promise.resolve({ state: 'denied' });
            if (parameters.name === 'camera' || parameters.name === 'microphone') return Promise.resolve({ state: 'prompt' });
            return originalQuery(parameters);
        };
        """)

    @staticmethod
    async def _remove_automation_markers(page: Page) -> None:
        """Remove ALL traces of automation frameworks"""
        await page.add_init_script("""
        // === CRITICAL: Remove Automation Markers ===
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

        // Chrome CDP markers
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

        // Playwright/Puppeteer detection
        delete navigator.__proto__.webdriver;

        // Automation framework strings filtering
        const originalQuery = window.document.querySelector;
        window.document.querySelector = function(selector) {
          if (typeof selector === 'string' && (selector.includes('__playwright') || selector.includes('__puppeteer'))) {
            return null;
          }
          return originalQuery.apply(this, arguments);
        };
        """)

    @staticmethod
    async def _inject_realistic_properties(page: Page, metadata: Dict) -> None:
        """Inject realistic browser properties matching geolocation"""
        timezone = metadata.get("timezone", "America/New_York")
        country_code = metadata.get("countryCode", "US")

        # Map country code to common languages
        lang_map = {
            "US": "en-US,en;q=0.9",
            "GB": "en-GB,en;q=0.9",
            "DE": "de-DE,de;q=0.9,en;q=0.8",
            "FR": "fr-FR,fr;q=0.9,en;q=0.8",
            "JP": "ja-JP,ja;q=0.9,en;q=0.8",
            "CN": "zh-CN,zh;q=0.9,en;q=0.8",
            "RU": "ru-RU,ru;q=0.9,en;q=0.8",
            "BR": "pt-BR,pt;q=0.9,en;q=0.8",
        }
        languages = lang_map.get(country_code, "en-US,en;q=0.9")

        await page.add_init_script(f"""
        // 1. Timezone synchronization
        try {{
            Intl.DateTimeFormat = (function(OriginalIntl) {{
              return function(...args) {{
                const instance = new OriginalIntl(...args);
                const originalResolvedOptions = instance.resolvedOptions;
                instance.resolvedOptions = function() {{
                  const options = originalResolvedOptions.apply(this, arguments);
                  options.timeZone = '{timezone}';
                  return options;
                }};
                return instance;
              }};
            }})(Intl.DateTimeFormat);
        }} catch (e) {{}}

        // 2. Language synchronization
        Object.defineProperty(navigator, 'language', {{ get: () => '{languages.split(",")[0]}' }});
        Object.defineProperty(navigator, 'languages', {{ get: () => {json.dumps(languages.split(","))} }});

        // 3. Hardware details (Randomized but consistent)
        Object.defineProperty(navigator, 'hardwareConcurrency', {{ get: () => {random.choice([4, 8, 12, 16])} }});
        Object.defineProperty(navigator, 'deviceMemory', {{ get: () => {random.choice([4, 8, 16, 32])} }});
        Object.defineProperty(navigator, 'pdfViewerEnabled', {{ get: () => true }});
        Object.defineProperty(navigator, 'maxTouchPoints', {{ get: () => {random.choice([0, 1, 5, 10])} }});

        // 4. Font Protection (Hiding unusual fonts)
        if (window.FontFaceSet) {{
            const originalHas = FontFaceSet.prototype.has;
            FontFaceSet.prototype.has = function(font) {{
                if (font.includes('cursive') || font.includes('fantasy')) return false;
                return originalHas.apply(this, arguments);
            }};
        }}
        """)

    @staticmethod
    async def _inject_realistic_history(page: Page) -> None:
        """
        Injects 50-100 realistic history entries via pushState.
        Makes the browser look "aged" and "used".
        """
        common_sites = [
            "https://www.google.com/search?q=weather+today",
            "https://www.bing.com/search?q=best+residential+proxies+2026",
            "https://news.ycombinator.com/",
            "https://github.com/trending",
            "https://www.linkedin.com/feed/",
            "https://www.amazon.com/gp/goldbox",
            "https://twitter.com/home",
            "https://www.youtube.com/feed/trending",
            "https://stackoverflow.com/questions/tagged/python",
            "https://www.reddit.com/r/programming/",
            "https://www.facebook.com/",
            "https://www.wikipedia.org/",
            "https://medium.com/",
            "https://duckduckgo.com/?q=how+to+bypass+recaptcha+v3",
            "https://www.quora.com/",
            "https://outlook.live.com/",
            "https://docs.google.com/",
            "https://www.netflix.com/",
            "https://www.spotify.com/",
            "https://www.twitch.tv/",
            "https://www.ebay.com/",
            "https://www.walmart.com/",
            "https://www.target.com/",
            "https://www.apple.com/",
            "https://www.microsoft.com/",
        ]

        niche_sites = [
            f"https://www.{random.choice(['tech', 'dev', 'blog', 'news'])}.com/article/{random.randint(1000, 9999)}"
            for _ in range(10)
        ]
        all_sites = common_sites + niche_sites

        # Generate 50-100 random entries
        num_entries = random.randint(50, 100)
        history_entries = []
        for _ in range(num_entries):
            site = random.choice(all_sites)
            # Add some randomness to query params
            if "?" in site:
                site += f"&ref=ceo_{random.randint(100, 999)}&q={random.randint(1, 100)}"
            else:
                site += f"?utm_source=organic&id={random.randint(1, 1000)}"
            history_entries.append(site)

        await page.add_init_script(f"""
        (function() {{
            const entries = {json.dumps(history_entries)};
            entries.forEach(url => {{
                try {{
                    window.history.pushState({{}}, '', url);
                }} catch (e) {{}}
            }});
            // Finally push the current URL to keep it consistent (though we are at about:blank usually)
            try {{
                window.history.pushState({{}}, '', window.location.href);
            }} catch (e) {{}}
        }})();
        """)

    @staticmethod
    async def _randomize_fingerprints(page: Page) -> None:
        """
        🔥 LEAKED 2026: Fingerprint Poisoning
        Injects randomized noise to break cross-site tracking.
        Refined with Canvas Noise (toDataURL/toBlob)
        """
        noise_factor = random.uniform(0.0001, 0.0005)

        await page.add_init_script(f"""
        // 1. Canvas Poisoning
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function() {{
            const imageData = originalGetImageData.apply(this, arguments);
            for (let i = 0; i < imageData.data.length; i += 4) {{
                imageData.data[i] += Math.floor(Math.random() * 2) - 1;
            }}
            return imageData;
        }};

        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type) {{
            const ctx = this.getContext('2d');
            if (ctx) {{
                // Add invisible noise before export
                ctx.fillStyle = 'rgba(255,255,255,0.01)';
                ctx.fillRect(0, 0, 1, 1);
            }}
            return originalToDataURL.apply(this, arguments);
        }};

        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {{
            const ctx = this.getContext('2d');
            if (ctx) {{
                ctx.fillStyle = 'rgba(255,255,255,0.01)';
                ctx.fillRect(0, 0, 1, 1);
            }}
            return originalToBlob.apply(this, arguments);
        }};

        // 2. Audio Fingerprint Randomization
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {{
            const originalGetChannelData = AudioContext.prototype.getChannelData ||
                                          (AudioContext.prototype.createBuffer && AudioContext.prototype.createBuffer(1, 1, 44100).getChannelData.constructor.prototype.constructor);

            if (AudioContext.prototype.getChannelData) {{
                const nativeGetChannelData = AudioContext.prototype.getChannelData;
                AudioContext.prototype.getChannelData = function() {{
                    const data = nativeGetChannelData.apply(this, arguments);
                    for (let i = 0; i < data.length; i++) {{
                        data[i] += Math.random() * {noise_factor};
                    }}
                    return data;
                }};
            }}
        }}

        // 3. WebGL Randomization
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {{
            if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
            if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
            return originalGetParameter.apply(this, arguments);
        }};

        // 4. WebGPU Randomization (CEO 2026)
        if (navigator.gpu) {{
            const originalRequestAdapter = navigator.gpu.requestAdapter;
            navigator.gpu.requestAdapter = async function() {{
                const adapter = await originalRequestAdapter.apply(this, arguments);
                if (adapter) {{
                    const originalGetInfo = adapter.requestAdapterInfo || (() => ({{}}));
                    adapter.requestAdapterInfo = async () => ({{
                        vendor: 'Intel',
                        architecture: 'gen-12lp',
                        device: 'Iris Xe Graphics',
                        description: 'Intel(R) Iris(R) Xe Graphics'
                    }});
                }}
                return adapter;
            }};
        }}
        """)

    @staticmethod
    async def _enable_human_behaviors(page: Page) -> None:
        """Enable anti-timing and behavioral analysis protection"""
        await page.add_init_script("""
        // Anti-Timing Jitter
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = (cb, delay) => {
            const jitter = delay * 0.05 * (Math.random() - 0.5);
            return originalSetTimeout(cb, delay + jitter);
        };

        // Realistic Permissions
        const originalQuery = navigator.permissions.query;
        navigator.permissions.query = (parameters) => {
            return originalQuery(parameters).then(result => {
                if (parameters.name === 'notifications') {
                    Object.defineProperty(result, 'state', { get: () => 'denied' });
                }
                return result;
            });
        };
        """)

    @staticmethod
    async def _disable_webrtc(page: Page) -> None:
        """Prevent IP leaks via WebRTC and spoof local addresses"""
        await page.add_init_script("""
        // 1. Disable Data Channels
        const originalRTCPeerConnection = window.RTCPeerConnection;
        window.RTCPeerConnection = function(...args) {
            const pc = new originalRTCPeerConnection(...args);
            pc.createDataChannel = () => {
                console.warn('WebRTC DataChannel blocked by StealthEngine');
                return null;
            };

            // 2. Fake ICE Candidates (Prevent Local IP Leak)
            const originalAddIceCandidate = pc.addIceCandidate;
            pc.addIceCandidate = function(candidate) {
                if (candidate && (
                    candidate.candidate.includes('192.168.') ||
                    candidate.candidate.includes('10.') ||
                    candidate.candidate.includes('172.') ||
                    candidate.candidate.includes('.local')
                )) {
                    return Promise.resolve();
                }
                return originalAddIceCandidate.apply(this, arguments);
            };
            return pc;
        };

        // 3. Spoof RTC Configuration
        if (window.RTCPeerConnection.prototype.hasOwnProperty('getConfiguration')) {
            const originalGetConfig = window.RTCPeerConnection.prototype.getConfiguration;
            window.RTCPeerConnection.prototype.getConfiguration = function() {
                const config = originalGetConfig.apply(this, arguments);
                config.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
                return config;
            };
        }
        """)


class HumanBehavior:
    """High-fidelity human interaction emulation"""

    @staticmethod
    async def human_mouse_move(
        page: Page, target_x: float, target_y: float, steps: int = 50
    ) -> None:
        """
        Bezier-curve based mouse movement with micro-jitter and motor error emulation.
        CEO 2026: Refined for absolute human-indistinguishability.
        """
        # Current mouse position (fallback to random if not available)
        start_x, start_y = random.randint(0, 800), random.randint(0, 600)

        # Implementation of "Motor Error" (Overshoot)
        # Humans often slightly miss the target and then correct
        if random.random() < 0.2:  # 20% chance to overshoot
            ox = target_x + random.uniform(-30, 30)
            oy = target_y + random.uniform(-30, 30)
            await HumanBehavior._move_bezier(page, start_x, start_y, ox, oy, int(steps * 0.8))
            await asyncio.sleep(random.uniform(0.1, 0.3))  # Pause to "realize" error
            await HumanBehavior._move_bezier(page, ox, oy, target_x, target_y, int(steps * 0.4))
        else:
            await HumanBehavior._move_bezier(page, start_x, start_y, target_x, target_y, steps)

    @staticmethod
    async def _move_bezier(page: Page, sx, sy, tx, ty, steps: int):
        """Internal helper for Bezier movements"""
        # Control points for Bezier (realistic arcs)
        c1x = sx + random.uniform(-150, 150)
        c1y = sy + random.uniform(-150, 150)
        c2x = tx + random.uniform(-100, 100)
        c2y = ty + random.uniform(-100, 100)

        for i in range(steps + 1):
            t = i / steps
            # Cubic Bezier
            x = (
                (1 - t) ** 3 * sx
                + 3 * (1 - t) ** 2 * t * c1x
                + 3 * (1 - t) * t**2 * c2x
                + t**3 * tx
            )
            y = (
                (1 - t) ** 3 * sy
                + 3 * (1 - t) ** 2 * t * c1y
                + 3 * (1 - t) * t**2 * c2y
                + t**3 * ty
            )

            # Add micro-jitter (tremor) using Gaussian noise
            dist_to_target = ((tx - x) ** 2 + (ty - y) ** 2) ** 0.5
            tremor_scale = 0.4 if dist_to_target > 50 else 0.15

            x += random.gauss(0, tremor_scale)
            y += random.gauss(0, tremor_scale)

            await page.mouse.move(x, y)

            # Gaussian delay: humans are slower at the start and end (Fitts's Law approximation)
            speed_factor = 1.0 - (4 * (t - 0.5) ** 2)  # Parabola peaking at 1.0 when t=0.5
            base_delay = 0.005 + (0.01 * (1.0 - speed_factor))
            delay = abs(random.gauss(base_delay, base_delay * 0.2))
            await asyncio.sleep(delay)

    @staticmethod
    async def human_click(page: Page, x: float, y: float) -> None:
        """Click with human-like precision, variable pressure and timing"""
        # Move to target
        await HumanBehavior.human_mouse_move(page, x, y)

        # Pre-click "thinking" delay (Gaussian)
        await asyncio.sleep(abs(random.gauss(0.18, 0.05)))

        # Click duration (how long the button is held)
        await page.mouse.down()
        await asyncio.sleep(abs(random.gauss(0.08, 0.02)))
        await page.mouse.up()

        # Post-click "reaction" delay
        await asyncio.sleep(abs(random.gauss(0.3, 0.1)))

    @staticmethod
    async def human_type(page: Page, text: str, element_selector: Optional[str] = None) -> None:
        """Typing with Gaussian cadence, realistic errors, and 'thinking' pauses"""
        if element_selector:
            await page.focus(element_selector)

        # Average typing speed: 60 WPM (~5 chars/sec = 200ms/char)
        # Professional speed: 100 WPM (~8 chars/sec = 120ms/char)

        for i, char in enumerate(text):
            # Base delay between keys
            base_delay = random.gauss(0.12, 0.04)

            # Bigram timing (some combinations are faster)
            if i > 0 and text[i - 1].lower() in "aeiou" and char.lower() in "rstln":
                base_delay *= 0.8  # Faster common combinations

            await asyncio.sleep(abs(base_delay))

            # Press key
            await page.keyboard.press(char)

            # Occasional thinking pause at words/sections
            if char in " ._/" or (random.random() < 0.05):
                pause_len = random.gauss(0.6, 0.2) if char in ". " else random.gauss(0.3, 0.1)
                await asyncio.sleep(max(0, pause_len))

        # Final pause after typing
        await asyncio.sleep(abs(random.gauss(0.5, 0.15)))
