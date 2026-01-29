# Delqhi-Platform Core - Enterprise Architecture V17.10

## 🏛️ Übersicht

**Delqhi-Platform** ist ein verteiltes Multi-Agenten-System für:
- Automatisierte CAPTCHA-Lösung (100% FREE, self-hosted)
- Survey Automation (Swagbucks, Prolific, MTurk, etc.)
- Social Media Integration (Video-Analyse, Posting)
- AI Research & Coding Agents (MCP-basiert)

**Version:** V17.10 "WORKERS API EMPIRE"  
**Architektur:** 20+ Zimmer Distributed Fortress  
**Status:** 🟢 Production Ready

---

## 🏘️ Die 20-Zimmer Architektur (Complete Mapping)

| Zimmer | Name | Rolle | Port | IP |
|--------|------|-------|------|-----|
| **01** | n8n Manager | Workflow-Orchestrierung | 5678 | 172.20.0.10 |
| **02** | Chronos-Stratege | Scheduling & Timing | 3001 | 172.20.0.2 |
| **03** | Agent Zero | Code Generation (Logic Core) | 8000 | 172.20.0.50 |
| **04** | OpenCode-Sekretär | MCP Secretary | 9000 | 172.20.0.4 |
| **05** | Steel Tarnkappe | Stealth Browser Engine | 3000 | 172.20.0.20 |
| **06** | Skyvern Auge | Computer Vision (YOLOv8x) | 8000 | 172.20.0.30 |
| **07** | Stagehand Detektiv | Browser Automation | 3000 | 172.20.0.7 |
| **08** | QA-Prüfer | Quality Assurance | 8080 | 172.20.0.8 |
| **09** | ClawdBot-Bote | Multi-Messenger (Telegram/WhatsApp/Discord) | 8080 | 172.20.0.9 |
| **10** | Postgres Bibliothek | Database Persistence | 5432 | 172.20.0.10 |
| **11** | Dashboard Zentrale | React Web UI | 3100 | 172.20.0.60 |
| **12** | Evolution Optimizer | ML-basierte Optimierung | 8080 | 172.20.0.12 |
| **13** | API Koordinator | FastAPI Gateway & Vault | 8000 | 172.20.0.31 |
| **14** | Worker Arbeiter | Task Execution Workers | 8080 | 172.20.0.14 |
| **15** | Surfsense Archiv | Vector DB (Qdrant) | 6333 | 172.20.0.15 |
| **16** | Supabase Zimmer | Supabase Persistence | 5432 | 172.20.0.16 |
| **17** | SIN-Plugins | MCP Plugin Server | 8000 | 172.20.0.40 |
| **18** | Survey Worker | Survey Automation | 8018 | 172.20.0.80 |
| **19** | Captcha Worker | FREE Captcha Solving | 8019 | 172.20.0.81 |
| **20.3** | SIN-Social-MCP | Video Analysis & Social Posting | 8203 | 172.20.0.203 |
| **20.4** | SIN-Deep-Research-MCP | Ultimate Research Engine | 8204 | 172.20.0.204 |
| **Infra** | Redis | In-Memory Cache | 6379 | 172.20.0.10 |
| **Infra** | Postgres | Primary Database | 5432 | 172.20.0.10 |

---

## 🎯 Core Features (V17.10)

### 1. Workers API (`/api/workers`)
Vollständige Worker-Registrierung und -Verwaltung:
- `POST /api/workers` - Worker registrieren
- `GET /api/workers` - Alle Workers auflisten
- `GET /api/workers/{id}` - Worker Details
- `PUT /api/workers/{id}` - Status aktualisieren
- `POST /api/workers/{id}/heartbeat` - Heartbeat
- `DELETE /api/workers/{id}` - Worker abmelden
- `POST /api/workers/{id}/task/complete` - Task abschließen
- `GET /api/workers/stats/summary` - Statistiken

### 2. Tasks API (`/api/tasks`)
Task-Queue Management:
- `POST /api/tasks` - Task erstellen
- `GET /api/tasks` - Tasks auflisten (Filter: status, limit, worker_id)
- `GET /api/tasks/{id}` - Task Details
- `PUT /api/tasks/{id}/assign` - Worker zuweisen
- `PUT /api/tasks/{id}/start` - Task starten
- `PUT /api/tasks/{id}/complete` - Task abschließen
- `DELETE /api/tasks/{id}` - Task abbrechen

### 3. Captcha Worker (Zimmer-19)
100% FREE CAPTCHA-Lösung:
| Solver | Technologie | Anwendung |
|--------|-------------|-----------|
| OCR | ddddocr | Text CAPTCHAs |
| Slider | ddddocr | Slider Puzzles |
| Audio | Whisper | Audio CAPTCHAs |
| Click | ddddocr | Click Targets |
| Image | YOLOv8 | hCaptcha Grids |

