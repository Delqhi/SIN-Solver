# RB-006: Dashboard Rollback Runbook

**Purpose:** Rollback the Dashboard (room-01-dashboard-cockpit) to a previous working version.

**Scope:** Next.js Dashboard application and its deployment

**Prerequisites:**
- Git access
- Docker access
- Backup of current state
- Previous working Docker image tag

---

## Table of Contents

1. [Rollback Scenarios](#1-rollback-scenarios)
2. [Pre-Rollback Checklist](#2-pre-rollback-checklist)
3. [Rollback Procedures](#3-rollback-procedures)
4. [Post-Rollback Verification](#4-post-rollback-verification)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Rollback Scenarios

### 1.1 When to Rollback

| Scenario | Severity | Rollback Required |
|----------|----------|-------------------|
| Broken UI after deployment | Medium | Yes |
| API errors in dashboard | High | Yes |
| Performance degradation | Medium | Optional |
| Missing features | Low | No (forward fix) |
| Security vulnerability | Critical | Immediate |
| Database migration failure | Critical | Immediate |

### 1.2 Rollback Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Docker Image Rollback** | Revert to previous Docker image | Quick rollback |
| **Git Commit Rollback** | Revert code changes | Code issues |
| **Database Rollback** | Restore database state | Migration failures |
| **Full System Rollback** | Revert all components | Major failures |

---

## 2. Pre-Rollback Checklist

### 2.1 Document Current State

```bash
# Get current version
cd /Users/jeremy/dev/SIN-Solver/dashboard

# Get current git commit
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "Current commit: $CURRENT_COMMIT"

# Get current Docker image
CURRENT_IMAGE=$(docker inspect room-01-dashboard-cockpit --format='{{.Config.Image}}')
echo "Current image: $CURRENT_IMAGE"

# Get container status
docker ps --filter "name=dashboard" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

# Save state to file
cat > /tmp/dashboard-current-state.txt << EOF
Rollback Date: $(date)
Current Commit: $CURRENT_COMMIT
Current Image: $CURRENT_IMAGE
Container Status: $(docker ps --filter "name=dashboard" --format "{{.Status}}")
EOF

cat /tmp/dashboard-current-state.txt
```

### 2.2 Identify Target Version

```bash
# List recent commits
git log --oneline -10

# List available Docker images
docker images | grep dashboard

# Find last known good version
# Ask team or check monitoring dashboard for last stable version

# Set target version
TARGET_COMMIT="abc1234"  # Replace with actual commit hash
TARGET_IMAGE="room-01-dashboard-cockpit:stable"  # Or specific tag
```

### 2.3 Notify Stakeholders

```bash
# Send notification (customize as needed)
echo "⚠️  DASHBOARD ROLLBACK INITIATED ⚠️" >> /tmp/rollback-notification.txt
echo "Time: $(date)" >> /tmp/rollback-notification.txt
echo "Reason: [FILL IN REASON]" >> /tmp/rollback-notification.txt
echo "Current: $CURRENT_COMMIT" >> /tmp/rollback-notification.txt
echo "Target: $TARGET_COMMIT" >> /tmp/rollback-notification.txt

# Post to Slack/Teams (if configured)
# curl -X POST -H 'Content-type: application/json' \
#   --data '{"text":"Dashboard rollback initiated"}' \
#   $SLACK_WEBHOOK_URL
```

---

## 3. Rollback Procedures

### 3.1 Quick Docker Image Rollback (Fastest)

```bash
# Step 1: Stop current container
docker stop room-01-dashboard-cockpit

# Step 2: Backup current container (optional)
docker commit room-01-dashboard-cockpit room-01-dashboard-cockpit:pre-rollback-$(date +%Y%m%d)

# Step 3: Remove current container
docker rm room-01-dashboard-cockpit

# Step 4: Start with previous image
# Option A: Use specific previous tag
docker run -d \
  --name room-01-dashboard-cockpit \
  --network delqhi-platform-network \
  -p 3011:3011 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e REDIS_URL="$REDIS_URL" \
  room-01-dashboard-cockpit:stable

# Option B: Use docker-compose with specific tag
cd /Users/jeremy/dev/SIN-Solver/Docker/rooms/room-01-dashboard-cockpit

# Edit docker-compose.yml to use specific image tag
# image: room-01-dashboard-cockpit:stable

docker-compose up -d

# Step 5: Verify rollback
docker ps | grep dashboard
curl -s http://localhost:3011/api/health | jq .
```

### 3.2 Git-Based Rollback (Code Changes)

```bash
# Step 1: Navigate to dashboard directory
cd /Users/jeremy/dev/SIN-Solver/dashboard

# Step 2: Stash any uncommitted changes
git stash push -m "Pre-rollback stash $(date)"

# Step 3: Create backup branch
git checkout -b backup/pre-rollback-$(date +%Y%m%d)
git checkout main  # or your default branch

# Step 4: Revert to specific commit
git log --oneline -10

# Option A: Hard reset (destructive - use with caution)
# git reset --hard $TARGET_COMMIT

# Option B: Revert commits (safer - creates new commit)
# Revert last N commits
git revert --no-commit HEAD~3..HEAD

# Or revert specific commit
git revert $CURRENT_COMMIT --no-edit

# Step 5: Build new image
docker build -t room-01-dashboard-cockpit:rollback-$(date +%Y%m%d) .

# Step 6: Deploy
docker stop room-01-dashboard-cockpit
docker rm room-01-dashboard-cockpit
docker run -d \
  --name room-01-dashboard-cockpit \
  --network delqhi-platform-network \
  -p 3011:3011 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e REDIS_URL="$REDIS_URL" \
  room-01-dashboard-cockpit:rollback-$(date +%Y%m%d)

# Step 7: Verify
curl -s http://localhost:3011/api/health
```

### 3.3 Database Migration Rollback

```bash
# If rollback involves database changes

# Step 1: Check current migration status
docker exec room-01-dashboard-cockpit npx prisma migrate status

# Step 2: Rollback migrations (if using Prisma)
# Rollback last migration
docker exec room-01-dashboard-cockpit npx prisma migrate resolve --rolled-back "migration_name"

# Or reset database (DANGEROUS - data loss)
# docker exec room-01-dashboard-cockpit npx prisma migrate reset --force

# Step 3: Restore from backup if needed
# See RB-002-database-backup-restore.md
```

### 3.4 Full System Rollback

```bash
#!/bin/bash
# Full dashboard rollback script

set -e

echo "🔄 Starting Dashboard Full Rollback..."

# Configuration
TARGET_TAG="stable"
BACKUP_TAG="pre-rollback-$(date +%Y%m%d-%H%M%S)"
SERVICE_NAME="room-01-dashboard-cockpit"
COMPOSE_DIR="/Users/jeremy/dev/SIN-Solver/Docker/rooms/room-01-dashboard-cockpit"

# Step 1: Create backup
echo "📦 Creating backup..."
docker tag $SERVICE_NAME:latest $SERVICE_NAME:$BACKUP_TAG

# Step 2: Stop service
echo "🛑 Stopping service..."
cd $COMPOSE_DIR
docker-compose down

# Step 3: Update docker-compose to use stable tag
echo "📝 Updating configuration..."
sed -i.bak "s/image: $SERVICE_NAME:.*/image: $SERVICE_NAME:$TARGET_TAG/" docker-compose.yml

# Step 4: Start with stable version
echo "🚀 Starting stable version..."
docker-compose up -d

# Step 5: Wait for startup
echo "⏳ Waiting for startup..."
sleep 15

# Step 6: Health check
echo "🏥 Running health checks..."
for i in {1..10}; do
  if curl -s http://localhost:3011/api/health | grep -q "ok"; then
    echo "✅ Health check passed"
    break
  fi
  echo "Attempt $i/10 - waiting..."
  sleep 5
done

# Step 7: Verify
echo "🔍 Final verification..."
docker ps | grep $SERVICE_NAME
curl -s http://localhost:3011/api/health | jq .

echo "✅ Rollback complete!"
echo "Backup image: $SERVICE_NAME:$BACKUP_TAG"
```

---

## 4. Post-Rollback Verification

### 4.1 Health Checks

```bash
# Test dashboard health
curl -s http://localhost:3011/api/health | jq .

# Expected Output:
# {
#   "status": "ok",
#   "version": "1.x.x",
#   "timestamp": "2026-01-30T..."
# }

# Test public endpoint
curl -s https://dashboard.delqhi.com/api/health

# Check container logs
docker logs room-01-dashboard-cockpit --tail 50
```

### 4.2 Functional Tests

```bash
# Test main pages
curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/services
curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/logs

# Test API endpoints
curl -s http://localhost:3011/api/services | jq '.services | length'
curl -s http://localhost:3011/api/metrics | jq '.status'

# All should return HTTP 200
```

### 4.3 Integration Tests

```bash
# Test connection to dependent services
# API Brain
curl -s http://localhost:8000/health

# PostgreSQL
docker exec room-03-postgres-master pg_isready -U ceo_admin

# Redis
docker exec room-04-redis-cache redis-cli ping
```

### 4.4 Update Documentation

```bash
# Log rollback details
cat >> /Users/jeremy/dev/SIN-Solver/docs/operations/rollback-log.md << EOF

## Rollback $(date)
- **Service:** Dashboard (room-01-dashboard-cockpit)
- **Reason:** [FILL IN]
- **From:** $CURRENT_COMMIT
- **To:** $TARGET_COMMIT
- **Duration:** [FILL IN]
- **Impact:** [FILL IN]
- **Lessons Learned:** [FILL IN]

EOF
```

---

## 5. Troubleshooting

### 5.1 Rollback Failed - Container Won't Start

```bash
# Check logs
docker logs room-01-dashboard-cockpit --tail 100

# Common issues:
# 1. Port conflict
lsof -i :3011

# 2. Missing environment variables
docker inspect room-01-dashboard-cockpit --format='{{.Config.Env}}'

# 3. Database connection
docker exec room-01-dashboard-cockpit wget -qO- http://room-03-postgres-master:5432 2>&1 || echo "DB unreachable"

# Solution: Fix issue and retry
```

### 5.2 Rollback Failed - Database Incompatible

```bash
# If new version had database migrations

# Option 1: Rollback migrations
docker exec room-01-dashboard-cockpit npx prisma migrate deploy

# Option 2: Restore database from backup
# See RB-002-database-backup-restore.md

# Option 3: Keep database, fix code
# Forward fix instead of rollback
```

### 5.3 Rollback Failed - Image Not Found

```bash
# If target image doesn't exist locally

# List available images
docker images | grep dashboard

# Pull from registry (if available)
docker pull your-registry/room-01-dashboard-cockpit:stable

# Or build from git commit
cd /Users/jeremy/dev/SIN-Solver/dashboard
git checkout $TARGET_COMMIT
docker build -t room-01-dashboard-cockpit:stable .
```

### 5.4 Partial Rollback - Mixed State

```bash
# If some components rolled back but others didn't

# Stop all dashboard-related containers
docker stop $(docker ps -q --filter "name=dashboard")
docker rm $(docker ps -aq --filter "name=dashboard")

# Clear any cached data
docker volume rm dashboard_data 2>/dev/null || true

# Start fresh
cd /Users/jeremy/dev/SIN-Solver/Docker/rooms/room-01-dashboard-cockpit
docker-compose up -d
```

### 5.5 Rollback Loop

```bash
# If rollback keeps failing and you need to go further back

# List all available backup images
docker images --format "{{.Repository}}:{{.Tag}}" | grep dashboard | sort

# Try earlier version
TARGET_TAG="rollback-20260129"
docker stop room-01-dashboard-cockpit
docker rm room-01-dashboard-cockpit
docker run -d --name room-01-dashboard-cockpit \
  --network delqhi-platform-network \
  -p 3011:3011 \
  room-01-dashboard-cockpit:$TARGET_TAG
```

---

## Quick Reference

### Rollback Commands

```bash
# Quick rollback to stable
docker stop room-01-dashboard-cockpit
docker rm room-01-dashboard-cockpit
docker run -d --name room-01-dashboard-cockpit \
  --network delqhi-platform-network \
  -p 3011:3011 \
  room-01-dashboard-cockpit:stable

# Using docker-compose
cd /Users/jeremy/dev/SIN-Solver/Docker/rooms/room-01-dashboard-cockpit
docker-compose down
docker-compose up -d

# Verify
curl http://localhost:3011/api/health
```

### Emergency Contacts

| Issue | Contact | Method |
|-------|---------|--------|
| Rollback failed | SRE On-call | PagerDuty |
| Database issues | DBA Team | Slack #database |
| Code questions | Dev Team | Slack #development |

---

**Last Updated:** 2026-01-30  
**Version:** 1.0  
**Owner:** SRE Team  
**Review Cycle:** Per deployment
