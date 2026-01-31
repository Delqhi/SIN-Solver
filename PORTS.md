# SIN-Solver Port Registry - EXTREME EDITION

**Version:** 2026-01-31  
**Status:** ACTIVE - MANDATORY COMPLIANCE  
**Scope:** ALL Containers, ALL Services, ALL Projects

---

## 🚨 MANDATORY RULE: NO STANDARD PORTS - EXTREME EDITION

**EFFECTIVE IMMEDIATELY - ZERO TOLERANCE**

### ❌ FORBIDDEN PORT RANGES (NEVER USE):

| Range | Why Forbidden |
|-------|---------------|
| 1-1023 | System/Well-known ports |
| 3000-3009 | Node.js/React/Express |
| 4200-4209 | Angular |
| 5000-5010 | Flask/Python |
| 5432-5439 | PostgreSQL |
| 6379-6389 | Redis |
| 8000-8010 | Django/Generic HTTP |
| 8080-8090 | HTTP Alternative |
| 9000-9009 | Portainer/PHP-FPM |
| 27017-27019 | MongoDB |
| 3306-3309 | MySQL |
| 5678-5680 | n8n/RabbitMQ |

### ✅ REQUIRED: EXTREME UNIQUE PORTS (50000-59999 RANGE)

**Schema:** `{CATEGORY}{NUMBER}{SUB}`

| Category | Range | Purpose |
|----------|-------|---------|
| **AGENTS** | 50000-50999 | AI Workers & Automation |
| **ROOMS** | 51000-51999 | Infrastructure & Services |
| **SOLVERS** | 52000-52499 | Captcha Solvers |
| **CLICKERS** | 52500-52999 | Clicker Workers |
| **SURVERS** | 53000-53499 | Survey Workers |
| **BUILDERS** | 53500-53999 | Web Builders |
| **RESERVED** | 54000-59999 | Future Expansion |

---

## 🤖 AGENTS (50000-50999)

| Container | Service | Host Port | Container Port | Directory | Status |
|-----------|---------|-----------|----------------|-----------|--------|
| **agent-01-n8n-orchestrator** | n8n Workflow | **50001** | 5678 | `Docker/agents/agent-01-n8n/` | Active |
| **agent-02-temporal-scheduler** | Temporal | **50002** | 3001 | `Docker/agents/agent-02-chronos-scheduler/` | Planned |
| **agent-03-agentzero-coder** | Agent Zero | **50003** | 8050 | `Docker/agents/agent-03-agentzero/` | Active |
| **agent-04-opencode-secretary** | OpenCode | **50004** | 9000 | `Docker/agents/agent-04-opencode-secretary/` | Planned |
| **agent-05-steel-browser** | Steel API | **50005** | 3000 | `Docker/agents/agent-05-steel/` | Active |
| **agent-05-steel-browser-cdp** | Steel CDP | **50015** | 9222 | `Docker/agents/agent-05-steel/` | Active |
| **agent-06-skyvern-solver** | Skyvern | **50006** | 8000 | `Docker/agents/agent-06-skyvern/` | Active |
| **agent-07-vnc-browser** | VNC Browser | **50007** | 5900 | `Docker/agents/agent-07-vnc-browser/` | Active |
| **agent-07-vnc-browser-web** | VNC Web | **50017** | 6901 | `Docker/agents/agent-07-vnc-browser/` | Active |
| **agent-07-vnc-browser-cdp** | VNC CDP | **50027** | 9222 | `Docker/agents/agent-07-vnc-browser/` | Active |
| **agent-08-stagehand-research** | Stagehand | **50008** | 3000 | `Docker/agents/agent-08-stagehand/` | Planned |
| **agent-09-playwright-tester** | Playwright | **50009** | 8080 | `Docker/agents/agent-09-playwright/` | Planned |
| **agent-09-clawdbot-social** | Clawdbot | **50009** | 8080 | `Docker/agents/agent-09-clawdbot-messenger/` | Planned |
| **agent-10-surfsense-knowledge** | Surfsense | **50010** | 6333 | `Docker/agents/agent-10-surfsense/` | Planned |

---

## 🏛️ ROOMS (51000-51999)

