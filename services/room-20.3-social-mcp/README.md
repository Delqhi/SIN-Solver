# 📱 Zimmer-20.3: SIN-Social-MCP

**Elite Social Media Automation MCP Server**

> 100% FREE social media management via ClawdBot integration

---

## 📋 Overview

| Property | Value |
|----------|-------|
| **Room** | Zimmer-20.3 |
| **Service** | SIN-Social-MCP |
| **Port** | 8203 (Container) → 8213 (Host) |
| **IP** | 172.20.0.203 |
| **Status** | ✅ Production Ready |
| **Version** | 1.0.0 |
| **License** | Delqhi Proprietary |

## 🎯 Purpose

Professional social media automation MCP server providing:
- **Video Analysis**: AI-powered video content analysis (Gemini FREE)
- **Cross-Platform Posting**: Post to all platforms via ClawdBot
- **Content Scheduling**: Schedule posts for optimal engagement
- **Analytics**: Track post performance across platforms

## 🛠️ Tools (5 Total)

| Tool | Description | Parameters |
|------|-------------|------------|
| `analyze_video` | AI video content analysis | `video_path`, `analysis_type` |
| `post_to_clawdbot` | Cross-platform posting | `message`, `platforms`, `media_urls` |
| `analyze_and_post` | Analyze video + generate post + publish | `video_path`, `platforms`, `style` |
| `schedule_post` | Schedule posts for later | `message`, `platforms`, `scheduled_time` |
| `get_post_status` | Track post performance | `post_id` |

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop running
- Port 8213 available on host
- ClawdBot running (Zimmer-09, port 8080)
- GEMINI_API_KEY (optional, for video analysis)

### Build & Run
```bash
cd /Users/jeremy/dev/Delqhi-Platform/services/zimmer-20-sin-social-mcp

# Build Docker image
docker build -t sin-social-mcp:latest .

# Run container
docker run -d \
  --name sin-social-mcp \
  -p 8213:8203 \
  -e GEMINI_API_KEY=${GEMINI_API_KEY} \
  -e CLAWDBOT_URL=http://host.docker.internal:8080 \
  --restart unless-stopped \
  sin-social-mcp:latest
```

### Verify Health
```bash
curl http://localhost:8213/health
# Expected: {"status":"healthy","service":"sin-social-mcp","tools":5}
```

### List Tools
```bash
curl http://localhost:8213/tools | jq '.tools | length'
# Expected: 5
```

---

## 🔧 OpenCode Integration

