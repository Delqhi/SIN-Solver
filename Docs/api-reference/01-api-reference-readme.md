# Delqhi-Platform API Reference - V17.10

## 📚 Complete API Documentation

Diese Dokumentation beschreibt alle verfügbaren API Endpoints im Delqhi-Platform System.

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

## 🤖 Agent-04.1 OpenHands CodeServer

**Base URL:** `http://localhost:8041`  
**Network URL:** `http://172.20.0.141:8041`

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "openhands-codeserver",
  "agent": "04.1",
  "version": "1.0.0",
  "uptime_seconds": 7200,
  "timestamp": "2026-01-27T06:15:30.000000"
}
```

---

### 📝 Original Endpoints

#### Create Code Task
```http
POST /api/code
Content-Type: application/json

{
  "prompt": "Create a Python function that solves Fizzbuzz",
  "language": "python",
  "context": {
    "framework": "none",
    "requirements": []
  }
}
```

**Response:**
```json
{
  "task_id": "code-task-uuid",
  "status": "pending",
  "prompt": "Create a Python function that solves Fizzbuzz",
  "language": "python",
  "created_at": "2026-01-27T06:15:30.000000",
  "started_at": null,
  "completed_at": null,
  "code": null,
  "error": null
}
```

#### Get Code Task Status
```http
GET /api/code/status/{taskId}
```

**Response:**
```json
{
  "task_id": "code-task-uuid",
  "status": "completed",
  "progress": 100,
  "code": "def fizzbuzz(n):\n    for i in range(1, n+1):\n        if i % 15 == 0:\n            print('FizzBuzz')\n        elif i % 3 == 0:\n            print('Fizz')\n        elif i % 5 == 0:\n            print('Buzz')\n        else:\n            print(i)",
  "tests_passed": 5,
  "tests_total": 5,
  "execution_time_ms": 1250
}
```

#### Stream Code Task Results
```http
GET /api/code/stream/{taskId}
```

**Response (Server-Sent Events):**
```
event: code_start
data: {"task_id": "code-task-uuid"}

event: code_chunk
data: {"chunk": "def fizzbuzz(n):\n", "progress": 10}

event: code_complete
data: {"task_id": "code-task-uuid", "total_time_ms": 1250}
```

#### Cancel Code Task
```http
DELETE /api/code/{taskId}
```

**Response:**
```json
{
  "task_id": "code-task-uuid",
  "status": "cancelled",
  "cancelled_at": "2026-01-27T06:16:30.000000"
}
```

#### List Code Tasks
```http
GET /api/tasks?status=completed&limit=20&language=python
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: pending, running, completed, failed, cancelled |
| `limit` | int | Max results (1-100, default: 10) |
| `language` | string | Filter by language: python, javascript, typescript, java, go |
| `offset` | int | Pagination offset (default: 0) |

**Response:**
```json
{
  "tasks": [
    {
      "task_id": "code-task-uuid",
      "status": "completed",
      "language": "python",
      "prompt": "Create a Python function...",
      "created_at": "2026-01-27T06:15:30.000000"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

#### Webhook: n8n Integration
```http
POST /webhook/n8n
Content-Type: application/json

{
  "event": "code_task_created",
  "task_id": "code-task-uuid",
  "prompt": "Generate code",
  "source": "n8n-workflow-123"
}
```

#### Webhook: Agent Zero Integration
```http
POST /webhook/agent-zero
Content-Type: application/json

{
  "event": "code_execution_complete",
  "task_id": "code-task-uuid",
  "execution_result": {
    "output": "Hello, World!",
    "exit_code": 0
  }
}
```

#### Webhook: Cockpit Chat Integration
```http
POST /webhook/cockpit-chat
Content-Type: application/json

{
  "event": "user_request",
  "user_id": "user-uuid",
  "message": "Generate REST API",
  "conversation_id": "conv-uuid"
}
```

#### Webhook: Delqhi Chat Integration
```http
POST /webhook/delqhi-chat
Content-Type: application/json

{
  "event": "chat_message",
  "user_id": "delqhi-user-123",
  "message": "Help me debug this code",
  "context": {}
}
```

#### Webhook: Telegram Integration
```http
POST /webhook/telegram
Content-Type: application/json

{
  "event": "telegram_message",
  "chat_id": "123456789",
  "message": "/code generate a Python script"
}
```

#### Webhook: OpenCode CLI Integration
```http
POST /webhook/opencode-cli
Content-Type: application/json

