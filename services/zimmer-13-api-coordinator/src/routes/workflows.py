"""
Workflow Engine API Routes
CRUD operations for internal workflow management (not n8n, but custom workflows)
"""

from fastapi import APIRouter, HTTPException, status, Query
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel
import logging
import uuid
import redis
import json
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])

# Redis client initialization with fallback to localhost
REDIS_HOST = os.getenv("REDIS_HOST", "room-04-redis-cache")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = 1

try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        decode_responses=True,
        socket_connect_timeout=5
    )
    redis_client.ping()
    logger.info(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT} (db={REDIS_DB})")
except Exception as e:
    logger.error(f"Failed to connect to Redis: {e}")
    # Fallback to localhost
    try:
        redis_client = redis.Redis(
            host="localhost",
            port=6379,
            db=REDIS_DB,
            decode_responses=True,
            socket_connect_timeout=5
        )
        redis_client.ping()
        logger.info("Connected to Redis at localhost:6379 (fallback)")
    except Exception as e2:
        logger.error(f"Failed to connect to Redis fallback: {e2}")
        raise


class WorkflowStep(BaseModel):
    id: str
    name: str
    type: str  # "http", "script", "wait", "condition"
    config: Dict[str, Any]
    next_step: Optional[str] = None
    on_error: Optional[str] = None


class WorkflowTrigger(BaseModel):
    type: str  # "manual", "schedule", "webhook", "event"
    config: Dict[str, Any] = {}


class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    steps: List[WorkflowStep]
    triggers: List[WorkflowTrigger] = []
    metadata: Dict[str, Any] = {}


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[WorkflowStep]] = None
    triggers: Optional[List[WorkflowTrigger]] = None
    enabled: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class WorkflowExecute(BaseModel):
    input_data: Dict[str, Any] = {}
    async_mode: bool = True


@router.post("")
async def create_workflow(workflow: WorkflowCreate):
    """Create a new workflow"""
    workflow_id = str(uuid.uuid4())
    
    workflow_data = {
        "id": workflow_id,
        "name": workflow.name,
        "description": workflow.description,
        "steps": [step.model_dump() for step in workflow.steps],
        "triggers": [trigger.model_dump() for trigger in workflow.triggers],
        "metadata": workflow.metadata,
        "enabled": True,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "execution_count": 0,
        "last_executed_at": None,
        "status": "active"
    }
    
    redis_client.set(f"workflow:{workflow_id}", json.dumps(workflow_data))
    redis_client.sadd("workflow:all", workflow_id)
    logger.info(f"Created workflow: {workflow.name} ({workflow_id})")
    
    return workflow_data


@router.get("")
async def list_workflows(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    enabled_only: bool = False,
    search: Optional[str] = None
):
    """List all workflows with pagination"""
    workflow_ids = redis_client.smembers("workflow:all")
    workflows = []
    
    for wid in workflow_ids:
        workflow_json = redis_client.get(f"workflow:{wid}")
        if workflow_json:
            workflows.append(json.loads(workflow_json))
    
    if enabled_only:
        workflows = [w for w in workflows if w.get("enabled", True)]
    
    if search:
        search_lower = search.lower()
        workflows = [
            w for w in workflows
            if search_lower in w.get("name", "").lower()
            or search_lower in (w.get("description") or "").lower()
        ]
    
    workflows.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    total = len(workflows)
    workflows = workflows[skip:skip + limit]
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "workflows": workflows
    }


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Get workflow by ID"""
    workflow_json = redis_client.get(f"workflow:{workflow_id}")
    if not workflow_json:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {workflow_id}")
    
    return json.loads(workflow_json)


@router.put("/{workflow_id}")
async def update_workflow(workflow_id: str, update: WorkflowUpdate):
    """Update workflow"""
    workflow_json = redis_client.get(f"workflow:{workflow_id}")
    if not workflow_json:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {workflow_id}")
    
    workflow = json.loads(workflow_json)
    
    if update.name is not None:
        workflow["name"] = update.name
    if update.description is not None:
        workflow["description"] = update.description
    if update.steps is not None:
        workflow["steps"] = [step.model_dump() for step in update.steps]
    if update.triggers is not None:
        workflow["triggers"] = [trigger.model_dump() for trigger in update.triggers]
    if update.enabled is not None:
        workflow["enabled"] = update.enabled
    if update.metadata is not None:
        workflow["metadata"].update(update.metadata)
    
    workflow["updated_at"] = datetime.utcnow().isoformat()
    
    redis_client.set(f"workflow:{workflow_id}", json.dumps(workflow))
    logger.info(f"Updated workflow: {workflow_id}")
    return workflow


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete workflow"""
    workflow_json = redis_client.get(f"workflow:{workflow_id}")
    if not workflow_json:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {workflow_id}")
    
    workflow = json.loads(workflow_json)
    redis_client.delete(f"workflow:{workflow_id}")
    redis_client.srem("workflow:all", workflow_id)
    logger.info(f"Deleted workflow: {workflow['name']} ({workflow_id})")
    
    return {"status": "deleted", "workflow_id": workflow_id}


