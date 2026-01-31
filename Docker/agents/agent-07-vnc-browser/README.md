# Agent 07: VNC Browser (Headfull Mode)

**Alternative to:** Steel Browser (Headless)  
**Purpose:** Visual browser automation with GUI access  
**Container:** `agent-07-vnc-browser`  
**Image:** `siomiz/chrome:latest`

---

## 🎯 Overview

This agent provides a **HEADFULL** Chrome browser with VNC access, allowing you to:
- See the browser GUI in real-time
- Debug automation visually
- Interact manually if needed
- Record screencasts

**Difference to Steel Browser:**
- Steel = Headless (no GUI, faster, production)
- VNC Browser = Headfull (with GUI, debugging, development)

---

## 🚀 Quick Start

### 1. Start VNC Browser
```bash
cd Docker/agents/agent-07-vnc-browser
docker-compose up -d
```

### 2. Connect via VNC

**Option A: VNC Viewer (Recommended)**
```bash
# macOS: Open Screen Sharing
open vnc://localhost:50070

# Password: delqhi-admin (or your VNC_PASSWORD)
```

**Option B: Web Browser (noVNC)**
```
http://localhost:50071
```

### 3. Verify CDP Access
```bash
curl http://localhost:50072/json/version
```

---

## 📊 Ports

| Service | Port | Purpose |
|---------|------|---------|
| VNC | 50070 | Remote Desktop (VNC Viewer) |
| noVNC | 50071 | Web-based VNC (Browser) |
| CDP | 50072 | Chrome DevTools Protocol |
| API | 50073 | HTTP API (if available) |

---

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and adjust:

```bash
# Browser Mode
BROWSER_MODE=vnc  # or 'steel' for headless

# VNC Settings
VNC_BROWSER_PORT=50070
VNC_WEB_PORT=50071
VNC_CDP_PORT=50072
VNC_PASSWORD=your-secure-password
VNC_RESOLUTION=1920x1080
```

### Switch Between Headless and Headfull

**Headfull (VNC):**
```bash
# Start VNC Browser
docker-compose -f docker-compose.yml up -d

# Stop Steel Browser
docker stop agent-05-steel-browser
```

**Headless (Steel):**
```bash
# Start Steel Browser
cd ../agent-05-steel
docker-compose up -d

# Stop VNC Browser
docker stop agent-07-vnc-browser
```

---

## 🖥️ Usage Examples

### Connect with CDP (TypeScript)
```typescript
const CDP = require('chrome-remote-interface');

const client = await CDP({
  host: 'localhost',
  port: 50072  // VNC Browser CDP Port
});

// Navigate
await client.Page.navigate({ url: 'https://example.com' });

// Take screenshot
const { data } = await client.Page.captureScreenshot();
```

### Connect with Puppeteer
```typescript
const browser = await puppeteer.connect({
  browserWSEndpoint: 'ws://localhost:50072/devtools/browser',
  defaultViewport: null  // Use actual window size
});

const page = await browser.newPage();
await page.goto('https://example.com');
```

### Connect with Playwright
```typescript
const browser = await chromium.connectOverCDP(
  'http://localhost:50072'
);

const context = await browser.newContext();
const page = await context.newPage();
```

---

## 🎨 VNC Clients

### macOS
- **Screen Sharing** (built-in): `open vnc://localhost:50070`
- **VNC Viewer** (RealVNC): Download from realvnc.com

### Windows
- **RealVNC Viewer**: https://www.realvnc.com/en/connect/download/viewer/
- **TightVNC**: https://www.tightvnc.com/

### Linux
- **Remmina**: `sudo apt install remmina`
- **TigerVNC**: `sudo apt install tigervnc-viewer`

---

## 🔒 Security

### Default Password
- **VNC Password:** `delqhi-admin`
- **Change in:** `.env` file → `VNC_PASSWORD`

### Network Security
- VNC port (50070) should NOT be exposed publicly
- Use SSH tunnel for remote access:
  ```bash
  ssh -L 50070:localhost:50070 user@server
  ```

---

## 🐛 Troubleshooting

### VNC Connection Refused
```bash
# Check if container is running
docker ps | grep vnc-browser

# Check logs
docker logs agent-07-vnc-browser

# Restart
docker-compose restart
```

### Black Screen
```bash
# Increase resources
docker-compose down
docker-compose up -d --memory=4g
```

### Slow Performance
```bash
# Reduce resolution
VNC_RESOLUTION=1280x720
```

---

## 📁 Files

```
agent-07-vnc-browser/
├── docker-compose.yml      # Service definition
├── .env.example            # Configuration template
├── README.md               # This file
└── scripts/                # Custom automation scripts
    └── example.js
```

---

## 🔄 Comparison: Steel vs VNC Browser

| Feature | Steel (Headless) | VNC Browser (Headfull) |
|---------|------------------|------------------------|
| **GUI** | ❌ None | ✅ Full Desktop |
| **Speed** | ✅ Fast | ⚠️ Slower (VNC overhead) |
| **Memory** | ✅ Low (~500MB) | ⚠️ Higher (~1-2GB) |
| **Debugging** | ❌ Hard | ✅ Easy (see what's happening) |
| **Production** | ✅ Recommended | ❌ Development only |
| **VNC Access** | ❌ No | ✅ Yes |
| **Manual Control** | ❌ No | ✅ Yes (take over anytime) |

---

## 🎯 When to Use What?

**Use Steel (Headless) when:**
- Production environment
- Maximum performance needed
- No human intervention required
- Running 24/7 automation

**Use VNC Browser (Headfull) when:**
- Developing/debugging scripts
- Learning browser automation
- Need to see what's happening
- Manual intervention might be needed
- Recording demos/tutorials

---

## 📚 References

- **VNC Browser Image:** https://hub.docker.com/r/siomiz/chrome
- **Steel Browser:** https://docs.steel.dev
- **Chrome DevTools Protocol:** https://chromedevtools.github.io/devtools-protocol/

---

**Document Version:** 1.1  
**Last Updated:** 2026-01-31  
**Status:** Active
