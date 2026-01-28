# 🌐 Zimmer-20: Website Worker

**Elite Website Automation & Task Processing Worker**

> 100% FREE automated browser tasks with Steel Browser + Redis + ClawdBot

---

## 📋 Overview

| Property | Value |
|----------|-------|
| **Room** | Zimmer-20 |
| **Service** | SIN-Website-Worker |
| **Port** | 8020 |
| **IP** | 172.20.0.82 |
| **Status** | ✅ Production Ready |
| **Version** | 1.0.0 |
| **License** | Delqhi Proprietary |

## 🎯 Purpose

Professional website automation worker providing:
- **Survey Automation**: Complete surveys on multiple platforms
- **Micro-Task Processing**: Automated task completion
- **Web Scraping**: Data extraction with anti-detection
- **Form Filling**: Intelligent form completion
- **Screenshot Capture**: Visual documentation

## 🏆 Supported Platforms

| Platform | Type | Status | Priority |
|----------|------|--------|----------|
| Swagbucks | Surveys | ✅ Active | High |
| Prolific | Research | ✅ Active | High |
| Toluna | Surveys | ✅ Active | Medium |
| Clickworker | Micro-tasks | ✅ Active | Medium |
| MTurk | Micro-tasks | ✅ Active | Medium |
| Appen | Data tasks | ✅ Active | Low |
| LifePoints | Surveys | ✅ Active | Medium |
| YouGov | Surveys | ✅ Active | Medium |

---

## 🔧 Features

### Core Capabilities
- **Steel Browser Integration** - Stealth browsing with anti-detection
- **Redis Task Queue** - Persistent, priority-based task processing
- **Captcha Bridge** - Integration with Zimmer-19 Captcha Worker
- **ClawdBot Notifications** - Real-time alerts via Discord/Telegram
- **Multi-Platform Support** - 8+ platforms configured

### Anti-Detection
- Randomized timing patterns
- Human-like mouse movements
- Fingerprint randomization
- Proxy rotation support
- Session persistence

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check with stats |
| `/api/platforms` | GET | List supported platforms |
| `/api/status` | GET | Worker status and queue info |
| `/api/tasks/create` | POST | Create new automation task |
| `/api/tasks/:id` | GET | Get task status and result |
| `/api/tasks/:id/cancel` | POST | Cancel running task |
| `/api/scrape` | POST | Scrape URL with selectors |
| `/api/screenshot` | POST | Capture screenshot of URL |
| `/api/fill-form` | POST | Fill form on page |

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop running
- Port 8020 available
- Steel Browser running (Zimmer-05)
- Redis available
- Captcha Worker running (Zimmer-19)

### Build & Run
```bash
cd /Users/jeremy/dev/SIN-Solver/services/zimmer-20-website-worker

# Build Docker image
docker build -t sin-website-worker:latest .

# Run container
docker run -d \
  --name sin-website-worker \
  -p 8020:8020 \
  -e STEEL_API_URL=http://host.docker.internal:3000 \
  -e CAPTCHA_API_URL=http://host.docker.internal:8019 \
  -e CLAWDBOT_URL=http://host.docker.internal:8080 \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  --restart unless-stopped \
  sin-website-worker:latest
```

### Verify Health
```bash
curl http://localhost:8020/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "sin-website-worker",
  "queue": {
    "pending": 0,
    "processing": 0,
    "completed": 150
  },
  "uptime": "2d 5h 30m"
}
```

---

## 📦 Tech Stack

| Component | Technology |
|-----------|------------|
| **Runtime** | Node.js 20 |
| **Framework** | Express.js |
| **Browser** | Steel Browser (Stealth) |
| **Queue** | Redis (BullMQ) |
| **Captcha** | Zimmer-19 Captcha Worker |
| **Notifications** | ClawdBot |

---

## 🔗 Service Dependencies

| Service | Room | URL | Purpose |
|---------|------|-----|---------|
| Steel Browser | 05 | `ws://localhost:3000` | Stealth browsing |
| Captcha Worker | 19 | `http://localhost:8019` | Captcha solving |
| ClawdBot | 09 | `http://localhost:8080` | Notifications |
| Redis | - | `redis://localhost:6379` | Task queue |

---

## 📋 API Usage Examples

