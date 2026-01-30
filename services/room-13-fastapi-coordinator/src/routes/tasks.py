from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime
from enum import Enum
import uuid
import redis
import json
import os

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

REDIS_HOST = os.getenv("REDIS_HOST", "room-04-redis-cache")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB_TASKS = 4

redis_client = redis.Redis(
    host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB_TASKS, decode_responses=True
)


def _get_all_tasks():
    """Get all tasks from Redis"""
    keys = redis_client.keys("task:*")
    return [json.loads(redis_client.get(k)) for k in keys if redis_client.get(k)]


def _get_task(task_id: str):
    """Get single task from Redis"""
    data = redis_client.get(f"task:{task_id}")
    return json.loads(data) if data else None


def _save_task(task_id: str, data: Dict):
    """Save task to Redis"""
    redis_client.set(f"task:{task_id}", json.dumps(data, default=str))


class TaskStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(default="general")
    priority: TaskPriority = TaskPriority.NORMAL
    payload: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    assigned_worker: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    name: str
    type: str
    status: TaskStatus
    priority: TaskPriority
    payload: Dict[str, Any]
    metadata: Dict[str, Any]
    assigned_worker: Optional[str]
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@router.post("", response_model=TaskResponse)
async def create_task(task: TaskCreate):
    task_id = str(uuid.uuid4())
    now = datetime.utcnow()

    task_data = {
        "id": task_id,
        "name": task.name,
        "type": task.type,
        "status": TaskStatus.PENDING,
        "priority": task.priority,
        "payload": task.payload,
        "metadata": task.metadata,
        "assigned_worker": task.assigned_worker,
        "created_at": now,
        "started_at": None,
        "completed_at": None,
        "result": None,
        "error": None,
    }

    _save_task(task_id, task_data)
    return TaskResponse(**task_data)


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    status: Optional[TaskStatus] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    worker_id: Optional[str] = Query(None),
):
    result = []
    for t in _get_all_tasks():
        if status and t["status"] != status:
            continue
        if worker_id and t.get("assigned_worker") != worker_id:
            continue
        result.append(TaskResponse(**t))
        if len(result) >= limit:
            break
    return result


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    task = _get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")
    return TaskResponse(**task)


@router.put("/{task_id}/assign")
async def assign_task(task_id: str, worker_id: str):
    task = _get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")

    if task["status"] != TaskStatus.PENDING:
        raise HTTPException(status_code=400, detail="Task not available for assignment")

    task["assigned_worker"] = worker_id
    task["status"] = TaskStatus.ASSIGNED

    _save_task(task_id, task)

    return {"status": "ok", "task_id": task_id, "worker_id": worker_id}


@router.put("/{task_id}/start")
async def start_task(task_id: str):
    task = _get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")

    task["status"] = TaskStatus.RUNNING
    task["started_at"] = datetime.utcnow()

    _save_task(task_id, task)

    return {"status": "ok", "task_id": task_id}


@router.put("/{task_id}/complete")
async def complete_task(task_id: str, result: Dict[str, Any] = None, error: str = None):
    task = _get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")

    task["completed_at"] = datetime.utcnow()

    if error:
        task["status"] = TaskStatus.FAILED
        task["error"] = error
    else:
        task["status"] = TaskStatus.COMPLETED
        task["result"] = result or {}

    _save_task(task_id, task)

    return {"status": "ok", "task_id": task_id, "final_status": task["status"]}


@router.delete("/{task_id}")
async def cancel_task(task_id: str):
    task = _get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")

    if task["status"] in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Task already finished")

    task["status"] = TaskStatus.CANCELLED
    task["completed_at"] = datetime.utcnow()

    _save_task(task_id, task)

    return {"status": "ok", "task_id": task_id}
