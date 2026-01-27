# 🏛️ SIN-Solver Microservices Architecture 2026 - Design Document

**Version**: 1.0  
**Status**: WORK IN PROGRESS  
**Created**: 2026-01-27  
**Architecture Pattern**: Event-Driven Microservices + API Gateway (Zimmer-13)  

---

## 🚨 CURRENT STATE vs. DESIRED STATE

### ❌ PROBLEM (Current - AntiPattern)

| Issue | Current | Impact |
|-------|---------|--------|
| **Base Image** | ALL use `node:20-alpine` | No specialization per service |
| **Dockerfile per Service** | ❌ NONE | No reproducibility, no caching |
| **Dependencies** | Volume mounted from HOST | Can break, version conflicts |
| **Build Process** | None - direct volume mount | No layer caching, slow startup |
| **Isolation** | Minimal | Services interfere with each other |
| **Scaling** | Impossible | All 17 services coupled together |
| **Service Discovery** | Hardcoded IPs | No auto-discovery |
| **Credential Management** | Environment variables | No centralized management |

**Total Services**: 24 containers
**Node Services** (problematic): 9 (chronos, opencode, qa, clawdbot, dashboard, evolution, api-brain, worker, mcp)
**Others** (OK): 15 (postgres, redis, n8n, steel, stagehand, qdrant, supabase, serena, etc.)

### ✅ DESIRED STATE (2026 Best Practice)

```
SIN-Solver-Microservices/
├── infrastructure/
│   ├── docker/
│   │   ├── Dockerfile.zimmer-01-n8n              ← Separate per service
│   │   ├── Dockerfile.zimmer-02-chronos
│   │   ├── Dockerfile.zimmer-03-agent-zero
│   │   ├── ... (all 17 Zimmer)
│   │   └── docker-compose.yml                    ← Central orchestration
│   ├── kubernetes/
│   │   ├── deployment-zimmer-01.yaml
│   │   ├── service.yaml
│   │   └── configmap-credentials.yaml
│   └── monitoring/
│       ├── prometheus.yml
│       ├── grafana-dashboards/
│       └── jaeger-config.yml
│
├── services/
│   ├── zimmer-01-n8n/
│   │   ├── Dockerfile                            ← Service-specific
│   │   ├── docker-entrypoint.sh
│   │   ├── .dockerignore
│   │   ├── health-check.js
│   │   └── config/
│   │
│   ├── zimmer-13-api-coordinator/
│   │   ├── Dockerfile                            ← Python FastAPI
│   │   ├── requirements.txt
│   │   ├── src/
│   │   │   ├── main.py                          ← FastAPI app
│   │   │   ├── services/
│   │   │   │   ├── credential_manager.py        ← Credentials
│   │   │   │   ├── service_registry.py          ← Service Discovery
│   │   │   │   ├── api_gateway.py               ← API Gateway
│   │   │   │   └── health_monitor.py            ← Health Checks
│   │   │   ├── models/
│   │   │   │   ├── credential.py
│   │   │   │   ├── service.py
│   │   │   │   └── credential_schema.py
│   │   │   └── routes/
│   │   │       ├── credentials.py               ← /api/credentials/*
│   │   │       ├── services.py                  ← /api/services/*
│   │   │       ├── health.py                    ← /api/health/*
│   │   │       └── gateway.py                   ← /api/gateway/*
│   │   ├── tests/
│   │   └── health-check.sh
│   │
│   ├── zimmer-02-chronos/
│   ├── zimmer-04-opencode/
│   ├── zimmer-08-qa/
│   ├── zimmer-09-clawdbot/
│   ├── zimmer-12-evolution/
│   └── ... (all services with their own structure)
│
└── tests/
    ├── integration/
    └── load-testing/
```

---

## 🏗️ ARCHITECTURE LAYERS

### Layer 0: Foundation (Infrastructure)
```
┌─────────────────────────────────────────────────────────┐
│  Redis (Cache)  │  PostgreSQL (DB)  │  Qdrant (Vector) │
│  6379           │  5432             │  6333            │
└─────────────────────────────────────────────────────────┘
```

