"""
N8N Gateway API Routes
Proxy to n8n's REST API for workflow management via AI/Chat
"""

from fastapi import APIRouter, HTTPException, status, Query, Body
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
import httpx
import asyncio
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/n8n", tags=["n8n"])

# N8N Configuration
N8N_BASE_URL = os.getenv("N8N_URL", "http://agent-01-n8n-orchestrator:5678")
N8N_API_KEY = os.getenv("N8N_API_KEY", "")  # Optional API key


def get_n8n_headers() -> Dict[str, str]:
    """Get headers for n8n API requests"""
    headers = {"Content-Type": "application/json"}
    if N8N_API_KEY:
        headers["X-N8N-API-KEY"] = N8N_API_KEY
    return headers


async def n8n_request(
    method: str,
    path: str,
    data: Optional[Dict] = None,
    timeout: float = 30.0
) -> Dict:
    """Make request to n8n API"""
    url = f"{N8N_BASE_URL}/api/v1{path}"
    headers = get_n8n_headers()
    
    async with httpx.AsyncClient() as client:
        try:
            if method.upper() == "GET":
                response = await asyncio.wait_for(
                    client.get(url, headers=headers, timeout=timeout),
                    timeout=timeout + 5
                )
            elif method.upper() == "POST":
                response = await asyncio.wait_for(
                    client.post(url, json=data, headers=headers, timeout=timeout),
                    timeout=timeout + 5
                )
            elif method.upper() == "PUT":
                response = await asyncio.wait_for(
                    client.put(url, json=data, headers=headers, timeout=timeout),
                    timeout=timeout + 5
                )
            elif method.upper() == "PATCH":
                response = await asyncio.wait_for(
                    client.patch(url, json=data, headers=headers, timeout=timeout),
                    timeout=timeout + 5
                )
            elif method.upper() == "DELETE":
                response = await asyncio.wait_for(
                    client.delete(url, headers=headers, timeout=timeout),
                    timeout=timeout + 5
                )
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            if response.status_code >= 400:
                logger.error(f"N8N API error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"N8N API error: {response.text}"
                )
            
            return response.json() if response.text else {}
            
        except asyncio.TimeoutError:
            logger.error(f"N8N request timeout: {path}")
            raise HTTPException(status_code=504, detail="N8N request timeout")
        except httpx.ConnectError:
            logger.error(f"N8N connection error: {N8N_BASE_URL}")
            raise HTTPException(status_code=503, detail="N8N service unavailable")