| Container | Service | Host Port | Container Port | Directory | Status |
|-----------|---------|-----------|----------------|-----------|--------|
| **room-01-dashboard-cockpit** | Dashboard | **51001** | 3011 | `Docker/rooms/room-01-dashboard/` | Active |
| **room-02-tresor-vault** | Vault | **51002** | 8200 | `Docker/rooms/room-02-tresor-vault/` | Planned |
| **room-03-postgres-master** | PostgreSQL | **51003** | 5432 | `Docker/rooms/room-03-postgres-master/` | Active |
| **room-04-redis-cache** | Redis | **51004** | 6379 | `Docker/rooms/room-04-redis-cache/` | Active |
| **room-05-generator-video** | Video Gen | **51005** | 8080 | `Docker/rooms/room-05-generator/` | Planned |
| **room-06-plugins-mcp** | MCP | **51006** | 8000 | `Docker/rooms/room-06-plugins/` | Planned |
| **room-07-gitlab-storage** | GitLab | **51007** | 80 | `Docker/rooms/room-07-gitlab/` | Planned |
| **room-08-postiz-scheduler** | Postiz | **51008** | 3000 | `Docker/rooms/room-08-postiz/` | Planned |
| **room-09-chat-app** | Chat | **51009** | 3000 | `Docker/rooms/room-09-chat/` | Planned |
| **room-10-scira-ai-search** | Scira | **51010** | 3000 | `room-30-scira-ai-search/` | Active |
| **room-11-plane-knowledge** | Plane | **51011** | 3000 | `room-11-plane-dev/` | Active |
| **room-12-delqhi-db** | Database | **51012** | 5432 | `Docker/rooms/room-12-delqhi-db/` | Planned |
| **room-13-api-brain** | API Gateway | **51013** | 8080 | `Docker/rooms/room-13-api-brain/` | Planned |
| **room-14-worker-queue** | Queue | **51014** | 8080 | `Docker/rooms/room-14-worker/` | Planned |
| **room-15-surfsense-archive** | Archive | **51015** | 6333 | `Docker/rooms/room-15-surfsense/` | Planned |
| **room-16-supabase-studio** | Supabase | **51016** | 54323 | `Docker/rooms/room-16-supabase/` | Active |
| **room-17-sin-plugins-mcp** | SIN Plugins | **51017** | 8000 | `Docker/rooms/room-17-sin-plugins/` | Planned |
| **room-18-survey-worker** | Survey | **51018** | 8018 | `Docker/rooms/room-18-survey/` | Planned |
| **room-19-captcha-worker** | Captcha | **51019** | 8019 | `Docker/rooms/room-19-captcha/` | Planned |
| **room-20-website-worker** | Website | **51020** | 8020 | `Docker/rooms/room-20-website/` | Planned |
| **room-21-nocodb-ui** | NocoDB | **51021** | 8090 | `Docker/rooms/room-21-nocodb/` | Planned |
| **room-22-billionmail-smtp** | Mail | **51022** | 8025 | `Docker/rooms/room-22-billionmail/` | Planned |
| **room-23-flowise-ai** | Flowise | **51023** | 8092 | `Docker/rooms/room-23-flowise/` | Planned |
| **room-24-hoppscotch-api** | Hoppscotch | **51024** | 3000 | `Docker/rooms/room-24-hoppscotch/` | Planned |

---

## 🔧 SOLVERS - Captcha Solvers (52000-52499)

| Container | Service | Host Port | Container Port | Directory | Status |
|-----------|---------|-----------|----------------|-----------|--------|
| **solver-1.1-2captcha** | 2captcha Account 1 | **52001** | 8019 | `Docker/solvers/solver-1.1-2captcha/` | Active |
| **solver-1.2-2captcha** | 2captcha Account 2 | **52002** | 8019 | `Docker/solvers/solver-1.2-2captcha/` | Planned |
| **solver-1.3-2captcha** | 2captcha Account 3 | **52003** | 8019 | `Docker/solvers/solver-1.3-2captcha/` | Planned |
| **solver-1.4-2captcha** | 2captcha Account 4 | **52004** | 8019 | `Docker/solvers/solver-1.4-2captcha/` | Planned |
| **solver-1.5-2captcha** | 2captcha Account 5 | **52005** | 8019 | `Docker/solvers/solver-1.5-2captcha/` | Planned |
| **solver-2.1-{provider}** | Next Provider Acct 1 | **52006** | 8019 | `Docker/solvers/solver-2.1-{provider}/` | Planned |
| **solver-2.2-{provider}** | Next Provider Acct 2 | **52007** | 8019 | `Docker/solvers/solver-2.2-{provider}/` | Planned |
| **solver-2.3-{provider}** | Next Provider Acct 3 | **52008** | 8019 | `Docker/solvers/solver-2.3-{provider}/` | Planned |
| **solver-2.4-{provider}** | Next Provider Acct 4 | **52009** | 8019 | `Docker/solvers/solver-2.4-{provider}/` | Planned |
| **solver-2.5-{provider}** | Next Provider Acct 5 | **52010** | 8019 | `Docker/solvers/solver-2.5-{provider}/` | Planned |