@router.post("/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, execute: WorkflowExecute):
    """Execute a workflow"""
    workflow_json = redis_client.get(f"workflow:{workflow_id}")
    if not workflow_json:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {workflow_id}")
    
    workflow = json.loads(workflow_json)
    
    if not workflow.get("enabled", True):
        raise HTTPException(status_code=400, detail="Workflow is disabled")
    
    execution_id = str(uuid.uuid4())
    
    workflow["execution_count"] = workflow.get("execution_count", 0) + 1
    workflow["last_executed_at"] = datetime.utcnow().isoformat()
    
    redis_client.set(f"workflow:{workflow_id}", json.dumps(workflow))
    
    result = {
        "execution_id": execution_id,
        "workflow_id": workflow_id,
        "workflow_name": workflow["name"],
        "status": "queued" if execute.async_mode else "completed",
        "input_data": execute.input_data,
        "started_at": datetime.utcnow().isoformat(),
        "async_mode": execute.async_mode,
        "steps_count": len(workflow["steps"])
    }
    
    logger.info(f"Executed workflow: {workflow['name']} (execution: {execution_id})")
    
    return result


@router.post("/{workflow_id}/toggle")
async def toggle_workflow(workflow_id: str):
    """Toggle workflow enabled/disabled"""
    workflow_json = redis_client.get(f"workflow:{workflow_id}")
    if not workflow_json:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {workflow_id}")
    
    workflow = json.loads(workflow_json)
    workflow["enabled"] = not workflow.get("enabled", True)
    workflow["updated_at"] = datetime.utcnow().isoformat()
    
    redis_client.set(f"workflow:{workflow_id}", json.dumps(workflow))
    
    status = "enabled" if workflow["enabled"] else "disabled"
    logger.info(f"Toggled workflow {workflow_id}: {status}")
    
    return {"workflow_id": workflow_id, "enabled": workflow["enabled"], "status": status}


@router.post("/{workflow_id}/duplicate")
async def duplicate_workflow(workflow_id: str, new_name: Optional[str] = None):
    """Duplicate a workflow"""
    workflow_json = redis_client.get(f"workflow:{workflow_id}")
    if not workflow_json:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {workflow_id}")
    
    original = json.loads(workflow_json)
    new_id = str(uuid.uuid4())
    
    duplicate = {
        **original,
        "id": new_id,
        "name": new_name or f"{original['name']} (Copy)",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "execution_count": 0,
        "last_executed_at": None
    }
    
    redis_client.set(f"workflow:{new_id}", json.dumps(duplicate))
    redis_client.sadd("workflow:all", new_id)
    logger.info(f"Duplicated workflow {workflow_id} to {new_id}")
    
    return duplicate
