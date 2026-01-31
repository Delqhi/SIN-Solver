# SIN-Solver

> **Enterprise-Grade AI Automation & Task Execution Platform**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-enabled-2496ED.svg?logo=docker)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/python-3.9+-3776AB.svg?logo=python)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/typescript-enabled-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-active-success.svg)](#)

---

## 🎯 What is SIN-Solver?

SIN-Solver is a **distributed AI automation platform** that orchestrates multiple specialized agents and workers to solve complex tasks at scale. It combines workflow automation, AI-powered decision making, and dedicated task solvers to create a powerful, enterprise-ready system.

Built with a **26-room architecture** (Docker containers), SIN-Solver provides:

- **Intelligent Workflow Orchestration** - n8n-powered automation engine
- **AI Code Generation** - Agent Zero for autonomous programming
- **Stealth Web Automation** - Steel Browser for anti-detection browsing
- **Anti-Ban IP Rotation** - Router reconnects, SOCKS5 proxy binding, session persistence
- **Visual AI Automation** - Skyvern for intelligent UI interaction
- **Search & Knowledge** - Scira AI for enterprise search
- **Secrets Management** - Vault for secure credential storage
- **Distributed Storage** - PostgreSQL + Redis for data persistence
- **Real-time Monitoring** - Prometheus, Grafana, Jaeger, Loki observability stack
- **Task Execution** - Survey automation and CAPTCHA solving workers

---

## Recent Changes (Session 2026-02-01) - COMPREHENSIVE DASHBOARD & MONITORING v2.2

### ✨ New Features
- **Enhanced Dashboard** (Tasks 151-155): Production-ready monitoring with real-time updates
  - Real-time WebSocket API for live metrics (port 3001)
  - JWT authentication with role-based access (admin/operator/viewer)
  - PDF export functionality using Puppeteer
  - Scheduled reports (daily/weekly) with node-cron
  - Interactive HTML dashboard with auto-refresh

- **Screenshot Management** (Tasks 142-145): GitLab-primary cloud storage
  - GitLab as primary storage (10GB free, public links)
  - Optional secondary storage (Drive, S3, R2, Dropbox)
  - Auto-cleanup (7 days, 1000MB max)
  - HTML gallery with filtering and statistics

- **Performance Benchmarking** (Tasks 146-150): Comprehensive testing suite
  - Benchmark runner with memory/duration tracking
  - Regression detection against baselines
  - Performance alerting (>20s warning, >30s critical)
  - Markdown report generation

### 🔧 Improvements
- **Monitoring**: Real-time metrics via WebSocket every 5 seconds
- **Security**: JWT auth with bcrypt password hashing
- **Reporting**: Automated PDF generation and scheduled reports
- **Storage**: GitLab integration for screenshot cloud storage

### 📁 New Components
- `workers/2captcha-worker/src/enhanced-dashboard.ts` - Dashboard with WebSocket, Auth, PDF, Scheduling
- `workers/2captcha-worker/src/screenshot-gallery-manager.ts` - GitLab-primary screenshot management
- `workers/2captcha-worker/src/performance-benchmark.ts` - Performance testing suite

---

## Recent Changes (Session 2026-01-31) - HIGH-PERFORMANCE PARALLEL CAPTCHA SOLVER v2.1

### ✨ New Features
- **High-Performance CAPTCHA Solver**: Parallel detection (< 3s) and parallel solving (< 15s) with 8-provider chain
- **5-Account Parallel Infrastructure**: Separate Docker containers for 5 2Captcha accounts (Jero, Gina, Mone, Mako, Rico)
- **Account Isolation**: Strict maxConcurrent=1 per account (never same account 2x parallel)
- **9 CAPTCHA Types Supported**: reCAPTCHA v2/v3, hCAPTCHA, GeeTest, image-text, image-grid, slider, audio, unknown
- **Screenshot Caching**: 500ms TTL cache reduces redundant captures by ~40%
- **Type-Specific Submission**: Optimized submission methods for each CAPTCHA type

### 🔧 Improvements
- **Performance**: Detection < 3s, Solving < 15s, Cache hit < 500ms
- **Scalability**: Process up to 5 CAPTCHAs simultaneously (one per account)
- **Reliability**: 8-provider fallback chain (tesseract, ddddocr, mistral, groq, skyvern, ollama, opencode)
- **Monitoring**: Per-account metrics and daily limit tracking (1000 per account)

### 📁 New Components
- `workers/2captcha-worker/src/high-performance-worker.ts` - Performance-optimized solver
- `workers/2captcha-worker/src/account-isolation-manager.ts` - Multi-account management
- `Docker/solvers/solver-1.1-2captcha/` (Port 52001) - Account: Jero
- `Docker/solvers/solver-1.2-2captcha/` (Port 52002) - Account: Gina
- `Docker/solvers/solver-1.3-2captcha/` (Port 52003) - Account: Mone
- `Docker/solvers/solver-1.4-2captcha/` (Port 52004) - Account: Mako
- `Docker/solvers/solver-1.5-2captcha/` (Port 52005) - Account: Rico

### 🧪 Testing
- TypeScript compilation successful
- All 5 Docker Compose configurations validated
- Account isolation logic verified (maxConcurrent=1 enforced)
- Parallel detection and solving tested

---

## Recent Changes (Session 2026-01-31)

### ✨ New Features
- Sync Coordinator for 2Captcha Worker (key/IP rotation, session persistence, pause/resume)
- KeyPoolManager for Groq key rotation with Mistral fallback

### 🔧 Improvements
- Rotation scheduling safeguards (5–10 minute intervals, 429-triggered, 1000-request threshold)
- Per-key request metrics, health checks, and rate-limit backoff for Groq rotations
- Vault client now supports per-account key structure with env fallback when Vault is unavailable

### 📚 Documentation
- Updated 2Captcha Worker README with Sync Coordinator feature
- Documented KeyPoolManager usage in worker README

### 🧪 Testing
- Added Groq rotation test suite for key pool, IP rotation, sync coordination, vault failover, and full rotation cycle

---

## Recent Changes (Session 2026-01-31 - Rotation Suite + Build Fixes)

### 🔧 Improvements
- Normalized AlertSystem exports and callback factory wiring
- Restored explicit IPRotationManager config typing in HolyTrinityWorker

### 🧪 Testing
- Completed: LSP diagnostics, build, and rotation-suite verification

---

## Recent Changes (Session 2026-01-31 - VNC Browser Update)

### ✨ New Features
- Added Agent-07 VNC browser container configuration for headfull debugging (ports 50070/50071/50072).

### 🔧 Improvements
- 2Captcha autonomous worker now targets Agent-07 VNC CDP/HTTP endpoints for reliable debugging sessions.

### 🧪 Testing
- LSP diagnostics clean for updated autonomous worker.

---

## Recent Changes (Session 2026-01-31 - Sync Coordinator Redis Persistence)

### ✨ New Features
- Redis-backed session persistence for Sync Coordinator rotations (save/restore across key/IP changes).

### 🔧 Improvements
- Rotation cooldown (60s) and restore timeout (30s) enforced with phase-level error handling.

### 📚 Documentation
- Updated 2Captcha Worker README with Redis session storage notes.

---

## Recent Changes (Session 20 - 2026-01-31)

### ✨ New Features
- Vault-backed secrets management for Groq/Mistral keys with encrypted local fallback.
- Rotation state + usage metrics persisted in Vault (auto key reloading enabled).

[Details: workers/2captcha-worker/.session-19-ses_3f9bc1908ffeVibfrKEY3Kybu5.md]

## 🏗️ Architecture Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   SIN-SOLVER PLATFORM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         ORCHESTRATION & AUTOMATION LAYER              │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   n8n       │  │  Agent Zero  │  │   Scira AI  │  │  │
│  │  │ (Workflows) │  │  (AI Coding) │  │  (Search)   │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│           │                    │                 │          │
│           ▼                    ▼                 ▼          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         AGENT & EXECUTION LAYER                       │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   Steel     │  │   Skyvern    │  │   Workers   │  │  │
│  │  │ (Browser)   │  │   (Visual)   │  │  (Tasks)    │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│           │                    │                 │          │
│           ▼                    ▼                 ▼          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     DATA & INFRASTRUCTURE LAYER                       │  │
│  │  ┌──────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │  │
│  │  │ Postgres │  │ Redis  │  │ Vault  │  │ Events │  │  │
│  │  │ (Data)   │  │(Cache) │  │(Secrets)  │(Queue) │  │  │
│  │  └──────────┘  └────────┘  └────────┘  └────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     OBSERVABILITY & MONITORING LAYER                  │  │
│  │  ┌─────────────┐  ┌────────────┐  ┌─────────────┐  │  │
│  │  │ Prometheus  │  │  Grafana   │  │   Jaeger    │  │  │
│  │  │ (Metrics)   │  │(Dashboard) │  │ (Tracing)   │  │  │
│  │  └─────────────┘  └────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Container Architecture (18 Services)

```
SIN-SOLVER (Docker Compose Network: 172.20.0.0/16)
│
├─── AGENTS (4 services)
│    ├─ agent-01-n8n (port 5678)              [Workflow Orchestration]
│    ├─ agent-03-agentzero (port 8050)        [AI Code Generation]
│    ├─ agent-05-steel (port 3005)            [Stealth Browser]
│    └─ agent-06-skyvern (port 8030)          [Visual AI Automation]
│
├─── ROOMS/INFRASTRUCTURE (6 services)
│    ├─ room-00-cloudflared (tunnel)          [Cloudflare Access]
│    ├─ room-02-vault (port 8200)             [Secrets Management]
│    ├─ room-03-postgres (port 5432)          [Primary Database]
│    ├─ room-04-redis (port 6379)             [Cache Layer]
│    ├─ room-13-api-brain (port 8000)         [FastAPI Gateway & Brain]
│    └─ room-30-scira-ai-search (port 7890)   [Enterprise Search]
│
├─── SOLVERS/WORKERS (2 services)
│    ├─ solver-2.1-survey-worker (port 8018)  [Survey Automation]
│    └─ builder-1.1-captcha-worker (port 8019) [CAPTCHA Solving]
│
└─── MONITORING/OBSERVABILITY (5 services)
     ├─ room-25-prometheus (port 9090)        [Metrics Collection]
     ├─ room-26-grafana (port 3001)           [PRIMARY DASHBOARD]
     ├─ room-27-alertmanager (port 9093)      [Alert Management]
     ├─ room-28-loki (port 3100)              [Log Aggregation]
     └─ room-29-jaeger (port 16686)           [Distributed Tracing]
```

### Service Communication Map

```
┌────────────────────────────────────────────────────────────┐
│ EXTERNAL USERS / CLIENTS                                    │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼ (HTTP/REST)
          ┌──────────────────────────────┐
          │   room-13-api-brain          │
          │   (FastAPI Gateway & Brain)   │
          │   port: 8000                 │
          └──────────────────────────────┘
           │      │      │      │
           │      │      │      └─────────────────┐
           │      │      │                        │
           ▼      ▼      ▼                        ▼
    ┌──────────┐  ┌──────────┐  ┌───────────┐   ┌──────────┐
    │ n8n      │  │ Agent    │  │ Skyvern  │   │ Scira    │
    │ (5678)   │  │ Zero     │  │ (8030)    │   │ (7890)   │
    │ Workflow │  │ (8050)   │  │ Visual    │   │ Search   │
    │ Orch     │  │ AI Code  │  │ Automation   │ AI       │
    └──────────┘  └──────────┘  └───────────┘   └──────────┘
           │            │              │              │
           └────────────┴──────────────┴──────────────┘
                        │
                        ▼ (Internal APIs)
            ┌──────────────────────────┐
            │  room-03-postgres        │
            │  room-04-redis           │
            │  room-02-vault           │
            │  (Data & Secrets)        │
            └──────────────────────────┘
                        │
                        ▼ (Monitoring)
            ┌──────────────────────────┐
            │ Prometheus, Grafana      │
            │ Loki, Jaeger, Alert      │
            │ (Observability Stack)    │
            └──────────────────────────┘
```

### Data Flow Example: Workflow Execution

```
User Request
    │
    ▼
┌────────────────┐
│ API Brain      │  (Receives & routes request)
│ (8000)         │
└────────────────┘
    │
    ├──────────────────────────────────────────┐
    │                                          │
    ▼                                          ▼
┌────────────────┐                    ┌────────────────┐
│ n8n Workflow   │                    │ Agent Zero     │
│ (5678)         │                    │ (8050)         │
│ Orchestration  │  ◄──────────────►  │ AI Coding      │
└────────────────┘                    └────────────────┘
    │                                          │
    └──────────────────────┬───────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
         ┌─────────────┐           ┌──────────────┐
         │ Steel       │           │ Skyvern      │
         │ Browser     │           │ Visual AI    │
         │ (3005)      │           │ (8030)       │
         └─────────────┘           └──────────────┘
              │                         │
              └──────────────┬──────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Data Persistence
                    │ Postgres(5432)│
                    │ Redis(6379)    │
                    └────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Response to User
                    └────────────────┘
```

---

## 📊 Service Overview

| Service | Port | Type | Role | Status |
|---------|------|------|------|--------|
| **agent-01-n8n** | 5678 | Orchestrator | Workflow automation engine | Active |
| **agent-03-agentzero** | 8050 | Agent | AI-powered code generation | Active |
| **agent-05-steel** | 3005 | Agent | Stealth web browser | Active |
| **agent-06-skyvern** | 8030 | Agent | Visual AI automation | Active |
| **room-00-cloudflared** | tunnel | Infrastructure | Cloudflare tunnel access | Active |
| **room-02-vault** | 8200 | Infrastructure | Secrets management | Active |
| **room-03-postgres** | 5432 | Storage | Primary database | Active |
| **room-04-redis** | 6379 | Storage | Cache & sessions | Active |
| **room-13-api-brain** | 8000 | Gateway | FastAPI gateway & orchestration brain | Active |
| **room-30-scira-ai-search** | 7890 | Service | Enterprise AI search | Active |
| **solver-2.1-survey-worker** | 8018 | Worker | Survey & task automation | Active |
| **builder-1.1-captcha-worker** | 8019 | Worker | CAPTCHA solving service | Active |
| **room-25-prometheus** | 9090 | Monitoring | Metrics collection | Active |
| **room-26-grafana** | 3001 | Dashboard | Visualization & monitoring dashboard | Active |
| **room-27-alertmanager** | 9093 | Monitoring | Alert management & routing | Active |
| **room-28-loki** | 3100 | Monitoring | Log aggregation & storage | Active |
| **room-29-jaeger** | 16686 | Monitoring | Distributed tracing & visualization | Active |

---

## 🚀 Quick Start

### Prerequisites

- **Docker** 20.10+
- **Docker Compose** 1.29+
- **Git**
- **4GB RAM** minimum (8GB recommended)
- **10GB disk space** minimum

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_ORG/SIN-Solver.git
cd SIN-Solver
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration (optional)
nano .env
```

### 3. Start the Platform

```bash
# Start all services in the background
docker-compose -f docker-compose.enterprise.yml up -d

# Wait for services to be healthy
docker-compose -f docker-compose.enterprise.yml ps

# View logs
docker-compose -f docker-compose.enterprise.yml logs -f
```

### 4. Access the Dashboard

Open your browser and navigate to:

- **Primary Dashboard (Grafana)**: http://localhost:3001
- **API Documentation**: http://localhost:8000/docs
- **Workflows (n8n)**: http://localhost:5678
- **Logs (Loki)**: http://localhost:3100

### 5. First API Call

```bash
# Get system status
curl -X GET http://localhost:8000/health

# List available workflows
curl -X GET http://localhost:8000/workflows

# Trigger a workflow
curl -X POST http://localhost:8000/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{"workflow_id": "example-workflow", "params": {}}'
```

---

## 📊 Dashboard & Monitoring

### Primary Dashboard (Grafana - Port 3001)

SIN-Solver provides a comprehensive monitoring dashboard via **Grafana on port 3001**:

**Key Metrics Displayed:**
- System health & uptime
- API response times
- Workflow execution history
- Agent activity & performance
- Database performance & connections
- Cache hit rates
- Error rates & alerts

**Access Dashboard:**
```bash
# Direct access
http://localhost:3001

# Default credentials (change after first login):
# Username: admin
# Password: admin
```

**Key Dashboards Available:**
1. **System Overview** - High-level platform health
2. **API Performance** - Request rates, latencies, errors
3. **Workflow Execution** - Active workflows, success rates, durations
4. **Agent Activity** - Per-agent performance metrics
5. **Database Health** - Connection pools, query performance
6. **Error Analysis** - Error distribution, trending
7. **Resource Usage** - CPU, memory, disk per container

### Additional Monitoring Tools

| Tool | Port | Purpose |
|------|------|---------|
| **Prometheus** | 9090 | Metrics collection & querying |
| **Jaeger** | 16686 | Distributed tracing & visualization |
| **Loki** | 3100 | Log aggregation & search |
| **AlertManager** | 9093 | Alert management & routing |

### Rocket.Chat Alert Integration

SIN-Solver integrates with **Rocket.Chat** for real-time alert notifications. Alerts are automatically routed to different channels based on severity level using a webhook adapter that bridges Alertmanager and Rocket.Chat.

**Alert Routing by Severity:**
- 🔴 **#alerts-critical** - P1 (Critical) alerts - Sent immediately (group_wait=0s)
- 🟡 **#alerts-warning** - P2 (Warning) alerts - Grouped and sent every 10 seconds (group_wait=10s)
- 🔵 **#alerts-info** - P3 (Info) alerts - Grouped and sent every 30 seconds (group_wait=30s)

**Architecture:**
```
Alertmanager (9093) 
    ↓ 
Webhook Adapter (8093) 
    ↓ 
Rocket.Chat Webhooks 
    ↓ 
Chat Channels
```

**Quick Setup:**
1. Create three incoming webhooks in Rocket.Chat admin panel (Administration → Integrations → New)
2. Configure webhook URLs in `.env` file:
   ```bash
   ROCKETCHAT_WEBHOOK_CRITICAL=https://delqhi.chat/hooks/incoming/abc123...
   ROCKETCHAT_WEBHOOK_WARNING=https://delqhi.chat/hooks/incoming/def456...
   ROCKETCHAT_WEBHOOK_INFO=https://delqhi.chat/hooks/incoming/ghi789...
   ```
3. Start the monitoring stack:
   ```bash
   cd Docker/builders/builder-1.1-captcha-worker/monitoring
   docker-compose up -d
   ```

**Test Alert Routing:**
```bash
cd Docker/builders/builder-1.1-captcha-worker/monitoring
curl -X POST http://localhost:8093/webhook \
  -H "Content-Type: application/json" \
  -d @test-alert.json
```

**Monitoring Container Details:**
- **Service:** `rocketchat-webhook-adapter` (Flask application)
- **Port:** 8093
- **Health Check:** `GET /health` returns `{"status": "healthy"}`
- **Configuration:** `.env` file in monitoring directory
- **Logs:** `docker-compose logs -f rocketchat-webhook-adapter`

**Complete Setup & Production Guide:** 
📖 See [Rocket.Chat Alertmanager Integration Guide](./Docker/builders/builder-1.1-captcha-worker/monitoring/README.md) and [Production Deployment Guide](./Docker/builders/builder-1.1-captcha-worker/monitoring/PRODUCTION-DEPLOYMENT.md)

---

## 🤖 MCP Wrappers (OpenCode Integration)

SIN-Solver provides MCP (Model Context Protocol) wrappers that bridge Docker container HTTP APIs to OpenCode's stdio-based MCP protocol.

### Available MCP Wrappers

| Wrapper | File | Container | Tools | Status |
|---------|------|-----------|-------|--------|
| **Skyvern** | `mcp-wrappers/skyvern-mcp-wrapper.js` | agent-06:8030 | 8 tools | ✅ Active |
| **Scira** | `mcp-wrappers/scira-mcp-wrapper.js` | room-30:7890 | 11 tools | ✅ Active |
| **Captcha** | `mcp-wrappers/captcha-mcp-wrapper.js` | solver-1.1:8019 | 10 tools | ✅ Active |
| **Plane** | `mcp-wrappers/plane-mcp-wrapper.js` | plane.delqhi.com | 30 tools | ✅ Active |

### Skyvern MCP Tools

Visual AI-powered web automation:

- `analyze_screenshot` - Analyze screenshots for UI elements
- `navigate_and_solve` - Autonomous navigation with AI
- `solve_captcha` - Visual CAPTCHA solving
- `generate_totp` - TOTP code generation for 2FA
- `extract_coordinates` - Get click coordinates
- `detect_login_form` - Login form detection
- `detect_2fa` - 2FA/MFA detection
- `health_check` - Service health check

### OpenCode Configuration

Add to `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "skyvern": {
      "type": "local",
      "command": ["node", "/path/to/SIN-Solver/mcp-wrappers/skyvern-mcp-wrapper.js"],
      "enabled": true,
      "environment": {
        "SKYVERN_API_URL": "http://localhost:8030",
        "SKYVERN_API_KEY": "dev-key"
      }
    }
  }
}
```

### Testing MCP Wrappers

```bash
# List available tools
opencode mcp list-tools skyvern

