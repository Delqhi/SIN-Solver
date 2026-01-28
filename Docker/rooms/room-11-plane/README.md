# Room 11 - Plane (Project Management)

**Version:** V18.3  
**Status:** OPERATIONAL  
**Containers:** 13  

---

## Overview

Plane is an open-source project management tool similar to Jira/Linear. This room provides full Plane stack with MCP integration for AI-powered project management.

## Services

| Container | Port | Status | Purpose |
|-----------|------|--------|---------|
| room-11-plane-proxy | 8081 | Running | Nginx Reverse Proxy |
| room-11-plane-web | 3000 | Unhealthy* | Frontend Web App |
| room-11-plane-admin | 3000 | Healthy | Admin Panel |
| room-11-plane-space | 3000 | Unhealthy* | Public Spaces |
| room-11-plane-live | 3000 | Running | Live Updates |
| room-11-plane-api | 8000 | Healthy | Backend API |
| room-11-plane-worker | 8000 | Running | Background Jobs |
| room-11-plane-beat | 8000 | Running | Celery Beat Scheduler |
| room-11-plane-postgres | 5432 | Healthy | Dedicated Database |
| room-11-plane-redis | 6379 | Healthy | Dedicated Cache |
| room-11-plane-minio | 9000 | Healthy | Object Storage |
| room-11-plane-rabbitmq | 5672 | Healthy | Message Queue |
| room-11-plane-mcp | 8216 | Healthy | MCP Server |

*Note: "Unhealthy" containers often work fine - the health check is too strict.

## Quick Start

```bash
# Start all Plane services
docker compose up -d

# Or from main Docker directory
cd /Users/jeremy/dev/sin-code/Docker
docker compose up -d room-11-plane-*
```

## Access URLs

| Service | URL |
|---------|-----|
| Plane Web UI | http://localhost:8081 |
| Plane API | http://localhost:8081/api |
| MCP Server | http://localhost:8216 |

## Credentials

### Admin Account
```
Email: admin@sin-solver.local
Password: SINSolver2026!
```

### API Token
```
plane_23dc3b3f32b5b2545e8997800fc1f0e99fff71123b633ca1bff883f93ed2c26b
```

### Using API Token
```bash
curl -H "X-API-Key: plane_23dc3b3f32b5b2545e8997800fc1f0e99fff71123b633ca1bff883f93ed2c26b" \
  http://localhost:8081/api/v1/workspaces/
```

## MCP Integration

The Plane MCP server (port 8216) enables AI agents to:
- Create/update issues
- Manage projects
- Query workspace data
- Track progress

### MCP Server Health
```bash
curl http://localhost:8216/health
```

### Registered Agents
10 agents are pre-configured:
- agent-01-n8n-orchestrator
- agent-03-agentzero-coder
- agent-05-steel-browser
- agent-06-skyvern-solver
- Plus 6 more...

## Projects

| Project | Key | Description |
|---------|-----|-------------|
| SIN Infrastructure | SIN | Main infrastructure project |

## Network

- **Network:** haus-netzwerk
- **IP Range:** 172.20.0.110-119
- **Subnet:** 172.20.0.0/16

## Database

Plane uses its own PostgreSQL instance:
```
Host: room-11-plane-postgres
Port: 5432 (internal)
Database: plane
```

## Logs

```bash
# All Plane services
docker logs -f room-11-plane-api

# MCP Server
docker logs -f room-11-plane-mcp

# Worker jobs
docker logs -f room-11-plane-worker
```

## Common Operations

### Create Issue via API
```bash
curl -X POST http://localhost:8081/api/v1/workspaces/sin/projects/sin-infrastructure/issues/ \
  -H "X-API-Key: plane_23dc3b3f32b5b2545e8997800fc1f0e99fff71123b633ca1bff883f93ed2c26b" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Issue", "description": "Created via API"}'
```

### Check Service Health
```bash
docker ps --filter "name=room-11-plane" --format "table {{.Names}}\t{{.Status}}"
```

## Troubleshooting

### Web/Space showing unhealthy
These services often work fine despite health check failures. Test by accessing http://localhost:8081

### MCP not responding
```bash
docker restart room-11-plane-mcp
docker logs -f room-11-plane-mcp
```

### Database migrations needed
```bash
docker exec -it room-11-plane-api python manage.py migrate
```

---

*Part of the SIN-Solver V18.3 Modular Infrastructure*
