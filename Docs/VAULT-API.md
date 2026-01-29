# 🔐 Vault API Reference & Integration Guide

**Version:** 1.0 (Phase 7)  
**Updated:** 2026-01-28  
**Status:** PRODUCTION READY  
**Total Lines:** 350+

---

## TABLE OF CONTENTS

1. [API Overview](#api-overview)
2. [Authentication Methods](#authentication-methods)
3. [Secret Retrieval Patterns](#secret-retrieval-patterns)
4. [Vault CLI Examples](#vault-cli-examples)
5. [HTTP API Endpoints](#http-api-endpoints)
6. [Integration Examples](#integration-examples)
7. [Error Codes & Handling](#error-codes--handling)
8. [SDKs & Libraries](#sdks--libraries)
9. [Security Best Practices](#security-best-practices)
10. [Monitoring & Audit Logging](#monitoring--audit-logging)

---

## API OVERVIEW

Vault is the central secrets management service for Delqhi-Platform, storing:
- PostgreSQL credentials
- Redis authentication tokens
- n8n API keys
- Agent authentication tokens
- Third-party API credentials

**Base URL:** `http://room-02-vault:8200` (internal)  
**Public URL:** `https://vault.yourdomain.com` (if exposed)  
**API Version:** V1  
**Default Namespace:** `secret/`

---

## AUTHENTICATION METHODS

### Method 1: Root Token (Admin Only)

Used for initialization and administration tasks.

```bash
# Export root token (from vault-init.json)
export VAULT_TOKEN="s.xxxxxxxxxxxxx"

# Verify authentication
curl -H "X-Vault-Token: $VAULT_TOKEN" \
  http://room-02-vault:8200/v1/auth/token/lookup-self
```

### Method 2: AppRole Authentication (Recommended for Services)

AppRole is used by all agents and services to authenticate.

**Setup AppRole:**
```bash
# Enable AppRole auth method
vault auth enable approle

# Create a role for agents
vault write auth/approle/role/agent-role \
  bind_secret_id=true \
  secret_id_ttl=24h \
  secret_id_num_uses=unlimited

# Get role ID (persistent)
vault read auth/approle/role/agent-role/role-id
# Output: role_id = "xxxxx"

# Generate secret ID (temporary)
vault write -f auth/approle/role/agent-role/secret-id
# Output: secret_id = "yyyyy"

# Authenticate with AppRole
vault write auth/approle/login \
  role_id="xxxxx" \
  secret_id="yyyyy"
# Returns: client_token = "s.zzzzz"
```

**Use in Docker:**
```yaml
environment:
  VAULT_ADDR: http://room-02-vault:8200
  VAULT_ROLE_ID: ${VAULT_ROLE_ID}  # From Vault
  VAULT_SECRET_ID: ${VAULT_SECRET_ID}  # From Vault secret storage
```

### Method 3: JWT/OIDC Authentication (For CI/CD)

For GitHub Actions and other external CI/CD pipelines.

```bash
# Enable JWT auth method
vault auth enable jwt

# Configure JWT auth
vault write auth/jwt/config \
  jwks_url="https://token.actions.githubusercontent.com/.well-known/jwks" \
  bound_audiences="https://github.com/YourOrg"

# Create role for GitHub Actions
vault write auth/jwt/role/github-actions \
  bound_audiences="https://github.com/YourOrg" \
  user_claim="actor" \
  role_type="jwt" \
  policies="default,cicd-policy"

# In GitHub Actions workflow:
# token=$(curl -s -X POST \
#   -H "Authorization: Bearer ${{ secrets.ACTIONS_ID_TOKEN_REQUEST_TOKEN }}" \
#   "${{ secrets.ACTIONS_ID_TOKEN_REQUEST_URL }}" | jq '.token')
# vault_token=$(curl -s -X POST \
#   -d "role=github-actions&jwt=$token" \
#   http://vault:8200/v1/auth/jwt/login | jq '.auth.client_token')
```

### Method 4: Kubernetes Authentication (For K8s Deployments)

```bash
# Enable Kubernetes auth method
vault auth enable kubernetes

# Configure with K8s cluster details
vault write auth/kubernetes/config \
  kubernetes_host="https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_SERVICE_PORT" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token

# Create role for service account
vault write auth/kubernetes/role/agents \
  bound_service_account_names=agent-sa \
  bound_service_account_namespaces=default \
  policies=agent-policy \
  ttl=24h
```

---

## SECRET RETRIEVAL PATTERNS

### Pattern 1: KV V2 Secrets Engine (Most Common)

```bash
# Write secret
vault kv put secret/database/postgres \
  username=postgres \
  password=secure_password \
  host=room-03-postgres-master \
  port=5432

# Read secret
vault kv get secret/database/postgres
# Output:
# ====== Data ======
# Key         Value
# ---         -----
# password    secure_password
# username    postgres
# host        room-03-postgres-master
# port        5432

# Get JSON output
vault kv get -format=json secret/database/postgres | \
  jq '.data.data'

# List secrets in path
vault kv list secret/database/

# Delete secret
vault kv delete secret/database/postgres

# Undelete secret (within retention period)
vault kv undelete secret/database/postgres --versions=1
```

### Pattern 2: Dynamic Database Credentials

```bash
# Enable database secrets engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="readonly" \
  connection_url="postgresql://{{username}}:{{password}}@room-03-postgres-master:5432/sin_solver" \
  username="vault" \
  password="vault_password"

# Create role with TTL
vault write database/roles/readonly \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Get temporary credentials (auto-rotated)
vault read database/creds/readonly
# Output:
# Key                Value
# ---                -----
# password           A1a-XXXXXXXXXXXXX
# username           v_readonly_XXXXX
# (expires in 1 hour)
```

### Pattern 3: SSH Key Management

```bash
# Enable SSH secrets engine
vault secrets enable ssh

# Configure signing key
vault write ssh/config/ca \
  generate_signing_key=true

# Create role for servers
vault write ssh/roles/servers \
  key_type=ca \
  ttl=30m \
  max_ttl=2h \
  allowed_users="*" \
  allow_user_certificates=true

# Generate client certificate
vault write -f ssh/sign/servers \
  public_key=@~/.ssh/id_rsa.pub \
  username=ubuntu \
  cert_type=user
# Returns: signed_key (use for SSH access)
```

---

## VAULT CLI EXAMPLES

### Authentication

```bash
# Authenticate with AppRole
vault login -method=approle \
  role_id=xxxxx \
  secret_id=yyyyy

# Authenticate with JWT (GitHub Actions)
vault login -method=jwt role=github-actions jwt=$TOKEN

# Check current auth token
vault token lookup

# Renew current token
vault token renew

# Revoke token
vault token revoke
```

### Secrets Management

```bash
# Create secret
vault kv put secret/myapp/database \
  username=admin \
  password="pa$$word123"

# Read entire secret object
vault kv get secret/myapp/database

# Read specific field
vault kv get -field=password secret/myapp/database

# Update secret (merge with existing)
vault kv patch secret/myapp/database \
  new_field="new_value"

# Create version history
vault kv metadata get secret/myapp/database

# Rollback to previous version
vault kv rollback secret/myapp/database -version=1

# Generate random secret
vault kv put secret/tokens/random \
  value=$(openssl rand -hex 32)

# Bulk import from .env file
# (via script - see Integration Examples)
```

### Policies

```bash
# Create policy
vault policy write my-policy -<<EOF
path "secret/data/myapp/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "secret/data/shared/*" {
  capabilities = ["read", "list"]
}
EOF

# List policies
vault policy list

# Read policy
vault policy read my-policy

# Delete policy
vault policy delete my-policy
```

### Audit Logging

```bash
# Enable file audit logging
vault audit enable file file_path=/vault/logs/audit.log

# View audit logs
vault audit list

# Audit log format (JSON)
# {
#   "time": "2026-01-28T15:30:00.000Z",
#   "type": "request",
#   "request": {
#     "path": "secret/data/database/postgres",
#     "method": "GET",
#     "client_token": "s.xxxxx"
#   },
#   "response": {
#     "status_code": 200
#   }
# }
```

---

## HTTP API ENDPOINTS

### Authentication Endpoints

**AppRole Login:**
```bash
curl -X POST \
  -d '{"role_id":"xxxxx","secret_id":"yyyyy"}' \
  http://room-02-vault:8200/v1/auth/approle/login
```

**Token Lookup:**
```bash
curl -H "X-Vault-Token: $VAULT_TOKEN" \
  http://room-02-vault:8200/v1/auth/token/lookup-self
```

### Secret Endpoints

**Read Secret (KV V2):**
```bash
curl -H "X-Vault-Token: $VAULT_TOKEN" \
  http://room-02-vault:8200/v1/secret/data/database/postgres

# Response:
# {
#   "request_id": "xxxxx",
#   "data": {
#     "data": {
#       "username": "postgres",
#       "password": "secure_password",
#       "host": "room-03-postgres-master"
#     },
#     "metadata": {
#       "version": 1,
#       "created_time": "2026-01-28T15:00:00.000Z"
#     }
#   }
# }
```

**Write Secret:**
```bash
curl -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"data":{"username":"postgres","password":"secret"}}' \
  http://room-02-vault:8200/v1/secret/data/myapp/config
```

**List Secrets:**
```bash
curl -X LIST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  http://room-02-vault:8200/v1/secret/metadata/
```

**Delete Secret:**
```bash
curl -X DELETE \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  http://room-02-vault:8200/v1/secret/data/myapp/config
```

### Health Endpoint

```bash
curl http://room-02-vault:8200/v1/sys/health

# Response (unsealed):
# {
#   "initialized": true,
#   "sealed": false,
#   "standby": false,
#   "performance_standby": false,
#   "replication_performance_mode": "unknown",
#   "replication_dr_mode": "unknown",
#   "server_time_utc": 1706459400,
#   "version": "1.15.0"
# }
```

---

## INTEGRATION EXAMPLES

### Example 1: Node.js Service Integration

```javascript
const vault = require('node-vault')({
  endpoint: process.env.VAULT_ADDR || 'http://room-02-vault:8200',
  token: process.env.VAULT_TOKEN
});

async function getDatabaseConfig() {
  try {
    // Authenticate with AppRole if no token
    if (!process.env.VAULT_TOKEN) {
      const auth = await vault.appAuth({
        role_id: process.env.VAULT_ROLE_ID,
        secret_id: process.env.VAULT_SECRET_ID
      });
      vault.token = auth.auth.client_token;
    }

    // Get database credentials
    const secret = await vault.read('secret/data/database/postgres');
    const dbConfig = {
      host: secret.data.data.host,
      port: parseInt(secret.data.data.port),
      user: secret.data.data.username,
      password: secret.data.data.password,
      database: secret.data.data.database
    };

    // Create connection
    const Pool = require('pg').Pool;
    const pool = new Pool(dbConfig);
    
    return pool;
  } catch (error) {
    console.error('Vault lookup failed:', error.message);
    throw new Error('Could not retrieve database credentials from Vault');
  }
}

module.exports = { getDatabaseConfig };
```

### Example 2: Python Service Integration

```python
import hvac
import os

class VaultClient:
    def __init__(self):
        self.client = hvac.Client(
            url=os.getenv('VAULT_ADDR', 'http://room-02-vault:8200')
        )
    
    def authenticate_approle(self):
        """Authenticate using AppRole"""
        response = self.client.auth.approle.login(
            role_id=os.getenv('VAULT_ROLE_ID'),
            secret_id=os.getenv('VAULT_SECRET_ID')
        )
        self.client.token = response['auth']['client_token']
    
    def get_database_config(self):
        """Retrieve PostgreSQL credentials from Vault"""
        self.authenticate_approle()
        
        secret = self.client.secrets.kv.v2.read_secret_version(
            path='database/postgres'
        )
        
        return {
            'host': secret['data']['data']['host'],
            'port': int(secret['data']['data']['port']),
            'user': secret['data']['data']['username'],
            'password': secret['data']['data']['password'],
            'database': secret['data']['data']['database']
        }

# Usage
vault = VaultClient()
db_config = vault.get_database_config()
```

### Example 3: Vercel Environment Variable Injection

```bash
#!/bin/bash
# scripts/deploy-with-vault.sh

# Get Vault token from GitHub Actions
VAULT_TOKEN=$1

# Retrieve secrets from Vault
POSTGRES_PASSWORD=$(curl -s \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  http://room-02-vault:8200/v1/secret/data/database/postgres | \
  jq -r '.data.data.password')

REDIS_PASSWORD=$(curl -s \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  http://room-02-vault:8200/v1/secret/data/database/redis | \
  jq -r '.data.data.password')

# Set Vercel environment variables
vercel env add POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
vercel env add REDIS_PASSWORD "$REDIS_PASSWORD"

# Deploy
vercel deploy --prod
```

### Example 4: n8n Workflow Integration

**In n8n workflow node:**
```javascript
// Function node in n8n
const axios = require('axios');

async function getVaultSecret(path) {
  const response = await axios.get(
    `http://room-02-vault:8200/v1/secret/data/${path}`,
    {
      headers: {
        'X-Vault-Token': process.env.VAULT_TOKEN
      }
    }
  );
  return response.data.data.data;
}

const dbCreds = await getVaultSecret('database/postgres');
return {
  host: dbCreds.host,
  user: dbCreds.username,
  password: dbCreds.password
};
```

### Example 5: Docker Secrets Injection

```dockerfile
# Dockerfile with Vault integration
FROM node:18-alpine

ARG VAULT_ADDR
ARG VAULT_TOKEN

# Fetch secrets during build
RUN apk add --no-cache curl jq && \
    DB_PASSWORD=$(curl -s -H "X-Vault-Token:${VAULT_TOKEN}" \
    ${VAULT_ADDR}/v1/secret/data/database/postgres | \
    jq -r '.data.data.password') && \
    echo "DB_PASSWORD=$DB_PASSWORD" > .env

WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

---

## ERROR CODES & HANDLING

### 200 - OK
```json
{
  "request_id": "xxxxx",
  "data": { "result": "success" }
}
```

### 400 - Bad Request
```json
{
  "errors": ["invalid role_id format"]
}
```

**Handle:** Validate input parameters

### 401 - Unauthorized
```json
{
  "errors": ["permission denied"]
}
```

**Handle:** Check VAULT_TOKEN, re-authenticate

### 403 - Forbidden
```json
{
  "errors": ["permission denied"]
}
```

**Handle:** Check policy permissions

### 404 - Not Found
```json
{
  "errors": ["secret not found at 'secret/data/missing'"]
}
```

**Handle:** Verify secret path exists

### 429 - Rate Limited
```json
{
  "errors": ["rate limit exceeded"]
}
```

**Handle:** Implement exponential backoff

### 500 - Internal Error
```json
{
  "errors": ["internal server error"]
}
```

**Handle:** Check Vault logs, retry with backoff

### Retry Strategy

```javascript
async function getSecretWithRetry(path, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await vault.read(`secret/data/${path}`);
    } catch (error) {
      if (error.statusCode === 429 || error.statusCode >= 500) {
        const backoff = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, backoff));
      } else {
        throw error;
      }
    }
  }
}
```

---

## SDKs & LIBRARIES

### Node.js - hvac-js
```bash
npm install node-vault
```

### Python - hvac
```bash
pip install hvac
```

### Go - SDK
```bash
go get github.com/hashicorp/vault/api
```

### CLI Tool
```bash
# macOS
brew install vault

# Linux
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/
```

---

## SECURITY BEST PRACTICES

### Token Management

- **Rotate tokens** every 24 hours
- **Use short TTLs** (1h-24h depending on use case)
- **Revoke tokens** when service shuts down
- **Never log tokens** in console/files

### Secret Rotation

```bash
# Rotate a secret
vault kv put secret/database/postgres \
  username=postgres \
  password="new_secure_password_$(date +%s)"

# Set rotation policy
vault write database/roles/readonly \
  rotation_statements="ALTER ROLE \"{{name}}\" WITH PASSWORD '{{password}}';" \
  rotation_window="1h"
```

### Access Control

- Use AppRole for service-to-service communication
- Use policies to restrict secret access
- Enable audit logging for compliance
- Regularly review access logs

### Secret Storage

- Store Vault keys in secure location (1Password, LastPass)
- Use hardware security module (HSM) for production
- Back up encryption keys securely
- Enable HA replication for disaster recovery

---

## MONITORING & AUDIT LOGGING

### Enable Audit Logging

```bash
vault audit enable file file_path=/vault/logs/audit.log

# Docker volume mount
volumes:
  - ./audit-logs:/vault/logs

# Monitor logs
tail -f /vault/logs/audit.log | jq '.'
```

### Prometheus Metrics

```bash
vault audit enable file file_path=/vault/logs/prometheus.log

# Metrics exposed at:
# http://room-02-vault:8200/v1/sys/metrics
```

### Alert on Suspicious Activity

```bash
# Failed authentication attempts
grep "auth.*error" audit.log | wc -l

# Unauthorized secret access
grep "403\|permission denied" audit.log | wc -l

# Token revocations
grep "revoke" audit.log | wc -l
```

---

## QUICK REFERENCE

| Task | Command |
|------|---------|
| Read secret | `vault kv get secret/path/to/secret` |
| Write secret | `vault kv put secret/path value=data` |
| List secrets | `vault kv list secret/path/` |
| Delete secret | `vault kv delete secret/path` |
| Authenticate | `vault login -method=approle ...` |
| Check health | `curl http://vault:8200/v1/sys/health` |
| View audit log | `vault audit list` |
| Create policy | `vault policy write name -<<EOF` |

---

**Document:** VAULT-API.md (Phase 7)  
**Status:** PRODUCTION READY  
**Last Updated:** 2026-01-28T15:30:00Z  
**Approver:** Sisyphus Agent
