# Agent 07: VNC Browser (Browserless - Headfull Mode)

**Alternative to:** Steel Browser (Headless)  
**Purpose:** Visual browser automation with GUI access via Browserless  
**Container:** `agent-07-vnc-browser`  
**Image:** `ghcr.io/browserless/chromium:latest` (ARM64 native)

---

## 🎯 Overview

This agent provides a **HEADFULL** Chrome browser using [Browserless](https://www.browserless.io/), allowing you to:
- See the browser GUI in real-time via Debugger UI
- Debug automation visually
- Interact manually if needed
- Record screencasts
- Use Chrome DevTools Protocol (CDP) for automation

**Difference to Steel Browser:**
- Steel = Headless (no GUI, faster, production)
- VNC Browser = Headfull (with GUI via Browserless debugger, debugging, development)

**Why Browserless?**
- ✅ ARM64 native (no emulation on Apple Silicon)
- ✅ Built-in debugger UI (no VNC client needed)
- ✅ Production-ready (used by major companies)
- ✅ Session management and pooling
- ✅ Token-based authentication

---

## 🚀 Quick Start

### 1. Start VNC Browser
```bash
cd Docker/agents/agent-07-vnc-browser
docker-compose up -d
```

### 2. Access Debugger UI

**Web Browser (Recommended)**
```
http://localhost:50070/debugger?token=delqhi-admin
```

**Features:**
- Code editor with TypeScript/JavaScript support
- Session viewer to monitor active browser sessions
- Real-time browser interaction
- Screenshot capture

### 3. Verify CDP Access
```bash
curl "http://localhost:50072/json/version?token=delqhi-admin"
```

---

## 📊 Ports

| Service | Port | Purpose | URL |
|---------|------|---------|-----|
| Debugger UI | 50070 | Visual browser interface | http://localhost:50070/debugger |
| Documentation | 50070 | API docs (Redoc) | http://localhost:50070/docs |
| CDP API | 50072 | Chrome DevTools Protocol | http://localhost:50072/json/version |
| Sessions API | 50070 | Active sessions monitor | http://localhost:50070/sessions |

---

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and adjust:

```bash
# Browser Mode
BROWSER_MODE=vnc  # or 'steel' for headless

# VNC Browser Settings
VNC_BROWSER_PORT=50070    # Debugger UI port
VNC_CDP_PORT=50072        # CDP API port
VNC_PASSWORD=delqhi-admin # Authentication token
```

### Docker Compose Configuration

Key settings in `docker-compose.yml`:

```yaml
environment:
  - TOKEN=delqhi-admin              # Authentication token
  - MAX_CONCURRENT_SESSIONS=10      # Parallel sessions
  - PREBOOT_CHROME=true             # Faster startup
  - ENABLE_DEBUGGER=true            # Debugger UI
  - DEFAULT_HEADLESS=false          # Headfull mode
```

---

## 🖥️ Usage Examples

### Connect with CDP (Two-Level WebSocket)

Browserless uses a two-level WebSocket system:

```typescript
import WebSocket from 'ws';

const TOKEN = 'delqhi-admin';
const BROWSER_WS = 'ws://localhost:50072?token=' + TOKEN;

// Step 1: Connect to browser-level WebSocket
const browserWs = new WebSocket(BROWSER_WS);

browserWs.on('open', () => {
  // Step 2: Create a new target (page)
  browserWs.send(JSON.stringify({
    id: 1,
    method: 'Target.createTarget',
    params: { url: 'about:blank' }
  }));
});

browserWs.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  if (msg.id === 1 && msg.result?.targetId) {
    const targetId = msg.result.targetId;
    
    // Step 3: Connect to target-level WebSocket
    const targetWsUrl = `ws://localhost:50072/devtools/page/${targetId}?token=${TOKEN}`;
    const targetWs = new WebSocket(targetWsUrl);
    
    targetWs.on('open', () => {
      // Now you can use CDP commands
      targetWs.send(JSON.stringify({
        id: 1,
        method: 'Page.navigate',
        params: { url: 'https://example.com' }
      }));
    });
  }
});
```

### Connect with Puppeteer

```typescript
const browser = await puppeteer.connect({
  browserWSEndpoint: 'ws://localhost:50072?token=delqhi-admin',
  defaultViewport: null
});

const page = await browser.newPage();
await page.goto('https://example.com');
```

### Connect with Playwright

```typescript
const browser = await chromium.connectOverCDP(
  'http://localhost:50072?token=delqhi-admin'
);

