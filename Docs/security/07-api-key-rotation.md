# 🔑 API Key Rotation Procedures

**Document ID:** SEC-07-API-KEY-ROTATION  
**Version:** 1.0.0  
**Classification:** Internal Use Only  
**Last Updated:** 2026-01-30  

---

## 📋 Overview

This document defines standardized procedures for rotating API keys across all services in the SIN-Solver platform. Regular key rotation is a critical security practice that limits the impact of compromised credentials and ensures compliance with security policies.

### Why Rotate API Keys?

```
┌─────────────────────────────────────────────────────────────────┐
│              BENEFITS OF KEY ROTATION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔒 Security Benefits:                                          │
│  • Limits exposure window of compromised keys                   │
│  • Reduces blast radius of security incidents                   │
│  • Forces review of key permissions                             │
│  • Identifies unused/unnecessary keys                           │
│                                                                  │
│  📋 Compliance Benefits:                                        │
│  • Meets SOC 2 requirements                                     │
│  • Satisfies audit requirements                                 │
│  • Demonstrates security maturity                               │
│                                                                  │
│  🛠️  Operational Benefits:                                       │
│  • Tests disaster recovery procedures                           │
│  • Validates monitoring and alerting                            │
│  • Keeps teams practiced in emergency procedures                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Rotation Schedule

### Standard Rotation Periods

| Key Type | Rotation Frequency | Last Rotation | Next Rotation | Owner |
|----------|-------------------|---------------|---------------|-------|
| **Vault Root Token** | Never (backup only) | N/A | N/A | Security Team |
| **Vault Unseal Keys** | Never (backup only) | N/A | N/A | Security Team |
| **Database Admin** | 90 days | 2026-01-15 | 2026-04-15 | DBA Team |
| **JWT Signing Keys** | 180 days | 2026-01-01 | 2026-07-01 | API Team |
| **Service API Keys** | 90 days | 2026-01-20 | 2026-04-20 | DevOps Team |
| **External AI Keys** | 90 days | 2026-01-10 | 2026-04-10 | AI Team |
| **Cloudflare Tokens** | 180 days | 2026-01-05 | 2026-07-05 | Infra Team |
| **TLS Certificates** | 30 days before expiry | 2026-01-01 | 2026-06-01 | Infra Team |

### Rotation Calendar (2026)

```
Q1 2026
├── January
│   ├── 01: TLS Certificates
│   ├── 05: Cloudflare Tokens
│   ├── 10: External AI Keys
│   ├── 15: Database Admin
│   └── 20: Service API Keys
├── February
│   └── (No rotations scheduled)
├── March
│   └── (No rotations scheduled)
└── April
    ├── 10: External AI Keys
    ├── 15: Database Admin
    └── 20: Service API Keys

Q2 2026
├── May
│   └── (No rotations scheduled)
├── June
│   └── 01: TLS Certificates
└── July
    ├── 01: JWT Signing Keys
    ├── 05: Cloudflare Tokens
    ├── 10: External AI Keys
    ├── 15: Database Admin
    └── 20: Service API Keys
```

---

## 🔄 Rotation Strategies

### Strategy 1: Rolling Rotation (Zero Downtime)

**Use Case:** JWT signing keys, service-to-service auth

```
┌─────────────────────────────────────────────────────────────────┐
│              ROLLING ROTATION PROCESS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 1: Deploy New Key (Day 1)                                │
│  ├── Generate new key                                           │
│  ├── Add to Vault                                               │
│  ├── Deploy to services (accept both old and new)               │
│  └── Monitor for issues                                         │
│                                                                  │
│  Phase 2: Transition Period (Day 1-7)                           │
│  ├── Both keys accepted                                         │
│  ├── Monitor token validation                                   │
│  ├── Gradually shift traffic to new key                         │
│  └── Update documentation                                       │
│                                                                  │
│  Phase 3: Remove Old Key (Day 7)                                │
│  ├── Stop accepting old key                                     │
│  ├── Remove old key from services                               │
│  ├── Archive old key (for 30 days)                              │
│  └── Update Vault                                               │
│                                                                  │
│  Phase 4: Cleanup (Day 37)                                      │
│  ├── Permanently delete old key                                 │
│  └── Update audit log                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Strategy 2: Immediate Rotation (Emergency)

**Use Case:** Suspected compromise, security incident

