import logging
import asyncio
from typing import Dict, Optional, List
from playwright.async_api import Request, Page

logger = logging.getLogger(__name__)

class NetworkCaptchaDetector:
    """
    Detects CAPTCHAs by monitoring network traffic for known provider domains.
    """
    
    PROVIDER_DOMAINS = {
        "recaptcha": ["google.com/recaptcha", "gstatic.com/recaptcha", "recaptcha.net"],
        "hcaptcha": ["hcaptcha.com", "newassets.hcaptcha.com"],
        "funcaptcha": ["arkoselabs.com", "funcaptcha.com", "client-api.arkoselabs.com"],
        "cloudflare": ["challenges.cloudflare.com", "cloudflare.com/cdn-cgi/challenge-platform", "turnstile"],
        "geetest": ["geetest.com", "static.geetest.com"],
        "lemin": ["leminnow.com"],
        "datadome": ["datadome.co"],
        "perimeterx": ["perimeterx.net"],
        "aws_waf": ["captcha.awswaf.com", "waf.aws.amazon.com"],
        "recaptcha_enterprise": ["google.com/recaptcha/enterprise"],
        "akamai": ["akamai.com/cp", "akamaized.net"]
    }

    def __init__(self):
        self.detected_providers: Dict[str, bool] = {}
        self._lock = asyncio.Lock()

    async def start_monitoring(self, page: Page):
        """Register request listener on the page"""
        self.detected_providers = {}
        page.on("request", self._handle_request)
        logger.info("📡 Network monitoring for CAPTCHAs started.")

    async def _handle_request(self, request: Request):
        url = request.url.lower()
        async with self._lock:
            for provider, domains in self.PROVIDER_DOMAINS.items():
                if any(domain in url for domain in domains):
                    if not self.detected_providers.get(provider):
                        logger.info(f"🚨 [Network] Detected CAPTCHA Provider: {provider}")
                        self.detected_providers[provider] = True

    async def get_detected_providers(self) -> List[str]:
        """Return list of detected providers"""
        async with self._lock:
            return [p for p, detected in self.detected_providers.items() if detected]

    async def clear(self):
        """Reset detection state"""
        async with self._lock:
            self.detected_providers = {}
