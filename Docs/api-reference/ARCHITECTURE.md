# SIN-Solver Dashboard API - Architektur-Dokumentation

## Übersicht

Dieses Dokument beschreibt die Architektur, den Datenfluss und die Komponenten der SIN-Solver Dashboard API.

---

## Architektur-Diagramm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│   │   Web UI     │  │  Mobile App  │  │   CLI Tool   │  │  Third-Party │   │
│   │  (Next.js)   │  │   (React)    │  │   (Python)   │  │    Apps      │   │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│          │                 │                 │                 │           │
│          └─────────────────┴─────────────────┴─────────────────┘           │
│                                    │                                        │
│                              HTTPS/WSS                                     │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY LAYER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      API Gateway (Nginx/Traefik)                     │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│   │  │   Routing    │  │  Rate Limit  │  │     SSL      │              │   │
│   │  │              │  │              │  │  Termination │              │   │
│   │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│   │  │   Auth       │  │    CORS      │  │   Logging    │              │   │
│   │  │ Middleware   │  │   Headers    │  │              │              │   │
│   │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Base URL: https://api.delqhi.com                                          │
│   WebSocket: wss://api.delqhi.com/ws                                        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SERVICE LAYER (FastAPI)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     API Router / Dispatcher                          │   │
│   │                                                                      │   │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │   │
│   │   │   Captcha    │  │   Workflow   │  │    Chat      │             │   │
│   │   │   Router     │  │   Router     │  │   Router     │             │   │
│   │   │              │  │              │  │              │             │   │
│   │   │ /api/captcha │  │ /api/workflows│  │ /api/chat    │             │   │
│   │   │              │  │              │  │              │             │   │
│   │   │ • status     │  │ • generate   │  │ • message    │             │   │
│   │   │ • solve      │  │ • correct    │  │ • history    │             │   │
│   │   │ • stats      │  │ • active     │  │ • sessions   │             │   │
│   │   │ • types      │  │ • execute    │  │              │             │   │
│   │   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │   │
│   │          │                 │                 │                      │   │
│   │          └─────────────────┴─────────────────┘                      │   │
│   │                            │                                        │   │
│   │   ┌─────────────────────────────────────────────────────────────┐  │   │
│   │   │              Shared Middleware & Utilities                   │  │   │
│   │   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │   │
│   │   │  │   Auth   │ │ Validation│ │  Error   │ │  Logger  │       │  │   │
│   │   │  │ Handler  │ │ Handler  │ │ Handler  │ │          │       │  │   │
│   │   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │  │   │
│   │   └─────────────────────────────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
┌───────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   CAPTCHA SERVICE     │  │ WORKFLOW SERVICE │  │   CHAT SERVICE   │
├───────────────────────┤  ├──────────────────┤  ├──────────────────┤
│                       │  │                  │  │                  │
│ ┌───────────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │
│ │   YOLO Engine     │ │  │ │ AI Generator │ │  │ │   AI Model   │ │
│ │   (v8.4.7)        │ │  │ │   (LLM)      │ │  │ │   (LLM)      │ │
│ │                   │ │  │ │              │ │  │ │              │ │
│ │ • Classification  │ │  │ │ • Prompt     │ │  │ │ • Context    │ │
│ │ • Detection       │ │  │ │   Processing │ │  │ │   Awareness  │ │
│ │ • Confidence      │ │  │ │ • n8n JSON   │ │  │ │ • Actions    │ │
│ └─────────┬─────────┘ │  │ │   Generation │ │  │ │   Gen        │ │
│           │           │  │ └──────┬───────┘ │  │ └──────┬───────┘ │
│ ┌─────────▼─────────┐ │  │        │         │  │        │         │
│ │   OCR Engine      │ │  │ ┌──────▼──────┐  │  │ ┌──────▼──────┐  │
│ │                   │ │  │ │ n8n Client  │  │  │ │  Context    │  │
│ │ • Tesseract       │ │  │ │             │  │  │ │  Manager    │  │
│ │ • EasyOCR         │ │  │ │ • Deploy    │  │  │ │             │  │
│ │ • Custom Models   │ │  │ │ • Execute   │  │  │ │ • Session   │  │
│ └─────────┬─────────┘ │  │ │ • Monitor   │  │  │ │   Store     │  │
│           │           │  │ └─────────────┘  │  │ │ • History   │  │
│ ┌─────────▼─────────┐ │  │                  │  │ └─────────────┘  │
│ │ Consensus Engine  │ │  │ ┌──────────────┐ │  │                  │
│ │                   │ │  │ │ Workflow DB  │ │  │ ┌──────────────┐ │
│ │ • Multi-Model     │ │  │ │              │ │  │ │  Chat DB     │ │
│ │ • Voting          │ │  │ │ • Templates  │ │  │ │              │ │
│ │ • Confidence      │ │  │ │ • Versions   │ │  │ │ • Messages   │ │
│ └───────────────────┘ │  │ │ • Executions │ │  │ │ • Sessions   │ │
│                       │  │ └──────────────┘ │  │ └──────────────┘ │
└───────────────────────┘  └──────────────────┘  └──────────────────┘
           │                         │                    │
           └─────────────────────────┼────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│   │   PostgreSQL     │  │     Redis        │  │   File Storage   │         │
