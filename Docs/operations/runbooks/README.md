# SIN-Solver Operations Runbooks

**Purpose:** Comprehensive operational guides for managing the SIN-Solver platform.

**Location:** `/Users/jeremy/dev/SIN-Solver/docs/operations/runbooks/`

**Last Updated:** 2026-01-30

---

## Available Runbooks

### Core Operations

| ID | Runbook | Purpose | Owner |
|----|---------|---------|-------|
| **RB-001** | [Service Deployment](./RB-001-service-deployment.md) | Deploy and update services | SRE Team |
| **RB-002** | [Database Backup & Restore](./RB-002-database-backup-restore.md) | Backup and restore databases | Database Team |
| **RB-003** | [SSL Certificate Renewal](./RB-003-ssl-certificate-renewal.md) | Manage SSL certificates | Infrastructure Team |
| **RB-004** | [Cloudflare Tunnel Troubleshooting](./RB-004-cloudflare-tunnel-troubleshooting.md) | Fix tunnel connectivity | Network Operations |
| **RB-005** | [MCP Wrapper Debugging](./RB-005-mcp-wrapper-debugging.md) | Debug MCP integration | Integration Team |
| **RB-006** | [Dashboard Rollback](./RB-006-dashboard-rollback.md) | Rollback dashboard changes | SRE Team |
| **RB-007** | [Secrets Rotation](./RB-007-secrets-rotation.md) | Rotate credentials securely | Security Team |
| **RB-008** | [Incident Response](./RB-008-incident-response.md) | Handle operational incidents | SRE Team |
| **RB-009** | [Performance Debugging](./RB-009-performance-debugging.md) | Diagnose performance issues | Performance Team |
| **RB-010** | [Security Incident Response](./RB-010-security-incident-response.md) | Respond to security incidents | Security Team |

---

## Quick Reference

### Emergency Procedures

```bash
# Complete platform outage
cd /Users/jeremy/dev/SIN-Solver
make restart-all

# Database emergency restore
# See RB-002 for detailed procedure

# Security incident
cd /Users/jeremy/dev/SIN-Solver
./scripts/emergency-isolation.sh
```

### Health Checks

```bash
# Check all services
./scripts/health-check-all.sh

# Check specific service
curl http://localhost:8000/health
curl http://localhost:3011/api/health

# Check database
docker exec room-03-postgres-master pg_isready -U ceo_admin
docker exec room-04-redis-cache redis-cli ping
```

---

## Incident Escalation

### Severity Levels

| Level | Name | Response Time | Example |
|-------|------|---------------|---------|
| SEV-1 | Critical | 15 minutes | Complete outage |
| SEV-2 | High | 30 minutes | Core service down |
| SEV-3 | Medium | 2 hours | Non-critical service down |
| SEV-4 | Low | 1 business day | Minor issue |

---

**Document Statistics:**
- Total Runbooks: 10
- Last Review: 2026-01-30
- Next Review: 2026-04-30
