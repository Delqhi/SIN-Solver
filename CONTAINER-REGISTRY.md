# 🏢 SIN-SOLVER CONTAINER REGISTRY (STRICT NAMING CONVENTION)

**Format:** `{CATEGORY}-{NUMBER}-{INTEGRATION}-{ROLE}`  
**Location:** `/Users/jeremy/dev/Delqhi-Platform/CONTAINER-REGISTRY.md`  
**Last Updated:** 2026-01-29

---

## 🚨 NAMING CONVENTION (ABSOLUTE LAW)

```
{CATEGORY}-{NUMBER}-{INTEGRATION}-{ROLE}
     │        │          │          │
     │        │          │          └── Functional role (vault, api, brain, solver, etc.)
     │        │          └── Technology/Project (postgres, redis, n8n, steel, skyvern)
     │        └── Unique ID (01-99, can use decimals like 20.5)
     └── Category (agent, room, solver, builder, cloud)
```

### Categories
- **`agent-XX`** = AI Workers, Orchestrators, Automation Tools
- **`room-XX`** = Infrastructure, Databases, Storage, Interfaces
- **`solver-X.X`** = Money-Making Workers (Captcha, Survey)
- **`builder-X`** = Content Creation Workers
- **`cloud-XX`** = External Tunnels, CDN

---

## 📋 OFFICIAL CONTAINER MASTER LIST

### AGENTS (AI Workers)

| Container Name | Service | Port | Purpose | Status |
|----------------|---------|------|---------|--------|
| `agent-01-n8n-orchestrator` | n8n | 5678 | Workflow Automation | ✅ Active |
| `agent-04-opencode-secretary` | Custom | 9004 | OpenCode Integration | ✅ Active |
| `agent-05-steel-browser` | Steel | 3000 | Stealth Browser CDP | ✅ Active |
| `agent-06-skyvern-solver` | Skyvern | 8030 | Visual AI Automation | ✅ Active |
| `agent-08-playwright-tester` | Playwright | 8080 | QA Testing Service | ✅ Active |
| `agent-09-clawdbot-messenger` | Node.js | 8004 | Social Media Bots | ✅ Active |
| `agent-12-system-optimizer` | Node.js | 8007 | Performance Optimization | ✅ Active |

### ROOMS (Infrastructure & Interfaces)

| Container Name | Service | Port | Purpose | Status |
|----------------|---------|------|---------|--------|
| `room-00-cloudflared-tunnel` | cloudflared | - | Cloudflare Tunnel | ✅ Active |
| `room-01-dashboard-cockpit` | Next.js | 3011 | Main Dashboard UI | ✅ Active |
| `room-02-tresor-vault` | HashiCorp Vault | 8200 | Secrets Management | ✅ Active |
| `room-02-tresor-api` | FastAPI | 8002 | Vault Integration + Sync | ✅ Active |
| `room-03-postgres-master` | PostgreSQL | 5432 | Main Database | ✅ Active |
| `room-04-redis-cache` | Redis | 6379 | Cache & Sessions | ✅ Active |
| `room-10-postgres-knowledge` | PostgreSQL | - | Knowledge Base | ✅ Active |
| `room-11-plane-mcp` | FastAPI | 8216 | Project Management (Plane) | ✅ Active |
| `room-13-api-brain` | FastAPI | 8000 | API Gateway/Brain | ✅ Active |

### SOLVERS (Money Workers)

| Container Name | Service | Port | Purpose | Status |
|----------------|---------|------|---------|--------|
| `solver-14-worker-automation` | Node.js | 8080 | Task Automation | ✅ Active |
| `solver-18-survey-worker` | Python | 8018 | Survey Automation | ⏳ Planned |
| `solver-19-captcha-worker` | Python | 8019 | CAPTCHA Solving | 🔄 Migrating to builder-1.1 |
| `solver-20-website-worker` | Node.js | 8020 | Website Tasks | ⏳ Planned |

### BUILDERS (Content & Solver Workers)

| Container Name | Service | Port | Purpose | Status |
|----------------|---------|------|---------|--------|
| `builder-1.1-captcha-worker` | Python/FastAPI | 8019 | Multi-AI CAPTCHA Solver | 🆕 NEW - Best Practices 2026 |
| `builder-1.1-captcha-worker` | | | • Mistral Pixtral 12B Vision | |
| `builder-1.1-captcha-worker` | | | • Qwen3-VL 8B Local (Ollama) | |
| `builder-1.1-captcha-worker` | | | • Kimi k2.5 Veto/Joker | |
| `builder-1.1-captcha-worker` | | | • Steel Browser Integration | |
| `builder-1.1-captcha-worker` | | | • Rate Limiting: 20/min | |