### Layer 1: Browser Automation & External Services
```
┌──────────────┬──────────────┬──────────────┬────────────┐
│ Steel        │ Stagehand    │ Agent-Zero   │ Serena-MCP │
│ (Puppeteer)  │ (Playwright) │ (Agentic)    │ (Embedding)│
│ 3000/9222    │ 3007         │ 8050         │ 3000       │
└──────────────┴──────────────┴──────────────┴────────────┘
```

### Layer 2: Core Services (Zimmer 1-17)
```
┌──────────────────────────────────────────────────────────────────┐
│ Management      │ Processing        │ Coordination   │ Interface  │
├──────────────┬──────────────┬──────────────┬──────────────┐
│ n8n (5678)   │ Chronos      │ API Coord    │ Dashboard    │
│ Zimmer-01    │ Zimmer-02    │ Zimmer-13    │ Zimmer-11    │
│              │ (8008)       │ (8031)       │ (3011)       │
│              │              │              │              │
│ OpenCode     │ QA           │ Evolution    │ ClawdBot     │
│ Zimmer-04    │ Zimmer-08    │ Zimmer-12    │ Zimmer-09    │
│ (9000)       │ (8008)       │ (8012)       │ (8009)       │
│              │              │              │              │
│ Surfsense    │ Supabase     │ MCP Plugins  │              │
│ Zimmer-15    │ Zimmer-16    │ Zimmer-17    │              │
│ (6333)       │ (5433)       │ (8040)       │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Layer 3: API Gateway (Zimmer-13 - Central Hub)
```
┌────────────────────────────────────────────────┐
│         ZIMMER-13: API COORDINATOR             │
├────────────────────────────────────────────────┤
│  ├─ /api/credentials/*                         │
│  ├─ /api/services/*                            │
│  ├─ /api/health/*                              │
│  ├─ /api/gateway/*                             │
│  ├─ /api/register (Service Registration)       │
│  └─ /api/discover (Service Discovery)          │
└────────────────────────────────────────────────┘
     │
     ├─→ Credential Manager (Encrypted Storage)
     ├─→ Service Registry (Auto-Discovery)
     ├─→ Health Monitor (Heartbeat)
     └─→ API Router (Smart Routing)
```

---

## 🔐 ZIMMER-13: API Coordinator & Credential Management

### Responsibilities

1. **Credential Management**
   - Centralized credential storage (encrypted)
   - Service-specific credential scoping
   - Credential rotation & versioning
   - Audit logging

2. **Service Registry & Discovery**
   - Auto-register services on startup
   - Service heartbeat monitoring
   - Dynamic routing based on service health
   - Load balancing across instances

3. **API Gateway**
   - Single entry point for all services
   - Request routing & proxying
   - Rate limiting & throttling
   - Request/response logging

4. **Health Monitoring**
   - Periodic health checks on all services
   - Alert on service degradation
   - Auto-recovery triggers

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ZIMMER-13 (API Coordinator)              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FastAPI Application (Python 3.11)                          │
│  ├─ Port 8000 (Internal) / 8031 (Exposed)                  │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │ CREDENTIAL MANAGER                              │        │
│  ├────────────────────────────────────────────────┤        │
│  │ • Encryption: AES-256-GCM                      │        │
│  │ • Storage: PostgreSQL (encrypted column)       │        │
│  │ • Access Control: Per-service scoping          │        │
│  │ • Endpoints:                                   │        │
│  │   - POST   /api/credentials/create             │        │
│  │   - GET    /api/credentials/{id}               │        │
│  │   - PUT    /api/credentials/{id}               │        │
│  │   - DELETE /api/credentials/{id}               │        │
│  │   - GET    /api/credentials/service/{name}     │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │ SERVICE REGISTRY                                │        │
│  ├────────────────────────────────────────────────┤        │
│  │ • Auto-register on service startup             │        │
│  │ • Heartbeat: 30s interval                      │        │
│  │ • Health states: healthy/degraded/offline      │        │
│  │ • Endpoints:                                   │        │
│  │   - POST   /api/services/register              │        │
│  │   - GET    /api/services                       │        │
│  │   - GET    /api/services/{name}/health         │        │
│  │   - DELETE /api/services/{name}                │        │
│  │   - GET    /api/discover (Service Discovery)   │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │ API GATEWAY & ROUTER                            │        │
│  ├────────────────────────────────────────────────┤        │
│  │ • Route incoming requests to services          │        │
│  │ • Load balancing (round-robin)                 │        │
│  │ • Circuit breaker pattern                      │        │
│  │ • Endpoints:                                   │        │
│  │   - POST   /api/gateway/proxy                  │        │
│  │   - GET    /api/gateway/status                 │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │ HEALTH MONITOR                                  │        │
│  ├────────────────────────────────────────────────┤        │
│  │ • Background worker: Check all services every   │        │
│  │   30 seconds                                   │        │
│  │ • Alert thresholds & escalation                │        │
│  │ • Endpoints:                                   │        │
│  │   - GET    /api/health/system                  │        │
│  │   - GET    /api/health/services                │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Stack

```python
# services/zimmer-13-api-coordinator/src/main.py

from fastapi import FastAPI
from fastapi_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine

app = FastAPI(title="Zimmer-13: API Coordinator")

# Database
db = SQLAlchemy(settings.DATABASE_URL)

# Services
from services.credential_manager import CredentialManager
from services.service_registry import ServiceRegistry
from services.api_gateway import APIGateway
from services.health_monitor import HealthMonitor

# Initialize
credential_mgr = CredentialManager(db)
service_registry = ServiceRegistry(db)
api_gateway = APIGateway(service_registry, credential_mgr)
health_monitor = HealthMonitor(service_registry)

# Routes
app.include_router(credentials.router, prefix="/api/credentials")
app.include_router(services.router, prefix="/api/services")
app.include_router(gateway.router, prefix="/api/gateway")
app.include_router(health.router, prefix="/api/health")

# Background tasks
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(health_monitor.periodic_health_check())

# Health endpoint
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now(),
        "version": "1.0.0"
    }
```

---

## 📦 Dockerfile Best Practices (Multi-Stage)

### Example: Zimmer-13 API Coordinator

```dockerfile
# services/zimmer-13-api-coordinator/Dockerfile

# Stage 1: Build
FROM python:3.11-slim as builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application
COPY src/ ./src/
COPY main.py .

# Create non-root user
RUN useradd -m -u 1000 appuser
USER appuser

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Example: Node Service (Zimmer-02 Chronos)

```dockerfile
# services/zimmer-02-chronos/Dockerfile

# Stage 1: Dependencies
FROM node:20-alpine as deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=prod && npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine as runtime
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Non-root user
RUN addgroup -g 1000 appuser && adduser -D -u 1000 -G appuser appuser
USER appuser

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

---

## 🔄 Docker-Compose v3.9 Structure

```yaml
version: '3.9'

services:
  # Foundation Layer
  zimmer-speicher-redis:
    image: redis:7.2-alpine
    # ...

  # API Coordinator (Central Hub)
  zimmer-13-api-koordinator:
    build:
      context: ./services/zimmer-13-api-coordinator
      dockerfile: Dockerfile
    container_name: zimmer-13-api-koordinator
    env_file: .env
    ports:
      - "8031:8000"
    depends_on:
      zimmer-speicher-redis:
        condition: service_healthy
      zimmer-archiv-postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      haus-netzwerk:
        ipv4_address: 172.20.0.31

  # Other services...
```

---

## 📊 Service Communication Pattern

### Service Registration Flow
```
1. Service starts
2. Service calls: POST /api/services/register
   {
     "name": "zimmer-02-chronos",
     "version": "1.0.0",
     "port": 3001,
     "health_endpoint": "/health",
     "credentials_needed": ["api_key", "db_connection"],
     "dependencies": ["zimmer-13-api-koordinator", "zimmer-archiv-postgres"]
   }
3. Zimmer-13 stores in ServiceRegistry
4. Zimmer-13 returns credentials for this service
5. Service uses credentials from response
```

### Service Discovery Flow
```
1. Client needs service: "zimmer-02-chronos"
2. Client calls: GET /api/discover?service=zimmer-02-chronos
3. Zimmer-13 returns:
   {
     "name": "zimmer-02-chronos",
     "address": "172.20.0.2",
     "port": 3001,
     "health": "healthy",
     "load": 0.3
   }
4. Client can now communicate directly or through gateway
```

### Health Check Pattern
```
Every 30 seconds:
1. Zimmer-13 sends GET /health to all registered services
2. Collects responses
3. Updates service health status
4. Triggers alerts if service down
5. Triggers auto-recovery if threshold exceeded
```

---

## 🎯 Migration Strategy

### Phase 1: Preparation (Today)
- [ ] Create `services/` directory structure
- [ ] Audit all existing services & document current functionality
- [ ] Design Dockerfile for each service type

### Phase 2: Build (This Week)
- [ ] Build Dockerfile for Zimmer-13 (Priority 1)
- [ ] Build Dockerfiles for critical services (n8n, steel, dashboard)
- [ ] Build Dockerfiles for processing services (chronos, qa, evolution)
- [ ] Build Dockerfiles for utility services (opencode, clawdbot, mcp)

### Phase 3: Test (This Week)
- [ ] Test docker-compose with new Dockerfiles
- [ ] Verify all health checks
- [ ] Load testing (5+ simultaneous requests)
- [ ] Credential management testing

### Phase 4: Deploy (Next Week)
- [ ] Deploy to staging environment
- [ ] Run integration tests
- [ ] Deploy to production
- [ ] Monitor & optimize

---

## 📈 Benefits of This Architecture

| Benefit | Current | After Migration |
|---------|---------|-----------------|
| **Reproducibility** | ❌ No | ✅ Yes (Dockerfile) |
| **Scaling** | ❌ No | ✅ Yes (horizontal) |
| **Dependency Management** | ❌ Manual | ✅ Automatic |
| **Build Caching** | ❌ None | ✅ Layer caching |
| **Service Isolation** | ❌ Low | ✅ High |
| **Deployment Speed** | ❌ Slow | ✅ Fast |
| **Credential Security** | ⚠️ ENV vars | ✅ Encrypted |
| **Service Discovery** | ❌ Hardcoded | ✅ Automatic |
| **Health Monitoring** | ⚠️ Manual | ✅ Automatic |
| **Load Balancing** | ❌ No | ✅ Yes |

---

## 🔒 Security Considerations

1. **Secrets Management**
   - Use Zimmer-13 for all credentials
   - Encrypt at rest (AES-256-GCM)
   - Encrypt in transit (TLS 1.3)
   - Audit all access

2. **Network Security**
   - Internal network only (172.20.0.0/16)
   - Services behind API Gateway
   - Rate limiting per service
   - IP whitelisting for critical services

3. **Container Security**
   - Non-root users in all Dockerfiles
   - Minimal base images (alpine, slim)
   - No secrets in environment (use Zimmer-13)
   - Regular image scanning for vulnerabilities

---

## 📚 Documentation Needed

1. `DOCKERFILE_GUIDE.md` - How to write Dockerfiles for each service type
2. `SERVICE_API.md` - Complete API documentation for all 17 services
3. `DEPLOYMENT_RUNBOOK.md` - Step-by-step deployment procedures
4. `TROUBLESHOOTING.md` - Common issues and solutions
5. `PERFORMANCE_TUNING.md` - Optimization guidelines

---

## ✅ Success Criteria

- [ ] All 17 services have custom Dockerfiles
- [ ] All Dockerfiles follow multi-stage pattern
- [ ] All services register with Zimmer-13 on startup
- [ ] All services support health checks
- [ ] Credential management 100% via Zimmer-13
- [ ] docker-compose.yml builds and runs all services
- [ ] Load test: 100 concurrent requests, 0 failures
- [ ] Documentation: 100% coverage

---

**Next Steps**: Start with Task `arch-design` to design Dockerfile templates and Zimmer-13 implementation.