{
  "event": "opencode_command",
  "command": "generate",
  "args": ["React component"],
  "session_id": "cli-session-uuid"
}
```

---

### 💬 Conversation Management

#### List Conversations
```http
GET /api/conversations?limit=50&user_id=user-uuid
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | int | Max results (1-100, default: 20) |
| `user_id` | string | Filter by user ID |
| `status` | string | Filter: active, archived, closed |
| `offset` | int | Pagination offset |

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv-uuid",
      "user_id": "user-uuid",
      "title": "Python API Development",
      "status": "active",
      "message_count": 15,
      "created_at": "2026-01-27T06:00:00.000000",
      "last_message_at": "2026-01-27T06:15:30.000000"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

#### Get Conversation
```http
GET /api/conversations/{id}
```

**Response:**
```json
{
  "id": "conv-uuid",
  "user_id": "user-uuid",
  "title": "Python API Development",
  "status": "active",
  "context": {
    "framework": "FastAPI",
    "database": "PostgreSQL"
  },
  "created_at": "2026-01-27T06:00:00.000000",
  "updated_at": "2026-01-27T06:15:30.000000"
}
```

#### Create Conversation
```http
POST /api/conversations
Content-Type: application/json

{
  "user_id": "user-uuid",
  "title": "Python API Development",
  "context": {
    "framework": "FastAPI",
    "database": "PostgreSQL"
  }
}
```

**Response:**
```json
{
  "id": "conv-uuid",
  "user_id": "user-uuid",
  "title": "Python API Development",
  "status": "active",
  "created_at": "2026-01-27T06:15:30.000000"
}
```

#### Delete Conversation
```http
DELETE /api/conversations/{id}
```

**Response:**
```json
{
  "id": "conv-uuid",
  "status": "deleted",
  "deleted_at": "2026-01-27T06:20:00.000000"
}
```

#### List Conversation Messages
```http
GET /api/conversations/{id}/messages?limit=50
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | int | Max results (1-100, default: 20) |
| `offset` | int | Pagination offset (default: 0) |
| `role` | string | Filter: user, assistant, system |

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-uuid",
      "conversation_id": "conv-uuid",
      "role": "user",
      "content": "Create a REST API endpoint",
      "created_at": "2026-01-27T06:15:30.000000"
    }
  ],
  "total": 30,
  "limit": 50,
  "offset": 0
}
```

#### Add Message to Conversation
```http
POST /api/conversations/{id}/messages
Content-Type: application/json

{
  "role": "user",
  "content": "Add authentication middleware"
}
```

**Response:**
```json
{
  "id": "msg-uuid",
  "conversation_id": "conv-uuid",
  "role": "user",
  "content": "Add authentication middleware",
  "created_at": "2026-01-27T06:15:30.000000"
}
```

---

### 📁 File Operations

#### List Files
```http
GET /api/files?path=/workspace&recursive=true
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | string | Directory path (default: /) |
| `recursive` | boolean | Include subdirectories (default: false) |
| `pattern` | string | File pattern filter (glob) |

**Response:**
```json
{
  "files": [
    {
      "path": "/workspace/src/main.py",
      "name": "main.py",
      "type": "file",
      "size_bytes": 1024,
      "modified_at": "2026-01-27T06:00:00.000000"
    }
  ],
  "total": 15,
  "path": "/workspace"
}
```

#### Get File Content
```http
GET /api/files/{path}
```

**Response:**
```
def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
```

**Headers (for binary):**
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="main.py"
```

#### Create/Update File
```http
POST /api/files/{path}
Content-Type: application/json

{
  "content": "def hello():\n    print('Hello')",
  "encoding": "utf-8"
}
```

**Response:**
```json
{
  "path": "/workspace/hello.py",
  "name": "hello.py",
  "type": "file",
  "size_bytes": 32,
  "created_at": "2026-01-27T06:15:30.000000"
}
```

#### Delete File
```http
DELETE /api/files/{path}
```

**Response:**
```json
{
  "path": "/workspace/hello.py",
  "deleted_at": "2026-01-27T06:20:00.000000"
}
```

---

### 🔀 Git Operations

#### Get Git Status
```http
GET /api/git/status
```

**Response:**
```json
{
  "branch": "main",
  "commit": "abc123def456",
  "modified_files": ["src/main.py", "README.md"],
  "untracked_files": ["temp.log"],
  "staged_files": [],
  "is_dirty": true
}
```

#### Commit Changes
```http
POST /api/git/commit
Content-Type: application/json

{
  "message": "feat: Add authentication",
  "files": ["src/auth.py", "src/main.py"]
}
```