```
┌─────────────────────────────────────────────────────────────────┐
│              EMERGENCY ROTATION PROCESS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: Incident Declaration (T+0)                             │
│  ├── Confirm compromise or trigger event                        │
│  ├── Alert security team                                        │
│  └── Begin rotation procedure                                   │
│                                                                  │
│  Step 2: Generate New Key (T+5 min)                             │
│  ├── Create new key immediately                                 │
│  ├── Do NOT update Vault yet                                    │
│  └── Prepare deployment                                         │
│                                                                  │
│  Step 3: Coordinated Update (T+15 min)                          │
│  ├── Update Vault with new key                                  │
│  ├── Deploy to all services simultaneously                      │
│  ├── Monitor for failures                                       │
│  └── Rollback plan ready                                        │
│                                                                  │
│  Step 4: Revoke Old Key (T+30 min)                              │
│  ├── Revoke old key at provider (if external)                   │
│  ├── Remove from all services                                   │
│  └── Verify no service impact                                   │
│                                                                  │
│  Step 5: Post-Incident (T+1 hour)                               │
│  ├── Document incident                                          │
│  ├── Update rotation schedule if needed                         │
│  └── Review monitoring/alerting                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Strategy 3: Scheduled Rotation (Maintenance Window)

**Use Case:** Database credentials, infrastructure keys

```
┌─────────────────────────────────────────────────────────────────┐
│              SCHEDULED ROTATION PROCESS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Pre-Rotation (T-7 days)                                        │
│  ├── Announce maintenance window                                │
│  ├── Prepare rollback procedures                                │
│  ├── Test rotation in staging                                   │
│  └── Notify stakeholders                                        │
│                                                                  │
│  Rotation Day (T-0)                                             │
│  ├── Begin maintenance window                                   │
│  ├── Generate new credentials                                   │
│  ├── Update Vault                                               │
│  ├── Restart services with new credentials                      │
│  ├── Verify all services healthy                                │
│  └── Revoke old credentials                                     │
│                                                                  │
│  Post-Rotation (T+1 hour)                                       │
│  ├── Monitor service health                                     │
│  ├── Verify no errors in logs                                   │
│  ├── Close maintenance window                                   │
│  └── Update documentation                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Rotation Procedures

### Procedure 1: JWT Signing Key Rotation

```bash
#!/bin/bash
# scripts/rotate-jwt-keys.sh

set -e

ENVIRONMENT=${1:-production}
ROLLOUT_DAYS=${2:-7}

echo "🔐 JWT Signing Key Rotation"
echo "Environment: $ENVIRONMENT"
echo "Rollout Period: $ROLLOUT_DAYS days"
echo ""

# Configuration
VAULT_ADDR="http://room-02-tresor-vault:8200"
VAULT_TOKEN=$(cat /run/secrets/vault-token)
SECRET_PATH="secret/services/api-brain"

# Step 1: Generate new key
echo "Step 1/5: Generating new JWT signing key..."
NEW_KEY=$(openssl rand -base64 64)
KEY_VERSION=$(date +%s)

# Step 2: Retrieve current key
echo "Step 2/5: Retrieving current key..."
OLD_KEY=$(vault kv get -field=jwt_secret "$SECRET_PATH" 2>/dev/null || echo "")

if [ -z "$OLD_KEY" ]; then
    echo "⚠️  No existing key found. Creating new key only."
    vault kv put "$SECRET_PATH" \
        jwt_secret="$NEW_KEY" \
        jwt_key_version="$KEY_VERSION" \
        jwt_key_created="$(date -Iseconds)"
else
    # Step 3: Update Vault with both keys (rolling rotation)
    echo "Step 3/5: Updating Vault with new key (keeping old for transition)..."
    vault kv put "$SECRET_PATH" \
        jwt_secret="$NEW_KEY" \
        jwt_secret_old="$OLD_KEY" \
        jwt_key_version="$KEY_VERSION" \
        jwt_key_created="$(date -Iseconds)" \
        jwt_key_transition_start="$(date -Iseconds)"
    
    echo ""
    echo "✅ New key deployed. Both old and new keys are valid."
    echo "⏳ Transition period: $ROLLOUT_DAYS days"
    echo "📅 Schedule cleanup for: $(date -d "+$ROLLOUT_DAYS days" -Iseconds)"
    
    # Schedule cleanup job
    echo "$(date -d "+$ROLLOUT_DAYS days" '+%Y-%m-%d %H:%M') root $PWD/scripts/rotate-jwt-keys-cleanup.sh $SECRET_PATH" >> /etc/cron.d/vault-rotations
    
    # Step 4: Update services
    echo ""
    echo "Step 4/5: Updating services..."
    docker-compose -f Docker/services/api-brain/docker-compose.yml restart
    
    # Step 5: Verify
    echo ""
    echo "Step 5/5: Verifying deployment..."
    sleep 10
    
    if curl -s http://localhost:8000/health | grep -q "healthy"; then
        echo "✅ API Brain is healthy with new key"
    else
        echo "❌ API Brain health check failed!"
        echo "🔄 Initiating rollback..."
        vault kv put "$SECRET_PATH" \
            jwt_secret="$OLD_KEY" \
            jwt_secret_old="" \
            jwt_key_version="$(date +%s)"
        docker-compose -f Docker/services/api-brain/docker-compose.yml restart
        exit 1
    fi
fi

echo ""
echo "✅ JWT key rotation completed successfully!"
echo "📊 Key Version: $KEY_VERSION"
echo "📅 Rotation Date: $(date -Iseconds)"
```

