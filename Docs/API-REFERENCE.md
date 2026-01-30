# SIN-Solver API Reference

> **Complete API Documentation for all 18 Services**  
> **Base URL:** `http://localhost:8000` | `https://api.delqhi.com`  
> **Version:** 2.0.0  
> **Format:** JSON  
> **Last Updated:** 2026-01-30

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Services Overview](#services-overview)
- [CAPTCHA Solving](#captcha-solving)
- [Health & Status](#health--status)
- [Workers](#workers)
- [Analytics](#analytics)
- [Steel Browser](#steel-browser)
- [Chat](#chat)
- [Secrets Management](#secrets-management)
- [Error Handling](#error-handling)
- [Postman/Hoppscotch Collections](#postmanhoppscotch-collections)
- [OpenAPI Specifications](#openapi-specifications)
- [Service-Specific APIs](#service-specific-apis)

---

## Authentication

Most endpoints are open in development mode. For production, set `AUTH_ENABLED=true` in your `.env`.

### API Key Authentication

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:8000/api/solve
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Authenticate and receive token |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/auth/me` | Get current user info |

---

## CAPTCHA Solving

### Solve a CAPTCHA

**`POST /solve/`**

Submits a CAPTCHA for solving using the multi-model consensus engine.

#### Request

```json
{
  "type": "recaptcha_v2",
  "sitekey": "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
  "url": "https://example.com/login",
  "options": {
    "timeout": 30,
    "human_simulation": true,
    "priority": "normal"
  }
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | CAPTCHA type (see supported types below) |
| `sitekey` | string | Yes* | Site key (required for reCAPTCHA/hCaptcha) |
| `url` | string | Yes | Page URL where CAPTCHA appears |
| `image` | string | No | Base64 encoded image (for image CAPTCHAs) |
| `options.timeout` | integer | No | Max solve time in seconds (default: 30) |
| `options.human_simulation` | boolean | No | Enable human-like behavior (default: true) |
| `options.priority` | string | No | Queue priority: `low`, `normal`, `high` |

#### Supported CAPTCHA Types

| Type | Value |
|------|-------|
| reCAPTCHA v2 | `recaptcha_v2` |
| reCAPTCHA v3 | `recaptcha_v3` |
| hCaptcha | `hcaptcha` |
| Cloudflare Turnstile | `turnstile` |
| FunCaptcha | `funcaptcha` |
| Text/Image CAPTCHA | `text`, `image` |
| Slider CAPTCHA | `slider` |
| Click-Order | `click` |

#### Response

```json
{
  "success": true,
  "task_id": "solve_abc123",
  "solution": "03AGdBq24PBCdK...",
  "solve_time_ms": 8234,
  "solver": "gemini-consensus",
  "confidence": 0.98,
  "cost_usd": 0.02,
  "models_used": ["gemini-3-flash", "mistral-vision", "yolo-v8x"],
  "consensus_votes": 3
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether solve was successful |
| `task_id` | string | Unique task identifier |
| `solution` | string | The CAPTCHA solution/token |
| `solve_time_ms` | integer | Time taken in milliseconds |
| `solver` | string | Solver method used |
| `confidence` | float | Confidence score (0-1) |
| `cost_usd` | float | Cost of this solve |
| `models_used` | array | AI models that participated |
| `consensus_votes` | integer | Number of agreeing models |

---

### Get Task Status

**`GET /solve/{task_id}`**

Check the status of a submitted solve task.

```bash
curl http://localhost:8000/solve/solve_abc123
```

#### Response

```json
{
  "task_id": "solve_abc123",
  "status": "completed",
  "progress": 100,
  "result": { ... },
  "created_at": "2026-01-29T12:00:00Z",
  "completed_at": "2026-01-29T12:00:08Z"
}
```

#### Status Values

| Status | Description |
|--------|-------------|
| `pending` | Task queued, not started |
| `processing` | Currently being solved |
| `completed` | Successfully solved |
| `failed` | Solve failed |
| `timeout` | Exceeded timeout limit |

---

## Health & Status

### System Health

**`GET /health`**

Basic health check endpoint.

```json
{
  "status": "healthy"
}
```

### Detailed Health

**`GET /health/detailed`**

Comprehensive system status including all services.

```json
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime_seconds": 86400,
  "services": {
    "postgres": { "status": "connected", "latency_ms": 2 },
    "redis": { "status": "connected", "latency_ms": 1 },
    "steel": { "status": "ready", "sessions": 3 },
    "skyvern": { "status": "ready", "tasks": 0 }
  },
  "solvers": {
    "gemini": { "available": true, "quota_remaining": 950 },
    "mistral": { "available": true, "quota_remaining": 800 },
    "yolo": { "available": true }
  }
}
```

---

## Workers

### List Workers

**`GET /workers`**

Get status of all worker containers.

```json
{
  "workers": [
    {
      "id": "solver-19-captcha-worker",
      "status": "running",
      "tasks_completed": 1250,
      "current_load": 3,
      "max_capacity": 10
    },
    {
      "id": "solver-18-survey-worker",
      "status": "running",
      "tasks_completed": 890,
      "current_load": 1,
      "max_capacity": 5
    }
  ]
}
```

### Worker Statistics

**`GET /workers/{worker_id}/stats`**

Get detailed statistics for a specific worker.

---

## Analytics

### Get Metrics

**`GET /analytics/metrics`**

Retrieve system-wide solving metrics.

```json
{
  "period": "24h",
  "total_solves": 15420,
  "success_rate": 0.965,
  "average_solve_time_ms": 8500,
  "cost_total_usd": 308.40,
  "by_captcha_type": {
    "recaptcha_v2": { "count": 8500, "success_rate": 0.985 },
    "hcaptcha": { "count": 4200, "success_rate": 0.968 },
    "turnstile": { "count": 2720, "success_rate": 0.955 }
  },
  "by_model": {
    "gemini-3-flash": { "uses": 12000, "success_rate": 0.92 },
    "mistral-vision": { "uses": 11500, "success_rate": 0.89 },
    "yolo-v8x": { "uses": 10800, "success_rate": 0.95 }
  }
}
```

### Time Series Data

**`GET /analytics/timeseries`**

Get time-bucketed metrics for charts.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start` | datetime | -24h | Start time (ISO 8601) |
| `end` | datetime | now | End time (ISO 8601) |
| `bucket` | string | `1h` | Bucket size: `5m`, `15m`, `1h`, `1d` |

---

## Steel Browser

### Browse URL

**`POST /steel/browse`**

Open a URL in the Steel stealth browser.

```json
{
  "url": "https://example.com",
  "wait_for": "networkidle",
  "timeout": 30000,
  "screenshot": true
}
```

#### Response

```json
{
  "success": true,
  "session_id": "steel_sess_xyz",
  "page_title": "Example Domain",
  "screenshot_base64": "iVBORw0KGgo...",
  "cookies": [ ... ],
  "load_time_ms": 2340
}
```

### Get Browser Status

**`GET /steel/status`**

Check Steel browser availability.

```json
{
  "status": "ready",
  "active_sessions": 3,
  "max_sessions": 10,
  "queued_requests": 0
}
```

### Take Screenshot

**`POST /steel/screenshot`**

Capture a screenshot of the current page.

```json
{
  "session_id": "steel_sess_xyz",
  "full_page": false,
  "format": "png"
}
```

---

## Chat

### Send Message

**`POST /chat/message`**

Send a message to the AI assistant.

```json
{
  "message": "How do I solve reCAPTCHA v3?",
  "context": "solving"
}
```

#### Response

```json
{
  "response": "reCAPTCHA v3 works by analyzing user behavior...",
  "sources": ["docs/recaptcha-guide.md"],
  "suggested_actions": [
    { "action": "view_docs", "label": "View Documentation" }
  ]
}
```

---

## Secrets Management

### Get Secret

**`GET /secrets/{key}`**

Retrieve a stored secret (requires authentication).

### Store Secret

**`POST /secrets`**

Store a new secret.

```json
{
  "key": "CAPTCHA_API_KEY",
  "value": "abc123...",
  "description": "Third-party backup API key"
}
```

### List Secrets

**`GET /secrets`**

List all secret keys (values are masked).

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "CAPTCHA_TIMEOUT",
    "message": "CAPTCHA solve timed out after 30 seconds",
    "details": {
      "task_id": "solve_abc123",
      "elapsed_ms": 30000
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `CAPTCHA_TIMEOUT` | 408 | Solve exceeded timeout |
| `CAPTCHA_UNSUPPORTED` | 400 | CAPTCHA type not supported |
| `SOLVER_UNAVAILABLE` | 503 | No solvers available |
| `INTERNAL_ERROR` | 500 | Server error |

### Rate Limits

| Tier | Requests/min | Concurrent |
|------|--------------|------------|
| Free | 60 | 5 |
| Pro | 300 | 20 |
| Enterprise | Unlimited | Unlimited |

---

## WebSocket Events

### Real-time Updates

Connect to `ws://localhost:8000/ws` for real-time task updates.

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Task update:', data);
};

// Subscribe to a task
ws.send(JSON.stringify({
  action: 'subscribe',
  task_id: 'solve_abc123'
}));
```

### Event Types

| Event | Description |
|-------|-------------|
| `task.started` | Task processing began |
| `task.progress` | Progress update (0-100) |
| `task.completed` | Task finished successfully |
| `task.failed` | Task failed |
| `system.status` | System status change |

---

## SDK Examples

### Python

```python
import requests

response = requests.post(
    'http://localhost:8000/solve/',
    json={
        'type': 'recaptcha_v2',
        'sitekey': '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-',
        'url': 'https://example.com/login'
    }
)

result = response.json()
print(f"Solution: {result['solution']}")
```

### JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:8000/solve/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'recaptcha_v2',
    sitekey: '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-',
    url: 'https://example.com/login'
  })
});

const result = await response.json();
console.log(`Solution: ${result.solution}`);
```

### cURL

```bash
curl -X POST http://localhost:8000/solve/ \
  -H "Content-Type: application/json" \
  -d '{
    "type": "recaptcha_v2",
    "sitekey": "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
    "url": "https://example.com/login"
  }'
```

---

## OpenAPI Specification

The full OpenAPI 3.0 specification is available at:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI JSON:** http://localhost:8000/openapi.json

---

<p align="center">
  <sub>Delqhi-Platform API v2.0.0 | Apache 2.0 License</sub>
</p>
