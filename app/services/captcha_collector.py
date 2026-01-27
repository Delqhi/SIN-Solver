#!/usr/bin/env python3
"""
🤖 AUTOMATED CAPTCHA COLLECTOR - CEO 2026
==========================================
Automatically discover, screenshot, and store CAPTCHAs for training

Sources:
1. Known CAPTCHA test sites
2. Popular websites with CAPTCHAs
3. CAPTCHA provider demo pages
4. Scraped from target lists

Features:
- Automated browsing & screenshot
- Intelligent CAPTCHA detection
- Deduplication (hash-based)
- Automatic labeling (when possible)
- Storage in training database
"""

import asyncio
import hashlib
import base64
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
from playwright.async_api import Page, Browser

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.captcha_intelligence import CaptchaTrainingData, CaptchaType

logger = logging.getLogger(__name__)


class CaptchaCollector:
    """
    Automated CAPTCHA Collection System
    Finds and stores CAPTCHAs for ML training
    """
    
    # Known CAPTCHA test/demo sites
    CAPTCHA_SOURCES = [
        # Google reCAPTCHA
        {
            "url": "https://www.google.com/recaptcha/api2/demo",
            "type": "recaptcha_v2",
            "provider": "Google"
        },
        {
            "url": "https://recaptcha-demo.appspot.com/recaptcha-v3-request-scores.php",
            "type": "recaptcha_v3",
            "provider": "Google"
        },
        
        # hCaptcha
        {
            "url": "https://accounts.hcaptcha.com/demo",
            "type": "hcaptcha",
            "provider": "hCaptcha"
        },
        
        # FunCaptcha (Arkose)
        {
            "url": "https://client-demo.arkoselabs.com/",
            "type": "funcaptcha",
            "provider": "Arkose"
        },
        
        # Cloudflare Turnstile
        {
            "url": "https://challenges.cloudflare.com/turnstile/v0/g/demo",
            "type": "turnstile",
            "provider": "Cloudflare"
        },
        
        # Text CAPTCHAs (various)
        {
            "url": "https://www.captcha.net/captcha-examples/",
            "type": "text_captcha",
            "provider": "Generic"
        },
        
        # GeeTest
        {
            "url": "https://www.geetest.com/en/demo",
            "type": "geetest",
            "provider": "GeeTest"
        },
    ]
    
    # Real-world sites with CAPTCHAs (for diverse training data)
    REAL_WORLD_TARGETS = [
        "https://www.ticketmaster.com",
        "https://www.stubhub.com",
        "https://www.nike.com",
        "https://www.adidas.com",
        "https://www.bestbuy.com",
    ]
    
    def __init__(self, browser: Browser):
        self.browser = browser
        self.collected = []
        self.seen_hashes = set()
    
    async def collect_from_all_sources(
        self, 
        max_per_source: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Collect CAPTCHAs from all known sources
        """
        all_captchas = []
        
        # Collect from known demo sites
        for source in self.CAPTCHA_SOURCES:
            logger.info(f"🔍 Collecting from: {source['url']}")
            
            try:
                captchas = await self.collect_from_url(
                    source['url'],
                    expected_type=source['type'],
                    max_count=max_per_source
                )
                
                all_captchas.extend(captchas)
                logger.info(f"✅ Collected {len(captchas)} from {source['provider']}")
            
            except Exception as e:
                logger.error(f"❌ Failed to collect from {source['url']}: {e}")
        
        return all_captchas
    
    async def collect_from_url(
        self,
        url: str,
        expected_type: str,
        max_count: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Collect CAPTCHAs from a specific URL
        """
        captchas = []
        page = await self.browser.new_page()
        
        try:
            # Navigate
            await page.goto(url, timeout=30000, wait_until="networkidle")
            await asyncio.sleep(3)  # Wait for CAPTCHA to load
            
            # Collect multiple instances (refresh page)
            for i in range(max_count):
                logger.info(f"  📸 Capture {i+1}/{max_count}")
                
                # Take screenshot
                screenshot = await page.screenshot(full_page=False)
                screenshot_b64 = base64.b64encode(screenshot).decode()
                screenshot_hash = hashlib.sha256(screenshot).hexdigest()
                
                # Skip duplicates
                if screenshot_hash in self.seen_hashes:
                    logger.debug(f"  ⏭️  Duplicate, skipping")
                    continue
                
                self.seen_hashes.add(screenshot_hash)
                
                # Store CAPTCHA data
                captcha_data = {
                    "screenshot": screenshot,
                    "screenshot_b64": screenshot_b64,
                    "screenshot_hash": screenshot_hash,
                    "url": url,
                    "type": expected_type,
                    "timestamp": datetime.utcnow().isoformat(),
                    "dom_snapshot": await self._capture_dom_snapshot(page),
                }
                
                captchas.append(captcha_data)
                
                # Refresh for new CAPTCHA
                await page.reload(wait_until="networkidle")
                await asyncio.sleep(2)
            
        except Exception as e:
            logger.error(f"Error collecting from {url}: {e}")
        
        finally:
            await page.close()
        
        return captchas
    
    async def _capture_dom_snapshot(self, page: Page) -> Dict[str, Any]:
        """Capture relevant DOM structure"""
        try:
            # Find CAPTCHA-related iframes and elements
            snapshot = await page.evaluate("""
                () => {
                    const iframes = Array.from(document.querySelectorAll('iframe')).map(iframe => ({
                        src: iframe.src,
                        class: iframe.className,
                        id: iframe.id
                    }));
                    
                    const captchaElements = Array.from(
                        document.querySelectorAll('[class*="captcha"], [id*="captcha"], [class*="recaptcha"]')
                    ).map(el => ({
                        tagName: el.tagName,
                        className: el.className,
                        id: el.id
                    }));
                    
                    return {
                        iframes,
                        captchaElements,
                        url: window.location.href
                    };
                }
            """)
            
            return snapshot
        
        except:
            return {}
    
    async def save_to_database(self, captchas: List[Dict[str, Any]]):
        """Save collected CAPTCHAs to training database (Async)"""
        # Async Database Connection
        db_url = settings.database_url or "postgresql+asyncpg://ceo_admin:secure_ceo_password_2026@172.20.0.11:5432/sin_solver_production"
        engine = create_async_engine(db_url, echo=False)
        AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        saved_count = 0
        
        async with AsyncSessionLocal() as session:
            for captcha in captchas:
                try:
                    # Find CAPTCHA type ID
                    result = await session.execute(select(CaptchaType).filter_by(name=captcha['type']))
                    captcha_type = result.scalars().first()
                    
                    if not captcha_type:
                        logger.warning(f"Unknown CAPTCHA type: {captcha['type']}")
                        # Optional: Auto-create type?
                        continue
                    
                    # Create training data entry
                    training_data = CaptchaTrainingData(
                        captcha_type_id=captcha_type.id,
                        screenshot=captcha['screenshot'],  # Binary
                        screenshot_hash=captcha['screenshot_hash'],
                        url_source=captcha['url'],
                        dom_snapshot=captcha.get('dom_snapshot'),
                        collected_at=datetime.utcnow(),
                        solve_method='automated_collection'
                    )
                    
                    session.add(training_data)
                    saved_count += 1
                
                except Exception as e:
                    logger.error(f"Failed to prepare CAPTCHA for save: {e}")
            
            try:
                await session.commit()
                logger.info(f"💾 Saved {saved_count} CAPTCHAs to database")
            except Exception as e:
                await session.rollback()
                logger.error(f"❌ Database commit failed: {e}")
            finally:
                await engine.dispose()
        
        return saved_count

class ContinuousCollector:
    """
    Runs continuously to collect CAPTCHAs 24/7
    """
    
    def __init__(self, browser: Browser):
        self.collector = CaptchaCollector(browser)
        self.is_running = True
        self.collection_interval = 3600  # Collect every hour
    
    async def run_forever(self):
        """
        Continuous collection loop
        """
        logger.info("🤖 Starting continuous CAPTCHA collection...")
        
        while self.is_running:
            try:
                logger.info("🔄 Collection cycle starting...")
                
                # Collect from all sources
                captchas = await self.collector.collect_from_all_sources(
                    max_per_source=5
                )
                
                # Save to database
                if captchas:
                    await self.collector.save_to_database(captchas)
                
                logger.info(f"✅ Collection cycle complete. Total: {len(captchas)}")
                
                # Wait before next cycle
                await asyncio.sleep(self.collection_interval)
            
            except Exception as e:
                logger.error(f"❌ Collection cycle failed: {e}")
                await asyncio.sleep(60)  # Wait 1 min on error


# CLI for manual collection
if __name__ == "__main__":
    async def main():
        from playwright.async_api import async_playwright
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            collector = CaptchaCollector(browser)
            
            # Collect from all sources
            captchas = await collector.collect_from_all_sources(max_per_source=10)
            
            print(f"\n✅ Collected {len(captchas)} unique CAPTCHAs")
            
            # Save to database
            saved = await collector.save_to_database(captchas)
            print(f"💾 Saved {saved} to training database")
            
            await browser.close()
    
    asyncio.run(main())
