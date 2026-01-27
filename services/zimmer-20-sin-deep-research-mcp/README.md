# 🔍 Zimmer-20.4: SIN-Deep-Research-MCP

**Elite Web Research & Content Extraction MCP Server**

> 100% FREE deep research with DuckDuckGo + Trafilatura + Gemini

---

## 📋 Overview

| Property | Value |
|----------|-------|
| **Room** | Zimmer-20.4 |
| **Service** | SIN-Deep-Research-MCP |
| **Port** | 8204 (Container) → 8214 (Host) |
| **IP** | 172.20.0.204 |
| **Status** | ✅ Production Ready |
| **Version** | 1.0.0 |
| **License** | Delqhi Proprietary |

## 🎯 Purpose

Professional web research MCP server providing:
- **Web Search**: DuckDuckGo search (FREE, no API key required)
- **News Search**: Real-time news aggregation
- **Content Extraction**: Clean text from any URL (trafilatura)
- **AI Summarization**: Gemini-powered summaries (FREE tier)
- **JS Browsing**: Steel Browser integration for dynamic pages

## 🛠️ Tools (5 Total)

| Tool | Description | Parameters |
|------|-------------|------------|
| `web_search` | DuckDuckGo web search | `query`, `max_results` |
| `news_search` | DuckDuckGo news search | `query`, `max_results`, `time_range` |
| `extract_content` | URL content extraction | `url`, `include_images` |
| `deep_research` | Search + extract + summarize | `topic`, `depth`, `sources` |
| `steel_browse` | Browse with Steel (JS support) | `url`, `wait_for`, `screenshot` |

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop running
- Port 8214 available on host
- GEMINI_API_KEY (optional, for AI summarization)

### Build & Run
```bash
cd /Users/jeremy/dev/SIN-Solver/services/zimmer-20-sin-deep-research-mcp

# Build Docker image
docker build -t sin-deep-research-mcp:latest .

# Run container
docker run -d \
  --name sin-deep-research-mcp \
  -p 8214:8204 \
  -e GEMINI_API_KEY=${GEMINI_API_KEY} \
  -e STEEL_API_URL=http://host.docker.internal:3000 \
  --restart unless-stopped \
  sin-deep-research-mcp:latest
```

### Verify Health
```bash
curl http://localhost:8214/health
# Expected: {"status":"healthy","service":"sin-deep-research-mcp","tools":5}
```

### List Tools
```bash
curl http://localhost:8214/tools | jq '.tools | length'
# Expected: 5
```

---

## 🔧 OpenCode Integration

Already configured in `~/.opencode/opencode.json`:
```json
{
  "mcp": {
    "sin_deep_research": {
      "type": "remote",
      "url": "http://localhost:8214",
      "enabled": true,
      "oauth": false
    }
  }
}
```

---

## 📦 Tech Stack

| Component | Technology |
|-----------|------------|
| **Runtime** | Python 3.11-slim |
| **Web Search** | duckduckgo-search 6.3+ |
| **Content Extraction** | trafilatura 1.12+ |
| **HTML Processing** | html2text 2024.2+ |
| **HTTP Client** | aiohttp 3.9+ |
| **AI Summarization** | Gemini 2.0 Flash (FREE) |
| **JS Browsing** | Steel Browser (optional) |

---

## 🔍 Tool Usage Examples

### Web Search
```bash
curl -X POST http://localhost:8214/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "web_search",
    "arguments": {
      "query": "best practices vue 3 composition api",
      "max_results": 10
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "title": "Vue 3 Composition API Guide",
      "url": "https://vuejs.org/guide/...",
      "snippet": "The Composition API is a set of APIs..."
    }
  ]
}
```

### News Search
```bash
curl -X POST http://localhost:8214/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "news_search",
    "arguments": {
      "query": "AI developments 2026",
      "max_results": 5,
      "time_range": "week"
    }
  }'
```

### Content Extraction
```bash
curl -X POST http://localhost:8214/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "extract_content",
    "arguments": {
      "url": "https://example.com/article",
      "include_images": false
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "title": "Article Title",
  "content": "Clean extracted text...",
  "word_count": 1500,
  "reading_time": "6 min"
}
```

### Deep Research
```bash
curl -X POST http://localhost:8214/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "deep_research",
    "arguments": {
      "topic": "Best practices for microservices architecture",
      "depth": "comprehensive",
      "sources": 10
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "topic": "Best practices for microservices architecture",
  "summary": "AI-generated summary of findings...",
  "key_points": [
    "Point 1...",
    "Point 2..."
  ],
  "sources": [
    {"title": "...", "url": "...", "relevance": 0.95}
  ],
  "research_time": "12.3s"
}
```

### Steel Browse (JS Support)
```bash
curl -X POST http://localhost:8214/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "steel_browse",
    "arguments": {
      "url": "https://spa-website.com",
      "wait_for": "networkidle",
      "screenshot": true
    }
  }'
```

---

## 📁 Directory Structure

```
zimmer-20-sin-deep-research-mcp/
├── Dockerfile                 # Python 3.11 + dependencies
├── requirements.txt           # Python dependencies
├── README.md                  # This file
├── src/
│   └── mcp_server.py         # MCP server (360 lines)
└── tests/
    └── test_tools.py         # Tool tests
```

---

## 🔒 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Optional | For AI summarization (FREE tier) |
| `STEEL_API_URL` | Optional | Steel Browser URL for JS pages |
| `MAX_SEARCH_RESULTS` | Optional | Default max results (default: 10) |
| `REQUEST_TIMEOUT` | Optional | HTTP timeout in seconds (default: 30) |

