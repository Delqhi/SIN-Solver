# Scira AI Search MCP Wrapper

**Container:** room-30-scira-ai-search  
**Port:** 8230  
**Public URL:** https://scira.delqhi.com  
**MCP Wrapper:** scira-mcp-wrapper.js

---

## Übersicht

Dieser MCP Wrapper ermöglicht die Integration von Scira AI Search (einer Open-Source AI Search Engine) in OpenCode CLI über das Model Context Protocol (MCP).

## Architektur

```
┌─────────────────┐     stdio      ┌──────────────────────┐     HTTP     ┌─────────────────────┐
│   OpenCode CLI  │ ─────────────── │  scira-mcp-wrapper   │ ──────────── │ room-30-scira-ai-search│
│                 │   MCP Protocol  │   (Node.js)          │   REST API   │   (Next.js + AI SDK)   │
└─────────────────┘                 └──────────────────────┘              └─────────────────────┘
                                                                                │
                                                                                │
                                                                        ┌───────▼────────┐
                                                                        │ Cloudflare     │
                                                                        │ Tunnel         │
                                                                        │ scira.delqhi.com│
                                                                        └────────────────┘
```

## Verfügbare Tools

| Tool | Beschreibung |
|------|--------------|
| `web_search` | AI-powered Web-Suche (Tavily, Exa) |
| `academic_search` | Akademische Papers und Forschung |
| `reddit_search` | Reddit Posts und Diskussionen |
| `youtube_search` | YouTube Videos mit Captions |
| `extract_url_content` | URL Content Extraktion |
| `movie_search` | Filme und TV Shows (TMDB) |
| `weather_search` | Wetter Informationen |
| `stock_chart` | Aktien Charts und News |
| `ai_chat` | Direkter AI Chat |
| `code_interpreter` | Python Code Ausführung |
| `health_check` | Service Health Check |

## Installation

### 1. Container Build

```bash
cd /Users/jeremy/dev/Delqhi-Platform/room-30-scira-ai-search

# Environment konfigurieren
cp .env.docker .env
# Edit .env mit API Keys

# Container bauen
docker-compose build

# Container starten
docker-compose up -d
```

### 2. MCP Dependencies installieren

```bash
cd /Users/jeremy/dev/Delqhi-Platform/mcp-wrappers
npm install @modelcontextprotocol/sdk axios
```

### 3. OpenCode Konfiguration

Die Konfiguration wurde bereits in `~/.config/opencode/opencode.json` hinzugefügt:

```json
{
  "mcp": {
    "room-30-scira-ai-search": {
      "type": "local",
      "command": ["node", "/Users/jeremy/dev/Delqhi-Platform/mcp-wrappers/scira-mcp-wrapper.js"],
      "enabled": true,
      "environment": {
        "SCIRA_API_URL": "https://scira.delqhi.com",
        "SCIRA_API_KEY": "${SCIRA_API_KEY}",
        "REQUEST_TIMEOUT": "30000"
      }
    }
  }
}
```

## Verwendung

### Web Search

```json
{
  "tool": "web_search",
  "arguments": {
    "query": "Latest AI developments 2026",
    "provider": "tavily",
    "depth": "advanced",
    "max_results": 10
  }
}
```

### Academic Search

```json
{
  "tool": "academic_search",
  "arguments": {
    "query": "transformer architecture attention mechanism",
    "max_results": 10,
    "include_abstracts": true
  }
}
```

### URL Content Extraction

```json
{
  "tool": "extract_url_content",
  "arguments": {
    "url": "https://example.com/article",
    "max_length": 10000
  }
}
```

## API Keys benötigt

Mindestens einer dieser API Keys ist erforderlich:

| Service | API Key | Verwendung |
|---------|---------|------------|
| Tavily | `TAVILY_API_KEY` | Web Search |
| Exa | `EXA_API_KEY` | Web/Academic Search |
| OpenAI | `OPENAI_API_KEY` | AI Models |
| Anthropic | `ANTHROPIC_API_KEY` | Claude Models |
| xAI | `XAI_API_KEY` | Grok Models |
| Google | `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini Models |

## Cloudflare Tunnel

Für öffentlichen Zugriff:

```bash
# In docker-compose.yml
export CLOUDFLARE_TUNNEL_TOKEN=your_token_here
docker-compose --profile production up -d cloudflare-tunnel-scira
```

## Troubleshooting

### Container startet nicht

```bash
# Logs prüfen
docker-compose logs -f room-30-scira-ai-search

# Health check
curl http://localhost:8230/api/health
```

### MCP Wrapper Fehler

```bash
# Dependencies prüfen
cd /Users/jeremy/dev/Delqhi-Platform/mcp-wrappers
npm list

# Manuelle Tests
curl -X POST http://localhost:8230/api/search/web \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "maxResults": 5}'
```

## Weiterführende Links

- Scira Repository: https://github.com/zaidmukaddam/scira
- Scira Demo: https://scira.ai
- MCP Protocol: https://modelcontextprotocol.io
