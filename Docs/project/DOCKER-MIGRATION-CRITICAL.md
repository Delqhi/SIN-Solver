# 🚨 CRITICAL: Docker Container Migration Required

**Date:** 2026-01-29  
**Severity:** CRITICAL  
**Status:** ✅ COMPLETED 2026-01-29 19:50

---

## Problem Statement

Docker containers are **SPLIT** between two directories:

### Location 1: ~/dev/sin-code/Docker/rooms/ (LEGACY - WRONG)
```
room-01-dashboard
room-03-postgres
room-04-redis
room-05-generator
room-06-plugins
room-09-chat
room-09-firecrawl
room-11-plane
room-12-delqhi-db
room-13-delqhi-network
room-16-supabase ⚠️ RUNNING HERE
room-21-nocodb
room-24-hoppscotch
```

### Location 2: ~/dev/SIN-Solver/Docker/rooms/ (CORRECT - NEW)
```
room-00-cloudflared-tunnel
room-01-dashboard
room-01-dashboard-cockpit
room-02-tresor-api
room-02-tresor-vault
room-03-postgres-master
room-04-redis-cache
room-09-chat
room-11-plane
room-11-plane-mcp
room-12-delqhi-db
room-13-api-brain
room-13-delqhi-network
room-24-hoppscotch
```

---

## Critical Issues

### 1. **Supabase Running in Wrong Location**
- **Current:** ~/dev/sin-code/Docker/rooms/room-16-supabase
- **Should be:** ~/dev/SIN-Solver/Docker/rooms/room-16-supabase
- **Impact:** Database persistence, configuration drift

### 2. **Duplicate Containers**
Some containers exist in BOTH locations:
- room-01-dashboard
- room-09-chat
- room-11-plane
- room-12-delqhi-db
- room-13-delqhi-network
- room-24-hoppscotch

### 3. **Missing Containers in SIN-Solver**
These are ONLY in sin-code and need migration:
- room-05-generator
- room-06-plugins
- room-09-firecrawl
- room-16-supabase
- room-21-nocodb

### 4. **Orphaned Containers**
These might be running from wrong location:
- room-03-postgres (sin-code) vs room-03-postgres-master (SIN-Solver)
- room-04-redis (sin-code) vs room-04-redis-cache (SIN-Solver)

---

## ✅ COMPLETED ACTIONS

### Phase 1: Assessment ✅
- [x] Identified all containers in both locations
- [x] Found 5 containers only in sin-code
- [x] Found 8 duplicate containers
- [x] Verified no containers currently running

### Phase 2: Migration ✅
**Moved from ~/dev/sin-code/Docker/rooms/ to ~/dev/SIN-Solver/Docker/rooms/:**
- [x] room-05-generator
- [x] room-06-plugins
- [x] room-09-firecrawl
- [x] room-16-supabase
- [x] room-21-nocodb

### Phase 3: Cleanup ✅
**Removed duplicates from ~/dev/sin-code/Docker/rooms/:**
- [x] room-01-dashboard
- [x] room-03-postgres
- [x] room-04-redis
- [x] room-09-chat
- [x] room-11-plane
- [x] room-12-delqhi-db
- [x] room-13-delqhi-network
- [x] room-24-hoppscotch

### Phase 4: Backup ✅
- [x] Full backup created at: ~/dev/backups/sin-code-docker-20260129/
- [x] All containers preserved before deletion

---

## Migration Plan

### Phase 1: Assessment (IMMEDIATE)
1. [ ] Check which containers are currently running
2. [ ] Identify data volumes and persistence
3. [ ] Document current container states

### Phase 2: Stop & Backup (CRITICAL)
1. [ ] Stop all containers in sin-code location
2. [ ] Backup all volumes and data
3. [ ] Verify backups are complete

### Phase 3: Migration (CAREFUL)
1. [ ] Move container directories from sin-code to SIN-Solver
2. [ ] Update docker-compose.yml paths
3. [ ] Migrate data volumes

### Phase 4: Verification (MANDATORY)
1. [ ] Start containers in new location
2. [ ] Verify all services accessible
3. [ ] Check data integrity
4. [ ] Update all documentation

---

## Commands to Execute

### Step 1: Check Running Containers
```bash
# Check sin-code containers
cd ~/dev/sin-code/Docker/rooms/room-16-supabase
docker compose ps

# Check SIN-Solver containers
cd ~/dev/SIN-Solver/Docker/rooms/room-16-supabase 2>/dev/null || echo "Doesn't exist yet"
docker compose ps

# List all running containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Step 2: Backup Data
```bash
# Create backup directory
mkdir -p ~/dev/backups/docker-migration-$(date +%Y%m%d)

# Backup Supabase data
cd ~/dev/sin-code/Docker/rooms/room-16-supabase
docker compose exec -T db pg_dumpall -c -U postgres > ~/dev/backups/docker-migration-$(date +%Y%m%d)/supabase-backup.sql

# Copy volumes
cp -r ~/dev/sin-code/Docker/volumes ~/dev/backups/docker-migration-$(date +%Y%m%d)/
```

### Step 3: Migrate Containers
```bash
# Move missing containers
mv ~/dev/sin-code/Docker/rooms/room-05-generator ~/dev/SIN-Solver/Docker/rooms/
mv ~/dev/sin-code/Docker/rooms/room-06-plugins ~/dev/SIN-Solver/Docker/rooms/
mv ~/dev/sin-code/Docker/rooms/room-09-firecrawl ~/dev/SIN-Solver/Docker/rooms/
mv ~/dev/sin-code/Docker/rooms/room-16-supabase ~/dev/SIN-Solver/Docker/rooms/
mv ~/dev/sin-code/Docker/rooms/room-21-nocodb ~/dev/SIN-Solver/Docker/rooms/

# Note: Duplicates need manual merge/conflict resolution
```

### Step 4: Update Configuration
```bash
# Update docker-compose paths
cd ~/dev/SIN-Solver/Docker
find . -name "docker-compose.yml" -exec sed -i '' 's|/dev/sin-code|/dev/SIN-Solver|g' {} \;

# Update .env files
find . -name ".env*" -exec sed -i '' 's|/dev/sin-code|/dev/SIN-Solver|g' {} \;
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss | Medium | Critical | Full backup before migration |
| Service downtime | High | High | Migrate during low-traffic period |
| Configuration errors | Medium | Medium | Test each container after migration |
| Path references broken | High | Medium | Global search/replace for paths |

---

## Verification Checklist

- [ ] All containers running from ~/dev/SIN-Solver/Docker/
- [ ] No containers running from ~/dev/sin-code/Docker/
- [ ] All services accessible via delqhi.com domains
- [ ] Data integrity verified
- [ ] Documentation updated
- [ ] Team notified of new location

---

## Immediate Actions Required

1. **STOP** - Do not deploy any new changes until migration is complete
2. **BACKUP** - Create full backup of all data
3. **MIGRATE** - Move containers to correct location
4. **VERIFY** - Test all services
5. **CLEANUP** - Remove old sin-code Docker directory

---

**This is a P0 incident requiring immediate attention!**

**Next Step:** Execute Phase 1 - Assessment