---

## 🐳 Docker Commands

### Build
```bash
docker build -t sin-deep-research-mcp:latest .
```

### Run
```bash
docker run -d \
  --name sin-deep-research-mcp \
  -p 8214:8204 \
  -e GEMINI_API_KEY=${GEMINI_API_KEY} \
  --restart unless-stopped \
  sin-deep-research-mcp:latest
```

### Logs
```bash
docker logs -f sin-deep-research-mcp
```

### Stop
```bash
docker stop sin-deep-research-mcp
docker rm sin-deep-research-mcp
```

### Save Image (Docker Sovereignty)
```bash
docker save sin-deep-research-mcp:latest | gzip > \
  /Users/jeremy/dev/SIN-Code/Docker/sin-deep-research-mcp/images/sin-deep-research-mcp-latest.tar.gz
```

---

## 🔄 Integration with SIN Ecosystem

### Workflow: Content Research Pipeline
```
1. sin-deep-research-mcp: Search for topic
      ↓
2. sin-deep-research-mcp: Extract content from top results
      ↓
3. sin-deep-research-mcp: Summarize with Gemini
      ↓
4. sin-video-gen-mcp: Generate script from research
      ↓
5. sin-video-gen-mcp: Create video
      ↓
6. sin-social-mcp: Post to platforms
```

### Related Services
| Service | Port | Purpose |
|---------|------|---------|
| sin-social-mcp | 8213 | Social media posting |
| sin-video-gen-mcp | 8215 | Video generation |
| Steel Browser | 3000 | JS page rendering |

---

## 🧪 Health Check

```bash
# Quick health check
curl -s http://localhost:8214/health | jq

# Expected response:
{
  "status": "healthy",
  "service": "sin-deep-research-mcp",
  "tools": 5,
  "version": "1.0.0"
}
```

---

## 📊 Performance

| Operation | Typical Duration |
|-----------|------------------|
| Web Search (10 results) | ~1s |
| News Search (5 results) | ~1s |
| Content Extraction | ~2-5s |
| Deep Research (10 sources) | ~15-30s |
| Steel Browse | ~5-10s |

---

## ⚠️ Constraints

- ❌ **NO PAID SERVICES** - Only FREE APIs (DuckDuckGo, Gemini FREE tier)
- ❌ **NO API KEYS for search** - DuckDuckGo requires no authentication
- ✅ **Rate Limits** - DuckDuckGo has soft rate limits (~100 requests/hour)
- ✅ **Content Filtering** - trafilatura filters ads and navigation

---

## 🔧 Troubleshooting

### Container won't start
```bash
# Check Docker Desktop is running
docker ps

# Rebuild image
docker build --no-cache -t sin-deep-research-mcp:latest .
```

### Search returns empty results
```bash
# Test DuckDuckGo directly
docker exec sin-deep-research-mcp python -c "from duckduckgo_search import DDGS; print(DDGS().text('test', max_results=1))"
```

### Extraction fails
```bash
# Check if URL is accessible
docker exec sin-deep-research-mcp curl -I https://example.com
```

### Gemini summarization not working
```bash
# Verify API key is set
docker exec sin-deep-research-mcp printenv GEMINI_API_KEY

# Falls back to simple extraction if no API key
```

---

## 📋 Changelog

### v1.0.0 (2026-01-27)
- Initial release
- 5 research tools
- DuckDuckGo integration
- Trafilatura content extraction
- Gemini AI summarization
- Steel Browser support
- OpenCode MCP integration

---

## 🎯 API Reference

### Health Endpoint
```
GET /health
```

### Tools Endpoint
```
GET /tools
```

### Execute Tool
```
POST /tools/execute
Content-Type: application/json

{
  "tool": "<tool_name>",
  "arguments": {
    "<param1>": "<value1>",
    "<param2>": "<value2>"
  }
}
```

### Tool Schemas

#### web_search
```json
{
  "name": "web_search",
  "description": "Search the web using DuckDuckGo",
  "parameters": {
    "query": {"type": "string", "required": true},
    "max_results": {"type": "integer", "default": 10}
  }
}
```

#### news_search
```json
{
  "name": "news_search",
  "description": "Search news using DuckDuckGo News",
  "parameters": {
    "query": {"type": "string", "required": true},
    "max_results": {"type": "integer", "default": 5},
    "time_range": {"type": "string", "enum": ["day", "week", "month"], "default": "week"}
  }
}
```

#### extract_content
```json
{
  "name": "extract_content",
  "description": "Extract clean text content from URL",
  "parameters": {
    "url": {"type": "string", "required": true},
    "include_images": {"type": "boolean", "default": false}
  }
}
```

#### deep_research
```json
{
  "name": "deep_research",
  "description": "Comprehensive research: search + extract + summarize",
  "parameters": {
    "topic": {"type": "string", "required": true},
    "depth": {"type": "string", "enum": ["quick", "standard", "comprehensive"], "default": "standard"},
    "sources": {"type": "integer", "default": 5}
  }
}
```

#### steel_browse
```json
{
  "name": "steel_browse",
  "description": "Browse URL with Steel Browser (JavaScript support)",
  "parameters": {
    "url": {"type": "string", "required": true},
    "wait_for": {"type": "string", "enum": ["load", "domcontentloaded", "networkidle"], "default": "load"},
    "screenshot": {"type": "boolean", "default": false}
  }
}
```

---

**Room:** Zimmer-20.4  
**Status:** ✅ Production Ready  
**Last Updated:** 2026-01-27  
**Maintainer:** SIN-Solver Team  
**License:** Delqhi Proprietary
