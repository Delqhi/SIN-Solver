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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])

# In-memory storage (will be replaced with Redis persistence)
workflows_db: Dict[str, Dict] = {}


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
    
    workflows_db[workflow_id] = workflow_data
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
    workflows = list(workflows_db.values())
    
    # Filter by enabled status
    if enabled_only:
        workflows = [w for w in workflows if w.get("enabled", True)]
    
    # Search by name or description
    if search:
        search_lower = search.lower()
        workflows = [
            w for w in workflows
            if search_lower in w.get("name", "").lower()
            or search_lower in (w.get("description") or "").lower()
        ]
    
    # Sort by created_at descending
    workflows.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # Paginate
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
    if workflow_id not in workflows_db:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {workflow_id}")
    
    return workflows_db[workflow_id]


@router.put("/{workflow_id}")
async def update_workflow(workflow_id: str, update: WorkflowUpdate):
    """Update workflow"""
    if workflow_id not in workflows_db:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {workflow_id}")
    
    workflow = workflows_db[workflow_id]
    
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
    
    logger.info(f"Updated workflow: {workflow_id}")
    return workflow


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete workflow"""
    if workflow_id not in workflows_db:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {workflow_id}")
    
    workflow = workflows_db.pop(workflow_id)
    logger.info(f"Deleted workflow: {workflow['name']} ({workflow_id})")
    
    return {"status": "deleted", "workflow_id": workflow_id}


@router.post("/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, execute: WorkflowExecute):
    """Execute a workflow"""
    if workflow_id not in workflows_db:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {workflow_id}")
    
    workflow = workflows_db[workflow_id]
    
    if not workflow.get("enabled", True):
        raise HTTPException(status_code=400, detail="Workflow is disabled")
    
    execution_id = str(uuid.uuid4())
    
    # Update execution stats
    workflow["execution_count"] = workflow.get("execution_count", 0) + 1
    workflow["last_executed_at"] = datetime.utcnow().isoformat()
    
    # TODO: Implement actual workflow execution with step-by-step processing
    # For now, return execution info
    
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
    if workflow_id not in workflows_db:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {workflow_id}")
    
    workflow = workflows_db[workflow_id]
    workflow["enabled"] = not workflow.get("enabled", True)
    workflow["updated_at"] = datetime.utcnow().isoformat()
    
    status = "enabled" if workflow["enabled"] else "disabled"
    logger.info(f"Toggled workflow {workflow_id}: {status}")
    
    return {"workflow_id": workflow_id, "enabled": workflow["enabled"], "status": status}


@router.post("/{workflow_id}/duplicate")
async def duplicate_workflow(workflow_id: str, new_name: Optional[str] = None):
    """Duplicate a workflow"""
    if workflow_id not in workflows_db:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {workflow_id}")
    
    original = workflows_db[workflow_id]
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
    
    workflows_db[new_id] = duplicate
    logger.info(f"Duplicated workflow {workflow_id} to {new_id}")
    
    return duplicate