Already configured in `~/.opencode/opencode.json`:
```json
{
  "mcp": {
    "sin_social": {
      "type": "remote",
      "url": "http://localhost:8213",
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
| **HTTP Server** | aiohttp 3.9+ |
| **Video Analysis** | Gemini 2.0 Flash (FREE) |
| **Social Posting** | ClawdBot API |
| **Scheduling** | APScheduler 3.10+ |

---

## 📱 Supported Platforms (via ClawdBot)

| Platform | Posting | Images | Videos | Scheduling |
|----------|---------|--------|--------|------------|
| Discord | ✅ | ✅ | ✅ | ✅ |
| Telegram | ✅ | ✅ | ✅ | ✅ |
| Twitter/X | ✅ | ✅ | ✅ | ✅ |
| Reddit | ✅ | ✅ | ✅ | ✅ |
| Facebook | ✅ | ✅ | ✅ | ✅ |
| Instagram | ✅ | ✅ | ✅ | ✅ |
| LinkedIn | ✅ | ✅ | ❌ | ✅ |
| TikTok | ✅ | ❌ | ✅ | ✅ |

---

## 🔍 Tool Usage Examples

### Analyze Video
```bash
curl -X POST http://localhost:8213/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "analyze_video",
    "arguments": {
      "video_path": "/app/videos/product-demo.mp4",
      "analysis_type": "social_media"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "summary": "Product demonstration video showing...",
    "key_moments": [
      {"timestamp": "0:15", "description": "Product reveal"},
      {"timestamp": "0:45", "description": "Feature demo"}
    ],
    "suggested_caption": "Check out our latest product! 🚀",
    "hashtags": ["#product", "#demo", "#tech"],
    "best_thumbnail_time": "0:12",
    "duration": "1:30",
    "quality_score": 8.5
  }
}
```

### Post to ClawdBot
```bash
curl -X POST http://localhost:8213/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "post_to_clawdbot",
    "arguments": {
      "message": "Check out our new product launch! 🚀",
      "platforms": ["discord", "telegram", "twitter"],
      "media_urls": ["https://example.com/video.mp4"]
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "post_id": "post_abc123",
  "platforms": {
    "discord": {"status": "posted", "message_id": "..."},
    "telegram": {"status": "posted", "message_id": "..."},
    "twitter": {"status": "posted", "tweet_id": "..."}
  }
}
```

### Analyze and Post (One-Click)
```bash
curl -X POST http://localhost:8213/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "analyze_and_post",
    "arguments": {
      "video_path": "/app/videos/tutorial.mp4",
      "platforms": ["discord", "telegram", "twitter", "reddit"],
      "style": "professional"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "summary": "Tutorial video about...",
    "generated_caption": "Learn how to... 🎓"
  },
  "post_id": "post_xyz789",
  "platforms": {
    "discord": {"status": "posted"},
    "telegram": {"status": "posted"},
    "twitter": {"status": "posted"},
    "reddit": {"status": "posted"}
  }
}
```

### Schedule Post
```bash
curl -X POST http://localhost:8213/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "schedule_post",
    "arguments": {
      "message": "Happy Friday! 🎉",
      "platforms": ["discord", "twitter"],
      "scheduled_time": "2026-01-31T18:00:00Z"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "schedule_id": "sched_123",
  "scheduled_time": "2026-01-31T18:00:00Z",
  "platforms": ["discord", "twitter"],
  "status": "scheduled"
}
```

### Get Post Status
```bash
curl -X POST http://localhost:8213/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "get_post_status",
    "arguments": {
      "post_id": "post_abc123"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "post_id": "post_abc123",
  "created_at": "2026-01-27T10:30:00Z",
  "platforms": {
    "discord": {
      "status": "delivered",
      "reactions": 15,
      "replies": 3
    },
    "twitter": {
      "status": "delivered",
      "likes": 42,
      "retweets": 8
    }
  }
}
```

---

## 📁 Directory Structure

```
zimmer-20-sin-social-mcp/
├── Dockerfile                 # Python 3.11 + dependencies
├── requirements.txt           # Python dependencies
├── README.md                  # This file
├── src/
│   └── mcp_server.py         # MCP server (390 lines)
└── tests/
    └── test_tools.py         # Tool tests
```

---

## 🔒 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Optional | For AI video analysis (FREE tier) |
| `CLAWDBOT_URL` | Required | ClawdBot API URL (default: http://localhost:8080) |
| `DEFAULT_PLATFORMS` | Optional | Default platforms for posting |
| `SCHEDULE_TIMEZONE` | Optional | Timezone for scheduling (default: UTC) |

---

## 🐳 Docker Commands

### Build
```bash
docker build -t sin-social-mcp:latest .
```

### Run
```bash
docker run -d \
  --name sin-social-mcp \
  -p 8213:8203 \
  -e GEMINI_API_KEY=${GEMINI_API_KEY} \
  -e CLAWDBOT_URL=http://host.docker.internal:8080 \
  --restart unless-stopped \
  sin-social-mcp:latest
```

### Logs
```bash
docker logs -f sin-social-mcp
```

### Stop
```bash
docker stop sin-social-mcp
docker rm sin-social-mcp
```

### Save Image (Docker Sovereignty)
```bash
docker save sin-social-mcp:latest | gzip > \
  /Users/jeremy/dev/SIN-Code/Docker/sin-social-mcp/images/sin-social-mcp-latest.tar.gz
```

---

## 🔄 Integration with SIN Ecosystem

### Workflow: Video Content Pipeline
```
1. sin-deep-research-mcp: Research topic
      ↓
2. sin-video-gen-mcp: Generate script
      ↓
3. sin-video-gen-mcp: Create video
      ↓
4. sin-social-mcp: Analyze video content
      ↓
