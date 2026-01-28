# 🐳 SIN-Solver Docker Container Übersicht

> **Aktualisiert:** 2026-01-28  
> **Container:** 28/28 laufen (100%)  
> **Gesund:** 24/28 (86%)  
> **Mac M1 Docker Desktop**

---

## 📊 Schnell-Übersicht

```
┌─────────────────────────────────────────────────────┐
│  🤖 AI Agents     4/4   ✅ Alle laufen             │
│  🏛️  Infrastruktur 8/8   ✅ Alle laufen             │
│  🔧 Task Solvers  2/2   ✅ Alle laufen             │
│  💬 Kommunikation 4/4   ✅ Alle laufen             │
│  🌐 Delqhi DB     6/6   ✅ Alle laufen             │
│  🚀 Delqhi Net    4/4   ✅ Alle laufen             │
├─────────────────────────────────────────────────────┤
│  TOTAL            28/28  ✅ 100% ONLINE            │
└─────────────────────────────────────────────────────┘
```

---

## 🤖 AI AGENTS (4)
*Intelligente Automatisierung & Workflows*

| Container | Port | Status | Was macht er? | URL |
|-----------|------|--------|---------------|-----|
| **n8n** | 5678 | 🟡 | Workflow Automatisierung | [localhost:5678](http://localhost:5678) |
| **Agent Zero** | 8050 | ✅ | AI Code Generation | [localhost:8050](http://localhost:8050) |
| **Steel Browser** | 3005 | ✅ | Stealth Web Automation | [localhost:3005](http://localhost:3005) |
| **Skyvern** | 8030 | ✅ | Visual Task Solving | [localhost:8030](http://localhost:8030) |

**💡 Tipp:** N8N ist dein Workflow-Hauptquartier - damit automatisierst du alle Prozesse!

---

## 🏛️ KERN-INFRASTRUKTUR (8)
*Datenbanken, Security & Tools*

| Container | Port | Status | Funktion | URL |
|-----------|------|--------|----------|-----|
| **PostgreSQL** | 5432 | ✅ | Haupt-Datenbank | - |
| **Redis** | 6379 | ✅ | Cache & Sessions | - |
| **Vault** | 8200 | ✅ | Secrets Management | [localhost:8200](http://localhost:8200) |
| **NocoDB** | 8090 | ✅ | No-Code DB UI | [localhost:8090](http://localhost:8090) |
| **Video Gen** | 8205 | ✅ | FFmpeg Video Creation | [localhost:8205](http://localhost:8205) |
| **MCP Plugins** | 8040 | 🟡 | Plugin System | [localhost:8040](http://localhost:8040) |
| **Supabase** | 54323 | 🟡 | Backend Platform | [localhost:54323](http://localhost:54323) |

**💡 Tipp:** Mit NocoDB kannst du Datenbanken wie Excel bearbeiten!

---

## 🔧 TASK SOLVERS (2)
*Captcha & Survey Automation*

| Container | Port | Status | Funktion |
|-----------|------|--------|----------|
| **Captcha Worker** | 8019 | ✅ | Löst Captchas automatisch |
| **Survey Worker** | 8018 | ✅ | Automatisiert Umfragen |

---

## 💬 KOMMUNIKATION (4)
*Chat, APIs & Testing*

| Container | Port | Status | Funktion | URL |
|-----------|------|--------|----------|-----|
| **RocketChat** | 3009 | 🟡 | Team Chat | [localhost:3009](http://localhost:3009) |
| **MongoDB** | 27017 | ✅ | Chat-Datenbank | - |
| **Chat MCP** | 8119 | 🔄 | AI Chat Bridge | [localhost:8119](http://localhost:8119) |
| **Hoppscotch** | 3024 | 🟡 | API Testing (Postman Alternative) | [localhost:3024](http://localhost:3024) |

**💡 Tipp:** Hoppscotch ist dein kostenloser Postman-Ersatz zum Testen aller APIs!

---

## 🌐 DELQHI DATABASE (Room 12)
*Supabase-Stack für Social Features*

| Container | Port | Status | Funktion | URL |
|-----------|------|--------|----------|-----|
| **Delqhi DB** | 5412 | ✅ | PostgreSQL | - |
| **Auth API** | 9999 | ✅ | Benutzer-Login | - |
| **REST API** | 3112 | ✅ | Daten-API | [localhost:3112](http://localhost:3112) |
| **Realtime** | 4012 | ✅ | Live-Updates | - |
| **Storage** | 5012 | ✅ | Datei-Speicher | - |
| **Studio** | 3012 | 🟡 | Management UI | [localhost:3012](http://localhost:3012) |

---

## 🚀 DELQHI NETWORK (Room 13)
*Social Media Platform*

| Container | Port | Status | Funktion | URL |
|-----------|------|--------|----------|-----|
| **Delqhi API** | 8130 | 🟡 | Backend API | [localhost:8130](http://localhost:8130) |
| **Delqhi Web** | 3130 | 🟡 | Frontend | [localhost:3130](http://localhost:3130) |
| **Delqhi MCP** | 8213 | 🟡 | AI Integration | - |
| **Search** | 7700 | ✅ | Meilisearch | [localhost:7700](http://localhost:7700) |

---

## 📱 DASHBOARD
*Zentrale Übersicht aller Services*

| Container | Port | Status | URL |
|-----------|------|--------|-----|
| **Haupt-Dashboard** | 3011 | ✅ | [localhost:3011](http://localhost:3011) |

**🎯 Das ist dein Startpunkt!** Hier siehst du alle Services auf einen Blick.

---

## 🔗 Meist-genutzte URLs

| Priorität | Service | URL | Beschreibung |
|-----------|---------|-----|--------------|
| ⭐⭐⭐ | **Dashboard** | http://localhost:3011 | Starte hier! |
| ⭐⭐⭐ | **n8n** | http://localhost:5678 | Workflows |
| ⭐⭐⭐ | **NocoDB** | http://localhost:8090 | Datenbanken |
| ⭐⭐ | **Hoppscotch** | http://localhost:3024 | API Testen |
| ⭐⭐ | **Supabase** | http://localhost:54323 | Backend |
| ⭐ | **Delqhi** | http://localhost:3130 | Social Platform |
| ⭐ | **RocketChat** | http://localhost:3009 | Chat |

---

## 🎨 Legende

| Symbol | Bedeutung | Erklärung |
|--------|-----------|-----------|
| ✅ healthy | Alles OK | Container läuft perfekt |
| 🟡 starting/unhealthy | Startet | Container ist noch am Hochfahren |
| 🔄 restarting | Neustart | Startet gerade neu |
| ✅ running | Läuft | Ohne Healthcheck, aber aktiv |

---

## 🚀 Schnell-Befehle

```bash
# Alle Container anzeigen
docker ps --format "table {{.Names}}\t{{.Status}}"

# Alle Services stoppen
docker stop $(docker ps -q)

# Alle Services starten
cd /Users/jeremy/dev/SIN-Solver/Docker && docker-compose up -d

# Logs eines Containers sehen
docker logs room-01-dashboard-cockpit -f

# Container neu starten
docker restart room-01-dashboard-cockpit
```

---

## 📞 Support

Bei Problemen:
1. Container Status prüfen: `docker ps`
2. Logs anschauen: `docker logs <container-name>`
3. Container neustarten: `docker restart <container-name>`
4. Dokumentation: `/Users/jeremy/dev/SIN-Solver/lastchanges.md`

---

*Generiert: 2026-01-28*  
*SIN-Solver Docker Empire v19.0*