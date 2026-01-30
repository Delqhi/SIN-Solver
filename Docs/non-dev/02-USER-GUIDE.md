# SIN-Solver User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [System Overview](#system-overview)
4. [CAPTCHA Solving](#captcha-solving)
5. [Survey Automation](#survey-automation)
6. [Web Automation](#web-automation)
7. [AI Orchestration](#ai-orchestration)
8. [Monitoring & Observability](#monitoring--observability)
9. [Security & Privacy](#security--privacy)
10. [Advanced Configuration](#advanced-configuration)
11. [Best Practices](#best-practices)

---

## Introduction

SIN-Solver is a comprehensive AI automation platform designed to solve complex tasks at enterprise scale. Built on a distributed 26-room architecture, it combines the power of machine learning, computer vision, and AI orchestration to deliver robust automation capabilities.

### Who This Guide Is For

This guide is designed for:
- **System Administrators** managing SIN-Solver deployments
- **Developers** integrating with the SIN-Solver API
- **Automation Engineers** building workflows and automations
- **DevOps Teams** responsible for deployment and monitoring
- **End Users** utilizing the platform's capabilities

### What You'll Learn

By the end of this guide, you will understand:
- The 26-room distributed architecture
- How to solve various types of CAPTCHAs
- Survey automation across multiple platforms
- Web automation with stealth capabilities
- AI agent orchestration using n8n
- Monitoring and observability practices
- Security best practices
- Advanced configuration options

---

## Core Concepts

### The 26-Room Architecture

SIN-Solver is built on a distributed microservices architecture called the "26-Room Empire." Each "room" is a specialized service container responsible for specific functionality.

#### Room Categories

| Category | Prefix | Purpose | Examples |
|----------|--------|---------|----------|
| **Agents** | `agent-XX-` | AI Workers & Orchestrators | n8n, AgentZero, Steel Browser |
| **Rooms** | `room-XX-` | Infrastructure & Support | PostgreSQL, Redis, Vault |
| **Solvers** | `solver-X.X-` | Money-Making Workers | CAPTCHA, Survey Workers |
| **Builders** | `builder-X-` | Content Creation | Website Builder |

#### Service Communication

All services communicate through:
1. **Docker Network**: Internal communication via `sin-solver-network` (172.20.0.0/16)
2. **API Gateway**: REST API through room-13-api-brain
3. **Message Queue**: Redis for async task processing
4. **Event Bus**: n8n for workflow orchestration

### Key Terminology

| Term | Definition |
|------|------------|
| **CAPTCHA** | Completely Automated Public Turing test to tell Computers and Humans Apart |
| **OCR** | Optical Character Recognition - text extraction from images |
| **YOLO** | You Only Look Once - real-time object detection algorithm |
| **CDP** | Chrome DevTools Protocol - browser automation interface |
| **n8n** | Workflow automation tool (open-source alternative to Zapier) |
| **MCP** | Model Context Protocol - AI agent communication standard |

---

## System Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL USERS                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE TUNNEL                                   │
│                    (Public Access & SSL Termination)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ROOM-13-API-BRAIN                                    │
│                      (FastAPI Gateway - Port 8000)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐        ┌───────────────┐        ┌───────────────┐
│    AGENTS     │        │    ROOMS      │        │   SOLVERS     │
├───────────────┤        ├───────────────┤        ├───────────────┤
│ agent-01-n8n  │        │ room-03-      │        │ solver-1.1-   │
│ agent-03-     │        │   postgres    │        │   captcha     │
│   agentzero   │        │ room-04-redis │        │ solver-2.1-   │
│ agent-05-     │        │ room-02-vault │        │   survey      │
│   steel       │        │ room-25-      │        │               │
│ agent-06-     │        │   prometheus  │        │               │
│   skyvern     │        │ room-26-      │        │               │
│               │        │   grafana     │        │               │
└───────────────┘        └───────────────┘        └───────────────┘
```

### Service Registry

| Service | Internal IP | Port | Public Domain | Purpose |
|---------|-------------|------|---------------|---------|
| agent-01-n8n | 172.20.0.10 | 5678 | n8n.delqhi.com | Workflow orchestration |
| agent-03-agentzero | 172.20.0.50 | 8050 | agentzero.delqhi.com | AI code generation |
| agent-05-steel | 172.20.0.20 | 3005 | steel.delqhi.com | Stealth browser |
| agent-06-skyvern | 172.20.0.30 | 8030 | skyvern.delqhi.com | Visual automation |
| room-02-vault | 172.20.0.31 | 8200 | vault.delqhi.com | Secrets management |
| room-03-postgres | 172.20.0.100 | 5432 | - | Primary database |
| room-04-redis | 172.20.0.40 | 6379 | - | Cache layer |
| room-13-api-brain | 172.20.0.60 | 8000 | api.delqhi.com | API gateway |
| room-26-grafana | 172.20.0.91 | 3001 | grafana.delqhi.com | Monitoring |
| solver-1.1-captcha | 172.20.0.19 | 8019 | captcha.delqhi.com | CAPTCHA solving |
| solver-2.1-survey | 172.20.0.18 | 8018 | survey.delqhi.com | Survey automation |

---

## CAPTCHA Solving

### Supported CAPTCHA Types

SIN-Solver supports all major CAPTCHA types through the `solver-1.1-captcha-worker` service:

| CAPTCHA Type | Method | Success Rate | Avg. Time |
|--------------|--------|--------------|-----------|
| **Text/Image** | ddddocr OCR | 95%+ | 0.5s |
| **hCaptcha** | YOLOv8 + Vision AI | 90%+ | 2-5s |
| **reCAPTCHA v2** | Vision AI | 85%+ | 3-7s |
| **reCAPTCHA v3** | Browser automation | 80%+ | Variable |
| **Slider** | ddddocr + CV | 92%+ | 1-3s |
| **Audio** | Whisper ASR | 88%+ | 2-4s |
| **Click/Grid** | YOLOv8 detection | 90%+ | 1-2s |

### How CAPTCHA Solving Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   Request   │────▶│   CAPTCHA    │────▶│   Type      │────▶│   Solver    │
│   Received  │     │   Detection  │     │   Router    │     │   Engine    │
└─────────────┘     └──────────────┘     └─────────────┘     └──────┬──────┘
                                                                    │
                    ┌──────────────┐     ┌─────────────┐            │
                    │   Return     │◀────│   Result    │◀───────────┘
                    │   Solution   │     │   Validator │
                    └──────────────┘     └─────────────┘
```

### Using the CAPTCHA API

#### Text CAPTCHA

```bash
curl -X POST http://localhost:8019/api/v1/solve \
  -H "Content-Type: application/json" \
  -d '{
    "captcha_type": "text",
    "image_url": "https://example.com/captcha.png",
    "timeout": 30
  }'
```

Response:
```json
{
  "success": true,
  "solution": "A7B9C2",
  "confidence": 0.97,
  "processing_time": 0.52,
  "solver_used": "ddddocr"
}
```

#### hCaptcha

```bash
curl -X POST http://localhost:8019/api/v1/solve \
  -H "Content-Type: application/json" \
  -d '{
    "captcha_type": "hcaptcha",
    "site_key": "10000000-ffff-ffff-ffff-000000000001",
    "page_url": "https://example.com/login",
    "timeout": 60
  }'
```

Response:
```json
{
  "success": true,
  "solution": "P1_eyJ0eXAiOiJKV1Qi...",
  "confidence": 0.91,
  "processing_time": 3.45,
  "solver_used": "yolo_vision"
}
```

#### Slider CAPTCHA

```bash
curl -X POST http://localhost:8019/api/v1/solve \
  -H "Content-Type: application/json" \
  -d '{
    "captcha_type": "slider",
    "background_image": "https://example.com/bg.jpg",
    "slider_image": "https://example.com/slider.png",
    "timeout": 30
  }'
```

Response:
```json
{
  "success": true,
  "solution": 142,
  "confidence": 0.94,
  "processing_time": 1.23,
  "solver_used": "ddddocr_slider"
}
```

### Batch Processing

For high-volume scenarios, use batch processing:

```bash
curl -X POST http://localhost:8019/api/v1/solve/batch \
  -H "Content-Type: application/json" \
  -d '{
    "captchas": [
      {"captcha_type": "text", "image_url": "https://example.com/1.png"},
      {"captcha_type": "text", "image_url": "https://example.com/2.png"},
      {"captcha_type": "text", "image_url": "https://example.com/3.png"}
    ],
    "max_workers": 3
  }'
```

---

## Survey Automation

### Supported Platforms

The `solver-2.1-survey-worker` supports automation for:

| Platform | Status | Features |
|----------|--------|----------|
| **Swagbucks** | ✅ Active | Survey completion, daily polls |
| **Prolific** | ✅ Active | Study participation |
| **Amazon MTurk** | ✅ Active | HIT completion |
| **Clickworker** | ✅ Active | Micro-tasks |
| **Appen** | ✅ Active | Data collection tasks |
| **Toluna** | ✅ Active | Survey completion |
| **LifePoints** | ✅ Active | Survey completion |
| **YouGov** | ✅ Active | Survey completion |

### Survey Automation Workflow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   Survey    │────▶│   Browser    │────▶│   Question  │────▶│   AI        │
│   Detected  │     │   Navigate   │     │   Parser    │     │   Answer    │
└─────────────┘     └──────────────┘     └─────────────┘     └──────┬──────┘
                                                                    │
                    ┌──────────────┐     ┌─────────────┐            │
                    │   Submit     │◀────│   Validate  │◀───────────┘
                    │   Results    │     │   Answers   │
                    └──────────────┘     └─────────────┘
```

### API Usage

#### Start Survey Task

```bash
curl -X POST http://localhost:8018/api/v1/survey/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "platform": "swagbucks",
    "survey_type": "daily_poll",
    "max_duration": 300,
    "auto_submit": true
  }'
```

Response:
```json
{
  "task_id": "survey_abc123",
  "status": "started",
  "platform": "swagbucks",
  "estimated_completion": "2024-01-30T11:00:00Z"
}
```

#### Check Task Status

```bash
curl -X GET http://localhost:8018/api/v1/survey/status/survey_abc123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "task_id": "survey_abc123",
  "status": "completed",
  "platform": "swagbucks",
  "questions_answered": 12,
  "rewards_earned": 5.0,
  "completion_time": 245
}
```

---

## Web Automation

### Steel Browser (Stealth Mode)

The `agent-05-steel` service provides stealth browser automation using Chrome DevTools Protocol (CDP).

#### Features

| Feature | Description |
|---------|-------------|
| **Stealth Mode** | Anti-detection measures |
| **Proxy Support** | Residential proxy rotation |
| **Cookie Persistence** | Session management |
| **User-Agent Rotation** | Dynamic UA switching |
| **WebGL Spoofing** | Canvas fingerprint protection |
| **Viewport Randomization** | Variable screen sizes |

#### Using Steel Browser

```python
from steel import Browser

# Initialize browser with stealth mode
browser = Browser(
    headless=True,
    stealth=True,
    proxy="residential://user:pass@proxy:port"
)

# Navigate to page
page = browser.get("https://example.com")

# Perform actions
page.fill("#username", "myuser")
page.fill("#password", "mypass")
page.click("#login-button")

# Wait for navigation
page.wait_for_load_state("networkidle")

# Extract data
title = page.title()
content = page.content()

# Close browser
browser.close()
```

### Skyvern Visual Automation

The `agent-06-skyvern` service provides AI-powered visual automation.

#### Capabilities

- **Visual Understanding**: AI interprets UI elements
- **Natural Language Instructions**: Describe actions in plain English
- **Screenshot Analysis**: Understand page state from images
- **Adaptive Navigation**: Handle dynamic content

#### Example Usage

```python
from skyvern import SkyvernClient

client = SkyvernClient(base_url="http://localhost:8030")

# Execute visual task
result = client.execute_task(
    url="https://example.com/checkout",
    instruction="""
    1. Fill in the shipping address form
    2. Select 'Standard Shipping'
    3. Enter credit card details
    4. Click 'Place Order'
    """,
    max_steps=20
)

print(f"Task completed: {result.success}")
print(f"Result: {result.output}")
```

---

## AI Orchestration

### n8n Workflow Automation

The `agent-01-n8n-orchestrator` serves as the central workflow engine.

#### Key Features

- **Visual Workflow Builder**: Drag-and-drop interface
- **200+ Integrations**: Connect to various services
- **Custom Nodes**: Extend with Python/JavaScript
- **Webhook Triggers**: Event-driven automation
- **Error Handling**: Built-in retry and fallback logic

#### Example Workflows

**CAPTCHA Processing Pipeline:**
```
Webhook Trigger → CAPTCHA Detection → Type Router → Solver → Validation → Response
```

**Survey Automation:**
```
Schedule Trigger → Platform Login → Survey Discovery → Question Parser → AI Answer → Submit
```

**Data Collection:**
```
API Trigger → Steel Browser → Page Scraping → Data Extraction → Database Storage → Notification
```

### Accessing n8n

1. Navigate to http://localhost:5678 (or https://n8n.delqhi.com)
2. Log in with credentials from your `.env` file
3. Create new workflows or import existing ones
4. Configure nodes with SIN-Solver service endpoints

### Pre-built Workflows

SIN-Solver includes several pre-built n8n workflows:

| Workflow | Description | Location |
|----------|-------------|----------|
| `captcha-processing.json` | CAPTCHA solving pipeline | `/workflows/captcha/` |
| `survey-automation.json` | Survey completion automation | `/workflows/survey/` |
| `web-scraping.json` | Data extraction workflow | `/workflows/scraping/` |
| `monitoring-alerts.json` | System monitoring | `/workflows/monitoring/` |

---

## Monitoring & Observability

### Prometheus Metrics

The `room-25-prometheus` service collects metrics from all services.

#### Available Metrics

| Metric | Description | Labels |
|--------|-------------|--------|
| `captcha_solved_total` | Total CAPTCHAs solved | type, solver |
| `captcha_solve_duration_seconds` | Solve time histogram | type |
| `captcha_errors_total` | Total errors | type, error |
| `survey_completed_total` | Surveys completed | platform |
| `survey_completion_duration_seconds` | Survey time | platform |
| `api_requests_total` | API requests | method, endpoint, status |
| `api_request_duration_seconds` | API latency | endpoint |

#### Query Examples

```promql
# CAPTCHA success rate by type
sum(rate(captcha_solved_total[5m])) by (type)

# Average solve time
histogram_quantile(0.95, rate(captcha_solve_duration_seconds_bucket[5m]))

# Error rate
sum(rate(captcha_errors_total[5m])) / sum(rate(captcha_solved_total[5m]))
```

### Grafana Dashboards

Access Grafana at http://localhost:3001 (or https://grafana.delqhi.com)

#### Pre-configured Dashboards

| Dashboard | Description |
|-----------|-------------|
| **SIN-Solver Overview** | System-wide metrics |
| **CAPTCHA Performance** | CAPTCHA solving statistics |
| **Survey Automation** | Survey completion metrics |
| **API Gateway** | Request metrics and latency |
| **Infrastructure** | CPU, memory, disk usage |

### Logging with Loki

Centralized logging through `room-28-loki`:

```bash
# Query logs via Grafana Explore
# Or use the API
curl "http://localhost:3100/loki/api/v1/query_range?query={service=\"captcha-worker\"}"
```

### Distributed Tracing with Jaeger

Trace requests across services:

- URL: http://localhost:16686 (or https://jaeger.delqhi.com)
- Search by trace ID, service, or operation
- Analyze latency bottlenecks

---

## Security & Privacy

### Authentication & Authorization

#### JWT Token Flow

```
User Login → Credentials Validation → JWT Generation → Token Storage
                                              ↓
API Request → JWT Validation → Permission Check → Service Access
```

#### API Key Management

```bash
# Generate new API key
curl -X POST http://localhost:8000/api/v1/auth/api-keys \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"name": "Production API Key", "scopes": ["captcha:read", "captcha:write"]}'
```

### Secrets Management

All secrets are stored in `room-02-tresor-vault`:

```bash
# Store a secret
vault kv put secret/captcha/api-key value="sk-..."

# Read a secret
vault kv get secret/captcha/api-key

# List secrets
vault kv list secret/
```

### Data Privacy

- **No Data Retention**: CAPTCHA images deleted after processing
- **Encrypted Storage**: All sensitive data encrypted at rest
- **Audit Logging**: All access logged for compliance
- **GDPR Compliant**: Right to deletion supported

---

## Advanced Configuration

### Environment Variables

#### Core Configuration

```bash
# Application
APP_ENV=production
APP_DEBUG=false
APP_LOG_LEVEL=info

# Database
POSTGRES_HOST=room-03-postgres
POSTGRES_PORT=5432
POSTGRES_USER=sin_solver
POSTGRES_PASSWORD_FILE=/run/secrets/db_password

# Redis
REDIS_HOST=room-04-redis
REDIS_PORT=6379
REDIS_PASSWORD_FILE=/run/secrets/redis_password

# Vault
VAULT_ADDR=http://room-02-vault:8200
VAULT_TOKEN_FILE=/run/secrets/vault_token

# CAPTCHA Worker
CAPTCHA_MODEL_PATH=/models/best.pt
CAPTCHA_CONFIDENCE_THRESHOLD=0.85
CAPTCHA_MAX_RETRIES=3

# Survey Worker
SURVEY_BROWSER_POOL_SIZE=5
SURVEY_MAX_CONCURRENT=10
SURVEY_TIMEOUT=300
```

### Scaling Configuration

#### Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  solver-1.1-captcha-worker:
    deploy:
      replicas: 5
      resources:
        limits:
          cpus: '2'
          memory: 4G
    
  solver-2.1-survey-worker:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 2G
```

#### Load Balancing

```nginx
# nginx.conf
upstream captcha_backend {
    least_conn;
    server solver-1.1-captcha-worker-1:8019;
    server solver-1.1-captcha-worker-2:8019;
    server solver-1.1-captcha-worker-3:8019;
}

server {
    listen 80;
    location /api/v1/solve {
        proxy_pass http://captcha_backend;
    }
}
```

---

## Best Practices

### Performance Optimization

1. **Batch Processing**: Process multiple CAPTCHAs in parallel
2. **Connection Pooling**: Reuse database connections
3. **Caching**: Cache frequently accessed data in Redis
4. **Async Operations**: Use async/await for I/O operations
5. **Resource Limits**: Set appropriate CPU/memory limits

### Reliability

1. **Health Checks**: Implement comprehensive health endpoints
2. **Circuit Breakers**: Fail fast on repeated errors
3. **Retry Logic**: Exponential backoff for transient failures
4. **Graceful Degradation**: Fallback to simpler solvers
5. **Monitoring**: Alert on error rate thresholds

### Security

1. **Input Validation**: Validate all API inputs
2. **Rate Limiting**: Prevent abuse with rate limits
3. **Secrets Rotation**: Regularly rotate API keys
4. **Network Segmentation**: Isolate services in Docker network
5. **Audit Logging**: Log all security-relevant events

### Maintenance

1. **Regular Updates**: Keep dependencies updated
2. **Backup Strategy**: Regular database backups
3. **Log Rotation**: Prevent disk space issues
4. **Performance Reviews**: Regular performance analysis
5. **Documentation**: Keep documentation current

---

## Summary

This guide has covered:

- ✅ The 26-room distributed architecture
- ✅ CAPTCHA solving capabilities and API usage
- ✅ Survey automation across multiple platforms
- ✅ Web automation with stealth capabilities
- ✅ AI orchestration using n8n workflows
- ✅ Monitoring and observability practices
- ✅ Security best practices
- ✅ Advanced configuration options

### Next Steps

1. Read the [Tutorials](03-TUTORIALS.md) for hands-on learning
2. Explore the [API Reference](../dev/02-API-REFERENCE.md) for integration details
3. Check the [Troubleshooting Guide](05-TROUBLESHOOTING.md) for common issues
4. Review the [FAQ](04-FAQ.md) for quick answers

---

**Document Information:**
- Version: 1.0.0
- Last Updated: 2026-01-30
- Maintained by: SIN-Solver Team
- License: MIT