### MCP SERVICES (Room 20.x Series)

| Container Name | Service | Port | Purpose | Status |
|----------------|---------|------|---------|--------|
| `room-20.3-sin-social-mcp` | Python | 8203 | Social Media MCP | ✅ Active |
| `room-20.4-sin-research-mcp` | Python | 8204 | Deep Research MCP | ✅ Active |
| `room-20.5-sin-video-mcp` | Python | 8205 | Video Gen MCP | ✅ Active |
| `room-30-scira-ai-search` | Next.js | 8230 | AI Search Engine (Scira) | ✅ Active |

---

## 🔍 CRITICAL DISTINCTIONS

### Vault vs API Brain - THREE DISTINCT SERVICES

Diese 3 Services haben **verschiedene Aufgaben** und sind alle NOTWENDIG:

**1️⃣ `room-02-tresor-vault`** (Port 8200)
- **HashiCorp Vault** (offizielles Docker Image)
- **Nur Storage** - Speichert Secrets verschlüsselt
- **Keine Integration** - Nur CRUD-API
- Wird von `room-02-tresor-api` angesprochen
- Intern: `http://room-02-tresor-vault:8200`

**2️⃣ `room-02-tresor-api`** (Port 8002) ⚠️ **WICHTIG - NICHT LÖSCHEN!**
- **Integration Layer** - Verbindet Vault mit externen Systemen
- **Vercel Sync** - Secrets → Vercel Environment Variables (auto)
- **n8n Sync** - Vault → n8n Credentials (auto)
- **Agent Secrets** - `/api/agent-secrets/:agentName` Endpoint
- **Secret Rotation** - Automatische Rotation mit Sync
- **Route:** `/api/secrets/{path}`, `/api/sync/*`
- **Warum wichtig:** Ohne das kein Auto-Deployment zu Vercel!

**3️⃣ `room-13-api-brain`** (Port 8000)
- **HAUPT API Gateway** - Koordiniert ALLE Services
- **Business Logic** - Workflows, Orchestration, Routing
- **Authentication** - JWT, API Keys, Rate Limiting
- **Health Monitoring** - Status aller Services
- Wird von Dashboard, Agents, externen Requests genutzt
- **NICHT für Secrets** - Nutzt room-02-tresor-api für Secrets

---

## 🚨 COMMON MISTAKES (DO NOT REPEAT)

| ❌ Wrong | ✅ Correct | Why |
|----------|-----------|-----|
| `room-02-tresor-secrets` | `room-02-tresor-vault` | Must end with role `-vault` |
| `room-13-vault-api` | `room-13-api-brain` | It's the brain, not vault |
| `vault` | `room-02-tresor-vault` | Missing category/number |
| `api` | `room-13-api-brain` | Missing category/number/role |
| `n8n` | `agent-01-n8n-orchestrator` | Missing category/number/role |
| `steel` | `agent-05-steel-browser` | Missing category/number/role |

---

## 📝 ADDING NEW CONTAINERS

1. **Check this registry first** - Ensure number is unique
2. **Follow the format** - `{CATEGORY}-{NUMBER}-{INTEGRATION}-{ROLE}`
3. **Use existing numbers** - If replacing, use same number
4. **Document here** - Add to table immediately
5. **Update references** - Search & replace in ALL files

### Available Numbers (Next Free)
- Agents: 02, 03, 07, 08, 09, 10, 11, 12...
- Rooms: 05, 06, 07, 08, 09, 11, 12...
- Solvers: 15, 16, 17...
- MCPs: 20.6, 20.7...

---

## 🔧 VERIFICATION CHECKLIST

Before committing container changes:

- [ ] Name follows `{CATEGORY}-{NUMBER}-{INTEGRATION}-{ROLE}`
- [ ] `container_name` matches service name
- [ ] Number is unique (check this registry)
- [ ] All references updated in docker-compose.yml
- [ ] Cloudflare config updated (if public)
- [ ] Environment variables use correct names
- [ ] depends_on uses correct names
- [ ] Dashboard API updated
- [ ] This registry updated

---

## 🌐 PUBLIC DOMAIN MAPPING

