# SIN-Solver API Reference - V17.10

## 📚 Complete API Documentation

Diese Dokumentation beschreibt alle verfügbaren API Endpoints im SIN-Solver System.

---

## 🎯 Zimmer-13 API Koordinator

**Base URL:** `http://localhost:8000`  
**Network URL:** `http://172.20.0.31:8000`

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-27T05:54:06.050535",
  "version": "1.0.0",
  "service": "zimmer-13-api-coordinator"
}
```

---

### Workers API

#### Register Worker
```http
POST /api/workers
Content-Type: application/json

{
  "name": "Arbeiter-1",
  "type": "general",
  "capabilities": ["scraping", "browser"],
  "metadata": {}
}
```

**Response:**
```json
{
  "id": "8bce49d3-fe96-40c0-b66b-2b5c613575ab",
  "name": "Arbeiter-1",
  "type": "general",
  "status": "online",
  "capabilities": ["scraping", "browser"],
  "metadata": {},
  "registered_at": "2026-01-27T05:54:06.050535",
  "last_heartbeat": "2026-01-27T05:54:06.050535",
  "tasks_completed": 0,
  "tasks_failed": 0
}
```

#### List Workers
```http
GET /api/workers
```

#### Get Worker
```http
GET /api/workers/{worker_id}
```

#### Update Worker
```http
PUT /api/workers/{worker_id}
Content-Type: application/json

{
  "status": "busy",
  "metadata": {"current_task": "task-123"}
}
```

#### Worker Heartbeat
```http
POST /api/workers/{worker_id}/heartbeat
```

#### Unregister Worker
```http
DELETE /api/workers/{worker_id}
```

#### Task Completed
```http
POST /api/workers/{worker_id}/task/complete?success=true
```

#### Worker Statistics
```http
GET /api/workers/stats/summary
```

**Response:**
```json
{
  "total_workers": 3,
  "online": 2,
  "busy": 1,
  "offline": 0,
  "total_tasks_completed": 150,
  "total_tasks_failed": 5,
  "timestamp": "2026-01-27T05:55:58.363275"
}
```

---

### Tasks API

#### Create Task
```http
POST /api/tasks
Content-Type: application/json

{
  "name": "solve-captcha-batch-1",
  "type": "captcha",
  "priority": "high",
  "payload": {
    "images": ["base64..."],
    "type": "hcaptcha"
  },
  "metadata": {}
}
```

**Task Types:** `general`, `captcha`, `survey`, `browser`, `scraper`  
**Priority Levels:** `low`, `normal`, `high`, `critical`

**Response:**
```json
{
  "id": "task-uuid",
  "name": "solve-captcha-batch-1",
  "type": "captcha",
  "status": "pending",
  "priority": "high",
  "payload": {...},
  "metadata": {},
  "assigned_worker": null,
  "created_at": "2026-01-27T06:00:00.000000",
  "started_at": null,
  "completed_at": null,
  "result": null,
  "error": null
}
```

#### List Tasks
```http
GET /api/tasks?status=pending&limit=10&worker_id=worker-uuid
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: pending, assigned, running, completed, failed, cancelled |
| `limit` | int | Max results (1-100, default: 10) |
| `worker_id` | string | Filter by assigned worker |

#### Get Task
```http
GET /api/tasks/{task_id}
```

#### Assign Task
```http
PUT /api/tasks/{task_id}/assign?worker_id=worker-uuid
```

#### Start Task
```http
PUT /api/tasks/{task_id}/start
```

#### Complete Task
```http
PUT /api/tasks/{task_id}/complete
Content-Type: application/json

{
  "result": {"solution": "abc123"},
  "error": null
}
```

#### Cancel Task
```http
DELETE /api/tasks/{task_id}
```

---

## 🔐 Zimmer-19 Captcha Worker

**Base URL:** `http://localhost:8019`  
**Network URL:** `http://172.20.0.81:8019`

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "solvers": {
    "ocr": true,
    "slider": true,
    "audio": true,
    "click": true,
    "image_classifier": true
  },
  "uptime_seconds": 3600.5
}
```

### Unified Solver (Auto-Detect)
```http
POST /solve
Content-Type: application/json

{
  "image": "base64_encoded_image",
  "type": "auto"
}
```

### OCR Solver (Text CAPTCHAs)
```http
POST /ocr
Content-Type: application/json

{
  "image": "base64_encoded_image"
}
```

**Response:**
```json
{
  "success": true,
  "text": "ABC123",
  "confidence": 0.95,
  "solver": "ddddocr"
}
```

### Slider Solver
```http
POST /slider
Content-Type: application/json

{
  "background": "base64_background",
  "slider": "base64_slider_piece"
}
```

**Response:**
```json
{
  "success": true,
  "offset_x": 145,
  "confidence": 0.92
}
```

### Audio Solver (Whisper)
```http
POST /audio
Content-Type: application/json

