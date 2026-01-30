# RB-010: Security Incident Response Runbook

**Purpose:** Respond to security incidents including breaches, vulnerabilities, and attacks.

**Scope:** All SIN-Solver infrastructure, applications, and data

**Prerequisites:**
- Security team contact information
- Access to logs and monitoring
- Incident response tools
- Legal/compliance contacts

---

## Table of Contents

1. [Security Incident Types](#1-security-incident-types)
2. [Immediate Response](#2-immediate-response)
3. [Investigation Procedures](#3-investigation-procedures)
4. [Containment Strategies](#4-containment-strategies)
5. [Recovery Procedures](#5-recovery-procedures)
6. [Post-Incident Activities](#6-post-incident-activities)
7. [Compliance & Reporting](#7-compliance--reporting)

---

## 1. Security Incident Types

### 1.1 Classification

| Type | Severity | Examples |
|------|----------|----------|
| **Critical** | Immediate response | Data breach, ransomware, active exploitation |
| **High** | 1 hour response | Unauthorized access, malware detection |
| **Medium** | 4 hour response | Vulnerability disclosure, policy violation |
| **Low** | 24 hour response | Phishing attempts, port scans |

### 1.2 Common Security Incidents

- **Data Breach**: Unauthorized access to sensitive data
- **Malware/Ransomware**: Malicious software infection
- **DDoS Attack**: Service availability disruption
- **Credential Compromise**: Stolen passwords or API keys
- **Insider Threat**: Malicious activity by authorized user
- **Supply Chain Attack**: Compromised third-party component

---

## 2. Immediate Response

### 2.1 First 15 Minutes

```bash
# 1. DECLARE SECURITY INCIDENT
INCIDENT_ID="SEC-$(date +%Y%m%d-%H%M%S)"
mkdir -p "/Users/jeremy/dev/SIN-Solver/incidents/security/$INCIDENT_ID"

echo "🚨 SECURITY INCIDENT DECLARED: $INCIDENT_ID"
echo "Time: $(date)"
echo "Reporter: $(whoami)"

# 2. PRESERVE EVIDENCE
# Create forensic snapshot
docker commit room-13-api-brain "forensic/api-brain-$INCIDENT_ID"
docker commit room-03-postgres-master "forensic/postgres-$INCIDENT_ID"

# Save current state
docker ps > "/Users/jeremy/dev/SIN-Solver/incidents/security/$INCIDENT_ID/docker-ps.log"
netstat -an > "/Users/jeremy/dev/SIN-Solver/incidents/security/$INCIDENT_ID/netstat.log"

# 3. NOTIFY SECURITY TEAM
echo "Security incident $INCIDENT_ID declared" | \
  mail -s "SECURITY INCIDENT" security-team@company.com

# 4. ISOLATE IF NECESSARY
# Stop public access immediately if breach suspected
docker stop room-00-cloudflared-tunnel

echo "✅ Immediate response actions completed"
```

### 2.2 Emergency Contacts

```bash
# Security team escalation
SECURITY_LEAD="security-lead@company.com"
CISO="ciso@company.com"
LEGAL="legal@company.com"

# External contacts
CLOUDFLARE_SECURITY="https://hackerone.com/cloudflare"
AWS_SECURITY="https://aws.amazon.com/security/vulnerability-reporting/"
```

---

## 3. Investigation Procedures

### 3.1 Log Analysis

```bash
# Collect all relevant logs
INCIDENT_ID="SEC-20260130-143000"
LOG_DIR="/Users/jeremy/dev/SIN-Solver/incidents/security/$INCIDENT_ID/logs"
mkdir -p "$LOG_DIR"

# Application logs
docker logs room-13-api-brain --since 24h > "$LOG_DIR/api-brain.log" 2>&1
docker logs room-01-dashboard-cockpit --since 24h > "$LOG_DIR/dashboard.log" 2>&1

# Database logs
docker logs room-03-postgres-master --since 24h > "$LOG_DIR/postgres.log" 2>&1

# Access logs
docker exec room-13-api-brain cat /var/log/nginx/access.log 2>/dev/null > "$LOG_DIR/nginx-access.log"

# Auth logs
docker exec room-02-tresor-vault cat /vault/logs/audit.log 2>/dev/null > "$LOG_DIR/vault-audit.log"

# System logs
dmesg > "$LOG_DIR/dmesg.log"

# Network logs
tcpdump -r /tmp/capture.pcap 2>/dev/null > "$LOG_DIR/tcpdump.log" || echo "No packet capture available"

echo "✅ Logs collected to: $LOG_DIR"
```

### 3.2 Forensic Analysis

```bash
# Analyze for indicators of compromise (IoC)

# Search for suspicious IPs
grep -E "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" "$LOG_DIR/api-brain.log" | \
  awk '{print $1}' | sort | uniq -c | sort -rn | head -20

# Search for suspicious user agents
grep -i "user-agent" "$LOG_DIR/nginx-access.log" | \
  grep -iv "mozilla\|chrome\|safari\|firefox" | head -20

# Search for SQL injection attempts
grep -iE "(union|select|insert|update|delete|drop|--)" "$LOG_DIR/api-brain.log" | head -20

# Search for path traversal attempts
grep -E "(\.\./|\.\.\\|%2e%2e)" "$LOG_DIR/nginx-access.log" | head -20

# Check for brute force attempts
grep "POST /api/auth/login" "$LOG_DIR/api-brain.log" | \
  awk '{print $1}' | sort | uniq -c | sort -rn | head -20
```

### 3.3 Container Forensics

```bash
# Analyze running containers for compromise

# Check for unexpected processes
docker exec room-13-api-brain ps aux

# Check for modified files
docker diff room-13-api-brain

# Check network connections
docker exec room-13-api-brain netstat -an

# Check for reverse shells or backdoors
docker exec room-13-api-brain sh -c '
  # List listening ports
  netstat -tlnp
  
  # Check cron jobs
  crontab -l
  
  # Check for suspicious files
  find /tmp -type f -mtime -1
  find /var/tmp -type f -mtime -1
'

# Memory dump (if needed)
docker exec room-13-api-brain cat /proc/1/maps > "$LOG_DIR/process-maps.log"
```

### 3.4 Database Investigation

```bash
# Check for unauthorized database access

docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT usename, client_addr, backend_start, state
  FROM pg_stat_activity
  WHERE backend_start > NOW() - INTERVAL '24 hours'
  ORDER BY backend_start DESC;
"

# Check for suspicious queries
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT query, calls, total_exec_time
  FROM pg_stat_statements
  WHERE query LIKE '%password%'
     OR query LIKE '%secret%'
     OR query LIKE '%credential%'
  ORDER BY calls DESC
  LIMIT 20;
"

# Check for data exfiltration
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT schemaname, tablename, 
         n_tup_ins as inserts,
         n_tup_upd as updates,
         n_tup_del as deletes
  FROM pg_stat_user_tables
  ORDER BY n_tup_ins DESC
  LIMIT 20;
"
```

---

## 4. Containment Strategies

### 4.1 Network Isolation

```bash
# Isolate compromised container
docker network disconnect delqhi-platform-network room-13-api-brain

# Or isolate all services (nuclear option)
docker stop room-00-cloudflared-tunnel

# Block suspicious IPs at Cloudflare
# Use Cloudflare API or dashboard

# Block at firewall level (if applicable)
# iptables -A INPUT -s SUSPICIOUS_IP -j DROP
```

### 4.2 Service Isolation

```bash
# Stop compromised service
docker stop room-13-api-brain

# Preserve for forensics
docker commit room-13-api-brain "forensic/compromised-api-$INCIDENT_ID"

# Start clean instance from known-good image
docker run -d \
  --name room-13-api-brain-clean \
  --network delqhi-platform-network \
  -p 8000:8000 \
  room-13-api-brain:stable

# Rotate all secrets (see RB-007)
./scripts/emergency-secret-rotation.sh
```

### 4.3 Account Lockdown

```bash
# Disable compromised accounts
# In Vault
docker exec room-02-tresor-vault vault token revoke COMPROMISED_TOKEN

# In PostgreSQL
docker exec room-03-postgres-master psql -U ceo_admin -c "
  ALTER USER compromised_user WITH LOGIN FALSE;
"

# Revoke API keys
docker exec -i room-02-tresor-vault vault kv delete secret/api-keys/compromised-key
```

---

## 5. Recovery Procedures

### 5.1 System Restoration

```bash
# Restore from known-good backup

# 1. Stop all services
docker stop $(docker ps -q)

# 2. Restore database (see RB-002)
# Use backup from before incident

# 3. Restore application code
cd /Users/jeremy/dev/SIN-Solver
git checkout stable-commit-hash

# 4. Rotate all secrets
./scripts/rotate-all-secrets.sh

# 5. Rebuild and restart
docker-compose build --no-cache
docker-compose up -d

# 6. Verify clean state
./scripts/health-check-all.sh
```

### 5.2 Vulnerability Patching

```bash
# Update all images to latest secure versions

docker pull postgres:15-alpine
docker pull redis:7.2-alpine
docker pull hashicorp/vault:1.15

# Rebuild custom images with updated dependencies
cd /Users/jeremy/dev/SIN-Solver/dashboard
npm audit fix
docker build -t room-01-dashboard-cockpit:latest .

cd /Users/jeremy/dev/SIN-Solver/api
pip install --upgrade -r requirements.txt
docker build -t room-13-api-brain:latest .

# Restart with updated images
docker-compose up -d
```

### 5.3 Enhanced Monitoring

```bash
# Enable detailed audit logging

# Vault audit logging
docker exec room-02-tresor-vault vault audit enable file file_path=/vault/logs/audit.log

# PostgreSQL logging
docker exec room-03-postgres-master psql -U ceo_admin -c "
  ALTER SYSTEM SET log_statement = 'all';
  ALTER SYSTEM SET log_connections = on;
  ALTER SYSTEM SET log_disconnections = on;
  SELECT pg_reload_conf();
"

# Enable packet capture (temporary)
# tcpdump -i any -w /tmp/security-capture.pcap &
```

---

## 6. Post-Incident Activities

### 6.1 Evidence Preservation

```bash
# Secure all evidence
INCIDENT_ID="SEC-20260130-143000"
EVIDENCE_DIR="/Users/jeremy/dev/SIN-Solver/incidents/security/$INCIDENT_ID"

# Create evidence package
tar czf "$EVIDENCE_DIR-evidence.tar.gz" -C "$EVIDENCE_DIR" .

# Calculate checksums
sha256sum "$EVIDENCE_DIR-evidence.tar.gz" > "$EVIDENCE_DIR-evidence.sha256"

# Encrypt for secure storage
gpg --encrypt --recipient security-team@company.com \
  "$EVIDENCE_DIR-evidence.tar.gz"

# Store securely
mv "$EVIDENCE_DIR-evidence.tar.gz.gpg" /secure-storage/incidents/
```

### 6.2 Security Review

```bash
# Conduct security assessment

# 1. Vulnerability scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image room-13-api-brain

# 2. Dependency check
cd /Users/jeremy/dev/SIN-Solver/api
pip install safety
safety check

# 3. Secret scan
git log --all --full-history -- . | grep -E "(password|secret|key|token)"

# 4. Configuration review
docker exec room-13-api-brain cat /app/config.yml | grep -i "debug\|test\|dev"
```

### 6.3 Lessons Learned

Document:
- How the attack occurred
- What defenses failed
- What worked well
- What needs improvement
- Action items for prevention

---

## 7. Compliance & Reporting

### 7.1 Regulatory Reporting

| Regulation | Timeline | Requirements |
|------------|----------|--------------|
| GDPR | 72 hours | Notify supervisory authority |
| CCPA | Without delay | Notify affected consumers |
| HIPAA | 60 days | Notify HHS and affected individuals |
| SOX | Immediate | Report to audit committee |

### 7.2 Report Templates

```markdown
# Security Incident Report

## Executive Summary
- **Incident ID:** SEC-20260130-143000
- **Date/Time:** 2026-01-30 14:30 UTC
- **Severity:** Critical
- **Status:** Resolved

## Incident Description
[Brief description of what happened]

## Impact Assessment
- **Data Affected:** [Description]
- **Users Affected:** [Number]
- **Services Affected:** [List]
- **Financial Impact:** [Estimate]

## Root Cause
[Technical explanation of how the incident occurred]

## Response Actions
[Timeline of response actions taken]

## Remediation
[Steps taken to resolve and prevent recurrence]

## Recommendations
[Long-term security improvements]
```

### 7.3 Notification Templates

**Customer Notification:**
```
Subject: Important Security Notice

We are writing to inform you of a security incident that may have affected your account.

What happened:
[Description]

What information was involved:
[Data types]

What we are doing:
[Response actions]

What you should do:
[Recommended actions]

We sincerely apologize for any inconvenience.
```

---

## Quick Reference

### Emergency Commands

```bash
# Declare security incident
INCIDENT_ID="SEC-$(date +%Y%m%d-%H%M%S)"
mkdir -p "/Users/jeremy/dev/SIN-Solver/incidents/security/$INCIDENT_ID"

# Isolate compromised service
docker stop room-13-api-brain
docker network disconnect delqhi-platform-network room-13-api-brain

# Preserve evidence
docker commit room-13-api-brain "forensic/evidence-$INCIDENT_ID"

# Collect logs
docker logs room-13-api-brain --since 24h > incident.log

# Rotate all secrets
./scripts/emergency-secret-rotation.sh
```

### Security Checklist

- [ ] Incident declared and documented
- [ ] Evidence preserved
- [ ] Security team notified
- [ ] Compromised systems isolated
- [ ] Logs collected and secured
- [ ] Root cause identified
- [ ] Systems restored from clean backup
- [ ] All secrets rotated
- [ ] Vulnerabilities patched
- [ ] Monitoring enhanced
- [ ] Post-mortem completed
- [ ] Regulatory notifications sent (if required)

---

**Last Updated:** 2026-01-30  
**Version:** 1.0  
**Owner:** Security Team  
**Classification:** Confidential  
**Review Cycle:** After each security incident
