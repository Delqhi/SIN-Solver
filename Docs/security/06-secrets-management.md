# 🔐 Secrets Management Guide

**Document ID:** SEC-06-SECRETS-MGMT  
**Version:** 1.0.0  
**Classification:** Internal Use Only  
**Last Updated:** 2026-01-30  

---

## 📋 Overview

This document defines the comprehensive secrets management strategy for SIN-Solver, covering the entire lifecycle of secrets from creation to rotation and retirement. Our approach ensures that sensitive data is protected according to industry best practices and compliance requirements.

### Secrets Management Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│           SECRETS LIFECYCLE MANAGEMENT                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐         │
│  │ Create  │ → │ Store   │ → │ Use     │ → │ Rotate  │         │
│  │         │   │         │   │         │   │         │         │
│  │ • Gen   │   │ • Vault │   │ • Inject│   │ • Auto  │         │
│  │ • Import│   │ • Enc   │   │ • Fetch │   │ • Manual│         │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘         │
│       ↑                                          ↓              │
│       └──────────────┬───────────────────────────┘              │
│                      ▼                                          │
│               ┌─────────────┐                                   │
│               │   Retire    │                                   │
│               │   • Revoke  │                                   │
│               │   • Delete  │                                   │
│               └─────────────┘                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Secret Classification

### Tier 1: Critical Secrets (Maximum Protection)

| Secret Type | Examples | Rotation | Storage |
|-------------|----------|----------|---------|
| **Root Credentials** | Vault root token, DB admin | Never (backup only) | Vault + Offline |
| **Encryption Keys** | Master encryption key, HSM keys | 365 days | Vault + HSM |
| **Infrastructure** | Cloud provider keys, TLS private keys | 90 days | Vault |

### Tier 2: Service Secrets (High Protection)

| Secret Type | Examples | Rotation | Storage |
|-------------|----------|----------|---------|
| **API Keys** | Service-to-service auth | 90 days | Vault |
| **JWT Secrets** | Signing keys | 180 days | Vault |
| **Database** | App DB credentials | 90 days | Vault (dynamic) |
| **Integration** | n8n, Vercel tokens | 90 days | Vault |

### Tier 3: External API Keys (Standard Protection)

| Secret Type | Examples | Rotation | Storage |
|-------------|----------|----------|---------|
| **AI Providers** | OpenAI, Anthropic, Groq | 90 days | Vault |
| **Search APIs** | Tavily, Exa, SerpAPI | 180 days | Vault |
| **Monitoring** | Sentry, DataDog | 180 days | Vault |

---

## 🏗️ Secrets Architecture

### Centralized Secrets Store

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECRETS ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              HashiCorp Vault (room-02)                   │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  Secret Engines                                  │    │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │    │   │
│  │  │  │ KV v2    │ │ Transit  │ │ Database │        │    │   │
│  │  │  │ (static) │ │ (enc)    │ │ (dynamic)│        │    │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘        │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                        │                                │   │
│  │                        ▼                                │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  Authentication                                  │    │   │
│  │  │  • Tokens • AppRole • Kubernetes • JWT          │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│          ┌───────────────────┼───────────────────┐              │
│          │                   │                   │              │
│          ▼                   ▼                   ▼              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │   Services   │   │   n8n        │   │   Vercel     │       │
│  │   (API Brain)│   │   (Workflows)│   │   (Hosting)  │       │
│  └──────────────┘   └──────────────┘   └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Secret Distribution Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Service    │     │    Vault     │     │   Secret     │
│  (Requester) │     │   (Server)   │     │   Store      │
└──────┬───────┘     └──────┬───────┘     └──────────────┘
       │                    │
       │ 1. Auth Request    │
       │ ─────────────────> │
       │                    │
       │ 2. Token/Lease     │
       │ <───────────────── │
       │                    │
       │ 3. Secret Request  │
       │ + Auth Token       │
       │ ─────────────────> │
       │                    │
       │                    │ 4. Retrieve
       │                    │ ───────────────────────────>
       │                    │
       │                    │ 5. Secret Data
       │                    │ <───────────────────────────
       │                    │
       │ 6. Secret Response │
       │ <───────────────── │
       │                    │