| Subdomain | Container | Port |
|-----------|-----------|------|
| `dashboard.delqhi.com` | room-01-dashboard-cockpit | 3011 |
| `vault.delqhi.com` | room-02-tresor-vault | 8200 (UI) |
| `vault-api.delqhi.com` | room-02-tresor-api | 8002 (Integration) |
| `api.delqhi.com` | room-13-api-brain | 8000 |
| `n8n.delqhi.com` | agent-01-n8n-orchestrator | 5678 |
| `steel.delqhi.com` | agent-05-steel-browser | 3000 |
| `skyvern.delqhi.com` | agent-06-skyvern-solver | 8030 |
| `plane.delqhi.com` | room-11-plane-mcp | 8216 |

---

## 🔧 CONTAINER FUNCTIONS & CAPABILITIES

Detaillierte Übersicht aller Funktionen für jeden Container:

---

### 🤖 AGENTS (AI Workers)

#### `agent-01-n8n-orchestrator` (Port 5678)
**Primäre Funktion:** Workflow Automation Engine

**Wichtige Features:**
- 🔄 **Workflow Editor** - Visueller Drag-and-Drop Editor
- 📊 **Workflow Execution** - Automatische Ausführung von Workflows
- 🔌 **200+ Integrations** - APIs, Datenbanken, AI Services
- 🕐 **Scheduling** - Cron-ähnliche Zeitplanung
- 📧 **Webhook Support** - Externe Trigger via HTTP
- 🔐 **Credential Management** - Sichere Speicherung von API Keys
- 📈 **Execution Logs** - Detaillierte Workflow-Historie

**Wichtige Endpoints:**
- `http://localhost:5678` - Web UI
- `POST /api/v1/workflows` - Workflow erstellen
- `POST /api/v1/workflows/:id/execute` - Workflow ausführen
- `GET /api/v1/executions` - Ausführungs-Logs

**Verbindungen:**
- Nutzt: `room-02-tresor-api` (Secrets)
- Nutzt: `room-03-postgres-master` (Workflow-Daten)
- Nutzt: `room-04-redis-cache` (Queue)

---

#### `agent-04-opencode-secretary` (Port 9004)
**Primäre Funktion:** OpenCode AI Integration & Coding Assistant

**Wichtige Features:**
- 💻 **Code Generation** - AI-gestützte Code-Erstellung
- 🔄 **Multi-Model Support** - Gemini, Claude, Mistral
- 🌐 **Web Research** - DuckDuckGo Integration
- 🧠 **Memory System** - Kontext-Awareness über Sessions
- 🔍 **Code Review** - Automatische Code-Analyse
- 📋 **Task Management** - Todo-Integration
- 💬 **Chat Interface** - Konversationelle AI

**Wichtige Endpoints:**
- `http://localhost:9004` - Web UI
- `POST /api/code` - Code generieren
- `POST /api/chat` - Chat-Konversation
- `GET /api/models` - Verfügbare Modelle

**Verbindungen:**
- Nutzt: Externe AI APIs (OpenCode, Antigravity)
- Speichert: Sessions in `room-04-redis-cache`

---

#### `agent-05-steel-browser` (Port 3000 + 9222)
**Primäre Funktion:** Stealth Browser Automation

**Wichtige Features:**
- 🕵️ **Stealth Mode** - Unauffälliges Browser-Verhalten
- 🧬 **Fingerprint Randomization** - TLS JA3, Canvas, WebGL
- 🎭 **Human-like Behavior** - Natürliche Mausbewegungen
- 🍪 **Session Management** - Cookie & LocalStorage Persistenz
- 🌍 **Proxy Support** - Residential & Datacenter Proxies
- 📱 **CDP Interface** - Chrome DevTools Protocol (Port 9222)
- 🔄 **Concurrent Sessions** - Mehrere Browser gleichzeitig

**Wichtige Endpoints:**
- `http://localhost:3000` - Steel API
- `ws://localhost:9222` - Chrome DevTools Protocol
- `GET /v1/sessions` - Aktive Sessions
- `POST /v1/sessions` - Neue Session erstellen

**Verwendung für:**
- CAPTCHA Solving (menschliches Verhalten simulieren)
- Web Scraping (nicht blockierbar)
- Automation (stealth)
- Testing (realistische User-Simulation)

**Verbindungen:**
- Wird genutzt von: `solver-19-captcha-worker`
- Wird genutzt von: `agent-06-skyvern-solver`

