# API Behavior Documentation

**Project:** Delqhi-Platform Captcha Worker API  
**Base URL:** `http://localhost:8019`  
**Last Updated:** 2026-01-29  
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Ready Endpoint](#ready-endpoint)
3. [Metrics Endpoint](#metrics-endpoint)
4. [Health Endpoint](#health-endpoint)
5. [Solve Endpoint](#solve-endpoint)
6. [Unexpected Behaviors](#unexpected-behaviors)
7. [Testing Examples](#testing-examples)

---

## Overview

This document describes the behavior of the Delqhi-Platform Captcha Worker API as discovered during E2E testing. The API runs on port **8019** and provides endpoints for health checks, metrics, and captcha solving operations.

### Base Configuration

| Property | Value |
|----------|-------|
| Base URL | `http://localhost:8019` |
| Protocol | HTTP |
| Content-Type | `application/json` |
| Default Timeout | 30 seconds |

---

## Ready Endpoint

### GET /ready

Checks if the captcha worker service is ready to accept requests.

**⚠️ IMPORTANT:** The response format is `{"status": "ready"}`, NOT `{"ready": true}` as might be expected.

### Request

```http
GET /ready HTTP/1.1
Host: localhost:8019
Accept: application/json
```

### Response

#### Success (200 OK)

```json
{
  "status": "ready"
}
```

#### Not Ready (503 Service Unavailable)

```json
{
  "status": "not_ready",
  "reason": "Worker initialization in progress"
}
```

### cURL Example

```bash
curl -X GET http://localhost:8019/ready \
  -H "Accept: application/json"
```

### Expected Response

```json
{
  "status": "ready"
}
```

---

## Metrics Endpoint

### GET /metrics

Returns Prometheus-compatible metrics for monitoring.

**⚠️ IMPORTANT:** The metrics endpoint is available on the **main API port (8019)**, NOT on a separate port 8000 as some configurations might suggest.

### Request

```http
GET /metrics HTTP/1.1
Host: localhost:8019
Accept: text/plain
```

### Response

#### Success (200 OK)

Content-Type: `text/plain`

```
# HELP captcha_requests_total Total number of captcha requests
# TYPE captcha_requests_total counter
captcha_requests_total{status="success"} 42
captcha_requests_total{status="failure"} 3

# HELP captcha_solve_duration_seconds Time spent solving captchas
# TYPE captcha_solve_duration_seconds histogram
captcha_solve_duration_seconds_bucket{le="0.5"} 10
captcha_solve_duration_seconds_bucket{le="1.0"} 25
captcha_solve_duration_seconds_bucket{le="2.0"} 40
captcha_solve_duration_seconds_bucket{le="+Inf"} 45
captcha_solve_duration_seconds_sum 67.5
captcha_solve_duration_seconds_count 45

# HELP worker_status Current worker status (1=ready, 0=not_ready)
# TYPE worker_status gauge
worker_status 1

# HELP active_solving_tasks Number of currently active solving tasks
# TYPE active_solving_tasks gauge
active_solving_tasks 0
```

### cURL Example

```bash
curl -X GET http://localhost:8019/metrics \
  -H "Accept: text/plain"
```

### Key Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `captcha_requests_total` | Counter | Total captcha requests by status |
| `captcha_solve_duration_seconds` | Histogram | Time spent solving captchas |
| `worker_status` | Gauge | Worker readiness (1=ready, 0=not_ready) |
| `active_solving_tasks` | Gauge | Currently active solving operations |

---

## Health Endpoint

### GET /health

Returns detailed health status including worker information.

**⚠️ IMPORTANT:** The health endpoint includes worker status information, not just a simple up/down indicator.

### Request

```http
GET /health HTTP/1.1
Host: localhost:8019
Accept: application/json
```

### Response

#### Success (200 OK)

```json
{
  "status": "healthy",
  "timestamp": "2026-01-29T10:30:00Z",
  "version": "1.0.0",
  "worker": {
    "status": "ready",
    "uptime_seconds": 3600,
    "total_solved": 42,
    "success_rate": 0.93
  },
  "services": {
    "ocr": "available",
    "classification": "available",
    "slider": "available"
  }
}
```

#### Degraded (200 OK with warnings)

```json
{
  "status": "degraded",
  "timestamp": "2026-01-29T10:30:00Z",
  "version": "1.0.0",
  "worker": {
    "status": "ready",
    "uptime_seconds": 3600,
    "total_solved": 42,
    "success_rate": 0.93
  },
  "services": {
    "ocr": "available",
    "classification": "available",
    "slider": "degraded",
    "warnings": ["Slider model loading slowly"]
  }
}
```

#### Unhealthy (503 Service Unavailable)

```json
{
  "status": "unhealthy",
  "timestamp": "2026-01-29T10:30:00Z",
  "version": "1.0.0",
  "worker": {
    "status": "not_ready",
    "uptime_seconds": 30,
    "error": "Model initialization failed"
  },
  "services": {
    "ocr": "unavailable",
    "classification": "unavailable",
    "slider": "unavailable"
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:8019/health \
  -H "Accept: application/json"
```

### Health Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Overall health: `healthy`, `degraded`, or `unhealthy` |
| `timestamp` | string | ISO 8601 timestamp |
| `version` | string | API version |
| `worker.status` | string | Worker state: `ready` or `not_ready` |
| `worker.uptime_seconds` | number | Seconds since worker start |
| `worker.total_solved` | number | Total captchas solved |
| `worker.success_rate` | number | Success ratio (0.0 - 1.0) |
| `services.*` | string | Individual service status |

---

## Solve Endpoint

### POST /api/solve

Submits a captcha for solving.

**⚠️ IMPORTANT:** This endpoint may return HTTP 200 even for requests that are technically "invalid" (e.g., missing optional fields, malformed data). The actual success/failure is indicated in the response body.

### Request

```http
POST /api/solve HTTP/1.1
Host: localhost:8019
Content-Type: application/json
Accept: application/json
```

### Request Body

The endpoint accepts various input formats:

#### Format 1: Base64 Image

```json
{
  "image": "iVBORw0KGgoAAAANSUhEUgAA...",
  "type": "text",
  "options": {
    "case_sensitive": false,
    "length_hint": 6
  }
}
```

#### Format 2: URL

```json
{
  "url": "https://example.com/captcha.png",
  "type": "text",
  "options": {
    "timeout": 30
  }
}
```

#### Format 3: Slider Captcha

```json
{
  "image": "iVBORw0KGgoAAAANSUhEUgAA...",
  "background": "iVBORw0KGgoAAAANSUhEUgAA...",
  "type": "slider",
  "options": {
    "slider_width": 50
  }
}
```

#### Format 4: Audio Captcha

```json
{
  "audio": "//uQZ...",
  "type": "audio",
  "format": "mp3",
  "options": {
    "language": "en"
  }
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | string | Conditional* | Base64-encoded image data |
| `url` | string | Conditional* | URL to fetch image from |
| `audio` | string | Conditional* | Base64-encoded audio data |
| `background` | string | Conditional | Base64 background for slider captchas |
| `type` | string | Yes | Captcha type: `text`, `slider`, `audio`, `click` |
| `format` | string | No | Image/audio format (default: inferred) |
| `options` | object | No | Solver-specific options |

*One of `image`, `url`, or `audio` is required depending on captcha type.

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "solution": "ABC123",
  "confidence": 0.95,
  "duration_ms": 1250,
  "type": "text"
}
```

#### Partial Success (200 OK with warnings)

```json
{
  "success": true,
  "solution": "ABC123",
  "confidence": 0.72,
  "duration_ms": 2100,
  "type": "text",
  "warnings": ["Low confidence score"]
}
```

#### Failure (200 OK with error in body)

**⚠️ NOTE:** Even though the request failed, the HTTP status is still 200.

```json
{
  "success": false,
  "error": "Unable to recognize characters",
  "error_code": "OCR_FAILED",
  "duration_ms": 500,
  "type": "text"
}
```

#### Validation Error (400 Bad Request)

```json
{
  "success": false,
  "error": "Missing required field: type",
  "error_code": "VALIDATION_ERROR"
}
```

### cURL Examples

#### Text Captcha (Base64)

```bash
curl -X POST http://localhost:8019/api/solve \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "image": "'"$(base64 -i captcha.png)"'",
    "type": "text"
  }'
```

#### Text Captcha (URL)

```bash
curl -X POST http://localhost:8019/api/solve \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "url": "https://example.com/captcha.png",
    "type": "text"
  }'
```

#### Slider Captcha

```bash
curl -X POST http://localhost:8019/api/solve \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "image": "'"$(base64 -i slider.png)"'",
    "background": "'"$(base64 -i background.png)"'",
    "type": "slider"
  }'
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the solve was successful |
| `solution` | string/number | The captcha solution (text, offset, coordinates) |
| `confidence` | number | Confidence score (0.0 - 1.0) |
| `duration_ms` | number | Time taken to solve in milliseconds |
| `type` | string | Captcha type that was solved |
| `error` | string | Error message (if `success: false`) |
| `error_code` | string | Machine-readable error code |
| `warnings` | array | Non-fatal warnings |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `OCR_FAILED` | Text recognition failed |
| `CLASSIFICATION_FAILED` | Image classification failed |
| `SLIDER_FAILED` | Slider detection failed |
| `AUDIO_FAILED` | Audio transcription failed |
| `TIMEOUT` | Solve operation timed out |
| `RATE_LIMITED` | Too many requests |
| `WORKER_NOT_READY` | Worker is not ready |

---

## Unexpected Behaviors

The following behaviors were discovered during E2E testing and may differ from expected API patterns:

### 1. Ready Response Format

**Expected:** `{"ready": true}`  
**Actual:** `{"status": "ready"}`

When checking if the service is ready, the response uses a `status` field with string value `"ready"`, not a boolean `ready` field.

### 2. Metrics Port Location

**Expected:** Separate metrics server on port 8000  
**Actual:** Metrics available on main API port 8019

The Prometheus metrics endpoint is served on the same port as the API, not on a dedicated metrics port.

### 3. HTTP 200 for Invalid Requests

**Expected:** HTTP 4xx for invalid solve requests  
**Actual:** HTTP 200 with `{"success": false}` in body

The solve endpoint returns HTTP 200 even for requests that fail to solve the captcha. Check the `success` field in the response body to determine if the solve was successful.

### 4. Health Includes Worker Details

**Expected:** Simple health check: `{"status": "ok"}`  
**Actual:** Detailed response with worker statistics

The health endpoint returns comprehensive information including worker uptime, total solves, success rate, and individual service statuses.

### 5. Flexible Input Formats

**Expected:** Strict schema validation  
**Actual:** Accepts various formats with optional fields

The solve endpoint is flexible about input formats. Many fields are optional and the endpoint attempts to infer missing information (e.g., image format from data).

---

## Testing Examples

### Complete Test Flow

```bash
#!/bin/bash

BASE_URL="http://localhost:8019"

# 1. Check if service is ready
echo "=== Checking Ready Status ==="
curl -s "$BASE_URL/ready" | jq .

# 2. Get health details
echo -e "\n=== Getting Health Status ==="
curl -s "$BASE_URL/health" | jq .

# 3. Get metrics
echo -e "\n=== Getting Metrics ==="
curl -s "$BASE_URL/metrics" | head -20

# 4. Solve a captcha (example)
echo -e "\n=== Solving Captcha ==="
curl -s -X POST "$BASE_URL/api/solve" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "type": "text"
  }' | jq .
```

### Python Test Example

```python
import requests
import base64

BASE_URL = "http://localhost:8019"

# Check ready status
response = requests.get(f"{BASE_URL}/ready")
print(f"Ready: {response.json()}")
assert response.json()["status"] == "ready"

# Get health
response = requests.get(f"{BASE_URL}/health")
health = response.json()
print(f"Health: {health}")
assert health["status"] in ["healthy", "degraded"]

# Get metrics
response = requests.get(f"{BASE_URL}/metrics")
print(f"Metrics:\n{response.text[:500]}")

# Solve captcha
with open("captcha.png", "rb") as f:
    image_b64 = base64.b64encode(f.read()).decode()

response = requests.post(
    f"{BASE_URL}/api/solve",
    json={"image": image_b64, "type": "text"}
)
result = response.json()
print(f"Solve result: {result}")

if result["success"]:
    print(f"Solution: {result['solution']}")
else:
    print(f"Failed: {result['error']}")
```

### JavaScript Test Example

```javascript
const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:8019';

async function testAPI() {
  // Check ready
  const ready = await axios.get(`${BASE_URL}/ready`);
  console.log('Ready:', ready.data);
  
  // Get health
  const health = await axios.get(`${BASE_URL}/health`);
  console.log('Health:', health.data);
  
  // Get metrics
  const metrics = await axios.get(`${BASE_URL}/metrics`);
  console.log('Metrics preview:', metrics.data.substring(0, 200));
  
  // Solve captcha
  const imageBuffer = fs.readFileSync('captcha.png');
  const imageB64 = imageBuffer.toString('base64');
  
  const solve = await axios.post(`${BASE_URL}/api/solve`, {
    image: imageB64,
    type: 'text'
  });
  
  console.log('Solve result:', solve.data);
  
  if (solve.data.success) {
    console.log('Solution:', solve.data.solution);
  } else {
    console.log('Error:', solve.data.error);
  }
}

testAPI().catch(console.error);
```

---

## Summary

| Endpoint | Method | Port | Key Behavior |
|----------|--------|------|--------------|
| `/ready` | GET | 8019 | Returns `{"status": "ready"}` |
| `/metrics` | GET | 8019 | Prometheus format on main port |
| `/health` | GET | 8019 | Includes worker stats |
| `/api/solve` | POST | 8019 | Returns 200 even on solve failure |

---

## Related Documentation

- [API Reference](./api-reference.md)
- [Architecture Overview](./architecture.md)
- [Deployment Guide](./deployment.md)
- [Troubleshooting](./troubleshooting.md)

---

**Document Status:** Active  
**Maintained By:** Delqhi-Platform Team  
**Review Schedule:** Monthly or after API changes
