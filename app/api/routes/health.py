from fastapi import APIRouter
import asyncio
import socket
import httpx
from typing import Dict, List
from app.core.config import settings

router = APIRouter()

ROOMS = [
    {"id": "01", "name": "n8n Manager", "ip": "172.20.0.30", "port": 5678},
    {"id": "03", "name": "Agent Zero", "ip": "172.20.0.50", "port": 8000},
    {"id": "05", "name": "Steel Browser", "ip": "172.20.0.20", "port": 3000},
    {"id": "06", "name": "Skyvern Eye", "ip": "172.20.0.51", "port": 8000},
    {"id": "10", "name": "Library (DB)", "ip": "172.20.0.12", "port": 5432},
    {"id": "11", "name": "Dashboard", "ip": "172.20.0.40", "port": 3000},
    {"id": "15", "name": "SurfSense", "ip": "172.20.0.60", "port": 3000},
]

async def check_port(ip: str, port: int) -> bool:
    try:
        _, writer = await asyncio.wait_for(asyncio.open_connection(ip, port), timeout=1.0)
        writer.close()
        await writer.wait_closed()
        return True
    except:
        return False

@router.get("/")
async def health():
    return {"status": "healthy", "service": "sin-solver-orchestrator"}

@router.get("/rooms")
async def room_status():
    results = []
    for room in ROOMS:
        is_up = await check_port(room["ip"], room["port"])
        results.append({
            **room,
            "status": "UP" if is_up else "DOWN"
        })
    return results
