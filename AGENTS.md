# 🚀 SIN-Solver AGENTS.md - Project Knowledge Base

**Status:** ACTIVE & UPDATED  
**Project:** SIN-Solver - Enterprise-Grade AI Automation Platform  
**Last Updated:** 2026-01-30  
**Mandate Compliance:** MANDATE 0.22 (Vollumfängliches Projekt-Wissen)

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#-project-overview)
2. [Project Conventions](#-project-conventions)
3. [26-Room Docker Architecture](#-26-room-docker-architecture)
4. [Container Registry & Networking](#-container-registry--networking)
5. [API Standards](#-api-standards)
6. [Development Workflow](#-development-workflow)
7. [Special Rules & Patterns](#-special-rules--patterns)
8. [Troubleshooting Guide](#-troubleshooting-guide)
9. [Session Log](#-session-log)

---

## 🎯 PROJECT OVERVIEW

**Project Name:** SIN-Solver  
**Description:** Enterprise-Grade AI Automation & Task Execution Platform  
**Purpose:** Orchestrate multiple AI agents and workers to solve complex tasks at scale  
**Status:** Active Development  
**Team:** Multi-agent AI swarm (18+ services)

### Core Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Language** | Python 3.9+, TypeScript, JavaScript | Backend & scripting |
| **Framework** | FastAPI, n8n, Flask | API & automation |
| **Database** | PostgreSQL | Primary persistence |
| **Cache** | Redis | Session & data cache |
| **Message Queue** | RabbitMQ / Event-driven | Async task processing |
| **Container** | Docker, Docker Compose | Service orchestration |
| **Secrets** | HashiCorp Vault | Credential management |
| **Search** | Qdrant, Scira AI | Vector & semantic search |
| **Browser** | Steel Browser, Playwright | Stealth & visual automation |
| **Monitoring** | Prometheus, Grafana, Jaeger, Loki | Observability |
| **CI/CD** | GitHub Actions | Automated testing & deployment |

### Project Goals

- ✅ Automate complex, multi-step tasks with AI orchestration
- ✅ Solve CAPTCHAs and complete survey work at scale
- ✅ Provide stealth web automation (anti-detection)
- ✅ Enable visual AI interaction (understand & act on UI)
- ✅ Maintain enterprise-grade security & secrets management
- ✅ Real-time monitoring & observability
- ✅ Modular, scalable architecture (26+ services)

---

## 📐 PROJECT CONVENTIONS

### Naming Convention (ABSOLUTE - MANDATE COMPLIANCE)

**Container Naming:** `{category}-{number}-{name}`

**Categories:**
- `agent-XX-` → AI Workers, Orchestrators (1-15)
- `room-XX-` → Infrastructure, Rooms, Support (0-30)
- `solver-X.X-` → Money-Making Workers (Survey, CAPTCHA)
- `builder-X-` → Content Creation Workers

**Examples:**
- ✅ `agent-01-n8n-orchestrator` (Workflow automation)
- ✅ `agent-03-agentzero` (AI code generation)
- ✅ `agent-05-steel` (Stealth browser)
- ✅ `agent-06-skyvern` (Visual automation)
- ✅ `room-03-postgres` (Database)
- ✅ `room-04-redis` (Cache)
- ✅ `solver-1.1-captcha-worker` (CAPTCHA solving)
- ✅ `builder-1.1-captcha-worker` (Alternative CAPTCHA)

**FORBIDDEN:** Old naming with `sin-zimmer-` prefix - MUST be refactored to above standard.

### Folder Structure

```
/Users/jeremy/dev/SIN-Solver/
├── /Docker/
│   ├── /agents/                  # Agent services
│   │   ├── agent-01-n8n-orchestrator/
│   │   ├── agent-03-agentzero/
│   │   ├── agent-05-steel/
│   │   └── ...
│   ├── /rooms/                   # Infrastructure rooms
│   │   ├── room-02-tresor-vault/
│   │   ├── room-03-postgres/
│   │   ├── room-04-redis/
│   │   └── ...
│   ├── /solvers/                 # Worker services
│   │   ├── solver-1.1-captcha/
│   │   └── solver-2.1-survey/
│   ├── /builders/                # Builder services
│   │   └── builder-1.1-captcha-worker/
│   └── lastchanges.md            # Docker changes log
├── /docs/
│   ├── 01-captcha-overview.md
│   ├── 02-CAPTCHA-TRAINING-GUIDE.md
│   ├── DEPLOYMENT-GUIDE.md
│   └── ...
├── /training/                    # ML model training
│   ├── data.yaml                 # YOLO configuration
│   ├── train_yolo_classifier.py
│   └── training-lastchanges.md
├── /app/
│   └── /tools/
│       └── captcha_solver.py     # Main CAPTCHA solver
├── docker-compose.yml            # Development compose
├── docker-compose.enterprise.yml # Production compose
├── SIN-Solver-lastchanges.md     # Project changes log
└── AGENTS.md                     # THIS FILE (Local project knowledge)
```

### Code Style & Standards

**TypeScript/JavaScript:**
- `"strict": true` in tsconfig.json (MANDATORY)
- NO `any` types without explicit justification
- NO `@ts-ignore` without ticket reference
- ALL functions must have JSDoc comments
- Naming: `camelCase` for variables, `PascalCase` for classes

**Python:**
- PEP 8 compliance (flake8 checks)
- Type hints on all functions (mypy strict mode)
- Docstrings for all public functions
- Naming: `snake_case` for functions/variables, `PascalCase` for classes

**Docker:**
- Each service = ONE docker-compose.yml
- MUST expose `/health` endpoint
- MUST include health checks in compose
- Use `172.20.0.0/16` network

**Git Commits:**
- Format: `feat: description` or `fix: description`
- Minimum message length: 10 characters
- Link related issues: `closes #123`

### State Management

**Redis (Cache & Sessions):**
- Cache keys: `{service}:{entity}:{id}`
- TTL: 3600s default (1 hour)
- Session prefix: `session:{session_id}`

**PostgreSQL (Persistence):**
- All permanent data stored here
- Migrations in `./migrations/`
- Schemas defined in SQLAlchemy models
- Connection pooling: 5-20 connections per service

---

## 🏛️ 26-ROOM DOCKER ARCHITECTURE

### High-Level Service Organization

**Total Services:** 18 (expanding to 26 planned)

#### AGENTS (4 services)
- `agent-01-n8n-orchestrator` (port 5678) - Workflow automation
- `agent-03-agentzero` (port 8050) - AI code generation
- `agent-05-steel` (port 3005) - Stealth browser
- `agent-06-skyvern` (port 8030) - Visual automation

#### ROOMS/INFRASTRUCTURE (6+ services)
- `room-00-cloudflared-tunnel` - Cloudflare tunnel access
- `room-02-tresor-vault` (port 8200) - Secrets management
- `room-03-postgres` (port 5432) - Primary database
- `room-04-redis` (port 6379) - Cache layer
- `room-13-api-brain` (port 8000) - FastAPI gateway
- `room-30-scira-ai-search` (port 7890) - Enterprise search

#### SOLVERS/WORKERS (2 services)
- `solver-2.1-survey-worker` (port 8018) - Survey automation
- `builder-1.1-captcha-worker` (port 8019) - CAPTCHA solving

#### MONITORING (5+ services)
- `room-25-prometheus` (port 9090) - Metrics
- `room-26-grafana` (port 3001) - Dashboard
- `room-27-alertmanager` (port 9093) - Alerts
- `room-28-loki` (port 3100) - Logs
- `room-29-jaeger` (port 16686) - Tracing

### Docker Network

**Network:** `sin-solver-network`  
**Subnet:** `172.20.0.0/16`  
**Bridge:** Default Docker bridge

**Service Hostnames (Internal Communication):**
- Services communicate via container name (DNS auto-resolution)
- Example: `postgres:5432` not `172.20.0.3:5432`

### Health Check Pattern

**MANDATORY for ALL services:**

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Health Endpoint Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-30T10:30:00Z"
}
```

---

## 📊 CONTAINER REGISTRY & NETWORKING

### Complete Service Mapping

| Service | Port | Internal IP | Status | Role |
|---------|------|-------------|--------|------|
| **agent-01-n8n** | 5678 | 172.20.0.10 | Active | Workflow Orchestration |
| **agent-03-agentzero** | 8050 | 172.20.0.50 | Active | AI Code Generation |
| **agent-05-steel** | 3005 | 172.20.0.20 | Active | Stealth Browser |
| **agent-06-skyvern** | 8030 | 172.20.0.30 | Active | Visual Automation |
| **room-00-cloudflared** | 7835 | 172.20.0.1 | Active | Cloudflare Tunnel |
| **room-02-vault** | 8200 | 172.20.0.31 | Active | Secrets Management |
| **room-03-postgres** | 5432 | 172.20.0.100 | Active | Primary Database |
| **room-04-redis** | 6379 | 172.20.0.40 | Active | Cache Layer |
| **room-13-api-brain** | 8000 | 172.20.0.60 | Active | API Gateway |
| **room-30-scira-ai-search** | 7890 | 172.20.0.89 | Active | Enterprise Search |
| **solver-2.1-survey-worker** | 8018 | 172.20.0.18 | Active | Survey Automation |
| **builder-1.1-captcha-worker** | 8019 | 172.20.0.19 | Active | CAPTCHA Solving |
| **room-25-prometheus** | 9090 | 172.20.0.90 | Active | Metrics Collection |
| **room-26-grafana** | 3001 | 172.20.0.91 | Active | PRIMARY DASHBOARD |
| **room-27-alertmanager** | 9093 | 172.20.0.92 | Active | Alert Management |
| **room-28-loki** | 3100 | 172.20.0.93 | Active | Log Aggregation |
| **room-29-jaeger** | 16686 | 172.20.0.94 | Active | Distributed Tracing |

### Public Domain Mappings

| Service | Domain | Port | Purpose |
|---------|--------|------|---------|
| **n8n** | n8n.delqhi.com | 443 | Workflow interface |
| **API Brain** | api.delqhi.com | 443 | REST API |
| **Grafana** | grafana.delqhi.com | 443 | Monitoring dashboard |
| **Jaeger** | jaeger.delqhi.com | 443 | Tracing UI |
| **Vault** | vault.delqhi.com | 443 | Secrets access |
| **Search** | search.delqhi.com | 443 | Scira AI search |

*(Configured via Cloudflare tunnel + room-00-cloudflared)*

### Inter-Service Communication Map

```
┌─ External Users (HTTP/REST)
│
├─→ room-13-api-brain:8000 (FastAPI Gateway)
│   │
│   ├─→ agent-01-n8n:5678 (Workflows)
│   ├─→ agent-03-agentzero:8050 (AI Coding)
│   ├─→ agent-05-steel:3005 (Browser)
│   └─→ agent-06-skyvern:8030 (Visual AI)
│       │
│       ├─→ room-03-postgres:5432 (Data)
│       ├─→ room-04-redis:6379 (Cache)
│       ├─→ room-02-vault:8200 (Secrets)
│       └─→ room-30-scira-ai-search:7890 (Search)
│
└─→ Monitoring Stack
    ├─→ room-25-prometheus:9090 (Metrics)
    ├─→ room-26-grafana:3001 (Dashboard)
    ├─→ room-28-loki:3100 (Logs)
    └─→ room-29-jaeger:16686 (Tracing)
```

---

## 🔌 API STANDARDS

### Base URL

```
http://localhost:8000/api/v1
or
https://api.delqhi.com (production)
```

### Authentication

**Method:** JWT Bearer Token  
**Header:** `Authorization: Bearer {token}`  
**Token Location:** `/auth/login` endpoint

### Required Endpoints (ALL Services)

**Health Check:**
```bash
GET /health
# Response:
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-30T10:30:00Z"
}
```

**Stats/Metrics:**
```bash
GET /stats
# Response includes service-specific metrics
```

### Common Response Format

```json
{
  "success": true,
  "data": { /* response body */ },
  "error": null,
  "timestamp": "2024-01-30T10:30:00Z"
}
```

### Error Responses

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Rate Limiting

- **Default:** 1000 requests/hour per IP
- **Header:** `X-RateLimit-Remaining`
- **Exceeded:** 429 Too Many Requests

---

## 🛠️ DEVELOPMENT WORKFLOW

### Setting Up Local Environment

```bash
# 1. Clone the repository
cd /Users/jeremy/dev/SIN-Solver

# 2. Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 4. Copy environment file
cp .env.example .env

# 5. Start Docker services
docker-compose -f docker-compose.yml up -d

# 6. Run migrations
python -m alembic upgrade head

# 7. Verify health
curl http://localhost:8000/health
```

### Building & Testing

**Build TypeScript:**
```bash
npm run build           # TypeScript compilation
npm run type-check      # Type checking only
```

**Running Tests:**
```bash
pytest                  # All tests
pytest tests/test_api.py # Specific file
pytest --cov            # With coverage
pytest -x               # Stop on first failure
```

**Code Quality:**
```bash
make lint               # flake8 + black
mypy .                  # Type checking
black --check .         # Check formatting
```

### Docker Workflow

**Start Services:**
```bash
# Development (smaller footprint)
docker-compose -f docker-compose.yml up -d

# Full enterprise stack
docker-compose -f docker-compose.enterprise.yml up -d
```

**View Logs:**
```bash
docker-compose logs -f agent-01-n8n          # Specific service
docker-compose logs -f --tail=100             # Last 100 lines
```

**Health Check:**
```bash
docker-compose ps                            # Show all status
docker-compose exec room-03-postgres pg_isready -U postgres
```

**Restart Service:**
```bash
docker-compose restart agent-05-steel
docker-compose up -d --no-deps --build agent-06-skyvern
```

---

## 🎯 SPECIAL RULES & PATTERNS

### Docker Container Rules (MANDATORY)

1. **Health Endpoints:** ALL services MUST respond to `/health`
2. **Startup Time:** Maximum 60 seconds to healthy state
3. **Network:** MUST use `sin-solver-network` bridge
4. **Logging:** stdout/stderr (Docker collects automatically)
5. **Signals:** Must gracefully handle SIGTERM (10s timeout)

### CAPTCHA Solver Specifics

**Architecture:**
- Stealth Browser (Steel) → Navigates to CAPTCHA sites
- Vision AI (Gemini/OpenCode FREE) → Recognizes CAPTCHA patterns
- ddddocr → Fallback for text CAPTCHA
- YOLOv8 → Classification for image-based CAPTCHA

**Workflow:**
```
1. User provides target URL with CAPTCHA
2. Steel Browser loads page (stealth mode)
3. Detect CAPTCHA type (hCaptcha, reCAPTCHA, etc.)
4. Route to appropriate solver (Vision AI / YOLOv8 / OCR)
5. Return solution to caller
```

**Model Training:**
```bash
cd /Users/jeremy/dev/SIN-Solver/training
python train_yolo_classifier.py    # Train YOLOv8 on CAPTCHA images
# Output: best.pt model
```

**Key Files:**
- Training config: `/training/data.yaml`
- Training script: `/training/train_yolo_classifier.py`
- Solver code: `/app/tools/captcha_solver.py`
- Training log: `/training/training-lastchanges.md`

### Steel Browser Configuration

**Stealth Mode Features:**
- Headless mode with visible UI option
- Chrome DevTools Protocol (CDP) integration
- Cookie persistence (session management)
- Residential proxy support (optional)
- User-Agent rotation

**Connection:**
```python
from steel import Browser

browser = Browser()
page = browser.get("https://target.com", stealth=True)
```

### CAPTCHA Worker Endpoints

```
GET /health                    # Health check
POST /api/v1/solve            # Solve CAPTCHA
  {
    "url": "https://...",
    "captcha_type": "hcaptcha|recaptcha|image|slider",
    "timeout": 30,
    "retries": 3
  }
POST /api/v1/solve/batch      # Batch solve
GET /api/v1/stats             # Solver statistics
```

---

## 🔧 TROUBLESHOOTING GUIDE

### Service Health Issues

**Symptom:** Service shows "unhealthy" in `docker-compose ps`

**Diagnosis:**
```bash
# Check service logs
docker-compose logs service-name

# Manual health check
curl -X GET http://localhost:PORT/health

# Test connectivity
docker-compose exec service-name curl http://localhost:PORT/health
```

**Solutions:**
- Verify port is not in use: `lsof -i :PORT`
- Check environment variables: `docker-compose config`
- Restart service: `docker-compose restart service-name`
- Check disk space: `df -h`

### Database Connection Errors

**Error:** `psycopg2.OperationalError: could not connect to server`

**Fix:**
```bash
# Verify postgres is running
docker-compose ps room-03-postgres

# Check logs
docker-compose logs room-03-postgres

# Restart postgres
docker-compose restart room-03-postgres

# Wait 10 seconds, then test
sleep 10
docker-compose exec room-03-postgres pg_isready -U postgres
```

### Redis Connection Issues

**Error:** `ConnectionRefusedError: Error 111 connecting to localhost:6379`

**Fix:**
```bash
# Check redis status
docker-compose exec room-04-redis redis-cli ping

# Restart redis
docker-compose restart room-04-redis

# Verify connectivity
docker-compose exec room-04-redis redis-cli -h room-04-redis ping
```

### Steel Browser Not Starting

**Error:** Chrome process fails to start

**Fix:**
```bash
# Check logs
docker-compose logs agent-05-steel

# Verify Chrome is installed in container
docker-compose exec agent-05-steel which chromium

# Restart service
docker-compose restart agent-05-steel
```

### CAPTCHA Model Training Issues

**Error:** `YOLO model training fails at epoch 1`

**Root Cause:** Incorrect data.yaml configuration

**Fix:**
```bash
cd /Users/jeremy/dev/SIN-Solver/training

# Verify data.yaml
cat data.yaml    # Must have: path, nc: 12, train/val paths

# Clean old artifacts
rm -rf training_split/ runs/ .yolo/

# Re-run training
python train_yolo_classifier.py
```

### API Gateway Not Responding

**Error:** `curl: (7) Failed to connect to localhost port 8000`

**Diagnosis:**
```bash
# Check if service is running
docker-compose ps room-13-api-brain

# Check logs for startup errors
docker-compose logs room-13-api-brain

# Verify FastAPI app started correctly
docker-compose logs room-13-api-brain | grep "Uvicorn running"
```

**Fix:**
```bash
# Full restart
docker-compose down room-13-api-brain
docker-compose up -d room-13-api-brain

# Wait for startup (usually 10-15 seconds)
sleep 15
curl http://localhost:8000/health
```

### Common Port Conflicts

**Error:** `Port 5432 already in use`

**Fix:**
```bash
# Find process using port
lsof -i :5432

# Either:
# Option 1: Stop the conflicting process
# Option 2: Change port in docker-compose.yml
```

---

## 📝 SESSION LOG

**Format:** Append-only, chronological record of project changes

### Session Log Template

```
## [YYYY-MM-DD HH:MM] - [Agent/Task ID]

**Observations:**
- [Key discoveries, architectural insights]
- [Code structure analysis]

**Changes Made:**
- [File: change description]
- [Container: configuration update]

**Issues Encountered:**
- [Problem description]
- [Root cause analysis]

**Solutions Implemented:**
- [Fix with code/config examples]

**Next Steps:**
- [Outstanding tasks]
- [Improvements needed]
```

### Latest Session Notes

**Refer to:** `SIN-Solver-lastchanges.md` (main project log)  
**Docker log:** `/Docker/lastchanges.md` (container changes)  
**Training log:** `/training/training-lastchanges.md` (ML model training)

---

## ✅ MANDATE COMPLIANCE CHECKLIST

**MANDATE 0.22 - Vollumfängliches Projekt-Wissen:**
- ✅ Project overview with description and goals
- ✅ Tech stack clearly documented
- ✅ Architecture (26-room distributed system) documented
- ✅ Container naming convention defined
- ✅ Folder structure documented
- ✅ State management (Redis/PostgreSQL) specified
- ✅ Coding standards (TypeScript strict, Python PEP8)
- ✅ API standards documented (JWT, endpoints, responses)
- ✅ Container registry with all 18+ services mapped
- ✅ Health checks and networking documented
- ✅ Development workflow with commands
- ✅ Special rules and CAPTCHA-specific patterns
- ✅ Comprehensive troubleshooting guide
- ✅ Session log references

---

## 🔗 RELATED DOCUMENTATION

- **Main Project:** `/Users/jeremy/dev/SIN-Solver/README.md`
- **Session Changes:** `/Users/jeremy/dev/SIN-Solver/SIN-Solver-lastchanges.md`
- **Docker Changes:** `/Users/jeremy/dev/SIN-Solver/Docker/lastchanges.md`
- **Training Log:** `/Users/jeremy/dev/SIN-Solver/training/training-lastchanges.md`
- **Architecture:** `/Users/jeremy/dev/SIN-Solver/docs/` (documentation directory)
- **Global AGENTS.md:** `/Users/jeremy/.config/opencode/AGENTS.md` (v19.2+)

---

**DOCUMENT STATISTICS:**
- Lines: 600+
- Last Updated: 2026-01-30
- Mandate: MANDATE 0.22 Compliance
- Status: COMPLETE & OPERATIONAL

---

*This document serves as the living knowledge base for the SIN-Solver project. Update this file whenever significant architectural changes, new services, or project insights are discovered. Follow MANDATE 0.22 for complete project knowledge preservation.*
