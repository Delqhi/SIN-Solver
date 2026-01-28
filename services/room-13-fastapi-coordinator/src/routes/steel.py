"""
Steel Browser Gateway API Routes
Proxy to Steel Browser for browser automation control
"""

from fastapi import APIRouter, HTTPException, status, Query, Body
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
import httpx
import asyncio
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/steel", tags=["steel"])

# Steel Browser Configuration
STEEL_BASE_URL = os.getenv("STEEL_URL", "http://agent-05-steel-browser:3000")
STEEL_CDP_URL = os.getenv("STEEL_CDP_URL", "ws://agent-05-steel-browser:9222")


async def steel_request(
    method: str,
    path: str,
    data: Optional[Dict] = None,
    timeout: float = 30.0
) -> Dict:
    """Make request to Steel Browser API"""
    url = f"{STEEL_BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    
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
            elif method.upper() == "DELETE":
                response = await asyncio.wait_for(
                    client.delete(url, headers=headers, timeout=timeout),
                    timeout=timeout + 5
                )
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            if response.status_code >= 400:
                logger.error(f"Steel API error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Steel API error: {response.text}"
                )
            
            return response.json() if response.text else {}
            
        except asyncio.TimeoutError:
            logger.error(f"Steel request timeout: {path}")
            raise HTTPException(status_code=504, detail="Steel request timeout")
        except httpx.ConnectError:
            logger.error(f"Steel connection error: {STEEL_BASE_URL}")
            raise HTTPException(status_code=503, detail="Steel service unavailable")


