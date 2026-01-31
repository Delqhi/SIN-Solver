# RB-008: Incident Response Runbook

**Purpose:** Standardized procedures for responding to operational incidents.

**Scope:** All SIN-Solver services and infrastructure

**Prerequisites:**
- Incident commander assigned
- Communication channels established
- Access to monitoring systems
- Escalation contacts available

---

## Table of Contents

1. [Incident Severity Levels](#1-incident-severity-levels)
2. [Incident Response Process](#2-incident-response-process)
3. [Communication Templates](#3-communication-templates)
4. [Service-Specific Runbooks](#4-service-specific-runbooks)
5. [Post-Incident Review](#5-post-incident-review)
6. [Emergency Contacts](#6-emergency-contacts)

---

## 1. Incident Severity Levels

### 1.1 Severity Definitions

| Level | Name | Impact | Response Time | Examples |
|-------|------|--------|---------------|----------|
| **SEV-1** | Critical | Complete outage | 15 minutes | All services down, data loss, security breach |
| **SEV-2** | High | Major degradation | 30 minutes | Core service down, performance severely degraded |
| **SEV-3** | Medium | Partial impact | 2 hours | Non-critical service down, minor feature broken |
| **SEV-4** | Low | Minimal impact | 1 business day | Cosmetic issues, documentation errors |

### 1.2 Incident Classification

```bash
# Quick classification script
cat > /tmp/classify-incident.sh << 'EOF'
#!/bin/bash

echo "INCIDENT CLASSIFICATION"
echo "======================="
echo ""
echo "Is the entire platform down? (y/n)"
read total_down

if [ "$total_down" = "y" ]; then
  echo "SEVERITY: SEV-1 (Critical)"
  echo "Response: Immediate"
  exit 0
fi

echo "Are core services (API, Dashboard) affected? (y/n)"
read core_affected

if [ "$core_affected" = "y" ]; then
  echo "Is there a workaround? (y/n)"
  read workaround
  if [ "$workaround" = "n" ]; then
    echo "SEVERITY: SEV-1 (Critical)"
  else
    echo "SEVERITY: SEV-2 (High)"
  fi
  exit 0
fi

echo "Are non-critical services affected? (y/n)"
read noncore_affected

if [ "$noncore_affected" = "y" ]; then
  echo "SEVERITY: SEV-3 (Medium)"
  exit 0
fi

echo "SEVERITY: SEV-4 (Low)"
EOF

chmod +x /tmp/classify-incident.sh
```

---

## 2. Incident Response Process

### 2.1 Response Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    INCIDENT RESPONSE FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. DETECT                                                       │
│     ├── Monitoring alert                                        │
│     ├── User report                                             │
│     └── Manual discovery                                        │
│                    ↓                                             │
│  2. DECLARE                                                      │
│     ├── Classify severity                                       │
│     ├── Create incident channel                                 │
│     └── Notify on-call                                          │
│                    ↓                                             │
│  3. RESPOND                                                      │
│     ├── Assign incident commander                               │
│     ├── Assess impact                                           │
│     └── Begin mitigation                                        │
│                    ↓                                             │
│  4. RESOLVE                                                      │
│     ├── Implement fix                                           │
│     ├── Verify resolution                                       │
│     └── Close incident                                          │
│                    ↓                                             │
│  5. REVIEW                                                       │
│     ├── Post-mortem                                             │
│     ├── Document lessons learned                                │
│     └── Update runbooks                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Phase 1: Detect

```bash
# Automated detection via monitoring
# Check Prometheus alerts
curl -s http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.state=="firing")'

# Check service health
/Users/jeremy/dev/SIN-Solver/scripts/health-check-all.sh

# Check logs for errors
for container in $(docker ps --format "{{.Names}}" | grep -E "(agent|room|solver)"); do
  echo "=== $container ==="
  docker logs --since 5m "$container" 2>&1 | grep -i "error\|fatal\|exception" | tail -5
done
```

### 2.3 Phase 2: Declare

```bash
# Create incident record
INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"
SEVERITY="SEV-1"  # Adjust based on classification
START_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Create incident directory
mkdir -p "/Users/jeremy/dev/SIN-Solver/incidents/$INCIDENT_ID"

# Initialize incident log
cat > "/Users/jeremy/dev/SIN-Solver/incidents/$INCIDENT_ID/incident.log" << EOF
INCIDENT: $INCIDENT_ID
SEVERITY: $SEVERITY
STARTED: $START_TIME
DETECTED BY: $(whoami)

DESCRIPTION:
[Fill in incident description]

IMPACT:
[Fill in impact assessment]

TIMELINE:
$START_TIME - Incident detected
$START_TIME - Incident declared

ACTIONS:
EOF

echo "✅ Incident declared: $INCIDENT_ID"
echo "Log: /Users/jeremy/dev/SIN-Solver/incidents/$INCIDENT_ID/incident.log"
```

### 2.4 Phase 3: Respond

```bash
# Assign roles
INCIDENT_COMMANDER="$(whoami)"
TECH_LEAD=""  # Assign based on expertise
COMMS_LEAD=""  # Assign for SEV-1/2

# Update incident log
cat >> "/Users/jeremy/dev/SIN-Solver/incidents/$INCIDENT_ID/incident.log" << EOF

RESPONSE TEAM:
- Incident Commander: $INCIDENT_COMMANDER
- Technical Lead: $TECH_LEAD
- Communications Lead: $COMMS_LEAD

MITIGATION ACTIONS:
EOF

# Begin assessment
echo "🔍 Assessing impact..."
./scripts/health-check-all.sh > "/Users/jeremy/dev/SIN-Solver/incidents/$INCIDENT_ID/health-check.log"
```

### 2.5 Phase 4: Resolve

```bash
# Document resolution
RESOLVED_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

cat >> "/Users/jeremy/dev/SIN-Solver/incidents/$INCIDENT_ID/incident.log" << EOF

RESOLUTION:
$RESOLVED_TIME - [Describe resolution]

ROOT CAUSE:
[Fill in root cause]

VERIFICATION:
[Fill in verification steps]

RESOLVED: $RESOLVED_TIME
DURATION: [Calculate from START_TIME]
EOF

echo "✅ Incident resolved: $INCIDENT_ID"
```

### 2.6 Phase 5: Review

```bash
# Schedule post-mortem (within 24-48 hours for SEV-1/2)
# Create post-mortem template
cat > "/Users/jeremy/dev/SIN-Solver/incidents/$INCIDENT_ID/post-mortem.md" << 'EOF'
# Post-Mortem: INCIDENT_ID

## Summary
- **Incident:** INCIDENT_ID
- **Severity:** SEVERITY
- **Duration:** X minutes
- **Impact:** [Description]

## Timeline
| Time | Event |
|------|-------|
| XX:XX | Incident detected |
| XX:XX | Incident declared |
| XX:XX | [Key events] |
| XX:XX | Incident resolved |

## Root Cause Analysis
[5 Whys analysis]

## Impact Assessment
- Services affected:
- Users affected:
- Data loss:
- Financial impact:

## Resolution
[How was it fixed?]

## Lessons Learned
### What went well
-

### What went poorly
-

### What we got lucky with
-

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| | | | |

## Attachments
- Incident log
- Monitoring graphs
- Log excerpts
EOF
```

---

## 3. Communication Templates

### 3.1 Internal Notification (Slack/Teams)

```
🚨 INCIDENT DECLARED 🚨

ID: INC-20260130-143000
Severity: SEV-1 (Critical)
Status: Active

Impact: [Brief description]
Started: 14:30 UTC
Commander: @username

Updates: #incident-inc-20260130-143000
Status Page: https://status.delqhi.com

---
UPDATE (14:45 UTC):
[Progress update]

---
RESOLVED (15:30 UTC):
[Resolution summary]
Post-mortem: [Link]
```

### 3.2 External Communication (Status Page)

```
Incident Report: API Degradation

Status: Resolved
Duration: 45 minutes
Impact: API response times increased to 5-10 seconds

Timeline:
- 14:30 UTC: Issue detected
- 14:35 UTC: Investigation started
- 14:50 UTC: Root cause identified
- 15:00 UTC: Fix deployed
- 15:15 UTC: Service fully restored

Root Cause: Database connection pool exhaustion

We apologize for any inconvenience caused.
```

### 3.3 Customer Communication (Email)

```
Subject: Service Disruption - Issue Resolved

Dear Customer,

We experienced a service disruption today that may have affected your access to [Service].

Duration: 14:30 - 15:15 UTC (45 minutes)
Impact: [Description of impact]

The issue has been resolved and all services are now operating normally.

We are conducting a thorough review to prevent similar issues in the future.

If you experienced any issues or have questions, please contact support.

Best regards,
SRE Team
```

---

## 4. Service-Specific Runbooks

### 4.1 API Brain Down

```bash
# SEV-1 Response for API Brain outage

echo "🚨 API Brain is DOWN"

# 1. Check if container is running
docker ps | grep room-13-api-brain || echo "❌ Container not running"

# 2. Check logs
docker logs room-13-api-brain --tail 100

# 3. Check dependencies
docker exec room-03-postgres-master pg_isready -U ceo_admin
docker exec room-04-redis-cache redis-cli ping

# 4. Attempt restart
docker restart room-13-api-brain
sleep 10

# 5. Verify
curl -s http://localhost:8000/health | jq .

# 6. If still down, check for resource issues
docker stats room-13-api-brain --no-stream

# 7. If resource constrained, scale up
docker update --cpus=2 --memory=4g room-13-api-brain
docker restart room-13-api-brain
```

### 4.2 Database Issues

```bash
# Database connection issues

echo "🔍 Checking database..."

# 1. Check PostgreSQL status
docker exec room-03-postgres-master pg_isready -U ceo_admin

# 2. Check connections
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT count(*) as active_connections
  FROM pg_stat_activity
  WHERE state = 'active';
"

# 3. Check for locks
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT blocked_locks.pid AS blocked_pid,
         blocked_activity.usename AS blocked_user,
         blocking_locks.pid AS blocking_pid
  FROM pg_catalog.pg_locks blocked_locks
  JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
  JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  WHERE blocking_locks.pid != blocked_locks.pid;
"

# 4. If connection limit reached, restart PostgreSQL
# WARNING: This will disconnect all clients!
docker restart room-03-postgres-master

# 5. Restart dependent services
docker restart room-13-api-brain room-01-dashboard-cockpit
```

### 4.3 Cloudflare Tunnel Issues

```bash
# Tunnel connectivity issues

echo "🔍 Checking Cloudflare tunnel..."

# 1. Check tunnel status
docker ps | grep cloudflared

# 2. Check logs
docker logs room-00-cloudflared-tunnel --tail 50

# 3. Test internal services
docker exec room-00-cloudflared-tunnel wget -qO- http://room-13-api-brain:8000/health

# 4. Restart tunnel
docker restart room-00-cloudflared-tunnel

# 5. Test public endpoint
curl -s https://api.delqhi.com/health
```

### 4.4 Complete Outage

```bash
# Complete platform outage response

echo "🚨 COMPLETE OUTAGE - EXECUTING RECOVERY"

# Phase 1: Assess
docker ps --format "table {{.Names}}\t{{.Status}}"

# Phase 2: Restart infrastructure (in order)
echo "🔄 Restarting infrastructure..."
docker restart room-03-postgres-master
sleep 15
docker restart room-04-redis-cache
sleep 5
docker restart room-02-tresor-vault
sleep 10

# Phase 3: Restart core services
echo "🔄 Restarting core services..."
docker restart room-13-api-brain
sleep 10
docker restart room-01-dashboard-cockpit
sleep 10

# Phase 4: Restart agents
echo "🔄 Restarting agents..."
docker restart agent-01-n8n-orchestrator
docker restart agent-05-steel-browser
docker restart agent-06-skyvern-solver

# Phase 5: Restart solvers
echo "🔄 Restarting solvers..."
docker restart solver-1.1-captcha-worker
docker restart solver-2.1-survey-worker

# Phase 6: Restart tunnel
echo "🔄 Restarting tunnel..."
docker restart room-00-cloudflared-tunnel

# Phase 7: Verify
echo "🔍 Verifying recovery..."
sleep 30
./scripts/health-check-all.sh
```

---

## 5. Post-Incident Review

### 5.1 Review Meeting Agenda

```markdown
# Post-Mortem Meeting Agenda

## Attendees
- [ ] Incident Commander
- [ ] Technical Lead
- [ ] On-call Engineer
- [ ] Product Manager
- [ ] Engineering Manager

## Agenda (60 minutes)
1. Timeline Review (10 min)
2. Root Cause Analysis (15 min)
3. Impact Assessment (10 min)
4. Lessons Learned (15 min)
5. Action Items (10 min)

## Questions to Answer
- When did we first know about the issue?
- Could we have detected it earlier?
- What slowed down our response?
- What would have prevented this?
- How do we prevent recurrence?
```

### 5.2 Action Item Tracking

```bash
# Create action items from post-mortem
cat >> "/Users/jeremy/dev/SIN-Solver/incidents/$INCIDENT_ID/action-items.md" <> 'EOF'
# Action Items from INC-XXXXX

## Immediate (This Week)
- [ ] [Description] - Owner: @username

## Short-term (This Month)
- [ ] [Description] - Owner: @username

## Long-term (This Quarter)
- [ ] [Description] - Owner: @username
EOF

# Track in project management tool
# plane create-issue --title "Action Item: [Description]" --project "SRE"
```

---

## 6. Emergency Contacts

### 6.1 Escalation Matrix

| Level | Role | Contact | When to Escalate |
|-------|------|---------|------------------|
| 1 | On-call Engineer | PagerDuty | All incidents |
| 2 | SRE Team Lead | Slack @sre-lead | SEV-2+, >30 min |
| 3 | Engineering Manager | Phone | SEV-1, >1 hour |
| 4 | CTO | Phone | SEV-1, >2 hours |
| 5 | CEO | Phone | Business critical |

### 6.2 Contact Information

```bash
# Store in Vault
docker exec room-02-tresor-vault vault kv get secret/contacts/on-call
docker exec room-02-tresor-vault vault kv get secret/contacts/sre-lead
docker exec room-02-tresor-vault vault kv get secret/contacts/emergency
```

### 6.3 External Vendors

| Vendor | Contact | Escalation Path |
|--------|---------|-----------------|
| Cloudflare | support@cloudflare.com | Dashboard > Emergency |
| Docker Hub | support@docker.com | Web portal |
| AWS/GCP/Azure | Console > Support | Enterprise support |

---

## Quick Reference

### Incident Commands

```bash
# Declare incident
INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"
mkdir -p "/Users/jeremy/dev/SIN-Solver/incidents/$INCIDENT_ID"

# Health check
./scripts/health-check-all.sh

# Restart all services
docker restart $(docker ps -q)

# Check logs
docker logs <container> --tail 100
```

### Severity Quick Check

```
SEV-1: Platform completely down
SEV-2: Core service degraded, no workaround
SEV-3: Non-critical service down
SEV-4: Minor issue, workaround exists
```

---

**Last Updated:** 2026-01-30  
**Version:** 1.0  
**Owner:** SRE Team  
**Review Cycle:** After each SEV-1/2 incident
