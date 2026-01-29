# 🚀 PHASE 7: END-TO-END WORKFLOW TESTING & OPTIMIZATION

**Status:** READY TO START  
**Prerequisites:** Phase 6 Complete ✅  
**Estimated Duration:** 120 minutes  
**Target Completion:** 2026-01-28 12:30 UTC

---

## 📋 PHASE 7 OBJECTIVES

### Primary Goals
1. ✅ Verify n8n orchestrator can execute workflows
2. ✅ Test PostgreSQL persistence through full data pipeline
3. ✅ Verify Agent Zero code generation from n8n
4. ✅ Test Steel Browser automation via n8n
5. ✅ Performance benchmark (throughput, latency)
6. ✅ Document all working workflows

### Success Criteria
- [ ] 5+ n8n workflows created and tested
- [ ] 100% test pass rate
- [ ] Zero errors in service logs
- [ ] All data persisted in PostgreSQL
- [ ] Performance metrics established
- [ ] Production-ready confidence level: 95%+

---

## 🔧 TEST SCENARIOS

### Scenario 1: PostgreSQL Direct Connection Test
**Objective:** Verify n8n can read/write to PostgreSQL

**Steps:**
```bash
1. Create n8n workflow: "DB Direct Test"
2. Add PostgreSQL node:
   - Connection: room-03-postgres-master:5432
   - Database: sin_solver
   - Credentials: postgres / sinsolveradmin2026!SecurePass
3. Query: SELECT COUNT(*) FROM phase_6_test;
4. Expected: Returns 1 row
5. Add INSERT: New test record with timestamp
6. Expected: INSERT successful
```

**Acceptance:**
- [ ] SELECT query returns data
- [ ] INSERT executes without errors
- [ ] Data persists after workflow finish
- [ ] No connection timeout errors

---

### Scenario 2: Redis Cache Integration Test
**Objective:** Verify n8n can use Redis for caching

**Steps:**
```bash
1. Create n8n workflow: "Redis Cache Test"
2. Add Redis node:
   - Connection: room-04-redis-cache:6379
   - Password: sinredis2026!SecurePass
3. SET operation: key=workflow:test, value=timestamp
4. GET operation: retrieve value
5. Expected: Value matches set value
```

**Acceptance:**
- [ ] SET operation succeeds
- [ ] GET retrieves correct value
- [ ] TTL operations work
- [ ] Error handling for cache miss

---

### Scenario 3: HTTP Request to Agent Zero
**Objective:** Test n8n triggering Agent Zero code generation

**Steps:**
```bash
1. Create n8n workflow: "Agent Zero Trigger"
2. Add HTTP Request node:
   - Method: POST
   - URL: http://agent-03-agentzero-coder:8050/api/generate
   - Body: { "task": "Create Hello World Python script" }
3. Expected: Receives generated code
4. Store result in PostgreSQL
```

**Acceptance:**
- [ ] HTTP request succeeds (200 OK)
- [ ] Receives valid code response
- [ ] Result stored in DB
- [ ] Error handling for timeout/failure

---

### Scenario 4: Steel Browser Automation via n8n
**Objective:** Test n8n orchestrating Steel Browser screenshot

**Steps:**
```bash
1. Create n8n workflow: "Browser Screenshot"
2. Add HTTP Request:
   - POST to http://agent-05-steel-browser:3005/api/browse
   - Body: { "url": "http://localhost:3011", "action": "screenshot" }
3. Expected: Screenshot data returned
4. Store screenshot metadata in PostgreSQL
```

**Acceptance:**
- [ ] Browser automation succeeds
- [ ] Screenshot captured
- [ ] Metadata stored in DB
- [ ] Handles JS rendering

---

### Scenario 5: Captcha Solver Integration
**Objective:** Test workflow triggering captcha solver

**Steps:**
```bash
1. Create n8n workflow: "Captcha Test"
2. Add HTTP Request:
   - POST to http://solver-1.1-captcha-worker:8000/api/solve
   - Body: { "image": "<base64-captcha>" }
3. Expected: Captcha solution returned
4. Log attempt to database
```

**Acceptance:**
- [ ] Captcha solver responds
- [ ] Valid solution format
- [ ] Attempt logged to DB
- [ ] Error handling for invalid input

---

### Scenario 6: Full Data Pipeline Test
**Objective:** Test complete workflow from API → n8n → Solvers → DB

**Steps:**
```bash
1. Create comprehensive workflow: "Full Stack Test"
2. Steps:
   a) Receive API request (trigger)
   b) Store request in PostgreSQL
   c) Process with Agent Zero (code generation)
   d) Call Steel Browser (screenshot)
   e) Attempt Captcha solver
   f) Store all results in database
   g) Return aggregated result via webhook
3. Execute workflow
4. Verify all steps persisted
```

**Acceptance:**
- [ ] All workflow steps execute
- [ ] Data persists at each step
- [ ] No cross-service timeouts
- [ ] Proper error handling
- [ ] Metrics captured (duration, status)

---

## 📊 PERFORMANCE BENCHMARKS

### Latency Measurements
**Target:** <2s end-to-end for simple workflow

| Operation | Target | Method |
|-----------|--------|--------|
| PostgreSQL Query | <50ms | SELECT COUNT(*) |
| Redis Operation | <20ms | SET + GET |
| Agent Zero Call | <5s | Simple code gen |
| Steel Browser | <10s | Screenshot |
| Captcha Solve | <15s | Image analysis |

### Throughput Measurements
**Target:** 10+ concurrent workflow executions

| Test | Target | Tool |
|------|--------|------|
| Concurrent DB Writes | 50+ | n8n parallel nodes |
| Concurrent HTTP Calls | 20+ | Webhook triggers |
| Queue Throughput | 100+ ops/s | Redis queue |