**Response:**
```json
{
  "commit_hash": "abc123def456",
  "message": "feat: Add authentication",
  "author": "OpenHands",
  "timestamp": "2026-01-27T06:15:30.000000",
  "files_changed": 2
}
```

#### Get Git Diff
```http
GET /api/git/diff?file=src/main.py
```

**Response:**
```json
{
  "file": "src/main.py",
  "diff": "--- a/src/main.py\n+++ b/src/main.py\n@@ -1,3 +1,5 @@\n def main():\n+    print('Starting')\n     print('Hello')",
  "additions": 1,
  "deletions": 0
}
```

#### Get Git Log
```http
GET /api/git/log?limit=20
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | int | Max commits (default: 10) |
| `file` | string | Filter by file path |
| `author` | string | Filter by author |

**Response:**
```json
{
  "commits": [
    {
      "hash": "abc123def456",
      "message": "feat: Add authentication",
      "author": "OpenHands",
      "timestamp": "2026-01-27T06:15:30.000000"
    }
  ],
  "total": 150
}
```

#### Push Changes
```http
POST /api/git/push
Content-Type: application/json

{
  "branch": "main",
  "remote": "origin"
}
```

**Response:**
```json
{
  "branch": "main",
  "remote": "origin",
  "status": "success",
  "pushed_commits": 5,
  "timestamp": "2026-01-27T06:15:30.000000"
}
```

#### Pull Changes
```http
POST /api/git/pull
Content-Type: application/json

{
  "branch": "main",
  "remote": "origin"
}
```

**Response:**
```json
{
  "branch": "main",
  "remote": "origin",
  "status": "success",
  "merged_commits": 3,
  "timestamp": "2026-01-27T06:15:30.000000"
}
```

---

### 🏢 Workspace Management

#### List Workspaces
```http
GET /api/workspaces
```

**Response:**
```json
{
  "workspaces": [
    {
      "id": "workspace-uuid",
      "name": "main-project",
      "path": "/workspaces/main-project",
      "status": "active",
      "created_at": "2026-01-27T06:00:00.000000"
    }
  ],
  "total": 3
}
```

#### Get Current Workspace
```http
GET /api/workspace/current
```

**Response:**
```json
{
  "id": "workspace-uuid",
  "name": "main-project",
  "path": "/workspaces/main-project",
  "status": "active",
  "language": "python",
  "framework": "FastAPI",
  "dependencies": ["fastapi", "sqlalchemy", "pydantic"]
}
```

#### Switch Workspace
```http
POST /api/workspace/switch
Content-Type: application/json

{
  "workspace_id": "workspace-uuid"
}
```

**Response:**
```json
{
  "id": "workspace-uuid",
  "name": "main-project",
  "path": "/workspaces/main-project",
  "status": "active",
  "switched_at": "2026-01-27T06:15:30.000000"
}
```

---

### 🤖 Model Management

#### List Available Models
```http
GET /api/models
```

**Response:**
```json
{
  "models": [
    {
      "id": "claude-opus",
      "name": "Claude 3 Opus",
      "provider": "anthropic",
      "context_length": 200000,
      "status": "active"
    },
    {
      "id": "gpt-4",
      "name": "GPT-4",
      "provider": "openai",
      "context_length": 128000,
      "status": "active"
    }
  ],
  "total": 5
}
```

#### Get Current Model
```http
GET /api/model/current
```

**Response:**
```json
{
  "id": "claude-opus",
  "name": "Claude 3 Opus",
  "provider": "anthropic",
  "context_length": 200000,
  "temperature": 0.7,
  "top_p": 0.95
}
```

#### Switch Model
```http
POST /api/model/switch
Content-Type: application/json

{
  "model_id": "gpt-4"
}
```

**Response:**
```json
{
  "id": "gpt-4",
  "name": "GPT-4",
  "provider": "openai",
  "switched_at": "2026-01-27T06:15:30.000000"
}
```

---

### ⚙️ Agent Configuration

#### Get Configuration
```http
GET /api/config
```

**Response:**
```json
{
  "agent": {
    "name": "OpenHands",
    "version": "4.1",
    "timeout_seconds": 300
  },
  "models": {
    "default": "claude-opus",
    "fallback": ["gpt-4", "gemini-pro"]
  },
  "capabilities": ["code-generation", "debugging", "testing"],
  "webhooks_enabled": true
}
```

#### Update Configuration
```http
PUT /api/config
Content-Type: application/json