### Create Survey Task
```bash
curl -X POST http://localhost:8020/api/tasks/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "swagbucks",
    "type": "survey",
    "config": {
      "min_payout": 50,
      "max_duration": 15,
      "categories": ["lifestyle", "technology"]
    },
    "priority": "high"
  }'
```

**Response:**
```json
{
  "success": true,
  "task_id": "task_abc123",
  "status": "queued",
  "position": 1,
  "estimated_start": "2026-01-27T10:35:00Z"
}
```

### Get Task Status
```bash
curl http://localhost:8020/api/tasks/task_abc123
```

**Response:**
```json
{
  "task_id": "task_abc123",
  "platform": "swagbucks",
  "status": "completed",
  "result": {
    "surveys_completed": 3,
    "earnings": 150,
    "currency": "SB",
    "duration": "12m 30s"
  },
  "screenshots": [
    "/screenshots/task_abc123_1.png",
    "/screenshots/task_abc123_2.png"
  ]
}
```

### Scrape Page
```bash
curl -X POST http://localhost:8020/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/products",
    "selectors": {
      "title": "h1.product-title",
      "price": ".price-current",
      "description": ".product-desc"
    },
    "wait_for": ".product-title",
    "screenshot": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Product Name",
    "price": "$99.99",
    "description": "Product description..."
  },
  "screenshot_url": "/screenshots/scrape_xyz.png",
  "elapsed_time": "2.3s"
}
```

### Fill Form
```bash
curl -X POST http://localhost:8020/api/fill-form \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/contact",
    "fields": {
      "#name": "John Doe",
      "#email": "john@example.com",
      "#message": "Hello, I am interested in..."
    },
    "submit_selector": "button[type=submit]",
    "success_indicator": ".thank-you-message"
  }'
```

### Capture Screenshot
```bash
curl -X POST http://localhost:8020/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "full_page": true,
    "viewport": {
      "width": 1920,
      "height": 1080
    }
  }'
```

---

## 📁 Directory Structure

```
zimmer-20-website-worker/
├── server.js                    # Main Express server
├── Dockerfile                   # Container definition
├── package.json                 # Dependencies
├── README.md                    # This file
└── src/
    ├── index.js                 # Module exports
    ├── orchestrator.js          # Task processing logic
    ├── browser-controller.js    # Steel Browser wrapper
    ├── captcha-bridge.js        # Captcha Worker integration
    ├── notification-handler.js  # ClawdBot integration
    ├── task-queue.js            # Redis queue manager
    ├── platforms/
    │   ├── swagbucks.js         # Swagbucks automation
    │   ├── prolific.js          # Prolific automation
    │   ├── toluna.js            # Toluna automation
    │   ├── clickworker.js       # Clickworker automation
    │   ├── mturk.js             # MTurk automation
    │   └── appen.js             # Appen automation
    └── utils/
        ├── human-behavior.js    # Anti-detection patterns
        ├── session-manager.js   # Cookie persistence
        └── proxy-rotator.js     # Proxy management
```

---

## 🔒 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STEEL_API_URL` | Yes | Steel Browser WebSocket URL |
| `CAPTCHA_API_URL` | Yes | Captcha Worker HTTP URL |
| `CLAWDBOT_URL` | Yes | ClawdBot HTTP URL |
| `REDIS_URL` | Yes | Redis connection URL |
| `MAX_CONCURRENT_TASKS` | No | Max parallel tasks (default: 3) |
| `SCREENSHOT_DIR` | No | Screenshot storage path |
| `PROXY_LIST` | No | Comma-separated proxy URLs |

---

## 🐳 Docker Commands

### Build
```bash
docker build -t sin-website-worker:latest .
```

### Run
```bash
docker run -d \
  --name sin-website-worker \
  -p 8020:8020 \
  -v $(pwd)/screenshots:/app/screenshots \
  -e STEEL_API_URL=http://host.docker.internal:3000 \
  -e CAPTCHA_API_URL=http://host.docker.internal:8019 \
  -e CLAWDBOT_URL=http://host.docker.internal:8080 \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  --restart unless-stopped \
  sin-website-worker:latest
```

### Logs
```bash
docker logs -f sin-website-worker
```

### Stop
```bash
docker stop sin-website-worker
docker rm sin-website-worker
```