### Procedure 2: External API Key Rotation

```bash
#!/bin/bash
# scripts/rotate-external-api-keys.sh

set -e

PROVIDER=${1:-openai}

echo "🔑 External API Key Rotation"
echo "Provider: $PROVIDER"
echo ""

# Configuration
VAULT_ADDR="http://room-02-tresor-vault:8200"
VAULT_TOKEN=$(cat /run/secrets/vault-token)
SECRET_PATH="secret/external/$PROVIDER"

# Step 1: Get current key info
echo "Step 1/5: Retrieving current key information..."
CURRENT_KEY=$(vault kv get -field=api_key "$SECRET_PATH" 2>/dev/null || echo "")

if [ -z "$CURRENT_KEY" ]; then
    echo "❌ No existing key found in Vault for $PROVIDER"
    echo "Please add the initial key manually:"
    echo "  vault kv put $SECRET_PATH api_key=YOUR_API_KEY"
    exit 1
fi

echo "✅ Current key found in Vault"

# Step 2: Generate new key at provider
echo ""
echo "Step 2/5: Generating new API key at provider..."
echo "⚠️  Manual action required!"
echo ""
echo "Please follow these steps:"
echo ""
case $PROVIDER in
    openai)
        echo "1. Visit: https://platform.openai.com/api-keys"
        echo "2. Click 'Create new secret key'"
        echo "3. Copy the new key (starts with 'sk-')"
        ;;
    anthropic)
        echo "1. Visit: https://console.anthropic.com/settings/keys"
        echo "2. Click 'Create Key'"
        echo "3. Copy the new key (starts with 'sk-ant-')"
        ;;
    groq)
        echo "1. Visit: https://console.groq.com/keys"
        echo "2. Click 'Create API Key'"
        echo "3. Copy the new key (starts with 'gsk_')"
        ;;
    gemini)
        echo "1. Visit: https://aistudio.google.com/app/apikey"
        echo "2. Click 'Create API Key'"
        echo "3. Copy the new key"
        ;;
    *)
        echo "1. Visit your $PROVIDER dashboard"
        echo "2. Generate a new API key"
        echo "3. Copy the new key"
        ;;
esac

echo ""
echo "4. Paste the new key below:"
read -s NEW_KEY
echo ""

# Validate key format
if [ -z "$NEW_KEY" ]; then
    echo "❌ No key provided. Aborting."
    exit 1
fi

echo "✅ New key received"

# Step 3: Update Vault
echo ""
echo "Step 3/5: Updating Vault with new key..."
vault kv put "$SECRET_PATH" \
    api_key="$NEW_KEY" \
    api_key_created="$(date -Iseconds)" \
    api_key_previous_created="$(vault kv get -field=api_key_created "$SECRET_PATH" 2>/dev/null || echo 'unknown')"

echo "✅ Vault updated"

# Step 4: Update services
echo ""
echo "Step 4/5: Updating services..."

# Find all services that use this provider
SERVICES=$(grep -r "$PROVIDER" Docker/ --include="docker-compose.yml" -l | xargs -I{} dirname {})

for service in $SERVICES; do
    echo "  → Restarting $service..."
    docker-compose -f "$service/docker-compose.yml" restart 2>/dev/null || echo "    (Service may not be running)"
done

echo "✅ Services updated"

# Step 5: Verify
echo ""
echo "Step 5/5: Verifying new key..."
sleep 5

# Test the new key
case $PROVIDER in
    openai)
        if curl -s https://api.openai.com/v1/models \
            -H "Authorization: Bearer $NEW_KEY" \
            | grep -q "data"; then
            echo "✅ OpenAI API key is valid"
            VALID=true
        else
            echo "❌ OpenAI API key validation failed"
            VALID=false
        fi
        ;;
    anthropic)
        if curl -s https://api.anthropic.com/v1/models \
            -H "x-api-key: $NEW_KEY" \
            -H "anthropic-version: 2023-06-01" \
            | grep -q "data"; then
            echo "✅ Anthropic API key is valid"
            VALID=true
        else
            echo "❌ Anthropic API key validation failed"
            VALID=false
        fi
        ;;
    *)
        echo "⚠️  Automatic validation not available for $PROVIDER"
        echo "Please manually verify the key is working"
        VALID=true
        ;;
esac

if [ "$VALID" = true ]; then
    echo ""
    echo "✅ API key rotation completed successfully!"
    echo ""
    echo "⚠️  IMPORTANT: Revoke the old key at $PROVIDER dashboard!"
    echo "   Old key should be revoked after 24 hours (grace period)"
    echo ""
    echo "📅 Schedule old key revocation for: $(date -d '+24 hours' -Iseconds)"
    
    # Schedule revocation reminder
    echo "$PROVIDER old key needs revocation" >> /var/log/key-revocation-queue.log
else
    echo ""
    echo "❌ Key validation failed!"
    echo "🔄 Rolling back to previous key..."
    vault kv put "$SECRET_PATH" api_key="$CURRENT_KEY"
    exit 1
fi
```

