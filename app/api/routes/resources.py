from fastapi import APIRouter, HTTPException
import psutil
import os

router = APIRouter()

@router.get("/")
async def get_resources():
    """
    Returns the current system resource usage (CPU, Memory) 
    and estimates remaining worker capacity.
    """
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        
        # Estimate: Each worker needs ~500MB RAM and ~10% CPU (conservative)
        # M1 Max/Pro usually has plenty of CPU, RAM is the bottleneck.
        available_ram_mb = memory.available / (1024 * 1024)
        worker_ram_cost = 500 # MB
        
        max_workers_by_ram = int(available_ram_mb / worker_ram_cost)
        max_workers_by_cpu = int((100 - cpu_percent) / 5) # Assuming 5% CPU per worker
        
        recommended_workers = min(max_workers_by_ram, max_workers_by_cpu)
        
        return {
            "cpu_usage": cpu_percent,
            "memory_usage": memory.percent,
            "available_ram_mb": available_ram_mb,
            "estimated_capacity": recommended_workers,
            "status": "Healthy" if memory.percent < 90 else "Critical"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
