#!/usr/bin/env python3
"""
🚀 TOKEN INJECTOR - CEO 2026
===========================
Injects solved CAPTCHA tokens directly into the browser DOM.
Handles reCAPTCHA, hCaptcha, and Cloudflare Turnstile.
"""

import logging
import asyncio
from typing import Optional
from playwright.async_api import Page

logger = logging.getLogger("TokenInjector")

class TokenInjector:
    """
    Expert at injecting CAPTCHA tokens and triggering callbacks.
    """

    async def inject_token(self, page: Page, captcha_type: str, token: str) -> bool:
        """
        Main entry point for token injection.
        """
        logger.info(f"💉 [TokenInjector] Injecting {captcha_type} token...")
        
        if captcha_type in ["recaptcha", "recaptcha_v2", "recaptcha_v3", "recaptcha_enterprise"]:
            return await self._inject_recaptcha(page, token)
        elif captcha_type in ["hcaptcha"]:
            return await self._inject_hcaptcha(page, token)
        elif captcha_type in ["cloudflare", "turnstile"]:
            return await self._inject_turnstile(page, token)
        else:
            logger.warning(f"⚠️ [TokenInjector] Unsupported injection type: {captcha_type}")
            return False

    async def _inject_recaptcha(self, page: Page, token: str) -> bool:
        try:
            await page.evaluate(f"""(token) => {{
                document.getElementById('g-recaptcha-response').innerHTML = token;
                const elements = document.getElementsByName('g-recaptcha-response');
                for (let i=0; i<elements.length; i++) {{
                    elements[i].innerHTML = token;
                    elements[i].value = token;
                }}
            }}""", token)
            
            await self._trigger_callback(page, "___grecaptcha_cfg")
            return True
        except Exception as e:
            logger.error(f"reCAPTCHA injection failed: {e}")
            return False

    async def _inject_hcaptcha(self, page: Page, token: str) -> bool:
        try:
            await page.evaluate(f"""(token) => {{
                const elements = document.getElementsByName('h-captcha-response');
                for (let i=0; i<elements.length; i++) {{
                    elements[i].innerHTML = token;
                    elements[i].value = token;
                }}
                const g_elements = document.getElementsByName('g-recaptcha-response');
                for (let i=0; i<g_elements.length; i++) {{
                    g_elements[i].innerHTML = token;
                    g_elements[i].value = token;
                }}
            }}""", token)
            return True
        except Exception as e:
            logger.error(f"hCaptcha injection failed: {e}")
            return False

    async def _inject_turnstile(self, page: Page, token: str) -> bool:
        try:
            await page.evaluate(f"""(token) => {{
                const elements = document.getElementsByName('cf-turnstile-response');
                for (let i=0; i<elements.length; i++) {{
                    elements[i].innerHTML = token;
                    elements[i].value = token;
                }}
            }}""", token)
            return True
        except Exception as e:
            logger.error(f"Turnstile injection failed: {e}")
            return False

    async def _trigger_callback(self, page: Page, cfg_name: str):
        try:
            await page.evaluate(f"""() => {{
                if (window.{cfg_name}) {{
                    const clients = window.{cfg_name}.clients;
                    for (const id in clients) {{
                        const client = clients[id];
                        for (const key in client) {{
                            if (typeof client[key] === 'object' && client[key] !== null) {{
                                if (client[key].callback) {{
                                    if (typeof client[key].callback === 'function') {{
                                        client[key].callback();
                                    }} else if (typeof client[key].callback === 'string') {{
                                        eval(client[key].callback)();
                                    }}
                                }
                            }
                        }
                    }
                }
            }}""")
        except Exception as e:
            logger.debug(f"Callback trigger failed (common if no callback defined): {e}")

_injector = None

def get_token_injector() -> TokenInjector:
    global _injector
    if not _injector:
        _injector = TokenInjector()
    return _injector
