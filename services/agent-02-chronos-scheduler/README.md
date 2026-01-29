# Zimmer-02: Chronos - Strategic Time-Based Task Scheduler

**Port:** 3001 | **IP:** 172.20.0.2 | **Version:** 1.0.0

```
 ██████╗██╗  ██╗██████╗  ██████╗ ███╗   ██╗ ██████╗ ███████╗
██╔════╝██║  ██║██╔══██╗██╔═══██╗████╗  ██║██╔═══██╗██╔════╝
██║     ███████║██████╔╝██║   ██║██╔██╗ ██║██║   ██║███████╗
██║     ██╔══██║██╔══██╗██║   ██║██║╚██╗██║██║   ██║╚════██║
╚██████╗██║  ██║██║  ██║╚██████╔╝██║ ╚████║╚██████╔╝███████║
 ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝
                Time is the Ultimate Currency
```

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [API Reference](#api-reference)
5. [Cron Expression Guide](#cron-expression-guide)
6. [Database Schema](#database-schema)
7. [Configuration](#configuration)
8. [Docker Deployment](#docker-deployment)
9. [Inter-Service Communication](#inter-service-communication)
10. [Usage Examples](#usage-examples)
11. [Scheduling Patterns](#scheduling-patterns)
12. [Monitoring & Observability](#monitoring--observability)
13. [Troubleshooting](#troubleshooting)
14. [Security](#security)
15. [Cost Analysis](#cost-analysis)
16. [Version History](#version-history)

---

## Overview

Chronos is the **strategic time-based task scheduler** for the Delqhi-Platform Empire. Named after the Greek god of time, this service manages all scheduled tasks, cron jobs, and time-based workflow triggers across the 23-room distributed architecture.

### Purpose in Delqhi-Platform Ecosystem

| Aspect | Description |
|--------|-------------|
| **Role** | Central scheduling authority for all time-based operations |
| **Integration** | Connects with API Brain (Zimmer-13), n8n (Zimmer-01), and all workers |
| **Persistence** | PostgreSQL-backed schedule storage with execution history |
| **Reliability** | Graceful shutdown, job recovery, and failure tracking |

### Key Capabilities

- **Cron-Based Scheduling**: Full cron expression support with timezone awareness
- **Workflow Triggers**: Automatic task creation via API Brain integration
- **Execution History**: Complete audit trail of all scheduled task executions
- **Dynamic Management**: Create, update, enable/disable schedules at runtime
- **Multi-Timezone**: Support for scheduling in any global timezone

---

## Architecture

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CHRONOS SCHEDULER (Zimmer-02)                        │
│                            172.20.0.2:3001                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        EXPRESS SERVER                                │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    │
│  │  │  /health     │  │ /api/schedules│  │/api/executions│            │    │
│  │  │  Health Check│  │ CRUD Ops     │  │ History      │              │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        JOB SCHEDULER                                 │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │                    node-cron Engine                           │  │    │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │  │    │
│  │  │  │ Job 1   │ │ Job 2   │ │ Job 3   │ │ Job N   │            │  │    │
│  │  │  │ * * * * │ │ 0 9 * * │ │ */5 * * │ │ ...     │            │  │    │
│  │  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘            │  │    │
│  │  └───────┴───────────┴───────────┴───────────┴──────────────────┘  │    │
│  └──────────────────────────────────┬──────────────────────────────────┘    │
│                                     │                                        │
│                                     ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      TASK EXECUTOR                                   │    │
│  │                 (API Brain Integration)                              │    │
│  │                                                                      │    │
│  │    Schedule Trigger → POST /api/tasks → API Brain → Worker          │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        POSTGRESQL (Zimmer-10)                                │
│                         172.20.0.10:5432                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐    ┌────────────────────────────────────────┐   │
│  │     schedules table    │    │       schedule_executions table        │   │
│  │  - id                  │    │  - id                                  │   │
│  │  - name                │    │  - schedule_id (FK)                    │   │
│  │  - cron_expression     │    │  - task_id                             │   │
│  │  - timezone            │    │  - status                              │   │
│  │  - task_type           │    │  - error                               │   │
│  │  - task_payload        │    │  - duration_ms                         │   │
│  │  - enabled             │    │  - executed_at                         │   │
│  │  - last_run_at         │    └────────────────────────────────────────┘   │
│  │  - run_count           │                                                 │
│  └────────────────────────┘                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        API BRAIN (Zimmer-13)                                 │
│                        172.20.0.31:8000                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│  POST /api/tasks  →  Task Queue  →  Worker Distribution                     │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Survey      │  │ Website     │  │ Video Gen   │  │ Forum Bot   │        │
│  │ Worker      │  │ Worker      │  │ Worker      │  │ Worker      │        │
│  │ (Zimmer-18) │  │ (Zimmer-20) │  │ (Zimmer-21) │  │ (Zimmer-22) │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Web Server** | Express.js 4.21 | REST API for schedule management |
| **Scheduler** | node-cron 3.0 | Cron expression parsing and job execution |
| **Database** | PostgreSQL 15+ | Persistent schedule storage |
| **Logger** | Pino 9.x | Structured JSON logging |
| **HTTP Client** | Axios 1.7 | API Brain communication |

---

## Features

### Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Cron Scheduling** | Standard 5-field cron expressions | ✅ Active |
| **Timezone Support** | IANA timezone database support | ✅ Active |
| **Dynamic Schedules** | Runtime create/update/delete | ✅ Active |
| **Execution History** | Full audit trail with metrics | ✅ Active |
| **Auto-Recovery** | Loads schedules on startup | ✅ Active |
| **Graceful Shutdown** | Clean job termination on SIGTERM | ✅ Active |
| **Health Monitoring** | Active job count, uptime metrics | ✅ Active |

### Schedule Management

```javascript
// Schedule Object Structure
{
  id: "uuid",                           // Unique identifier
  name: "Daily Survey Check",           // Human-readable name
  description: "Check for new surveys", // Optional description
  cron_expression: "0 9 * * *",         // Cron timing
  timezone: "Europe/Berlin",            // IANA timezone
  task_type: "survey-check",            // Task identifier
  task_payload: { platforms: [...] },   // Custom payload
  workflow_id: "wf-123",                // Optional n8n workflow
  enabled: true,                        // Active status
  last_run_at: "2026-01-27T09:00:00Z",  // Last execution
  run_count: 42,                        // Total executions
  created_at: "2026-01-01T00:00:00Z",   // Creation timestamp
  updated_at: "2026-01-27T00:00:00Z"    // Last modification
}
```

---

## API Reference

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "activeJobs": 15,
  "uptime": 86400.123
}
```

**Response Codes:**
| Code | Meaning |
|------|---------|
| 200 | Healthy - database connected |
| 503 | Unhealthy - database connection failed |

---

### List All Schedules

```http
GET /api/schedules
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Hourly Survey Check",
    "description": "Check all platforms for new surveys",
    "cron_expression": "0 * * * *",
    "timezone": "UTC",
    "task_type": "survey-check",
    "task_payload": {"platforms": ["prolific", "swagbucks"]},
    "workflow_id": null,
    "enabled": true,
    "last_run_at": "2026-01-27T12:00:00.000Z",
    "run_count": 288,
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-27T12:00:00.000Z"
  }
]
```

---

### Create Schedule

```http
POST /api/schedules
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Daily Video Generation",
  "description": "Generate social media videos at 9am",
  "cron_expression": "0 9 * * *",
  "timezone": "Europe/Berlin",
  "task_type": "video-generate",
  "task_payload": {
    "topic": "AI News",
    "platforms": ["tiktok", "youtube"],
    "duration": 60
  },
  "enabled": true
}
```

**Response (201 Created):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Daily Video Generation",
  "cron_expression": "0 9 * * *",
  "timezone": "Europe/Berlin",
  "enabled": true,
  "created_at": "2026-01-27T14:30:00.000Z"
}
```

**Validation:**
| Field | Required | Validation |
|-------|----------|------------|
| name | Yes | String, non-empty |
| cron_expression | Yes | Valid cron format |
| task_type | Yes | String identifier |
| timezone | No | Valid IANA timezone (default: UTC) |
| task_payload | No | JSON object |
| enabled | No | Boolean (default: true) |

---

### Get Schedule by ID

```http
GET /api/schedules/:id
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Hourly Survey Check",
  "cron_expression": "0 * * * *",
  "timezone": "UTC",
  "task_type": "survey-check",
  "task_payload": {"platforms": ["prolific"]},
  "enabled": true,
  "last_run_at": "2026-01-27T12:00:00.000Z",
  "run_count": 288
}
```

---

### Update Schedule

```http
PUT /api/schedules/:id
Content-Type: application/json
```

**Request Body (partial update supported):**
```json
{
  "cron_expression": "*/30 * * * *",
  "enabled": true
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Hourly Survey Check",
  "cron_expression": "*/30 * * * *",
  "enabled": true,
  "updated_at": "2026-01-27T14:45:00.000Z"
}
```

---

### Delete Schedule

```http
DELETE /api/schedules/:id
```

**Response:** 204 No Content

---

### Manual Trigger

```http
POST /api/schedules/:id/run
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule executed"
}
```

---

### Execution History

```http
GET /api/executions?limit=50&schedule_id=uuid
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 50 | Max results to return |
| schedule_id | uuid | null | Filter by schedule |

**Response:**
```json
[
  {
    "id": "exec-001",
    "schedule_id": "550e8400-e29b-41d4-a716-446655440000",
    "schedule_name": "Hourly Survey Check",
    "task_id": "task-abc-123",
    "status": "completed",
    "error": null,
    "duration_ms": 1250,
    "executed_at": "2026-01-27T12:00:00.000Z"
  }
]
```

---

## Cron Expression Guide

### Standard 5-Field Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 7, 0 and 7 are Sunday)
│ │ │ │ │
* * * * *
```

### Special Characters

| Character | Meaning | Example |
|-----------|---------|---------|
| `*` | Any value | `* * * * *` (every minute) |
| `,` | List separator | `0,30 * * * *` (0 and 30 minutes) |
| `-` | Range | `0-5 * * * *` (minutes 0-5) |
| `/` | Step | `*/15 * * * *` (every 15 minutes) |

### Common Patterns

| Pattern | Cron Expression | Description |
|---------|-----------------|-------------|
| Every minute | `* * * * *` | Runs every minute |
| Hourly | `0 * * * *` | At minute 0 of every hour |
| Daily at 9am | `0 9 * * *` | Every day at 09:00 |
| Daily at midnight | `0 0 * * *` | Every day at 00:00 |
| Every 5 minutes | `*/5 * * * *` | At :00, :05, :10, etc. |
| Every 15 minutes | `*/15 * * * *` | At :00, :15, :30, :45 |
| Every 30 minutes | `*/30 * * * *` | At :00 and :30 |
| Weekdays at 9am | `0 9 * * 1-5` | Monday-Friday at 09:00 |
| Weekends at noon | `0 12 * * 0,6` | Saturday/Sunday at 12:00 |
| First of month | `0 0 1 * *` | First day at midnight |
| Every Monday 10am | `0 10 * * 1` | Mondays at 10:00 |

### Timezone Examples

| Timezone | IANA Identifier | UTC Offset |
|----------|-----------------|------------|
| Germany | `Europe/Berlin` | UTC+1/+2 |
| UK | `Europe/London` | UTC+0/+1 |
| US East | `America/New_York` | UTC-5/-4 |
| US West | `America/Los_Angeles` | UTC-8/-7 |
| Japan | `Asia/Tokyo` | UTC+9 |
| Australia | `Australia/Sydney` | UTC+10/+11 |

---

## Database Schema

### schedules Table

```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cron_expression VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  task_type VARCHAR(100) NOT NULL,
  task_payload JSONB DEFAULT '{}',
  workflow_id VARCHAR(100),
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_schedules_enabled ON schedules(enabled);
CREATE INDEX idx_schedules_task_type ON schedules(task_type);
```

### schedule_executions Table

```sql
CREATE TABLE schedule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  task_id VARCHAR(100),
  status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'failed')),
  error TEXT,
  duration_ms INTEGER,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX idx_executions_executed_at ON schedule_executions(executed_at DESC);
CREATE INDEX idx_executions_status ON schedule_executions(status);
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Server listen port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `API_BRAIN_URL` | No | http://api-brain:8000 | API Brain endpoint |
| `LOG_LEVEL` | No | info | Logging level (trace, debug, info, warn, error) |

### Example .env File

```bash
# Chronos Configuration
PORT=3001
LOG_LEVEL=info

# Database Connection
DATABASE_URL=postgresql://sin_admin:delqhi-platform-2026@172.20.0.10:5432/sin_solver

# API Brain Integration
API_BRAIN_URL=http://172.20.0.31:8000
```

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

FROM node:20-alpine
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1
CMD ["node", "server.js"]
```

### Build & Run

```bash
# Build the image
docker build -t sin-chronos:latest .

# Run the container
docker run -d \
  --name sin-chronos \
  --network sin-network \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://sin_admin:delqhi-platform-2026@postgres:5432/sin_solver" \
  -e API_BRAIN_URL="http://api-brain:8000" \
  --restart unless-stopped \
  sin-chronos:latest

# Check logs
docker logs -f sin-chronos

# Check health
curl http://localhost:3001/health
```

### Docker Compose

```yaml
version: '3.8'

services:
  chronos:
    image: sin-chronos:latest
    build:
      context: .
      dockerfile: Dockerfile
    container_name: sin-chronos
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - DATABASE_URL=postgresql://sin_admin:delqhi-platform-2026@postgres:5432/sin_solver
      - API_BRAIN_URL=http://api-brain:8000
      - LOG_LEVEL=info
    networks:
      sin-network:
        ipv4_address: 172.20.0.2
    depends_on:
      postgres:
        condition: service_healthy
      api-brain:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

networks:
  sin-network:
    external: true
```

---

## Inter-Service Communication

### Upstream Dependencies

| Service | Purpose | Endpoint |
|---------|---------|----------|
| PostgreSQL (Zimmer-10) | Schedule persistence | postgresql://172.20.0.10:5432 |
| API Brain (Zimmer-13) | Task creation | http://172.20.0.31:8000/api/tasks |

### Downstream Consumers

| Service | Triggered By | Task Type |
|---------|--------------|-----------|
| Survey Worker (Zimmer-18) | Schedule trigger | survey-check, survey-complete |
| Website Worker (Zimmer-20) | Schedule trigger | website-task |
| Video Generator (Zimmer-21) | Schedule trigger | video-generate |
| Forum Bot (Zimmer-22) | Schedule trigger | forum-post |

### Task Creation Flow

```
1. Cron job triggers at scheduled time
2. Chronos calls API Brain: POST /api/tasks
3. API Brain queues task for appropriate worker
4. Worker processes task asynchronously
5. Chronos logs execution result
```

---

## Usage Examples

### Create Survey Check Schedule

```bash
curl -X POST http://localhost:3001/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prolific Survey Check",
    "description": "Check Prolific for new studies every 5 minutes",
    "cron_expression": "*/5 * * * *",
    "timezone": "Europe/Berlin",
    "task_type": "survey-check",
    "task_payload": {
      "platform": "prolific",
      "priority": "high"
    }
  }'
```

### Create Daily Video Generation

```bash
curl -X POST http://localhost:3001/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily TikTok Video",
    "description": "Generate trending topic video for TikTok",
    "cron_expression": "0 8 * * *",
    "timezone": "America/New_York",
    "task_type": "video-generate",
    "task_payload": {
      "platform": "tiktok",
      "topic_source": "trending",
      "duration_seconds": 60
    }
  }'
```

### Disable a Schedule

```bash
curl -X PUT http://localhost:3001/api/schedules/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Trigger Immediate Execution

```bash
curl -X POST http://localhost:3001/api/schedules/550e8400-e29b-41d4-a716-446655440000/run
```

### View Recent Executions

```bash
curl "http://localhost:3001/api/executions?limit=10"
```

---

## Monitoring & Observability

### Health Check

```bash
# Quick health check
curl -s http://localhost:3001/health | jq

# Watch health continuously
watch -n 5 'curl -s http://localhost:3001/health | jq'
```

### Logging

Chronos uses structured JSON logging via Pino:

```json
{
  "level": 30,
  "time": 1706360400000,
  "pid": 1,
  "hostname": "chronos",
  "scheduleId": "uuid",
  "taskId": "task-123",
  "msg": "Schedule executed successfully"
}
```

### Log Levels

| Level | Numeric | Events |
|-------|---------|--------|
| trace | 10 | Verbose debugging |
| debug | 20 | Detailed info |
| info | 30 | Normal operations (default) |
| warn | 40 | Potential issues |
| error | 50 | Errors and failures |

### Metrics to Monitor

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Active Jobs | /health → activeJobs | < 1 (if expected > 0) |
| Execution Failures | schedule_executions | > 10% failure rate |
| Execution Duration | duration_ms | > 60000ms |
| Database Connection | /health status | unhealthy |

---

## Troubleshooting

### Common Issues

#### Schedule Not Running

```bash
# 1. Check if schedule is enabled
curl http://localhost:3001/api/schedules/<id> | jq '.enabled'

# 2. Verify cron expression is valid
# Use https://crontab.guru to validate

# 3. Check active jobs
curl http://localhost:3001/health | jq '.activeJobs'

# 4. Check logs for errors
docker logs sin-chronos --tail 100
```

#### Database Connection Failed

```bash
# Check PostgreSQL is running
docker exec sin-postgres pg_isready

# Verify connection string
docker exec sin-chronos env | grep DATABASE_URL

# Test connection manually
docker exec sin-postgres psql -U sin_admin -d sin_solver -c "SELECT 1"
```

#### Task Not Created in API Brain

```bash
# Check API Brain is healthy
curl http://172.20.0.31:8000/health

# Check Chronos can reach API Brain
docker exec sin-chronos wget -qO- http://api-brain:8000/health

# Check execution history for errors
curl "http://localhost:3001/api/executions?limit=10" | jq '.[] | select(.status == "failed")'
```

#### Timezone Issues

```bash
# List valid timezones
docker exec sin-chronos node -e "console.log(Intl.supportedValuesOf('timeZone'))"

# Check container timezone
docker exec sin-chronos date
```

---

## Security

### Best Practices

| Practice | Implementation |
|----------|----------------|
| Non-root user | Container runs as appuser (UID 1001) |
| Network isolation | Uses sin-network with fixed IPs |
| Credential management | Environment variables, no hardcoding |
| Input validation | Cron expression validation |
| SQL injection prevention | Parameterized queries |

### Network Security

```
External Access: Blocked (internal network only)
Allowed Connections:
  - PostgreSQL (172.20.0.10:5432)
  - API Brain (172.20.0.31:8000)
  - Health checks from Docker/orchestrator
```

---

## Cost Analysis

### Infrastructure Costs

| Component | Cost | Notes |
|-----------|------|-------|
| Chronos Service | **FREE** | Self-hosted Node.js |
| PostgreSQL | **FREE** | Self-hosted database |
| node-cron | **FREE** | Open-source MIT license |
| Docker | **FREE** | Community Edition |

### Total Monthly Cost: **$0.00**

All components are 100% self-hosted with open-source software.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-27 | Initial release with full CRUD, cron scheduling, execution history |

---

## Related Services

| Service | Relationship |
|---------|--------------|
| [Zimmer-01: n8n](../zimmer-01-n8n/) | Workflow orchestration |
| [Zimmer-10: PostgreSQL](../zimmer-10-postgres/) | Database storage |
| [Zimmer-13: API Brain](../zimmer-13-api-coordinator/) | Task distribution |
| [Zimmer-18: Survey Worker](../zimmer-18-survey-worker/) | Survey automation |
| [Zimmer-20: Website Worker](../zimmer-20-website-worker/) | Website tasks |

---

**Zimmer-02: Chronos** | Delqhi-Platform Empire  
**Port:** 3001 | **IP:** 172.20.0.2  
**Cost:** 100% FREE  
**Last Updated:** 2026-01-27
