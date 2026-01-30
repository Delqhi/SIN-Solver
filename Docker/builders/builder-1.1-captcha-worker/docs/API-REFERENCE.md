# CAPTCHA Solver API Reference

**Version:** 2.1.0  
**Last Updated:** 2026-01-30  
**Base URL:** `http://localhost:8019`  
**Protocol:** HTTP/REST  
**Content-Type:** `application/json`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Endpoints](#endpoints)
   - [Health Checks](#health-checks)
   - [Solve Operations](#solve-operations)
   - [Monitoring](#monitoring)
7. [Request/Response Schemas](#requestresponse-schemas)
8. [Examples](#examples)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The CAPTCHA Solver API provides a comprehensive solution for solving various types of CAPTCHAs using multiple AI models with a veto system for accuracy. The API supports:

- **Text CAPTCHAs** - Character recognition
- **Math CAPTCHAs** - Mathematical expression solving
- **Image Grid CAPTCHAs** - hCaptcha/reCAPTCHA style
- **Browser-based CAPTCHAs** - Live webpage solving via Steel Browser
- **Batch Processing** - Process up to 100 CAPTCHAs concurrently

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client        │────▶│   API Gateway   │────▶│   Veto Engine   │
│   (Your App)    │     │   (Port 8019)   │     │   (Multi-AI)    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                              ┌──────────────────────────┼──────────┐
                              │                          │          │
                              ▼                          ▼          ▼
                        ┌──────────┐              ┌──────────┐  ┌──────────┐
                        │ Mistral  │              │   Qwen   │  │   Kimi   │
                        │  (API)   │              │ (Ollama) │  │  (API)   │
                        └──────────┘              └──────────┘  └──────────┘
```

---

## Authentication

**Current Status:** Open API (No authentication required)

> ⚠️ **Note:** The API currently operates without authentication. Future versions will implement API key-based authentication.

### Planned Authentication (v3.0)

```http
GET /api/solve HTTP/1.1
Host: localhost:8019
X-API-Key: your_api_key_here
Content-Type: application/json
```

---

## Base URL

### Development
```
http://localhost:8019
```

### Production (Docker Network)
```
http://builder-1.1-captcha-worker:8019
```

---

## Error Handling

### HTTP Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| `200` | OK | Successful request |
| `400` | Bad Request | Invalid parameters or malformed request |
| `422` | Unprocessable Entity | Validation error (Pydantic) |
| `429` | Too Many Requests | Rate limit exceeded |
| `503` | Service Unavailable | Service not initialized or unhealthy |

### Error Response Format

```json
{
  "success": false,
  "error": "Descriptive error message",
  "solve_time_ms": 45,
  "timestamp": "2026-01-30T10:30:00Z"
}
```

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `INVALID_IMAGE_DATA` | Base64 decoding failed | Check image encoding |
| `IMAGE_TOO_LARGE` | Image exceeds 10MB limit | Compress image before sending |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |
| `CIRCUIT_BREAKER_OPEN` | Service temporarily unavailable | Retry after circuit closes |
| `SOLVER_NOT_INITIALIZED` | Veto engine not ready | Check /health endpoint |
| `TIMEOUT` | Request timed out | Increase timeout parameter |

---

## Rate Limiting

### Current Limits

- **Per Client:** 20 requests per minute
- **Burst:** 25 requests (short spike allowed)
- **Window:** 60 seconds (sliding window)

### Rate Limit Headers

```http
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1706611200
```

### Rate Limit Response

```json
{
  "success": false,
  "error": "Rate limit exceeded. Current: 25/20 per minute",
  "solve_time_ms": 12,
  "client_id": "default"
}
```

---

## Endpoints

### Health Checks

#### GET `/health`
Liveness probe - checks if service is running.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-30T10:30:00Z",
  "version": "2.1.0",
  "services": {
    "veto_engine": true,
    "rate_limiter": true,
    "redis": true,
    "ocr": true,
    "mistral_circuit": "closed",
    "qwen_circuit": "closed"
  }
}
```

**Status Codes:**
- `200` - All services healthy
- `503` - One or more services unhealthy

---

#### GET `/ready`
Readiness probe - checks if service is ready to accept requests.

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2026-01-30T10:30:00Z"
}
```

**Status Codes:**
- `200` - Ready
- `503` - Not ready (initializing)

---

### Solve Operations

#### POST `/api/solve`
Main solve endpoint - handles all CAPTCHA types.

**Request Body:**
```json
{
  "image_data": "base64_encoded_image_string",
  "captcha_type": "text",
  "url": "https://example.com/captcha",
  "instructions": "Select all cars",
  "timeout": 30,
  "priority": "normal",
  "client_id": "default"
}
```

**Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `image_data` | string | Conditional | null | Base64 encoded CAPTCHA image |
| `captcha_type` | string | No | null | Known CAPTCHA type hint |
| `url` | string | Conditional | null | URL for browser-based solving |
| `instructions` | string | No | null | Instructions for image grids |
| `timeout` | integer | No | 30 | Timeout in seconds (1-300) |
| `priority` | string | No | "normal" | Priority: "high", "normal", "low" |
| `client_id` | string | No | "default" | Client identifier for rate limiting |

**Note:** Either `image_data` OR `url` must be provided.

**Response:**
```json
{
  "success": true,
  "solution": "ABC123",
  "solution_type": "text",
  "captcha_type": "text",
  "confidence": 0.95,
  "solve_time_ms": 1250,
  "solver_model": "mistral",
  "timestamp": "2026-01-30T10:30:01Z"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether solve was successful |
| `solution` | string | The CAPTCHA solution (if successful) |
| `solution_type` | string | Type of solution: "text", "coordinates", "browser" |
| `captcha_type` | string | Detected or provided CAPTCHA type |
| `confidence` | float | Confidence score (0.0 - 1.0) |
| `solve_time_ms` | integer | Time taken to solve in milliseconds |
| `solver_model` | string | Which AI model provided the solution |
| `error` | string | Error message (if success=false) |
| `timestamp` | string | ISO 8601 timestamp |

---

#### POST `/api/solve/text`
Dedicated endpoint for text-based CAPTCHAs.

**Request:**
```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "client_id": "my-app",
  "timeout": 30
}
```

**Response:** Same as `/api/solve`

---

#### POST `/api/solve/image-grid`
Solve image grid CAPTCHAs (hCaptcha/reCAPTCHA style).

**Request:**
```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "instructions": "Select all images with cars",
  "client_id": "my-app",
  "timeout": 45
}
```

**Response:**
```json
{
  "success": true,
  "solution": "[[0.25, 0.25], [0.75, 0.75]]",
  "solution_type": "coordinates",
  "confidence": 0.88,
  "solve_time_ms": 2300
}
```

---

#### POST `/api/solve/browser`
Solve CAPTCHA on a live webpage using Steel Browser.

**Request:**
```json
{
  "url": "https://example.com/login",
  "client_id": "my-app",
  "timeout": 60
}
```

**Response:**
```json
{
  "success": true,
  "solution": "browser_action_completed",
  "solution_type": "browser",
  "confidence": 1.0,
  "solve_time_ms": 3500
}
```

---

#### POST `/api/solve/batch`
Process multiple CAPTCHAs in parallel (max 100).

**Request:**
```json
{
  "batch_id": "batch-001",
  "requests": [
    {
      "image_data": "base64_image_1...",
      "captcha_type": "text",
      "client_id": "client-1"
    },
    {
      "image_data": "base64_image_2...",
      "captcha_type": "math",
      "client_id": "client-1"
    }
  ]
}
```

**Response:**
```json
{
  "batch_id": "batch-001",
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "success": true,
      "solution": "ABC123",
      "confidence": 0.95,
      "solve_time_ms": 1200,
      "batch_id": "batch-001"
    },
    {
      "success": true,
      "solution": "42",
      "confidence": 0.98,
      "solve_time_ms": 800,
      "batch_id": "batch-001"
    }
  ]
}
```

**Concurrency:** Max 10 concurrent requests per batch

---

### Monitoring

#### GET `/metrics`
Prometheus metrics endpoint.

**Response:** Prometheus exposition format

```
# HELP captcha_solves_total Total number of CAPTCHA solves
# TYPE captcha_solves_total counter
captcha_solves_total{captcha_type="text",status="success",solver_model="mistral"} 150
captcha_solves_total{captcha_type="text",status="failed",solver_model="mistral"} 10

# HELP captcha_solve_duration_seconds Time spent solving CAPTCHAs
# TYPE captcha_solve_duration_seconds histogram
captcha_solve_duration_seconds_bucket{captcha_type="text",le="1.0"} 120
captcha_solve_duration_seconds_bucket{captcha_type="text",le="2.0"} 145
captcha_solve_duration_seconds_count{captcha_type="text"} 160

# HELP captcha_active_workers Number of active CAPTCHA solving workers
# TYPE captcha_active_workers gauge
captcha_active_workers 1
```

**Metrics Available:**

| Metric | Type | Description |
|--------|------|-------------|
| `captcha_solves_total` | Counter | Total solves by type, status, model |
| `captcha_solve_duration_seconds` | Histogram | Solve time distribution |
| `captcha_active_workers` | Gauge | Active worker count |
| `circuit_breaker_state` | Gauge | Circuit state (0=closed, 1=open, 2=half-open) |
| `rate_limit_hits_total` | Counter | Rate limit violations |
| `captcha_queue_size` | Gauge | Pending queue size by priority |

---

#### GET `/stats`
Solver statistics from Redis.

**Response:**
```json
{
  "total_solved": 1523,
  "total_failed": 127,
  "avg_solve_time_ms": 1450,
  "timestamp": "2026-01-30T10:30:00Z"
}
```

---

#### GET `/rate-limits`
Current rate limit status for a client.

**Query Parameters:**
- `client_id` (string, default: "default") - Client identifier

**Response:**
```json
{
  "client_id": "my-app",
  "current_requests": 12,
  "max_requests": 20,
  "window_seconds": 60,
  "is_limited": false,
  "reset_time": null,
  "timestamp": "2026-01-30T10:30:00Z"
}
```

---

#### GET `/circuit-status`
Circuit breaker status for AI services.

**Response:**
```json
{
  "mistral": "closed",
  "qwen": "closed",
  "timestamp": "2026-01-30T10:30:00Z"
}
```

**States:**
- `closed` - Normal operation
- `open` - Service unavailable (too many failures)
- `half-open` - Testing if service recovered

---

## Request/Response Schemas

### CaptchaSolveRequest

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "image_data": {
      "type": "string",
      "description": "Base64 encoded CAPTCHA image",
      "maxLength": 14000000
    },
    "captcha_type": {
      "type": "string",
      "description": "Known CAPTCHA type"
    },
    "url": {
      "type": "string",
      "format": "uri",
      "description": "URL for browser-based solving"
    },
    "instructions": {
      "type": "string",
      "description": "Instructions for image grids"
    },
    "timeout": {
      "type": "integer",
      "minimum": 1,
      "maximum": 300,
      "default": 30
    },
    "priority": {
      "type": "string",
      "enum": ["high", "normal", "low"],
      "default": "normal"
    },
    "client_id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "default": "default"
    }
  },
  "oneOf": [
    { "required": ["image_data"] },
    { "required": ["url"] }
  ]
}
```

### CaptchaSolveResponse

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "solution": {
      "type": "string"
    },
    "solution_type": {
      "type": "string",
      "enum": ["text", "coordinates", "browser"]
    },
    "captcha_type": {
      "type": "string"
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "solve_time_ms": {
      "type": "integer"
    },
    "solver_model": {
      "type": "string"
    },
    "error": {
      "type": "string"
    },
    "batch_id": {
      "type": "string"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": ["success", "solve_time_ms", "timestamp"]
}
```

---

## Examples

### Example 1: Solve Text CAPTCHA

**Request:**
```bash
curl -X POST http://localhost:8019/api/solve \
  -H "Content-Type: application/json" \
  -d '{
    "image_data": "'$(base64 -i captcha.png)'",
    "captcha_type": "text",
    "client_id": "my-app"
  }'
```

**Response:**
```json
{
  "success": true,
  "solution": "X8KpM",
  "solution_type": "text",
  "captcha_type": "text",
  "confidence": 0.94,
  "solve_time_ms": 1450,
  "solver_model": "mistral",
  "timestamp": "2026-01-30T10:30:01Z"
}
```

---

### Example 2: Solve Math CAPTCHA

**Request:**
```bash
curl -X POST http://localhost:8019/api/solve \
  -H "Content-Type: application/json" \
  -d '{
    "image_data": "'$(base64 -i math_captcha.png)'",
    "captcha_type": "math",
    "timeout": 45
  }'
```

**Response:**
```json
{
  "success": true,
  "solution": "42",
  "solution_type": "text",
  "captcha_type": "math",
  "confidence": 0.98,
  "solve_time_ms": 890,
  "solver_model": "qwen",
  "timestamp": "2026-01-30T10:30:01Z"
}
```

---

### Example 3: Browser-based Solving

**Request:**
```bash
curl -X POST http://localhost:8019/api/solve/browser \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/login",
    "timeout": 60
  }'
```

**Response:**
```json
{
  "success": true,
  "solution": "browser_action_completed",
  "solution_type": "browser",
  "confidence": 1.0,
  "solve_time_ms": 3200,
  "solver_model": "steel",
  "timestamp": "2026-01-30T10:30:04Z"
}
```

---

### Example 4: Batch Processing

**Request:**
```python
import requests
import base64

# Read images
with open("captcha1.png", "rb") as f:
    img1 = base64.b64encode(f.read()).decode()
with open("captcha2.png", "rb") as f:
    img2 = base64.b64encode(f.read()).decode()

# Batch request
response = requests.post(
    "http://localhost:8019/api/solve/batch",
    json={
        "batch_id": "batch-001",
        "requests": [
            {"image_data": img1, "captcha_type": "text"},
            {"image_data": img2, "captcha_type": "text"}
        ]
    }
)

print(response.json())
```

**Response:**
```json
{
  "batch_id": "batch-001",
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {"success": true, "solution": "ABC123", "confidence": 0.95},
    {"success": true, "solution": "XYZ789", "confidence": 0.92}
  ]
}
```

---

### Example 5: Check Rate Limits

**Request:**
```bash
curl "http://localhost:8019/rate-limits?client_id=my-app"
```

**Response:**
```json
{
  "client_id": "my-app",
  "current_requests": 8,
  "max_requests": 20,
  "window_seconds": 60,
  "is_limited": false,
  "timestamp": "2026-01-30T10:30:00Z"
}
```

---

## Troubleshooting

### Common Issues

#### Issue: "Solver not initialized" (503)

**Cause:** Veto engine or required services not ready

**Solution:**
```bash
# Check health
curl http://localhost:8019/health

# Wait for ready
curl http://localhost:8019/ready
```

---

#### Issue: "Rate limit exceeded" (429)

**Cause:** Too many requests from same client_id

**Solution:**
- Implement exponential backoff
- Use different client_id per user/session
- Check current limits: `GET /rate-limits`

---

#### Issue: "Invalid image data" (400)

**Cause:** Malformed base64 or corrupted image

**Solution:**
```bash
# Verify base64 encoding
base64 -i captcha.png | head -c 100

# Check image format (supported: PNG, JPEG, GIF)
file captcha.png
```

---

#### Issue: "Circuit breaker open" (503)

**Cause:** AI service experiencing failures

**Solution:**
```bash
# Check circuit status
curl http://localhost:8019/circuit-status

# Wait for automatic recovery (30s timeout)
# Or restart service if persistent
```

---

#### Issue: Slow solve times (>5s)

**Possible Causes:**
1. Network latency to AI services
2. High CPU/memory usage
3. Redis connection issues

**Diagnostic:**
```bash
# Check metrics
curl http://localhost:8019/metrics | grep captcha_solve_duration

# Check resource usage
docker stats builder-1.1-captcha-worker
```

---

### Performance Tuning

#### Optimize for Speed
- Use `priority: "high"` for urgent requests
- Pre-warm the service with a health check
- Use batch processing for multiple CAPTCHAs
- Keep images under 100KB when possible

#### Optimize for Accuracy
- Provide `captcha_type` hint when known
- Use longer timeouts for complex CAPTCHAs
- Enable OCR pre-processing for text CAPTCHAs

---

## Changelog

### v2.1.0 (2026-01-30)
- Added batch processing endpoint
- Improved rate limiting with Redis
- Added circuit breaker monitoring
- Enhanced error messages

### v2.0.0 (2026-01-29)
- Multi-AI veto system
- Steel Browser integration
- Prometheus metrics
- OCR element detection

---

## Support

For issues and feature requests:
- GitHub Issues: [github.com/YOUR_ORG/SIN-Solver/issues](https://github.com/YOUR_ORG/SIN-Solver/issues)
- Documentation: [./docs/](./docs/)
- API Status: `GET /health`

---

**Document Version:** 2.1.0  
**Last Updated:** 2026-01-30  
**Maintainer:** SIN-Solver Team
