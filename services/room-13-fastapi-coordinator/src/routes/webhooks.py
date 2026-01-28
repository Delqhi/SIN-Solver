"""
Webhook System API Routes
Registration, management, and delivery of webhooks
"""

from fastapi import APIRouter, HTTPException, status, Query, Request
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel, HttpUrl
import logging
import uuid
import hashlib
import hmac
import httpx
import asyncio
import redis
import json
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

# Redis persistence configuration
REDIS_HOST = os.getenv("REDIS_HOST", "room-04-redis-cache")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB_WEBHOOKS = 3

redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB_WEBHOOKS, decode_responses=True)


def _get_all_webhooks():
    """Get all webhooks from Redis"""
    keys = redis_client.keys("webhook:*")
    return [json.loads(redis_client.get(k)) for k in keys if redis_client.get(k)]


def _get_webhook(webhook_id: str):
    """Get single webhook from Redis"""
    data = redis_client.get(f"webhook:{webhook_id}")
    return json.loads(data) if data else None


def _save_webhook(webhook_id: str, data: Dict):
    """Save webhook to Redis"""
    redis_client.set(f"webhook:{webhook_id}", json.dumps(data, default=str))


def _delete_webhook(webhook_id: str):
    """Delete webhook from Redis"""
    redis_client.delete(f"webhook:{webhook_id}")


def _get_all_deliveries(webhook_id: Optional[str] = None):
    """Get all deliveries from Redis, optionally filtered by webhook_id"""
    keys = redis_client.keys("delivery:*")
    deliveries = [json.loads(redis_client.get(k)) for k in keys if redis_client.get(k)]
    if webhook_id:
        deliveries = [d for d in deliveries if d.get("webhook_id") == webhook_id]
    return deliveries


def _save_delivery(delivery_id: str, data: Dict):
    """Save delivery to Redis"""
    redis_client.set(f"delivery:{delivery_id}", json.dumps(data, default=str))


class WebhookCreate(BaseModel):
    url: str  # HttpUrl causes issues, use str
    events: List[str]  # ["task.completed", "workflow.started", etc.]
    secret: Optional[str] = None
    headers: Dict[str, str] = {}
    description: Optional[str] = None
    enabled: bool = True


class WebhookUpdate(BaseModel):
    url: Optional[str] = None
    events: Optional[List[str]] = None
    secret: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None


class WebhookTest(BaseModel):
    event: str = "test"
    payload: Dict[str, Any] = {}


def generate_signature(payload: str, secret: str) -> str:
    """Generate HMAC-SHA256 signature for webhook payload"""
    return hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()


async def deliver_webhook(webhook: Dict, event: str, payload: Dict) -> Dict:
    """Deliver webhook payload to registered URL"""
    delivery_id = str(uuid.uuid4())
    payload_str = json.dumps(payload)
    
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-ID": webhook["id"],
        "X-Webhook-Event": event,
        "X-Delivery-ID": delivery_id,
        **webhook.get("headers", {})
    }
    
    if webhook.get("secret"):
        signature = generate_signature(payload_str, webhook["secret"])
        headers["X-Webhook-Signature"] = f"sha256={signature}"
    
    delivery = {
        "id": delivery_id,
        "webhook_id": webhook["id"],
        "event": event,
        "url": webhook["url"],
        "payload": payload,
        "headers": headers,
        "created_at": datetime.utcnow().isoformat(),
        "status": "pending",
        "response_code": None,
        "response_body": None,
        "error": None,
        "duration_ms": None
    }
    
    try:
        async with httpx.AsyncClient() as client:
            start_time = datetime.utcnow()
            
            response = await asyncio.wait_for(
                client.post(
                    webhook["url"],
                    content=payload_str,
                    headers=headers,
                    timeout=30.0
                ),
                timeout=35.0
            )
            
            duration = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            delivery["status"] = "success" if response.status_code < 400 else "failed"
            delivery["response_code"] = response.status_code
            delivery["response_body"] = response.text[:1000]
            delivery["duration_ms"] = duration
            
    except asyncio.TimeoutError:
        delivery["status"] = "failed"
        delivery["error"] = "Request timeout (30s)"
    except Exception as e:
        delivery["status"] = "failed"
        delivery["error"] = str(e)
    
    delivery["completed_at"] = datetime.utcnow().isoformat()
    _save_delivery(delivery_id, delivery)
    
    webhook["delivery_count"] = webhook.get("delivery_count", 0) + 1
    if delivery["status"] == "failed":
        webhook["failure_count"] = webhook.get("failure_count", 0) + 1
    webhook["last_delivery_at"] = delivery["completed_at"]
    _save_webhook(webhook["id"], webhook)
    
    return delivery