---

## 🖱️ CLICKERS - Clicker Workers (52500-52999)

| Container | Service | Host Port | Container Port | Directory | Status |
|-----------|---------|-----------|----------------|-----------|--------|
| **clicker-1.1-{provider}** | Clicker Provider 1 Acct 1 | **52501** | 8080 | `Docker/clickers/clicker-1.1-{provider}/` | Planned |
| **clicker-1.2-{provider}** | Clicker Provider 1 Acct 2 | **52502** | 8080 | `Docker/clickers/clicker-1.2-{provider}/` | Planned |
| **clicker-1.3-{provider}** | Clicker Provider 1 Acct 3 | **52503** | 8080 | `Docker/clickers/clicker-1.3-{provider}/` | Planned |
| **clicker-1.4-{provider}** | Clicker Provider 1 Acct 4 | **52504** | 8080 | `Docker/clickers/clicker-1.4-{provider}/` | Planned |
| **clicker-1.5-{provider}** | Clicker Provider 1 Acct 5 | **52505** | 8080 | `Docker/clickers/clicker-1.5-{provider}/` | Planned |

---

## 📊 SURVERS - Survey Workers (53000-53499)

| Container | Service | Host Port | Container Port | Directory | Status |
|-----------|---------|-----------|----------------|-----------|--------|
| **surver-1.1-{provider}** | Survey Provider 1 Acct 1 | **53001** | 8018 | `Docker/survers/surver-1.1-{provider}/` | Planned |
| **surver-1.2-{provider}** | Survey Provider 1 Acct 2 | **53002** | 8018 | `Docker/survers/surver-1.2-{provider}/` | Planned |
| **surver-1.3-{provider}** | Survey Provider 1 Acct 3 | **53003** | 8018 | `Docker/survers/surver-1.3-{provider}/` | Planned |
| **surver-1.4-{provider}** | Survey Provider 1 Acct 4 | **53004** | 8018 | `Docker/survers/surver-1.4-{provider}/` | Planned |
| **surver-1.5-{provider}** | Survey Provider 1 Acct 5 | **53005** | 8018 | `Docker/survers/surver-1.5-{provider}/` | Planned |

---

## 🎨 BUILDERS - Web Builders (53500-53999)

| Container | Service | Host Port | Container Port | Directory | Status |
|-----------|---------|-----------|----------------|-----------|--------|
| **builder-1.1-website** | Website Builder | **53501** | 8020 | `Docker/builders/builder-1.1-website/` | Active |
| **builder-2.1-webshop** | Webshop Builder | **53502** | 8020 | `Docker/builders/builder-2.1-webshop/` | Planned |
| **builder-3.1-webapp** | Webapp Builder | **53503** | 8020 | `Docker/builders/builder-3.1-webapp/` | Planned |

---

## ✅ VERIFICATION

```bash
# Check for ANY standard ports
grep -E ':(300[0-9]|808[0-9]|543[0-9]|637[0-9]|567[0-9]|800[0-9]|900[0-9]):' docker-compose.yml
# MUST RETURN EMPTY!

# Verify extreme ports are used
grep -E ':(500[0-9][0-9]|510[0-9][0-9]|520[0-9][0-9]|525[0-9][0-9]|530[0-9][0-9]|535[0-9][0-9]):' docker-compose.yml
# SHOULD SHOW ALL PORTS
```

---

**Document Version:** 2.0 - EXTREME EDITION  
**Last Updated:** 2026-01-31  
**Status:** MANDATORY - EXTREME PORTS ONLY