---

#### `agent-06-skyvern-solver` (Port 8030)
**Primäre Funktion:** Visual AI Automation (Browser Tasks)

**Wichtige Features:**
- 👁️ **Computer Vision** - Sieht und versteht Webseiten
- 🧠 **LLM Integration** - Nutzt GPT-4V, Gemini Pro Vision
- 🎯 **Goal-Oriented** - Führt komplexe Tasks autonom aus
- 📝 **Self-Healing** - Passt sich an Webseiten-Änderungen an
- 🔍 **Element Detection** - Findet Buttons, Formulare, Links
- 🌐 **Multi-Step Workflows** - Kann komplexe Prozesse durchführen

**Wichtige Endpoints:**
- `http://localhost:8030` - Skyvern API
- `POST /api/v1/tasks` - Task erstellen
- `GET /api/v1/tasks/:id` - Task-Status
- `GET /api/v1/tasks/:id/screenshots` - Screenshots des Tasks

**Beispiel Tasks:**
- "Fülle das Registrierungsformular aus"
- "Füge Produkt X zum Warenkorb hinzu"
- "Extrahiere alle Preise von dieser Seite"

**Verbindungen:**
- Nutzt: `agent-05-steel-browser` (CDP für Browser)
- Nutzt: Externe Vision APIs (OpenAI, Google)

---

### 🏢 ROOMS (Infrastructure & Interfaces)

#### `room-00-cloudflared-tunnel` (Port -)
**Primäre Funktion:** Public Domain Access (Cloudflare Tunnel)

**Wichtige Features:**
- 🌐 **Public URLs** - Exponiert interne Services nach außen
- 🔒 **Zero Trust** - Authentifizierung via Cloudflare
- 📝 **SSL/TLS** - Automatische HTTPS-Zertifikate
- 🚫 **DDoS Protection** - Cloudflare Schutz
- 🎯 **Custom Domains** - *.delqhi.com Subdomains
- 📊 **Analytics** - Traffic Monitoring

**Exposed Services (via *.delqhi.com):**
- `dashboard.delqhi.com` → room-01-dashboard-cockpit:3011
- `n8n.delqhi.com` → agent-01-n8n-orchestrator:5678
- `vault.delqhi.com` → room-02-tresor-vault:8200
- `api.delqhi.com` → room-13-api-brain:8000
- `steel.delqhi.com` → agent-05-steel-browser:3000
- `skyvern.delqhi.com` → agent-06-skyvern-solver:8030
- `plane.delqhi.com` → room-11-plane-mcp:8216

**Konfiguration:**
- Config: `infrastructure/cloudflare/config.yml`
- Credentials: `infrastructure/cloudflare/credentials.json`
- Token: Via `CLOUDFLARE_TUNNEL_TOKEN` Environment Variable

---

#### `room-01-dashboard-cockpit` (Port 3011)
**Primäre Funktion:** Central Web Dashboard (Mission Control)

**Wichtige Features:**
- 📊 **System Overview** - Status aller Container
- 🎛️ **Container Control** - Start/Stop/Restart Services
- 📈 **Real-time Metrics** - CPU, RAM, Network Usage
- 📝 **Log Streaming** - Live Logs aller Services
- 🔐 **Authentication** - User Login & Sessions
- 🔔 **Notifications** - Alerts bei Problemen
- 📱 **Responsive Design** - Mobile-freundlich

**Wichtige Pages:**
- `/` - Dashboard Overview
- `/services` - Container Management
- `/logs` - Log Viewer
- `/metrics` - Performance Charts
- `/vault` - Secrets Management UI

**Verbindungen:**
- Nutzt: Docker API (für Container Management)
- Nutzt: `room-13-api-brain` (Daten & Auth)
- Nutzt: `room-04-redis-cache` (Sessions)

---

#### `room-02-tresor-vault` (Port 8200)
**Primäre Funktion:** Secret Storage (HashiCorp Vault)

**Wichtige Features:**
- 🔐 **Encryption at Rest** - AES-256 Verschlüsselung
- 🔑 **Dynamic Secrets** - Automatisch generierte Credentials
- 🔄 **Secret Rotation** - Automatische Schlüssel-Erneuerung
- 📜 **Audit Logging** - Jeder Zugriff wird protokolliert
- 🏢 **Multi-Tenancy** - Isolierte Secret-Pfade
- 🛡️ **Access Control** - Granulare Berechtigungen
- 🔌 **Multiple Backends** - Database, AWS, GCP, etc.