│   │                  │  │                  │  │                  │         │
│   │ • Workflows      │  │ • Sessions       │  │ • Models         │         │
│   │ • Executions     │  │ • Cache          │  │ • Training Data  │         │
│   │ • Chat History   │  │ • Rate Limits    │  │ • Logs           │         │
│   │ • Stats          │  │ • Pub/Sub        │  │ • Exports        │         │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                              │
│   Connection: PostgreSQL via SQLAlchemy (Async)                             │
│   Connection: Redis via redis-py (Async)                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│   │      n8n         │  │   AI Models      │  │   Monitoring     │         │
│   │                  │  │                  │  │                  │         │
│   │ • Workflow       │  │ • Gemini 3       │  │ • Prometheus     │         │
│   │   Engine         │  │ • Mistral        │  │ • Grafana        │         │
│   │ • Execution      │  │ • Groq           │  │ • AlertManager   │         │
│   │ • Webhooks       │  │ • OpenCode       │  │ • Loki           │         │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                              │
│   URLs:                                                                      │
│   - n8n: https://n8n.delqhi.com                                             │
│   - Prometheus: https://prometheus.delqhi.com                               │
│   - Grafana: https://grafana.delqhi.com                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Datenfluss-Beschreibung

### 1. CAPTCHA Lösung (POST /api/captcha/solve)

```
┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌──────────────┐
│ Client  │────▶│  API GW  │────▶│   Router    │────▶│   Service    │
└─────────┘     └──────────┘     └─────────────┘     └──────┬───────┘
                                                            │
                              ┌─────────────────────────────┼─────────────┐
                              │                             │             │
                              ▼                             ▼             ▼
                       ┌──────────────┐            ┌──────────────┐ ┌──────────┐
                       │  Validation  │            │ YOLO Engine  │ │  OCR     │
                       └──────┬───────┘            └──────┬───────┘ │  Engine  │
                              │                           │         └────┬─────┘
                              │                           │              │
                              ▼                           ▼              ▼
                       ┌──────────────┐            ┌──────────────────────────┐
                       │  Queue Task  │───────────▶│    Consensus Engine      │
                       └──────────────┘            │  (Multi-Model Voting)    │
                                                   └──────────┬───────────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────────┐
                                                   │    Result Aggregation    │
                                                   │  • Best solution         │
                                                   │  • Confidence score      │
                                                   │  • Processing time       │
                                                   └──────────┬───────────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────────┐
                                                   │   Response + DB Storage  │
                                                   └──────────────────────────┘
```

**Schritt-für-Schritt:**

1. **Client Request**: Base64-Bild + CAPTCHA-Typ wird gesendet
2. **Validation**: Bild-Größe, Format und Typ werden validiert
3. **Queue**: Aufgabe wird in Redis-Queue eingereiht
4. **Parallel Processing**: 
   - YOLO: Bildklassifizierung und ROI-Detection
   - OCR: Textextraktion mit Tesseract/EasyOCR
   - AI Vision: Fallback für komplexe CAPTCHAs
5. **Consensus**: Mehrheitsvoting mit Konfidenz-Gewichtung
6. **Result**: Beste Lösung mit Metadaten zurückgeben
7. **Storage**: Ergebnis in PostgreSQL für Statistiken speichern

**Latenz:** ~150-300ms für einfache CAPTCHAs

---

### 2. Workflow Generierung (POST /api/workflows/generate)