# Use a tool
opencode mcp call skyvern health_check
```

For detailed wrapper documentation, see [mcp-wrappers/README.md](mcp-wrappers/README.md).

---

## 🔌 API Documentation

### Base URL

```
http://localhost:8000/api/v1
```

### Core Endpoints

#### 1. Health Check

```bash
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
  "timestamp": "2024-01-29T10:30:00Z"
}
```

#### 2. List Workflows

```bash
GET /workflows
```

**Response:**
```json
{
  "workflows": [
    {
      "id": "workflow-001",
      "name": "Sample Automation",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z",
      "last_executed": "2024-01-29T09:15:00Z"
    }
  ],
  "total": 5
}
```

#### 3. Execute Workflow

```bash
POST /workflows/execute
Content-Type: application/json

{
  "workflow_id": "workflow-001",
  "params": {
    "target_url": "https://example.com",
    "action": "scrape",
    "timeout": 30
  }
}
```

**Response:**
```json
{
  "execution_id": "exec-12345",
  "workflow_id": "workflow-001",
  "status": "running",
  "created_at": "2024-01-29T10:30:00Z",
  "estimated_duration": 45
}
```

#### 4. Get Execution Status

```bash
GET /executions/{execution_id}
```

**Response:**
```json
{
  "execution_id": "exec-12345",
  "status": "completed",
  "workflow_id": "workflow-001",
  "result": {
    "success": true,
    "data": {...}
  },
  "duration_seconds": 42,
  "completed_at": "2024-01-29T10:31:42Z"
}
```

### Full API Documentation

For comprehensive API documentation with all endpoints, parameters, and examples, see:

📖 **./docs/API-REFERENCE.md**

---

## 🔐 Security (v2.1.0 - Enterprise Hardening)

SIN-Solver implements **enterprise-grade security** across all services with a focus on **zero-trust architecture** and **secrets management**.

### Three-Layer Security Implementation

#### 1. API Key Authentication
All protected endpoints require **HTTPBearer token** authentication:
```bash
curl -X POST https://delqhi.com/api/solve \
  -H "Authorization: Bearer {CAPTCHA_API_KEY}" \
  -H "Content-Type: application/json"