**Wichtige Endpoints:**
- `http://localhost:8200/ui` - Vault Web UI
- `GET /v1/sys/health` - Health Check
- `POST /v1/auth/token/create` - Token erstellen
- `GET /v1/secret/data/:path` - Secret lesen
- `POST /v1/secret/data/:path` - Secret schreiben

**Verwendung für:**
- API Keys (OpenAI, Google, etc.)
- Database Credentials (Postgres, Redis)
- Service Account Keys
- Encryption Keys
- Zertifikate

**Zugriff:**
- Nur intern via Docker Network
- Wird angesprochen von: `room-02-tresor-api`
- NICHT direkt von anderen Services!

---

#### `room-02-tresor-api` (Port 8002)
**Primäre Funktion:** Vault Integration Layer

**Wichtige Features:**
- 🔗 **Vault Proxy** - Vereinfachter Zugriff auf Vault
- 🔄 **Auto-Sync Vercel** - Secrets → Vercel Environment
- 🔌 **Auto-Sync n8n** - Vault → n8n Credentials
- 🎯 **Agent Endpoints** - `/api/agent-secrets/:agent`
- 📝 **Secret Rotation** - Automatische Rotation + Sync
- 📊 **Sync Status** - Überwachung aller Sync-Vorgänge

**Wichtige Endpoints:**
- `GET /health` - Health Check
- `GET /api/secrets?path=secret/` - Alle Secrets listen
- `GET /api/secrets/:path` - Spezifisches Secret lesen
- `POST /api/secrets/:path` - Secret erstellen/updatern
- `DELETE /api/secrets/:path` - Secret löschen
- `POST /api/sync/vercel` - Zu Vercel syncen
- `POST /api/sync/n8n` - Zu n8n syncen
- `POST /api/sync/all` - Zu allen Systemen syncen
- `GET /api/agent-secrets/:agentName` - Agent Secrets holen

**Beispiel - Secret erstellen + Auto-Sync:**
```json
POST /api/secrets/databases/postgres
{
  "data": {
    "host": "localhost",
    "port": "5432",
    "username": "admin",
    "password": "secret123"
  },
  "sync": {
    "vercel": true,
    "vercelEnvs": ["production", "preview"],
    "n8n": true,
    "n8nCredType": "postgres"
  }
}
```

**Verbindungen:**
- Schreibt in: `room-02-tresor-vault`
- Sync zu: Vercel API (extern)
- Sync zu: `agent-01-n8n-orchestrator`

---

#### `room-03-postgres-master` (Port 5432)
**Primäre Funktion:** Haupt-Datenbank (PostgreSQL)

**Wichtige Features:**
- 🗄️ **Relational Database** - SQL mit ACID-Compliance
- 📊 **Multiple Databases** - Eine Instanz, viele DBs
- 🔐 **SSL/TLS** - Verschlüsselte Verbindungen
- 💾 **Backups** - Automatische Backups
- 📈 **High Performance** - Query Optimization
- 🔌 **Extensions** - PostGIS, pgvector, etc.

**Datenbanken:**
- `sin_solver_production` - Haupt-App Daten
- `n8n` - Workflow Daten
- Weitere können erstellt werden

**Verbindungen:**
- Wird genutzt von: `room-13-api-brain`
- Wird genutzt von: `agent-01-n8n-orchestrator`
- Wird genutzt von: `room-01-dashboard-cockpit`
- Wird genutzt von: Fast alle Services!

---

#### `room-04-redis-cache` (Port 6379)
**Primäre Funktion:** Cache & Session Store

**Wichtige Features:**
- ⚡ **In-Memory Storage** - Extrem schnell (sub-millisecond)
- 🗝️ **Key-Value Store** - Einfache Datenstruktur
- ⏱️ **TTL Support** - Automatisches Ablaufen
- 📊 **Pub/Sub** - Real-time Messaging
- 🔄 **Sessions** - User Session Speicherung
- 📝 **Caching** - API Response Caching

**Verwendung für:**
- User Sessions (Login-Status)
- API Rate Limiting
- Cache für langsame Queries
- Real-time Notifications (Pub/Sub)
- Task Queues (z.B. für n8n)

**Verbindungen:**
- Wird genutzt von: `room-13-api-brain` (Sessions)
- Wird genutzt von: `room-01-dashboard-cockpit` (Cache)
- Wird genutzt von: `agent-01-n8n-orchestrator` (Queue)

