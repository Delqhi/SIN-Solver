# SIN-Solver Enterprise API Documentation

> **Version:** 2.1.0 Enterprise  
> **Base URL:** `https://api.sin-solver.io`  
> **Protocol:** HTTPS / TLS 1.3  
> **OpenAPI:** 3.1.0  
> **AsyncAPI:** 2.6.0  
> **Last Updated:** February 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limits & Quotas](#rate-limits--quotas)
4. [API Versions](#api-versions)
5. [Endpoints Reference](#endpoints-reference)
6. [WebSocket API](#websocket-api)
7. [GraphQL API](#graphql-api)
8. [Webhook Integration](#webhook-integration)
9. [Error Handling](#error-handling)
10. [SDK Examples](#sdk-examples)
11. [Postman Collection](#postman-collection)
12. [Changelog](#changelog)

---

## Overview

The SIN-Solver Enterprise API provides programmatic access to the world's most advanced CAPTCHA solving engine. Built for scale, security, and reliability.

### Key Features

- **Multi-AI Consensus Engine:** 5 parallel solvers with weighted voting
- **Sub-10s Average Latency:** p50 < 8.5s, p99 < 25s
- **99.99% Uptime SLA:** Enterprise-grade availability
- **Global Edge Network:** 50+ PoPs worldwide
- **SOC 2 Type II Certified:** Security you can trust
- **GDPR Compliant:** EU data residency available

### Supported CAPTCHA Types

| Type | Solve Rate | Avg Latency | Cost/Solve |
|------|------------|-------------|------------|
| reCAPTCHA v2 | 98.5% | 8.2s | $0.018 |
| reCAPTCHA v3 | 97.2% | 3.1s | $0.012 |
| hCaptcha | 96.8% | 10.4s | $0.020 |
| Cloudflare Turnstile | 95.5% | 5.3s | $0.015 |
| FunCaptcha | 94.2% | 12.1s | $0.022 |
| Text/Image CAPTCHA | 99.1% | 2.3s | $0.008 |
| Slider CAPTCHA | 97.8% | 4.2s | $0.014 |
| Click-Order | 96.5% | 8.7s | $0.019 |
| GeeTest | 93.8% | 14.2s | $0.025 |
| KeyCAPTCHA | 92.4% | 11.8s | $0.024 |

---

## Authentication

SIN-Solver Enterprise API supports multiple authentication methods for different use cases.

### API Key Authentication (Recommended)

Include your API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: sin_live_abc123xyz789" \
     https://api.sin-solver.io/v2/solve
```

### JWT Bearer Token

For session-based authentication, use OAuth 2.0 flow:

```bash
# 1. Request access token
curl -X POST https://api.sin-solver.io/v2/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"

# 2. Use the token
curl -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..." \
     https://api.sin-solver.io/v2/solve
```

### HMAC Signature (Enterprise)

For maximum security, use HMAC-SHA256 request signing:

```python
import hmac
import hashlib
import base64
from datetime import datetime, timezone

def sign_request(api_secret, method, path, body=None):
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    string_to_sign = f"{method}\n{path}\n{timestamp}\n{body or ''}"
    signature = hmac.new(
        api_secret.encode(),
        string_to_sign.encode(),
        hashlib.sha256
    ).hexdigest()
    return timestamp, signature

# Usage
timestamp, signature = sign_request(
    api_secret='sin_secret_xyz789',
    method='POST',
    path='/v2/solve',
    body=json.dumps(payload)
)

headers = {
    'X-API-Key': 'sin_live_abc123',
    'X-Timestamp': timestamp,
    'X-Signature': signature
}
```

### Scopes & Permissions

| Scope | Description |
|-------|-------------|
| `solve:read` | Submit and check solve tasks |
| `solve:write` | Create batch jobs and webhooks |
| `analytics:read` | View usage and analytics |
| `billing:read` | Access billing information |
| `admin:write` | Manage API keys and settings |

---

## Rate Limits & Quotas

### Tier-Based Limits

| Tier | Requests/Min | Concurrent | Burst | Queue Depth |
|------|--------------|------------|-------|-------------|
| Starter | 120 | 10 | 20 | 100 |
| Growth | 600 | 50 | 100 | 500 |
| Business | 3,000 | 250 | 500 | 2,500 |
| Enterprise | 15,000 | 1,000 | 2,000 | 10,000 |
| Enterprise+ | Custom | Custom | Custom | Custom |

### Rate Limit Headers

Every response includes rate limit information:

```http
X-RateLimit-Limit: 3000
X-RateLimit-Remaining: 2847
X-RateLimit-Reset: 1706745600
X-RateLimit-Retry-After: 0
```

### Quota Management

Track your monthly quota usage:

```bash
GET /v2/usage/quota
```

Response:

```json
{
  "quota": {
    "tier": "enterprise",
    "monthly_limit": 1000000,
    "used_this_month": 456789,
    "remaining": 543211,
    "resets_at": "2026-03-01T00:00:00Z",
    "overage_enabled": true,
    "overage_rate": 0.0015
  },
  "concurrent": {
    "limit": 1000,
    "current": 247,
    "peak_today": 892
  }
}
```

---

## API Versions

### Current Versions

| Version | Status | Base URL | Sunset Date |
|---------|--------|----------|-------------|
| v2.1 | Current | `https://api.sin-solver.io/v2` | - |
| v2.0 | Supported | `https://api.sin-solver.io/v2` | 2026-12-31 |
| v1.0 | Deprecated | `https://api.sin-solver.io/v1` | 2026-06-30 |

### Version Selection

Specify version via URL path or `Accept-Version` header:

```bash
# URL path
curl https://api.sin-solver.io/v2/solve

# Header
curl -H "Accept-Version: v2.1" \
     https://api.sin-solver.io/solve
```

### Breaking Changes Policy

- **Minor versions:** Backward compatible additions
- **Major versions:** Breaking changes with 6-month migration period
- **Deprecation notices:** Sent 90 days before sunset

---

## Endpoints Reference

### Solve Endpoints

#### POST /v2/solve

Submit a CAPTCHA for solving.

**Request:**

```json
{
  "type": "recaptcha_v2",
  "sitekey": "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
  "url": "https://example.com/login",
  "proxy": {
    "type": "residential",
    "country": "US",
    "session": "sess_abc123"
  },
  "options": {
    "timeout": 30,
    "human_simulation": true,
    "priority": "high",
    "retry_count": 2,
    "webhook_url": "https://your-domain.com/webhook",
    "metadata": {
      "customer_id": "cust_456",
      "job_id": "job_789"
    }
  }
}
```

**Response (Synchronous - 200 OK):**

```json
{
  "success": true,
  "data": {
    "task_id": "task_abc123xyz789",
    "status": "completed",
    "solution": "03AGdBq24PBCdK...",
    "solve_time_ms": 8234,
    "created_at": "2026-02-15T10:30:00Z",
    "completed_at": "2026-02-15T10:30:08Z",
    "solver": {
      "engine": "consensus",
      "models": ["gemini-3-flash", "mistral-vision", "yolo-v8x"],
      "confidence": 0.984,
      "consensus_votes": 3
    },
    "cost": {
      "amount": 0.018,
      "currency": "USD",
      "breakdown": {
        "base": 0.015,
        "priority": 0.003
      }
    },
    "metadata": {
      "customer_id": "cust_456",
      "job_id": "job_789"
    }
  }
}
```

**Response (Asynchronous - 202 Accepted):**

```json
{
  "success": true,
  "data": {
    "task_id": "task_abc123xyz789",
    "status": "queued",
    "position": 12,
    "estimated_wait_ms": 4500,
    "poll_url": "https://api.sin-solver.io/v2/status/task_abc123xyz789",
    "webhook_registered": true
  }
}
```

#### GET /v2/solve/{task_id}

Retrieve solve result by task ID.

**Response:**

```json
{
  "success": true,
  "data": {
    "task_id": "task_abc123xyz789",
    "status": "completed",
    "type": "recaptcha_v2",
    "solution": "03AGdBq24PBCdK...",
    "solve_time_ms": 8234,
    "created_at": "2026-02-15T10:30:00Z",
    "started_at": "2026-02-15T10:30:01Z",
    "completed_at": "2026-02-15T10:30:08Z",
    "solver": {
      "engine": "consensus",
      "models": ["gemini-3-flash", "mistral-vision", "yolo-v8x"],
      "confidence": 0.984
    },
    "attempts": [
      {
        "attempt": 1,
        "solver": "gemini-3-flash",
        "result": "success",
        "duration_ms": 8123
      }
    ]
  }
}
```

#### POST /v2/batch

Submit multiple CAPTCHAs for batch processing.

**Request:**

```json
{
  "items": [
    {
      "id": "req_1",
      "type": "recaptcha_v2",
      "sitekey": "6Le-wvkSAAAA...",
      "url": "https://site1.com"
    },
    {
      "id": "req_2",
      "type": "hcaptcha",
      "sitekey": "10000000-ffff...",
      "url": "https://site2.com"
    }
  ],
  "options": {
    "parallelism": 10,
    "timeout": 60,
    "webhook_url": "https://your-domain.com/batch-webhook"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "batch_id": "batch_xyz789abc",
    "status": "processing",
    "total": 100,
    "queued": 100,
    "completed": 0,
    "failed": 0,
    "progress_percent": 0,
    "estimated_completion": "2026-02-15T10:35:00Z",
    "webhook_registered": true
  }
}
```

#### GET /v2/batch/{batch_id}

Get batch processing status and results.

**Response:**

```json
{
  "success": true,
  "data": {
    "batch_id": "batch_xyz789abc",
    "status": "completed",
    "total": 100,
    "completed": 98,
    "failed": 2,
    "progress_percent": 100,
    "created_at": "2026-02-15T10:30:00Z",
    "completed_at": "2026-02-15T10:34:23Z",
    "duration_ms": 263000,
    "results": [
      {
        "id": "req_1",
        "status": "success",
        "solution": "03AGdBq24...",
        "solve_time_ms": 8123
      },
      {
        "id": "req_2",
        "status": "failed",
        "error": {
          "code": "CAPTCHA_TIMEOUT",
          "message": "Solve timeout exceeded"
        }
      }
    ],
    "summary": {
      "success_rate": 0.98,
      "avg_solve_time_ms": 8547,
      "total_cost_usd": 1.76
    }
  }
}
```

### Status Endpoints

#### GET /v2/status

Get overall system status and health.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "operational",
    "version": "2.1.0-enterprise",
    "region": "us-east-1",
    "timestamp": "2026-02-15T10:30:00Z",
    "services": {
      "api": { "status": "healthy", "latency_ms": 12 },
      "solvers": { "status": "healthy", "available": 45 },
      "queue": { "status": "healthy", "depth": 127 },
      "database": { "status": "healthy", "latency_ms": 3 },
      "cache": { "status": "healthy", "latency_ms": 1 }
    },
    "solver_pools": {
      "gemini": { "available": true, "queue_depth": 23 },
      "mistral": { "available": true, "queue_depth": 18 },
      "yolo": { "available": true, "queue_depth": 5 },
      "groq": { "available": true, "queue_depth": 12 }
    }
  }
}
```

#### GET /v2/status/solvers

Detailed solver pool status.

**Response:**

```json
{
  "success": true,
  "data": {
    "pools": [
      {
        "name": "gemini-consensus",
        "type": "ai",
        "status": "active",
        "capacity": 100,
        "active": 67,
        "queued": 23,
        "avg_solve_time_ms": 8200,
        "success_rate_24h": 0.985,
        "models": ["gemini-3-flash", "gemini-3-ultra"]
      },
      {
        "name": "yolo-vision",
        "type": "vision",
        "status": "active",
        "capacity": 200,
        "active": 45,
        "queued": 5,
        "avg_solve_time_ms": 1200,
        "success_rate_24h": 0.991
      }
    ]
  }
}
```

### Analytics Endpoints

#### GET /v2/analytics/usage

Get usage statistics and metrics.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `start` | ISO 8601 | Start date/time |
| `end` | ISO 8601 | End date/time |
| `granularity` | string | `hourly`, `daily`, `monthly` |
| `group_by` | string | `type`, `region`, `solver` |

**Response:**

```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2026-02-01T00:00:00Z",
      "end": "2026-02-15T23:59:59Z"
    },
    "summary": {
      "total_requests": 456789,
      "successful": 449123,
      "failed": 7666,
      "success_rate": 0.983,
      "total_cost_usd": 8214.42,
      "avg_solve_time_ms": 8432
    },
    "by_captcha_type": {
      "recaptcha_v2": {
        "requests": 245678,
        "success_rate": 0.985,
        "avg_time_ms": 8200
      },
      "hcaptcha": {
        "requests": 123456,
        "success_rate": 0.968,
        "avg_time_ms": 10400
      }
    },
    "by_solver": {
      "gemini-consensus": {
        "requests": 389123,
        "success_rate": 0.987,
        "avg_cost_usd": 0.018
      }
    },
    "timeseries": [
      {
        "timestamp": "2026-02-15T10:00:00Z",
        "requests": 1250,
        "success_rate": 0.984,
        "avg_time_ms": 8321
      }
    ]
  }
}
```

#### GET /v2/analytics/realtime

Real-time system metrics.

**Response:**

```json
{
  "success": true,
  "data": {
    "timestamp": "2026-02-15T10:30:00Z",
    "requests_per_second": 89.5,
    "active_solves": 247,
    "queue_depth": 127,
    "avg_solve_time_ms": 8432,
    "success_rate_5m": 0.984,
    "error_rate_5m": 0.016,
    "top_captcha_types": [
      { "type": "recaptcha_v2", "percent": 54.2 },
      { "type": "hcaptcha", "percent": 27.1 }
    ]
  }
}
```

### Webhook Management

#### POST /v2/webhooks

Register a new webhook endpoint.

**Request:**

```json
{
  "url": "https://your-domain.com/sin-solver-webhook",
  "events": ["solve.completed", "solve.failed", "batch.completed"],
  "secret": "whsec_your_webhook_secret",
  "metadata": {
    "environment": "production",
    "team": "automation"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "webhook_id": "wh_abc123xyz",
    "url": "https://your-domain.com/sin-solver-webhook",
    "events": ["solve.completed", "solve.failed", "batch.completed"],
    "status": "active",
    "created_at": "2026-02-15T10:30:00Z",
    "metadata": {
      "environment": "production",
      "team": "automation"
    }
  }
}
```

#### GET /v2/webhooks

List all registered webhooks.

#### GET /v2/webhooks/{webhook_id}

Get webhook details.

#### PUT /v2/webhooks/{webhook_id}

Update webhook configuration.

#### DELETE /v2/webhooks/{webhook_id}

Delete a webhook.

#### POST /v2/webhooks/{webhook_id}/test

Send a test webhook event.

### Usage & Billing

#### GET /v2/usage

Get detailed usage report.

**Response:**

```json
{
  "success": true,
  "data": {
    "current_period": {
      "start": "2026-02-01T00:00:00Z",
      "end": "2026-02-28T23:59:59Z",
      "days_remaining": 13
    },
    "usage": {
      "requests": 456789,
      "successful": 449123,
      "cost_usd": 8214.42,
      "by_captcha_type": {
        "recaptcha_v2": { "count": 245678, "cost": 4422.20 },
        "hcaptcha": { "count": 123456, "cost": 2469.12 }
      }
    },
    "quota": {
      "tier": "enterprise",
      "included": 1000000,
      "used": 456789,
      "remaining": 543211,
      "overage": 0,
      "overage_cost": 0
    },
    "projections": {
      "end_of_month_requests": 892345,
      "end_of_month_cost": 16042.21,
      "will_exceed_quota": false
    }
  }
}
```

#### GET /v2/usage/invoices

List billing invoices.

---

## WebSocket API

Connect to `wss://ws.sin-solver.io/v2` for real-time updates.

### Authentication

```javascript
const ws = new WebSocket('wss://ws.sin-solver.io/v2', [], {
  headers: { 'X-API-Key': 'sin_live_abc123' }
});
```

### Subscribe to Events

```json
{
  "action": "subscribe",
  "channels": ["solve:task_abc123", "batch:batch_xyz789", "system:status"]
}
```

### Event Types

| Event | Description | Payload |
|-------|-------------|---------|
| `solve.queued` | Task queued | `{ task_id, position, estimated_wait }` |
| `solve.started` | Processing started | `{ task_id, solver, timestamp }` |
| `solve.progress` | Progress update | `{ task_id, progress, message }` |
| `solve.completed` | Solve successful | `{ task_id, solution, solve_time }` |
| `solve.failed` | Solve failed | `{ task_id, error, attempts }` |
| `batch.progress` | Batch update | `{ batch_id, completed, total }` |
| `batch.completed` | Batch finished | `{ batch_id, summary }` |
| `system.status` | System alert | `{ level, message, affected_regions }` |

### Example: Real-time Solve Tracking

```javascript
const ws = new WebSocket('wss://ws.sin-solver.io/v2');

ws.onopen = () => {
  // Subscribe to task updates
  ws.send(JSON.stringify({
    action: 'subscribe',
    channels: ['solve:task_abc123']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.event) {
    case 'solve.queued':
      console.log(`Queued at position ${data.payload.position}`);
      break;
    case 'solve.started':
      console.log('Processing started...');
      break;
    case 'solve.completed':
      console.log(`Solution: ${data.payload.solution}`);
      ws.close();
      break;
    case 'solve.failed':
      console.error(`Failed: ${data.payload.error.message}`);
      ws.close();
      break;
  }
};
```

---

## GraphQL API

Endpoint: `https://api.sin-solver.io/graphql`

### Schema Overview

```graphql
type Query {
  solve(id: ID!): SolveResult
  solves(filter: SolveFilter, limit: Int, offset: Int): SolveConnection
  batch(id: ID!): BatchResult
  batches(filter: BatchFilter): BatchConnection
  analytics(period: DateRange!): AnalyticsResult
  usage(period: DateRange!): UsageResult
  status: SystemStatus
}

type Mutation {
  solve(input: SolveInput!): SolveResult
  solveBatch(input: BatchInput!): BatchResult
  createWebhook(input: WebhookInput!): Webhook
  deleteWebhook(id: ID!): Boolean
}

type Subscription {
  solveUpdates(taskId: ID!): SolveEvent
  batchUpdates(batchId: ID!): BatchEvent
  systemStatus: SystemStatusEvent
}
```

### Example Queries

**Get Solve Result:**

```graphql
query GetSolve($id: ID!) {
  solve(id: $id) {
    taskId
    status
    solution
    solveTimeMs
    solver {
      engine
      confidence
    }
    cost {
      amount
      currency
    }
  }
}
```

**Submit and Track:**

```graphql
mutation SubmitSolve($input: SolveInput!) {
  solve(input: $input) {
    taskId
    status
    estimatedWaitMs
  }
}

subscription TrackSolve($taskId: ID!) {
  solveUpdates(taskId: $taskId) {
    event
    payload {
      ... on SolveCompleted {
        solution
        solveTimeMs
      }
    }
  }
}
```

**Analytics Dashboard:**

```graphql
query DashboardAnalytics($period: DateRange!) {
  analytics(period: $period) {
    summary {
      totalRequests
      successRate
      avgSolveTimeMs
      totalCost
    }
    byCaptchaType {
      type
      requests
      successRate
    }
    timeseries(granularity: HOURLY) {
      timestamp
      requests
      successRate
    }
  }
}
```

---

## Webhook Integration

### Webhook Payload Structure

```json
{
  "id": "evt_abc123xyz",
  "object": "event",
  "type": "solve.completed",
  "created": 1707993600,
  "data": {
    "task_id": "task_abc123",
    "status": "completed",
    "solution": "03AGdBq24PBCdK...",
    "solve_time_ms": 8234,
    "solver": {
      "engine": "consensus",
      "confidence": 0.984
    },
    "metadata": {
      "customer_id": "cust_456"
    }
  }
}
```

### Signature Verification

Verify webhook authenticity using HMAC-SHA256:

```python
import hmac
import hashlib
import json

def verify_webhook(payload_body, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)

# Usage (Flask example)
@app.route('/webhook', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Sin-Solver-Signature')
    if not verify_webhook(request.data, signature, WEBHOOK_SECRET):
        return 'Invalid signature', 401
    
    event = json.loads(request.data)
    handle_event(event)
    return 'OK', 200
```

### Retry Policy

| Attempt | Delay | Total Delay |
|---------|-------|-------------|
| 1 | Immediate | 0s |
| 2 | 1s | 1s |
| 3 | 2s | 3s |
| 4 | 4s | 7s |
| 5 | 8s | 15s |

Webhooks are retried up to 5 times with exponential backoff for:
- HTTP 5xx responses
- Network timeouts (>30s)
- Connection failures

Not retried for:
- HTTP 4xx responses (except 408, 429)
- Successful 2xx responses

### Event Types Reference

| Event | Description | When Fired |
|-------|-------------|------------|
| `solve.queued` | Task queued | Immediately after submission |
| `solve.started` | Processing began | When solver picks up task |
| `solve.completed` | Success | Solution found |
| `solve.failed` | Failure | Max retries exceeded |
| `batch.created` | Batch job created | After batch submission |
| `batch.progress` | Progress update | Every 10% or 60s |
| `batch.completed` | Batch finished | All items processed |

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "CAPTCHA_TIMEOUT",
    "message": "CAPTCHA solve exceeded timeout limit",
    "type": "request_error",
    "param": "options.timeout",
    "request_id": "req_abc123xyz",
    "documentation_url": "https://docs.sin-solver.io/errors/CAPTCHA_TIMEOUT"
  }
}
```

### Error Codes

#### 4xx - Client Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters | Check request schema |
| `CAPTCHA_UNSUPPORTED` | 400 | CAPTCHA type not supported | Use supported type |
| `CAPTCHA_INVALID` | 400 | Invalid CAPTCHA data | Verify sitekey/URL |
| `AUTHENTICATION_REQUIRED` | 401 | Missing API key | Include X-API-Key header |
| `AUTHENTICATION_INVALID` | 401 | Invalid API key | Check key validity |
| `SIGNATURE_INVALID` | 401 | HMAC signature mismatch | Verify signature calculation |
| `FORBIDDEN` | 403 | Insufficient permissions | Check API key scopes |
| `QUOTA_EXCEEDED` | 403 | Monthly quota exceeded | Upgrade tier or wait |
| `NOT_FOUND` | 404 | Resource not found | Verify task/batch ID |
| `RATE_LIMITED` | 429 | Too many requests | Implement backoff |
| `CAPTCHA_TIMEOUT` | 408 | Solve timeout | Increase timeout or retry |

#### 5xx - Server Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `SOLVER_UNAVAILABLE` | 503 | No solvers available | Retry with backoff |
| `INTERNAL_ERROR` | 500 | Server error | Contact support |
| `DATABASE_ERROR` | 500 | Database issue | Retry request |
| `AI_SERVICE_ERROR` | 502 | AI provider error | Auto-retried |

### Circuit Breaker Pattern

Implement circuit breaker for resilience:

```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=30)
def solve_captcha(payload):
    response = requests.post(
        'https://api.sin-solver.io/v2/solve',
        json=payload,
        headers={'X-API-Key': API_KEY}
    )
    response.raise_for_status()
    return response.json()
```

### Retry Strategy

Recommended retry configuration:

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[408, 429, 500, 502, 503, 504],
    allowed_methods=["HEAD", "GET", "POST"]
)

adapter = HTTPAdapter(max_retries=retry_strategy)
http = requests.Session()
http.mount("https://", adapter)
```

---

## SDK Examples

### Python SDK

```bash
pip install sin-solver-enterprise
```

```python
from sin_solver import EnterpriseClient

# Initialize client
client = EnterpriseClient(
    api_key='sin_live_abc123',
    region='us-east-1',
    timeout=30
)

# Solve single CAPTCHA
result = client.solve({
    'type': 'recaptcha_v2',
    'sitekey': '6Le-wvkSAAAA...',
    'url': 'https://example.com/login',
    'options': {
        'priority': 'high',
        'timeout': 30
    }
})

print(f"Solution: {result.solution}")
print(f"Confidence: {result.solver.confidence}")

# Batch processing
batch = client.solve_batch([
    {'type': 'recaptcha_v2', 'sitekey': '...', 'url': '...'},
    {'type': 'hcaptcha', 'sitekey': '...', 'url': '...'}
], parallelism=10)

# Wait for completion
results = batch.wait()

# Real-time tracking with WebSocket
async for update in client.track_task(result.task_id):
    print(f"Status: {update.status}")
    if update.status == 'completed':
        print(f"Solution: {update.solution}")
        break

# Get analytics
analytics = client.analytics.usage(
    start='2026-02-01',
    end='2026-02-15',
    granularity='daily'
)
print(f"Success rate: {analytics.summary.success_rate}")
```

### Node.js/TypeScript SDK

```bash
npm install @sin-solver/enterprise
```

```typescript
import { EnterpriseClient } from '@sin-solver/enterprise';

const client = new EnterpriseClient({
  apiKey: 'sin_live_abc123',
  region: 'us-east-1',
  timeout: 30000
});

// Solve with async/await
const result = await client.solve({
  type: 'recaptcha_v2',
  sitekey: '6Le-wvkSAAAA...',
  url: 'https://example.com/login',
  options: {
    priority: 'high',
    metadata: { customerId: 'cust_123' }
  }
});

console.log(`Solution: ${result.data.solution}`);

// Batch processing with progress
const batch = await client.solveBatch([
  { type: 'recaptcha_v2', sitekey: '...', url: '...' },
  { type: 'hcaptcha', sitekey: '...', url: '...' }
], {
  parallelism: 10,
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percent}%`);
  }
});