```

---

## 🔧 Secret Storage Patterns

### 1. Static Secrets (KV v2)

**Use Case:** Long-lived credentials, API keys, configuration

```bash
# Structure
secret/
├── infrastructure/
│   ├── postgres          # Database credentials
│   ├── redis             # Cache credentials
│   └── cloudflare        # Tunnel tokens
├── services/
│   ├── n8n/              # n8n configuration
│   ├── api-brain/        # API secrets
│   ├── steel/            # Browser config
│   └── skyvern/          # Solver config
├── external/
│   ├── openai/           # AI provider keys
│   ├── anthropic/
│   ├── groq/
│   └── tavily/
└── certificates/
    ├── tls/              # SSL certificates
    └── ca/               # CA certificates
```

**Example Operations:**

```bash
# Write a secret
vault kv put secret/services/n8n \
  encryption_key="$(openssl rand -base64 32)" \
  jwt_secret="$(openssl rand -base64 32)"

# Read a secret
vault kv get secret/services/n8n

# Read specific field
vault kv get -field=encryption_key secret/services/n8n

# Update a secret (creates new version)
vault kv put secret/services/n8n \
  encryption_key="new-value" \
  jwt_secret="$(vault kv get -field=jwt_secret secret/services/n8n)"

# List versions
vault kv metadata get secret/services/n8n

# Rollback to previous version
vault kv rollback -version=1 secret/services/n8n

# Delete specific version
vault kv delete -versions=3 secret/services/n8n

# Permanently delete
vault kv destroy -versions=3 secret/services/n8n
```

### 2. Dynamic Secrets (Database)

**Use Case:** Temporary database credentials with automatic rotation

```bash
# Generate dynamic credentials
vault read database/creds/readonly

# Response:
# Key                Value
# ---                -----
# lease_id           database/creds/readonly/abc123
# lease_duration     1h
# lease_renewable    true
# password           A1B2C3D4-generated-password
# username           v-token-readonly-abc123-def456

# Use credentials in application
export DB_USER=$(vault read -field=username database/creds/readonly)
export DB_PASS=$(vault read -field=password database/creds/readonly)

# Renew lease before expiry
vault lease renew database/creds/readonly/abc123

# Revoke immediately when done
vault lease revoke database/creds/readonly/abc123
```

### 3. Encryption as a Service (Transit)

**Use Case:** Encrypt sensitive data without exposing keys

```bash
# Encrypt data
vault write transit/encrypt/app-data \
  plaintext=$(echo "sensitive data" | base64)

# Response:
# Key           Value
# ---           -----
# ciphertext    vault:v1:ABC123...encrypted-data...

# Decrypt data
vault write transit/decrypt/app-data \
  ciphertext="vault:v1:ABC123...encrypted-data..."

# Response:
# Key           Value
# ---           -----
# plaintext     c2Vuc2l0aXZlIGRhdGEK  # base64 encoded

# Rotate encryption key
vault write -f transit/keys/app-data/rotate

# Rewrap data with new key version
vault write transit/rewrap/app-data \
  ciphertext="vault:v1:ABC123..."

# Sign data
vault write transit/sign/app-data \
  input=$(echo "data to sign" | base64)

# Verify signature
vault write transit/verify/app-data \
  input=$(echo "data to sign" | base64) \
  signature="vault:v1:..."
```

---

## 🔄 Secret Rotation Strategy

### Automated Rotation Schedule

| Secret Type | Rotation Frequency | Method | Automation |
|-------------|-------------------|--------|------------|
| Database credentials | 24 hours | Dynamic | Automatic |
| Service API keys | 90 days | Manual | Semi-auto |
| JWT signing keys | 180 days | Rolling | Automated |
| TLS certificates | 30 days before expiry | PKI | Automated |
| External API keys | Per provider policy | Manual | Manual |

### Rotation Procedures

#### 1. Database Credentials (Automatic)

```bash
# No action needed - Vault handles automatically
# Credentials expire after lease_duration

# Configure rotation period
vault write database/roles/readonly \
  db_name=postgresql \
  creation_statements="..." \
  default_ttl="24h" \
  max_ttl="48h" \
  rotation_period="24h"
```

#### 2. API Keys (Semi-Automated)

```bash
#!/bin/bash
# scripts/rotate-api-keys.sh

set -e

SERVICE=$1
OLD_VERSION=$(vault kv metadata get -format=json secret/services/$SERVICE | jq -r '.data.current_version')

