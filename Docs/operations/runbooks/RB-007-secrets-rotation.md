# RB-007: Secrets Rotation Runbook

**Purpose:** Securely rotate secrets, API keys, and credentials across all SIN-Solver services.

**Scope:** Vault, API keys, database passwords, service tokens

**Prerequisites:**
- Vault access (root token)
- Administrative access to all services
- Backup of current secrets
- Coordination with team members

---

## Table of Contents

1. [Secrets Inventory](#1-secrets-inventory)
2. [Pre-Rotation Checklist](#2-pre-rotation-checklist)
3. [Rotation Procedures](#3-rotation-procedures)
4. [Service-Specific Rotation](#4-service-specific-rotation)
5. [Post-Rotation Verification](#5-post-rotation-verification)
6. [Emergency Procedures](#6-emergency-procedures)

---

## 1. Secrets Inventory

### 1.1 Secret Categories

| Category | Location | Rotation Frequency | Criticality |
|----------|----------|-------------------|-------------|
| **Database Passwords** | Vault + .env | Quarterly | Critical |
| **API Keys** | Vault | Monthly | High |
| **Service Tokens** | Vault + Config | Quarterly | High |
| **Cloudflare Tokens** | Vault | Semi-annually | Critical |
| **JWT Secrets** | Vault | Quarterly | Critical |
| **Encryption Keys** | Vault | Annually | Critical |
| **External API Keys** | Vault | Per provider | Medium |

### 1.2 Secret Locations

```bash
# List all secrets in Vault
docker exec room-02-tresor-vault vault kv list secret/

# List environment variables
cat /Users/jeremy/dev/SIN-Solver/.env | grep -E "(PASSWORD|TOKEN|KEY|SECRET)" | cut -d= -f1

# List secrets in opencode.json
cat ~/.config/opencode/opencode.json | jq '.. | objects | select(has("environment")) | .environment'
```

---

## 2. Pre-Rotation Checklist

### 2.1 Backup Current Secrets

```bash
# Create secrets backup directory
mkdir -p /Users/jeremy/backups/secrets/$(date +%Y%m%d)
BACKUP_DIR="/Users/jeremy/backups/secrets/$(date +%Y%m%d)"

# Export Vault secrets
docker exec room-02-tresor-vault vault kv get -format=json secret/postgres/password \
  > "$BACKUP_DIR/postgres-password.json"

docker exec room-02-tresor-vault vault kv get -format=json secret/api/jwt-secret \
  > "$BACKUP_DIR/jwt-secret.json"

# Export all Vault paths to file
docker exec room-02-tresor-vault vault kv list secret/ > "$BACKUP_DIR/vault-paths.txt"

# Backup .env file
cp /Users/jeremy/dev/SIN-Solver/.env "$BACKUP_DIR/env-backup"

# Encrypt backup
gpg --symmetric --cipher-algo AES256 "$BACKUP_DIR/env-backup"
rm "$BACKUP_DIR/env-backup"

echo "✅ Secrets backed up to: $BACKUP_DIR"
```

### 2.2 Notify Stakeholders

```bash
# Create rotation notice
cat > /tmp/rotation-notice.txt << EOF
SECRETS ROTATION SCHEDULED
==========================
Date: $(date +%Y-%m-%d)
Time: $(date +%H:%M)
Duration: ~30 minutes
Affected Services: All SIN-Solver services
Impact: Brief service interruptions possible

Please:
1. Save any ongoing work
2. Avoid deployments during this window
3. Report any issues immediately

Contact: SRE Team
EOF

cat /tmp/rotation-notice.txt

# Send notifications (customize as needed)
# slack-post "#ops" "$(cat /tmp/rotation-notice.txt)"
```

### 2.3 Prepare New Secrets

```bash
# Generate new PostgreSQL password
NEW_POSTGRES_PASSWORD=$(openssl rand -base64 32)
echo "New PostgreSQL password generated"

# Generate new JWT secret
NEW_JWT_SECRET=$(openssl rand -base64 64)
echo "New JWT secret generated"

# Generate new API key
NEW_API_KEY=$(openssl rand -hex 32)
echo "New API key generated"

# Store temporarily (securely)
export NEW_POSTGRES_PASSWORD NEW_JWT_SECRET NEW_API_KEY
```

---

## 3. Rotation Procedures

### 3.1 PostgreSQL Password Rotation

```bash
#!/bin/bash
# PostgreSQL Password Rotation

set -e

echo "🔐 Rotating PostgreSQL Password..."

# Step 1: Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)
echo "Generated new password"

# Step 2: Update password in PostgreSQL
docker exec room-03-postgres-master psql -U ceo_admin -c "
  ALTER USER ceo_admin WITH PASSWORD '$NEW_PASSWORD';
"

echo "✅ PostgreSQL password updated"

# Step 3: Update Vault
docker exec -i room-02-tresor-vault vault kv put secret/postgres/password \
  value="$NEW_PASSWORD" \
  rotated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "✅ Vault updated with new password"

# Step 4: Update .env file
sed -i.bak "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW_PASSWORD/" \
  /Users/jeremy/dev/SIN-Solver/.env

echo "✅ .env file updated"

# Step 5: Restart dependent services
echo "🔄 Restarting dependent services..."
docker restart room-13-api-brain
docker restart room-01-dashboard-cockpit
docker restart agent-01-n8n-orchestrator

# Step 6: Verify
echo "⏳ Waiting for services to restart..."
sleep 15

docker exec room-03-postgres-master pg_isready -U ceo_admin
curl -s http://localhost:8000/health | jq '.status'

echo "✅ PostgreSQL password rotation complete!"
```

### 3.2 JWT Secret Rotation

```bash
#!/bin/bash
# JWT Secret Rotation

set -e

echo "🔐 Rotating JWT Secret..."

# Step 1: Generate new secret
NEW_SECRET=$(openssl rand -base64 64)

# Step 2: Update Vault
docker exec -i room-02-tresor-vault vault kv put secret/api/jwt-secret \
  value="$NEW_SECRET" \
  rotated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "✅ Vault updated"

# Step 3: Update services that use JWT
# API Brain
docker exec room-13-api-brain sh -c "export JWT_SECRET='$NEW_SECRET' && pkill -HUP 1"

# Dashboard
docker exec room-01-dashboard-cockpit sh -c "export JWT_SECRET='$NEW_SECRET' && pkill -HUP 1"

echo "✅ Services updated"

# Step 4: Test authentication
echo "Testing authentication..."
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' | jq '.token' | grep -q "eyJ" \
  && echo "✅ JWT working" || echo "❌ JWT test failed"

echo "✅ JWT secret rotation complete!"
```

### 3.3 API Key Rotation

```bash
#!/bin/bash
# API Key Rotation

set -e

echo "🔐 Rotating API Keys..."

# Function to rotate a specific API key
rotate_api_key() {
    local service=$1
    local key_name=$2
    
    echo "Rotating $service API key..."
    
    # Generate new key
    NEW_KEY=$(openssl rand -hex 32)
    
    # Update Vault
    docker exec -i room-02-tresor-vault vault kv put "secret/api-keys/$service" \
        "$key_name"="$NEW_KEY" \
        rotated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    echo "✅ $service API key rotated"
}

# Rotate specific keys
rotate_api_key "captcha-worker" "CAPTCHA_API_KEY"
rotate_api_key "survey-worker" "SURVEY_API_KEY"
rotate_api_key "external-service" "EXTERNAL_API_KEY"

echo "✅ All API keys rotated!"
```

### 3.4 Cloudflare Token Rotation

```bash
#!/bin/bash
# Cloudflare Token Rotation

set -e

echo "🔐 Rotating Cloudflare Token..."

# Step 1: Generate new token in Cloudflare dashboard
# Go to: My Profile > API Tokens > Create Token
# Or use API:

# Step 2: Update Vault with new token
echo "Enter new Cloudflare API token:"
read -s NEW_TOKEN

docker exec -i room-02-tresor-vault vault kv put secret/cloudflare/api-token \
  value="$NEW_TOKEN" \
  rotated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "✅ Cloudflare token updated in Vault"

# Step 3: Update environment
export CF_API_TOKEN="$NEW_TOKEN"

# Step 4: Test new token
curl -s "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq '.success'

echo "✅ Cloudflare token rotation complete!"
```

---

## 4. Service-Specific Rotation

### 4.1 Vault Token Rotation

```bash
# Rotate Vault root token (advanced - requires unseal keys)

# Step 1: Generate new root token
docker exec room-02-tresor-vault vault operator generate-root -init

# Step 2: Provide unseal keys (need 3 of 5)
docker exec room-02-tresor-vault vault operator generate-root -nonce=<nonce> <unseal-key-1>
docker exec room-02-tresor-vault vault operator generate-root -nonce=<nonce> <unseal-key-2>
docker exec room-02-tresor-vault vault operator generate-root -nonce=<nonce> <unseal-key-3>

# Step 3: Get new root token
# Output will show: Root Token: s.xxxxxx

# Step 4: Update all services with new token
# Update docker-compose files, environment variables, etc.

# Step 5: Revoke old root token
docker exec room-02-tresor-vault vault token revoke <old-root-token>
```

### 4.2 n8n Encryption Key Rotation

```bash
# Rotate n8n encryption key
# WARNING: This will make existing credentials unreadable!

# Step 1: Backup n8n data first
docker run --rm -v n8n_data:/data -v $(pwd):/backup \
  busybox tar czf /backup/n8n-pre-key-rotation.tar.gz -C /data .

# Step 2: Generate new key
NEW_KEY=$(openssl rand -hex 32)

# Step 3: Update environment
sed -i.bak "s/N8N_ENCRYPTION_KEY=.*/N8N_ENCRYPTION_KEY=$NEW_KEY/" .env

# Step 4: Restart n8n
docker restart agent-01-n8n-orchestrator

# Step 5: Re-enter all credentials in n8n UI
# Users will need to reconfigure all credentials

echo "⚠️  WARNING: All n8n credentials must be re-entered manually!"
```

### 4.3 Redis Password Rotation

```bash
# Rotate Redis password

# Step 1: Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# Step 2: Update Redis configuration
docker exec room-04-redis-cache redis-cli CONFIG SET requirepass "$NEW_PASSWORD"

# Step 3: Update Vault
docker exec -i room-02-tresor-vault vault kv put secret/redis/password \
  value="$NEW_PASSWORD" \
  rotated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Step 4: Update all services that connect to Redis
# Update docker-compose files with new password

# Step 5: Restart services
docker restart room-13-api-brain
docker restart room-01-dashboard-cockpit

# Step 6: Verify
docker exec room-04-redis-cache redis-cli -a "$NEW_PASSWORD" ping
echo "✅ Redis password rotated!"
```

---

## 5. Post-Rotation Verification

### 5.1 Service Health Checks

```bash
#!/bin/bash
# Post-rotation verification

echo "🔍 Verifying services after rotation..."

SERVICES=(
  "room-03-postgres-master:5432"
  "room-04-redis-cache:6379"
  "room-13-api-brain:8000"
  "room-01-dashboard-cockpit:3011"
)

for service in "${SERVICES[@]}"; do
  IFS=':' read -r name port <<< "$service"
  if nc -z localhost "$port" 2>/dev/null; then
    echo "✅ $name is accessible"
  else
    echo "❌ $name is NOT accessible"
  fi
done

# Test authentication
echo "Testing API authentication..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/protected-endpoint)
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 401 ]; then
  echo "✅ API responding (HTTP $HTTP_CODE)"
else
  echo "❌ API not responding correctly (HTTP $HTTP_CODE)"
fi

echo "✅ Verification complete!"
```

### 5.2 Log Analysis

```bash
# Check for authentication errors after rotation
docker logs room-13-api-brain --since 10m 2>&1 | grep -i "auth\|login\|token\|password"
docker logs room-01-dashboard-cockpit --since 10m 2>&1 | grep -i "auth\|login\|token\|password"

# Check for connection errors
docker logs room-03-postgres-master --since 10m 2>&1 | grep -i "connection\|auth\|password"
```

### 5.3 Update Documentation

```bash
# Log rotation details
cat >> /Users/jeremy/dev/SIN-Solver/docs/operations/secrets-rotation-log.md << EOF

## Secrets Rotation $(date +%Y-%m-%d)
- **Rotated By:** $(whoami)
- **Rotated Secrets:**
  - PostgreSQL password
  - JWT secret
  - API keys
- **Services Affected:** All
- **Downtime:** ~5 minutes
- **Issues:** None
- **Next Rotation:** $(date -d '+90 days' +%Y-%m-%d)

EOF
```

---

## 6. Emergency Procedures

### 6.1 Compromised Secret Response

```bash
#!/bin/bash
# Emergency secret rotation after compromise

echo "🚨 EMERGENCY SECRET ROTATION 🚨"
echo "Assuming all secrets are compromised..."

# Step 1: Isolate services
docker stop room-00-cloudflared-tunnel  # Stop public access

# Step 2: Rotate ALL secrets immediately
./scripts/rotate-all-secrets.sh

# Step 3: Restart all services
docker restart $(docker ps -q)

# Step 4: Verify
curl https://api.delqhi.com/health

# Step 5: Restore public access
docker start room-00-cloudflared-tunnel

echo "✅ Emergency rotation complete!"
echo "⚠️  Monitor logs closely for next 24 hours"
```

### 6.2 Rollback Secret Rotation

```bash
# If rotation failed, restore from backup

BACKUP_DIR="/Users/jeremy/backups/secrets/20260130"

# Restore PostgreSQL password
OLD_PASSWORD=$(jq -r '.data.value' "$BACKUP_DIR/postgres-password.json")
docker exec room-03-postgres-master psql -U ceo_admin -c "
  ALTER USER ceo_admin WITH PASSWORD '$OLD_PASSWORD';
"

# Restore Vault secret
docker exec -i room-02-tresor-vault vault kv put secret/postgres/password \
  value="$OLD_PASSWORD"

# Restore .env
cp "$BACKUP_DIR/env-backup.gpg" .
gpg --decrypt env-backup.gpg > .env

# Restart services
docker restart room-13-api-brain room-01-dashboard-cockpit agent-01-n8n-orchestrator

echo "✅ Secrets restored from backup!"
```

### 6.3 Vault Seal/Unseal

```bash
# If Vault becomes sealed during rotation

# Check status
docker exec room-02-tresor-vault vault status

# Unseal with unseal keys
docker exec room-02-tresor-vault vault operator unseal <unseal-key-1>
docker exec room-02-tresor-vault vault operator unseal <unseal-key-2>
docker exec room-02-tresor-vault vault operator unseal <unseal-key-3>

# Verify
docker exec room-02-tresor-vault vault status
```

---

## Quick Reference

### Rotation Commands

```bash
# Rotate PostgreSQL password
NEW_PASS=$(openssl rand -base64 32)
docker exec room-03-postgres-master psql -U ceo_admin -c "ALTER USER ceo_admin WITH PASSWORD '$NEW_PASS';"
docker exec -i room-02-tresor-vault vault kv put secret/postgres/password value="$NEW_PASS"

# Rotate JWT secret
NEW_JWT=$(openssl rand -base64 64)
docker exec -i room-02-tresor-vault vault kv put secret/api/jwt-secret value="$NEW_JWT"

# Generate new API key
openssl rand -hex 32
```

### Emergency Contacts

| Issue | Contact | Method |
|-------|---------|--------|
| Vault sealed | SRE On-call | PagerDuty |
| Service down | DevOps Team | Slack #ops |
| Security incident | Security Team | security@company.com |

---

**Last Updated:** 2026-01-30  
**Version:** 1.0  
**Owner:** Security Team  
**Review Cycle:** Per rotation schedule