const results = await batch.wait();

// WebSocket real-time updates
const ws = client.connectWebSocket();
ws.subscribe(['solve:task_abc123']);

ws.on('solve.completed', (data) => {
  console.log('Solved!', data.solution);
});

// Type-safe GraphQL
const { data } = await client.graphql(`
  query GetAnalytics($period: DateRange!) {
    analytics(period: $period) {
      summary {
        successRate
        totalCost
      }
    }
  }
`, { period: { start: '2026-02-01', end: '2026-02-15' }});
```

### Go SDK

```bash
go get github.com/sin-solver/enterprise-go
```

```go
package main

import (
    "context"
    "fmt"
    "log"
    
    sinsolver "github.com/sin-solver/enterprise-go"
)

func main() {
    client, err := sinsolver.NewClient(
        sinsolver.WithAPIKey("sin_live_abc123"),
        sinsolver.WithRegion("us-east-1"),
    )
    if err != nil {
        log.Fatal(err)
    }
    
    ctx := context.Background()
    
    // Solve CAPTCHA
    result, err := client.Solve(ctx, &sinsolver.SolveRequest{
        Type:    "recaptcha_v2",
        Sitekey: "6Le-wvkSAAAA...",
        URL:     "https://example.com/login",
        Options: &sinsolver.SolveOptions{
            Priority: "high",
            Timeout:  30,
        },
    })
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Solution: %s\n", result.Data.Solution)
    fmt.Printf("Solve time: %dms\n", result.Data.SolveTimeMs)
    
    // Batch solve
    batch, err := client.SolveBatch(ctx, &sinsolver.BatchRequest{
        Items: []*sinsolver.SolveRequest{...},
        Options: &sinsolver.BatchOptions{
            Parallelism: 10,
        },
    })
    
    // Wait for completion
    results, err := batch.Wait(ctx)
    
    // Real-time tracking
    updates, err := client.TrackTask(ctx, result.Data.TaskID)
    for update := range updates {
        fmt.Printf("Status: %s\n", update.Status)
        if update.Status == "completed" {
            break
        }
    }
}
```

### cURL Examples

```bash
# Solve CAPTCHA
curl -X POST https://api.sin-solver.io/v2/solve \
  -H "X-API-Key: sin_live_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "recaptcha_v2",
    "sitekey": "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
    "url": "https://example.com/login",
    "options": {
      "priority": "high",
      "timeout": 30
    }
  }'

