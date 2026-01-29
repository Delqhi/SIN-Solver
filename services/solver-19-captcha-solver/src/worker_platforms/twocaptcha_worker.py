#!/usr/bin/env python3
"""
2Captcha.com Worker Client - Browser Automation
Earn money by solving captchas on 2captcha.com
"""

import asyncio
import logging
import os
import time
import base64
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime

import httpx
from playwright.async_api import async_playwright, Page, Browser, BrowserContext

logger = logging.getLogger("2CaptchaWorker")


@dataclass
class WorkerStats:
    """Track worker earnings and performance"""
    total_solved: int = 0
    total_failed: int = 0
    earnings_usd: float = 0.0
    start_time: datetime = field(default_factory=datetime.now)
    current_rate: float = 0.0  # per 1000 captchas
    
    @property
    def uptime_hours(self) -> float:
        return (datetime.now() - self.start_time).total_seconds() / 3600
    
    @property
    def avg_per_hour(self) -> float:
        if self.uptime_hours == 0:
            return 0.0
        return self.total_solved / self.uptime_hours


@dataclass
class CaptchaTask:
    """Represents a captcha task from 2captcha"""
    task_id: str
    captcha_type: str  # "image", "recaptcha", "hcaptcha", etc.
    image_data: Optional[str] = None  # base64
    site_key: Optional[str] = None
    page_url: Optional[str] = None
    instructions: Optional[str] = None


