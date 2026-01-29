# Room-01 Dashboard Cockpit - API Reference

## API Documentation

This document describes all API endpoints available in the Room-01 Dashboard Cockpit.

---

## Base URL

```
Local Development: http://localhost:3011
Production: https://dashboard.delqhi.com
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

---

## Endpoints Overview

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/health` | GET | Health check | No |
| `/api/docker/containers` | GET | List all containers | Yes |
| `/api/docker/containers/:id` | GET | Get container details | Yes |
| `/api/docker/containers/:id/start` | POST | Start container | Yes |
| `/api/docker/containers/:id/stop` | POST | Stop container | Yes |
| `/api/docker/containers/:id/restart` | POST | Restart container | Yes |
| `/api/docker/containers/:id/logs` | GET | Get container logs | Yes |
| `/api/docker/stats` | GET | Get Docker stats | Yes |
| `/api/docs/content` | GET | Get documentation file | Yes |
| `/api/logs/stream` | GET | Stream logs (SSE) | Yes |

---

## Health Check

### GET /api/health

Check if the dashboard is running and healthy.

**Request:**
```bash
curl http://localhost:3011/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-29T12:00:00Z",
  "version": "2.0.0",
  "services": {
    "docker": "connected",
    "redis": "connected",
    "api_brain": "reachable"
  }
}
```

**Status Codes:**
- `200` - Healthy
- `503` - Unhealthy (one or more services down)

---

## Docker Containers

### GET /api/docker/containers

List all Docker containers in the SIN-Solver ecosystem.

**Request:**
```bash
curl http://localhost:3011/api/docker/containers \
  -H "Authorization: Bearer <token>"
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `all` | boolean | true | Show all containers (including stopped) |
| `category` | string | - | Filter by category (agent, room, solver) |
| `status` | string | - | Filter by status (running, stopped, paused) |

**Response:**
```json
{
  "containers": [
    {
      "id": "abc123def456",
      "name": "agent-01-n8n-manager",
      "displayName": "n8n Orchestrator",
      "category": "agent",
      "status": "running",
      "state": "healthy",
      "image": "n8nio/n8n:latest",
      "ports": [
        {
          "internal": 5678,
          "external": 5678,
          "protocol": "tcp"
        }
      ],
      "created": "2026-01-20T10:00:00Z",
      "started": "2026-01-29T08:00:00Z",
      "uptime": "4 hours",
      "stats": {
        "cpu": {
          "usage": 12.5,
          "cores": 2
        },
        "memory": {
          "used": 256000000,
          "total": 512000000,
          "percentage": 50
        },
        "network": {
          "rx": 1024000,
          "tx": 512000
        }
      }
    }
  ],
  "total": 26,
  "running": 24,
  "stopped": 2
}
```

---

### GET /api/docker/containers/:id

Get detailed information about a specific container.

**Request:**
```bash
curl http://localhost:3011/api/docker/containers/agent-01-n8n-manager \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "id": "abc123def456",
  "name": "agent-01-n8n-manager",
  "displayName": "n8n Orchestrator",
  "description": "Workflow automation engine",
  "category": "agent",
  "status": "running",
  "state": "healthy",
  "image": {
    "name": "n8nio/n8n",
    "tag": "latest",
    "id": "sha256:abc123..."
  },
  "ports": [
    {
      "internal": 5678,
      "external": 5678,
      "protocol": "tcp",
      "url": "http://localhost:5678"
    }
  ],
  "volumes": [
    {
      "source": "/data/n8n",
      "destination": "/home/node/.n8n",
      "mode": "rw"
    }
  ],
  "environment": {
    "NODE_ENV": "production",
    "WEBHOOK_URL": "https://n8n.delqhi.com/"
  },
  "labels": {
    "com.sin-solver.category": "agent",
    "com.sin-solver.port": "5678"
  },
  "networks": [
    "sin-solver_default"
  ],
  "created": "2026-01-20T10:00:00Z",
  "started": "2026-01-29T08:00:00Z",
  "uptime": "4 hours",
  "restartCount": 0,
  "health": {
    "status": "healthy",
    "failingStreak": 0,
    "lastCheck": "2026-01-29T12:00:00Z"
  }
}
```

---

### POST /api/docker/containers/:id/start

Start a stopped container.

**Request:**
```bash
curl -X POST http://localhost:3011/api/docker/containers/agent-01-n8n-manager/start \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "message": "Container started successfully",
  "container": {
    "id": "abc123def456",
    "name": "agent-01-n8n-manager",
    "status": "running",
    "started": "2026-01-29T12:00:00Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Container already running",
  "code": "CONTAINER_ALREADY_RUNNING"
}
```

---

### POST /api/docker/containers/:id/stop

Stop a running container.

**Request:**
```bash
curl -X POST http://localhost:3011/api/docker/containers/agent-01-n8n-manager/stop \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"timeout": 30}'
```

**Request Body:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `timeout` | number | 10 | Seconds to wait before force kill |

**Response:**
```json
{
  "success": true,
  "message": "Container stopped successfully",
  "container": {
    "id": "abc123def456",
    "name": "agent-01-n8n-manager",
    "status": "exited",
    "exitCode": 0
  }
}
```

---

### POST /api/docker/containers/:id/restart

Restart a container.

**Request:**
```bash
curl -X POST http://localhost:3011/api/docker/containers/agent-01-n8n-manager/restart \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"timeout": 30}'
```

**Response:**
```json
{
  "success": true,
  "message": "Container restarted successfully",
  "container": {
    "id": "abc123def456",
    "name": "agent-01-n8n-manager",
    "status": "running",
    "started": "2026-01-29T12:00:00Z"
  }
}
```

---

### GET /api/docker/containers/:id/logs

Get container logs.

**Request:**
```bash
curl "http://localhost:3011/api/docker/containers/agent-01-n8n-manager/logs?tail=100&timestamps=true" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tail` | number | 100 | Number of lines to return |
| `timestamps` | boolean | true | Include timestamps |
| `since` | string | - | ISO timestamp to start from |
| `until` | string | - | ISO timestamp to end at |
| `follow` | boolean | false | Stream logs (SSE) |

**Response:**
```json
{
  "container": "agent-01-n8n-manager",
  "logs": [
    {
      "timestamp": "2026-01-29T12:00:00Z",
      "source": "stdout",
      "message": "Workflow execution started"
    },
    {
      "timestamp": "2026-01-29T12:00:01Z",
      "source": "stderr",
      "message": "Warning: Rate limit approaching"
    }
  ],
  "totalLines": 100,
  "hasMore": true
}
```

---

## Docker Stats

### GET /api/docker/stats

Get aggregated Docker statistics.

**Request:**
```bash
curl http://localhost:3011/api/docker/stats \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "system": {
    "containers": {
      "total": 26,
      "running": 24,
      "paused": 0,
      "stopped": 2
    },
    "images": {
      "total": 45,
      "size": 12500000000
    },
    "volumes": {
      "total": 12,
      "size": 5000000000
    }
  },
  "resources": {
    "cpu": {
      "cores": 8,
      "usage": 35.5
    },
    "memory": {
      "total": 17179869184,
      "used": 8589934592,
      "free": 8589934592,
      "percentage": 50
    },
    "disk": {
      "total": 500000000000,
      "used": 250000000000,
      "free": 250000000000,
      "percentage": 50
    }
  },
  "containers": [
    {
      "id": "abc123def456",
      "name": "agent-01-n8n-manager",
      "cpu": {
        "usage": 12.5,
        "limit": 100
      },
      "memory": {
        "used": 256000000,
        "limit": 512000000,
        "percentage": 50
      },
      "network": {
        "rx": 1024000,
        "tx": 512000
      },
      "pids": 15
    }
  ]
}
```

---

## Documentation

### GET /api/docs/content

Get content of a documentation file.

**Request:**
```bash
curl "http://localhost:3011/api/docs/content?file=AGENTS.md" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | string | Yes | Filename (must be in whitelist) |