@router.post("")
async def create_webhook(webhook: WebhookCreate):
    """Register a new webhook"""
    webhook_id = str(uuid.uuid4())
    
    secret = webhook.secret or hashlib.sha256(uuid.uuid4().bytes).hexdigest()[:32]
    
    webhook_data = {
        "id": webhook_id,
        "url": str(webhook.url),
        "events": webhook.events,
        "secret": secret,
        "headers": webhook.headers,
        "description": webhook.description,
        "enabled": webhook.enabled,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "delivery_count": 0,
        "failure_count": 0,
        "last_delivery_at": None
    }
    
    _save_webhook(webhook_id, webhook_data)
    logger.info(f"Created webhook: {webhook_id} -> {webhook.url}")
    
    response = {**webhook_data}
    response["secret"] = secret[:8] + "..." if len(secret) > 8 else secret
    
    return response


@router.get("")
async def list_webhooks(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    event: Optional[str] = None,
    enabled_only: bool = False
):
    """List all webhooks with pagination"""
    webhooks = _get_all_webhooks()
    
    if event:
        webhooks = [w for w in webhooks if event in w.get("events", [])]
    
    if enabled_only:
        webhooks = [w for w in webhooks if w.get("enabled", True)]
    
    webhooks.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    total = len(webhooks)
    webhooks = webhooks[skip:skip + limit]
    
    for w in webhooks:
        if w.get("secret"):
            w["secret"] = w["secret"][:8] + "..."
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "webhooks": webhooks
    }


@router.get("/{webhook_id}")
async def get_webhook(webhook_id: str):
    """Get webhook by ID"""
    webhook = _get_webhook(webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail=f"Webhook not found: {webhook_id}")
    
    webhook = {**webhook}
    if webhook.get("secret"):
        webhook["secret"] = webhook["secret"][:8] + "..."
    
    return webhook


@router.put("/{webhook_id}")
async def update_webhook(webhook_id: str, update: WebhookUpdate):
    """Update webhook"""
    webhook = _get_webhook(webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail=f"Webhook not found: {webhook_id}")
    
    if update.url is not None:
        webhook["url"] = str(update.url)
    if update.events is not None:
        webhook["events"] = update.events
    if update.secret is not None:
        webhook["secret"] = update.secret
    if update.headers is not None:
        webhook["headers"] = update.headers
    if update.description is not None:
        webhook["description"] = update.description
    if update.enabled is not None:
        webhook["enabled"] = update.enabled
    
    webhook["updated_at"] = datetime.utcnow().isoformat()
    
    _save_webhook(webhook_id, webhook)
    logger.info(f"Updated webhook: {webhook_id}")
    
    response = {**webhook}
    if response.get("secret"):
        response["secret"] = response["secret"][:8] + "..."
    
    return response


@router.delete("/{webhook_id}")
async def delete_webhook(webhook_id: str):
    """Delete webhook"""
    webhook = _get_webhook(webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail=f"Webhook not found: {webhook_id}")
    
    _delete_webhook(webhook_id)
    logger.info(f"Deleted webhook: {webhook_id}")
    
    return {"status": "deleted", "webhook_id": webhook_id}


@router.post("/{webhook_id}/test")
async def test_webhook(webhook_id: str, test: WebhookTest):
    """Test webhook delivery"""
    webhook = _get_webhook(webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail=f"Webhook not found: {webhook_id}")
    
    payload = {
        "event": test.event,
        "timestamp": datetime.utcnow().isoformat(),
        "test": True,
        "data": test.payload
    }
    
    delivery = await deliver_webhook(webhook, test.event, payload)
    
    return {
        "status": delivery["status"],
        "delivery": delivery
    }


@router.get("/{webhook_id}/deliveries")
async def get_webhook_deliveries(
    webhook_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = None
):
    """Get webhook delivery history"""
    webhook = _get_webhook(webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail=f"Webhook not found: {webhook_id}")
    
    deliveries = _get_all_deliveries(webhook_id)
    
    if status_filter:
        deliveries = [d for d in deliveries if d.get("status") == status_filter]
    
    deliveries.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    total = len(deliveries)
    deliveries = deliveries[skip:skip + limit]
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "deliveries": deliveries
    }


@router.post("/{webhook_id}/toggle")
async def toggle_webhook(webhook_id: str):
    """Toggle webhook enabled/disabled"""
    webhook = _get_webhook(webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail=f"Webhook not found: {webhook_id}")
    
    webhook["enabled"] = not webhook.get("enabled", True)
    webhook["updated_at"] = datetime.utcnow().isoformat()
    
    _save_webhook(webhook_id, webhook)
    
    status = "enabled" if webhook["enabled"] else "disabled"
    logger.info(f"Toggled webhook {webhook_id}: {status}")
    
    return {"webhook_id": webhook_id, "enabled": webhook["enabled"], "status": status}


async def trigger_webhooks(event: str, payload: Dict) -> List[Dict]:
    """Trigger all webhooks for a given event"""
    results = []
    
    for webhook in _get_all_webhooks():
        if not webhook.get("enabled", True):
            continue
        if event not in webhook.get("events", []):
            continue
        
        delivery = await deliver_webhook(webhook, event, payload)
        results.append(delivery)
    
    return results