class TwoCaptchaWorker:
    """
    Automated worker for 2captcha.com
    Logs in, starts working, solves captchas automatically
    """
    
    BASE_URL = "https://2captcha.com"
    WORKER_URL = "https://2captcha.com/worker"
    
    def __init__(
        self,
        username: str,
        password: str,
        steel_browser_url: str = "http://agent-05-steel-browser:3005",
        headless: bool = False,
        max_concurrent: int = 1
    ):
        self.username = username
        self.password = password
        self.steel_browser_url = steel_browser_url
        self.headless = headless
        self.max_concurrent = max_concurrent
        
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.stats = WorkerStats()
        self.is_running = False
        self.current_earnings = 0.0
        
        # Captcha solvers (will be injected)
        self.solvers: Dict[str, Any] = {}
        
    async def initialize(self) -> bool:
        """Initialize browser connection"""
        try:
            logger.info("🚀 Initializing 2Captcha Worker...")
            
            playwright = await async_playwright().start()
            
            # Connect to Steel Browser
            browser_ws_endpoint = f"{self.steel_browser_url}/playwright"
            self.browser = await playwright.chromium.connect_over_cdp(
                browser_ws_endpoint
            )
            
            # Create isolated context
            self.context = await self.browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            
            self.page = await self.context.new_page()
            logger.info("✅ Browser initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize browser: {e}")
            return False
    
    async def login(self) -> bool:
        """Login to 2captcha.com"""
        try:
            logger.info("🔐 Logging in to 2captcha.com...")
            
            await self.page.goto(f"{self.BASE_URL}/auth/login")
            await asyncio.sleep(2)
            
            # Fill login form
            await self.page.fill('input[name="username"]', self.username)
            await self.page.fill('input[name="password"]', self.password)
            
            # Click login button
            await self.page.click('button[type="submit"]')
            
            # Wait for navigation
            await self.page.wait_for_load_state("networkidle")
            await asyncio.sleep(3)
            
            # Check if logged in
            if "/worker" in self.page.url or "dashboard" in self.page.url:
                logger.info("✅ Successfully logged in!")
                return True
            else:
                # Check for error message
                error_elem = await self.page.query_selector(".alert-danger, .error-message")
                if error_elem:
                    error_text = await error_elem.inner_text()
                    logger.error(f"❌ Login failed: {error_text}")
                else:
                    logger.error(f"❌ Login failed. Current URL: {self.page.url}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Login error: {e}")
            return False
    
    async def start_work(self) -> bool:
        """Navigate to worker page and start working"""
        try:
            logger.info("💼 Starting work...")
            
            await self.page.goto(self.WORKER_URL)
            await asyncio.sleep(2)
            
            # Look for "Start Work" or similar button
            start_buttons = [
                'button:has-text("Start")',
                'button:has-text("Work")',
                'a:has-text("Start")',
                'button[id*="start"]',
                'button[class*="start"]',
            ]
            
            for selector in start_buttons:
                try:
                    button = await self.page.query_selector(selector)
                    if button:
                        await button.click()
                        logger.info(f"✅ Clicked start button: {selector}")
                        await asyncio.sleep(2)
                        return True
                except:
                    continue
            
            # If no start button found, we might already be working
            logger.info("ℹ️ No start button found - might already be working")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to start work: {e}")
            return False
    
    async def check_for_captcha(self) -> Optional[CaptchaTask]:
        """Check if there's a captcha waiting to be solved"""
        try:
            # Look for captcha image
            captcha_selectors = [
                'img[src*="captcha"]',
                'img[id*="captcha"]',
                '.captcha-image img',
                'img[alt*="captcha" i]',
                '.task-image img',
                'canvas',
            ]
            
            for selector in captcha_selectors:
                element = await self.page.query_selector(selector)
                if element:
                    # Get image data
                    src = await element.get_attribute("src")
                    if src and src.startswith("data:image"):
                        # Extract base64
                        image_data = src.split(",")[1]
                    elif src:
                        # Fetch image
                        image_data = await self._fetch_image(src)
                    else:
                        # Take screenshot of element
                        screenshot = await element.screenshot()
                        image_data = base64.b64encode(screenshot).decode()
                    
                    # Get task ID if available
                    task_id_elem = await self.page.query_selector("[data-task-id], [id*="task"]")
                    task_id = "unknown"
                    if task_id_elem:
                        task_id = await task_id_elem.get_attribute("data-task-id") or "unknown"
                    
                    return CaptchaTask(
                        task_id=task_id,
                        captcha_type="image",
                        image_data=image_data
                    )
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error checking for captcha: {e}")
            return None
    
    async def _fetch_image(self, src: str) -> str:
        """Fetch image from URL and return base64"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(src)
                return base64.b64encode(response.content).decode()
        except:
            return ""
    
    async def submit_solution(self, solution: str) -> bool:
        """Submit captcha solution"""
        try:
            # Look for input field
            input_selectors = [
                'input[name*="captcha" i]',
                'input[name*="answer" i]',
                'input[id*="captcha" i]',
                'input[placeholder*="captcha" i]',
                'input[type="text"]',
            ]
            
            for selector in input_selectors:
                try:
                    input_field = await self.page.query_selector(selector)
                    if input_field:
                        await input_field.fill(solution)
                        break
                except:
                    continue
            
            # Look for submit button
            submit_selectors = [
                'button[type="submit"]',
                'button:has-text("Submit")',
                'button:has-text("Send")',
                'button:has-text("OK")',
                'input[type="submit"]',
            ]
            
            for selector in submit_selectors:
                try:
                    submit_btn = await self.page.query_selector(selector)
                    if submit_btn:
                        await submit_btn.click()
                        logger.info(f"✅ Submitted solution: {solution}")
                        return True
                except:
                    continue
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Failed to submit solution: {e}")
            return False
    
    async def get_earnings(self) -> float:
        """Get current earnings from the page"""
        try:
            # Look for earnings/balance elements
            earning_selectors = [
                '.balance',
                '.earnings',
                '[class*="earning"]',
                '[id*="balance"]',
                '.stats .amount',
            ]
            
            for selector in earning_selectors:
                try:
                    elem = await self.page.query_selector(selector)
                    if elem:
                        text = await elem.inner_text()
                        # Extract number from text like "$0.50" or "0.50 USD"
                        import re
                        match = re.search(r'[\d.]+', text)
                        if match:
                            return float(match.group())
                except:
                    continue
            
            return 0.0
            
        except Exception as e:
            logger.error(f"❌ Failed to get earnings: {e}")
            return 0.0
    
    async def work_loop(self):
        """Main work loop - continuously solve captchas"""
        logger.info("🎯 Starting work loop...")
        self.is_running = True
        
        while self.is_running:
            try:
                # Check for captcha
                task = await self.check_for_captcha()
                
                if task:
                    logger.info(f"📸 Found captcha task: {task.task_id}")
                    
                    # Solve captcha using our solvers
                    solution = await self._solve_captcha(task)
                    
                    if solution:
                        # Submit solution
                        success = await self.submit_solution(solution)
                        
                        if success:
                            self.stats.total_solved += 1
                            logger.info(f"✅ Solved captcha: {solution}")
                        else:
                            self.stats.total_failed += 1
                            logger.warning("⚠️ Failed to submit solution")
                    else:
                        self.stats.total_failed += 1
                        logger.warning("⚠️ Could not solve captcha")
                
                else:
                    # No captcha available, wait a bit
                    await asyncio.sleep(1)
                
                # Update earnings periodically
                if self.stats.total_solved % 10 == 0:
                    self.stats.earnings_usd = await self.get_earnings()
                    logger.info(
                        f"💰 Stats: {self.stats.total_solved} solved, "
                        f"{self.stats.total_failed} failed, "
                        f"${self.stats.earnings_usd:.2f} earned"
                    )
                
            except Exception as e:
                logger.error(f"❌ Work loop error: {e}")
                await asyncio.sleep(5)
    
    async def _solve_captcha(self, task: CaptchaTask) -> Optional[str]:
        """Solve captcha using available solvers"""
        try:
            if task.captcha_type == "image" and task.image_data:
                # Use OCR solver
                from ..solvers.ocr_solver import OCRSolver
                solver = OCRSolver()
                result = solver.solve(base64.b64decode(task.image_data))
                return result.get("text", "")
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Solver error: {e}")
            return None
    
    async def stop(self):
        """Stop the worker"""
        logger.info("🛑 Stopping worker...")
        self.is_running = False
        
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        
        logger.info("✅ Worker stopped")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get current worker statistics"""
        return {
            "total_solved": self.stats.total_solved,
            "total_failed": self.stats.total_failed,
            "earnings_usd": self.stats.earnings_usd,
            "uptime_hours": self.stats.uptime_hours,
            "avg_per_hour": self.stats.avg_per_hour,
            "is_running": self.is_running,
            "username": self.username,
        }


async def main():
    """Test the worker"""
    # Get credentials from environment
    username = os.getenv("TWOCAPTCHA_USERNAME")
    password = os.getenv("TWOCAPTCHA_PASSWORD")
    
    if not username or not password:
        logger.error("❌ Please set TWOCAPTCHA_USERNAME and TWOCAPTCHA_PASSWORD")
        return
    
    worker = TwoCaptchaWorker(
        username=username,
        password=password,
        headless=False
    )
    
    # Initialize
    if not await worker.initialize():
        logger.error("❌ Failed to initialize")
        return
    
    # Login
    if not await worker.login():
        logger.error("❌ Failed to login")
        return
    
    # Start work
    if not await worker.start_work():
        logger.error("❌ Failed to start work")
        return
    
    # Run work loop
    try:
        await worker.work_loop()
    except KeyboardInterrupt:
        logger.info("⛔ Interrupted by user")
    finally:
        await worker.stop()


if __name__ == "__main__":
    asyncio.run(main())