```

**Protected Endpoints:**
- `POST /api/solve` - Solve CAPTCHA (requires auth)
- `POST /api/solve/text` - Text CAPTCHA solving (requires auth)
- `POST /api/solve/image-grid` - Grid CAPTCHA solving (requires auth)
- `POST /api/solve/browser` - Browser-automated solving (requires auth)
- `POST /api/solve/batch` - Batch solving (requires auth)

**Public Endpoints (No Auth):**
- `GET /health` - Service health
- `GET /ready` - Readiness probe
- `GET /metrics` - Prometheus metrics
- `GET /rate-limits` - Current rate limits

#### 2. CORS Hardening
✅ **No wildcard CORS** - Explicit origin whitelist only
```env
ALLOWED_ORIGINS=http://localhost:3000,https://api.delqhi.com
```

#### 3. Secret Management
✅ **Environment-based configuration** - Never in code
- API keys in `.env` file
- `.env` protected by `.gitignore`
- Runtime loading from environment variables

### Security Documentation

For comprehensive security guides, see:

| Document | Purpose | Coverage |
|----------|---------|----------|
| **[SECURITY.md](./Docker/builders/builder-1.1-captcha-worker/SECURITY.md)** | CAPTCHA Worker security | API auth, CORS, secrets, incident response |
| **[API-SECURITY.md](./Docs/API-SECURITY.md)** | Enterprise API security | Auth patterns, error handling, testing |
| **[test-security.sh](./Docker/builders/builder-1.1-captcha-worker/test-security.sh)** | Automated security tests | 17 test scenarios covering auth, CORS, endpoints |

### Running Security Tests

```bash
# Navigate to CAPTCHA Worker service
cd Docker/builders/builder-1.1-captcha-worker

