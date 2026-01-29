# 🚀 Scira AI Search - Quick Start Guide

**One-Command Deployment:**

```bash
# 1. Build abwarten (läuft bereits im Hintergrund)
tail -f /tmp/scira-build.log

# 2. Container starten (nach Build-Completion)
cd /Users/jeremy/dev/Delqhi-Platform/room-30-scira-ai-search
docker-compose up -d

# 3. Health Check
curl http://localhost:8230/api/health

# 4. Fertig! 🎉
```

---

## ⚡ Sofort einsatzbereit in OpenCode

Die Integration ist bereits in `~/.config/opencode/opencode.json` aktiv:

```json
"room-30-scira-ai-search": {
  "type": "local",
  "command": ["node", "/Users/jeremy/dev/Delqhi-Platform/mcp-wrappers/scira-mcp-wrapper.js"],
  "enabled": true
}
```

**Prioritäts-Anweisung:** Ab sofort wird für alle Suchanfragen VORRANGIG Scira verwendet!

---

## 🔍 Verfügbare Tools (11 Stück)

| Tool | Beispiel |
|------|----------|
| `web_search` | Suche nach aktuellen Informationen |
| `academic_search` | Wissenschaftliche Papers finden |
| `reddit_search` | Community-Meinungen recherchieren |
| `youtube_search` | Videos mit Transkripten |
| `extract_url_content` | Artikel zusammenfassen |
| `movie_search` | Film- und TV-Informationen |
| `weather_search` | Wetterdaten weltweit |
| `stock_chart` | Aktienkurse und Charts |
| `ai_chat` | Direkte AI-Konversation |
| `code_interpreter` | Python-Code ausführen |
| `health_check` | Service-Status prüfen |

---

## 📊 Was ist Scira?

Scira ist eine **Open-Source AI Search Engine** - eine Alternative zu Perplexity mit:

- ✅ Multi-Provider AI (Grok, Claude, Gemini, GPT-4o)
- ✅ Web-Suche (Tavily, Exa AI)
- ✅ Akademische Suche
- ✅ YouTube, Reddit Integration
- ✅ Wetter, Aktien, Flüge
- ✅ Code Interpreter
- ✅ 100% Self-hosted

**GitHub:** https://github.com/zaidmukaddam/scira  
**Demo:** https://scira.ai

---

## 🔧 Konfiguration

### API Keys (optional, aber empfohlen)

In `room-30-scira-ai-search/.env`:

```bash
# Mindestens EINER davon:
TAVILY_API_KEY=your_key_here      # Für Web-Suche
EXA_API_KEY=your_key_here         # Für Academic-Suche
OPENAI_API_KEY=your_key_here      # Für AI Models
```

### Cloudflare Tunnel (für Public Access)

```bash
export CLOUDFLARE_TUNNEL_TOKEN=your_token
docker-compose --profile production up -d cloudflare-tunnel-scira
```

---

## 🌐 Zugriff

| URL | Beschreibung |
|-----|--------------|
| http://localhost:8230 | Lokales Dashboard |
| https://scira.delqhi.com | Öffentlich (nach Cloudflare Setup) |

---

## 🛠️ Troubleshooting

```bash
# Build Status prüfen
./room-30-scira-ai-search/monitor-build.sh

# Container Logs
docker-compose logs -f room-30-scira-ai-search

# Container Neustart
docker-compose restart room-30-scira-ai-search

# MCP Test
curl http://localhost:8230/api/health
```

---

## 📁 Projektstruktur

```
Delqhi-Platform/
├── room-30-scira-ai-search/          # Scira Container
│   ├── docker-compose.yml            # Container Definition
│   ├── .env.docker                   # Environment Template
│   └── monitor-build.sh              # Build Monitor
├── mcp-wrappers/
│   ├── scira-mcp-wrapper.js          # MCP stdio Wrapper
│   └── README-SCIRA.md               # Dokumentation
├── CONTAINER-REGISTRY.md             # Container Registry (aktualisiert)
└── SCIRA-DEPLOYMENT-STATUS.md        # Status Report
```

---

**Status:** 🔄 Build läuft | ETA: ~5-10 Minuten

**Fragen?** Siehe `SCIRA-DEPLOYMENT-STATUS.md` für vollständige Details.