# Check status
curl https://api.sin-solver.io/v2/status/task_abc123 \
  -H "X-API-Key: sin_live_abc123"

# Get analytics
curl "https://api.sin-solver.io/v2/analytics/usage?start=2026-02-01&end=2026-02-15" \
  -H "X-API-Key: sin_live_abc123"

# Batch solve
curl -X POST https://api.sin-solver.io/v2/batch \
  -H "X-API-Key: sin_live_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"type": "recaptcha_v2", "sitekey": "...", "url": "..."},
      {"type": "hcaptcha", "sitekey": "...", "url": "..."}
    ],
    "options": {"parallelism": 10}
  }'
```

---

## Postman Collection

Download the complete Postman collection:

```bash
curl https://api.sin-solver.io/v2/docs/postman-collection.json \
  -o sin-solver-enterprise.postman_collection.json
```

### Collection Features

- **Environments:** Production, Staging, Development
- **Pre-request Scripts:** Automatic authentication
- **Tests:** Response validation
- **Examples:** All endpoint examples included

### Environment Variables

| Variable | Description |
|----------|-------------|
| `baseUrl` | API base URL |
| `apiKey` | Your API key |
| `region` | Default region |

---

## OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: SIN-Solver Enterprise API
  version: 2.1.0
  description: |
    Enterprise-grade CAPTCHA solving API with multi-AI consensus,
    real-time WebSocket support, and comprehensive analytics.
  contact:
    name: SIN-Solver Support
    email: enterprise@sin-solver.io
    url: https://sin-solver.io/support
  license:
    name: Apache 2.0
    url: https://www.apache.org/licenses/LICENSE-2.0

servers:
  - url: https://api.sin-solver.io/v2
    description: Production
  - url: https://api-staging.sin-solver.io/v2
    description: Staging

security:
  - ApiKeyAuth: []
  - BearerAuth: []

paths:
  /solve:
    post:
      summary: Submit CAPTCHA for solving
      operationId: submitSolve
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SolveRequest'
      responses:
        '200':
          description: Synchronous solve completed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SolveResponse'
        '202':
          description: Asynchronous solve accepted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SolveAccepted'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/RateLimited'

# Full specification available at:
# https://api.sin-solver.io/openapi.json
```

