import logging
from typing import Dict, Optional, List, Tuple, Any
from playwright.async_api import Page

logger = logging.getLogger(__name__)

class DOMCaptchaDetector:
    """
    Detects CAPTCHAs by searching for known DOM signatures, iframes, and CSS classes.
    """
    
    SIGNATURES = {
        "recaptcha": [
            "iframe[src*='google.com/recaptcha']",
            "iframe[src*='recaptcha.net']",
            ".g-recaptcha",
            "#recaptcha-anchor",
            "iframe[title*='reCAPTCHA']",
            "[data-sitekey][src*='recaptcha']"
        ],
        "hcaptcha": [
            "iframe[src*='hcaptcha.com']",
            ".h-captcha",
            "#hcaptcha-checkbox",
            ".hcaptcha-container",
            "[data-sitekey][src*='hcaptcha']"
        ],
        "funcaptcha": [
            "iframe[src*='arkoselabs.com']",
            "iframe[src*='funcaptcha.com']",
            "#arkose-iframe",
            "div[id*='FunCaptcha']",
            ".arkose-challenge"
        ],
        "cloudflare": [
            "iframe[src*='challenges.cloudflare.com']",
            "#cf-turnstile-wrapper",
            ".cf-turnstile",
            "div[id*='turnstile']",
            ".cf-challenge",
            "#cf-challenge"
        ],
        "geetest": [
            ".geetest_holder",
            ".geetest_captcha",
            ".geetest_btn",
            ".geetest_view",
            "div[class*='geetest_']"
        ],
        "aws_waf": [
            "#aws-waf-captcha",
            ".aws-waf-captcha-wrapper",
            "iframe[src*='captcha.awswaf.com']",
            ".aws-waf-captcha-container"
        ],
        "datadome": [
            "iframe[src*='datadome.co']",
            "#datadome-captcha",
            "div[id*='datadome']"
        ],
        "perimeterx": [
            "#px-captcha",
            "iframe[src*='perimeterx.net']",
            ".px-captcha-container"
        ],
        "login_form": [
            "form:has(input[type='password'])",
            "form[action*='login']",
            "input[name*='login']",
            "input[id*='login']",
            "div[class*='login-form']"
        ],
        "cookie_banner": [
            "div[id*='cookie']",
            "div[class*='cookie']",
            "section[class*='cookie']",
            "button:has-text('Accept')",
            "button:has-text('Cookies')"
        ],
        "modal_overlay": [
            "div[class*='modal']",
            "div[id*='modal']",
            "div[class*='overlay']",
            "div[id*='popup']",
            ".modal-content",
            ".backdrop"
        ],
        "generic_button": [
            "button:visible",
            "input[type='button']:visible",
            "input[type='submit']:visible",
            "a.btn:visible",
            "div[role='button']:visible",
            "button[id*='verify']",
            "button[id*='challenge']",
            "button[id*='validate']",
            "button[id*='submit']",
            "button[class*='submit']",
            "div[class*='button']:visible",
            "span[class*='button']:visible",
            "[onclick]:visible"
        ],
        "input_field": [
            "input[type='text']:visible",
            "input[type='email']:visible",
            "input[type='tel']:visible",
            "textarea:visible",
            "input[placeholder*='search']",
            "input[placeholder*='enter']"
        ],
        "checkbox_container": [
            "input[type='checkbox']",
            ".checkbox",
            ".check",
            "[role='checkbox']",
            "span:has-text('I am not a robot')",
            "div:has-text('Verify you are human')"
        ],
        "iframe_gate": [
            "iframe:visible"
        ],
        "all_forms": [
            "form:visible"
        ],
        "solver_blocker": [
            "script[src*='fingerprintjs']",
            "script[src*='openfpjs']",
            "script[src*='clientjs']",
            "div[id*='px-challenge']",
            "div[class*='px-challenge']"
        ]
    }

    async def detect(self, page: Page) -> List[Tuple[str, Any]]:
        """
        Scans the page for CAPTCHA elements and returns list of (type, element)
        """
        results = []
        for captcha_type, selectors in self.SIGNATURES.items():
            for selector in selectors:
                try:
                    element = await page.query_selector(selector)
                    if element:
                        is_visible = await element.is_visible()
                        if is_visible:
                            logger.info(f"🚨 [DOM] Detected CAPTCHA: {captcha_type} via {selector}")
                            results.append((captcha_type, element))
                            break # Found this type, move to next
                except Exception:
                    continue
        return results

    async def is_challenge_page(self, page: Page) -> bool:
        """Checks if the current page is a dedicated challenge page (e.g. Cloudflare 5s wait)"""
        title = await page.title()
        if "Just a moment..." in title or "Attention Required!" in title:
            return True
        
        # Check for Cloudflare ray ID or similar markers
        content = await page.content()
        if "cf-ray" in content.lower() or "cloudflare" in content.lower():
            if "checking your browser" in content.lower() or "verify you are human" in content.lower():
                return True
                
        return False

    async def detect_honeypots(self, page: Page) -> List[Dict[str, Any]]:
        """
        🚀 CEO 2026: DETECT TRAPS & HONEYPOTS
        Finds invisible elements that bots often click, leading to instant bans.
        """
        traps = await page.evaluate("""() => {
            const results = [];
            const interactive = document.querySelectorAll('a, button, input, [onclick]');
            for (const el of interactive) {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                const isInvisible = 
                    style.display === 'none' || 
                    style.visibility === 'hidden' || 
                    parseFloat(style.opacity) < 0.1 ||
                    rect.width < 2 || rect.height < 2 ||
                    (rect.x < 0 || rect.y < 0);
                
                if (isInvisible) {
                    results.push({
                        "tag": el.tagName,
                        "id": el.id,
                        "class": el.className,
                        "reason": "hidden_element"
                    });
                }
            }
            return results;
        }""")
        return traps