@router.get("/status")
async def n8n_status():
    """Get n8n instance status"""
    try:
        # Try to ping n8n
        async with httpx.AsyncClient() as client:
            response = await asyncio.wait_for(
                client.get(f"{N8N_BASE_URL}/healthz", timeout=10.0),
                timeout=15.0
            )
            
            return {
                "status": "connected" if response.status_code == 200 else "degraded",
                "url": N8N_BASE_URL,
                "response_code": response.status_code,
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        return {
            "status": "disconnected",
            "url": N8N_BASE_URL,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


# ============ WORKFLOW MANAGEMENT ============

@router.get("/workflows")
async def list_n8n_workflows(
    active: Optional[bool] = None,
    tags: Optional[str] = None
):
    """List all n8n workflows"""
    path = "/workflows"
    params = []
    if active is not None:
        params.append(f"active={str(active).lower()}")
    if tags:
        params.append(f"tags={tags}")
    if params:
        path += "?" + "&".join(params)
    
    result = await n8n_request("GET", path)
    return result


@router.get("/workflows/{workflow_id}")
async def get_n8n_workflow(workflow_id: str):
    """Get n8n workflow by ID"""
    result = await n8n_request("GET", f"/workflows/{workflow_id}")
    return result


@router.post("/workflows")
async def create_n8n_workflow(workflow: Dict[str, Any] = Body(...)):
    """Create a new n8n workflow"""
    result = await n8n_request("POST", "/workflows", workflow)
    logger.info(f"Created n8n workflow: {result.get('id')}")
    return result


@router.put("/workflows/{workflow_id}")
async def update_n8n_workflow(workflow_id: str, workflow: Dict[str, Any] = Body(...)):
    """Update n8n workflow"""
    result = await n8n_request("PUT", f"/workflows/{workflow_id}", workflow)
    logger.info(f"Updated n8n workflow: {workflow_id}")
    return result


@router.delete("/workflows/{workflow_id}")
async def delete_n8n_workflow(workflow_id: str):
    """Delete n8n workflow"""
    result = await n8n_request("DELETE", f"/workflows/{workflow_id}")
    logger.info(f"Deleted n8n workflow: {workflow_id}")
    return {"status": "deleted", "workflow_id": workflow_id}


@router.post("/workflows/{workflow_id}/activate")
async def activate_n8n_workflow(workflow_id: str):
    """Activate n8n workflow"""
    result = await n8n_request("PATCH", f"/workflows/{workflow_id}", {"active": True})
    logger.info(f"Activated n8n workflow: {workflow_id}")
    return result


@router.post("/workflows/{workflow_id}/deactivate")
async def deactivate_n8n_workflow(workflow_id: str):
    """Deactivate n8n workflow"""
    result = await n8n_request("PATCH", f"/workflows/{workflow_id}", {"active": False})
    logger.info(f"Deactivated n8n workflow: {workflow_id}")
    return result


# ============ WORKFLOW EXECUTION ============

@router.post("/workflows/{workflow_id}/execute")
async def execute_n8n_workflow(
    workflow_id: str,
    data: Dict[str, Any] = Body(default={})
):
    """Execute n8n workflow manually with optional input data"""
    result = await n8n_request(
        "POST",
        f"/workflows/{workflow_id}/execute",
        data,
        timeout=120.0  # Longer timeout for execution
    )
    logger.info(f"Executed n8n workflow: {workflow_id}")
    return result


# ============ EXECUTIONS ============

@router.get("/executions")
async def list_n8n_executions(
    workflow_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100)
):
    """List n8n workflow executions"""
    path = f"/executions?limit={limit}"
    if workflow_id:
        path += f"&workflowId={workflow_id}"
    if status:
        path += f"&status={status}"
    
    result = await n8n_request("GET", path)
    return result


@router.get("/executions/{execution_id}")
async def get_n8n_execution(execution_id: str):
    """Get n8n execution details"""
    result = await n8n_request("GET", f"/executions/{execution_id}")
    return result


@router.delete("/executions/{execution_id}")
async def delete_n8n_execution(execution_id: str):
    """Delete n8n execution"""
    result = await n8n_request("DELETE", f"/executions/{execution_id}")
    return {"status": "deleted", "execution_id": execution_id}


# ============ CREDENTIALS ============

@router.get("/credentials")
async def list_n8n_credentials():
    """List all n8n credentials (without sensitive data)"""
    result = await n8n_request("GET", "/credentials")
    return result


@router.post("/credentials")
async def create_n8n_credential(credential: Dict[str, Any] = Body(...)):
    """Create n8n credential"""
    result = await n8n_request("POST", "/credentials", credential)
    logger.info(f"Created n8n credential: {result.get('id')}")
    return result


@router.delete("/credentials/{credential_id}")
async def delete_n8n_credential(credential_id: str):
    """Delete n8n credential"""
    result = await n8n_request("DELETE", f"/credentials/{credential_id}")
    return {"status": "deleted", "credential_id": credential_id}


# ============ TAGS ============

@router.get("/tags")
async def list_n8n_tags():
    """List all n8n tags"""
    result = await n8n_request("GET", "/tags")
    return result


@router.post("/tags")
async def create_n8n_tag(name: str = Body(..., embed=True)):
    """Create n8n tag"""
    result = await n8n_request("POST", "/tags", {"name": name})
    return result


# ============ WEBHOOK TRIGGERS ============

@router.get("/webhook-urls/{workflow_id}")
async def get_n8n_webhook_urls(workflow_id: str):
    """Get webhook URLs for a workflow (if it has webhook triggers)"""
    workflow = await n8n_request("GET", f"/workflows/{workflow_id}")
    
    webhook_urls = []
    nodes = workflow.get("nodes", [])
    
    for node in nodes:
        if node.get("type") == "n8n-nodes-base.webhook":
            webhook_path = node.get("parameters", {}).get("path", "")
            webhook_urls.append({
                "node_name": node.get("name"),
                "path": webhook_path,
                "url": f"{N8N_BASE_URL}/webhook/{webhook_path}",
                "test_url": f"{N8N_BASE_URL}/webhook-test/{webhook_path}"
            })
    
    return {
        "workflow_id": workflow_id,
        "workflow_name": workflow.get("name"),
        "webhook_urls": webhook_urls
    }