Access the full OpenAPI spec:

- **Swagger UI:** https://api.sin-solver.io/docs
- **ReDoc:** https://api.sin-solver.io/redoc
- **OpenAPI JSON:** https://api.sin-solver.io/openapi.json
- **AsyncAPI:** https://api.sin-solver.io/asyncapi.json

---

## Changelog

### v2.1.0 (2026-02-01)

- **Added:** GraphQL API endpoint
- **Added:** Batch processing with progress tracking
- **Added:** Advanced analytics with timeseries data
- **Improved:** p50 latency reduced to 8.2s
- **Improved:** WebSocket reconnection handling

### v2.0.0 (2026-01-01)

- **Added:** Enterprise tier with custom quotas
- **Added:** HMAC request signing
- **Added:** Multi-region deployment
- **Added:** GDPR compliance features
- **Breaking:** Changed error response format
- **Breaking:** Updated rate limit headers

### v1.0.0 (2025-06-01)

- Initial release
- Core CAPTCHA solving API
- WebSocket support
- Basic analytics

---

## Support

| Channel | Response Time | Availability |
|---------|---------------|--------------|
| Email | < 4 hours | 24/7 |
| Chat | < 15 minutes | Business hours |
| Phone | < 5 minutes | Enterprise only |
| SLA | - | 99.99% uptime |

### Contact

- **General:** support@sin-solver.io
- **Enterprise:** enterprise@sin-solver.io
- **Sales:** sales@sin-solver.io
- **Security:** security@sin-solver.io

### Status Page

https://status.sin-solver.io

---

<p align="center">
  <strong>SIN-Solver Enterprise API v2.1.0</strong><br>
  <sub>Built for scale. Trusted by enterprises.</sub>
</p>
