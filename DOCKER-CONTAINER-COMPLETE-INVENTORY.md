# SIN-Solver Docker Container Inventory
**Complete Reference:** All 17 Running Containers  
**Generated:** 2026-01-28  
**Environment:** Mac M1 (Apple Silicon)  
**Status:** Production Ready

---

## 📊 ÜBERSICHT

| Kategorie | Anzahl | Container |
|-----------|--------|-----------|
| **AGENTS** | 4 | agent-01, agent-03, agent-05, agent-06 |
| **INFRASTRUCTURE** | 5 | room-02-vault, room-02-api, room-03-postgres, room-04-redis, room-06-plugins |
| **ROOMS (UI)** | 5 | room-01-dashboard, room-05-generator, room-09.1-rocketchat, room-16-supabase, room-21-nocodb |
| **STORAGE** | 1 | room-09.2-mongodb |
| **SOLVERS** | 2 | solver-1.1-captcha, solver-2.1-survey |
| **TOTAL** | **17** | All Running |

---

## 🤖 AGENTS (4 Container)

### 1. agent-01-n8n-orchestrator
| Attribut | Details |
|----------|---------|
| **Kategorie** | AGENT |
| **Container Name** | agent-01-n8n-orchestrator |
| **Zweck** | Workflow Automation & Orchestration Engine |
| **Framework** | [n8n](https://n8n.io/) - Open Source Workflow Automation |
| **Version** | n8nio/n8n:latest |
| **Was kann der Container?** | • Visuelle Workflow-Erstellung<br>• 400+ Integrationen (APIs, DBs, Services)<br>• Webhook-Trigger<br>• Scheduled Tasks<br>• Data transformation<br>• Connection to PostgreSQL & Redis |
| **Verbindungen** | → room-03-postgres-master (Database)<br>→ room-04-redis-cache (Queue/Cache)<br>← room-01-dashboard-cockpit (API Calls)<br>← All Agents (Workflow Triggers) |
| **MCP Toolkit** | ❌ Nein (hat eigene API) |
| **Open Ports** | 5678:5678 |
| **Local Port** | 5678 |
| **Status** | ✅ healthy |
| **Health Check** | Node.js net.connect auf Port 5678 |

---

### 2. agent-03-agentzero-coder
| Attribut | Details |
|----------|---------|
| **Kategorie** | AGENT |
| **Container Name** | agent-03-agentzero-coder |
| **Zweck** | AI Code Generation & Development Assistant |
| **Framework** | [Agent Zero](https://github.com/frdel/agent-zero) - Autonomous AI Agent |
| **Version** | frdel/agent-zero:latest |
| **Was kann der Container?** | • Autonomous code generation<br>• Multi-language support (Python, JS, TS, etc.)<br>• Shell command execution<br>• File system operations<br>• Web browsing & research<br>• Terminal integration<br>• Context-aware coding |
| **Verbindungen** | → room-03-postgres-master (Session storage)<br>→ room-04-redis-cache (State management)<br>→ Internet (Research, APIs)<br>→ Local Docker (Container management) |
| **MCP Toolkit** | ✅ Ja (integriert) |
| **Open Ports** | 8050:8000, 22, 80, 9000-9009 |
| **Local Port** | 8050 (extern) → 8000 (intern), 80 (Web UI) |
| **Status** | ✅ healthy |
| **Health Check** | curl http://localhost:80/health |

---

### 3. agent-05-steel-browser
| Attribut | Details |
|----------|---------|
| **Kategorie** | AGENT |
| **Container Name** | agent-05-steel-browser |
| **Zweck** | Stealth Browser Automation with CDP |
| **Framework** | [Steel.dev](https://steel.dev/) - Browser Automation API |
| **Version** | ghcr.io/steel-dev/steel-browser:latest |
| **Was kann der Container?** | • Headless Chrome automation<br>• Stealth mode (anti-detection)<br>• CDP (Chrome DevTools Protocol) access<br>• Session persistence<br>• User agent rotation<br>• Proxy support<br>• Screenshot capture<br>• PDF generation |
| **Verbindungen** | → room-03-postgres-master (Session storage)<br>→ room-04-redis-cache (Cache)<br>→ Internet (Browsing)<br>← agent-06-skyvern-solver (Visual tasks)<br>← solver-1.1-captcha-worker (Captcha solving) |
| **MCP Toolkit** | ✅ Ja (integriert) |
| **Open Ports** | 3005:3000, 9222:9222 |
| **Local Port** | 3005 (API), 9222 (CDP) |
| **Status** | ✅ healthy |
| **Health Check** | curl http://localhost:3000/health |

---

### 4. agent-06-skyvern-solver
| Attribut | Details |
|----------|---------|
| **Kategorie** | AGENT |
| **Container Name** | agent-06-skyvern-solver |
| **Zweck** | Visual Task Automation using AI |
| **Framework** | [Skyvern](https://github.com/Skyvern-AI/skyvern) - AI Browser Agent |
| **Version** | skyvern/skyvern:latest |
| **Was kann der Container?** | • Visual understanding of web pages<br>• AI-powered task completion<br>• Form filling automation<br>• Data extraction<br>• Multi-step workflows<br>• Playwright-based automation<br>• Vision model integration (GPT-4V)<br>• Screenshot analysis |
| **Verbindungen** | → room-03-postgres-master (Task storage)<br>→ room-04-redis-cache (Queue)<br>→ agent-05-steel-browser (Browser control)<br>→ OpenAI/Anthropic APIs (Vision models) |
| **MCP Toolkit** | ✅ Ja (integriert) |
| **Open Ports** | 8030:8000 |
| **Local Port** | 8030 (extern) → 8000 (intern) |
| **Status** | ✅ healthy |
| **Health Check** | curl http://localhost:8000/health |

---

## 🏗️ INFRASTRUCTURE (5 Container)

### 5. room-02-tresor-vault
| Attribut | Details |
|----------|---------|
| **Kategorie** | INFRASTRUCTURE |
| **Container Name** | room-02-tresor-vault |
| **Zweck** | Secrets Management & Encryption |
| **Framework** | [HashiCorp Vault](https://www.vaultproject.io/) - Secrets Management |
| **Version** | hashicorp/vault:latest |
| **Was kann der Container?** | • Secure secrets storage<br>• Key-Value v2 engine<br>• Dynamic secrets<br>• Encryption as a Service<br>• Access policies<br>• Audit logging<br>• Auto-unseal (dev mode)<br>• Token-based authentication |
| **Verbindungen** | → room-02-tresor-api (API access)<br>→ All services (secret injection)<br>← room-03-postgres-master (audit logs optional) |
| **MCP Toolkit** | ❌ Nein (hat Vault API) |
| **Open Ports** | 8200:8200 |
| **Local Port** | 8200 |
| **Status** | ✅ healthy |
| **Health Check** | vault status über HTTP |

---

### 6. room-02-tresor-api
| Attribut | Details |
|----------|---------|
| **Kategorie** | INFRASTRUCTURE |
| **Container Name** | room-02-tresor-api |
| **Zweck** | Vault REST API Wrapper (FastAPI) |
| **Framework** | [FastAPI](https://fastapi.tiangolo.com/) + Python Vault Client |
| **Version** | Custom build (Dockerfile) |
| **Was kann der Container?** | • REST API für Vault Zugriff<br>• Secret CRUD operations<br>• Sync zu Vercel<br>• Sync zu n8n<br>• Health checks<br>• Simplified authentication<br>• Multi-service secret distribution |
| **Verbindungen** | → room-02-tresor-vault (Vault server)<br>→ room-03-postgres-master (credentials)<br>→ agent-01-n8n-orchestrator (sync)<br>→ Vercel API (deployment secrets) |
| **MCP Toolkit** | ❌ Nein (REST API) |
| **Open Ports** | 8201:8201 |
| **Local Port** | 8201 |
| **Status** | ✅ healthy |
| **Health Check** | Python httpx GET /health |

---

### 7. room-03-postgres-master
| Attribut | Details |
|----------|---------|
| **Kategorie** | INFRASTRUCTURE |
| **Container Name** | room-03-postgres-master |
| **Zweck** | Primary Relational Database |
| **Framework** | [PostgreSQL](https://www.postgresql.org/) 15 |
| **Version** | postgres:15-alpine |
| **Was kann der Container?** | • Primary database for all services<br>• n8n workflow storage<br>• Agent session persistence<br>• Vault audit logs<br>• User data storage<br>• Backup & recovery<br>• Connection pooling support<br>• SSL/TLS encryption |
| **Verbindungen** | ← ALL containers (Database reads/writes)<br>→ room-04-redis-cache (query cache optional) |
| **MCP Toolkit** | ❌ Nein |
| **Open Ports** | 5432:5432 |
| **Local Port** | 5432 |
| **Status** | ✅ healthy |
| **Health Check** | pg_isready -U postgres |

---

### 8. room-04-redis-cache
| Attribut | Details |
|----------|---------|
| **Kategorie** | INFRASTRUCTURE |
| **Container Name** | room-04-redis-cache |
| **Zweck** | In-Memory Cache & Session Store |
| **Framework** | [Redis](https://redis.io/) 7 |
| **Version** | redis:7-alpine |
| **Was kann der Container?** | • Session storage<br>• Task queuing<br>• Cache layer<br>• Pub/Sub messaging<br>• Rate limiting<br>• Real-time data<br>• AOF persistence<br>• Password authentication |
| **Verbindungen** | ← ALL agents (Session & cache)<br>← agent-01-n8n (Queue)<br>← room-01-dashboard (Real-time data) |
| **MCP Toolkit** | ❌ Nein |
| **Open Ports** | 6379:6379 |
| **Local Port** | 6379 |
| **Status** | ✅ healthy |
| **Health Check** | redis-cli ping |

---

### 9. room-06-sin-plugins
| Attribut | Details |
|----------|---------|
| **Kategorie** | INFRASTRUCTURE |
| **Container Name** | room-06-sin-plugins |
| **Zweck** | MCP Plugin Server & Tool Registry |
| **Framework** | Custom SIN-Plugins (FastAPI) |
| **Version** | sin-plugins:latest |
| **Was kann der Container?** | • MCP tool registry<br>• Plugin management<br>• Tool discovery<br>• API gateway for plugins<br>• Authentication<br>• Rate limiting<br>• Health monitoring |
| **Verbindungen** | → room-03-postgres-master (Plugin data)<br>→ room-04-redis-cache (Cache)<br>→ All MCP clients (Tool requests) |
| **MCP Toolkit** | ✅ Ja (Haupt-MCP-Server) |
| **Open Ports** | 8040:8000 |
| **Local Port** | 8040 (extern) → 8000 (intern) |
| **Status** | ⚠️ unhealthy (restarting) |
| **Health Check** | curl http://localhost:8000/health |

---

## 🏠 ROOMS / UI SERVICES (5 Container)

### 10. room-01-dashboard-cockpit
| Attribut | Details |
|----------|---------|
| **Kategorie** | ROOMS (UI) |
| **Container Name** | room-01-dashboard-cockpit |
| **Zweck** | Central Management Dashboard |
| **Framework** | [Next.js](https://nextjs.org/) + React + TypeScript |
| **Version** | sin-solver/dashboard:latest |
| **Was kann der Container?** | • Service health monitoring<br>• Real-time status overview<br>• Container management UI<br>• Log aggregation view<br>• Network visualization<br>• Resource usage charts<br>• Alert notifications<br>• Mobile responsive |
| **Verbindungen** | → room-03-postgres-master (Metrics)<br>→ room-04-redis-cache (Real-time data)<br>→ agent-01-n8n-orchestrator (Workflow status)<br>→ All containers (Health checks) |
| **MCP Toolkit** | ❌ Nein (eigene API) |
| **Open Ports** | 3011:3011 |
| **Local Port** | 3011 |
| **Status** | ✅ healthy |
| **Health Check** | curl http://localhost:3011/api/health |

---

### 11. room-05-generator-video
| Attribut | Details |
|----------|---------|
| **Kategorie** | ROOMS (Generator) |
| **Container Name** | room-05-generator-video |
| **Zweck** | Video Generation & Processing |
| **Framework** | [SIN-Video-Gen-MCP](https://github.com/sin-solver/video-gen) - FFmpeg + Python |
| **Version** | sin-video-gen:latest |
| **Was kann der Container?** | • Video from images<br>• Logo/watermark overlay<br>• Subtitle burning (ASS/SRT)<br>• Voice-over (Edge TTS)<br>• Format conversion (16:9, 9:16, etc.)<br>• Text overlay animations<br>• Video trimming<br>• Video merging<br>• Thumbnail generation<br>• Audio extraction |
| **Verbindungen** | → room-03-postgres-master (Video metadata)<br>→ room-04-redis-cache (Queue)<br>→ Internet (TTS download) |
| **MCP Toolkit** | ✅ Ja (integriert) |
| **Open Ports** | 8205:8205 |
| **Local Port** | 8205 |
| **Status** | ✅ healthy |
| **Health Check** | curl http://localhost:8205/health |

---

### 12. room-09.1-rocketchat-app
| Attribut | Details |
|----------|---------|
| **Kategorie** | ROOMS (Chat) |
| **Container Name** | room-09.1-rocketchat-app |
| **Zweck** | Team Communication & Chat Server |
| **Framework** | [Rocket.Chat](https://rocket.chat/) - Open Source Chat Platform |
| **Version** | rocket.chat:latest |
| **Was kann der Container?** | • Team chat & messaging<br>• Channels & private groups<br>• File sharing<br>• Video conferencing<br>• Screen sharing<br>• Mobile apps<br>• Bot integrations<br>• LDAP/SSO authentication |
| **Verbindungen** | → room-09.2-mongodb-storage (Database)<br>→ room-09.5-chat-mcp-server (AI bridge)<br>→ room-04-redis-cache (Session cache) |
| **MCP Toolkit** | ❌ Nein (über room-09.5) |
| **Open Ports** | 3009:3000 |
| **Local Port** | 3009 (extern) → 3000 (intern) |
| **Status** | ⏳ starting |
| **Health Check** | curl http://localhost:3000/api/info |

---

### 13. room-16-supabase-studio
| Attribut | Details |
|----------|---------|
| **Kategorie** | ROOMS (Database UI) |
| **Container Name** | room-16-supabase-studio |
| **Zweck** | Database Management Studio |
| **Framework** | [Supabase](https://supabase.com/) - Open Source Firebase Alternative |
| **Version** | supabase/studio:latest |
| **Was kann der Container?** | • Database table editor<br>• SQL editor<br>• Row-level security management<br>• Real-time subscriptions<br>• API documentation<br>• Auth management<br>• Storage browser<br>• Edge function management |
| **Verbindungen** | → room-03-postgres-master (Direct DB)<br>→ Supabase services (Auth, Storage, Realtime) |
| **MCP Toolkit** | ❌ Nein |
| **Open Ports** | 54323:3000 |
| **Local Port** | 54323 (extern) → 3000 (intern) |
| **Status** | ⚠️ unhealthy |
| **Health Check** | Node.js health check (needs fix) |

---

### 14. room-21-nocodb-ui
| Attribut | Details |
|----------|---------|
| **Kategorie** | ROOMS (Database UI) |
| **Container Name** | room-21-nocodb-ui |
| **Zweck** | No-Code Database Interface |
| **Framework** | [NocoDB](https://nocodb.com/) - Open Source Airtable Alternative |
| **Version** | nocodb/nocodb:latest |
| **Was kann der Container?** | • Spreadsheet-like DB interface<br>• Form views<br>• Gallery views<br>• Kanban views<br>• Calendar views<br>• User access control<br>• API generation<br>• Webhook support<br>• Import/Export (CSV, Excel) |
| **Verbindungen** | → room-03-postgres-master (Direct DB connection)<br>→ Shared data with Supabase |
| **MCP Toolkit** | ❌ Nein |
| **Open Ports** | 8090:8080 |
| **Local Port** | 8090 (extern) → 8080 (intern) |
| **Status** | ✅ healthy |
| **Health Check** | Node.js net.connect auf Port 8080 |

---

## 💾 STORAGE (1 Container)

### 15. room-09.2-mongodb-storage
| Attribut | Details |
|----------|---------|
| **Kategorie** | STORAGE |
| **Container Name** | room-09.2-mongodb-storage |
| **Zweck** | Document Database for Chat |
| **Framework** | [MongoDB](https://www.mongodb.com/) - Document Database |
| **Version** | mongo:latest |
| **Was kann der Container?** | • Chat message storage<br>• User session data<br>• File metadata<br>• Real-time change streams<br>• Sharding support<br>• Replication (optional)<br>• JSON document storage |
| **Verbindungen** | → room-09.1-rocketchat-app (Chat data)<br>→ room-09.5-chat-mcp-server (AI context) |
| **MCP Toolkit** | ❌ Nein |
| **Open Ports** | 27017 |
| **Local Port** | 27017 |
| **Status** | ✅ running (kein healthcheck) |

---

## 🔧 SOLVERS (2 Container)

### 16. solver-1.1-captcha-worker
| Attribut | Details |
|----------|---------|
| **Kategorie** | SOLVER |
| **Container Name** | solver-1.1-captcha-worker |
| **Zweck** | Automated Captcha Solving |
| **Framework** | Custom SIN-Solver + [ddddocr](https://github.com/sml2h3/ddddocr) + Whisper |
| **Version** | sin-solver-zimmer-19-captcha-worker:latest |
| **Was kann der Container?** | • OCR text recognition (ddddocr)<br>• Slider captcha solving<br>• Audio captcha (Whisper STT)<br>• Click target detection<br>• hCaptcha image classification (YOLOv8)<br>• Vision model fallback (Gemini)<br>• Queue-based processing<br>• REST API |
| **Verbindungen** | → room-03-postgres-master (Logs)<br>→ room-04-redis-cache (Queue)<br>→ Gemini API (Vision fallback)<br>← solver-2.1-survey-worker (Captcha requests)<br>← All agents (on-demand solving) |
| **MCP Toolkit** | ✅ Ja (integriert) |
| **Open Ports** | 8019:8000 |
| **Local Port** | 8019 (extern & intern) |
| **Status** | ✅ healthy |
| **Health Check** | curl http://localhost:8019/health |

---

### 17. solver-2.1-survey-worker
| Attribut | Details |
|----------|---------|
| **Kategorie** | SOLVER |
| **Container Name** | solver-2.1-survey-worker |
| **Zweck** | Automated Survey Completion |
| **Framework** | Custom SIN-Solver (Node.js + Playwright) |
| **Version** | sin-solver-zimmer-18-survey-worker:latest |
| **Was kann der Container?** | • Multi-platform support (Swagbucks, Prolific, MTurk, etc.)<br>• AI-powered form filling<br>• Cookie persistence<br>• Proxy rotation<br>• Anti-detection measures<br>• Ban prevention (one worker per platform)<br>• Captcha integration<br>• Browser pool management |
| **Verbindungen** | → room-03-postgres-master (Progress tracking)<br>→ room-04-redis-cache (Session cache)<br>→ agent-05-steel-browser (Stealth browsing)<br>→ solver-1.1-captcha-worker (Captcha solving)<br>→ OpenCode/Gemini APIs (AI decisions) |
| **MCP Toolkit** | ✅ Ja (integriert) |
| **Open Ports** | 8018:8000 |
| **Local Port** | 8018 (extern & intern) |
| **Status** | ✅ healthy |
| **Health Check** | curl http://localhost:8018/health |

---

## 🔗 NETZWERK TOPOLOGIE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SIN-Solver Network Architecture                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        INFRASTRUCTURE LAYER                          │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  room-03-postgres-master  room-04-redis-cache  room-02-tresor-vault │   │
│  │       [PostgreSQL]             [Redis]           [Vault]            │   │
│  │            ▲                      ▲                    ▲            │   │
│  └────────────┼──────────────────────┼────────────────────┼────────────┘   │
│               │                      │                    │                 │
│  ┌────────────┴──────────────────────┴────────────────────┴────────────┐   │
│  │                          SERVICE LAYER                              │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  AGENTS:                                                            │   │
│  │  ├─ agent-01-n8n-orchestrator  [n8n]                               │   │
│  │  ├─ agent-03-agentzero-coder   [Agent Zero]                        │   │
│  │  ├─ agent-05-steel-browser     [Steel Browser]                     │   │
│  │  └─ agent-06-skyvern-solver    [Skyvern]                           │   │
│  │                                                                     │   │
│  │  SOLVERS:                                                           │   │
│  │  ├─ solver-1.1-captcha-worker  [Captcha Solver]                    │   │
│  │  └─ solver-2.1-survey-worker   [Survey Worker]                     │   │
│  │                                                                     │   │
│  │  ROOMS:                                                             │   │
│  │  ├─ room-01-dashboard-cockpit  [Dashboard]                         │   │
│  │  ├─ room-05-generator-video    [Video Gen]                         │   │
│  │  ├─ room-09.1-rocketchat-app  [Rocket.Chat]                      │   │
│  │  ├─ room-16-supabase-studio    [Supabase]                         │   │
│  │  └─ room-21-nocodb-ui          [NocoDB]                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 MCP TOOLKIT ÜBERSICHT

| Container | MCP Integriert | MCP Endpoint | Tools |
|-----------|----------------|--------------|-------|
| agent-03-agentzero-coder | ✅ | http://localhost:8050/mcp | Code generation, shell commands |
| agent-05-steel-browser | ✅ | http://localhost:3005/mcp | Browser automation, CDP |
| agent-06-skyvern-solver | ✅ | http://localhost:8030/mcp | Visual task solving |
| solver-1.1-captcha-worker | ✅ | http://localhost:8019/mcp | Captcha solving |
| solver-2.1-survey-worker | ✅ | http://localhost:8018/mcp | Survey automation |
| room-05-generator-video | ✅ | http://localhost:8205/mcp | Video generation |
| room-06-sin-plugins | ✅ | http://localhost:8040/mcp | Plugin registry |

**Total MCP-Enabled Containers:** 7

---

## 📊 RESOURCE VERWENDUNG

| Container | CPU | Memory | Priority |
|-----------|-----|--------|----------|
| agent-03-agentzero-coder | 2 cores | 4GB | HIGH |
| agent-05-steel-browser | 2 cores | 2GB | HIGH |
| agent-06-skyvern-solver | 2 cores | 2GB | HIGH |
| room-03-postgres-master | 1 core | 1GB | CRITICAL |
| room-04-redis-cache | 0.5 core | 512MB | CRITICAL |
| solver-1.1-captcha-worker | 1 core | 1GB | MEDIUM |
| solver-2.1-survey-worker | 1 core | 1GB | MEDIUM |
| Others | 0.5 core | 512MB | LOW |

**Total Estimated:** ~8-10 CPU cores, ~12GB RAM

---

## 🚀 QUICK REFERENCE

### Alle Container starten
```bash
cd /Users/jeremy/dev/SIN-Solver/Docker
bash startup.sh
```

### Container Status prüfen
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Logs anzeigen
```bash
docker logs <container-name> --tail=50 -f
```

### Health Check testen
```bash
# Agent Zero
curl http://localhost:8050/health

# Captcha Solver
curl http://localhost:8019/health

# Survey Solver
curl http://localhost:8018/health
```

### MCP Endpoint testen
```bash
curl http://localhost:8050/mcp
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-28  
**Generated By:** Sisyphus (Infrastructure Analysis)  
**Next Update:** On container changes
