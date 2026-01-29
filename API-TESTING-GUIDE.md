# 🧪 API Testing Guide - SIN-Solver Dashboard

> **Comprehensive guide for testing all 11 API endpoints** with curl, Postman, and programmatic examples.

**Document Version:** 1.0  
**Last Updated:** 2026-01-30  
**API Base URL:** `http://localhost:8000/api`

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Health & System Endpoints](#health--system-endpoints)
3. [CAPTCHA Service Endpoints](#captcha-service-endpoints)
4. [Workflow Management Endpoints](#workflow-management-endpoints)
5. [Chat Service Endpoints](#chat-service-endpoints)
6. [Testing Best Practices](#testing-best-practices)
7. [Postman Collection](#postman-collection)
8. [Performance Benchmarking](#performance-benchmarking)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

```bash
# Verify API server is running
curl http://localhost:8000/api/health

# You should see:
# {"success": true, "data": {...}, "timestamp": "2026-01-30T..."}
```

### Common curl Options

```bash
# Set headers
-H "Content-Type: application/json"
-H "Accept: application/json"

# Include response headers
-i

# Verbose output (shows request/response details)
-v

# Pretty-print JSON response
| jq

# Save response to file
-o response.json

# Follow redirects
-L
```

---

## Health & System Endpoints

### 1. GET /api/health - System Health Check

**Purpose:** Check if the API server and dependencies are healthy

**Request:**
```bash
curl -X GET http://localhost:8000/api/health
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "services": {
      "postgres": "healthy",
      "redis": "healthy",
      "external_api": "healthy"
    },
    "timestamp": "2026-01-30T12:34:56.000Z"
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

**Error Cases:**

```bash
# Service Down (503 Service Unavailable)
curl -i http://localhost:8000/api/health
# Response: {"success": false, "data": {...}, "timestamp": "..."}

# Server Down (Connection refused)
curl http://localhost:8000/api/health
# curl: (7) Failed to connect
```

**Performance Benchmark:**
- **Expected:** < 100ms
- **Timeout:** 5 seconds

---

### 2. GET /api/services - List All Services

**Purpose:** Get list of available services and their status

**Request:**
```bash
curl -X GET http://localhost:8000/api/services
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "name": "postgres",
        "status": "running",
        "port": 5432,
        "healthy": true
      },
      {
        "name": "redis",
        "status": "running",
        "port": 6379,
        "healthy": true
      },
      {
        "name": "vault",
        "status": "running",
        "port": 8200,
        "healthy": true
      },
      {
        "name": "api_gateway",
        "status": "running",
        "port": 8000,
        "healthy": true
      }
    ],
    "total": 4,
    "healthy_count": 4
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

**Query Parameters:**
- `filter` (optional): Filter by service type (e.g., `?filter=database`)
- `status` (optional): Filter by status (e.g., `?status=running`)

**Examples:**
```bash
# Get only running services
curl http://localhost:8000/api/services?status=running

# Get database services only
curl http://localhost:8000/api/services?filter=database
```

---

### 3. GET /api/docs/content - API Documentation

**Purpose:** Get formatted API documentation content

**Request:**
```bash
curl -X GET http://localhost:8000/api/docs/content
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "title": "SIN-Solver API Documentation",
    "version": "1.0.0",
    "description": "Enterprise AI Automation Platform API",
    "endpoints": [
      {
        "method": "GET",
        "path": "/health",
        "description": "System health check",
        "parameters": [],
        "response_code": 200
      },
      {
        "method": "GET",
        "path": "/services",
        "description": "List all services",
        "parameters": ["filter", "status"],
        "response_code": 200
      }
    ],
    "total_endpoints": 11
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

**Format Options:**
```bash
# Get as HTML (for browser viewing)
curl http://localhost:8000/api/docs/content?format=html

# Get as Markdown
curl http://localhost:8000/api/docs/content?format=markdown

# Get as OpenAPI/Swagger JSON
curl http://localhost:8000/api/docs/content?format=openapi
```

---

## CAPTCHA Service Endpoints

### 4. GET /api/captcha/status - CAPTCHA Status

**Purpose:** Get current CAPTCHA service status and statistics

**Request:**
```bash
curl -X GET http://localhost:8000/api/captcha/status
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "service": "captcha_worker",
    "status": "running",
    "active_jobs": 0,
    "queued_jobs": 0,
    "total_solved_today": 156,
    "success_rate": 98.7,
    "avg_solve_time_ms": 2340,
    "last_solve": "2026-01-30T12:30:45.000Z",
    "uptime_seconds": 3600
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

**Query Parameters:**
- `include_history` (optional): Include last 10 solved CAPTCHAs
- `time_range` (optional): Time range for stats (1h, 24h, 7d)

---

### 5. POST /api/captcha/solve - Solve CAPTCHA

**Purpose:** Submit a CAPTCHA image for solving

**Request:**
```bash
# Basic request
curl -X POST http://localhost:8000/api/captcha/solve \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/captcha.png",
    "captcha_type": "image",
    "priority": "normal"
  }'
```

**Request Body Schema:**
```json
{
  "image_url": "string (required) - URL to captcha image",
  "captcha_type": "string (required) - Type: image, text, slider, click, puzzle",
  "priority": "string (optional) - Priority: low, normal, high (default: normal)",
  "timeout_seconds": "integer (optional) - Max wait time (default: 30)",
  "callback_url": "string (optional) - Webhook URL for result notification"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "job_id": "job_c4f8e2a9",
    "status": "processing",
    "captcha_type": "image",
    "estimated_time_ms": 2000,
    "position_in_queue": 0
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "data": {
    "error": "invalid_image_url",
    "message": "Image URL is not accessible"
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

**Example: Check Result (Poll)**
```bash
# Get CAPTCHA solution (poll every 2 seconds)
curl -X GET http://localhost:8000/api/captcha/solve/job_c4f8e2a9

# Response when complete:
{
  "success": true,
  "data": {
    "job_id": "job_c4f8e2a9",
    "status": "completed",
    "solution": "8MyF4x",
    "confidence": 0.987,
    "solved_at": "2026-01-30T12:34:58.000Z"
  },
  "timestamp": "2026-01-30T12:34:59.000Z"
}
```

---

### 6. GET /api/captcha/stats - CAPTCHA Statistics

**Purpose:** Get detailed CAPTCHA solving statistics

**Request:**
```bash
curl -X GET http://localhost:8000/api/captcha/stats?period=24h
```

**Query Parameters:**
- `period` (optional): Time period - 1h, 24h, 7d, 30d (default: 24h)
- `type_filter` (optional): Filter by type - image, text, slider, click, puzzle

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "24h",
    "total_jobs": 1240,
    "successful": 1224,
    "failed": 16,
    "success_rate": 98.71,
    "stats_by_type": {
      "image": {
        "total": 620,
        "successful": 615,
        "avg_time_ms": 2100,
        "success_rate": 99.19
      },
      "text": {
        "total": 450,
        "successful": 441,
        "avg_time_ms": 1800,
        "success_rate": 98.0
      },
      "slider": {
        "total": 120,
        "successful": 120,
        "avg_time_ms": 3200,
        "success_rate": 100.0
      },
      "click": {
        "total": 50,
        "successful": 48,
        "avg_time_ms": 2500,
        "success_rate": 96.0
      }
    },
    "peak_time": "14:30",
    "peak_requests_per_min": 45
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

---

## Workflow Management Endpoints

### 7. POST /api/workflows/generate - Generate Workflow

**Purpose:** Generate a new workflow from specification

**Request:**
```bash
curl -X POST http://localhost:8000/api/workflows/generate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Survey Automation Flow",
    "description": "Automated survey completion",
    "steps": [
      {
        "action": "navigate",
        "url": "https://example-survey.com"
      },
      {
        "action": "fill_form",
        "selector": "input[name=q1]",
        "value": "Yes"
      }
    ],
    "trigger": "manual"
  }'
```

**Request Body Schema:**
```json
{
  "name": "string (required) - Workflow name",
  "description": "string (optional) - Workflow description",
  "steps": "array (required) - List of workflow steps",
  "trigger": "string (optional) - Trigger type: manual, scheduled, event (default: manual)",
  "schedule": "string (optional) - Cron expression if scheduled",
  "tags": "array (optional) - Tags for organization"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "workflow_id": "wf_7a4e6b2c",
    "name": "Survey Automation Flow",
    "status": "created",
    "step_count": 2,
    "created_at": "2026-01-30T12:34:56.000Z"
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

---

### 8. GET /api/workflows/active - List Active Workflows

**Purpose:** Get list of currently active workflows

**Request:**
```bash
curl -X GET http://localhost:8000/api/workflows/active
```

**Query Parameters:**
- `limit` (optional): Max results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `filter` (optional): Filter by status - running, paused, completed

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "workflow_id": "wf_7a4e6b2c",
        "name": "Survey Automation Flow",
        "status": "running",
        "progress": 45,
        "start_time": "2026-01-30T12:30:00.000Z",
        "estimated_completion": "2026-01-30T12:35:00.000Z"
      },
      {
        "workflow_id": "wf_3f1b8e9d",
        "name": "Data Collection",
        "status": "running",
        "progress": 20,
        "start_time": "2026-01-30T12:32:00.000Z",
        "estimated_completion": "2026-01-30T12:42:00.000Z"
      }
    ],
    "total": 2,
    "pagination": {
      "limit": 50,
      "offset": 0
    }
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

---

### 9. POST /api/workflows/[id]/correct - Correct Workflow

**Purpose:** Submit corrections to a running workflow

**Request:**
```bash
curl -X POST http://localhost:8000/api/workflows/wf_7a4e6b2c/correct \
  -H "Content-Type: application/json" \
  -d '{
    "step_number": 2,
    "correction_type": "retry",
    "new_value": "Different answer",
    "reason": "Previous answer was incorrect"
  }'
```

**Request Body Schema:**
```json
{
  "step_number": "integer (required) - Step to correct",
  "correction_type": "string (required) - Type: retry, replace, skip",
  "new_value": "string (optional) - New value for replacement",
  "reason": "string (optional) - Reason for correction"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "workflow_id": "wf_7a4e6b2c",
    "correction_id": "corr_8c3a9f1",
    "step_corrected": 2,
    "status": "applied",
    "workflow_resumed": true,
    "new_progress": 50
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "data": {
    "error": "workflow_not_found",
    "message": "Workflow wf_invalid does not exist"
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

---

## Chat Service Endpoints

### 10. POST /api/chat/message - Send Chat Message

**Purpose:** Send a message to the chat service

**Request:**
```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I start a new workflow?",
    "session_id": "sess_abc123",
    "context": "general"
  }'
```

**Request Body Schema:**
```json
{
  "message": "string (required) - User message",
  "session_id": "string (optional) - Session ID for continuity",
  "context": "string (optional) - Context type: general, technical, api, deployment",
  "user_id": "string (optional) - User identifier",
  "metadata": "object (optional) - Additional metadata"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "message_id": "msg_f7d4c1e8",
    "session_id": "sess_abc123",
    "user_message": "How do I start a new workflow?",
    "bot_response": "To start a new workflow, use the POST /api/workflows/generate endpoint with your workflow definition...",
    "response_time_ms": 340,
    "context_matched": ["api", "workflows"]
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "data": {
    "error": "empty_message",
    "message": "Message cannot be empty"
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

---

### 11. GET /api/chat/history - Get Chat History

**Purpose:** Retrieve chat history for a session

**Request:**
```bash
curl -X GET "http://localhost:8000/api/chat/history?session_id=sess_abc123&limit=20"
```

**Query Parameters:**
- `session_id` (required): Session to retrieve history for
- `limit` (optional): Max messages (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `start_date` (optional): Start date filter (ISO 8601)
- `end_date` (optional): End date filter (ISO 8601)

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "session_id": "sess_abc123",
    "messages": [
      {
        "message_id": "msg_a1b2c3d4",
        "role": "user",
        "content": "How do I create a workflow?",
        "timestamp": "2026-01-30T12:30:00.000Z"
      },
      {
        "message_id": "msg_e5f6g7h8",
        "role": "assistant",
        "content": "To create a workflow, use POST /api/workflows/generate...",
        "timestamp": "2026-01-30T12:30:05.000Z"
      },
      {
        "message_id": "msg_f7d4c1e8",
        "role": "user",
        "content": "How do I start a new workflow?",
        "timestamp": "2026-01-30T12:34:56.000Z"
      },
      {
        "message_id": "msg_i9j0k1l2",
        "role": "assistant",
        "content": "To start a new workflow...",
        "timestamp": "2026-01-30T12:35:00.000Z"
      }
    ],
    "total": 4,
    "pagination": {
      "limit": 20,
      "offset": 0
    }
  },
  "timestamp": "2026-01-30T12:34:56.000Z"
}
```

---

## Testing Best Practices

### 1. Test Order (Recommended)

```bash
# 1. Health check first (ensures server is up)
curl http://localhost:8000/api/health

# 2. System info
curl http://localhost:8000/api/services

# 3. Documentation
curl http://localhost:8000/api/docs/content

# 4. Business logic endpoints (CAPTCHA, workflows, chat)
# ... test in logical order based on dependencies
```

### 2. Response Validation

Always check:
- **Status Code:** Should match expected (200, 201, 400, etc.)
- **JSON Format:** Parse and validate structure
- **Required Fields:** success, data, timestamp
- **Data Correctness:** Values match expectations

```bash
# Example with validation
RESPONSE=$(curl -s http://localhost:8000/api/health)
SUCCESS=$(echo $RESPONSE | jq '.success')

if [ "$SUCCESS" = "true" ]; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  echo $RESPONSE | jq '.'
fi
```

### 3. Error Handling Tests

```bash
# Test invalid endpoint (should return 404)
curl -i http://localhost:8000/api/invalid

# Test invalid method (should return 405)
curl -X DELETE http://localhost:8000/api/health

# Test invalid JSON (should return 400)
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d 'invalid json'
```

### 4. Performance Testing

```bash
# Single request timing
time curl http://localhost:8000/api/health

# Multiple requests (load test)
for i in {1..100}; do
  curl -s http://localhost:8000/api/health > /dev/null &
done
wait

# Using Apache Bench
ab -n 1000 -c 10 http://localhost:8000/api/health/

# Using wrk (if installed)
wrk -t4 -c100 -d30s http://localhost:8000/api/health
```

---

## Postman Collection

### Import Collection

1. Download Postman from [postman.com](https://www.postman.com/downloads/)
2. Create new collection or import JSON file
3. Set environment variable: `api_base_url = http://localhost:8000/api`

### Collection JSON

Create file: `postman_collection.json`

```json
{
  "info": {
    "name": "SIN-Solver API",
    "description": "Complete API testing collection",
    "version": "1.0.0"
  },
  "item": [
    {
      "name": "Health & System",
      "item": [
        {
          "name": "Get Health",
          "request": {
            "method": "GET",
            "url": "{{api_base_url}}/health"
          }
        },
        {
          "name": "List Services",
          "request": {
            "method": "GET",
            "url": "{{api_base_url}}/services"
          }
        }
      ]
    },
    {
      "name": "CAPTCHA",
      "item": [
        {
          "name": "Get CAPTCHA Status",
          "request": {
            "method": "GET",
            "url": "{{api_base_url}}/captcha/status"
          }
        },
        {
          "name": "Solve CAPTCHA",
          "request": {
            "method": "POST",
            "url": "{{api_base_url}}/captcha/solve",
            "body": {
              "mode": "raw",
              "raw": "{\"image_url\":\"https://example.com/captcha.png\",\"captcha_type\":\"image\",\"priority\":\"normal\"}"
            }
          }
        }
      ]
    }
  ]
}
```

---

## Performance Benchmarking

### Expected Response Times

| Endpoint | Expected | Max Acceptable |
|----------|----------|-----------------|
| /api/health | 50ms | 100ms |
| /api/services | 100ms | 200ms |
| /api/docs/content | 150ms | 300ms |
| /api/captcha/status | 100ms | 200ms |
| /api/captcha/solve | 500ms | 1000ms |
| /api/captcha/stats | 200ms | 500ms |
| /api/workflows/generate | 300ms | 600ms |
| /api/workflows/active | 150ms | 300ms |
| /api/workflows/[id]/correct | 250ms | 500ms |
| /api/chat/message | 400ms | 800ms |
| /api/chat/history | 200ms | 400ms |

### Load Test Example

```bash
#!/bin/bash
# load_test.sh

echo "🧪 Running load tests..."

for endpoint in \
  "/health" \
  "/services" \
  "/captcha/status" \
  "/workflows/active" \
  "/chat/history?session_id=test"
do
  echo ""
  echo "Testing: $endpoint"
  
  # Run 100 requests with 10 concurrent
  ab -n 100 -c 10 -q "http://localhost:8000/api$endpoint"
done

echo ""
echo "✅ Load tests complete"
```

---

## Troubleshooting

### Common Issues

**1. Connection Refused**
```bash
# Error: curl: (7) Failed to connect

# Solution: Verify server is running
docker-compose -f docker-compose.enterprise.yml ps

# If not running, start it
docker-compose -f docker-compose.enterprise.yml up -d
```

**2. Timeout Errors**
```bash
# Error: Operation timed out

# Solution: Check service health
curl http://localhost:8000/api/health

# Increase curl timeout
curl --max-time 10 http://localhost:8000/api/health
```

**3. JSON Parse Errors**
```bash
# Error: jq parse error

# Solution: Verify response is valid JSON
curl http://localhost:8000/api/health | jq '.'

# Or use Python for validation
curl http://localhost:8000/api/health | python -m json.tool
```

**4. 405 Method Not Allowed**
```bash
# Error: {"error": "method_not_allowed"}

# Solution: Use correct HTTP method
# ❌ Wrong: curl -X POST http://localhost:8000/api/health
# ✅ Correct: curl -X GET http://localhost:8000/api/health
```

**5. 400 Bad Request**
```bash
# Error: {"error": "validation_error"}

# Solution: Validate request body
# ✅ Correct format:
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","session_id":"sess_123"}'
```

### Debug Commands

```bash
# Check all services health
curl http://localhost:8000/api/health | jq '.data.services'

# List running containers
docker ps

# Check container logs
docker logs room-13-api-brain

# Test container connectivity
docker exec room-13-api-brain curl http://localhost:8000/api/health

# Check ports
lsof -i :8000

# Network connectivity test
docker network inspect sin-solver_default
```

---

## Summary

✅ **All 11 API endpoints are production-ready and fully tested**

- **3** Health & System endpoints
- **3** CAPTCHA Service endpoints
- **3** Workflow Management endpoints
- **2** Chat Service endpoints

For API deployment and monitoring, see: **[SYSTEM-DEPLOYMENT-CHECKLIST.md](./SYSTEM-DEPLOYMENT-CHECKLIST.md)**

---

**Document Last Updated:** 2026-01-30  
**API Version:** 1.0.0  
**Status:** ✅ Production Ready
