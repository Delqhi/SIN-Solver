#!/usr/bin/env python3
"""
FunCaptcha Training Sample Collector
Uses Steel Browser to collect FunCaptcha samples for model training
"""

import requests
import json
import time
import os
from datetime import datetime
from pathlib import Path

# Configuration
STEEL_BROWSER_URL = "http://localhost:3005"
OUTPUT_DIR = Path("/Users/jeremy/dev/SIN-Solver/training/fun_captcha/raw")
METADATA_FILE = OUTPUT_DIR / "metadata.json"

# FunCaptcha-protected sites
SITES = {
    "discord": "https://discord.com/register",
    "epic_games": "https://www.epicgames.com/id/register",
    "roblox": "https://www.roblox.com/",
    "outlook": "https://signup.live.com/",
    "steam": "https://store.steampowered.com/join/",
    "twitch": "https://www.twitch.tv/signup",
    "origin": "https://www.origin.com/usa/en-us/store",
    "ubisoft": "https://account.ubisoft.com/en-US/login",
}


class FunCaptchaCollector:
    def __init__(self):
        self.session = requests.Session()
        self.samples_collected = 0
        self.metadata = {
            "collection_start": datetime.now().isoformat(),
            "samples": [],
            "total_count": 0,
        }
        self.ensure_directories()

    def ensure_directories(self):
        """Create output directories"""
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        (OUTPUT_DIR / "game").mkdir(exist_ok=True)
        (OUTPUT_DIR / "puzzle").mkdir(exist_ok=True)
        (OUTPUT_DIR / "rotate").mkdir(exist_ok=True)
        (OUTPUT_DIR / "other").mkdir(exist_ok=True)
        print(f"✓ Output directory ready: {OUTPUT_DIR}")

    def create_session(self):
        """Create a new Steel Browser session"""
        try:
            response = self.session.post(
                f"{STEEL_BROWSER_URL}/v1/sessions", json={"headless": True}, timeout=30
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Created Steel session: {data.get('id', 'unknown')}")
                return data
            else:
                print(f"✗ Failed to create session: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"✗ Error creating session: {e}")
            return None

    def navigate_to_site(self, session_id, url):
        """Navigate to a specific site"""
        try:
            response = self.session.post(
                f"{STEEL_BROWSER_URL}/v1/sessions/{session_id}/navigate",
                json={"url": url},
                timeout=30,
            )
            if response.status_code == 200:
                print(f"✓ Navigated to: {url}")
                return True
            else:
                print(f"✗ Failed to navigate: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"✗ Error navigating: {e}")
            return False

    def take_screenshot(self, session_id, filename):
        """Take a screenshot"""
        try:
            response = self.session.get(
                f"{STEEL_BROWSER_URL}/v1/sessions/{session_id}/screenshot", timeout=30
            )
            if response.status_code == 200:
                filepath = OUTPUT_DIR / filename
                with open(filepath, "wb") as f:
                    f.write(response.content)
                print(f"✓ Screenshot saved: {filename}")
                return str(filepath)
            else:
                print(f"✗ Failed to take screenshot: {response.status_code}")
                return None
        except Exception as e:
            print(f"✗ Error taking screenshot: {e}")
            return None

    def detect_funcaptcha(self, session_id):
        """Check if FunCaptcha is present on the page"""
        try:
            # Execute JavaScript to detect FunCaptcha
            js_code = """
            () => {
                // Check for FunCaptcha indicators
                const funcaptchaElements = document.querySelectorAll('[data-callback*="funcaptcha"], .funcaptcha, [id*="funcaptcha"], [class*="funcaptcha"]');
                const arkoseElements = document.querySelectorAll('[data-callback*="arkose"], .arkose, [id*="arkose"], [class*="arkose"]');
                const frames = Array.from(document.querySelectorAll('iframe')).filter(f => 
                    f.src.includes('funcaptcha') || f.src.includes('arkoselabs')
                );
                
                return {
                    funcaptchaFound: funcaptchaElements.length > 0 || arkoseElements.length > 0 || frames.length > 0,
                    funcaptchaCount: funcaptchaElements.length,
                    arkoseCount: arkoseElements.length,
                    frameCount: frames.length,
                    frameSrcs: frames.map(f => f.src)
                };
            }
            """

            response = self.session.post(
                f"{STEEL_BROWSER_URL}/v1/sessions/{session_id}/execute",
                json={"script": js_code},
                timeout=30,
            )

            if response.status_code == 200:
                result = response.json()
                return result.get("result", {})
            else:
                return {"funcaptchaFound": False}
        except Exception as e:
            print(f"✗ Error detecting FunCaptcha: {e}")
            return {"funcaptchaFound": False}

    def collect_samples_from_site(self, site_name, url, target_count=25):
        """Collect samples from a specific site"""
        print(f"\n{'=' * 60}")
        print(f"Collecting from: {site_name}")
        print(f"URL: {url}")
        print(f"Target: {target_count} samples")
        print(f"{'=' * 60}\n")

        session = self.create_session()
        if not session:
            return 0

        session_id = session.get("id")
        site_samples = 0
        attempts = 0
        max_attempts = target_count * 3  # Allow for retries

        try:
            while site_samples < target_count and attempts < max_attempts:
                attempts += 1
                print(
                    f"\n[Attempt {attempts}/{max_attempts}] Sample {site_samples + 1}/{target_count}"
                )

                # Navigate to the site
                if not self.navigate_to_site(session_id, url):
                    time.sleep(2)
                    continue

                # Wait for page to load
                time.sleep(3)

                # Check for FunCaptcha
                detection = self.detect_funcaptcha(session_id)

                if detection.get("funcaptchaFound"):
                    print(f"✓ FunCaptcha detected!")
                    print(f"  Elements: {detection.get('funcaptchaCount', 0)}")
                    print(f"  Arkose: {detection.get('arkoseCount', 0)}")
                    print(f"  Frames: {detection.get('frameCount', 0)}")

                    # Wait for challenge to fully load
                    time.sleep(2)

                    # Take screenshot
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"{site_name}_{timestamp}_{site_samples:04d}.png"
                    filepath = self.take_screenshot(session_id, filename)

                    if filepath:
                        site_samples += 1
                        self.samples_collected += 1

                        # Add to metadata
                        self.metadata["samples"].append(
                            {
                                "filename": filename,
                                "filepath": filepath,
                                "site": site_name,
                                "url": url,
                                "timestamp": datetime.now().isoformat(),
                                "detection": detection,
                                "challenge_type": "unknown",  # To be classified later
                            }
                        )

                        # Save metadata periodically
                        if site_samples % 5 == 0:
                            self.save_metadata()
                else:
                    print("  No FunCaptcha detected, retrying...")

                # Wait before next attempt
                time.sleep(2)

                # Refresh or navigate away and back
                if attempts % 3 == 0:
                    print("  Refreshing session...")
                    self.navigate_to_site(session_id, "about:blank")
                    time.sleep(1)

        except KeyboardInterrupt:
            print("\n⚠ Collection interrupted by user")
        except Exception as e:
            print(f"\n✗ Error during collection: {e}")
        finally:
            # Cleanup session
            try:
                self.session.delete(f"{STEEL_BROWSER_URL}/v1/sessions/{session_id}")
                print(f"\n✓ Closed session for {site_name}")
            except:
                pass

        print(f"\n✓ Collected {site_samples} samples from {site_name}")
        return site_samples

    def save_metadata(self):
        """Save metadata to JSON file"""
        self.metadata["total_count"] = len(self.metadata["samples"])
        self.metadata["last_updated"] = datetime.now().isoformat()

        try:
            with open(METADATA_FILE, "w") as f:
                json.dump(self.metadata, f, indent=2)
            print(f"✓ Metadata saved: {METADATA_FILE}")
        except Exception as e:
            print(f"✗ Error saving metadata: {e}")

    def run_collection(self):
        """Run the full collection process"""
        print("=" * 60)
        print("FunCaptcha Training Sample Collector")
        print("=" * 60)
        print(f"Output directory: {OUTPUT_DIR}")
        print(f"Target: 200 samples")
        print(f"Sites: {len(SITES)}")
        print("=" * 60)

        total_samples = 0

        # Calculate samples per site
        samples_per_site = 200 // len(SITES)
        remainder = 200 % len(SITES)

        for idx, (site_name, url) in enumerate(SITES.items()):
            target = samples_per_site + (1 if idx < remainder else 0)
            samples = self.collect_samples_from_site(site_name, url, target)
            total_samples += samples

            print(f"\n{'=' * 60}")
            print(f"Progress: {total_samples}/200 samples collected")
            print(f"{'=' * 60}\n")

            # Save metadata after each site
            self.save_metadata()

            # Break if we've collected enough
            if total_samples >= 200:
                print("✓ Target reached!")
                break

        # Final save
        self.save_metadata()

        print("\n" + "=" * 60)
        print("COLLECTION COMPLETE")
        print("=" * 60)
        print(f"Total samples collected: {total_samples}")
        print(f"Metadata file: {METADATA_FILE}")
        print(f"Output directory: {OUTPUT_DIR}")
        print("=" * 60)

        return total_samples


if __name__ == "__main__":
    collector = FunCaptchaCollector()
    total = collector.run_collection()
    print(f"\n✓ Successfully collected {total} FunCaptcha samples!")