const context = await browser.newContext();
const page = await context.newPage();
await page.goto('https://example.com');
```

---

## 🎨 Browserless Debugger UI

The debugger UI provides a complete development environment:

### Features
- **Code Editor**: Write and execute TypeScript/JavaScript
- **Session Viewer**: Monitor active browser sessions
- **Live Preview**: See browser actions in real-time
- **Download Code**: Save your automation scripts

### Access
```
http://localhost:50070/debugger?token=delqhi-admin
```

### Screenshot
The debugger shows:
- Left sidebar: Code editor and session list
- Right panel: Live browser preview
- Top bar: Run button and download options

---

## 🔒 Security

### Authentication
- **Token:** `delqhi-admin` (configurable via `TOKEN` env var)
- **Required for:** All API endpoints and WebSocket connections
- **Format:** `?token=delqhi-admin` appended to URLs

### Network Security
- Port 50070/50072 should NOT be exposed publicly
- Use SSH tunnel for remote access:
  ```bash
  ssh -L 50070:localhost:50070 -L 50072:localhost:50072 user@server
  ```

---

## 🐛 Troubleshooting

### Container Not Starting
```bash
# Check container status
docker ps | grep agent-07

# Check logs
docker logs agent-07-vnc-browser

# Restart
docker-compose restart
```

### CDP Connection Fails
```bash
# Verify token is correct
curl "http://localhost:50072/json/version?token=delqhi-admin"

# Check if Browserless is healthy
docker ps | grep agent-07-vnc-browser
# Should show (healthy)
```

### Debugger UI Not Loading
```bash
# Check if debugger is enabled
docker exec agent-07-vnc-browser env | grep ENABLE_DEBUGGER
# Should show: ENABLE_DEBUGGER=true

# Check port mapping
docker port agent-07-vnc-browser
```

### Two-Level WebSocket Issues
If you get errors like `'Page.enable' wasn't found`:
- You're connected to browser-level WS instead of target-level
- Create a target first, then connect to `devtools/page/<targetId>`

---

## 📁 Files

```
agent-07-vnc-browser/
├── docker-compose.yml          # Service definition (Browserless)
├── .env.example                # Configuration template
├── README.md                   # This file
└── ../../workers/2captcha-worker/
    ├── test-cdp-debug.ts       # CDP connection test
    └── test-web-vnc.ts         # Web VNC verification test
```

---

## 🔄 Comparison: Steel vs VNC Browser (Browserless)

| Feature | Steel (Headless) | VNC Browser (Browserless) |
|---------|------------------|---------------------------|
| **GUI** | ❌ None | ✅ Debugger UI (Web-based) |
| **Speed** | ✅ Fast | ⚠️ Moderate (session overhead) |
| **Memory** | ✅ Low (~500MB) | ⚠️ Higher (~1-2GB) |
| **Debugging** | ❌ Hard | ✅ Easy (visual debugger) |
| **Production** | ✅ Recommended | ⚠️ Development/debugging |
| **Architecture** | AMD64/ARM64 | ✅ ARM64 native |
| **VNC Client** | ❌ Not needed | ❌ Not needed (web UI) |
| **Manual Control** | ❌ No | ✅ Yes (via debugger) |
| **CDP Support** | ✅ Yes | ✅ Yes (two-level WS) |

---

## 🎯 When to Use What?

**Use Steel (Headless) when:**
- Production environment
- Maximum performance needed
- No human intervention required
- Running 24/7 automation

**Use VNC Browser (Browserless) when:**
- Developing/debugging scripts
- Need visual feedback
- Manual intervention might be needed
- Recording demos/tutorials
- Running on ARM64 (Apple Silicon)

---

## 📚 References

- **Browserless Docs:** https://www.browserless.io/
- **Browserless GitHub:** https://github.com/browserless/browserless
- **Chrome DevTools Protocol:** https://chromedevtools.github.io/devtools-protocol/
- **Steel Browser:** https://docs.steel.dev

---

## ✅ Testing

Run the verification tests:

```bash
cd workers/2captcha-worker

# Test CDP connection
npx ts-node test-cdp-debug.ts

# Test Web VNC connection
npx ts-node test-web-vnc.ts

# Test autonomous worker
npx ts-node test-autonomous.ts
```

---

**Document Version:** 2.0  
**Last Updated:** 2026-01-31  
**Status:** Active - Browserless Migration Complete