{
  "audio": "base64_encoded_audio",
  "format": "mp3"
}
```

**Response:**
```json
{
  "success": true,
  "text": "seven four two nine",
  "digits": "7429"
}
```

### Click Target Solver
```http
POST /click
Content-Type: application/json

{
  "image": "base64_image",
  "target": "traffic lights"
}
```

**Response:**
```json
{
  "success": true,
  "coordinates": [
    {"x": 120, "y": 85},
    {"x": 250, "y": 180}
  ]
}
```

### Image Classifier (hCaptcha)
```http
POST /image-classify
Content-Type: application/json

{
  "images": ["base64_1", "base64_2", ...],
  "category": "bicycle"
}
```

**Response:**
```json
{
  "success": true,
  "matches": [0, 3, 5],
  "confidence": [0.95, 0.88, 0.92]
}
```

---

## 📋 Zimmer-18 Survey Worker

**Base URL:** `http://localhost:8018`  
**Network URL:** `http://172.20.0.80:8018`

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "active",
  "service": "sin-survey-worker",
  "zimmer": 18,
  "mode": "one_worker_per_platform",
  "paid_services": false
}
```

### Start Survey Session
```http
POST /api/start
Content-Type: application/json

{
  "platform": "swagbucks",
  "account_id": "account-uuid",
  "survey_type": "daily"
}
```

### Get Status
```http
GET /api/status
```

### List Platforms
```http
GET /api/platforms
```

**Response:**
```json
{
  "platforms": [
    {"id": "swagbucks", "name": "Swagbucks", "status": "active"},
    {"id": "prolific", "name": "Prolific", "status": "active"},
    {"id": "mturk", "name": "Amazon MTurk", "status": "configured"},
    {"id": "clickworker", "name": "Clickworker", "status": "active"}
  ]
}
```

---

## 📬 Zimmer-09 ClawdBot-Bote

**Base URL:** `http://localhost:8004`  
**Network URL:** `http://172.20.0.9:8080`

### Health Check
```http
GET /health
```

### Send Notification
```http
POST /api/notify
Content-Type: application/json

{
  "message": "Task completed successfully!",
  "type": "success",
  "providers": ["telegram", "discord"]
}
```

**Types:** `info`, `success`, `warning`, `error`  
**Providers:** `telegram`, `whatsapp`, `discord`, `all`

### Send Alert
```http
POST /api/alert
Content-Type: application/json

{
  "message": "Critical error in Zimmer-19!",
  "severity": "critical"
}
```

### Get Messenger Status
```http
GET /api/messengers
```

### Get WhatsApp QR Code
```http
GET /api/whatsapp/qr
```

**Response:**
```json
{
  "status": "awaiting_scan",
  "hasQR": true,
  "qr": "data:image/png;base64,..."
}
```

### Logout WhatsApp
```http
POST /api/whatsapp/logout
```

### Get Notification History
```http
GET /api/notifications
```

### n8n Webhooks
```http
POST /webhooks/n8n/survey-complete
POST /webhooks/n8n/earnings-update
POST /webhooks/n8n/error-alert
```

---

## 🔌 Integration Examples

### Python
```python
import requests

# Register Worker
response = requests.post(
    "http://localhost:8000/api/workers",
    json={"name": "Python-Worker", "type": "general", "capabilities": []}
)
worker = response.json()
print(f"Registered: {worker['id']}")

# Solve CAPTCHA
response = requests.post(
    "http://localhost:8019/ocr",
    json={"image": base64_image}
)
result = response.json()
print(f"Solved: {result['text']}")
```

### JavaScript/Node.js
```javascript
const axios = require('axios');

// Create Task
const task = await axios.post('http://localhost:8000/api/tasks', {
  name: 'captcha-solve',
  type: 'captcha',
  priority: 'high',
  payload: { image: base64Image }
});

console.log('Task created:', task.data.id);
```

### cURL
```bash
# Worker Stats
curl -s http://localhost:8000/api/workers/stats/summary | jq .

# Solve CAPTCHA
curl -X POST http://localhost:8019/ocr \
  -H "Content-Type: application/json" \
  -d '{"image": "base64..."}' | jq .

# Send Notification
curl -X POST http://localhost:8004/api/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "type": "info"}'
```

---

## 🚨 Error Responses

All APIs return consistent error format:

```json
{
  "error": "Error code",
  "message": "Human readable message",
  "status_code": 400,
  "request_id": "uuid"
}
```

### Common Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing auth) |
| 404 | Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## 📊 Rate Limits

| Service | Limit | Window |
|---------|-------|--------|
| API Koordinator | 1000 req | per minute |
| Captcha Worker | 100 req | per minute |
| ClawdBot | 60 req | per minute |

---

**Version:** V17.10  
**Last Updated:** 2026-01-27