### Procedure 3: Database Credential Rotation

```bash
#!/bin/bash
# scripts/rotate-db-credentials.sh

set -e

DB_USER=${1:-app_user}
ENVIRONMENT=${2:-production}

echo "🗄️  Database Credential Rotation"
echo "User: $DB_USER"
echo "Environment: $ENVIRONMENT"
echo ""

# Configuration
DB_HOST="room-03-postgres-master"
DB_PORT="5432"
DB_NAME="sin_solver_production"
ADMIN_USER="ceo_admin"

echo "Step 1/4: Generating new password..."
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

echo "Step 2/4: Updating database user..."
docker exec -i room-03-postgres-master psql -U $ADMIN_USER -d $DB_NAME << EOF
-- Create new user with temporary name
CREATE USER ${DB_USER}_new WITH PASSWORD '$NEW_PASSWORD';

-- Grant same permissions as original user
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO ${DB_USER}_new;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER}_new;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER}_new;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER}_new;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER}_new;
EOF

echo "✅ New user created: ${DB_USER}_new"

echo ""
echo "Step 3/4: Updating Vault..."
vault kv put secret/infrastructure/postgres \
    username="${DB_USER}_new" \
    password="$NEW_PASSWORD" \
    host="$DB_HOST" \
    port="$DB_PORT" \
    database="$DB_NAME" \
    updated_at="$(date -Iseconds)" \
    previous_user="$DB_USER"

echo "✅ Vault updated"

echo ""
echo "Step 4/4: Rolling restart of services..."
docker-compose -f Docker/services/api-brain/docker-compose.yml restart
docker-compose -f Docker/agents/agent-01-n8n/docker-compose.yml restart

echo ""
echo "⏳ Waiting for services to reconnect..."
sleep 30

echo ""
echo "✅ Database credential rotation completed!"
echo ""
echo "📋 Post-rotation tasks:"
echo "   1. Monitor services for 24 hours"
echo "   2. Verify no connection errors"
echo "   3. Drop old user: DROP USER $DB_USER;"
echo "   4. Update documentation"
echo ""
echo "⚠️  Old user '$DB_USER' will be deleted after 7 days"
echo "   Scheduled deletion: $(date -d '+7 days' -Iseconds)"

# Schedule old user deletion
echo "$(date -d '+7 days' '+%Y-%m-%d %H:%M') root docker exec room-03-postgres-master psql -U $ADMIN_USER -d $DB_NAME -c \"DROP USER IF EXISTS $DB_USER;\"" >> /etc/cron.d/db-maintenance
```

