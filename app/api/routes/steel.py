import httpx
from fastapi import APIRouter, HTTPException, Request
from typing import List, Dict, Any

router = APIRouter()

# Internal Docker URL for backend-to-backend communication
STEEL_INTERNAL_URL = "http://Zimmer-05-Steel-Tarnkappe:3000"

@router.get("/sessions")
async def get_sessions(request: Request):
    """Proxy to get active sessions from Steel Browser and enrich with viewer URLs."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{STEEL_INTERNAL_URL}/v1/sessions", timeout=5.0)
            resp.raise_for_status()
            data = resp.json()
            
            sessions = data if isinstance(data, list) else data.get("sessions", [])
            
            # Determine the appropriate host for the session viewer
            # If accessed via LAN IP (e.g. 192.168.178.21), use that.
            # If accessed via Docker network, use the internal service name.
            request_host = request.url.hostname
            
            # Default to the request host (external LAN IP usually)
            viewer_host = request_host
            
            # If internal, use the container name
            if request_host in ["Zimmer-13-API-Koordinator", "172.20.0.31", "localhost", "127.0.0.1"]:
                viewer_host = "Zimmer-05-Steel-Tarnkappe"
                
            processed_sessions = []
            for session in sessions:
                session_id = session.get("id")
                if session_id:
                    # Construct viewer URL based on the detected host
                    session["sessionViewerUrl"] = f"http://{viewer_host}:3000/v1/sessions/{session_id}/viewer"
                processed_sessions.append(session)
                
            return processed_sessions
    except Exception as e:
        # If Steel is down or unreachable, return empty list
        return []
