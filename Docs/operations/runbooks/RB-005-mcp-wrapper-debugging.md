# RB-005: MCP Wrapper Debugging Runbook

**Purpose:** Debug and resolve issues with MCP (Model Context Protocol) wrappers.

**Scope:** All MCP wrappers in `/Users/jeremy/dev/SIN-Solver/mcp-wrappers/`

**Prerequisites:**
- Node.js 18+ installed
- OpenCode CLI configured
- Access to MCP wrapper source code
- Understanding of stdio-based MCP protocol

---

## Table of Contents

1. [MCP Architecture Overview](#1-mcp-architecture-overview)
2. [Quick Diagnostics](#2-quick-diagnostics)
3. [Common Issues & Solutions](#3-common-issues--solutions)
4. [Wrapper-Specific Debugging](#4-wrapper-specific-debugging)
5. [Advanced Debugging](#5-advanced-debugging)
6. [Recovery Procedures](#6-recovery-procedures)

---

## 1. MCP Architecture Overview

### 1.1 MCP Wrapper Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP WRAPPER ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OpenCode / AI System                                            │
│       │                                                          │
│       ▼ stdio (JSON-RPC)                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         MCP Wrapper (Node.js)                             │   │
│  │  - captcha-mcp-wrapper.js                                │   │
│  │  - plane-mcp-wrapper.js                                  │   │
│  │  - sin-*-mcp-wrapper.js                                  │   │
│  │                                                            │   │
│  │  Functions:                                                │   │
│  │  1. Parse stdio input (MCP protocol)                      │   │
│  │  2. Convert to HTTP request                               │   │
│  │  3. Call Docker container API                             │   │
│  │  4. Parse HTTP response                                   │   │
│  │  5. Convert to stdio output (MCP protocol)                │   │
│  └──────────────────────────────────────────────────────────┘   │
│       │                                                          │
│       ▼ HTTP/REST                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Docker Container (HTTP API)                       │   │
│  │  - solver-1.1-captcha-worker:8019                        │   │
│  │  - room-11-plane-mcp:8216                                │   │
│  │  - ...                                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Active MCP Wrappers

| Wrapper | File | Target Service | Port | Tools |
|---------|------|----------------|------|-------|
| Captcha | `captcha-mcp-wrapper.js` | solver-1.1-captcha-worker | 8019 | 11 |
| Plane | `plane-mcp-wrapper.js` | room-11-plane-mcp | 8216 | 8 |
| Scira | `scira-mcp-wrapper.js` | room-30-scira-ai-search | 8230 | 6 |
| Deep Research | `sin-deep-research-mcp-wrapper.js` | Internal | 8204 | 5 |
| Social | `sin-social-mcp-wrapper.js` | Internal | 8203 | 4 |
| Video Gen | `sin-video-gen-mcp-wrapper.js` | Internal | 8205 | 7 |

---

## 2. Quick Diagnostics

### 2.1 Check Wrapper Files Exist

```bash
# List all MCP wrappers
ls -la /Users/jeremy/dev/SIN-Solver/mcp-wrappers/

# Expected Output:
# -rw-r--r--  captcha-mcp-wrapper.js
# -rw-r--r--  plane-mcp-wrapper.js
# -rw-r--r--  scira-mcp-wrapper.js
# -rw-r--r--  sin-deep-research-mcp-wrapper.js
# -rw-r--r--  sin-social-mcp-wrapper.js
# -rw-r--r--  sin-video-gen-mcp-wrapper.js
# -rw-r--r--  README.md
```

### 2.2 Verify Syntax

```bash
# Check all wrappers for syntax errors
for wrapper in /Users/jeremy/dev/SIN-Solver/mcp-wrappers/*-mcp-wrapper.js; do
    echo "Checking: $(basename $wrapper)"
    node -c "$wrapper" && echo "✅ Syntax OK" || echo "❌ Syntax Error"
    echo ""
done
```

### 2.3 Check OpenCode Configuration

```bash
# Verify MCP configuration in opencode.json
cat ~/.config/opencode/opencode.json | jq '.mcp'

# Expected structure:
# {
#   "captcha-solver": {
#     "type": "local",
#     "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js"],
#     "enabled": true,
#     "environment": {
#       "CAPTCHA_API_URL": "https://captcha.delqhi.com"
#     }
#   }
# }
```

### 2.4 Test Wrapper Directly

```bash
# Test wrapper startup (will hang waiting for input, use Ctrl+C to exit)
timeout 5 node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js

# Expected: Should start without errors, then timeout
# If immediate error, check dependencies

# Check dependencies are installed
npm list @modelcontextprotocol/sdk axios

# If not installed:
npm install -g @modelcontextprotocol/sdk axios
```

---

## 3. Common Issues & Solutions

### 3.1 Issue: Wrapper Won't Start

**Symptoms:**
```
$ node captcha-mcp-wrapper.js
Error: Cannot find module '@modelcontextprotocol/sdk'
```

**Diagnosis:**
```bash
# Check if dependencies are installed
ls -la node_modules/@modelcontextprotocol/

# Check Node.js version
node --version

# Expected: v18.x.x or higher
```

**Solution:**
```bash
# Install dependencies globally
npm install -g @modelcontextprotocol/sdk axios

# Or install locally in project
cd /Users/jeremy/dev/SIN-Solver
npm init -y
npm install @modelcontextprotocol/sdk axios

# Verify installation
node -e "require('@modelcontextprotocol/sdk'); console.log('✅ SDK installed')"
```

### 3.2 Issue: API Connection Failed

**Symptoms:**
```
Error: connect ECONNREFUSED localhost:8019
```

**Diagnosis:**
```bash
# Check if target service is running
docker ps | grep captcha

# Test API directly
curl http://localhost:8019/health

# Check environment variables
echo $CAPTCHA_API_URL
```

**Solution:**
```bash
# Start target service
docker start solver-1.1-captcha-worker

# Or restart if unhealthy
docker restart solver-1.1-captcha-worker

# Wait for service to be ready
sleep 10

# Verify
curl http://localhost:8019/health
```

### 3.3 Issue: Tools Not Appearing in OpenCode

**Symptoms:**
```
$ opencode mcp list-tools captcha-solver
Error: MCP server not found or not responding
```

**Diagnosis:**
```bash
# Check OpenCode configuration
cat ~/.config/opencode/opencode.json | jq '.mcp.captcha-solver'

# Verify wrapper path is correct
ls -la /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js

# Check OpenCode logs
opencode --version
# Look for MCP loading errors
```

**Solution:**
```bash
# 1. Verify opencode.json configuration
cat > ~/.config/opencode/opencode.json << 'EOF'
{
  "mcp": {
    "captcha-solver": {
      "type": "local",
      "command": [
        "node",
        "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js"
      ],
      "enabled": true,
      "environment": {
        "CAPTCHA_API_URL": "https://captcha.delqhi.com",
        "CAPTCHA_API_KEY": "${CAPTCHA_API_KEY}"
      }
    }
  }
}
EOF

# 2. Restart OpenCode
opencode --reset

# 3. List tools
opencode mcp list-tools captcha-solver
```

### 3.4 Issue: Tool Call Timeout

**Symptoms:**
```
Tool call timed out after 60000ms
```

**Diagnosis:**
```bash
# Check API response time
time curl -s http://localhost:8019/api/solve/text \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "test", "timeout": 30}'

# Check service logs
docker logs solver-1.1-captcha-worker --tail 50

# Check resource usage
docker stats solver-1.1-captcha-worker --no-stream
```

**Solution:**
```bash
# Increase timeout in wrapper (if needed)
# Edit wrapper file:
const captchaClient = axios.create({
  baseURL: CAPTCHA_API_URL,
  timeout: 120000,  // Increase from 60000
  ...
});

# Or restart service to clear stuck processes
docker restart solver-1.1-captcha-worker

# Scale up if resource constrained
docker update --cpus=2 --memory=4g solver-1.1-captcha-worker
```

### 3.5 Issue: Invalid JSON Response

**Symptoms:**
```
Error: Unexpected token in JSON at position 0
```

**Diagnosis:**
```bash
# Test API response format
curl -s http://localhost:8019/api/status | jq .

# If not valid JSON, check service
docker logs solver-1.1-captcha-worker --tail 20
```

**Solution:**
```bash
# Check if service is returning HTML error page
curl -s http://localhost:8019/api/status | head -20

# If HTML (e.g., nginx error), service is not running properly
docker restart solver-1.1-captcha-worker

# If JSON parsing fails in wrapper, add error handling
# In wrapper, wrap JSON.parse in try-catch
```

### 3.6 Issue: Environment Variables Not Set

**Symptoms:**
```
Error: CAPTCHA_API_URL is not defined
```

**Diagnosis:**
```bash
# Check environment variables
echo $CAPTCHA_API_URL
echo $CAPTCHA_API_KEY

# Check opencode.json environment section
cat ~/.config/opencode/opencode.json | jq '.mcp.captcha-solver.environment'
```

**Solution:**
```bash
# Set environment variables
export CAPTCHA_API_URL="https://captcha.delqhi.com"
export CAPTCHA_API_KEY="your-api-key"

# Or add to shell profile
echo 'export CAPTCHA_API_URL="https://captcha.delqhi.com"' >> ~/.zshrc
source ~/.zshrc

# For OpenCode, add to opencode.json (see section 3.3)
```

---

## 4. Wrapper-Specific Debugging

### 4.1 Captcha MCP Wrapper

```bash
# Test specific tools
# 1. Get solver status
curl -s http://localhost:8019/api/status | jq .

# 2. Test text CAPTCHA solve
curl -s -X POST http://localhost:8019/api/solve/text \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "timeout": 30
  }' | jq .

# 3. Check rate limits
curl -s http://localhost:8019/api/rate-limits | jq .

# Debug wrapper directly
cd /Users/jeremy/dev/SIN-Solver/mcp-wrappers
node -e "
const axios = require('axios');
const client = axios.create({
  baseURL: process.env.CAPTCHA_API_URL || 'http://localhost:8019',
  timeout: 10000
});
client.get('/api/status')
  .then(r => console.log('✅ Status:', r.data))
  .catch(e => console.log('❌ Error:', e.message));
"
```

### 4.2 Plane MCP Wrapper

```bash
# Test Plane API
curl -s http://localhost:8216/health

# Test list projects
curl -s http://localhost:8216/api/projects \
  -H "Authorization: Bearer $PLANE_API_KEY" | jq .

# Debug wrapper
cd /Users/jeremy/dev/SIN-Solver/mcp-wrappers
PLANE_API_URL=http://localhost:8216 node -e "
const axios = require('axios');
const client = axios.create({
  baseURL: process.env.PLANE_API_URL || 'http://localhost:8216',
  timeout: 10000
});
client.get('/health')
  .then(r => console.log('✅ Health:', r.data))
  .catch(e => console.log('❌ Error:', e.message));
"
```

### 4.3 Scira MCP Wrapper

```bash
# Test Scira API
curl -s http://localhost:8230/api/health

# Test search
curl -s -X POST http://localhost:8230/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test query", "limit": 5}' | jq .
```

---

## 5. Advanced Debugging

### 5.1 Enable Debug Logging

```bash
# Create debug version of wrapper
cat > /tmp/debug-captcha-wrapper.js << 'EOF'
#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const axios = require('axios');

// Enable debug logging
const DEBUG = true;
const log = (msg) => {
  if (DEBUG) console.error(`[DEBUG] ${new Date().toISOString()}: ${msg}`);
};

const CAPTCHA_API_URL = process.env.CAPTCHA_API_URL || 'http://localhost:8019';
log(`Starting wrapper with API URL: ${CAPTCHA_API_URL}`);

const captchaClient = axios.create({
  baseURL: CAPTCHA_API_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
});

// Add request/response interceptors for debugging
captchaClient.interceptors.request.use(
  config => {
    log(`Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    log(`Request Error: ${error.message}`);
    return Promise.reject(error);
  }
);

captchaClient.interceptors.response.use(
  response => {
    log(`Response: ${response.status} ${JSON.stringify(response.data).substring(0, 200)}`);
    return response;
  },
  error => {
    log(`Response Error: ${error.message}`);
    return Promise.reject(error);
  }
);

const server = new Server(
  { name: 'captcha-mcp-wrapper-debug', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler('tools/list', async () => {
  log('Received tools/list request');
  return {
    tools: [
      {
        name: 'get_solver_status',
        description: 'Get solver status',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  };
});

server.setRequestHandler('tools/call', async (request) => {
  log(`Received tools/call: ${request.params.name}`);
  try {
    const result = await captchaClient.get('/api/status');
    return { toolResult: result.data };
  } catch (error) {
    log(`Error: ${error.message}`);
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(err => {
  log(`Server error: ${err.message}`);
  console.error(err);
});
EOF

# Run debug wrapper
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node /tmp/debug-captcha-wrapper.js
```

### 5.2 Test MCP Protocol Directly

```bash
# Test MCP protocol manually
# Send initialize request
echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "test", "version": "1.0.0" }
  }
}' | node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js 2>&1 | head -5

# Send tools/list request
echo '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}' | node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js 2>&1 | head -20
```

### 5.3 Monitor Wrapper in Real-Time

```bash
# Start wrapper with tracing
NODE_DEBUG=mcp node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js

# Or use strace (Linux) / dtrace (macOS)
dtrace -n 'syscall::write*:entry /execname=="node"/ { printf("%s: %s", execname, copyinstr(arg1)); }' -c 'node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js'
```

### 5.4 Network Packet Capture

```bash
# Capture traffic between wrapper and API
# Terminal 1: Start capture
sudo tcpdump -i lo0 -w /tmp/mcp-traffic.pcap port 8019

# Terminal 2: Use MCP via OpenCode
opencode mcp call captcha-solver get_solver_status

# Terminal 1: Stop capture (Ctrl+C)
# Analyze with Wireshark
open /tmp/mcp-traffic.pcap
```

---

## 6. Recovery Procedures

### 6.1 Complete Wrapper Rebuild

```bash
# Step 1: Backup existing wrapper
cp /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js \
   /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js.backup

# Step 2: Check out fresh copy from git
cd /Users/jeremy/dev/SIN-Solver
git checkout mcp-wrappers/captcha-mcp-wrapper.js

# Step 3: Verify syntax
node -c /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js

# Step 4: Test
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js 2>&1 | head -5
```

### 6.2 Reset MCP Configuration

```bash
# Step 1: Backup opencode.json
cp ~/.config/opencode/opencode.json ~/.config/opencode/opencode.json.backup

# Step 2: Remove MCP section temporarily
cat ~/.config/opencode/opencode.json | jq 'del(.mcp)' > /tmp/opencode-clean.json
mv /tmp/opencode-clean.json ~/.config/opencode/opencode.json

# Step 3: Restart OpenCode
opencode --reset

# Step 4: Re-add MCP configuration
# (Follow section 3.3)
```

### 6.3 Emergency Bypass

```bash
# If wrapper is completely broken, bypass and use API directly

# Captcha API
curl -s http://localhost:8019/api/status | jq .

# Plane API
curl -s http://localhost:8216/health

# Scira API
curl -s http://localhost:8230/api/health

# Update scripts to use direct API calls until wrapper is fixed
```

### 6.4 Rollback to Previous Version

```bash
# Check git history
cd /Users/jeremy/dev/SIN-Solver
git log --oneline mcp-wrappers/captcha-mcp-wrapper.js | head -5

# Rollback to previous version
git checkout HEAD~1 -- mcp-wrappers/captcha-mcp-wrapper.js

# Verify
node -c mcp-wrappers/captcha-mcp-wrapper.js

# Test
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  node mcp-wrappers/captcha-mcp-wrapper.js 2>&1 | head -5
```

---

## Quick Reference

### Essential Commands

```bash
# Check wrapper syntax
node -c /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js

# Test wrapper directly
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  node /Users/jeremy/dev/SIN-Solver/mcp-wrappers/captcha-mcp-wrapper.js

# List MCP tools in OpenCode
opencode mcp list-tools captcha-solver

# Call MCP tool
opencode mcp call captcha-solver get_solver_status

# Check target API
curl http://localhost:8019/health

# View wrapper logs (if logging enabled)
docker logs <container-using-mcp>
```

### Wrapper Template

```javascript
#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:PORT';
const client = axios.create({ baseURL: API_URL, timeout: 60000 });

const server = new Server(
  { name: 'example-mcp-wrapper', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler('tools/list', async () => ({
  tools: [{ name: 'example', description: 'Example tool', inputSchema: {} }]
}));

server.setRequestHandler('tools/call', async (request) => {
  try {
    const result = await client.get('/api/endpoint');
    return { toolResult: result.data };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
```

---

**Last Updated:** 2026-01-30  
**Version:** 1.0  
**Owner:** Integration Team  
**Review Cycle:** Monthly