echo "Rotating API keys for: $SERVICE"
echo "Current version: $OLD_VERSION"

# Generate new keys
NEW_ENCRYPTION_KEY=$(openssl rand -base64 32)
NEW_JWT_SECRET=$(openssl rand -base64 32)

# Write new version
vault kv put secret/services/$SERVICE \
  encryption_key="$NEW_ENCRYPTION_KEY" \
  jwt_secret="$NEW_JWT_SECRET"

# Update service (trigger rolling restart)
docker-compose -f Docker/services/$SERVICE/docker-compose.yml restart

# Verify new version
NEW_VERSION=$(vault kv metadata get -format=json secret/services/$SERVICE | jq -r '.data.current_version')
echo "New version: $NEW_VERSION"

# Keep old version for rollback (mark for deletion after 7 days)
echo "$(date): Marked version $OLD_VERSION of $SERVICE for deletion in 7 days" >> /var/log/secret-rotation.log

echo "✅ Rotation completed for $SERVICE"
```

#### 3. JWT Signing Keys (Rolling Rotation)

```bash
#!/bin/bash
# scripts/rotate-jwt-keys.sh

set -e

echo "🔄 Performing rolling JWT key rotation..."

# Get current key version
CURRENT_KEY=$(vault kv get -field=jwt_secret secret/services/api-brain)

# Generate new key
NEW_KEY=$(openssl rand -base64 32)

# Phase 1: Add new key as secondary (accept both keys)
vault kv patch secret/services/api-brain \
  jwt_secret="$NEW_KEY" \
  jwt_secret_old="$CURRENT_KEY" \
  jwt_key_version="$(date +%s)"

# Phase 2: Update services to use new key
# (Services should accept both old and new keys during transition)

echo "Waiting 24 hours for key propagation..."
sleep 86400  # In practice, use cron or scheduler

# Phase 3: Remove old key
vault kv patch secret/services/api-brain \
  jwt_secret="$NEW_KEY" \
  jwt_secret_old="" \
  jwt_key_version="$(date +%s)"

echo "✅ JWT key rotation completed"
```

---

## 🚀 Secret Injection Patterns

### Pattern 1: Environment Variables (Development)

```bash
#!/bin/bash
# scripts/inject-secrets-env.sh

export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=$(cat /run/secrets/vault-token)

# Fetch secrets and export as environment variables
export POSTGRES_USER=$(vault kv get -field=username secret/infrastructure/postgres)
export POSTGRES_PASSWORD=$(vault kv get -field=password secret/infrastructure/postgres)
export REDIS_PASSWORD=$(vault kv get -field=password secret/infrastructure/redis)
export N8N_ENCRYPTION_KEY=$(vault kv get -field=encryption_key secret/services/n8n)

# Start application
exec "$@"
```

### Pattern 2: Configuration Files (Production)

```bash
#!/bin/bash
# scripts/inject-secrets-config.sh

export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=$(cat /run/secrets/vault-token)

# Template configuration file
cat > /app/config/production.yml << EOF
database:
  host: room-03-postgres-master
  port: 5432
  username: $(vault kv get -field=username secret/infrastructure/postgres)
  password: $(vault kv get -field=password secret/infrastructure/postgres)
  database: sin_solver_production

redis:
  host: room-04-redis-cache
  port: 6379
  password: $(vault kv get -field=password secret/infrastructure/redis)

api:
  jwt_secret: $(vault kv get -field=jwt_secret secret/services/api-brain)
  encryption_key: $(vault kv get -field=encryption_key secret/services/api-brain)
EOF

# Secure the config file
chmod 600 /app/config/production.yml

# Start application
exec "$@"
```

### Pattern 3: Runtime Fetch (Microservices)

```python
# Python example: Runtime secret fetching
import hvac
import os
from functools import lru_cache

class SecretManager:
    def __init__(self):
        self.client = hvac.Client(
            url=os.getenv('VAULT_ADDR', 'http://room-02-tresor-vault:8200'),
            token=os.getenv('VAULT_TOKEN')
        )
    
    @lru_cache(maxsize=128)
    def get_secret(self, path, field=None):
        """Fetch secret from Vault with caching"""
        response = self.client.secrets.kv.v2.read_secret_version(
            path=path
        )
        data = response['data']['data']
        return data.get(field) if field else data
    
    def get_db_credentials(self, role='readonly'):
        """Get dynamic database credentials"""
        response = self.client.secrets.database.generate_credentials(
            name=role
        )
        return {
            'username': response['data']['username'],
            'password': response['data']['password'],
            'lease_id': response['lease_id']
        }
    
    def renew_lease(self, lease_id):
        """Renew a secret lease"""
        self.client.sys.renew_lease(lease_id=lease_id)