{
  "timeout_seconds": 600,
  "max_retries": 3,
  "log_level": "debug"
}
```

**Response:**
```json
{
  "status": "updated",
  "updated_at": "2026-01-27T06:15:30.000000",
  "changes": {
    "timeout_seconds": 600,
    "max_retries": 3,
    "log_level": "debug"
  }
}
```

#### Get Agent Configurations
```http
GET /api/config/agents
```

**Response:**
```json
{
  "agents": [
    {
      "id": "agent-01",
      "name": "n8n-orchestrator",
      "status": "active",
      "version": "1.0.0"
    },
    {
      "id": "agent-05",
      "name": "steel-browser",
      "status": "active",
      "version": "2.1.0"
    }
  ],
  "total": 8
}
```

#### Update Agent Configuration
```http
POST /api/config/agent
Content-Type: application/json

{
  "agent_id": "agent-05",
  "config": {
    "stealth_mode": true,
    "viewport": "1920x1080",
    "timeout": 30000
  }
}
```

**Response:**
```json
{
  "agent_id": "agent-05",
  "status": "configured",
  "applied_at": "2026-01-27T06:15:30.000000"
}
```

---

### 📊 Session Management

#### List Sessions
```http
GET /api/sessions?user_id=user-uuid&limit=20
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | Filter by user |
| `status` | string | Filter: active, inactive, closed |
| `limit` | int | Max results (default: 20) |

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "user_id": "user-uuid",
      "status": "active",
      "created_at": "2026-01-27T06:00:00.000000",
      "last_activity": "2026-01-27T06:15:30.000000"
    }
  ],
  "total": 12
}
```

#### Save Session
```http
POST /api/sessions/save
Content-Type: application/json

{
  "user_id": "user-uuid",
  "name": "Python API Development",
  "state": {
    "conversation_id": "conv-uuid",
    "workspace_id": "workspace-uuid",
    "model_id": "claude-opus"
  }
}
```

**Response:**
```json
{
  "id": "session-uuid",
  "user_id": "user-uuid",
  "name": "Python API Development",
  "saved_at": "2026-01-27T06:15:30.000000"
}
```

#### Restore Session
```http
POST /api/sessions/restore/{id}
Content-Type: application/json

{
  "restore_state": true
}
```

**Response:**
```json
{
  "id": "session-uuid",
  "status": "restored",
  "state": {
    "conversation_id": "conv-uuid",
    "workspace_id": "workspace-uuid",
    "model_id": "claude-opus"
  },
  "restored_at": "2026-01-27T06:15:30.000000"
}
```

---

### 📋 Logs & Metrics

#### Get Logs
```http
GET /api/logs?task_id=task-uuid&level=info&limit=100
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `task_id` | string | Filter by task ID |
| `level` | string | Filter: debug, info, warning, error |
| `limit` | int | Max results (1-1000, default: 100) |
| `from_time` | string | Start time (ISO 8601) |

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2026-01-27T06:15:30.000000",
      "level": "info",
      "task_id": "task-uuid",
      "message": "Code generation started",
      "context": {"language": "python"}
    }
  ],
  "total": 250,
  "limit": 100
}
```

#### Get Task-Specific Logs
```http
GET /api/logs/{taskId}
```

**Response:**
```json
{
  "task_id": "task-uuid",
  "logs": [
    {
      "timestamp": "2026-01-27T06:15:30.000000",
      "level": "info",
      "message": "Code generation started"
    },
    {
      "timestamp": "2026-01-27T06:15:35.000000",
      "level": "debug",
      "message": "Generating code chunk 1/5"
    }
  ],
  "total": 15
}
```

#### Get Metrics
```http
GET /api/metrics?metric_type=performance&period=hour
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `metric_type` | string | Type: performance, usage, errors |
| `period` | string | Period: hour, day, week, month |

**Response:**
```json
{
  "period": "hour",
  "timestamp": "2026-01-27T06:00:00.000000",
  "metrics": {
    "total_requests": 1250,
    "successful_requests": 1200,
    "failed_requests": 50,
    "avg_response_time_ms": 245,
    "p99_response_time_ms": 892
  }
}
```

#### Get Task Metrics
```http
GET /api/metrics/tasks
```

**Response:**
```json
{
  "period": "hour",
  "tasks": {
    "total": 150,
    "completed": 140,
    "failed": 8,
    "pending": 2,
    "avg_duration_seconds": 15.5,
    "success_rate": 0.947
  },
  "by_language": {
    "python": {"total": 60, "completed": 58, "failed": 2},
    "javascript": {"total": 45, "completed": 43, "failed": 2},
    "typescript": {"total": 30, "completed": 29, "failed": 1}
  }
}
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