### Save Image (Docker Sovereignty)
```bash
docker save sin-website-worker:latest | gzip > \
  /Users/jeremy/dev/SIN-Code/Docker/sin-website-worker/images/sin-website-worker-latest.tar.gz
```

---

## 🔄 Integration with SIN Ecosystem

### Workflow: Automated Survey Pipeline
```
1. Website Worker: Scan for available surveys
      ↓
2. Website Worker: Queue high-value surveys
      ↓
3. Steel Browser: Execute survey automation
      ↓
4. Captcha Worker: Solve any captchas encountered
      ↓
5. Website Worker: Capture completion screenshot
      ↓
6. ClawdBot: Notify user of earnings
```

### Related Services
| Service | Port | Purpose |
|---------|------|---------|
| Steel Browser | 3000 | Stealth browsing |
| Captcha Worker | 8019 | Captcha solving |
| ClawdBot | 8080 | Notifications |
| Survey Worker | 8018 | Survey orchestration |

---

## 🧪 Health Check

```bash
# Quick health check
curl -s http://localhost:8020/health | jq

# Queue status
curl -s http://localhost:8020/api/status | jq

# List platforms
curl -s http://localhost:8020/api/platforms | jq
```

---

## 📊 Performance

| Operation | Typical Duration |
|-----------|------------------|
| Page Load (Steel) | ~2-5s |
| Form Fill | ~1-2s |
| Screenshot | ~0.5s |
| Survey (5 min) | ~5-7 min |
| Captcha Solve | ~2-10s |

---

## ⚠️ Constraints

- ❌ **NO PAID SERVICES** - All components are FREE/self-hosted
- ❌ **NO OFFICIAL APIs** - All automation via browser
- ✅ **Steel Browser Required** - For anti-detection
- ✅ **Redis Required** - For task queue persistence
- ✅ **Rate Limits** - Respects platform limits

---

## 🔧 Troubleshooting

### Container won't start
```bash
# Check dependencies are running
curl http://localhost:3000/health  # Steel Browser
curl http://localhost:8019/health  # Captcha Worker
redis-cli ping                     # Redis
```

### Tasks stuck in queue
```bash
# Check Redis connection
docker exec sin-website-worker redis-cli -u $REDIS_URL ping

# Clear stuck tasks
curl -X POST http://localhost:8020/api/tasks/clear-stuck
```

### Steel Browser connection failed
```bash
# Verify Steel is running
curl http://localhost:3000/health

# Check WebSocket connection
docker logs sin-website-worker | grep "Steel"
```

### Captcha solving fails
```bash
# Check Captcha Worker health
curl http://localhost:8019/health

# View captcha solve logs
docker logs sin-website-worker | grep "captcha"
```

---

## 📋 Changelog

### v1.0.0 (2026-01-27)
- Initial release
- 8 platform integrations
- Steel Browser integration
- Redis task queue
- Captcha Worker bridge
- ClawdBot notifications
- Anti-detection features

---

## 🎯 Task Configuration Schema

### Survey Task
```json
{
  "platform": "swagbucks",
  "type": "survey",
  "config": {
    "min_payout": 50,
    "max_duration": 15,
    "categories": ["lifestyle", "technology"],
    "avoid_keywords": ["medical", "sensitive"]
  },
  "priority": "high",
  "retry_count": 3,
  "timeout": 1800
}
```

### Scrape Task
```json
{
  "type": "scrape",
  "config": {
    "url": "https://example.com",
    "selectors": {
      "title": "h1",
      "content": ".main-content"
    },
    "wait_for": ".loaded",
    "screenshot": true,
    "full_page": true
  },
  "priority": "medium"
}
```

### Form Fill Task
```json
{
  "type": "form_fill",
  "config": {
    "url": "https://example.com/form",
    "fields": {
      "#name": "John Doe",
      "#email": "john@example.com"
    },
    "submit_selector": "button[type=submit]",
    "success_indicator": ".success-message",
    "human_timing": true
  },
  "priority": "low"
}
```

---

**Room:** Zimmer-20  
**Status:** ✅ Production Ready  
**Last Updated:** 2026-01-27  
**Maintainer:** SIN-Solver Team  
**License:** Delqhi Proprietary
