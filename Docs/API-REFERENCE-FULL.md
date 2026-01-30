# SIN-Solver API Documentation

> **Complete API Documentation for all 18 Services**

**Version:** 2.0.0  
**Last Updated:** 2026-01-30  
**Base URL:** `https://api.delqhi.com`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Services Overview](#services-overview)
4. [API Reference by Service](#api-reference-by-service)
5. [Error Codes](#error-codes)
6. [Rate Limiting](#rate-limiting)
7. [Postman/Hoppscotch Collections](#postmanhoppscotch-collections)
8. [OpenAPI Specifications](#openapi-specifications)

---

## Overview

SIN-Solver provides a comprehensive REST API ecosystem consisting of 18 microservices. Each service exposes its own API endpoints while being accessible through the central API Gateway (`room-13-api-brain`).

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                              │
│              room-13-api-brain (Port 8000)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Agents  │    │  Rooms  │    │ Solvers │
    └─────────┘    └─────────┘    └─────────┘
```

### Base URLs

| Environment | Base URL |
|-------------|----------|
| Local | `http://localhost:8000` |
| Development | `https://api.delqhi.com` |
| Production | `https://api.delqhi.com` |

---

## Authentication

All API requests require authentication using one of the following methods:

### 1. API Key Authentication (Recommended for Server-to-Server)

```http
GET /api/v1/workflows HTTP/1.1
Host: api.delqhi.com
X-API-Key: your-api-key-here
```

### 2. JWT Bearer Token (For User Sessions)

```http
GET /api/v1/services HTTP/1.1
Host: api.delqhi.com
Authorization: Bearer jwt_token_xxx
```

### 3. Service-to-Service Authentication

Internal services authenticate via mTLS or internal tokens:

```http
GET /internal/health HTTP/1.1
Host: room-13-api-brain:8000
X-Internal-Token: internal-service-token
```

### Obtaining API Keys

```bash
# Request API key (requires admin access)
POST /api/v1/auth/api-keys
{
  "name": "My Integration",
  "permissions": ["workflows:read", "workflows:execute"],
  "expires_in_days": 90
}

# Response
{
  "api_key": "sin_abc123xyz789",
  "secret": "sk_live_...",
  "expires_at": "2026-04-30T00:00:00Z"
}
```

---

## Services Overview

| # | Service | Port | Category | Status | Public URL |
|---|---------|------|----------|--------|------------|
| 1 | agent-01-n8n-orchestrator | 5678 | Agent | ✅ Active | n8n.delqhi.com |
| 2 | agent-04-opencode-secretary | 9004 | Agent | ✅ Active | opencode.delqhi.com |
| 3 | agent-05-steel-browser | 3000 | Agent | ✅ Active | steel.delqhi.com |
| 4 | agent-06-skyvern-solver | 8030 | Agent | ✅ Active | skyvern.delqhi.com |
| 5 | agent-08-playwright-tester | 8080 | Agent | ✅ Active | - |
| 6 | agent-09-clawdbot-messenger | 8004 | Agent | ✅ Active | - |
| 7 | room-00-cloudflared-tunnel | - | Infrastructure | ✅ Active | *.delqhi.com |
| 8 | room-01-dashboard-cockpit | 3011 | Room | ✅ Active | dashboard.delqhi.com |
| 9 | room-02-tresor-vault | 8200 | Room | ✅ Active | vault.delqhi.com |
| 10 | room-02-tresor-api | 8002 | Room | ✅ Active | vault-api.delqhi.com |
| 11 | room-03-postgres-master | 5432 | Room | ✅ Active | - |
| 12 | room-04-redis-cache | 6379 | Room | ✅ Active | - |
| 13 | room-11-plane-mcp | 8216 | Room | ✅ Active | plane.delqhi.com |
| 14 | room-13-api-brain | 8000 | Room | ✅ Active | api.delqhi.com |
| 15 | room-30-scira-ai-search | 7890 | Room | ✅ Active | scira.delqhi.com |
| 16 | solver-14-worker-automation | 8080 | Solver | ✅ Active | - |
| 17 | solver-18-survey-worker | 8018 | Solver | ✅ Active | - |
| 18 | builder-1.1-captcha-worker | 8019 | Builder | ✅ Active | captcha.delqhi.com |

---

## API Reference by Service

### 1. agent-01-n8n-orchestrator

**Base URL:** `https://n8n.delqhi.com/api/v1`

n8n is a workflow automation platform with 200+ integrations.

#### Authentication

```http
X-N8N-API-KEY: n8n_api_xxxxxxxxxx
```

#### Endpoints

##### List Workflows

```http
GET /workflows
```

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "name": "Email Notification Workflow",
      "active": true,
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-01-20T14:22:00Z"
    }
  ]
}
```

##### Create Workflow

```http
POST /workflows
Content-Type: application/json

{
  "name": "New Workflow",
  "nodes": [
    {
      "parameters": {},
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "typeVersion": 1,
      "position": [250, 300]
    }
  ],
  "connections": {},
  "settings": {
    "executionOrder": "v1"
  }
}
```

##### Execute Workflow

```http
POST /workflows/{id}/execute
```

**Response:**
```json
{
  "executionId": "12345",
  "data": {
    "resultData": {
      "runData": {}
    }
  }
}
```

##### Get Execution Status

```http
GET /executions/{id}
```

**Response:**
```json
{
  "id": "12345",
  "workflowId": "1",
  "status": "success",
  "startedAt": "2026-01-30T10:00:00Z",
  "stoppedAt": "2026-01-30T10:00:05Z"
}
```

##### Webhook Trigger

```http
POST /webhook/{webhook-id}
Content-Type: application/json

{
  "event": "user.signup",
  "data": {
    "userId": "usr_123",
    "email": "user@example.com"
  }
}
```

#### Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid workflow configuration |
| 401 | Invalid API key |
| 404 | Workflow not found |
| 409 | Workflow already active |

---

### 2. agent-04-opencode-secretary

**Base URL:** `https://opencode.delqhi.com`

AI-powered code generation and chat interface.

#### Authentication

```http
Authorization: Bearer opencode_token_xxx
```

#### Endpoints

##### Generate Code

```http
POST /api/code
Content-Type: application/json

{
  "prompt": "Create a Python function to calculate fibonacci numbers",
  "language": "python",
  "context": "For a math library",
  "max_tokens": 2000
}
```

**Response:**
```json
{
  "code": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
  "language": "python",
  "explanation": "Recursive implementation of fibonacci sequence",
  "model_used": "gemini-2.0-flash",
  "tokens_used": 150
}
```

##### Chat Completion

```http
POST /api/chat
Content-Type: application/json

{
  "messages": [
    {"role": "system", "content": "You are a helpful coding assistant"},
    {"role": "user", "content": "Explain async/await in JavaScript"}
  ],
  "model": "zen/big-pickle",
  "stream": false
}
```

##### List Available Models

```http
GET /api/models
```

**Response:**
```json
{
  "models": [
    {
      "id": "zen/big-pickle",
      "name": "Big Pickle (Uncensored)",
      "context_length": 200000,
      "pricing": {"input": 0, "output": 0}
    },
    {
      "id": "google/antigravity-gemini-3-flash",
      "name": "Gemini 3 Flash",
      "context_length": 1048576,
      "pricing": {"input": 0.0001, "output": 0.0004}
    }
  ]
}
```

##### Web Research

```http
POST /api/research
Content-Type: application/json

{
  "query": "Latest React best practices 2026",
  "depth": "comprehensive",
  "sources": ["web", "github"]
}
```

---

### 3. agent-05-steel-browser

**Base URL:** `https://steel.delqhi.com`

Stealth browser automation with CDP interface.

#### Authentication

```http
X-Steel-API-Key: steel_xxxxxxxxxx
```

#### Endpoints

##### Create Session

```http
POST /v1/sessions
Content-Type: application/json

{
  "proxy": {
    "host": "residential.proxy.com",
    "port": 8080,
    "username": "user",
    "password": "pass"
  },
  "timeout": 300000,
  "stealth": true,
  "viewport": {
    "width": 1920,
    "height": 1080
  }
}
```

**Response:**
```json
{
  "id": "sess_abc123",
  "status": "active",
  "websocket_url": "wss://steel.delqhi.com/v1/sessions/sess_abc123/cdp",
  "cdp_url": "http://steel.delqhi.com:9222",
  "created_at": "2026-01-30T10:00:00Z",
  "expires_at": "2026-01-30T10:05:00Z"
}
```

##### List Sessions

```http
GET /v1/sessions
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "sess_abc123",
      "status": "active",
      "created_at": "2026-01-30T10:00:00Z"
    }
  ]
}
```

##### Get Session Details

```http
GET /v1/sessions/{session_id}
```

##### Close Session

```http
DELETE /v1/sessions/{session_id}
```

##### Screenshot

```http
POST /v1/sessions/{session_id}/screenshot
Content-Type: application/json

{
  "full_page": true,
  "type": "png",
  "quality": 90
}
```

**Response:**
```json
{
  "screenshot": "base64encodedstring...",
  "url": "https://example.com",
  "timestamp": "2026-01-30T10:01:00Z"
}
```

##### Navigate

```http
POST /v1/sessions/{session_id}/navigate
Content-Type: application/json

{
  "url": "https://example.com",
  "wait_until": "networkidle",
  "timeout": 30000
}
```

#### CDP (Chrome DevTools Protocol)

Connect directly via WebSocket:

```javascript
const ws = new WebSocket('wss://steel.delqhi.com/v1/sessions/sess_abc123/cdp');

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Page.navigate',
    params: { url: 'https://example.com' }
  }));
};
```

---

### 4. agent-06-skyvern-solver

**Base URL:** `https://skyvern.delqhi.com/api/v1`

Visual AI automation for browser tasks.

#### Authentication

```http
X-Skyvern-API-Key: skyvern_xxxxxxxxxx
```

#### Endpoints

##### Create Task

```http
POST /tasks
Content-Type: application/json

{
  "url": "https://shopping.example.com",
  "navigation_goal": "Add a blue t-shirt to the cart and proceed to checkout",
  "data_extraction_goal": "Extract the final price including shipping",
  "proxy_location": "US",
  "max_steps": 50,
  "timeout": 300
}
```

**Response:**
```json
{
  "task_id": "tsk_abc123",
  "status": "created",
  "url": "https://shopping.example.com",
  "created_at": "2026-01-30T10:00:00Z"
}
```

##### Get Task Status

```http
GET /tasks/{task_id}
```

**Response:**
```json
{
  "task_id": "tsk_abc123",
  "status": "completed",
  "url": "https://shopping.example.com/checkout",
  "steps": 12,
  "output": {
    "final_price": "$29.99",
    "shipping": "$5.00",
    "total": "$34.99"
  },
  "screenshots": [
    "https://skyvern.delqhi.com/screenshots/tsk_abc123/step_1.png"
  ]
}
```

##### List Tasks

```http
GET /tasks?limit=10&status=completed
```

##### Cancel Task

```http
POST /tasks/{task_id}/cancel
```

##### Get Task Screenshots

```http
GET /tasks/{task_id}/screenshots
```

---

### 5. agent-08-playwright-tester

**Base URL:** `http://localhost:8080` (Internal)

QA testing service using Playwright.

#### Authentication

```http
X-Test-API-Key: test_xxxxxxxxxx
```

#### Endpoints

##### Run Test

```http
POST /api/tests/run
Content-Type: application/json

{
  "test_file": "login.spec.ts",
  "browser": "chromium",
  "headless": true,
  "timeout": 60000
}
```

**Response:**
```json
{
  "run_id": "run_abc123",
  "status": "running",
  "started_at": "2026-01-30T10:00:00Z"
}
```

##### Get Test Results

```http
GET /api/tests/results/{run_id}
```

**Response:**
```json
{
  "run_id": "run_abc123",
  "status": "passed",
  "tests": [
    {
      "name": "should login successfully",
      "status": "passed",
      "duration": 2340
    }
  ],
  "total": 5,
  "passed": 5,
  "failed": 0,
  "duration": 12000
}
```

##### List Test Files

```http
GET /api/tests/files
```

---

### 6. agent-09-clawdbot-messenger

**Base URL:** `http://localhost:8004` (Internal)

Social media bot integration service.

#### Authentication

```http
X-Clawdbot-Token: clawd_xxxxxxxxxx
```

#### Endpoints

##### Send Message

```http
POST /api/messages/send
Content-Type: application/json

{
  "platform": "telegram",
  "chat_id": "@mychannel",
  "message": "Hello from SIN-Solver!",
  "parse_mode": "HTML"
}
```

**Response:**
```json
{
  "message_id": "msg_abc123",
  "status": "sent",
  "platform": "telegram",
  "timestamp": "2026-01-30T10:00:00Z"
}
```

##### Post to Multiple Platforms

```http
POST /api/messages/broadcast
Content-Type: application/json

{
  "platforms": ["telegram", "discord"],
  "message": "Important announcement!",
  "attachments": [
    {
      "type": "image",
      "url": "https://example.com/image.png"
    }
  ]
}
```

##### Get Message Status

```http
GET /api/messages/{message_id}/status
```

---

### 7. room-00-cloudflared-tunnel

**No direct API** - Infrastructure service for public domain access.

This service exposes other services via `*.delqhi.com` domains through Cloudflare Tunnel.

#### Configuration

```yaml
# infrastructure/cloudflare/config.yml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: api.delqhi.com
    service: http://room-13-api-brain:8000
  - hostname: n8n.delqhi.com
    service: http://agent-01-n8n-orchestrator:5678
  - service: http_status:404
```

---

### 8. room-01-dashboard-cockpit

**Base URL:** `https://dashboard.delqhi.com`

Main web dashboard UI (Next.js application).

#### Authentication

Session-based authentication via JWT cookie.

#### API Endpoints (for dashboard data)

##### Get System Status

```http
GET /api/system/status
```

**Response:**
```json
{
  "services": [
    {
      "name": "agent-01-n8n",
      "status": "healthy",
      "uptime": "99.9%",
      "last_check": "2026-01-30T10:00:00Z"
    }
  ],
  "metrics": {
    "cpu_usage": 45,
    "memory_usage": 62,
    "active_containers": 18
  }
}
```

##### Get Container Logs

```http
GET /api/containers/{name}/logs?lines=100&follow=false
```

**Response:**
```json
{
  "container": "agent-01-n8n",
  "logs": [
    {
      "timestamp": "2026-01-30T10:00:00Z",
      "level": "info",
      "message": "Workflow execution started"
    }
  ]
}
```

##### Control Container

```http
POST /api/containers/{name}/control
Content-Type: application/json

{
  "action": "restart"
}
```

**Actions:** `start`, `stop`, `restart`, `pause`, `unpause`

---

### 9. room-02-tresor-vault

**Base URL:** `https://vault.delqhi.com/v1`

HashiCorp Vault for secrets management.

#### Authentication

```http
X-Vault-Token: hvs.xxxxxxxxxxx
```

#### Endpoints

##### Health Check

```http
GET /sys/health
```

**Response:**
```json
{
  "initialized": true,
  "sealed": false,
  "standby": false,
  "performance_standby": false,
  "replication_performance_mode": "disabled",
  "replication_dr_mode": "disabled",
  "server_time_utc": 1706608800,
  "version": "1.15.0"
}
```

##### Read Secret

```http
GET /secret/data/myapp/database
```

**Response:**
```json
{
  "request_id": "req-abc123",
  "lease_id": "",
  "renewable": false,
  "lease_duration": 0,
  "data": {
    "data": {
      "host": "localhost",
      "port": "5432",
      "username": "admin",
      "password": "secret123"
    }
  }
}
```

##### Write Secret

```http
POST /secret/data/myapp/database
Content-Type: application/json

{
  "data": {
    "host": "localhost",
    "port": "5432",
    "username": "admin",
    "password": "secret123"
  }
}
```

##### Create Token

```http
POST /auth/token/create
Content-Type: application/json

{
  "policies": ["read-only"],
  "ttl": "1h",
  "renewable": true
}
```

---

### 10. room-02-tresor-api

**Base URL:** `https://vault-api.delqhi.com`

Vault integration layer with auto-sync to external systems.

#### Authentication

```http
X-Vault-API-Key: vaultapi_xxxxxxxxxx
```

#### Endpoints

##### Health Check

```http
GET /health
```

##### List Secrets

```http
GET /api/secrets?path=secret/
```

**Response:**
```json
{
  "secrets": [
    {
      "path": "secret/myapp/database",
      "version": 2,
      "created_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

##### Read Secret

```http
GET /api/secrets/secret/myapp/database
```

**Response:**
```json
{
  "path": "secret/myapp/database",
  "data": {
    "host": "localhost",
    "port": "5432",
    "username": "admin",
    "password": "***"
  },
  "version": 2
}
```

##### Create/Update Secret with Sync

```http
POST /api/secrets/myapp/new-service
Content-Type: application/json

{
  "data": {
    "api_key": "sk_live_xxxxxxxx",
    "endpoint": "https://api.service.com"
  },
  "sync": {
    "vercel": true,
    "vercelEnvs": ["production", "preview"],
    "n8n": true,
    "n8nCredType": "httpBasicAuth"
  }
}
```

**Response:**
```json
{
  "success": true,
  "secret_path": "secret/myapp/new-service",
  "sync_status": {
    "vercel": {
      "status": "synced",
      "environments": ["production", "preview"]
    },
    "n8n": {
      "status": "synced",
      "credential_id": "cred_abc123"
    }
  }
}
```

##### Sync to Vercel

```http
POST /api/sync/vercel
Content-Type: application/json

{
  "secret_path": "secret/myapp/database",
  "project_id": "prj_xxxxxxxx",
  "environments": ["production", "preview"]
}
```

##### Sync to n8n

```http
POST /api/sync/n8n
Content-Type: application/json

{
  "secret_path": "secret/myapp/api",
  "credential_type": "httpHeaderAuth"
}
```

##### Get Agent Secrets

```http
GET /api/agent-secrets/agent-01-n8n
```

**Response:**
```json
{
  "agent": "agent-01-n8n",
  "secrets": {
    "DATABASE_URL": "postgresql://...",
    "REDIS_URL": "redis://...",
    "N8N_ENCRYPTION_KEY": "***"
  }
}
```

---

### 11. room-03-postgres-master

**Connection:** `postgresql://user:pass@localhost:5432/sin_solver`

Primary PostgreSQL database.

#### No REST API
Direct SQL/PostgreSQL protocol access only.

#### Connection Details

```
Host: room-03-postgres-master
Port: 5432
Database: sin_solver_production
Username: sin_admin
Password: (from Vault)
SSL Mode: prefer
```

#### Databases

| Database | Purpose |
|----------|---------|
| `sin_solver_production` | Main application data |
| `n8n` | Workflow data |
| `vault` | Vault storage backend |

---

### 12. room-04-redis-cache

**Connection:** `redis://localhost:6379`

Redis cache and session store.

#### No REST API
Direct Redis protocol access only.

#### Connection Details

```
Host: room-04-redis-cache
Port: 6379
Database: 0
Password: (from Vault)
```

#### Usage

```python
import redis

r = redis.Redis(
    host='room-04-redis-cache',
    port=6379,
    decode_responses=True
)

# Cache API response
r.setex('api:workflows:list', 300, json.dumps(workflows))

# Session storage
r.setex('session:user:123', 3600, json.dumps(user_data))

# Rate limiting
r.incr('rate_limit:api_key:xxx')
r.expire('rate_limit:api_key:xxx', 60)
```

---

### 13. room-11-plane-mcp

**Base URL:** `https://plane.delqhi.com`

Project management integration (Plane.so).

#### Authentication

```http
X-Plane-API-Key: plane_xxxxxxxxxx
```

#### Endpoints

##### List Projects

```http
GET /api/projects
```

**Response:**
```json
{
  "projects": [
    {
      "id": "proj_abc123",
      "name": "SIN-Solver Development",
      "identifier": "SIN",
      "description": "Main development project"
    }
  ]
}
```

##### Create Issue

```http
POST /api/projects/{project_id}/issues
Content-Type: application/json

{
  "title": "Implement new feature",
  "description": "Detailed description...",
  "priority": "high",
  "state": "backlog",
  "labels": ["feature", "api"]
}
```

##### List Issues

```http
GET /api/projects/{project_id}/issues?state=backlog&priority=high
```

##### Update Issue

```http
PATCH /api/projects/{project_id}/issues/{issue_id}
Content-Type: application/json

{
  "state": "in_progress",
  "assignee_id": "user_abc123"
}
```

##### Create Cycle

```http
POST /api/projects/{project_id}/cycles
Content-Type: application/json

{
  "name": "Sprint 1",
  "start_date": "2026-01-15",
  "end_date": "2026-01-29"
}
```

---

### 14. room-13-api-brain

**Base URL:** `https://api.delqhi.com`

Main API Gateway and orchestration brain (FastAPI).

#### Authentication

```http
X-API-Key: sin_api_xxxxxxxxxx
# or
Authorization: Bearer jwt_token_xxx
```

#### Endpoints

##### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "postgres": "healthy",
    "redis": "healthy",
    "vault": "healthy"
  },
  "timestamp": "2026-01-30T10:00:00Z"
}
```

##### Get System Status

```http
GET /api/status
```

**Response:**
```json
{
  "services": [
    {
      "name": "agent-01-n8n",
      "status": "healthy",
      "url": "http://agent-01-n8n:5678",
      "last_check": "2026-01-30T10:00:00Z",
      "response_time_ms": 45
    }
  ],
  "overall_status": "healthy"
}
```

##### List Services

```http
GET /api/services
```

**Response:**
```json
{
  "services": [
    {
      "id": "agent-01-n8n",
      "name": "n8n Orchestrator",
      "category": "agent",
      "port": 5678,
      "status": "active",
      "public_url": "https://n8n.delqhi.com"
    }
  ],
  "total": 18
}
```

##### Authentication

**Login:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

**Register:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "securepassword",
  "name": "New User"
}
```

##### Workflows

**List Workflows:**
```http
GET /api/workflows?page=1&limit=10
```

**Execute Workflow:**
```http
POST /api/workflows/execute
Content-Type: application/json

{
  "workflow_id": "wf_abc123",
  "params": {
    "target_url": "https://example.com",
    "action": "scrape"
  },
  "async": true
}
```

**Get Execution:**
```http
GET /api/executions/{execution_id}
```

##### Metrics

```http
GET /api/metrics
```

**Response:**
```json
{
  "requests_per_minute": 120,
  "average_response_time_ms": 145,
  "error_rate": 0.02,
  "active_users": 15,
  "timestamp": "2026-01-30T10:00:00Z"
}
```

---

### 15. room-30-scira-ai-search

**Base URL:** `https://scira.delqhi.com`

Enterprise AI search engine.

#### Authentication

```http
X-Scira-API-Key: scira_xxxxxxxxxx
```

#### Endpoints

##### Search

```http
POST /api/search
Content-Type: application/json

{
  "query": "best practices for API design",
  "filters": {
    "source": ["documentation", "github"],
    "date_range": {
      "from": "2025-01-01",
      "to": "2026-01-30"
    }
  },
  "limit": 10,
  "include_ai_summary": true
}
```

**Response:**
```json
{
  "query": "best practices for API design",
  "results": [
    {
      "id": "doc_abc123",
      "title": "REST API Design Best Practices",
      "source": "documentation",
      "url": "https://docs.example.com/api-design",
      "snippet": "Use nouns for resources, not verbs...",
      "score": 0.95,
      "metadata": {
        "author": "John Doe",
        "date": "2025-12-15"
      }
    }
  ],
  "ai_summary": "API design best practices include using RESTful principles...",
  "total_results": 42,
  "search_time_ms": 234
}
```

##### Index Document

```http
POST /api/index
Content-Type: application/json

{
  "title": "New API Documentation",
  "content": "Full document content here...",
  "url": "https://docs.example.com/new-api",
  "source": "documentation",
  "metadata": {
    "author": "Jane Smith",
    "tags": ["api", "rest"]
  }
}
```

##### Ask Question

```http
POST /api/ask
Content-Type: application/json

{
  "question": "How do I authenticate with the API?",
  "context": "api_documentation",
  "include_sources": true
}
```

**Response:**
```json
{
  "answer": "To authenticate with the API, you need to include an API key...",
  "sources": [
    {
      "title": "API Authentication Guide",
      "url": "https://docs.example.com/auth"
    }
  ],
  "confidence": 0.92
}
```

---

### 16. solver-14-worker-automation

**Base URL:** `http://localhost:8080` (Internal)

Task automation worker.

#### Authentication

```http
X-Worker-Token: worker_xxxxxxxxxx
```

#### Endpoints

##### Submit Task

```http
POST /api/tasks/submit
Content-Type: application/json

{
  "platform": "swagbucks",
  "task_type": "survey",
  "parameters": {
    "survey_id": "srv_abc123",
    "auto_complete": true
  },
  "priority": "normal",
  "callback_url": "https://api.delqhi.com/webhooks/task-complete"
}
```

**Response:**
```json
{
  "task_id": "task_abc123",
  "status": "queued",
  "queue_position": 5,
  "estimated_start": "2026-01-30T10:05:00Z"
}
```

##### Get Task Status

```http
GET /api/tasks/{task_id}
```

**Response:**
```json
{
  "task_id": "task_abc123",
  "status": "running",
  "progress": 45,
  "platform": "swagbucks",
  "started_at": "2026-01-30T10:05:00Z",
  "estimated_completion": "2026-01-30T10:15:00Z"
}
```

##### List Active Tasks

```http
GET /api/tasks?status=running&platform=swagbucks
```

##### Cancel Task

```http
POST /api/tasks/{task_id}/cancel
```

---

### 17. solver-18-survey-worker

**Base URL:** `http://localhost:8018` (Internal)

Survey automation specialist.

#### Authentication

```http
X-Survey-API-Key: survey_xxxxxxxxxx
```

#### Endpoints

##### Start Survey Session

```http
POST /api/sessions/start
Content-Type: application/json

{
  "platform": "prolific",
  "survey_url": "https://app.prolific.co/studies/abc123",
  "profile": {
    "age": 30,
    "gender": "male",
    "location": "US"
  },
  "auto_answer": true
}
```

**Response:**
```json
{
  "session_id": "sess_abc123",
  "status": "started",
  "platform": "prolific",
  "browser_session": "steel_sess_xyz789"
}
```

##### Get Session Status

```http
GET /api/sessions/{session_id}
```

**Response:**
```json
{
  "session_id": "sess_abc123",
  "status": "in_progress",
  "current_question": 5,
  "total_questions": 20,
  "progress_percent": 25,
  "earnings": "$2.50"
}
```

##### Answer Question

```http
POST /api/sessions/{session_id}/answer
Content-Type: application/json

{
  "question_id": "q_5",
  "answer": "Option B",
  "confidence": 0.85
}
```

##### Complete Session

```http
POST /api/sessions/{session_id}/complete
```

**Response:**
```json
{
  "session_id": "sess_abc123",
  "status": "completed",
  "earnings": "$2.50",
  "duration_minutes": 8,
  "completion_code": "ABC123XYZ"
}
```

---

### 18. builder-1.1-captcha-worker

**Base URL:** `https://captcha.delqhi.com`

Multi-AI CAPTCHA solving service.

#### Authentication

```http
X-Captcha-API-Key: captcha_xxxxxxxxxx
```

#### Rate Limits

- **Free Tier:** 20 requests/minute
- **Pro Tier:** 100 requests/minute
- **Enterprise:** 500 requests/minute

#### Endpoints

##### Solve Image CAPTCHA

```http
POST /api/v1/solve/image
Content-Type: application/json

{
  "image": "base64encodedimage...",
  "type": "text",
  "hint": "Enter the characters you see"
}
```

**Response:**
```json
{
  "success": true,
  "solution": "A7B9X2",
  "confidence": 0.94,
  "model_used": "mistral-pixtral-12b",
  "solve_time_ms": 1250,
  "credits_used": 1
}
```

##### Solve Slider CAPTCHA

```http
POST /api/v1/solve/slider
Content-Type: application/json

{
  "background_image": "base64...",
  "slider_image": "base64...",
  "challenge_type": "slide"
}
```

**Response:**
```json
{
  "success": true,
  "solution": {
    "x_offset": 156,
    "y_offset": 0
  },
  "confidence": 0.91,
  "solve_time_ms": 2100
}
```

##### Solve Audio CAPTCHA

```http
POST /api/v1/solve/audio
Content-Type: application/json

{
  "audio": "base64encodedaudio...",
  "format": "mp3",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "solution": "please enter the building",
  "confidence": 0.88,
  "model_used": "whisper-large-v3",
  "solve_time_ms": 3400
}
}
```

##### Solve hCaptcha/Click CAPTCHA

```http
POST /api/v1/solve/click
Content-Type: application/json

{
  "image": "base64...",
  "instructions": "Click on all images containing a car",
  "grid_size": "3x3"
}
```

**Response:**
```json
{
  "success": true,
  "solution": [1, 4, 7],
  "confidence": 0.93,
  "model_used": "yolov8-classifier",
  "solve_time_ms": 2800
}
```

##### Get Balance

```http
GET /api/v1/balance
```

**Response:**
```json
{
  "credits": 500,
  "tier": "pro",
  "rate_limit": 100,
  "rate_limit_reset": "2026-01-30T10:01:00Z"
}
```

##### Batch Solve

```http
POST /api/v1/solve/batch
Content-Type: application/json

{
  "captchas": [
    {
      "id": "cap_1",
      "image": "base64...",
      "type": "text"
    },
    {
      "id": "cap_2",
      "image": "base64...",
      "type": "click"
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "cap_1",
      "success": true,
      "solution": "ABC123"
    },
    {
      "id": "cap_2",
      "success": true,
      "solution": [2, 5]
    }
  ],
  "total_solved": 2,
  "total_credits": 2
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request successful, no content returned |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth, but insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., already exists) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Service temporarily unavailable |

### API Error Response Format

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "The 'email' parameter is required",
    "details": {
      "field": "email",
      "reason": "missing"
    },
    "request_id": "req_abc123xyz",
    "timestamp": "2026-01-30T10:00:00Z"
  }
}
```

### Service-Specific Error Codes

| Service | Error Code | Description |
|---------|-----------|-------------|
| n8n | WORKFLOW_NOT_FOUND | Workflow ID does not exist |
| n8n | INVALID_WORKFLOW_CONFIG | Workflow configuration error |
| Steel | SESSION_EXPIRED | Browser session has expired |
| Steel | PROXY_ERROR | Proxy connection failed |
| Skyvern | TASK_TIMEOUT | Task exceeded maximum time |
| Skyvern | NAVIGATION_FAILED | Could not navigate to URL |
| Captcha | INSUFFICIENT_CREDITS | Not enough credits to solve |
| Captcha | UNSUPPORTED_CAPTCHA_TYPE | CAPTCHA type not supported |
| Vault | SECRET_NOT_FOUND | Secret path does not exist |
| Vault | PERMISSION_DENIED | Insufficient Vault permissions |

---

## Rate Limiting

### Default Rate Limits

| Tier | Requests/Minute | Burst | Concurrent |
|------|----------------|-------|------------|
| Free | 60 | 10 | 5 |
| Pro | 300 | 50 | 20 |
| Enterprise | 1000 | 200 | 100 |

### Rate Limit Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1706608860
X-RateLimit-Retry-After: 60
```

### Rate Limit Response (429)

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706608860
X-RateLimit-Retry-After: 60

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "retry_after": 60
  }
}
```

---

## Postman/Hoppscotch Collections

Complete API collections are available in:

```
docs/postman/
├── SIN-Solver-Complete-Collection.json    # All 18 services
├── SIN-Solver-Agents-Collection.json      # Agents only
├── SIN-Solver-Rooms-Collection.json       # Infrastructure only
├── SIN-Solver-Solvers-Collection.json     # Workers only
└── environment/
    ├── Local.json
    ├── Development.json
    └── Production.json
```

### Import Instructions

**Postman:**
1. Open Postman
2. Click "Import" → "File"
3. Select `SIN-Solver-Complete-Collection.json`
4. Import the environment file
5. Set your API keys in environment variables

**Hoppscotch:**
1. Open Hoppscotch (room-24-hoppscotch)
2. Click "Import/Export"
3. Select "Import from JSON"
4. Paste collection JSON
5. Configure environment variables

---

## OpenAPI Specifications

OpenAPI 3.0 specifications for all services:

```
docs/openapi/
├── openapi-api-brain.yaml          # room-13-api-brain
├── openapi-captcha.yaml            # builder-1.1-captcha-worker
├── openapi-n8n.yaml                # agent-01-n8n
├── openapi-opencode.yaml           # agent-04-opencode
├── openapi-plane.yaml              # room-11-plane
├── openapi-scira.yaml              # room-30-scira
├── openapi-skyvern.yaml            # agent-06-skyvern
├── openapi-steel.yaml              # agent-05-steel
├── openapi-vault-api.yaml          # room-02-tresor-api
├── openapi-vault.yaml              # room-02-tresor-vault
└── openapi-combined.yaml           # All services combined
```

### View Documentation

```bash
# Start Swagger UI locally
docker run -p 8080:8080 -e SWAGGER_JSON=/openapi.yaml \
  -v $(pwd)/docs/openapi/openapi-combined.yaml:/openapi.yaml \
  swaggerapi/swagger-ui

# Access at http://localhost:8080
```

---

## Changelog

### v2.0.0 (2026-01-30)

- Complete API documentation for all 18 services
- Added Postman/Hoppscotch collections
- Added OpenAPI specifications
- Added error codes and rate limiting documentation
- Added authentication methods documentation

### v1.0.0 (2026-01-15)

- Initial API documentation
- Core endpoints documented

---

## Support

For API support:

- **Documentation:** [docs/API-REFERENCE.md](./API-REFERENCE.md)
- **Issues:** [GitHub Issues](https://github.com/YOUR_ORG/SIN-Solver/issues)
- **Email:** api-support@delqhi.com

---

<div align="center">

**SIN-Solver API Documentation v2.0.0**

Made with ❤️ by the SIN-Solver Team

</div>
