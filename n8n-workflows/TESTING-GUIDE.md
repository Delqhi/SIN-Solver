# n8n Workflows - Testing Guide

## Pre-Import Checklist

Before importing workflows, verify everything is ready:

### 1. Check Docker Services

```bash
# Verify all required services are running
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "room-03|room-04|agent-03|agent-01"
```

**Expected services:**
- ✓ `room-03-postgres-master` (PostgreSQL)
- ✓ `room-04-redis-cache` (Redis)
- ✓ `agent-03-agentzero-coder` (Agent Zero)
- ✓ `agent-01-n8n-orchestrator` (n8n)

### 2. Test Direct Connectivity

Test each service can be reached from your local machine:

```bash
# Test PostgreSQL
psql -h localhost -U postgres -d sin_solver -c "SELECT version();"

# Test Redis
redis-cli -h localhost PING

# Test Agent Zero (from host, not Docker)
curl http://localhost:8000/health

# Test n8n API
curl http://localhost:5678/api/v1/health
```

### 3. Create Database Tables

Run the schema.sql file to create required tables:

```bash
# From project root
psql -h localhost -U postgres -d sin_solver < n8n-workflows/schema.sql
```

**Verify tables:**
```bash
psql -h localhost -U postgres -d sin_solver -c "\dt"
# Should show: workflow_test, agent_executions, orchestration_log
```

## Import Workflows

### Method 1: n8n UI (Recommended)

1. Open http://localhost:5678 in browser
2. Click **Workflows** → **Import**
3. Select file from `n8n-workflows/` directory
4. Verify credentials are set correctly
5. Click **Import**

### Method 2: n8n API

```bash
# Import all workflows
for workflow in 01-postgres-test.json 02-agent-zero-task.json 03-full-orchestration.json; do
  curl -X POST http://localhost:5678/api/v1/workflows \
    -H "Content-Type: application/json" \
    -d @n8n-workflows/$workflow
done
```

## Test Each Workflow

### Test 1: PostgreSQL Test Workflow

**Purpose:** Verify database connectivity and CRUD operations

```bash
curl -X POST http://localhost:5678/webhook/postgres-test \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "test_name": "n8n Test - 2026-01-28T15:30:00.000Z",
    "created_at": "2026-01-28T15:30:00.000Z"
  },
  ...
]
```

**Verification in PostgreSQL:**
```bash
psql -h localhost -U postgres -d sin_solver -c "SELECT * FROM workflow_test;"
```

---

### Test 2: Agent Zero Integration Workflow

**Purpose:** Verify Agent Zero API integration and result storage

```bash
# Simple test
curl -X POST http://localhost:5678/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{}'

# With custom task
curl -X POST http://localhost:5678/webhook/agent-task \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Calculate 2 + 2"
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "task_input": "Calculate 2 + 2",
  "agent_response": "{\"result\": 4}",
  "status": "success",
  "execution_timestamp": "2026-01-28T15:30:00.000Z"
},
...
```

**Verification in PostgreSQL:**
```bash
psql -h localhost -U postgres -d sin_solver -c "SELECT * FROM agent_executions LIMIT 5;"
```

---

### Test 3: Full Orchestration Workflow

**Purpose:** Verify complete service chain (Redis → Agent Zero → PostgreSQL)

```bash
# Simple test
curl -X POST http://localhost:5678/webhook/orchestration \
  -H "Content-Type: application/json" \
  -d '{}'

# With operation and task
curl -X POST http://localhost:5678/webhook/orchestration \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "analyze_data",
    "task": "Find patterns in this dataset",
    "requestId": "req-001"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "requestId": "req-001",
  "operation": "analyze_data",
  "executionTime": 2345,
  "agentOutput": "...",
  "cacheStored": true,
  "databaseLogged": true,
  "timestamp": "2026-01-28T15:30:00.000Z"
}
```

**Verification in PostgreSQL:**
```bash
psql -h localhost -U postgres -d sin_solver -c "SELECT * FROM orchestration_log LIMIT 5;"
```

**Verification in Redis:**
```bash
redis-cli -h localhost
> KEYS *
> GET req-001
```

---

## Troubleshooting

### Issue: "Connection refused" on PostgreSQL

**Cause:** PostgreSQL not accessible at localhost:5432

**Solution:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres
docker logs room-03-postgres-master

# Try connecting directly
psql -h localhost -U postgres
```

### Issue: "ECONNREFUSED" on Redis

**Cause:** Redis not accessible

**Solution:**
```bash
# Check if Redis is running
docker ps | grep redis
docker logs room-04-redis-cache

# Test directly
redis-cli -h localhost PING
```

### Issue: Workflow returns "Agent Zero error"

**Cause:** Agent Zero API not responding

**Solution:**
```bash
# Test Agent Zero directly
curl http://localhost:8000/health

# Check logs
docker logs agent-03-agentzero-coder
```

### Issue: "relation does not exist" error

**Cause:** Database tables not created

**Solution:**
```bash
# Create tables
psql -h localhost -U postgres -d sin_solver < n8n-workflows/schema.sql

# Verify
psql -h localhost -U postgres -d sin_solver -c "\dt"
```

### Issue: n8n not accessible at localhost:5678

**Cause:** n8n not running or port forwarded incorrectly

**Solution:**
```bash
# Check if n8n is running
docker ps | grep n8n

# Check port mapping
docker port agent-01-n8n-orchestrator | grep 5678

# Access via Docker DNS (internal)
curl http://agent-01-n8n-orchestrator:5678/api/v1/health
```

---

## Performance Testing

### Load Test Workflow 1

```bash
# Send 100 requests
for i in {1..100}; do
  curl -X POST http://localhost:5678/webhook/postgres-test \
    -H "Content-Type: application/json" \
    -d '{}' &
done
wait

# Check results
psql -h localhost -U postgres -d sin_solver -c "SELECT COUNT(*) FROM workflow_test;"
```

### Load Test Workflow 3 (Caching)

```bash
# First request (cache miss)
time curl -X POST http://localhost:5678/webhook/orchestration \
  -H "Content-Type: application/json" \
  -d '{"requestId": "perf-test-1"}'

# Same request ID (cache hit)
time curl -X POST http://localhost:5678/webhook/orchestration \
  -H "Content-Type: application/json" \
  -d '{"requestId": "perf-test-1"}'

# Cache hit should be faster!
```

---

## Monitoring

### View n8n Execution Logs

1. Open http://localhost:5678
2. Click **Workflows**
3. Select a workflow
4. Click **Executions**
5. Click on an execution to see details

### View Database Logs

```bash
# Check recent executions
psql -h localhost -U postgres -d sin_solver -c \
  "SELECT * FROM orchestration_log ORDER BY created_at DESC LIMIT 10;"

# Check cache hit rate
psql -h localhost -U postgres -d sin_solver -c \
  "SELECT 
    COUNT(*) as total_executions,
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
    ROUND(100.0 * SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) / COUNT(*), 2) as cache_hit_rate
  FROM orchestration_log;"
```

### Monitor Redis Cache

```bash
redis-cli -h localhost
> INFO memory
> DBSIZE
> KEYS *
```

---

## Next Steps

After successful testing:

1. **Enable workflows** for production use
2. **Set up monitoring** with n8n dashboard
3. **Configure cron triggers** for periodic execution
4. **Add error notifications** via email/Slack
5. **Monitor performance metrics** in PostgreSQL