---

#### `room-13-api-brain` (Port 8000)
**Primäre Funktion:** Haupt API Gateway & Koordinator

**Wichtige Features:**
- 🌐 **API Gateway** - Zentrale API für alle Services
- 🔐 **Authentication** - JWT, API Keys, OAuth
- 🛡️ **Authorization** - RBAC (Role-Based Access Control)
- 📊 **Rate Limiting** - Schutz vor Überlastung
- 📝 **Request Logging** - Audit Trail
- 🔄 **Service Routing** - Weiterleitung zu internen Services
- 📈 **Health Monitoring** - Status aller Services
- 🎯 **Business Logic** - Workflows, Orchestration

**Wichtige Endpoints:**
- `GET /health` - Health Check
- `GET /api/status` - System Status aller Services
- `POST /api/auth/login` - User Login
- `POST /api/auth/register` - User Registration
- `GET /api/services` - Liste aller Services
- `POST /api/workflows` - Workflow erstellen
- `GET /api/metrics` - System-Metriken

**Verbindungen:**
- Nutzt: `room-03-postgres-master` (Daten)
- Nutzt: `room-04-redis-cache` (Sessions)
- Nutzt: `room-02-tresor-api` (Secrets)
- Leitet weiter an: Alle anderen Services

---

### 💰 SOLVERS (Money Workers)

#### `solver-14-worker-automation` (Port 8080)
**Primäre Funktion:** Automatisierung von Online-Tasks

**Wichtige Features:**
- 🔄 **Task Queue** - Redis-basierte Auftragsverarbeitung
- 🤖 **Multi-Platform** - Swagbucks, Prolific, etc.
- 🌐 **Browser Automation** - Steel Browser Integration
- 🔐 **Session Management** - Cookie Persistence
- 🎯 **Captcha Solving** - Integration mit Captcha Worker
- 📊 **Progress Tracking** - Task-Fortschritt
- 💾 **Result Storage** - Ergebnisse in Datenbank

**Verwendung für:**
- Automatisierte Umfragen
- Micro-Task Automation
- Formular-Ausfüllung
- Data Entry Tasks

**Verbindungen:**
- Nutzt: `room-04-redis-cache` (Task Queue)
- Nutzt: `room-03-postgres-master` (Ergebnisse)
- Nutzt: `agent-05-steel-browser` (Browser)
- Nutzt: `solver-19-captcha-worker` (Captcha Solving)

---

## 📊 QUICK REFERENCE: "Welcher Container für was?"

| Wenn du das brauchst... | Nutze diesen Container |
|------------------------|------------------------|
| Workflows automatisieren | `agent-01-n8n-orchestrator` |
| Code schreiben lassen | `agent-04-opencode-secretary` |
| Unauffällig browsen | `agent-05-steel-browser` |
| Visuelle AI-Automation | `agent-06-skyvern-solver` |
| Übersicht über alles | `room-01-dashboard-cockpit` |
| Secrets speichern | `room-02-tresor-vault` |
| Secrets zu Vercel/n8n syncen | `room-02-tresor-api` |
| Haupt-API verwenden | `room-13-api-brain` |
| Datenbank-Zugriff | `room-03-postgres-master` |
| Sessions/Caching | `room-04-redis-cache` |
| Öffentliche URLs | `room-00-cloudflared-tunnel` |
| Umfragen automatisch ausfüllen | `solver-14-worker-automation` |

---

## 🔍 Troubleshooting: "Welcher Container ist down?"

Wenn ein Feature nicht funktioniert, prüfe diese Kette:

**Dashboard zeigt nichts an:**
1. `room-01-dashboard-cockpit` läuft?
2. `room-13-api-brain` läuft?
3. `room-03-postgres-master` läuft?

**Secrets können nicht gespeichert werden:**
1. `room-02-tresor-vault` läuft?
2. `room-02-tresor-api` läuft?
3. Vault initialisiert? (`vault status`)

**Workflows werden nicht ausgeführt:**
1. `agent-01-n8n-orchestrator` läuft?
2. `room-04-redis-cache` läuft?
3. Credentials in n8n vorhanden?

**Browser-Automation fehlschlägt:**
1. `agent-05-steel-browser` läuft?
2. Genug RAM verfügbar?
3. Proxy konfiguriert?

---

