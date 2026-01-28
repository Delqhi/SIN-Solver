# n8n Workflows for SIN-Solver System

## Overview

This directory contains three production-ready n8n workflows that form the orchestration backbone of the SIN-Solver system. Each workflow tests and demonstrates different integration patterns.

### Workflows

1. **01-postgres-test.json** - PostgreSQL CRUD Testing
   - Tests direct database connectivity
   - Creates tables, inserts records, and retrieves data
   - Used to verify PostgreSQL availability within Docker network

2. **02-agent-zero-task.json** - Agent Zero Integration
   - Demonstrates AI agent integration via HTTP API
   - Sends tasks to Agent Zero and stores results in PostgreSQL
   - Useful for testing agent availability and response times

3. **03-full-orchestration.json** - Complete Service Chain
   - Full production workflow showing service orchestration
   - Uses Redis for caching, Agent Zero for processing, PostgreSQL for logging
   - Demonstrates error handling and data flow across all services

## Installation & Setup

### Prerequisites

- n8n running at `http://localhost:5678` (on host machine)
- Docker network with running services:
  - `room-03-postgres-master:5432` (PostgreSQL)
  - `room-04-redis-cache:6379` (Redis)
  - `agent-03-agentzero-coder:8000` (Agent Zero)
  - `agent-01-n8n-orchestrator:5678` (n8n - internal Docker hostname)

### Step 1: Add Database Credentials to n8n

Before importing workflows, you must configure the database connections in n8n:

1. Open n8n at `http://localhost:5678`
2. Go to **Credentials** (bottom left)
3. Create new credential **"postgres_docker"**
   - Host: `room-03-postgres-master`
   - Port: `5432`
   - User: `postgres`
   - Password: `{{ env.POSTGRES_PASSWORD }}` (or your password)
   - Database: `sin_solver`
4. Create new credential **"redis_docker"**
   - Host: `room-04-redis-cache`
   - Port: `6379`
   - Password: (leave empty if no auth)

### Step 2: Import Workflows

**Via n8n UI:**
1. Click **Workflows** → **Import**
2. Select one of the JSON files from this directory
3. Click **Import from file**
4. Verify credentials are selected correctly
5. Click **Import** and wait for success message

**Via n8n API:**

```bash
# Import workflow 1
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d @01-postgres-test.json

# Import workflow 2
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d @02-agent-zero-task.json

# Import workflow 3
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d @03-full-orchestration.json
```

### Step 3: Create Required Database Tables

Run these SQL commands in PostgreSQL to create necessary tables:

```sql
-- Create workflow_test table (used by workflow 1)
CREATE TABLE IF NOT EXISTS workflow_test (
    id SERIAL PRIMARY KEY,
    test_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create agent_executions table (used by workflow 2)
CREATE TABLE IF NOT EXISTS agent_executions (
    id SERIAL PRIMARY KEY,
    task_input TEXT,
    agent_response TEXT,
    status VARCHAR(50),
    execution_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orchestration_log table (used by workflow 3)
CREATE TABLE IF NOT EXISTS orchestration_log (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(100) UNIQUE,
    operation VARCHAR(100),
    input_data TEXT,
    agent_response TEXT,
    cache_hit BOOLEAN,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_request_id (request_id),
    INDEX idx_created_at (created_at)
);
```

**Via psql:**
```bash
psql -h room-03-postgres-master -U postgres -d sin_solver < schema.sql
```

## Testing the Workflows

### Workflow 1: PostgreSQL Test

```bash
# Trigger via webhook
curl -X POST http://localhost:5678/webhook/postgres-test \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected response:
# {
#   "id": 1,
#   "test_name": "n8n Test - 2026-01-28T15:30:00.000Z",
#   "created_at": "2026-01-28T15:30:00.000Z"
# }
```

### Workflow 2: Agent Zero Integration

```bash
# Trigger with custom task
curl -X POST http://localhost:5678/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{
    "task": "What is the capital of France?"
  }'

# Expected response includes:
# - Agent Zero result
# - PostgreSQL insertion confirmation
# - Last 5 execution records
```

### Workflow 3: Full Orchestration

```bash
# Trigger complete workflow
curl -X POST http://localhost:5678/webhook/orchestration \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "analyze_content",
    "task": "Analyze this data for patterns",
    "requestId": "req-12345"
  }'

# Expected response:
# {
#   "success": true,
#   "requestId": "req-12345",
#   "operation": "analyze_content",
#   "executionTime": 2345,
#   "agentOutput": "...",
#   "cacheStored": true,
#   "databaseLogged": true,
#   "timestamp": "2026-01-28T15:30:00.000Z"
# }
```

## Architecture & Data Flow

### Workflow 1: PostgreSQL Test
```
Webhook → Create Table → Insert Record → Select Records → Response
```