---

## 📋 Rotation Checklist

### Pre-Rotation Checklist

- [ ] Rotation scheduled in calendar
- [ ] Stakeholders notified (if maintenance window)
- [ ] Rollback procedure documented
- [ ] Monitoring dashboards reviewed
- [ ] On-call engineer aware
- [ ] Test environment rotation successful
- [ ] Backup of current configuration

### During Rotation

- [ ] New key generated/retrieved
- [ ] Vault updated with new key
- [ ] Services restarted/updated
- [ ] Health checks passing
- [ ] No error spikes in logs
- [ ] Key validation successful

### Post-Rotation Checklist

- [ ] All services healthy
- [ ] Old key marked for revocation
- [ ] Documentation updated
- [ ] Rotation logged in audit system
- [ ] Next rotation scheduled
- [ ] Incident response team notified (if issues)

---

## 🚨 Emergency Rotation

### When to Trigger Emergency Rotation

- Suspected key compromise
- Security incident involving credentials
- Employee termination with key access
- Accidental key exposure (logs, GitHub, etc.)
- Vendor security breach notification

### Emergency Rotation Procedure

```bash
#!/bin/bash
# scripts/emergency-key-rotation.sh

set -e

INCIDENT_ID=$1
KEY_TYPE=$2

echo "🚨 EMERGENCY KEY ROTATION"
echo "Incident ID: $INCIDENT_ID"
echo "Key Type: $KEY_TYPE"
echo "Started: $(date -Iseconds)"
echo ""

# Alert security team
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"🚨 EMERGENCY KEY ROTATION STARTED - Incident: $INCIDENT_ID, Key: $KEY_TYPE\"}"

# Execute rotation based on type
case $KEY_TYPE in
    jwt)
        ./scripts/rotate-jwt-keys.sh production 0  # Immediate, no transition
        ;;
    database)
        ./scripts/rotate-db-credentials.sh app_user production
        ;;
    external)
        # Rotate all external keys
        for provider in openai anthropic groq gemini; do
            echo "Rotating $provider..."
            ./scripts/rotate-external-api-keys.sh $provider
        done
        ;;
    *)
        echo "Unknown key type: $KEY_TYPE"
        exit 1
        ;;
esac

# Post-rotation actions
echo ""
echo "📋 Post-rotation actions:"
echo "   1. Document incident in security log"
echo "   2. Review access logs for suspicious activity"
echo "   3. Update incident ticket"
echo "   4. Schedule security review"

echo ""
echo "✅ Emergency rotation completed: $(date -Iseconds)"

# Notify completion
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"✅ EMERGENCY KEY ROTATION COMPLETED - Incident: $INCIDENT_ID\"}"
```

---

## 📊 Rotation Metrics

### Key Performance Indicators

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Rotation Success Rate | >99% | 100% | ✅ |
| Average Rotation Time | <15 min | 8 min | ✅ |
| Service Downtime | 0 | 0 | ✅ |
| Failed Rotations (30d) | 0 | 0 | ✅ |
| Keys Rotated On Schedule | 100% | 100% | ✅ |

### Rotation History

| Date | Key Type | Duration | Status | Notes |
|------|----------|----------|--------|-------|
| 2026-01-20 | Service API Keys | 6 min | ✅ Success | Routine rotation |
| 2026-01-15 | Database Admin | 12 min | ✅ Success | Maintenance window |
| 2026-01-10 | External AI Keys | 18 min | ✅ Success | 4 providers |
| 2026-01-05 | Cloudflare Tokens | 5 min | ✅ Success | Routine rotation |
| 2026-01-01 | TLS Certificates | 3 min | ✅ Success | Auto-renewal |

---

## 📝 Document Information

| Attribute | Value |
|-----------|-------|
| **Document ID** | SEC-07-API-KEY-ROTATION |
| **Version** | 1.0.0 |
| **Classification** | Internal Use Only |
| **Author** | SIN-Solver Security Team |
| **Created** | 2026-01-30 |
| **Last Updated** | 2026-01-30 |
| **Review Cycle** | Quarterly |
| **Next Review** | 2026-04-30 |

---

*For additional security documentation, see the 26-Pillar Security Documentation Index.*
