"""
Zimmer-13 API Coordinator - Workers Route
Handles worker registration, heartbeat, and status updates
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime
from enum import Enum
import uuid

router = APIRouter(prefix="/api/workers", tags=["workers"])

# In-memory worker storage (would be Redis/DB in production)
workers: Dict[str, Dict[str, Any]] = {}


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
    
    workers[worker_id] = worker_data
    
    return WorkerResponse(**worker_data)


@router.get("", response_model=List[WorkerResponse])
async def list_workers():
    """List all registered workers"""
    return [WorkerResponse(**w) for w in workers.values()]


@router.get("/{worker_id}", response_model=WorkerResponse)
async def get_worker(worker_id: str):
    """Get worker by ID"""
    if worker_id not in workers:
        raise HTTPException(status_code=404, detail=f"Worker not found: {worker_id}")
    
    return WorkerResponse(**workers[worker_id])


@router.put("/{worker_id}", response_model=WorkerResponse)
async def update_worker(worker_id: str, update: WorkerUpdate):
    """Update worker status"""
    if worker_id not in workers:
        raise HTTPException(status_code=404, detail=f"Worker not found: {worker_id}")
    
    worker = workers[worker_id]
    
    if update.status is not None:
        worker["status"] = update.status
    
    if update.metadata is not None:
        worker["metadata"].update(update.metadata)
    
    if update.current_task is not None:
        worker["metadata"]["current_task"] = update.current_task
    
    worker["last_heartbeat"] = datetime.utcnow()
    
    return WorkerResponse(**worker)


@router.post("/{worker_id}/heartbeat", response_model=HeartbeatResponse)
async def worker_heartbeat(worker_id: str):
    """Worker heartbeat"""
    if worker_id not in workers:
        raise HTTPException(status_code=404, detail=f"Worker not found: {worker_id}")
    
    workers[worker_id]["last_heartbeat"] = datetime.utcnow()
    workers[worker_id]["status"] = WorkerStatus.ONLINE
    
    return HeartbeatResponse(
        status="ok",
        worker_id=worker_id,
        timestamp=datetime.utcnow()
    )


@router.delete("/{worker_id}")
async def unregister_worker(worker_id: str):
    """Unregister a worker"""
    if worker_id not in workers:
        raise HTTPException(status_code=404, detail=f"Worker not found: {worker_id}")
    
    del workers[worker_id]
    
    return {"status": "ok", "message": f"Worker {worker_id} unregistered"}


@router.post("/{worker_id}/task/complete")
async def task_completed(worker_id: str, success: bool = True):
    """Record task completion"""
    if worker_id not in workers:
        raise HTTPException(status_code=404, detail=f"Worker not found: {worker_id}")
    
    if success:
        workers[worker_id]["tasks_completed"] += 1
    else:
        workers[worker_id]["tasks_failed"] += 1
    
    workers[worker_id]["status"] = WorkerStatus.ONLINE
    workers[worker_id]["last_heartbeat"] = datetime.utcnow()
    
    return {
        "status": "ok",
        "tasks_completed": workers[worker_id]["tasks_completed"],
        "tasks_failed": workers[worker_id]["tasks_failed"]
    }


@router.get("/stats/summary")
async def worker_stats():
    """Get worker statistics summary"""
    total = len(workers)
    online = sum(1 for w in workers.values() if w["status"] == WorkerStatus.ONLINE)
    busy = sum(1 for w in workers.values() if w["status"] == WorkerStatus.BUSY)
    offline = sum(1 for w in workers.values() if w["status"] == WorkerStatus.OFFLINE)
    
    total_completed = sum(w["tasks_completed"] for w in workers.values())
    total_failed = sum(w["tasks_failed"] for w in workers.values())
    
    return {
        "total_workers": total,
        "online": online,
        "busy": busy,
        "offline": offline,
        "total_tasks_completed": total_completed,
        "total_tasks_failed": total_failed,
        "timestamp": datetime.utcnow().isoformat()
    }
