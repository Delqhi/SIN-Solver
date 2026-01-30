# Testing Schedule & DR Drills

**Last Updated:** 2026-01-30

## Testing Philosophy

"An untested DR plan is just a wish list."

Regular testing ensures:
- Procedures are accurate and up-to-date
- Team members know their roles
- Recovery times meet RTO objectives
- Backups are valid and restorable

## Testing Schedule

### Monthly Tests

| Test | Week | Duration | Owner |
|------|------|----------|-------|
| Backup Verification | Week 1 | 2 hours | DevOps |
| Configuration Restore | Week 2 | 1 hour | DevOps |
| Failover Simulation | Week 3 | 2 hours | SRE |
| Documentation Review | Week 4 | 1 hour | Team Lead |

### Quarterly Tests

| Test | Month | Duration | Scope |
|------|-------|----------|-------|
| Full DR Drill | Q1, Q3 | 4 hours | All services |
| Tabletop Exercise | Q2, Q4 | 2 hours | Scenario walkthrough |
| Security Incident Drill | Q2 | 4 hours | Secrets rotation |
| Ransomware Recovery | Q4 | 8 hours | Full rebuild |

### Annual Tests

| Test | Timing | Duration | Participants |
|------|--------|----------|--------------|
| Complete Infrastructure Rebuild | Annually | 2 days | Full team |
| Third-party Audit | Annually | 1 week | External auditors |
| BCP Integration Test | Annually | 1 day | All departments |

## Test Types

### 1. Backup Verification Test

**Frequency:** Monthly (Week 1)
**Duration:** 2 hours
**Objective:** Verify backups are valid and restorable

**Procedure:**
```bash
# 1. Select random backup from last 7 days
BACKUP_FILE=$(ls -t backups/postgres/*.sql.gz | head -1)

# 2. Restore to isolated test container
docker run -d --name test-postgres -e POSTGRES_PASSWORD=test postgres:16

# 3. Restore backup
docker exec -i test-postgres psql -U postgres < <(gunzip < $BACKUP_FILE)

# 4. Run data integrity checks
docker exec test-postgres psql -U postgres -c "SELECT count(*) FROM important_table;"

# 5. Document results
# Success: Backup valid
# Failure: Investigate and fix backup process
```

**Success Criteria:**
- Backup restores without errors
- Data integrity checks pass
- Restoration time within RTO

### 2. Failover Simulation

**Frequency:** Monthly (Week 3)
**Duration:** 2 hours
**Objective:** Test automatic and manual failover procedures

**Procedure:**
```bash
# 1. Notify team of planned test
# 2. Stop primary service
docker stop room-03-postgres-master

# 3. Monitor failover
# - Check monitoring alerts
# - Verify replica promotion
# - Test application connectivity

# 4. Document failover time
# 5. Restore primary service
# 6. Verify data consistency
```

**Success Criteria:**
- Failover completes within RTO
- No data loss
- Applications reconnect automatically
- Monitoring alerts fire correctly

### 3. Full DR Drill

**Frequency:** Quarterly
**Duration:** 4 hours
**Objective:** Simulate complete infrastructure failure and recovery

**Scenario:** Total data center loss

**Procedure:**
```
Hour 0:00 - Declare simulated disaster
Hour 0:15 - Team assembles, roles assigned
Hour 0:30 - Begin recovery from backups
Hour 1:00 - Core services restored (PostgreSQL, Redis)
Hour 2:00 - Application services online
Hour 3:00 - All services verified
Hour 4:00 - Post-drill review
```

**Success Criteria:**
- All Tier 1 services restored within 1 hour
- All Tier 2 services restored within 2 hours
- Data loss within RPO
- No critical errors during recovery

### 4. Tabletop Exercise

**Frequency:** Quarterly (alternating with full drill)
**Duration:** 2 hours
**Objective:** Walk through scenarios without actual system changes

**Format:**
1. Present scenario (e.g., "Ransomware attack detected")
2. Each team member describes their actions
3. Identify gaps in procedures
4. Update runbooks as needed

**Scenarios:**
- Ransomware attack
- Insider threat
- Cloud provider outage
- SSL certificate expiry during vacation

### 5. Security Incident Drill

**Frequency:** Semi-annually
**Duration:** 4 hours
**Objective:** Test secrets rotation and access revocation

**Procedure:**
```bash
# 1. Simulate secrets compromise
echo "API_KEY_EXPOSED" >> /tmp/compromised_secret

# 2. Execute secrets rotation procedure
./scripts/rotate-all-secrets.sh

# 3. Verify all services restart with new secrets
./scripts/health-check.sh

# 4. Confirm old secrets no longer work
curl -H "Authorization: Bearer OLD_TOKEN" https://api.example.com
# Should return 401
```

## Test Documentation

### Pre-Test Checklist

- [ ] Test scheduled and team notified
- [ ] Test environment prepared
- [ ] Backups verified (for destructive tests)
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Communication plan ready

### Post-Test Report Template

```markdown
# DR Test Report

**Test Date:** YYYY-MM-DD
**Test Type:** [Backup Verification / Failover / Full DR]
**Participants:** [Names]

## Objectives
- [List test objectives]

## Results

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| RTO | 15 min | 12 min | PASS |
| RPO | 5 min | 0 min | PASS |
| Data Integrity | 100% | 100% | PASS |

## Issues Found
1. [Issue description]
   - Severity: [High/Medium/Low]
   - Action Item: [What needs to be fixed]
   - Owner: [Name]
   - Due Date: [Date]

## Lessons Learned
- [What went well]
- [What could be improved]

## Action Items
- [ ] [Action 1] - Owner - Due Date
- [ ] [Action 2] - Owner - Due Date

## Approved By
[Name] - [Date]
```

## Continuous Testing

### Automated Tests (Daily)

```bash
# Backup freshness check
find backups/ -mtime +1 -type f | wc -l
# Should return 0 (no old backups)

# Service health checks
./scripts/health-check.sh

# Configuration drift detection
./scripts/check-config-drift.sh
```

### Chaos Engineering (Monthly)

Randomly introduce failures:
```bash
# Randomly stop a container
docker stop $(docker ps -q | shuf -n 1)

# Verify automatic recovery
sleep 60
./scripts/health-check.sh
```

## Test Calendar 2026

| Month | Test Type | Date | Duration |
|-------|-----------|------|----------|
| January | Backup Verification | Jan 15 | 2 hours |
| February | Failover Simulation | Feb 20 | 2 hours |
| March | Full DR Drill | Mar 15 | 4 hours |
| April | Tabletop Exercise | Apr 18 | 2 hours |
| May | Backup Verification | May 15 | 2 hours |
| June | Security Incident Drill | Jun 20 | 4 hours |
| July | Full DR Drill | Jul 15 | 4 hours |
| August | Tabletop Exercise | Aug 18 | 2 hours |
| September | Backup Verification | Sep 15 | 2 hours |
| October | Failover Simulation | Oct 20 | 2 hours |
| November | Full DR Drill | Nov 15 | 4 hours |
| December | Annual Rebuild Test | Dec 10-11 | 2 days |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Completion Rate | 100% | Tests executed / Tests scheduled |
| RTO Achievement | > 90% | Drills meeting RTO / Total drills |
| RPO Achievement | > 95% | Drills meeting RPO / Total drills |
| Issue Resolution | < 30 days | Avg time to fix identified issues |
| Team Confidence | > 4.0/5.0 | Post-test survey scores |
