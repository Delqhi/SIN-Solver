from fastapi import APIRouter, HTTPException
import docker
from typing import List, Dict, Any
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

def get_docker_client():
    try:
        return docker.from_env()
    except Exception as e:
        logger.error(f"Failed to connect to Docker socket: {e}")
        return None

class WorkerStatus(BaseModel):
    id: str
    name: str
    status: str
    image: str

class ScaleRequest(BaseModel):
    replicas: int

@router.get("/", response_model=List[WorkerStatus])
async def get_workers():
    client = get_docker_client()
    if not client:
        raise HTTPException(status_code=503, detail="Docker integration not available in this room.")
        
    try:
         containers = client.containers.list(filters={"name": "solver-14-worker-arbeiter"})
        workers = []
        for c in containers:
            workers.append(WorkerStatus(
                id=c.short_id,
                name=c.name,
                status=c.status.upper(),
                image=c.image.tags[0] if c.image.tags else "unknown"
            ))
        return workers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/scale")
async def scale_workers(request: ScaleRequest):
    return {"message": "Scaling via API is limited. Please use CLI.", "target": request.replicas}

@router.post("/{worker_id}/restart")
async def restart_worker(worker_id: str):
    client = get_docker_client()
    if not client: raise HTTPException(status_code=503, detail="Docker offline")
    try:
        container = client.containers.get(worker_id)
        container.restart()
        return {"status": "restarted", "id": worker_id}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Worker not found: {e}")

@router.post("/{worker_id}/stop")
async def stop_worker(worker_id: str):
    client = get_docker_client()
    if not client: raise HTTPException(status_code=503, detail="Docker offline")
    try:
        container = client.containers.get(worker_id)
        container.stop()
        return {"status": "stopped", "id": worker_id}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Worker not found: {e}")