### Error Resilience
**Target:** <1% error rate under normal operation

| Scenario | Expected |
|----------|----------|
| Database Connection Failure | Graceful retry |
| Service Timeout | Fallback handler |
| Invalid Input | Error logged |
| Cache Miss | Reload from DB |

---

## 🛠️ IMPLEMENTATION CHECKLIST

### Pre-Testing (Verification)
- [ ] All 39 services running
- [ ] PostgreSQL database accessible
- [ ] Redis cache responding
- [ ] n8n UI accessible (http://localhost:5678)
- [ ] Agent services responding to health checks
- [ ] All ports verified (8019, 8018, 8050, 3005, etc.)

### Workflow Creation
- [ ] DB Direct Test workflow created
- [ ] Redis Cache Test workflow created
- [ ] Agent Zero Trigger workflow created
- [ ] Steel Browser Test workflow created
- [ ] Captcha Solver Test workflow created
- [ ] Full Stack Test workflow created

### Test Execution
- [ ] All workflows execute successfully
- [ ] All data persisted in PostgreSQL
- [ ] Performance metrics within target
- [ ] Error handling verified
- [ ] Logs captured for review

### Documentation
- [ ] Screenshot all workflows
- [ ] Document execution results
- [ ] Create troubleshooting guide
- [ ] Update README with Phase 7 status

### Commit & Push
- [ ] Commit workflow exports (.json)
- [ ] Push documentation
- [ ] Update lastchanges.md
- [ ] Tag release v1.0.0-phase-7

---

## 🔍 TROUBLESHOOTING GUIDE

### Common Issues & Solutions

#### Issue: n8n Cannot Connect to PostgreSQL
**Symptoms:** Timeout error in DB node
**Solution:**
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Test connectivity from n8n container
docker exec agent-01-n8n-orchestrator curl -v http://room-03-postgres-master:5432

# Check n8n logs
docker logs agent-01-n8n-orchestrator | tail -50
```

#### Issue: Redis Connection Failed
**Symptoms:** WRONGPASS error
**Solution:**
```bash
# Verify password in .env.production.local
cat /Users/jeremy/dev/Delqhi-Platform/Docker/.env.production.local | grep REDIS

# Test Redis connection
docker exec room-04-redis-cache redis-cli -a "sinredis2026!SecurePass" ping

# Verify n8n Redis credentials match
```

#### Issue: Agent Zero Not Responding
**Symptoms:** HTTP timeout when calling agent-03-agentzero-coder
**Solution:**
```bash
# Check if service running
docker ps | grep agent-03

# View logs
docker logs agent-03-agentzero-coder

# Test health endpoint
curl -s http://localhost:8050/health

# Restart if needed
cd /Users/jeremy/dev/Delqhi-Platform/Docker/agents/agent-03-agentzero
docker-compose restart
```

#### Issue: Database Query Returns Empty
**Symptoms:** SELECT returns no rows
**Solution:**
```bash
# Verify table exists
docker exec room-03-postgres-master psql -U postgres -d sin_solver -c "\dt phase_6_test"

# Check table contents
docker exec room-03-postgres-master psql -U postgres -d sin_solver -c "SELECT * FROM phase_6_test;"

# Verify insert workflow completed
```

---

## 📈 METRICS & MONITORING

### Key Metrics to Capture
```
For Each Workflow:
- Execution time (start → end)
- Number of steps completed
- Number of steps failed
- API response times
- Database query times
- Cache hit/miss rate
- Memory usage
- CPU usage

Overall:
- Total workflows executed
- Success rate (%)
- Average execution time
- P95 latency
- P99 latency
- Error frequency
```

### Logging Commands
```bash
# Watch n8n execution logs
docker logs agent-01-n8n-orchestrator -f

# Monitor PostgreSQL queries
docker exec room-03-postgres-master tail -f /var/log/postgresql.log

# Watch Redis operations
docker exec room-04-redis-cache redis-cli -a "sinredis2026!SecurePass" MONITOR

# Check all service health
for service in agent-01-n8n-orchestrator agent-03-agentzero-coder agent-05-steel-browser; do
  echo "$service:"
  docker exec "$service" curl -s http://localhost:8000/health 2>/dev/null || echo "Not ready"
done
```

---

## 🎯 SUCCESS CRITERIA (Phase 7 Complete)

### Must Have
- [x] Phase 6 passed (all services running)
- [ ] All 6 test scenarios executed successfully
- [ ] 100% data persistence in PostgreSQL
- [ ] All performance targets met
- [ ] Zero critical errors in any service
- [ ] All workflows documented
- [ ] Changes committed to GitHub

### Should Have
- [ ] Performance metrics published
- [ ] Troubleshooting guide created
- [ ] Workflow templates exported
- [ ] Team documentation updated
- [ ] Demo script created

### Nice to Have
- [ ] Load testing completed
- [ ] Monitoring dashboard active
- [ ] Backup procedures tested
- [ ] Disaster recovery verified

---

## 🚀 NEXT PHASE (Phase 8)

After Phase 7 completion:

### Phase 8: Production Hardening
1. Security audit (MANDATE 0.18)
2. SSL/TLS configuration
3. API rate limiting
4. Authentication & authorization
5. Input validation
6. Logging & monitoring setup
7. Backup & recovery procedures
8. Disaster recovery testing

---

**Document Version:** 1.0  
**Created:** 2026-01-28T10:50:00Z  
**Status:** READY FOR PHASE 7  
**Estimated Start:** 2026-01-28 ~11:00 UTC  
**Estimated Completion:** 2026-01-28 ~12:30 UTC

*"Test until confidence reaches 99%. Document everything. Ship it."*
