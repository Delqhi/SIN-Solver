#!/usr/bin/env python3
"""
FunCaptcha Sample Collector
Uses Steel Browser to collect 200 FunCaptcha training samples

Sites with FunCaptcha:
- Discord (signup/login pages)
- Epic Games (login)
- Roblox (signup)
- Twitch (signup)
- Reddit (certain actions)
- Twitter/X (certain actions)
- Steam (signup)
- Origin/EA (login)
"""

import requests
import time
import os
import json
from datetime import datetime
from pathlib import Path

# Configuration
STEEL_BROWSER_URL = "http://localhost:3005"
OUTPUT_DIR = "/Users/jeremy/dev/SIN-Solver/training/FunCaptcha"
TARGET_SAMPLES = 200

# FunCaptcha-enabled sites
FUNCAPTCHA_SITES = [
    {
        "name": "Discord Signup",
        "url": "https://discord.com/register",
        "trigger": "signup form interaction",
    },
    {
        "name": "Epic Games Login",
        "url": "https://www.epicgames.com/id/login",
        "trigger": "login attempt",
    },
    {"name": "Roblox Signup", "url": "https://www.roblox.com", "trigger": "signup form"},
    {"name": "Twitch Signup", "url": "https://www.twitch.tv/signup", "trigger": "signup form"},
    {"name": "Reddit Signup", "url": "https://www.reddit.com/register", "trigger": "signup form"},
    {
        "name": "Steam Signup",
        "url": "https://store.steampowered.com/join",
        "trigger": "signup form",
    },
]