```
┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌──────────────┐
│ Client  │────▶│  API GW  │────▶│   Router    │────▶│   Service    │
└─────────┘     └──────────┘     └─────────────┘     └──────┬───────┘
                                                            │
                                                            ▼
                                                   ┌──────────────────┐
                                                   │  Prompt Analysis │
                                                   │  • Intent        │
                                                   │  • Requirements  │
                                                   │  • Constraints   │
                                                   └────────┬─────────┘
                                                            │
                                                            ▼
                                                   ┌──────────────────┐
                                                   │   AI Generation  │
                                                   │  (LLM Call)      │
                                                   │                  │
                                                   │  System: "You    │
                                                   │  are an n8n      │
                                                   │  expert..."      │
                                                   └────────┬─────────┘
                                                            │
                                                            ▼
                                                   ┌──────────────────┐
                                                   │  JSON Validation │
                                                   │  • Schema Check  │
                                                   │  • Node Types    │
                                                   │  • Connections   │
                                                   └────────┬─────────┘
                                                            │
                                                            ▼
                                                   ┌──────────────────┐
                                                   │   n8n Deploy     │
                                                   │  • Create WF     │
                                                   │  • Get URL       │
                                                   │  • Test Connect  │
                                                   └────────┬─────────┘
                                                            │
                                                            ▼
                                                   ┌──────────────────┐
                                                   │  Response + Store│
                                                   └──────────────────┘
```

**Schritt-für-Schritt:**

1. **Prompt Analysis**: Nutzer-Intent und Anforderungen extrahieren
2. **Context Enrichment**: Vorhandene Workflows, System-Kontext laden
3. **AI Generation**: LLM generiert n8n-kompatibles JSON
4. **Validation**: Schema-Validierung, Node-Typen prüfen
5. **n8n Integration**: Workflow via n8n API deployen
6. **Response**: Workflow-ID, JSON, n8n-URL zurückgeben

**Latenz:** ~2-5s je nach Komplexität

---

### 3. Chat mit AI-Assistent (POST /api/chat/message)

```
┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌──────────────┐
│ Client  │────▶│  API GW  │────▶│   Router    │────▶│   Service    │
└─────────┘     └──────────┘     └─────────────┘     └──────┬───────┘
                                                            │
                              ┌─────────────────────────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │   Session Manager    │
                   │  • Load History      │
                   │  • Update Context    │
                   │  • Store Message     │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │   Context Builder    │
                   │  • Chat History      │
                   │  • Workflow State    │
                   │  • System Events     │
                   │  • User Preferences  │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │    AI Processing     │
                   │  (LLM with Tools)    │
                   │                      │
                   │  Tools:              │
                   │  • fix_workflow()    │
                   │  • view_workflow()   │
                   │  • run_workflow()    │
                   │  • search_docs()     │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │   Action Parser      │
                   │  • Extract Actions   │
                   │  • Validate Params   │
                   │  • Suggest Next      │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │   Response Builder   │
                   │  • Format Message    │
                   │  • Add Actions       │
                   │  • Include Suggest.  │
                   └──────────────────────┘
```

**Schritt-für-Schritt:**

1. **Session Management**: Chat-Verlauf laden, Session validieren
2. **Context Building**: Relevante Workflows, System-Status aggregieren
3. **AI Processing**: LLM mit Tool-Calling generiert Antwort
4. **Action Parsing**: Ausführbare Aktionen aus Antwort extrahieren
5. **Response**: Nachricht + Aktionen + Vorschläge zurückgeben

**Latenz:** ~500ms-2s je nach Kontext-Größe

---

## Komponenten-Details

### Captcha Service

| Komponente | Technologie | Zweck |
|------------|-------------|-------|
| YOLO Engine | Ultralytics v8.4.7 | Bildklassifizierung, ROI-Detection |
| OCR Engine | Tesseract + EasyOCR | Textextraktion aus Bildern |
| AI Vision | Gemini 3 Flash | Fallback für komplexe CAPTCHAs |
| Consensus | Custom Algorithm | Multi-Model Voting |

**Konfiguration:**
```yaml
confidence_threshold: 0.8
consensus_min_votes: 2
timeout_ms: 30000
retry_count: 2
```

### Workflow Service

| Komponente | Technologie | Zweck |
|------------|-------------|-------|
| AI Generator | Gemini 3 Pro / Claude | Workflow-Generierung |
| n8n Client | n8n REST API | Deployment & Execution |
| Template DB | PostgreSQL | Workflow-Templates |

**Prompt Template:**
```
You are an expert n8n workflow designer.
Generate a valid n8n workflow JSON based on the user's request.

Requirements:
- Use only official n8n nodes
- Include proper error handling
- Add retry logic where appropriate
- Follow best practices for data flow

User Request: {prompt}
Context: {context}

Respond with valid JSON only.
```

### Chat Service

