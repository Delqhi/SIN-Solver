# Zimmer-13: API Coordinator

**Port:** 8000 | **IP:** 172.20.0.31

Central API gateway and workflow orchestrator.

## 🎯 Purpose

Enterprise API brain for Delqhi-Platform:
- Workflow management
- Webhook handling
- N8N integration
- Steel Browser coordination

## 🔧 Features

- **Workflow Engine** - Create, execute, manage workflows
- **Webhook System** - Register and deliver webhooks
- **N8N Integration** - Execute N8N workflows
- **Steel Browser** - Browse and screenshot APIs
- **Task Routing** - Distribute tasks to workers

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/workflows` | GET/POST | Workflow management |
| `/api/workflows/:id` | GET/PUT/DELETE | Workflow CRUD |
| `/api/workflows/:id/execute` | POST | Execute workflow |
| `/api/webhooks` | GET/POST | Webhook management |
| `/api/webhooks/deliver` | POST | Manual webhook delivery |
| `/api/n8n/status` | GET | N8N health |
| `/api/n8n/execute` | POST | Execute N8N workflow |
| `/api/steel/status` | GET | Steel Browser status |
| `/api/steel/browse` | POST | Browse URL |
| `/api/steel/screenshot` | POST | Take screenshot |

## 🚀 Quick Start

```bash
npm install
npm start

# Docker
docker build -t sin-api-coordinator .
docker run -p 8000:8000 sin-api-coordinator
```

## 📁 Structure

```
zimmer-13-api-coordinator/
├── server.js
├── src/
│   ├── workflows/
│   ├── webhooks/
│   ├── n8n/
│   └── steel/
├── Dockerfile
└── package.json
```

## 💰 Cost

**100% FREE** - Self-hosted coordination.

---

**Version:** 1.0.0 | **Last Updated:** 2026-01-27
