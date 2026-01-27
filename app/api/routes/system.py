from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import logging
from app.core.redis_cache import RedisCache

logger = logging.getLogger(__name__)
router = APIRouter()

class SystemState(BaseModel):
    auto_work_enabled: bool
    target_url: str = "https://sin-solver.local"
    mode: str = "stealth"

@router.get("/state", response_model=SystemState)
async def get_system_state():
    redis = await RedisCache.get_instance()
    state = await redis.get_json("system:state")
    if not state:
        return SystemState(auto_work_enabled=False)
    return SystemState(**state)

@router.post("/state")
async def update_system_state(state: SystemState):
    redis = await RedisCache.get_instance()
    await redis.set_json("system:state", state.dict())
    return {"status": "updated", "state": state}

@router.post("/workflow")
async def save_workflow(workflow: Dict[str, Any]):
    redis = await RedisCache.get_instance()
    await redis.set_json("system:workflow", workflow)
    logger.info("Workflow saved to Redis")
    return {"status": "saved"}

@router.post("/workflow/test")
async def test_workflow(workflow: Dict[str, Any]):
    # In a real system, this would push a task to the queue
    logger.info(f"Test run initiated for workflow with {len(workflow.get('nodes', []))} nodes")
    return {"status": "initiated"}