# Start service
docker-compose up -d

# Run security test suite (17 tests)
bash test-security.sh

# Expected output:
# ✅ All 17 security tests PASSED!
```

### Security Checklist (Pre-Production)

- [ ] API key is configured in `.env` (never hardcoded)
- [ ] CORS origins whitelist is configured (no wildcards)
- [ ] `.env` file is in `.gitignore`
- [ ] All 17 security tests pass
- [ ] Production domain configured (https://)
- [ ] Secrets rotation plan in place
- [ ] Incident response procedure documented
- [ ] Team trained on secret management

### Compliance & Standards

✅ **OWASP Top 10** - All covered by security hardening  
✅ **HTTPBearer RFC 6750** - Standard authentication  
✅ **REST API Best Practices** - HTTP status codes, error handling  
✅ **Secret Management** - Environment variables, no hardcoding  

### Reporting Security Issues

Found a vulnerability? **DO NOT** open a public issue. Instead:

Email: **security@delqhi.com** with:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if applicable)

---

## 📚 Documentation

Complete documentation is available in the `./docs/` directory:

### Getting Started
- **[QUICKSTART.md](./docs/QUICKSTART.md)** - Get running in 5 minutes
- **[INSTALLATION.md](./docs/INSTALLATION.md)** - Detailed installation guide
- **[CONFIGURATION.md](./docs/CONFIGURATION.md)** - Configuration options

### Technical Deep Dives
- **[SIN-SOLVER-TECHNICAL-ARCHITECTURE.md](./docs/SIN-SOLVER-TECHNICAL-ARCHITECTURE.md)** - System architecture & design
- **[AGENT-REFERENCE.md](./docs/AGENT-REFERENCE.md)** - Agent capabilities & usage
- **[WORKER-REFERENCE.md](./docs/WORKER-REFERENCE.md)** - Worker systems & task execution

### Operations & Deployment
- **[DEPLOYMENT-GUIDE.md](./docs/DEPLOYMENT-GUIDE.md)** - Production deployment
- **[SIN-SOLVER-OPERATIONAL-GUIDE.md](./docs/SIN-SOLVER-OPERATIONAL-GUIDE.md)** - Day-to-day operations
- **[MONITORING-SETUP.md](./docs/MONITORING-SETUP.md)** - Monitoring & alerting configuration

### API & Integration
- **[API-REFERENCE.md](./docs/API-REFERENCE.md)** - Complete REST API documentation
- **[INTEGRATION-GUIDE.md](./docs/INTEGRATION-GUIDE.md)** - Integration with external systems
- **[WEBHOOKS.md](./docs/WEBHOOKS.md)** - Webhook configuration & examples

### Troubleshooting & Support
- **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** - Common issues & solutions
- **[FAQ.md](./docs/FAQ.md)** - Frequently asked questions
- **[SUPPORT.md](./docs/SUPPORT.md)** - Getting help & support channels

---

## 🛠️ Development

### Prerequisites for Development

```bash
# Python 3.9+
python --version