| Komponente | Technologie | Zweck |
|------------|-------------|-------|
| AI Model | Gemini 3 Pro | Konversation & Reasoning |
| Context Manager | Redis | Session-State & Cache |
| Action Executor | Internal API | Workflow-Operationen |

**Available Tools:**
```typescript
interface ChatTools {
  fix_workflow(workflow_id: string, error: string): Promise<void>;
  view_workflow(workflow_id: string): Promise<Workflow>;
  run_workflow(workflow_id: string, data?: object): Promise<void>;
  search_docs(query: string): Promise<DocResult[]>;
}
```

---

## Datenbank-Schema (Vereinfacht)

### PostgreSQL

```sql
-- CAPTCHA Lösungen
CREATE TABLE captcha_solves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    result VARCHAR(255),
    confidence FLOAT,
    processing_time_ms INTEGER,
    solver_type VARCHAR(50),
    success BOOLEAN NOT NULL,
    error_code VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    image_hash VARCHAR(64) -- für Deduplizierung
);

-- Workflows
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    n8n_workflow_id VARCHAR(100),
    n8n_url TEXT,
    complexity VARCHAR(20),
    generated_by_ai BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat Sessions
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP
);

-- Chat Messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id),
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    actions JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- System Events
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    user_id UUID,
    session_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Redis

```
# Rate Limiting
rate_limit:{client_id} -> counter (TTL: 60s)

# Session Cache
session:{session_id} -> { user_id, context, expires }

# Chat History (LRU)
chat_history:{session_id} -> [ message_ids ]

# CAPTCHA Queue
captcha_queue -> [ task_ids ]

# Workflow Cache
workflow:{workflow_id} -> workflow_json (TTL: 1h)
```

---

## Sicherheit

### Authentifizierung

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  API GW     │────▶│  Auth Svc   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   Redis     │
                                        │  (Tokens)   │
                                        └─────────────┘
```

**Token Flow:**
1. Client sendet `Authorization: Bearer {token}`
2. API Gateway validiert JWT-Signatur
3. Token im Redis-Cache prüfen (Blacklist)
4. User-Kontext an Service weitergeben

### Rate Limiting

| Tier | Requests/Min | Burst | Queue |
|------|-------------|-------|-------|
| Free | 60 | 10 | 100 |
| Pro | 300 | 50 | 500 |
| Enterprise | 1000 | 200 | 2000 |

---

## Monitoring & Observability

### Metriken

```yaml
# Application Metrics
- http_requests_total
- http_request_duration_seconds
- captcha_solves_total
- captcha_solve_duration_seconds
- workflow_generations_total
- chat_messages_total

# Business Metrics
- captcha_success_rate
- workflow_generation_accuracy
- chat_satisfaction_score
```

### Logging

```json
{
  "timestamp": "2026-01-29T14:30:00Z",
  "level": "INFO",
  "service": "captcha-service",
  "request_id": "req_abc123",
  "user_id": "user_xyz789",
  "method": "POST",
  "path": "/api/captcha/solve",
  "duration_ms": 150,
  "status_code": 200,
  "captcha_type": "alphanumeric",
  "success": true,
  "confidence": 0.95
}
```

### Tracing

- **Jaeger** für Distributed Tracing
- Trace-ID wird über alle Services propagiert
- Spans für: API Gateway → Router → Service → External Calls

---

## Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://...
      - N8N_URL=https://n8n.delqhi.com
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sin-solver-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sin-solver-api
  template:
    spec:
      containers:
      - name: api
        image: sin-solver/api:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
```

---

## API Versioning

| Version | Status | Base URL | Sunset Date |
|---------|--------|----------|-------------|
| v1.0 | Current | `/api/v1` | - |
| v0.9 | Deprecated | `/api/v0.9` | 2026-06-30 |

**Header-Based Versioning:**
```
Accept-Version: v1.0
```

---

## Zusammenfassung

### Leistungsmerkmale

- **Captcha**: <300ms Latenz, 95%+ Genauigkeit
- **Workflow**: 2-5s Generierung, validiertes n8n JSON
- **Chat**: <2s Antwortzeit, Tool-Integration

### Skalierbarkeit

- Horizontal skalierbar via Kubernetes
- Redis für Session- und Cache-Management
- PostgreSQL für persistente Daten
- Async Queue für CAPTCHA-Verarbeitung

### Zuverlässigkeit

- 99.9% Uptime SLA
- Automatische Retries
- Circuit Breaker für externe Services
- Comprehensive Monitoring

---

*Letzte Aktualisierung: 2026-01-29*
*Version: 1.0.0*
