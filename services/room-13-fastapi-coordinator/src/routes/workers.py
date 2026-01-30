"""
Zimmer-13 API Coordinator - Workers Route
Handles worker registration, heartbeat, and status updates
Redis persistence (db=5)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime
from enum import Enum
import uuid
import redis
import json
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/workers", tags=["workers"])

# Redis configuration
REDIS_HOST = os.getenv("REDIS_HOST", "room-04-redis-cache")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = 5

try:
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)
    redis_client.ping()
    logger.info(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT} (db={REDIS_DB})")
except Exception as e:
    logger.error(f"Failed to connect to Redis: {e}")
    raise


# Helper functions for Redis operations
def _get_all_workers():
    """Get all workers from Redis"""
    keys = redis_client.keys("worker:*")
    workers = []
    for key in keys:
        data = redis_client.get(key)
        if data:
            workers.append(json.loads(data))
    return workers


def _get_worker(worker_id: str):
    """Get a specific worker from Redis"""
    data = redis_client.get(f"worker:{worker_id}")
    return json.loads(data) if data else None


def _save_worker(worker_id: str, worker_data: Dict[str, Any]):
    """Save worker to Redis"""
    redis_client.set(f"worker:{worker_id}", json.dumps(worker_data, default=str))


def _delete_worker(worker_id: str):
    """Delete worker from Redis"""
    redis_client.delete(f"worker:{worker_id}")


class WorkerType(str, Enum):
    GENERAL = "general"
    SURVEY = "survey"
    CAPTCHA = "captcha"
    BROWSER = "browser"
    SCRAPER = "scraper"


class WorkerStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"
    ERROR = "error"


class WorkerRegister(BaseModel):
    """Worker registration request"""

    name: str = Field(..., min_length=1, max_length=255)
    type: WorkerType = WorkerType.GENERAL
    capabilities: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class WorkerResponse(BaseModel):
    """Worker response"""

    id: str
    name: str
    type: WorkerType
    status: WorkerStatus
    capabilities: List[str]
    metadata: Dict[str, Any]
    registered_at: datetime
    last_heartbeat: datetime
    tasks_completed: int = 0
    tasks_failed: int = 0


class WorkerUpdate(BaseModel):
    """Worker status update"""

    status: Optional[WorkerStatus] = None
    metadata: Optional[Dict[str, Any]] = None
    current_task: Optional[str] = None


class HeartbeatResponse(BaseModel):
    """Heartbeat response"""

    status: str = "ok"
    worker_id: str
    timestamp: datetime


@router.post("", response_model=WorkerResponse)
async def register_worker(worker: WorkerRegister):
    """Register a new worker"""
    worker_id = str(uuid.uuid4())
    now = datetime.utcnow()

    worker_data = {
        "id": worker_id,
        "name": worker.name,
        "type": worker.type,
        "status": WorkerStatus.ONLINE,
        "capabilities": worker.capabilities,
        "metadata": worker.metadata,
        "registered_at": now,
        "last_heartbeat": now,
        "tasks_completed": 0,
        "tasks_failed": 0,
    }

    _save_worker(worker_id, worker_data)
    logger.info(f"Registered worker: {worker_id} ({worker.name})")

    return WorkerResponse(**worker_data)


@router.get("", response_model=List[WorkerResponse])
async def list_workers():
    """List all registered workers"""
    workers_list = _get_all_workers()
    return [WorkerResponse(**w) for w in workers_list]


@router.get("/{worker_id}", response_model=WorkerResponse)
async def get_worker(worker_id: str):
    """Get worker by ID"""
    worker = _get_worker(worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker not found: {worker_id}")

    return WorkerResponse(**worker)


@router.put("/{worker_id}", response_model=WorkerResponse)
async def update_worker(worker_id: str, update: WorkerUpdate):
    """Update worker status"""
    worker = _get_worker(worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker not found: {worker_id}")

    if update.status is not None:
        worker["status"] = update.status

    if update.metadata is not None:
        worker["metadata"].update(update.metadata)

    if update.current_task is not None:
        worker["metadata"]["current_task"] = update.current_task

    worker["last_heartbeat"] = datetime.utcnow()

    _save_worker(worker_id, worker)

    return WorkerResponse(**worker)


@router.post("/{worker_id}/heartbeat", response_model=HeartbeatResponse)
async def worker_heartbeat(worker_id: str):
    """Worker heartbeat"""
    worker = _get_worker(worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker not found: {worker_id}")

    worker["last_heartbeat"] = datetime.utcnow()
    worker["status"] = WorkerStatus.ONLINE

    _save_worker(worker_id, worker)

    return HeartbeatResponse(status="ok", worker_id=worker_id, timestamp=datetime.utcnow())


@router.delete("/{worker_id}")
async def unregister_worker(worker_id: str):
    """Unregister a worker"""
    worker = _get_worker(worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker not found: {worker_id}")

    _delete_worker(worker_id)
    logger.info(f"Unregistered worker: {worker_id}")

    return {"status": "ok", "message": f"Worker {worker_id} unregistered"}


@router.post("/{worker_id}/task/complete")
async def task_completed(worker_id: str, success: bool = True):
    """Record task completion"""
    worker = _get_worker(worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker not found: {worker_id}")

    if success:
        worker["tasks_completed"] += 1
    else:
        worker["tasks_failed"] += 1

    worker["status"] = WorkerStatus.ONLINE
    worker["last_heartbeat"] = datetime.utcnow()

    _save_worker(worker_id, worker)

    return {
        "status": "ok",
        "tasks_completed": worker["tasks_completed"],
        "tasks_failed": worker["tasks_failed"],
    }


@router.get("/stats/summary")
async def worker_stats():
    """Get worker statistics summary"""
    workers_list = _get_all_workers()
    total = len(workers_list)
    online = sum(1 for w in workers_list if w["status"] == WorkerStatus.ONLINE)
    busy = sum(1 for w in workers_list if w["status"] == WorkerStatus.BUSY)
    offline = sum(1 for w in workers_list if w["status"] == WorkerStatus.OFFLINE)

    total_completed = sum(w["tasks_completed"] for w in workers_list)
    total_failed = sum(w["tasks_failed"] for w in workers_list)

    return {
        "total_workers": total,
        "online": online,
        "busy": busy,
        "offline": offline,
        "total_tasks_completed": total_completed,
        "total_tasks_failed": total_failed,
        "timestamp": datetime.utcnow().isoformat(),
    }
