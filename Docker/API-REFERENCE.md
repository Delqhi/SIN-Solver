# 🔌 Delqhi-Platform API Reference (Phase 7)

## PostgreSQL Connection

**Host:** room-03-postgres-master  
**Port:** 5432  
**Database:** sin_solver  
**User:** postgres  
**Password:** sinsolveradmin2026!SecurePass

### Test Tables Created:
- `workflow_tests` - Workflow execution results
- `solver_attempts` - Solver task attempts
- `agent_executions` - Agent execution logs

## Redis Cache

**Host:** room-04-redis-cache  
**Port:** 6379  
**Password:** sinredis2026!SecurePass

### Test Keys:
- `phase7:setup_complete` - Setup status (TTL: 24h)
- `phase7:test_counter` - Test execution counter
- `phase7:workflow_queue` - Workflow queue state
- `phase7:cache_stats` - Cache statistics

## Service Endpoints

### n8n Orchestrator
- **URL:** http://localhost:5678
- **API:** http://localhost:5678/api
- **Health:** http://localhost:5678/api/health
- **Workflows:** GET /api/v1/workflows

### Agent Zero (Code Generation)
- **URL:** http://localhost:8050
- **Health:** http://localhost:8050/health
- **Generate:** POST http://agent-03-agentzero-coder:8050/api/generate

### Steel Browser
- **URL:** http://localhost:3005
- **Health:** http://localhost:3005/health
- **Browse:** POST http://agent-05-steel-browser:3005/api/browse

### Skyvern (Visual Solver)
- **URL:** http://localhost:8030
- **Health:** http://localhost:8030/health
- **Solve:** POST http://agent-06-skyvern-solver:8030/api/solve

### Captcha Solver
- **URL:** http://localhost:8019
- **Health:** http://localhost:8019/health
- **Solve:** POST http://solver-1.1-captcha-worker:8000/api/solve

### Survey Worker
- **URL:** http://localhost:8018
- **Health:** http://localhost:8018/health
- **Execute:** POST http://solver-2.1-survey-worker:8000/api/execute

## Test Workflows (To Be Created in n8n UI)

### Workflow 1: DB Direct Test
**Trigger:** Manual  
**Steps:**
1. PostgreSQL SELECT COUNT(*) FROM workflow_tests
2. PostgreSQL INSERT test record
3. Return result

**Expected Output:** JSON with record count and insert status

### Workflow 2: Redis Cache Test
**Trigger:** Manual  
**Steps:**
1. Redis SET phase7:test_key timestamp
2. Redis GET phase7:test_key
3. Compare values

**Expected Output:** JSON with SET/GET status

### Workflow 3: Agent Zero Trigger
**Trigger:** HTTP POST  
**Steps:**
1. Call Agent Zero API
2. Generate Python script
3. Store in PostgreSQL

**Expected Output:** Generated code stored

### Workflow 4: Browser Screenshot
**Trigger:** HTTP POST  
**Steps:**
1. Call Steel Browser
2. Screenshot dashboard
3. Store metadata in DB

**Expected Output:** Screenshot URL stored

### Workflow 5: Captcha Integration
**Trigger:** HTTP POST  
**Steps:**
1. Call Captcha Solver
2. Process image
3. Log attempt to DB

**Expected Output:** Solution or error logged

### Workflow 6: Full Pipeline
**Trigger:** Webhook  
**Steps:**
1. Receive request
2. Log to PostgreSQL
3. Process with agents
4. Call solvers
5. Aggregate results
6. Return response

**Expected Output:** Complete JSON result

## Command Reference

### PostgreSQL Queries

```bash
# Connect to database
docker exec room-03-postgres-master psql -U postgres -d sin_solver

# View workflow tests
SELECT * FROM workflow_tests ORDER BY execution_time DESC;

# View solver attempts
SELECT * FROM solver_attempts ORDER BY created_at DESC;

# View agent executions
SELECT * FROM agent_executions ORDER BY execution_time DESC;

# Clear test data
TRUNCATE workflow_tests, solver_attempts, agent_executions;
```

### Redis Commands

```bash
# Connect to Redis
docker exec room-04-redis-cache redis-cli -a "sinredis2026!SecurePass"

# View all test keys
KEYS phase7:*

# Get test counter
GET phase7:test_counter

# Increment counter
INCR phase7:test_counter

# View all keys and values
KEYS *

# Monitor operations in real-time
MONITOR
```

### Service Health Checks

```bash
# Check all services
for service in agent-01-n8n-orchestrator agent-03-agentzero-coder agent-05-steel-browser agent-06-skyvern-solver solver-1.1-captcha-worker solver-2.1-survey-worker; do
  echo "Testing $service..."
  docker exec "$service" curl -s http://localhost:8000/health 2>/dev/null || echo "Not ready"
done
```

## Performance Metrics Template

For each workflow execution, capture:
- Workflow name
- Start time
- End time
- Duration (ms)
- Status (success/failure)
- Number of steps completed
- Any error messages
- Result data (JSON)

---

**Document:** API-REFERENCE.md  
**Created:** 2026-01-28  
**Status:** Ready for Phase 7 Testing
