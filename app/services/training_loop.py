#!/usr/bin/env python3
"""
🔄 REAL-TIME TRAINING LOOP - CEO 2026
=====================================
Continuous Learning System
Feeds successful solves back into the training database.
Auto-labels data based on solver consensus and verification.
"""

import asyncio
import logging
import base64
import hashlib
from datetime import datetime
from typing import Dict, Any, Optional

from app.models.captcha_intelligence import CaptchaTrainingData, CaptchaType, CaptchaSolveAttempt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
from app.core.config import settings

logger = logging.getLogger("TrainingLoop")

class TrainingLoop:
    """
    Continuous Training & Feedback Loop
    """
    
    def __init__(self):
        self.db_url = settings.database_url or "postgresql+asyncpg://ceo_admin:secure_ceo_password_2026@172.20.0.11:5432/sin_solver_production"
        self.engine = create_async_engine(self.db_url, echo=False)
        self.AsyncSessionLocal = sessionmaker(self.engine, class_=AsyncSession, expire_on_commit=False)
        self.queue = asyncio.Queue()
        self.is_running = False

    async def start_background_processor(self):
        """Start the background processing loop"""
        self.is_running = True
        logger.info("🔄 Training Loop Background Processor Started")
        while self.is_running:
            try:
                item = await self.queue.get()
                await self._process_feedback(item)
                self.queue.task_done()
            except Exception as e:
                logger.error(f"❌ Error in training loop: {e}")

    async def record_attempt(
        self, 
        image_b64: str, 
        captcha_type: str, 
        solution: str, 
        solver_used: str,
        confidence: float,
        solve_duration_ms: int = 0
    ) -> str:
        """
        Record a solve attempt (before verification)
        Returns: attempt_id
        """
        async with self.AsyncSessionLocal() as session:
            try:
                # Find type ID
                res = await session.execute(select(CaptchaType).filter_by(name=captcha_type))
                ctype = res.scalars().first()
                type_id = ctype.id if ctype else None
                
                attempt = CaptchaSolveAttempt(
                    captcha_type_id=type_id,
                    solver_used=solver_used,
                    solve_duration_ms=solve_duration_ms,
                    success=False, # Unknown yet
                    confidence_score=confidence,
                    timestamp=datetime.utcnow()
                )
                session.add(attempt)
                await session.commit()
                await session.refresh(attempt)
                return str(attempt.id)
            except Exception as e:
                logger.error(f"Failed to record attempt: {e}")
                return ""

    async def report_success(
        self, 
        attempt_id: str, 
        image_b64: str, 
        captcha_type: str,
        solution: str,
        verification_method: str = "submit_success"
    ):
        """
        Report a confirmed successful solve.
        This triggers the "Training" aspect - saving the image + label.
        """
        if not attempt_id:
            return

        # Queue for background processing to not block the solver
        await self.queue.put({
            "type": "success",
            "attempt_id": attempt_id,
            "image_b64": image_b64,
            "captcha_type": captcha_type,
            "solution": solution,
            "verification_method": verification_method
        })

    async def _process_feedback(self, item: Dict[str, Any]):
        """Process verified data"""
        async with self.AsyncSessionLocal() as session:
            try:
                # 1. Update Attempt Status
                attempt_id = item["attempt_id"]
                # (Assuming UUID or int ID)
                # await session.execute(update(CaptchaSolveAttempt)...) 
                # For now just log it as we need proper ID handling
                
                # 2. Save to Training Data (The Gold Mine)
                image_data = base64.b64decode(item["image_b64"])
                image_hash = hashlib.sha256(image_data).hexdigest()
                
                # Check if already exists
                res = await session.execute(select(CaptchaTrainingData).filter_by(screenshot_hash=image_hash))
                if res.scalars().first():
                    logger.debug("Duplicate training data, skipping")
                    return

                # Get Type ID
                res = await session.execute(select(CaptchaType).filter_by(name=item["captcha_type"]))
                ctype = res.scalars().first()
                if not ctype:
                    return

                training_entry = CaptchaTrainingData(
                    captcha_type_id=ctype.id,
                    screenshot=image_data,
                    screenshot_hash=image_hash,
                    label=item["solution"],
                    is_verified=True, # Confirmed by success
                    verification_method=item["verification_method"],
                    solve_method="auto_verified",
                    collected_at=datetime.utcnow()
                )
                
                session.add(training_entry)
                await session.commit()
                logger.info(f"💎 [TrainingLoop] Learned new {item['captcha_type']} sample: {item['solution']}")

            except Exception as e:
                logger.error(f"Failed to process training feedback: {e}")
                await session.rollback()

# Singleton
_training_loop = None

def get_training_loop() -> TrainingLoop:
    global _training_loop
    if not _training_loop:
        _training_loop = TrainingLoop()
    return _training_loop
