# ADR-003: MCP Wrapper Pattern

## Status

**Accepted** (2026-01-29)

## Context

OpenCode verwendet das Model Context Protocol (MCP) für Tool-Integration. MCP-Server kommunizieren über **stdio** (stdin/stdout) mit dem Client.

Unsere Services laufen als **Docker Container** mit **HTTP APIs**.

Das Problem:
```
OpenCode Client ──stdio──► MCP Server
Docker Container ──HTTP──► API Endpoints
```

Diese Protokolle sind inkompatibel.

## Decision

Wir implementieren ein **MCP Wrapper Pattern**: Ein stdio-basiertes Node.js/Python-Skript, das HTTP-Calls an Docker-Container weiterleitet.

### Architektur

```
OpenCode Client
    ↓ (stdio)
MCP Wrapper (Node.js)
    ↓ (HTTP)
Docker Container (FastAPI/Express)
    ↓ (Internal)
Service Logic
```

### Wrapper-Implementierung

```javascript
// mcp-wrappers/plane-mcp-wrapper.js
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const axios = require('axios');

const API_URL = process.env.API_URL || 'https://plane.delqhi.com';

const server = new Server(
  { name: 'plane-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_issue',
      description: 'Create a new issue in Plane',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['title']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'create_issue':
      const response = await axios.post(`${API_URL}/api/issues`, args);
      return { toolResult: response.data };
  }
});

const transport = new StdioServerTransport();
server.connect(transport);
```

### OpenCode Konfiguration

```json
{
  "mcp": {
    "plane": {
      "type": "local",
      "command": ["node", "/Users/jeremy/dev/SIN-Solver/mcp-wrappers/plane-mcp-wrapper.js"],
      "enabled": true,
      "environment": {
        "API_URL": "https://plane.delqhi.com",
        "API_KEY": "${PLANE_API_KEY}"
      }
    }
  }
}
```

## Consequences

### Positive

1. **Protokoll-Kompatibilität**: Docker HTTP → MCP stdio ✓
2. **Einfache Entwicklung**: Container bleiben standard HTTP APIs
3. **Testbarkeit**: Wrapper und Container unabhängig testbar
4. **Wiederverwendbar**: Wrapper-Pattern für alle Container
5. **Keine OpenCode-Änderung**: Funktioniert mit aktuellem OpenCode

### Negative

1. **Zusätzliche Schicht**: Mehr Code zu warten
2. **Performance**: Zusätzlicher stdio ↔ HTTP Overhead
3. **Komplexität**: Zwei Prozesse statt einem
4. **Debugging**: Fehler können in Wrapper ODER Container sein

### Trade-offs

| Aspekt | Alternative | Warum Wrapper besser |
|--------|-------------|---------------------|
| Protokoll | Native MCP in Container | Docker Container = HTTP, nicht stdio |
| Performance | Direkte Integration | Akzeptabler Overhead für Flexibilität |
| Wartung | Kein Wrapper | Wrapper ist einmalig, wiederverwendbar |

## Alternatives Considered

### Alternative 1: Native MCP in Docker

Container direkt als MCP-Server implementieren:

```javascript
// Container startet MCP-Server über stdio
// Problem: Docker Container haben kein TTY für stdio
```

**Abgelehnt**:
- Docker ist für HTTP Services designed
- stdio in Container ist komplex
- Keine Standard-Lösung

### Alternative 2: OpenCode HTTP Support

Feature Request: OpenCode soll HTTP MCPs nativ unterstützen:

```json
{
  "mcp": {
    "plane": {
      "type": "remote",
      "url": "https://plane.delqhi.com/mcp"
    }
  }
}
```

**Abgelehnt**:
- OpenCode unterstützt aktuell nur stdio
- Keine Kontrolle über OpenCode-Entwicklung
- Wrapper funktioniert heute

### Alternative 3: Sidecar Pattern

Jeder Container hat einen Sidecar-Wrapper:

```yaml
services:
  plane:
    image: plane:latest
  plane-mcp:
    image: mcp-wrapper:latest
    command: ["--target", "plane:8080"]
```

**Abgelehnt**:
- Doppelt so viele Container
- Mehr Ressourcen
- Komplexeres Setup

## Implementation

### Verzeichnisstruktur

```
SIN-Solver/
├── mcp-wrappers/
│   ├── README.md
│   ├── plane-mcp-wrapper.js
│   ├── captcha-mcp-wrapper.js
│   ├── survey-mcp-wrapper.js
│   └── vault-mcp-wrapper.js
```

### Wrapper-Template

```javascript
// mcp-wrappers/TEMPLATE.js
const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

// 1. Define Tools
const TOOLS = [
  {
    name: 'example_action',
    description: 'Does something',
    inputSchema: { /* ... */ }
  }
];

// 2. Implement Handlers
async function handleTool(name, args) {
  const response = await fetch(`${API_URL}/api/${name}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify(args)
  });
  return response.json();
}

// 3. Connect to stdio
// ... (Standard MCP Boilerplate)
```

### Testing

```bash
# Wrapper testen
echo '{"method": "tools/list"}' | node plane-mcp-wrapper.js

# Integration testen
opencode --version  # Sollte keinen Fehler zeigen
```

## References

- [MCP SDK Docs](https://github.com/modelcontextprotocol/typescript-sdk)
- [mcp-wrappers/README.md](../../../mcp-wrappers/README.md)
- [AGENTS.md](../../../AGENTS.md) - MANDATE 0.33

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-29 | Sisyphus | Initial ADR created |

---

**Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)**

Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
