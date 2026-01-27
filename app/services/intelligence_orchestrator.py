
import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib
import base64

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.models.captcha_intelligence import CaptchaTrainingData, CaptchaSolveAttempt, CaptchaType

logger = logging.getLogger(__name__)

class IntelligenceOrchestrator:
    """
    🧠 CEO EMPIRE STATE MANDATE 2026: GREY ZONE INTELLIGENCE
    Manages the learning loop between solve attempts and model guidance.
    """
    
    def __init__(self):
        self.db_url = settings.database_url or "postgresql+asyncpg://ceo_admin:secure_ceo_password_2026@172.20.0.11:5432/sin_solver_production"
        self.engine = create_async_engine(self.db_url, echo=False)
        self.AsyncSessionLocal = sessionmaker(self.engine, class_=AsyncSession, expire_on_commit=False)

    async def record_attempt(self, attempt_data: Dict[str, Any]):
        """Record a solve attempt for future learning"""
        async with self.AsyncSessionLocal() as session:
            try:
                attempt = CaptchaSolveAttempt(
                    worker_id=attempt_data.get("worker_id", "master"),
                    captcha_type_id=attempt_data.get("captcha_type_id"),
                    detected_type=attempt_data.get("detected_type"),
                    solver_strategy=attempt_data.get("solver_strategy"),
                    primary_solver=attempt_data.get("primary_solver"),
                    solution_provided=attempt_data.get("solution_provided"),
                    solve_time_ms=attempt_data.get("solve_time_ms"),
                    was_successful=attempt_data.get("was_successful"),
                    target_url=attempt_data.get("target_url"),
                    attempted_at=datetime.utcnow()
                )
                session.add(attempt)
                await session.commit()
            except Exception as e:
                logger.error(f"Failed to record solve attempt: {e}")
                await session.rollback()

    async def get_few_shot_context(self, captcha_type: str, count: int = 3) -> List[Dict[str, Any]]:
        """Retrieve successful past solves for few-shot prompting"""
        async with self.AsyncSessionLocal() as session:
            try:
                type_result = await session.execute(select(CaptchaType).filter_by(name=captcha_type))
                c_type = type_result.scalars().first()
                if not c_type: return []

                samples_result = await session.execute(
                    select(CaptchaTrainingData)
                    .filter_by(captcha_type_id=c_type.id, was_correct=True)
                    .limit(count)
                )
                samples = samples_result.scalars().all()
                
                return [
                    {
                        "image_b64": base64.b64encode(s.screenshot).decode(),
                        "solution": s.solution
                    }
                    for s in samples
                ]
            except Exception as e:
                logger.error(f"Failed to retrieve few-shot context: {e}")
                return []

_orchestrator = None
def get_intelligence_orchestrator() -> IntelligenceOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = IntelligenceOrchestrator()
    return _orchestrator