class FunCaptchaCollector:
    def __init__(self):
        self.session_id = None
        self.collected = 0
        self.output_dir = Path(OUTPUT_DIR)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.session_log = []

    def create_session(self):
        """Create a new Steel Browser session"""
        try:
            response = requests.post(
                f"{STEEL_BROWSER_URL}/v1/sessions", json={"headless": True, "stealth": True}
            )
            if response.status_code == 200:
                data = response.json()
                self.session_id = data.get("id")
                print(f"✅ Created session: {self.session_id}")
                return True
            else:
                print(f"❌ Failed to create session: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error creating session: {e}")
            return False

    def navigate_to(self, url):
        """Navigate to a URL"""
        try:
            response = requests.post(
                f"{STEEL_BROWSER_URL}/v1/sessions/{self.session_id}/navigate", json={"url": url}
            )
            if response.status_code == 200:
                print(f"✅ Navigated to: {url}")
                return True
            else:
                print(f"❌ Failed to navigate: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error navigating: {e}")
            return False

    def take_screenshot(self, filename):
        """Take a screenshot"""
        try:
            response = requests.get(
                f"{STEEL_BROWSER_URL}/v1/sessions/{self.session_id}/screenshot",
                params={"fullPage": True},
            )
            if response.status_code == 200:
                filepath = self.output_dir / filename
                with open(filepath, "wb") as f:
                    f.write(response.content)
                print(f"📸 Screenshot saved: {filepath}")
                return True
            else:
                print(f"❌ Failed to take screenshot: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error taking screenshot: {e}")
            return False

    def find_funcaptcha_elements(self):
        """Check if FunCaptcha is present on the page"""
        try:
            # Check for FunCaptcha iframe or elements
            response = requests.post(
                f"{STEEL_BROWSER_URL}/v1/sessions/{self.session_id}/execute",
                json={
                    "script": """
                        // Look for FunCaptcha indicators
                        const funcaptchaIframes = document.querySelectorAll('iframe[src*="funcaptcha"], iframe[src*="arkoselabs"]');
                        const funcaptchaDivs = document.querySelectorAll('[data-callback*="funcaptcha"], .funcaptcha, #funcaptcha');
                        
                        return {
                            found: funcaptchaIframes.length > 0 || funcaptchaDivs.length > 0,
                            iframeCount: funcaptchaIframes.length,
                            divCount: funcaptchaDivs.length,
                            iframes: Array.from(funcaptchaIframes).map(f => f.src),
                            pageTitle: document.title,
                            url: window.location.href
                        };
                    """
                },
            )
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"❌ Error checking for FunCaptcha: {e}")
            return None

    def scroll_page(self):
        """Scroll page to trigger lazy-loaded captchas"""
        try:
            requests.post(
                f"{STEEL_BROWSER_URL}/v1/sessions/{self.session_id}/execute",
                json={"script": "window.scrollTo(0, document.body.scrollHeight / 2);"},
            )
            time.sleep(1)
        except:
            pass

    def click_element(self, selector):
        """Click an element to trigger captcha"""
        try:
            response = requests.post(
                f"{STEEL_BROWSER_URL}/v1/sessions/{self.session_id}/execute",
                json={
                    "script": f"""
                        const el = document.querySelector('{selector}');
                        if (el) {{
                            el.click();
                            return true;
                        }}
                        return false;
                    """
                },
            )
            return response.status_code == 200
        except:
            return False

    def collect_from_site(self, site, samples_per_site=35):
        """Collect samples from a specific site"""
        print(f"\n{'=' * 60}")
        print(f"🌐 Collecting from: {site['name']}")
        print(f"   URL: {site['url']}")
        print(f"{'=' * 60}")

        # Navigate to site
        if not self.navigate_to(site["url"]):
            return 0

        # Wait for page to load
        time.sleep(3)

        site_samples = 0
        attempts = 0
        max_attempts = samples_per_site * 3

        while site_samples < samples_per_site and attempts < max_attempts:
            attempts += 1

            # Check for FunCaptcha
            result = self.find_funcaptcha_elements()
            if result and result.get("found"):
                print(
                    f"✅ FunCaptcha detected! (iframes: {result['iframeCount']}, divs: {result['divCount']})"
                )

                # Take screenshot
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"funcaptcha_{site['name'].replace(' ', '_').lower()}_{timestamp}_{site_samples + 1}.png"

                if self.take_screenshot(filename):
                    site_samples += 1
                    self.collected += 1
                    self.session_log.append(
                        {
                            "site": site["name"],
                            "filename": filename,
                            "timestamp": timestamp,
                            "url": result.get("url", site["url"]),
                            "title": result.get("pageTitle", ""),
                            "iframe_count": result.get("iframeCount", 0),
                            "div_count": result.get("divCount", 0),
                        }
                    )

                    print(f"📊 Progress: {self.collected}/{TARGET_SAMPLES}")

                # Wait before next attempt
                time.sleep(2)
            else:
                # Try to trigger captcha by interacting with page
                if attempts % 5 == 0:
                    # Try clicking common signup/login buttons
                    self.click_element("button[type='submit']")
                    self.click_element("input[type='submit']")
                    self.click_element("[data-testid='signup-button']")
                    self.click_element("[data-testid='login-button']")
                    time.sleep(2)

                # Scroll to trigger lazy loading
                if attempts % 3 == 0:
                    self.scroll_page()

                time.sleep(1)

        print(f"✅ Collected {site_samples} samples from {site['name']}")
        return site_samples

    def save_metadata(self):
        """Save collection metadata"""
        metadata = {
            "collection_date": datetime.now().isoformat(),
            "total_samples": self.collected,
            "target_samples": TARGET_SAMPLES,
            "sites_visited": len(FUNCAPTCHA_SITES),
            "samples": self.session_log,
        }

        metadata_file = self.output_dir / "collection_metadata.json"
        with open(metadata_file, "w") as f:
            json.dump(metadata, f, indent=2)

        print(f"\n💾 Metadata saved to: {metadata_file}")

    def close_session(self):
        """Close the browser session"""
        if self.session_id:
            try:
                requests.delete(f"{STEEL_BROWSER_URL}/v1/sessions/{self.session_id}")
                print(f"✅ Closed session: {self.session_id}")
            except:
                pass

    def run(self):
        """Main collection loop"""
        print("🚀 FunCaptcha Sample Collector")
        print(f"🎯 Target: {TARGET_SAMPLES} samples")
        print(f"📁 Output: {OUTPUT_DIR}")
        print(f"🌐 Steel Browser: {STEEL_BROWSER_URL}")
        print("=" * 60)

        # Create session
        if not self.create_session():
            print("❌ Failed to create browser session")
            return

        try:
            # Collect from each site
            samples_per_site = TARGET_SAMPLES // len(FUNCAPTCHA_SITES)

            for site in FUNCAPTCHA_SITES:
                if self.collected >= TARGET_SAMPLES:
                    break

                self.collect_from_site(site, samples_per_site)

                # Small delay between sites
                time.sleep(2)

            # If we haven't reached target, cycle through sites again
            cycle = 0
            while self.collected < TARGET_SAMPLES and cycle < 3:
                cycle += 1
                print(f"\n🔄 Cycle {cycle}: Collecting more samples...")

                for site in FUNCAPTCHA_SITES:
                    if self.collected >= TARGET_SAMPLES:
                        break

                    remaining = TARGET_SAMPLES - self.collected
                    self.collect_from_site(site, min(10, remaining))

        finally:
            self.save_metadata()
            self.close_session()

        print("\n" + "=" * 60)
        print(f"✅ Collection Complete!")
        print(f"📊 Total samples collected: {self.collected}")
        print(f"📁 Output directory: {OUTPUT_DIR}")
        print("=" * 60)


if __name__ == "__main__":
    collector = FunCaptchaCollector()
    collector.run()
