```
 ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗ ██████╗ ██████╗ ███████╗
██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔═══██╗██╔══██╗██╔════╝
██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║     ██║   ██║██║  ██║█████╗  
██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║     ██║   ██║██║  ██║██╔══╝  
╚██████╔╝██║     ███████╗██║ ╚████║╚██████╗╚██████╔╝██████╔╝███████╗
 ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
```

# 🤖 Zimmer-04: OpenCode-Sekretär

**Port:** 9000 | **IP:** 172.20.0.4 | **Network:** sin-solver-network

> *"AI-powered code generation and review - The intelligent secretary of the 23-Room Empire"*

---

## 📋 Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Architektur](#architektur)
3. [Features](#features)
4. [API-Referenz](#api-referenz)
5. [Konfiguration](#konfiguration)
6. [Docker Deployment](#docker-deployment)
7. [Inter-Service Kommunikation](#inter-service-kommunikation)
8. [Verwendungsbeispiele](#verwendungsbeispiele)
9. [AI Provider Integration](#ai-provider-integration)
10. [Code Generation Pipeline](#code-generation-pipeline)
11. [Monitoring](#monitoring)
12. [Troubleshooting](#troubleshooting)
13. [Sicherheit](#sicherheit)
14. [Kostenanalyse](#kostenanalyse)
15. [Version History](#version-history)

---

## 🎯 Übersicht

### Was ist der OpenCode-Sekretär?

Zimmer-04 ist der zentrale AI-gestützte Code-Generator und Review-Service des SIN-Solver Ökosystems. Als "Sekretär" des 23-Room Empire übernimmt er die intelligente Unterstützung bei:

- **Code Generation** - Automatische Generierung von Production-Ready Code
- **Code Review** - AI-gestützte Codeanalyse und Verbesserungsvorschläge
- **Documentation Generation** - Automatische JSDoc/TSDoc Kommentare
- **Refactoring Suggestions** - Intelligente Refactoring-Empfehlungen
- **Test Generation** - Automatische Unit-Test Erstellung

### Rolle im 23-Room Empire

| Aspekt | Beschreibung |
|--------|-------------|
| **Zimmer-Nummer** | 04 (Viertes Zimmer im Empire) |
| **Codename** | OpenCode-Sekretär |
| **Primäre Funktion** | AI Code Generation & Review |
| **Abhängigkeiten** | Zimmer-13 (API Coordinator), Zimmer-02 (Chronos) |
| **Konsumenten** | Alle Entwicklungs-Workflows |
| **Status** | Production Ready |

### Schlüsselfähigkeiten

```
┌─────────────────────────────────────────────────────────────────┐
│                    OPENCODE CAPABILITIES                        │
├─────────────────────────────────────────────────────────────────┤
│  ✓ Multi-Model Support (OpenCode Zen, Gemini, Mistral, Groq)  │
│  ✓ Context-Aware Code Generation                               │
│  ✓ Streaming Response Support                                  │
│  ✓ Code Review mit Severity Levels                             │
│  ✓ Auto-Documentation Generation                               │
│  ✓ Test Generation (Jest, Vitest, pytest)                      │
│  ✓ Refactoring Recommendations                                 │
│  ✓ Security Vulnerability Detection                            │
│  ✓ Performance Optimization Tips                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architektur

### System-Architektur Diagramm

```
                            ┌─────────────────────────┐
                            │     Zimmer-02           │
                            │     Chronos             │
                            │   (Task Scheduling)     │
                            └───────────┬─────────────┘
                                        │
                                        ▼
┌─────────────────┐         ┌─────────────────────────┐         ┌─────────────────┐
│   Zimmer-13     │◄───────▶│      Zimmer-04          │◄───────▶│   Zimmer-08     │
│ API Coordinator │         │   OPENCODE-SEKRETÄR     │         │   QA-Prüfer     │
│  (Requests)     │         │     Port: 9000          │         │   (Testing)     │
└─────────────────┘         └───────────┬─────────────┘         └─────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
            ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
            │  OpenCode   │     │   Gemini    │     │   Mistral   │
            │    Zen      │     │   (FREE)    │     │   (FREE)    │
            │   (FREE)    │     │             │     │             │
            └─────────────┘     └─────────────┘     └─────────────┘
```

### Interne Komponenten

```
zimmer-04-opencode/
├── server.js                    # Express Server Entry Point
├── package.json                 # Dependencies
├── Dockerfile                   # Container Definition
├── docker-compose.yml           # Service Configuration
├── .env.example                 # Environment Template
├── src/
│   ├── index.js                 # Main Application
│   ├── config/
│   │   ├── index.js             # Configuration Manager
│   │   ├── providers.js         # AI Provider Config
│   │   └── prompts.js           # System Prompts
│   ├── providers/
│   │   ├── index.js             # Provider Factory
│   │   ├── opencode-zen.js      # OpenCode Zen Integration
│   │   ├── gemini.js            # Google Gemini Integration
│   │   ├── mistral.js           # Mistral AI Integration
│   │   ├── groq.js              # Groq Integration
│   │   └── fallback.js          # Fallback Chain Logic
│   ├── services/
│   │   ├── generator.js         # Code Generation Service
│   │   ├── reviewer.js          # Code Review Service
│   │   ├── documenter.js        # Documentation Generator
│   │   ├── tester.js            # Test Generator
│   │   └── refactor.js          # Refactoring Service
│   ├── routes/
│   │   ├── index.js             # Route Registry
│   │   ├── generate.js          # /generate Endpoints
│   │   ├── review.js            # /review Endpoints
│   │   ├── docs.js              # /docs Endpoints
│   │   └── health.js            # /health Endpoints
│   ├── middleware/
│   │   ├── auth.js              # Authentication
│   │   ├── rateLimit.js         # Rate Limiting
│   │   └── logging.js           # Request Logging
│   └── utils/
│       ├── parser.js            # Code Parser
│       ├── formatter.js         # Code Formatter
│       └── validator.js         # Input Validation
├── tests/
│   ├── unit/
│   │   ├── generator.test.js
│   │   ├── reviewer.test.js
│   │   └── providers.test.js
│   └── integration/
│       └── api.test.js
└── logs/
    └── app.log
```

---

## 🔧 Features

### Feature-Matrix

| Feature | Beschreibung | Status | Provider |
|---------|-------------|--------|----------|
| **Code Generation** | Generiert Code aus natürlicher Sprache | ✅ Aktiv | OpenCode Zen |
| **Code Review** | Analysiert Code auf Qualität & Bugs | ✅ Aktiv | OpenCode Zen |
| **Documentation** | Generiert JSDoc/TSDoc Kommentare | ✅ Aktiv | Gemini |
| **Test Generation** | Erstellt Unit Tests automatisch | ✅ Aktiv | OpenCode Zen |
| **Refactoring** | Schlägt Code-Verbesserungen vor | ✅ Aktiv | Mistral |
| **Security Scan** | Findet Sicherheitslücken | ✅ Aktiv | OpenCode Zen |
| **Performance Tips** | Optimierungsvorschläge | ✅ Aktiv | Gemini |
| **Multi-Language** | Python, JS, TS, Go, Rust, etc. | ✅ Aktiv | Alle |
| **Streaming** | Real-time Response Streaming | ✅ Aktiv | OpenCode Zen |
| **Context Window** | 200K Token Context | ✅ Aktiv | OpenCode Zen |

### Unterstützte Programmiersprachen

| Sprache | Code Gen | Review | Docs | Tests |
|---------|----------|--------|------|-------|
| JavaScript | ✅ | ✅ | ✅ | ✅ |
| TypeScript | ✅ | ✅ | ✅ | ✅ |
| Python | ✅ | ✅ | ✅ | ✅ |
| Go | ✅ | ✅ | ✅ | ✅ |
| Rust | ✅ | ✅ | ✅ | ✅ |
| Java | ✅ | ✅ | ✅ | ✅ |
| C# | ✅ | ✅ | ✅ | ✅ |
| PHP | ✅ | ✅ | ✅ | ✅ |
| Ruby | ✅ | ✅ | ✅ | ✅ |
| SQL | ✅ | ✅ | ✅ | ❌ |

---

## 📡 API-Referenz

### Basis-URL

```
http://172.20.0.4:9000
http://zimmer-04-opencode:9000 (Docker Network)
http://localhost:9000 (Host Port Mapping: 9004:9000)
```

### Endpoints

#### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "zimmer-04-opencode",
  "version": "2.0.0",
  "uptime": 86400,
  "providers": {
    "opencode-zen": "connected",
    "gemini": "connected",
    "mistral": "connected",
    "groq": "connected"
  },
  "timestamp": "2026-01-27T01:00:00Z"
}
```

#### Code Generation

```http
POST /generate
Content-Type: application/json
```

**Request Body:**
```json
{
  "prompt": "Create a REST API endpoint for user authentication with JWT",
  "language": "typescript",
  "framework": "express",
  "options": {
    "includeTests": true,
    "includeDocumentation": true,
    "style": "functional"
  }
}
```

**Response:**
```json
{
  "success": true,
  "code": "// Generated code here...",
  "tests": "// Generated tests here...",
  "documentation": "// JSDoc comments...",
  "tokens": {
    "input": 150,
    "output": 1200
  },
  "provider": "opencode-zen",
  "duration_ms": 2500
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:9004/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a function to validate email addresses",
    "language": "javascript"
  }'
```

#### Code Review

```http
POST /review
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "function add(a, b) { return a + b }",
  "language": "javascript",
  "strictness": "high",
  "focus": ["security", "performance", "style"]
}
```

**Response:**
```json
{
  "success": true,
  "score": 7.5,
  "issues": [
    {
      "severity": "warning",
      "line": 1,
      "message": "Missing type annotations",
      "suggestion": "Use TypeScript or JSDoc for type safety"
    },
    {
      "severity": "info",
      "line": 1,
      "message": "Consider adding input validation",
      "suggestion": "Add null/undefined checks"
    }
  ],
  "summary": "Code is functional but lacks type safety and validation",
  "provider": "opencode-zen"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:9004/review \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const x = 1; console.log(x)",
    "language": "javascript"
  }'
```

#### Documentation Generation

```http
POST /docs
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "async function fetchUser(id) { const res = await fetch(`/api/users/${id}`); return res.json(); }",
  "language": "javascript",
  "style": "jsdoc"
}
```

**Response:**
```json
{
  "success": true,
  "documentation": "/**\n * Fetches a user by ID from the API\n * @async\n * @param {string|number} id - The user ID\n * @returns {Promise<Object>} The user object\n * @throws {Error} If the fetch fails\n */",
  "provider": "gemini"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:9004/docs \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function greet(name) { return `Hello, ${name}!`; }",
    "language": "javascript",
    "style": "jsdoc"
  }'
```

#### Test Generation

```http
POST /tests
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "function add(a, b) { return a + b; }",
  "language": "javascript",
  "framework": "jest",
  "coverage": "comprehensive"
}
```

**Response:**
```json
{
  "success": true,
  "tests": "describe('add', () => {\n  it('should add two positive numbers', () => {\n    expect(add(2, 3)).toBe(5);\n  });\n  it('should handle negative numbers', () => {\n    expect(add(-1, 1)).toBe(0);\n  });\n  it('should handle zero', () => {\n    expect(add(0, 0)).toBe(0);\n  });\n});",
  "provider": "opencode-zen"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:9004/tests \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const multiply = (a, b) => a * b;",
    "language": "javascript",
    "framework": "jest"
  }'
```

#### Refactoring Suggestions

```http
POST /refactor
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "function foo(arr) { var result = []; for (var i = 0; i < arr.length; i++) { result.push(arr[i] * 2); } return result; }",
  "language": "javascript",
  "target": "modern"
}
```

**Response:**
```json
{
  "success": true,
  "refactored": "const doubleArray = (arr) => arr.map(item => item * 2);",
  "changes": [
    "Replaced var with const",
    "Replaced for loop with map()",
    "Renamed function for clarity",
    "Used arrow function syntax"
  ],
  "provider": "mistral"
}
```

#### Streaming Generation

```http
POST /generate/stream
Content-Type: application/json
Accept: text/event-stream
```

**Request Body:**
```json
{
  "prompt": "Create a complete Express.js REST API with CRUD operations",
  "language": "typescript"
}
```

**Response (SSE Stream):**
```
data: {"chunk": "import express", "done": false}
data: {"chunk": " from 'express';", "done": false}
data: {"chunk": "\n\nconst app = express();", "done": false}
...
data: {"chunk": "", "done": true, "tokens": {"input": 50, "output": 2000}}
```

---

## ⚙️ Konfiguration

### Environment Variables

| Variable | Beschreibung | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server Port | `9000` | No |
| `NODE_ENV` | Environment | `production` | No |
| `OPENCODE_API_KEY` | OpenCode Zen API Key | - | Yes |
| `OPENCODE_API_URL` | OpenCode API Endpoint | `https://api.opencode.ai/v1` | No |
| `GEMINI_API_KEY` | Google Gemini API Key | - | Fallback |
| `MISTRAL_API_KEY` | Mistral AI API Key | - | Fallback |
| `GROQ_API_KEY` | Groq API Key | - | Fallback |
| `LOG_LEVEL` | Logging Level | `info` | No |
| `RATE_LIMIT_RPM` | Requests per Minute | `60` | No |
| `MAX_TOKEN_OUTPUT` | Max Output Tokens | `128000` | No |
| `TIMEOUT_MS` | Request Timeout | `120000` | No |
| `REDIS_URL` | Redis für Caching | - | Optional |
| `ENABLE_STREAMING` | Enable SSE Streaming | `true` | No |

### .env.example

```bash
# Server Configuration
PORT=9000
NODE_ENV=production
LOG_LEVEL=info

# Primary AI Provider (FREE)
OPENCODE_API_KEY=your_opencode_api_key
OPENCODE_API_URL=https://api.opencode.ai/v1
OPENCODE_MODEL=zen/big-pickle

# Fallback Providers (FREE)
GEMINI_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key
GROQ_API_KEY=your_groq_api_key

# Performance
RATE_LIMIT_RPM=60
MAX_TOKEN_OUTPUT=128000
TIMEOUT_MS=120000
ENABLE_STREAMING=true

# Caching (Optional)
REDIS_URL=redis://zimmer-15-surfsense:6379

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

### Provider Priority Chain

```javascript
// Fallback Chain Configuration
const providerChain = [
  { name: 'opencode-zen', priority: 1, cost: 0 },
  { name: 'gemini', priority: 2, cost: 0 },
  { name: 'mistral', priority: 3, cost: 0 },
  { name: 'groq', priority: 4, cost: 0 }
];
```

---

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

LABEL maintainer="SIN-Solver Team"
LABEL service="zimmer-04-opencode"
LABEL version="2.0.0"

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9000/health || exit 1

# Expose port
EXPOSE 9000

# Start server
CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  zimmer-04-opencode:
    build: .
    image: sin-solver/zimmer-04-opencode:latest
    container_name: zimmer-04-opencode
    hostname: zimmer-04-opencode
    restart: unless-stopped
    ports:
      - "9004:9000"
    environment:
      - PORT=9000
      - NODE_ENV=production
      - OPENCODE_API_KEY=${OPENCODE_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - MISTRAL_API_KEY=${MISTRAL_API_KEY}
      - GROQ_API_KEY=${GROQ_API_KEY}
    networks:
      sin-solver-network:
        ipv4_address: 172.20.0.4
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:9000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

networks:
  sin-solver-network:
    external: true
```

### Build & Deploy Commands

```bash
# Build Image
docker build -t sin-solver/zimmer-04-opencode:latest .

# Run Container
docker run -d \
  --name zimmer-04-opencode \
  --network sin-solver-network \
  --ip 172.20.0.4 \
  -p 9004:9000 \
  -e OPENCODE_API_KEY=${OPENCODE_API_KEY} \
  sin-solver/zimmer-04-opencode:latest

# View Logs
docker logs -f zimmer-04-opencode

# Save Image (Docker Sovereignty)
docker save sin-solver/zimmer-04-opencode:latest \
  -o /Users/jeremy/dev/SIN-Code/Docker/sin-solver/images/zimmer-04-opencode.tar
```

---

## 🔗 Inter-Service Kommunikation

### Verbundene Zimmer

```
┌─────────────────────────────────────────────────────────────────┐
│                   ZIMMER-04 CONNECTIONS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INBOUND (Requests von):                                        │
│  ├── Zimmer-02 (Chronos) ────────── Scheduled Code Tasks       │
│  ├── Zimmer-13 (API Coordinator) ── API Gateway Requests       │
│  ├── Zimmer-11 (Dashboard) ──────── UI Code Generation         │
│  └── Zimmer-14 (Worker) ─────────── Background Code Tasks      │
│                                                                 │
│  OUTBOUND (Requests zu):                                        │
│  ├── Zimmer-08 (QA-Prüfer) ──────── Test Validation            │
│  ├── Zimmer-09 (ClawdBot) ───────── Completion Notifications   │
│  └── Zimmer-15 (Surfsense) ──────── Code Caching               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Service Discovery

| Zimmer | Hostname | Port | Verwendung |
|--------|----------|------|------------|
| 02 | zimmer-02-chronos | 3001 | Task Scheduling |
| 08 | zimmer-08-qa | 8080 | Test Validation |
| 09 | zimmer-09-clawdbot | 8080 | Notifications |
| 11 | zimmer-11-dashboard | 3000 | UI Integration |
| 13 | zimmer-13-api-coordinator | 8000 | API Gateway |
| 14 | zimmer-14-worker | 8080 | Background Tasks |
| 15 | zimmer-15-surfsense | 6333 | Caching/Vector DB |

---

## 📝 Verwendungsbeispiele

### 1. Einfache Code-Generierung

```bash
# Generate a JavaScript function
curl -X POST http://localhost:9004/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a function to deep clone an object",
    "language": "javascript"
  }'
```

### 2. TypeScript mit Tests

```bash
# Generate TypeScript code with tests
curl -X POST http://localhost:9004/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a UserService class with CRUD methods",
    "language": "typescript",
    "options": {
      "includeTests": true,
      "framework": "express"
    }
  }'
```

### 3. Code Review mit Fokus

```bash
# Review code focusing on security
curl -X POST http://localhost:9004/review \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const sql = `SELECT * FROM users WHERE id = ${userId}`",
    "language": "javascript",
    "focus": ["security"]
  }'
```

### 4. Python mit Documentation

```bash
# Generate Python with docstrings
curl -X POST http://localhost:9004/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a FastAPI endpoint for file upload with validation",
    "language": "python",
    "options": {
      "includeDocumentation": true,
      "style": "google-docstring"
    }
  }'
```

### 5. Streaming Response (JavaScript)

```javascript
// Using EventSource for streaming
const eventSource = new EventSource('/generate/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.done) {
    console.log('Generation complete:', data.tokens);
    eventSource.close();
  } else {
    process.stdout.write(data.chunk);
  }
};
```

---

## 🤖 AI Provider Integration

### OpenCode Zen (Primary)

```javascript
// OpenCode Zen Configuration
const openCodeConfig = {
  baseURL: 'https://api.opencode.ai/v1',
  model: 'zen/big-pickle',
  maxTokens: 128000,
  contextWindow: 200000,
  streaming: true,
  features: ['uncensored', 'function-calling', 'coding']
};
```

### Provider Fallback Logic

```javascript
async function generateWithFallback(prompt) {
  const providers = ['opencode-zen', 'gemini', 'mistral', 'groq'];
  
  for (const provider of providers) {
    try {
      return await generate(provider, prompt);
    } catch (error) {
      console.warn(`${provider} failed, trying next...`);
    }
  }
  
  throw new Error('All providers failed');
}
```

---

## 📊 Monitoring

### Health Check Endpoint

```bash
# Check service health
curl http://localhost:9004/health | jq
```

### Metrics Endpoint

```bash
# Get service metrics
curl http://localhost:9004/metrics
```

### Log Locations

```
/app/logs/app.log          # Application logs
/app/logs/error.log        # Error logs
/app/logs/access.log       # Access logs
```

### Prometheus Metrics

```
# HELP opencode_requests_total Total requests
# TYPE opencode_requests_total counter
opencode_requests_total{endpoint="generate"} 1523
opencode_requests_total{endpoint="review"} 847

# HELP opencode_response_time_ms Response time in milliseconds
# TYPE opencode_response_time_ms histogram
opencode_response_time_ms{endpoint="generate"} 2500
```

---

## 🔧 Troubleshooting

### Häufige Probleme

#### 1. Provider Connection Timeout

**Problem:** API requests zu OpenCode Zen timeout.

**Lösung:**
```bash
# Check provider status
curl https://api.opencode.ai/v1/health

# Increase timeout
export TIMEOUT_MS=180000

# Check network connectivity
docker exec zimmer-04-opencode ping api.opencode.ai
```

#### 2. Rate Limiting Errors

**Problem:** 429 Too Many Requests.

**Lösung:**
```bash
# Reduce rate limit
export RATE_LIMIT_RPM=30

# Enable request queuing
export ENABLE_QUEUE=true
```

#### 3. Memory Issues

**Problem:** Container wird wegen OOM killed.

**Lösung:**
```yaml
# Increase memory limit in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1G
```

#### 4. Streaming Not Working

**Problem:** SSE stream closes immediately.

**Lösung:**
```bash
# Check streaming is enabled
curl http://localhost:9004/health | jq '.streaming'

# Ensure correct headers
curl -H "Accept: text/event-stream" http://localhost:9004/generate/stream
```

#### 5. Invalid API Key

**Problem:** 401 Unauthorized responses.

**Lösung:**
```bash
# Verify API key is set
docker exec zimmer-04-opencode printenv | grep API_KEY

# Restart with correct key
docker restart zimmer-04-opencode
```

---

## 🔒 Sicherheit

### Best Practices

1. **API Key Management**
   - Speichere Keys nur in Environment Variables
   - Rotiere Keys regelmäßig
   - Verwende nie Keys im Code

2. **Input Validation**
   - Alle Inputs werden sanitized
   - Max Token Limits werden enforced
   - Malicious Code Patterns werden geblockt

3. **Rate Limiting**
   - 60 Requests pro Minute Default
   - Per-IP Rate Limiting aktiv
   - Burst Protection implementiert

4. **Network Security**
   - Nur im Docker Network erreichbar (außer Port Mapping)
   - HTTPS für externe API Calls
   - IP Whitelist für Produktion empfohlen

### Security Headers

```javascript
// Implemented security headers
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS }));
app.disable('x-powered-by');
```

---

## 💰 Kostenanalyse

### **100% FREE - KEINE KOSTEN**

| Provider | Kosten | Limits |
|----------|--------|--------|
| OpenCode Zen | **$0.00** | Unlimited |
| Google Gemini | **$0.00** | Free Tier |
| Mistral AI | **$0.00** | Free Tier |
| Groq | **$0.00** | Free Tier |

### Warum kostenlos?

- OpenCode Zen bietet unlimitierten FREE Tier
- Gemini Free Tier: 60 RPM, 1M Tokens/Tag
- Mistral Free Tier: Unlimitiert für Open Models
- Groq Free Tier: 30 RPM

---

## 📜 Version History

### v2.0.0 (2026-01-27) - CURRENT
- Multi-Provider Fallback Chain
- Streaming Response Support
- Test Generation Feature
- Refactoring Service
- 200K Context Window Support

### v1.5.0 (2026-01-15)
- Added Gemini Integration
- Improved Code Review
- Security Scan Feature

### v1.0.0 (2026-01-01)
- Initial Release
- Basic Code Generation
- OpenCode Zen Integration

---

## 🔗 Verwandte Dokumentation

- [AGENTS.md](/Users/jeremy/dev/SIN-Solver/AGENTS.md) - 23-Room Empire Übersicht
- [Zimmer-13 API Coordinator](/Users/jeremy/dev/SIN-Solver/services/zimmer-13-api-coordinator/README.md)
- [Zimmer-08 QA-Prüfer](/Users/jeremy/dev/SIN-Solver/services/zimmer-08-qa/README.md)

---

**Port:** 9000 | **IP:** 172.20.0.4 | **Version:** 2.0.0 | **Last Updated:** 2026-01-27

*"AI-powered code generation - The intelligent secretary of the 23-Room Empire"*