5. sin-social-mcp: Generate optimized captions
      ↓
6. sin-social-mcp: Post to all platforms
```

### Related Services
| Service | Port | Purpose |
|---------|------|---------|
| ClawdBot | 8080 | Social media API gateway |
| sin-deep-research-mcp | 8214 | Topic research |
| sin-video-gen-mcp | 8215 | Video generation |

---

## 🧪 Health Check

```bash
# Quick health check
curl -s http://localhost:8213/health | jq

# Expected response:
{
  "status": "healthy",
  "service": "sin-social-mcp",
  "tools": 5,
  "version": "1.0.0",
  "clawdbot_status": "connected"
}
```

---

## 📊 Performance

| Operation | Typical Duration |
|-----------|------------------|
| Video Analysis (1 min video) | ~5-10s |
| Post to ClawdBot (1 platform) | ~1s |
| Post to ClawdBot (5 platforms) | ~3s |
| Analyze and Post | ~10-15s |
| Schedule Post | ~0.5s |

---

## ⚠️ Constraints

- ❌ **NO OFFICIAL SOCIAL MEDIA APIs** - All posting via ClawdBot
- ❌ **NO PAID SERVICES** - Only FREE APIs (Gemini FREE tier)
- ✅ **ClawdBot Required** - ClawdBot must be running for posting
- ✅ **Rate Limits** - Respects platform-specific rate limits via ClawdBot

---

## 🔧 Troubleshooting

### Container won't start
```bash
# Check Docker Desktop is running
docker ps

# Rebuild image
docker build --no-cache -t sin-social-mcp:latest .
```

### ClawdBot connection failed
```bash
# Verify ClawdBot is running
curl http://localhost:8080/health

# Check environment variable
docker exec sin-social-mcp printenv CLAWDBOT_URL
```

### Video analysis fails
```bash
# Verify Gemini API key
docker exec sin-social-mcp printenv GEMINI_API_KEY

# Check video file exists
docker exec sin-social-mcp ls -la /app/videos/
```

### Post failed
```bash
# Check ClawdBot logs
docker logs clawdbot

# Verify platform credentials in ClawdBot
```

---

## 📋 Changelog

### v1.0.0 (2026-01-27)
- Initial release
- 5 social media tools
- Gemini video analysis integration
- ClawdBot cross-platform posting
- Post scheduling
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

#### analyze_video
```json
{
  "name": "analyze_video",
  "description": "Analyze video content using AI",
  "parameters": {
    "video_path": {"type": "string", "required": true},
    "analysis_type": {"type": "string", "enum": ["social_media", "detailed", "quick"], "default": "social_media"}
  }
}
```

#### post_to_clawdbot
```json
{
  "name": "post_to_clawdbot",
  "description": "Post content to social platforms via ClawdBot",
  "parameters": {
    "message": {"type": "string", "required": true},
    "platforms": {"type": "array", "items": {"type": "string"}, "required": true},
    "media_urls": {"type": "array", "items": {"type": "string"}, "default": []}
  }
}
```

#### analyze_and_post
```json
{
  "name": "analyze_and_post",
  "description": "Analyze video + generate caption + post to platforms",
  "parameters": {
    "video_path": {"type": "string", "required": true},
    "platforms": {"type": "array", "items": {"type": "string"}, "required": true},
    "style": {"type": "string", "enum": ["professional", "casual", "funny", "informative"], "default": "professional"}
  }
}
```

#### schedule_post
```json
{
  "name": "schedule_post",
  "description": "Schedule a post for later",
  "parameters": {
    "message": {"type": "string", "required": true},
    "platforms": {"type": "array", "items": {"type": "string"}, "required": true},
    "scheduled_time": {"type": "string", "format": "date-time", "required": true}
  }
}
```

#### get_post_status
```json
{
  "name": "get_post_status",
  "description": "Get status and analytics for a post",
  "parameters": {
    "post_id": {"type": "string", "required": true}
  }
}
```

---

**Room:** Zimmer-20.3  
**Status:** ✅ Production Ready  
**Last Updated:** 2026-01-27  
**Maintainer:** Delqhi-Platform Team  
**License:** Delqhi Proprietary