### Workflow 2: Agent Zero Integration
```
Webhook → Agent Zero API → Store in DB → Fetch Results → Response
```

### Workflow 3: Full Orchestration (Production)
```
Webhook → Prepare → Check Cache (Redis) → Agent Zero → Cache Result
         ↓
    Log to PostgreSQL → Format Response → Response
```

## Docker Service Hostnames (CRITICAL)

**IMPORTANT:** All workflows use Docker internal service hostnames. These are **NOT localhost**:

| Service | Docker Hostname | Port | Host Access |
|---------|-----------------|------|-------------|
| PostgreSQL | `room-03-postgres-master` | 5432 | `localhost:5432` |
| Redis | `room-04-redis-cache` | 6379 | `localhost:6379` |
| Agent Zero | `agent-03-agentzero-coder` | 8000 | `localhost:8000` |
| n8n | `agent-01-n8n-orchestrator` | 5678 | `localhost:5678` |

**Why?** Docker containers communicate via their network names, not localhost. Using localhost from within n8n would fail.

## Credentials Reference

### PostgreSQL Credential ("postgres_docker")
- **Host:** `room-03-postgres-master`
- **Port:** `5432`
- **Database:** `sin_solver`
- **User:** `postgres`
- **Password:** Check `.env` file or Docker secrets

### Redis Credential ("redis_docker")
- **Host:** `room-04-redis-cache`
- **Port:** `6379`
- **Password:** (usually empty in development)

## Error Handling

All workflows include error handling:

- **PostgreSQL errors:** Logged but don't stop execution (onError: continueErrorOutput)
- **Agent Zero timeout:** Returns error response in 60 seconds
- **Redis cache failures:** Non-blocking, workflow continues
- **Response formatting:** Always returns JSON response with status

## Monitoring & Logging

### Check Execution History

1. Open n8n UI → Workflows → Select workflow → **Executions**
2. View logs for each execution
3. Debug mode shows variable contents at each step

### Query Logs in PostgreSQL

```sql
-- Check agent execution logs
SELECT * FROM agent_executions ORDER BY execution_timestamp DESC LIMIT 10;

-- Check orchestration logs
SELECT * FROM orchestration_log ORDER BY created_at DESC LIMIT 10;

-- Check cache hits
SELECT COUNT(*) as total, 
       SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits
FROM orchestration_log;
```

### Monitor Redis Cache

```bash
# Via Docker
docker exec room-04-redis-cache redis-cli
> KEYS *
> GET <request-id>
> DBSIZE
```

## Production Deployment

### Enable Workflows

```bash
# Via curl API
curl -X PATCH http://localhost:5678/api/v1/workflows/{{ workflow-id }} \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

### Set Up Webhooks as Cron

Workflows can be triggered by:
1. Direct HTTP webhooks (as shown above)
2. External cron jobs
3. n8n scheduler nodes
4. External webhook services

### Scale Considerations

- Each workflow executes independently
- Database connections use connection pooling
- Redis used for distributed caching (supports multiple n8n instances)
- Agent Zero should have queue management for load balancing

## Troubleshooting

### "Connection refused" errors

**Problem:** Cannot connect to PostgreSQL or Redis
**Solution:** Verify services are running in Docker
```bash
docker ps | grep -E "postgres|redis|agent-03"
```

### "Webhook URL already exists"

**Problem:** Webhook ID conflicts when importing
**Solution:** Edit the JSON file and change `webhookId` to unique values:
```json
"webhookId": "postgres-test-webhook-{{ timestamp }}"
```

### Agent Zero returns timeout

**Problem:** Agent Zero takes too long
**Solution:** Increase timeout in workflow (currently 60 seconds max)

### PostgreSQL table doesn't exist

**Problem:** "relation ... does not exist"
**Solution:** Run schema creation SQL (see Step 3 above)

## Advanced Usage

### Custom Credentials

To use environment variables in credentials:
```
User: postgres
Password: {{ env.POSTGRES_PASSWORD }}
Host: {{ env.POSTGRES_HOST }}
```

### Conditional Logic

Workflows support conditional branching:
```javascript
if ($node.previousNode.json.status === 'success') {
  // Execute next node
}
```

### Batch Processing

To process multiple items:
```json
{
  "items": [
    { "task": "Task 1" },
    { "task": "Task 2" },
    { "task": "Task 3" }
  ]
}
```

n8n automatically iterates over items.

## Support & Maintenance

For issues or improvements:
1. Check n8n execution logs
2. Verify Docker service status
3. Check PostgreSQL connectivity
4. Review Redis cache status
5. Test Agent Zero API directly: `curl http://localhost:8000/health`

## Version History

- **v1.0** (2026-01-28): Initial production workflows
  - PostgreSQL CRUD testing
  - Agent Zero integration
  - Full orchestration chain with caching and logging