### 4. Survey Worker (Zimmer-18)
Automatisierte Survey-Bearbeitung:
- Swagbucks, Prolific, MTurk, Clickworker, Appen
- FREE AI: OpenCode Zen, Gemini, Groq, Mistral
- Cookie Persistence
- Proxy Rotation

### 5. ClawdBot Multi-Messenger (Zimmer-09)
Notification & Posting System:
- Telegram Bot Integration
- WhatsApp Web (QR-Code Login)
- Discord Bot
- n8n Webhook Integration
- Event Streaming (Redis PubSub)

---

## 🚀 Quick Start

### 1. Gesamtes Empire starten
```bash
cd /Users/jeremy/dev/Delqhi-Platform
./sinctl start all
```

### 2. Einzelne Zimmer starten
```bash
./bin/zimmer-19-captcha-worker.sh start
./bin/zimmer-18-survey-worker.sh start
```

### 3. Health Checks
```bash
curl http://localhost:8000/health      # API Koordinator
curl http://localhost:8019/health      # Captcha Worker
curl http://localhost:8018/health      # Survey Worker
curl http://localhost:8004/health      # ClawdBot
```

---

## 📊 API Endpoints Übersicht

### Zimmer-13 API Koordinator (Port 8000)
| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/health` | GET | Health Check |
| `/api/workers` | GET/POST | Worker Management |
| `/api/workers/stats/summary` | GET | Worker Statistiken |
| `/api/tasks` | GET/POST | Task Management |
| `/api/services` | GET | Service Registry |
| `/api/credentials` | GET/POST | Credential Vault |

### Zimmer-19 Captcha Worker (Port 8019)
| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/health` | GET | Health Check |
| `/solve` | POST | Auto-Detect Solver |
| `/ocr` | POST | Text CAPTCHA |
| `/slider` | POST | Slider Puzzle |
| `/audio` | POST | Audio CAPTCHA |
| `/click` | POST | Click Target |
| `/image-classify` | POST | hCaptcha Grid |

### Zimmer-18 Survey Worker (Port 8018)
| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/health` | GET | Health Check |
| `/api/start` | POST | Survey starten |
| `/api/status` | GET | Status abrufen |
| `/api/platforms` | GET | Verfügbare Plattformen |

### Zimmer-09 ClawdBot (Port 8004)
| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/health` | GET | Health Check |
| `/api/notify` | POST | Nachricht senden |
| `/api/alert` | POST | Alert senden |
| `/api/messengers` | GET | Messenger Status |
| `/api/whatsapp/qr` | GET | WhatsApp QR Code |
| `/webhooks/n8n/*` | POST | n8n Webhook Handler |

---

## 🔒 Security Best Practices 2026

1. **Keine bezahlten APIs** - Nur FREE Tier Services
2. **Self-Hosted Captcha** - Keine CapMonster/2Captcha
3. **JWT Auth** - Service-to-Service Authentication
4. **Path Exemptions** - Nur nötige Endpoints ohne Auth
5. **Docker Isolation** - Jeder Service in eigenem Container
6. **Network Segmentation** - `haus-netzwerk` (172.20.0.0/16)

---

## 📈 Monitoring & Observability

### Prometheus Metrics
- Worker online/busy/offline counts
- Task completion rates
- Captcha solve success rates
- Response times

### Logging
- Structured JSON logs (pino/uvicorn)
- Request ID tracking
- Error aggregation

### Dashboards
- Zimmer-11 Dashboard: `http://localhost:3100`
- n8n Workflows: `http://localhost:5678`

---

## 🔗 Integration Patterns

### Zimmer-zu-Zimmer Kommunikation
```
[Zimmer-18 Survey] → [Zimmer-19 Captcha] → [Zimmer-09 ClawdBot]
     Survey          CAPTCHA lösen           Benachrichtigung
```

### MCP Integration (OpenCode CLI)
```json
{
  "zimmer-20-sin-social-mcp": {
    "command": "docker",
    "args": ["run", "-i", "--rm", "--network", "haus-netzwerk", "sin-social-mcp"]
  }
}
```

### Webhook Flow
```
[External Event] → [n8n Zimmer-01] → [API Zimmer-13] → [Worker Zimmer-14]
```

---

## 📚 Weiterführende Dokumentation

- [Docker Infrastructure](../docker-infrastructure/01-docker-infrastructure-readme.md)
- [Agent Swarm](../agent-swarm/01-agent-swarm-readme.md)
- [Troubleshooting](03-delqhi-platform-core-troubleshooting.md)
- [API Performance](07-delqhi-platform-core-api-performance.md)

---

**Version:** V17.10  
**Last Updated:** 2026-01-27  
**Maintainer:** Delqhi-Platform Empire
