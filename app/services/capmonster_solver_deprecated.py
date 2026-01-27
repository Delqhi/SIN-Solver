"""
CapMonster Cloud CAPTCHA Solver Integration
Fallback solver for complex CAPTCHAs when SiliconFlow fails
"""
import base64
import time
import logging
import uuid
import asyncio
from typing import Dict, Optional, Any
from pydantic import BaseModel
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = logging.getLogger(__name__)


class CapMonsterSolution(BaseModel):
    """CapMonster solution response model"""
    solution: str
    confidence: float
    time_ms: int
    model: str
    cost: float
    task_id: Optional[str] = None
    error: Optional[str] = None


class CapMonsterSolver:
    """
    CapMonster Cloud CAPTCHA Solver Integration
    
    Features:
    - Human-powered solving (98% accuracy)
    - Paid service (~$0.002 per CAPTCHA)
    - Fallback when SiliconFlow fails
    - Supports image and text CAPTCHAs
    - Polling for solution status
    """
    
    def __init__(self):
        """Initialize CapMonster client"""
        self.api_key = settings.capmonster_api_key
        self.endpoint = settings.capmonster_endpoint
        self.result_endpoint = "https://api.capmonster.cloud/getTaskResult"
        
        # Statistics
        self.stats = {
            "requests": 0,
            "successes": 0,
            "failures": 0,
            "total_time_ms": 0,
            "total_cost": 0.0
        }
        
        # Task types for different CAPTCHA types
        self.task_types = {
            "image": "ImageToTextTask",
            "text": "NoCaptchaTaskProxyless",  # For text-based CAPTCHAs
            "recaptcha": "RecaptchaV2TaskProxyless",
            "hcaptcha": "HCaptchaTaskProxyless",
            "turnstile": "TurnstileTaskProxyless"
        }
        
        logger.info("CapMonster solver initialized")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True
    )
    async def _create_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create CAPTCHA solving task"""
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "clientKey": self.api_key,
            "task": task_data,
            "softId": 0  # No soft ID
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.endpoint,
                json=payload,
                headers=headers
            )
            
            response.raise_for_status()
            result = response.json()
            
            if result.get("errorId") != 0:
                raise ValueError(f"CapMonster error: {result.get('errorDescription', 'Unknown error')}")
            
            return result
    
    @retry(
        stop=stop_after_attempt(60),  # Poll for up to 60 attempts
        wait=wait_exponential(multiplier=1, min=1, max=5),
        reraise=True
    )
    async def _get_result(self, task_id: str) -> Dict[str, Any]:
        """Get task result with polling"""
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "clientKey": self.api_key,
            "taskId": task_id
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.result_endpoint,
                json=payload,
                headers=headers
            )
            
            response.raise_for_status()
            result = response.json()
            
            if result.get("errorId") != 0:
                raise ValueError(f"CapMonster error: {result.get('errorDescription', 'Unknown error')}")
            
            return result
    
    async def solve_recaptcha(self, sitekey: str, page_url: str) -> CapMonsterSolution:
        """Solve reCAPTCHA v2/v3 with CapMonster"""
        start_time = time.time()
        self.stats["requests"] += 1

        try:
            task_data = {
                "type": "RecaptchaV2TaskProxyless",
                "websiteURL": page_url,
                "websiteKey": sitekey
            }

            # Create task
            task_result = await self._create_task(task_data)
            task_id = task_result["taskId"]

            logger.info(f"CapMonster created reCAPTCHA task {task_id}")

            # Poll for result
            for _ in range(60):  # Up to 5 minutes
                await asyncio.sleep(5)

                result_response = await self._get_result(task_id)
                if result_response["status"] == "ready":
                    token = result_response["solution"]["gRecaptchaResponse"]

                    time_ms = int((time.time() - start_time) * 1000)
                    cost = result_response.get("cost", 0.003)

                    self.stats["successes"] += 1
                    self.stats["total_time_ms"] += time_ms
                    self.stats["total_cost"] += cost

                    logger.info(f"CapMonster solved reCAPTCHA in {time_ms}ms (cost: ${cost})")

                    return CapMonsterSolution(
                        solution=token,
                        confidence=0.98,
                        time_ms=time_ms,
                        model="capmonster-recaptcha",
                        cost=cost,
                        task_id=str(task_id)
                    )

            # Timeout
            self.stats["failures"] += 1
            return CapMonsterSolution(
                solution="",
                confidence=0.0,
                time_ms=int((time.time() - start_time) * 1000),
                model="capmonster",
                cost=0.0,
                error="Timeout"
            )

        except Exception as e:
            self.stats["failures"] += 1
            time_ms = int((time.time() - start_time) * 1000)

            logger.error(f"CapMonster reCAPTCHA failed after {time_ms}ms: {e}")

            return CapMonsterSolution(
                solution="",
                confidence=0.0,
                time_ms=time_ms,
                model="capmonster",
                cost=0.0,
                error=str(e)
            )

    async def solve_image(self, image_base64: str, captcha_type: str = "auto") -> CapMonsterSolution:
        """
        Solve image-based CAPTCHA using CapMonster
        
        Args:
            image_base64: Base64 encoded image
            captcha_type: "text", "math", "auto"
            
        Returns:
            CapMonsterSolution with extracted text
        """
        start_time = time.time()
        self.stats["requests"] += 1
        
        try:
            # Create task for image CAPTCHA
            task_data = {
                "type": self.task_types["image"],
                "body": image_base64,
                "case": True,  # Case sensitive
                "numeric": 0,  # Not numeric only
                "math": 1 if captcha_type == "math" else 0  # Handle math CAPTCHAs
            }
            
            # Create task
            task_result = await self._create_task(task_data)
            task_id = task_result["taskId"]
            
            logger.info(f"CapMonster created task {task_id} for image CAPTCHA")
            
            # Poll for result
            result = await self._get_result(task_id)
            
            # Extract solution
            if result["status"] == "ready":
                solution = result["solution"]["text"]
                cost = result.get("cost", 0.002)  # Default cost
                
                # Clean up solution
                solution = self._clean_solution(solution)
                
                # Calculate metrics
                time_ms = int((time.time() - start_time) * 1000)
                confidence = 0.98  # CapMonster has high accuracy
                
                self.stats["successes"] += 1
                self.stats["total_time_ms"] += time_ms
                self.stats["total_cost"] += cost
                
                logger.info(f"CapMonster solved image CAPTCHA in {time_ms}ms: '{solution}' (cost: ${cost})")
                
                return CapMonsterSolution(
                    solution=solution,
                    confidence=confidence,
                    time_ms=time_ms,
                    model="capmonster",
                    cost=cost,
                    task_id=str(task_id)
                )
            else:
                raise ValueError(f"Task not ready: {result.get('status', 'unknown')}")
                
        except Exception as e:
            self.stats["failures"] += 1
            time_ms = int((time.time() - start_time) * 1000)
            
            logger.error(f"CapMonster image solve failed after {time_ms}ms: {e}")
            
            return CapMonsterSolution(
                solution="",
                confidence=0.0,
                time_ms=time_ms,
                model="capmonster",
                cost=0.0,
                error=str(e)
            )
    
    async def solve_text(self, question: str) -> CapMonsterSolution:
        """
        Solve text-based CAPTCHA using CapMonster
        
        Args:
            question: Text question or math problem
            
        Returns:
            CapMonsterSolution with answer
        """
        start_time = time.time()
        self.stats["requests"] += 1
        
        try:
            # For text CAPTCHAs, we'll use a custom approach
            # CapMonster doesn't have a direct text solver, so we'll
            # create an image from the text and solve it
            
            # Create a simple text image (this is a simplified approach)
            # In production, you might want to use PIL to create a proper image
            import io
            from PIL import Image, ImageDraw, ImageFont
            
            # Create image from text
            img = Image.new('RGB', (300, 100), color='white')
            draw = ImageDraw.Draw(img)
            
            # Use default font (in production, use a proper font file)
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/arial.ttf", 24)
            except:
                font = ImageFont.load_default()
            
            draw.text((10, 10), question, fill='black', font=font)
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            image_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            # Solve as image CAPTCHA
            result = await self.solve_image(image_base64, "math")
            
            # Update task_id for text solving
            if result.solution and not result.error:
                logger.info(f"CapMonster solved text CAPTCHA: '{question}' -> '{result.solution}'")
            
            return result
            
        except Exception as e:
            self.stats["failures"] += 1
            time_ms = int((time.time() - start_time) * 1000)
            
            logger.error(f"CapMonster text solve failed after {time_ms}ms: {e}")
            
            return CapMonsterSolution(
                solution="",
                confidence=0.0,
                time_ms=time_ms,
                model="capmonster",
                cost=0.0,
                error=str(e)
            )
    
    def _clean_solution(self, solution: str) -> str:
        """Clean up CapMonster solution"""
        # Remove extra whitespace and common artifacts
        solution = solution.strip()
        
        # Remove common prefixes
        prefixes_to_remove = [
            "Result:", "Answer:", "Solution:", "Text:", "Output:"
        ]
        
        for prefix in prefixes_to_remove:
            if solution.lower().startswith(prefix.lower()):
                solution = solution[len(prefix):].strip()
        
        return solution
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get solver statistics"""
        avg_time = self.stats["total_time_ms"] / max(1, self.stats["successes"])
        success_rate = self.stats["successes"] / max(1, self.stats["requests"])
        
        return {
            "solver": "capmonster",
            "requests": self.stats["requests"],
            "successes": self.stats["successes"],
            "failures": self.stats["failures"],
            "success_rate": round(success_rate, 3),
            "avg_response_time_ms": round(avg_time, 1),
            "total_cost": round(self.stats["total_cost"], 4),
            "avg_cost_per_solve": round(self.stats["total_cost"] / max(1, self.stats["successes"]), 4)
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Check if CapMonster service is healthy"""
        try:
            # Test with a simple math problem
            test_result = await self.solve_text("1 + 1 = ?")
            
            return {
                "status": "healthy" if test_result.solution and not test_result.error else "unhealthy",
                "last_test": {
                    "solution": test_result.solution,
                    "confidence": test_result.confidence,
                    "time_ms": test_result.time_ms,
                    "cost": test_result.cost,
                    "error": test_result.error
                }
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    async def get_balance(self) -> Dict[str, Any]:
        """Get CapMonster account balance"""
        try:
            headers = {
                "Content-Type": "application/json"
            }
            
            payload = {
                "clientKey": self.api_key
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.capmonster.cloud/getBalance",
                    json=payload,
                    headers=headers
                )
                
                response.raise_for_status()
                result = response.json()
                
                if result.get("errorId") != 0:
                    raise ValueError(f"CapMonster error: {result.get('errorDescription', 'Unknown error')}")
                
                return {
                    "status": "success",
                    "balance": result.get("balance", 0.0),
                    "currency": "USD"
                }
                
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }


# Singleton instance
_capmonster_solver = None

async def get_capmonster_solver() -> CapMonsterSolver:
    """Get or create CapMonster solver instance"""
    global _capmonster_solver
    if _capmonster_solver is None:
        _capmonster_solver = CapMonsterSolver()
    return _capmonster_solver