**Allowed Files:**
- `AGENTS.md`
- `lastchanges.md`
- `userprompts.md`
- `README.md`

**Response:**
```json
{
  "file": "AGENTS.md",
  "content": "# AGENTS.md\n\nThis is the content...",
  "lastModified": "2026-01-29T10:00:00Z",
  "size": 15000
}
```

**Error Response:**
```json
{
  "error": "File not in whitelist",
  "code": "FILE_NOT_ALLOWED"
}
```

---

## Log Streaming

### GET /api/logs/stream

Stream logs in real-time using Server-Sent Events (SSE).

**Request:**
```bash
curl "http://localhost:3011/api/logs/stream?container=agent-01-n8n-manager" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: text/event-stream"
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `container` | string | Yes | Container name or ID |
| `follow` | boolean | true | Keep connection open |

**Response (SSE):**
```
event: log
data: {"timestamp":"2026-01-29T12:00:00Z","source":"stdout","message":"New log entry"}

event: log
data: {"timestamp":"2026-01-29T12:00:01Z","source":"stderr","message":"Error message"}

event: heartbeat
data: {}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  },
  "timestamp": "2026-01-29T12:00:00Z",
  "requestId": "req-abc123"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONTAINER_NOT_FOUND` | 404 | Container does not exist |
| `CONTAINER_ALREADY_RUNNING` | 409 | Container is already running |
| `CONTAINER_ALREADY_STOPPED` | 409 | Container is already stopped |
| `FILE_NOT_ALLOWED` | 403 | File not in whitelist |
| `DOCKER_ERROR` | 502 | Docker daemon error |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 100 requests | 1 minute |
| Log streaming | 5 connections | Per user |
| Container actions | 10 actions | 1 minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706534400
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
class DashboardAPI {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async getContainers() {
    const response = await fetch(`${this.baseUrl}/api/docker/containers`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }

  async startContainer(id: string) {
    const response = await fetch(
      `${this.baseUrl}/api/docker/containers/${id}/start`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      }
    );
    return response.json();
  }

  streamLogs(containerId: string, onLog: (log: any) => void) {
    const eventSource = new EventSource(
      `${this.baseUrl}/api/logs/stream?container=${containerId}`,
      { headers: { 'Authorization': `Bearer ${this.token}` } }
    );
    
    eventSource.onmessage = (event) => {
      onLog(JSON.parse(event.data));
    };
    
    return () => eventSource.close();
  }
}
```

### Python

```python
import requests

class DashboardAPI:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def get_containers(self):
        response = requests.get(
            f'{self.base_url}/api/docker/containers',
            headers=self.headers
        )
        return response.json()
    
    def start_container(self, container_id: str):
        response = requests.post(
            f'{self.base_url}/api/docker/containers/{container_id}/start',
            headers=self.headers
        )
        return response.json()
```

---

## WebSocket Events

Future versions will support WebSocket connections for real-time updates:

```javascript
const ws = new WebSocket('wss://dashboard.delqhi.com/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'container.status':
      updateContainerStatus(data.payload);
      break;
    case 'container.stats':
      updateContainerStats(data.payload);
      break;
    case 'system.alert':
      showAlert(data.payload);
      break;
  }
};
```

---

## Related Documentation

- [04-architecture.md](./04-room-01-architecture.md) - System architecture
- [06-configuration.md](./06-room-01-configuration.md) - Configuration options
- [12-integration.md](./12-room-01-integration.md) - Integration guide
