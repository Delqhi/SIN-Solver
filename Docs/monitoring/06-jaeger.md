# 🔍 Jaeger - Distributed Tracing

> **Request Tracing & Performance Analysis for SIN-Solver**

**Service:** room-29-jaeger-traces  
**Port:** 16686  
**Domain:** jaeger.delqhi.com  
**Version:** 1.47.0  
**Status:** ✅ Active

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [OpenTelemetry Integration](#opentelemetry-integration)
5. [Trace Analysis](#trace-analysis)
6. [Sampling](#sampling)
7. [Storage](#storage)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Jaeger provides distributed tracing for SIN-Solver, enabling:

- **Request Flow:** Visualize requests across services
- **Performance Analysis:** Identify bottlenecks
- **Error Tracking:** Trace errors to root cause
- **Dependency Mapping:** Service dependency graph
- **Latency Analysis:** Request duration breakdown

### Key Features

| Feature | Description |
|---------|-------------|
| **Distributed Tracing** | End-to-end request tracking |
| **Service Dependencies** | Visual service map |
| **Performance Metrics** | Latency percentiles |
| **Error Tracking** | Failed span highlighting |
| **OpenTelemetry** | Modern instrumentation standard |
| **Adaptive Sampling** | Intelligent trace collection |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    JAEGER ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    INSTRUMENTATION                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │ OpenTelemetry│  │   Jaeger    │  │   Zipkin        │  │  │
│  │  │   SDK       │  │   Client    │  │   (Legacy)      │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │  │
│  │         │                │                   │          │  │
│  │         └────────────────┴───────────────────┘          │  │
│  │                          │                              │  │
│  │                          ▼                              │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │                    AGENT / SDK                    │  │  │
│  │  │  • Collect spans                                 │  │  │
│  │  │  • Batch traces                                  │  │  │
│  │  │  • Export to collector                           │  │  │
│  │  └──────────────────────┬───────────────────────────┘  │  │
│  │                         │                               │  │
│  │                         ▼                               │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │              COLLECTOR / ALL-IN-ONE               │  │  │
│  │  │  • Receive spans (gRPC/HTTP)                     │  │  │
│  │  │  • Validate & process                            │  │  │
│  │  │  • Store to backend                              │  │  │
│  │  │  • Serve UI/API                                  │  │  │
│  │  └──────────────────────┬───────────────────────────┘  │  │
│  │                         │                               │  │
│  │                         ▼                               │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │                    STORAGE                        │  │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │  │  │
│  │  │  │  Memory     │  │  Badger     │  │  Elastic │ │  │  │
│  │  │  │  (Dev)      │  │  (Local)    │  │  (Prod)  │ │  │  │
│  │  │  └─────────────┘  └─────────────┘  └──────────┘ │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                              │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Docker Compose

```yaml
# Docker/rooms/room-29-jaeger/docker-compose.yml
version: '3.8'

services:
  room-29-jaeger-traces:
    image: jaegertracing/all-in-one:1.47.0
    container_name: room-29-jaeger-traces
    hostname: room-29-jaeger-traces
    restart: unless-stopped
    ports:
      - "16686:16686"  # UI
      - "14268:14268"  # HTTP collector
      - "14250:14250"  # gRPC collector
      - "6831:6831/udp"  # UDP agent
      - "6832:6832/udp"  # UDP agent (binary)
      - "5778:5778"    # Agent config
    environment:
      - COLLECTOR_OTLP_ENABLED=true
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
      - SPAN_STORAGE_TYPE=badger
      - BADGER_EPHEMERAL=false
      - BADGER_DIRECTORY_VALUE=/badger/data
      - BADGER_DIRECTORY_KEY=/badger/key
      - BADGER_SPAN_STORE_TTL=168h  # 7 days
      - QUERY_BASE_PATH=/
      - QUERY_UI_CONFIG=/etc/jaeger/ui-config.json
    volumes:
      - jaeger_data:/badger
      - ./config/ui-config.json:/etc/jaeger/ui-config.json:ro
    networks:
      - sin-network
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://localhost:16686 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

volumes:
  jaeger_data:
    driver: local

networks:
  sin-network:
    external: true
```

### Start Service

```bash
# Start Jaeger
cd /Users/jeremy/dev/SIN-Solver/Docker/rooms/room-29-jaeger
docker-compose up -d

# Verify status
docker-compose ps
docker logs room-29-jaeger-traces

# Access UI
open https://jaeger.delqhi.com
```

---

## Configuration

### UI Configuration (ui-config.json)

```json
{
  "dependencies": {
    "menuEnabled": true
  },
  "menu": [
    {
      "label": "Documentation",
      "items": [
        {
          "label": "SIN-Solver Docs",
          "url": "https://docs.delqhi.com"
        },
        {
          "label": "Jaeger Docs",
          "url": "https://www.jaegertracing.io/docs/"
        }
      ]
    }
  ],
  "search": {
    "maxLookback": {
      "label": "7 Days",
      "value": "168h"
    }
  },
  "tracing": {
    "header": "x-trace-id"
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COLLECTOR_OTLP_ENABLED` | false | Enable OTLP receiver |
| `SPAN_STORAGE_TYPE` | memory | Storage backend |
| `BADGER_SPAN_STORE_TTL` | 72h | Data retention |
| `QUERY_BASE_PATH` | / | UI base path |
| `SAMPLING_STRATEGIES_FILE` | - | Sampling config file |

---

## OpenTelemetry Integration

### Python Instrumentation

```python
# requirements.txt
opentelemetry-api
opentelemetry-sdk
opentelemetry-instrumentation-fastapi
opentelemetry-instrumentation-requests
opentelemetry-exporter-otlp
opentelemetry-instrumentation-logging
```

```python
# tracing.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

# Configure resource
resource = Resource(attributes={
    SERVICE_NAME: "room-13-api-brain",
    SERVICE_VERSION: "1.0.0",
    "deployment.environment": "production"
})

# Configure provider
provider = TracerProvider(resource=resource)
trace.set_tracer_provider(provider)

# Configure exporter
otlp_exporter = OTLPSpanExporter(
    endpoint="http://room-29-jaeger-traces:4317",
    insecure=True
)

# Add processor
span_processor = BatchSpanProcessor(otlp_exporter)
provider.add_span_processor(span_processor)

# Get tracer
tracer = trace.get_tracer(__name__)

# Instrument FastAPI
FastAPIInstrumentor.instrument_app(app)

# Instrument requests
RequestsInstrumentor().instrument()
```

### FastAPI Integration

```python
# main.py
from fastapi import FastAPI, Request
from opentelemetry import trace
from opentelemetry.propagate import extract, inject

app = FastAPI()

@app.middleware("http")
async def add_trace_id(request: Request, call_next):
    """Add trace ID to response headers"""
    response = await call_next(request)
    current_span = trace.get_current_span()
    if current_span:
        trace_id = format(current_span.get_span_context().trace_id, '032x')
        response.headers["X-Trace-Id"] = trace_id
    return response

@app.get("/api/v1/workflows")
async def list_workflows():
    with tracer.start_as_current_span("list_workflows") as span:
        span.set_attribute("workflow.count", 10)
        span.set_attribute("user.id", "user-123")
        
        # Database query span
        with tracer.start_as_current_span("db_query") as db_span:
            db_span.set_attribute("db.system", "postgresql")
            db_span.set_attribute("db.statement", "SELECT * FROM workflows")
            workflows = await db.fetch_all("SELECT * FROM workflows")
        
        return {"workflows": workflows}

@app.post("/api/v1/workflows/execute")
async def execute_workflow(workflow_id: str):
    with tracer.start_as_current_span("execute_workflow") as span:
        span.set_attribute("workflow.id", workflow_id)
        
        # Call n8n
        with tracer.start_as_current_span("call_n8n") as n8n_span:
            n8n_span.set_attribute("http.method", "POST")
            n8n_span.set_attribute("http.url", "http://agent-01-n8n:5678/api/v1/workflows/execute")
            response = requests.post(
                "http://agent-01-n8n:5678/api/v1/workflows/execute",
                json={"workflow_id": workflow_id}
            )
            n8n_span.set_attribute("http.status_code", response.status_code)
        
        return {"execution_id": response.json()["execution_id"]}
```

### Manual Span Creation

```python
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

tracer = trace.get_tracer(__name__)

# Simple span
with tracer.start_as_current_span("operation_name") as span:
    span.set_attribute("key", "value")
    # Do work

# Span with events
with tracer.start_as_current_span("process_data") as span:
    span.add_event("Starting processing")
    
    try:
        result = process_data()
        span.set_attribute("result.size", len(result))
        span.add_event("Processing complete", {"item.count": len(result)})
    except Exception as e:
        span.set_status(Status(StatusCode.ERROR, str(e)))
        span.record_exception(e)
        raise

# Nested spans
with tracer.start_as_current_span("parent_operation") as parent:
    parent.set_attribute("parent.attr", "value")
    
    with tracer.start_as_current_span("child_operation") as child:
        child.set_attribute("child.attr", "value")
        # Child work
    
    # More parent work
```

### JavaScript/Node.js Instrumentation

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'agent-01-n8n',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://room-29-jaeger-traces:4317',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

---

## Trace Analysis

### Jaeger UI

**URL:** https://jaeger.delqhi.com

#### Search

```
# Find traces by service
Service: room-13-api-brain

# Find traces with errors
tags: error=true

# Find slow traces
duration: >1s

# Specific operation
operation: POST /api/v1/workflows

# Time range
Lookback: 1 hour
```

#### Trace View

```
Trace: abc123def456
├── room-13-api-brains (0.5ms)
│   ├── POST /api/v1/workflows (0.5ms)
│   │   ├── db_query (0.2ms)
│   │   └── cache_lookup (0.1ms)
```

#### Dependencies

Visual service dependency graph showing:
- Service relationships
- Call volumes
- Error rates
- Latency

### Common Queries

| Query | Description |
|-------|-------------|
| `service:room-13-api-brain` | All traces from API Brain |
| `service:agent-01-n8n error=true` | Failed n8n traces |
| `duration:>500ms` | Slow traces (>500ms) |
| `tags:http.status_code=500` | HTTP 500 errors |
| `operation:execute_workflow` | Specific operation |

---

## Sampling

### Sampling Strategies

```json
# config/sampling-strategies.json
{
  "service_strategies": [
    {
      "service": "room-13-api-brain",
      "type": "probabilistic",
      "param": 0.1,
      "operation_strategies": [
        {
          "operation": "POST /api/v1/workflows/execute",
          "type": "probabilistic",
          "param": 1.0
        },
        {
          "operation": "GET /health",
          "type": "probabilistic",
          "param": 0.01
        }
      ]
    },
    {
      "service": "agent-01-n8n",
      "type": "probabilistic",
      "param": 0.5
    },
    {
      "service": "agent-05-steel",
      "type": "probabilistic",
      "param": 0.2
    }
  ],
  "default_strategy": {
    "type": "probabilistic",
    "param": 0.1
  }
}
```

### Sampling Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Probabilistic** | Random sampling at rate | General purpose |
| **Rate Limiting** | Max traces per second | Cost control |
| **Adaptive** | Dynamic based on traffic | Production |

### Programmatic Sampling

```python
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

# 10% sampling
sampler = TraceIdRatioBased(0.1)

provider = TracerProvider(
    sampler=sampler,
    resource=resource
)

# Force sample specific operations
from opentelemetry.trace import SpanKind

@tracer.start_as_current_span("important_operation", kind=SpanKind.SERVER)
def important_operation():
    # Always sampled
    pass
```

---

## Storage

### Storage Backends

| Backend | Use Case | Retention |
|---------|----------|-----------|
| **Memory** | Development | Ephemeral |
| **Badger** | Single node | Configurable |
| **Elasticsearch** | Production | Unlimited |
| **Cassandra** | Production scale | Unlimited |
| **Kafka** | Stream processing | Configurable |

### Badger Configuration (Current)

```yaml
environment:
  - SPAN_STORAGE_TYPE=badger
  - BADGER_EPHEMERAL=false
  - BADGER_DIRECTORY_VALUE=/badger/data
  - BADGER_DIRECTORY_KEY=/badger/key
  - BADGER_SPAN_STORE_TTL=168h  # 7 days
```

### Elasticsearch Configuration (Production)

```yaml
environment:
  - SPAN_STORAGE_TYPE=elasticsearch
  - ES_SERVER_URLS=http://elasticsearch:9200
  - ES_USERNAME=jaeger
  - ES_PASSWORD=${ES_PASSWORD}
  - ES_INDEX_PREFIX=jaeger
  - ES_INDEX_DAILY=true
```

---

## API Reference

### Query API

```bash
# Get services
curl http://localhost:16686/api/services

# Get operations for service
curl http://localhost:16686/api/services/room-13-api-brain/operations

# Search traces
curl -G http://localhost:16686/api/traces \
  --data-urlencode 'service=room-13-api-brain' \
  --data-urlencode 'operation=POST+/api/v1/workflows' \
  --data-urlencode 'start=1700000000000000' \
  --data-urlencode 'end=1700086400000000' \
  --data-urlencode 'limit=20'

# Get trace by ID
curl http://localhost:16686/api/traces/abc123def456

# Get dependencies
curl http://localhost:16686/api/dependencies?endTs=1700086400000&lookback=86400000
```

### Collector API

```bash
# Submit span via HTTP
curl -X POST http://localhost:14268/api/traces \
  -H "Content-Type: application/json" \
  -d '{
    "operationName": "test-operation",
    "serviceName": "test-service",
    "startTime": 1700000000000000,
    "duration": 100000,
    "tags": {
      "http.method": "GET",
      "http.status_code": 200
    }
  }'
```

### OTLP/gRPC

```python
# Default OTLP endpoint
endpoint = "http://room-29-jaeger-traces:4317"

# Alternative HTTP endpoint
endpoint = "http://room-29-jaeger-traces:4318/v1/traces"
```

---

## Troubleshooting

### Common Issues

#### No Traces Appearing

```bash
# Check Jaeger UI
open http://localhost:16686

# Verify collector is receiving
docker logs room-29-jaeger-traces | grep "span received"

# Check OpenTelemetry exporter logs
# Enable debug logging in SDK

# Verify network connectivity
docker exec room-13-api-brain \
  curl http://room-29-jaeger-traces:16686
```

#### High Memory Usage

```bash
# Check storage metrics
curl http://localhost:16686/metrics | grep jaeger_storage

# Reduce retention
# BADGER_SPAN_STORE_TTL=72h

# Enable sampling
# Reduce sampling rate
```

#### Missing Spans

```bash
# Check sampling configuration
# Verify sampler is not dropping spans

# Check for exporter errors
# Enable OTEL logging

# Verify span processor queue
# Increase queue size if needed
```

### Debug Commands

```bash
# Check Jaeger health
curl http://localhost:16686

# Get metrics
curl http://localhost:16686/metrics

# Check collector status
docker logs room-29-jaeger-traces | tail -100

# Test span submission
curl -X POST http://localhost:14268/api/traces \
  -H "Content-Type: application/json" \
  -d @test-span.json
```

### Metrics

```promql
# Spans received rate
rate(jaeger_collector_spans_received_total[5m])

# Spans dropped rate
rate(jaeger_collector_spans_dropped_total[5m])

# Query latency
jaeger_query_latency_bucket

# Storage errors
jaeger_storage_errors_total
```

---

## References

- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTelemetry](https://opentelemetry.io/docs/)
- [OpenTelemetry Python](https://opentelemetry-python.readthedocs.io/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)

---

<div align="center">

**Jaeger Distributed Tracing**  
*Request Tracing for SIN-Solver*

[← Loki](./05-loki.md) · [Back to Overview →](./01-overview.md)

</div>
