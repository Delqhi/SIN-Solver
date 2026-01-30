# OpenCode CLI HTTP Proxy

HTTP Proxy für OpenCode CLI mit CORS-Unterstützung für das Delqhi-Platform Dashboard.

## Problem

OpenCode CLI ist ein lokales Kommandozeilen-Tool ohne HTTP-API. Das Delqhi-Platform Dashboard kann nicht direkt auf die CLI zugreifen.

## Lösung

Dieser Proxy bietet eine HTTP-API mit CORS-Unterstützung, die das Dashboard nutzen kann, um OpenCode CLI-Befehle auszuführen.

## Installation

```bash
cd /Users/jeremy/dev/SIN-Solver/services/opencode-cli-proxy
pip install flask flask-cors
```

## Start

```bash
# Production
python3 server.py

# Development
python3 server.py --debug

# Custom port
python3 server.py --port 9999
```

## API Endpoints

### Health Check
```
GET /api/health
```

### OpenCode Version
```
GET /api/opencode/version
```

### List Models
```
GET /api/opencode/models
```

### List MCP Servers
```
GET /api/opencode/mcp/list
```

### List MCP Tools
```
POST /api/opencode/mcp/tools
Body: {"server": "captcha"}
```

### Call MCP Tool
```
POST /api/opencode/mcp/call
Body: {"server": "captcha", "tool": "solve_text", "args": ["..."]}
```

### Generate Code
```
POST /api/opencode/generate
Body: {"prompt": "Create a function...", "model": "google/antigravity-gemini-3-flash"}
```

### Get Config
```
GET /api/opencode/config
```

### Get Status
```
GET /api/opencode/status
```

## CORS Konfiguration

Der Proxy erlaubt CORS-Requests von:
- http://localhost:3000
- http://localhost:3001
- http://localhost:3011
- https://delqhi.com
- https://*.delqhi.com

## Docker

```bash
# Build
docker build -t opencode-cli-proxy .

# Run
docker run -d -p 9999:9999 --name opencode-proxy opencode-cli-proxy
```

## Integration mit Dashboard

```javascript
// Dashboard JavaScript
const OPCODE_PROXY = 'http://localhost:9999';

// Execute opencode command
async function executeOpenCode(command, args) {
  const response = await fetch(`${OPCODE_PROXY}/api/opencode/${command}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  return response.json();
}

// Example: Generate code
const result = await executeOpenCode('generate', {
  prompt: 'Create a React component',
  model: 'google/antigravity-gemini-3-flash'
});
```

## Sicherheit

⚠️ **WICHTIG:** Dieser Proxy führt Befehle auf dem Server aus. In Produktion:
- Authentifizierung hinzufügen
- CORS auf spezifische Domains beschränken
- Rate Limiting implementieren
- Input validieren

## Port

Standard: **9999**

## Lizenz

MIT