# Usage
secrets = SecretManager()
db_config = secrets.get_secret('infrastructure/postgres')
api_config = secrets.get_secret('services/api-brain')
```

### Pattern 4: Kubernetes/Container Integration

```yaml
# Docker Compose with Vault Agent
version: '3.9'

services:
  api-brain:
    image: sin-solver/api-brain:latest
    environment:
      VAULT_ADDR: http://room-02-tresor-vault:8200
    volumes:
      - vault-agent-token:/run/secrets:ro
    command: >
      sh -c "
        export VAULT_TOKEN=$$(cat /run/secrets/token) &&
        export DB_PASSWORD=$$(vault kv get -field=password secret/infrastructure/postgres) &&
        exec python -m api.main
      "
    
  vault-agent:
    image: hashicorp/vault:1.15
    environment:
      VAULT_ADDR: http://room-02-tresor-vault:8200
    command: >
      agent -config=/etc/vault/agent.hcl
    volumes:
      - ./vault-agent.hcl:/etc/vault/agent.hcl:ro
      - vault-agent-token:/run/secrets
```

---

## 📊 Secret Inventory

### Complete Secrets Catalog

#### Infrastructure Secrets

| Path | Fields | Tier | Rotation |
|------|--------|------|----------|
| `secret/infrastructure/postgres` | username, password | 1 | 90 days |
| `secret/infrastructure/redis` | password | 1 | 90 days |
| `secret/infrastructure/cloudflare` | tunnel_token | 1 | 180 days |

#### Service Secrets

| Path | Fields | Tier | Rotation |
|------|--------|------|----------|
| `secret/services/n8n` | encryption_key, jwt_secret | 2 | 180 days |
| `secret/services/api-brain` | jwt_secret, encryption_key | 2 | 180 days |
| `secret/services/steel` | api_key | 2 | 90 days |
| `secret/services/skyvern` | api_key | 2 | 90 days |
| `secret/services/captcha` | api_key | 2 | 90 days |
| `secret/services/survey` | api_key | 2 | 90 days |

#### External API Keys

| Path | Fields | Tier | Rotation |
|------|--------|------|----------|
| `secret/external/openai` | api_key | 3 | 90 days |
| `secret/external/anthropic` | api_key | 3 | 90 days |
| `secret/external/groq` | api_key | 3 | 90 days |
| `secret/external/gemini` | api_key | 3 | 90 days |
| `secret/external/tavily` | api_key | 3 | 180 days |
| `secret/external/exa` | api_key | 3 | 180 days |

---

## 🛡️ Security Controls

### Access Control

```hcl
# Policy: secret-reader
path "secret/data/infrastructure/*" {
  capabilities = ["read"]
}

path "secret/data/services/{{identity.entity.name}}/*" {
  capabilities = ["read", "list"]
}

# Deny access to external keys
path "secret/data/external/*" {
  capabilities = ["deny"]
}
```

### Audit Logging

All secret operations are logged:

```json
{
  "time": "2026-01-30T10:30:00Z",
  "type": "request",
  "auth": {
    "display_name": "token-api-brain",
    "policies": ["service-policy"]
  },
  "request": {
    "operation": "read",
    "path": "secret/data/services/n8n",
    "remote_address": "172.20.0.13"
  }
}
```

### Least Privilege

- Services only access their own secrets
- No service can read external API keys
- Dynamic credentials have minimal database permissions
- Tokens have short TTL (1-4 hours)

---

## 📝 Document Information

| Attribute | Value |
|-----------|-------|
| **Document ID** | SEC-06-SECRETS-MGMT |
| **Version** | 1.0.0 |
| **Classification** | Internal Use Only |
| **Author** | SIN-Solver Security Team |
| **Created** | 2026-01-30 |
| **Last Updated** | 2026-01-30 |
| **Review Cycle** | Quarterly |
| **Next Review** | 2026-04-30 |

---

*For additional security documentation, see the 26-Pillar Security Documentation Index.*