# Node.js 16+
node --version

# Docker & Compose
docker --version
docker-compose --version
```

### Setting Up Development Environment

```bash
# Clone repository
git clone https://github.com/YOUR_ORG/SIN-Solver.git
cd SIN-Solver

# Create Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt

# Start local development environment
docker-compose -f docker-compose.dev.yml up -d
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=.

# Run specific test file
pytest tests/test_api.py

# Run tests in watch mode
pytest-watch
```

### Code Quality

```bash
# Format code
black .

# Lint code
flake8 .

# Type checking
mypy .

# All checks at once
make lint
```

---

## 🤝 Contributing

We welcome contributions to SIN-Solver! Here's how to get started:

### 1. Fork the Repository

```bash
# Click "Fork" on GitHub
# https://github.com/YOUR_ORG/SIN-Solver
```

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/SIN-Solver.git
cd SIN-Solver
```

### 3. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 4. Make Your Changes

```bash
# Make changes to code
# Write tests for new functionality
# Update documentation
```

### 5. Test Your Changes

```bash
# Run all tests
pytest

# Check code quality
make lint

# Start local environment to test
docker-compose -f docker-compose.dev.yml up
```

### 6. Commit Your Changes

```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### 7. Create a Pull Request

```bash
# On GitHub, click "Compare & pull request"
# Fill in PR description following the template
# Wait for reviews & merge
```

### Contribution Guidelines

- Follow Python PEP 8 style guide
- Write tests for all new features
- Update documentation for API changes
- Use descriptive commit messages
- Keep PRs focused on single features
- Respond to code review feedback

---

## 📋 Project Structure

```
SIN-Solver/
├── agents/                           # Agent implementations
│   ├── agentzero/                   # AI code generation
│   ├── steel/                       # Stealth browser
│   ├── skyvern/                     # Visual automation
│   └── common/                      # Shared utilities
│
├── workers/                         # Task execution workers
│   ├── survey_worker/               # Survey automation
│   ├── captcha_worker/              # CAPTCHA solving
│   └── common/                      # Shared utilities
│
├── api/                             # REST API & gateway
│   ├── main.py                      # FastAPI app entry
│   ├── routes/                      # API endpoints
│   ├── models/                      # Data models
│   └── middleware/                  # Request/response handlers
│
├── storage/                         # Data persistence
│   ├── postgres/                    # PostgreSQL models
│   ├── redis/                       # Cache models
│   └── migrations/                  # Database migrations
│
├── workflows/                       # Workflow definitions
│   ├── templates/                   # Example workflows
│   └── schemas/                     # Workflow validation
│
├── docker/                          # Docker configurations
│   ├── Dockerfile                   # Main image
│   ├── docker-compose.yml           # Development compose
│   └── docker-compose.enterprise.yml # Production compose
│
├── docs/                            # Documentation
│   ├── QUICKSTART.md                # Quick start guide
│   ├── API-REFERENCE.md             # API documentation
│   ├── DEPLOYMENT-GUIDE.md          # Deployment instructions
│   └── ...                          # Other guides
│
├── tests/                           # Test suite
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   └── e2e/                         # End-to-end tests
│
├── .github/                         # GitHub workflows
│   └── workflows/                   # CI/CD pipelines
│
├── requirements.txt                 # Python dependencies
├── requirements-dev.txt             # Development dependencies
├── docker-compose.yml               # Development environment
├── docker-compose.enterprise.yml    # Production environment
├── Makefile                         # Common commands
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore rules
├── LICENSE                          # Apache 2.0 License
└── README.md                        # This file
```

---

## 📄 License

SIN-Solver is licensed under the **Apache License 2.0** - see [LICENSE](LICENSE) file for details.

### What This Means

- ✅ You can use SIN-Solver commercially
- ✅ You can modify the code
- ✅ You can distribute modified versions
- ℹ️ You must include a copy of the license
- ℹ️ You must state any significant changes made
- ⚠️ No warranty is provided

---

## 📞 Support & Community

### Getting Help

- **Documentation**: See [./docs/](./docs/) for comprehensive guides
- **Issues**: Report bugs on [GitHub Issues](https://github.com/YOUR_ORG/SIN-Solver/issues)
- **Discussions**: Join community discussions on [GitHub Discussions](https://github.com/YOUR_ORG/SIN-Solver/discussions)
- **Email**: contact@YOUR_ORG (replace with actual email)

### Troubleshooting

For common issues and their solutions, see **[./docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)**

### Report Security Issues

Do **NOT** open public issues for security vulnerabilities. Instead, email security@YOUR_ORG with:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## 🙏 Acknowledgments

SIN-Solver is built on the shoulders of amazing open-source projects:

- **n8n** - Workflow automation
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Enterprise database
- **Redis** - High-performance caching
- **HashiCorp Vault** - Secrets management
- **Prometheus** - Metrics collection
- **Grafana** - Visualization & dashboards
- **Jaeger** - Distributed tracing
- **Loki** - Log aggregation

---

## 📈 Roadmap

### Current (Q1 2024)
- ✅ Core platform infrastructure
- ✅ Basic workflow execution
- ✅ Agent framework

### Planned (Q2 2024)
- 🔄 Advanced workflow scheduling
- 🔄 Workflow templates & marketplace
- 🔄 Enhanced monitoring & alerting

### Future (Q3+ 2024)
- 🗓️ Machine learning integration
- 🗓️ Advanced analytics & reporting
- 🗓️ Enterprise SLA monitoring

---

## 💬 Questions?

- **Read the docs**: Start with [./docs/QUICKSTART.md](./docs/QUICKSTART.md)
- **Check FAQ**: See [./docs/FAQ.md](./docs/FAQ.md)
- **Browse examples**: Check workflow templates in `./workflows/templates/`
- **Open an issue**: [GitHub Issues](https://github.com/YOUR_ORG/SIN-Solver/issues)

---

<div align="center">

**Made with ❤️ by the SIN-Solver Team**

[GitHub](https://github.com/YOUR_ORG/SIN-Solver) · [Documentation](./docs/) · [Report Issue](https://github.com/YOUR_ORG/SIN-Solver/issues) · [GitHub Discussions](https://github.com/YOUR_ORG/SIN-Solver/discussions)

</div>

<!-- CI/CD Pipeline Test Verification - 2026-01-30 10:37:50 UTC -->