**⚠️ WARNING:** Any deviation from this registry without updating this document is a **naming violation**. All future container names MUST be registered here FIRST.

---

## 🔌 MCP SERVICES (Model Context Protocol)

All MCP services for OpenCode integration:

### Active MCPs (14 total)

| MCP Name | Type | Command/URL | Environment Variables | Status |
|----------|------|-------------|----------------------|--------|
| **serena** | local | `uvx --from git+https://github.com/oraios/serena serena start-mcp-server` | - | ✅ Enabled |
| **tavily** | local | `npx -y @tavily/claude-mcp` | `TAVILY_API_KEY` | ✅ Enabled |
| **context7** | local | `npx -y @anthropics/context7-mcp` | - | ✅ Enabled |
| **skyvern** | local | `/usr/bin/python3 -m skyvern.mcp.server` | - | ✅ Enabled |
| **linear** | remote | `https://mcp.linear.app/sse` | - | ✅ Enabled |
| **gh_grep** | remote | `https://mcp.grep.app` | - | ✅ Enabled |
| **grep_app** | remote | `https://mcp.grep.app` | - | ✅ Enabled |
| **websearch** | local | `npx -y @tavily/claude-mcp` | `TAVILY_API_KEY` | ✅ Enabled |
| **plane** | local | `node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/plane-mcp-wrapper.js` | `PLANE_API_URL`, `PLANE_API_KEY` | ✅ Enabled |
| **captcha** | local | `node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js` | `CAPTCHA_API_URL`, `CAPTCHA_API_KEY` | ✅ Enabled |
| **sin-deep-research** | local | `node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-deep-research-mcp-wrapper.js` | `SIN_RESEARCH_API_URL`, `SIN_RESEARCH_API_KEY` | ✅ Enabled |
| **sin-social** | local | `node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-social-mcp-wrapper.js` | `SIN_SOCIAL_API_URL`, `SIN_SOCIAL_API_KEY` | ✅ Enabled |
| **sin-video-gen** | local | `node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-video-gen-mcp-wrapper.js` | `SIN_VIDEO_API_URL`, `SIN_VIDEO_API_KEY` | ✅ Enabled |
| **scira** | local | `node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/scira-mcp-wrapper.js` | `SCIRA_API_URL`, `SCIRA_API_KEY`, `REQUEST_TIMEOUT` | ✅ Enabled |

### Disabled MCPs (4 total)

| MCP Name | Type | Reason | Status |
|----------|------|--------|--------|
| **canva** | local | Not critical for operations | ⏸️ Disabled |
| **chrome-devtools** | local | Not critical for operations | ⏸️ Disabled |
| **vercel-labs-agent** | local | Missing VERCEL_TOKEN | ⏸️ Disabled |
| **singularity** | local | Service not available | ⏸️ Disabled |

### MCP Wrapper Files Location

All custom MCP wrappers are located in:
```
/Users/jeremy/dev/SIN-Solver/mcp-wrappers/
├── plane-mcp-wrapper.js
├── captcha-mcp-wrapper.js
├── scira-mcp-wrapper.js
├── sin-deep-research-mcp-wrapper.js      [NEW 2026-01-29]
├── sin-social-mcp-wrapper.js             [NEW 2026-01-29]
├── sin-video-gen-mcp-wrapper.js          [NEW 2026-01-29]
└── README.md
```

### Configuration File

All MCPs are configured in:
- **Global Config:** `~/.config/opencode/opencode.json`
- **Project Config:** `/Users/jeremy/dev/SIN-Solver/.opencode/opencode.json` (if exists)

### Recent Changes (2026-01-29)

1. **Added 3 new MCP wrappers:** sin-deep-research, sin-social, sin-video-gen
2. **Fixed skyvern:** Changed from `python` to `/usr/bin/python3` to fix PATH error
3. **Restored scira:** Added back after accidental removal
4. **Disabled non-critical MCPs:** canva, chrome-devtools, vercel-labs-agent, singularity

### Troubleshooting MCP Errors

**Error -32000 (Connection Closed):**
- Service not running or wrapper crash
- Check: `docker ps | grep <service-name>`
- Fix: `docker-compose restart <service-name>`

**SSE Error (Unable to Connect):**
- Remote MCP service unavailable
- Check internet connection
- Verify service URL accessibility

**Executable Not Found:**
- Command not in PATH
- Use absolute path (e.g., `/usr/bin/python3` instead of `python`)