@router.get("/status")
async def steel_status():
    """Get Steel Browser status"""
    try:
        async with httpx.AsyncClient() as client:
            response = await asyncio.wait_for(
                client.get(f"{STEEL_BASE_URL}/health", timeout=10.0),
                timeout=15.0
            )
            
            return {
                "status": "connected" if response.status_code == 200 else "degraded",
                "url": STEEL_BASE_URL,
                "cdp_url": STEEL_CDP_URL,
                "response_code": response.status_code,
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        return {
            "status": "disconnected",
            "url": STEEL_BASE_URL,
            "cdp_url": STEEL_CDP_URL,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


# ============ SESSION MANAGEMENT ============

@router.post("/sessions")
async def create_steel_session(
    stealth: bool = True,
    proxy: Optional[str] = None,
    user_agent: Optional[str] = None,
    viewport: Optional[Dict[str, int]] = None
):
    """Create new Steel Browser session"""
    session_config = {
        "stealth": stealth,
        "options": {}
    }
    
    if proxy:
        session_config["options"]["proxy"] = proxy
    if user_agent:
        session_config["options"]["userAgent"] = user_agent
    if viewport:
        session_config["options"]["viewport"] = viewport
    
    result = await steel_request("POST", "/v1/sessions", session_config)
    logger.info(f"Created Steel session: {result.get('sessionId')}")
    return result


@router.get("/sessions")
async def list_steel_sessions():
    """List all active Steel Browser sessions"""
    result = await steel_request("GET", "/v1/sessions")
    return result


@router.get("/sessions/{session_id}")
async def get_steel_session(session_id: str):
    """Get Steel Browser session details"""
    result = await steel_request("GET", f"/v1/sessions/{session_id}")
    return result


@router.delete("/sessions/{session_id}")
async def delete_steel_session(session_id: str):
    """Close and delete Steel Browser session"""
    result = await steel_request("DELETE", f"/v1/sessions/{session_id}")
    logger.info(f"Deleted Steel session: {session_id}")
    return {"status": "deleted", "session_id": session_id}


# ============ PAGE OPERATIONS ============

@router.post("/sessions/{session_id}/navigate")
async def navigate_steel_page(
    session_id: str,
    url: str = Body(..., embed=True),
    wait_until: str = Body("load", embed=True)  # load, domcontentloaded, networkidle
):
    """Navigate to URL in Steel Browser session"""
    result = await steel_request(
        "POST",
        f"/v1/sessions/{session_id}/navigate",
        {"url": url, "waitUntil": wait_until},
        timeout=60.0
    )
    logger.info(f"Navigated Steel session {session_id} to {url}")
    return result


@router.post("/sessions/{session_id}/screenshot")
async def take_steel_screenshot(
    session_id: str,
    full_page: bool = False,
    selector: Optional[str] = None
):
    """Take screenshot in Steel Browser session"""
    data = {"fullPage": full_page}
    if selector:
        data["selector"] = selector
    
    result = await steel_request(
        "POST",
        f"/v1/sessions/{session_id}/screenshot",
        data,
        timeout=30.0
    )
    return result


@router.post("/sessions/{session_id}/pdf")
async def generate_steel_pdf(
    session_id: str,
    format: str = "A4",
    print_background: bool = True
):
    """Generate PDF from Steel Browser session"""
    result = await steel_request(
        "POST",
        f"/v1/sessions/{session_id}/pdf",
        {"format": format, "printBackground": print_background},
        timeout=60.0
    )
    return result


@router.get("/sessions/{session_id}/content")
async def get_steel_page_content(session_id: str):
    """Get page HTML content from Steel Browser session"""
    result = await steel_request("GET", f"/v1/sessions/{session_id}/content")
    return result


@router.post("/sessions/{session_id}/evaluate")
async def evaluate_steel_script(
    session_id: str,
    script: str = Body(..., embed=True)
):
    """Execute JavaScript in Steel Browser session"""
    result = await steel_request(
        "POST",
        f"/v1/sessions/{session_id}/evaluate",
        {"script": script},
        timeout=30.0
    )
    return result


# ============ INTERACTION ============

@router.post("/sessions/{session_id}/click")
async def click_steel_element(
    session_id: str,
    selector: str = Body(..., embed=True)
):
    """Click element in Steel Browser session"""
    result = await steel_request(
        "POST",
        f"/v1/sessions/{session_id}/click",
        {"selector": selector},
        timeout=30.0
    )
    return result


@router.post("/sessions/{session_id}/type")
async def type_steel_text(
    session_id: str,
    selector: str = Body(...),
    text: str = Body(...),
    delay: int = Body(50)  # ms between keystrokes
):
    """Type text into element in Steel Browser session"""
    result = await steel_request(
        "POST",
        f"/v1/sessions/{session_id}/type",
        {"selector": selector, "text": text, "delay": delay},
        timeout=30.0
    )
    return result


@router.post("/sessions/{session_id}/select")
async def select_steel_option(
    session_id: str,
    selector: str = Body(...),
    value: str = Body(...)
):
    """Select option from dropdown in Steel Browser session"""
    result = await steel_request(
        "POST",
        f"/v1/sessions/{session_id}/select",
        {"selector": selector, "value": value},
        timeout=30.0
    )
    return result


@router.post("/sessions/{session_id}/wait")
async def wait_steel_selector(
    session_id: str,
    selector: str = Body(..., embed=True),
    timeout_ms: int = Body(30000)
):
    """Wait for selector to appear in Steel Browser session"""
    result = await steel_request(
        "POST",
        f"/v1/sessions/{session_id}/wait",
        {"selector": selector, "timeout": timeout_ms},
        timeout=timeout_ms / 1000 + 5
    )
    return result


# ============ COOKIES & STORAGE ============

@router.get("/sessions/{session_id}/cookies")
async def get_steel_cookies(session_id: str):
    """Get all cookies from Steel Browser session"""
    result = await steel_request("GET", f"/v1/sessions/{session_id}/cookies")
    return result


@router.post("/sessions/{session_id}/cookies")
async def set_steel_cookies(
    session_id: str,
    cookies: List[Dict[str, Any]] = Body(...)
):
    """Set cookies in Steel Browser session"""
    result = await steel_request(
        "POST",
        f"/v1/sessions/{session_id}/cookies",
        {"cookies": cookies}
    )
    return result


@router.delete("/sessions/{session_id}/cookies")
async def clear_steel_cookies(session_id: str):
    """Clear all cookies in Steel Browser session"""
    result = await steel_request("DELETE", f"/v1/sessions/{session_id}/cookies")
    return {"status": "cleared", "session_id": session_id}


# ============ CDP ENDPOINT ============

@router.get("/cdp-endpoint")
async def get_steel_cdp_endpoint():
    """Get CDP WebSocket endpoint for direct browser control"""
    return {
        "cdp_url": STEEL_CDP_URL,
        "protocol": "Chrome DevTools Protocol",
        "usage": "Connect with Playwright or Puppeteer using this WebSocket URL"
    }


@router.get("/sessions/{session_id}/cdp")
async def get_session_cdp_endpoint(session_id: str):
    """Get CDP endpoint for specific session"""
    result = await steel_request("GET", f"/v1/sessions/{session_id}")
    
    return {
        "session_id": session_id,
        "cdp_url": result.get("cdpUrl") or f"{STEEL_CDP_URL}/devtools/browser/{session_id}",
        "ws_endpoint": result.get("wsEndpoint")
    }
