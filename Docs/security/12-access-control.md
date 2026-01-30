# 👤 Access Control & RBAC

**Document ID:** SEC-12-ACCESS-CONTROL  
**Version:** 1.0.0  
**Classification:** Internal Use Only  
**Last Updated:** 2026-01-30  

---

## 📋 Overview

This document defines the access control framework for the SIN-Solver platform, including Role-Based Access Control (RBAC), Attribute-Based Access Control (ABAC), and authentication mechanisms. Proper access control ensures that users and services can only access resources they are authorized to use.

### Access Control Model

```
┌─────────────────────────────────────────────────────────────────┐
│              ACCESS CONTROL ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Identity Layer                                          │   │
│  │  ├── User Authentication (OAuth2, OIDC)                 │   │
│  │  ├── Service Authentication (mTLS, Tokens)              │   │
│  │  └── Multi-Factor Authentication (MFA)                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Authorization Layer                                     │   │
│  │  ├── RBAC (Role-Based Access Control)                   │   │
│  │  ├── ABAC (Attribute-Based Access Control)              │   │
│  │  └── Policy Engine (OPA - Open Policy Agent)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Resource Layer                                          │   │
│  │  ├── Services (API endpoints)                           │   │
│  │  ├── Data (Databases, Files)                            │   │
│  │  └── Infrastructure (Containers, Networks)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Identity Management

### User Identity

| Identity Provider | Use Case | Status |
|-------------------|----------|--------|
| **Cloudflare Access** | Web UI authentication | ✅ Active |
| **Vault** | CLI/API authentication | ✅ Active |
| **API Brain** | Service authentication | ✅ Active |

### Service Identity

| Service | Identity Method | Certificate |
|---------|----------------|-------------|
| api-brain | mTLS + JWT | vault-pki |
| n8n | Vault Token | - |
| vault | Self-authentication | - |
| postgres | SCRAM-SHA-256 | - |
| redis | Password | - |

---

## 👥 Role Definitions

### User Roles

```yaml
roles:
  admin:
    name: "Platform Administrator"
    description: "Full platform access"
    permissions:
      - "*:*"  # All actions on all resources
    
  developer:
    name: "Developer"
    description: "Development environment access"
    permissions:
      - "service:read"
      - "service:write:dev/*"
      - "logs:read:dev/*"
      - "metrics:read"
    
  operator:
    name: "Operations Engineer"
    description: "Production operations access"
    permissions:
      - "service:read"
      - "service:restart"
      - "logs:read"
      - "metrics:read"
      - "alerts:acknowledge"
    
  viewer:
    name: "Read-Only User"
    description: "Monitoring and viewing access"
    permissions:
      - "service:read"
      - "metrics:read"
      - "logs:read"
    
  auditor:
    name: "Security Auditor"
    description: "Security audit access"
    permissions:
      - "audit:read"
      - "logs:read"
      - "policy:read"
```

### Service Roles

```yaml
service_roles:
  api-gateway:
    name: "API Gateway"
    permissions:
      - "service:read"
      - "service:proxy"
      - "auth:validate"
  
  workflow-engine:
    name: "Workflow Engine (n8n)"
    permissions:
      - "service:read"
      - "service:execute"
      - "database:read:workflows"
      - "database:write:workflows"
  
  captcha-solver:
    name: "CAPTCHA Solver"
    permissions:
      - "service:read:captcha"
      - "ai:invoke:vision"
      - "browser:use"
  
  survey-worker:
    name: "Survey Worker"
    permissions:
      - "service:read:survey"
      - "browser:use"
      - "captcha:request"
  
  monitoring:
    name: "Monitoring Service"
    permissions:
      - "metrics:read"
      - "logs:read"
      - "health:read"
```

---

## 🔐 Vault Policies

### Policy Structure

```hcl
# policies/admin.hcl
# Full administrative access

path "*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}
```

```hcl
# policies/developer.hcl
# Development environment access

# Read service configurations
path "secret/data/services/*" {
  capabilities = ["read", "list"]
}

# Read dev secrets only
path "secret/data/dev/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Read infrastructure (non-sensitive)
path "secret/data/infrastructure/common" {
  capabilities = ["read"]
}

# Deny production secrets
path "secret/data/production/*" {
  capabilities = ["deny"]
}

# Deny external API keys
path "secret/data/external/*" {
  capabilities = ["deny"]
}

# Transit: encrypt own data
path "transit/encrypt/{{identity.entity.name}}" {
  capabilities = ["update"]
}

# Transit: decrypt own data
path "transit/decrypt/{{identity.entity.name}}" {
  capabilities = ["update"]
}

# System health
path "sys/health" {
  capabilities = ["read"]
}

path "sys/seal-status" {
  capabilities = ["read"]
}
```

```hcl
# policies/service-api-brain.hcl
# API Brain service policy

# Read service secrets
path "secret/data/services/api-brain" {
  capabilities = ["read"]
}

# Read infrastructure config
path "secret/data/infrastructure/postgres" {
  capabilities = ["read"]
}

path "secret/data/infrastructure/redis" {
  capabilities = ["read"]
}

# Database dynamic credentials
path "database/creds/api-readwrite" {
  capabilities = ["read"]
}

# Transit operations
path "transit/encrypt/app-data" {
  capabilities = ["update"]
}

path "transit/decrypt/app-data" {
  capabilities = ["update"]
}

# System health
path "sys/health" {
  capabilities = ["read"]
}
```

```hcl
# policies/service-n8n.hcl
# n8n workflow engine policy

# Read n8n secrets
path "secret/data/services/n8n" {
  capabilities = ["read"]
}

# Read infrastructure
path "secret/data/infrastructure/postgres" {
  capabilities = ["read"]
}

path "secret/data/infrastructure/redis" {
  capabilities = ["read"]
}

# Database credentials
path "database/creds/n8n" {
  capabilities = ["read"]
}

# System health
path "sys/health" {
  capabilities = ["read"]
}
```

### Policy Assignment

```bash
#!/bin/bash
# scripts/assign-policies.sh

# Create policies
vault policy write admin policies/admin.hcl
vault policy write developer policies/developer.hcl
vault policy write operator policies/operator.hcl
vault policy write viewer policies/viewer.hcl
vault policy write service-api-brain policies/service-api-brain.hcl
vault policy write service-n8n policies/service-n8n.hcl

# Assign to entities
vault write identity/entity name="api-brain-service" \
    policies="service-api-brain,default"

vault write identity/entity name="n8n-service" \
    policies="service-n8n,default"

# Assign to users
vault write auth/userpass/users/admin \
    password="<HASH>" \
    policies="admin,default"

vault write auth/userpass/users/developer1 \
    password="<HASH>" \
    policies="developer,default"
```

---

## 🎫 Authentication Methods

### Token Authentication

```bash
# Create a token with specific policies
vault token create \
    -policy=developer \
    -ttl=8h \
    -renewable=true \
    -display-name="developer-token-$(date +%s)"

# Create service token
vault token create \
    -policy=service-api-brain \
    -ttl=24h \
    -renewable=true \
    -orphan=true \
    -display-name="api-brain-service"

# Revoke token
vault token revoke <token_id>

# Lookup token
vault token lookup <token_id>
```

### AppRole Authentication

```bash
# Enable AppRole auth method
vault auth enable approle

# Create AppRole for API Brain
vault write auth/approle/role/api-brain \
    token_ttl=1h \
    token_max_ttl=4h \
    token_policies="service-api-brain,default" \
    secret_id_ttl=24h \
    secret_id_num_uses=10 \
    bind_secret_id=true

# Get RoleID
vault read auth/approle/role/api-brain/role-id

# Generate SecretID
vault write -f auth/approle/role/api-brain/secret-id

# Login with AppRole
vault write auth/approle/login \
    role_id="<ROLE_ID>" \
    secret_id="<SECRET_ID>"

# Response includes client_token
```

### Kubernetes Authentication

```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Configure Kubernetes
vault write auth/kubernetes/config \
    token_reviewer_jwt="<K8S_TOKEN>" \
    kubernetes_host="https://k8s-api.sin-solver.local:6443" \
    kubernetes_ca_cert="<CA_CERT>"

# Create role for service account
vault write auth/kubernetes/role/api-brain \
    bound_service_account_names="api-brain" \
    bound_service_account_namespaces="default" \
    policies="service-api-brain" \
    ttl=1h
```

---

## 🔍 Access Audit

### Audit Logging

```bash
# Enable file audit log
vault audit enable file file_path=/vault/logs/audit.log

# Enable syslog audit
vault audit enable syslog tag="vault-audit"

# List audit devices
vault audit list

# View audit log
tail -f /vault/logs/audit.log | jq .
```

### Audit Log Format

```json
{
  "time": "2026-01-30T10:30:00.123456789Z",
  "type": "request",
  "auth": {
    "client_token": "hmac-sha256:abc123...",
    "accessor": "hmac-sha256:def456...",
    "display_name": "token-api-brain",
    "policies": ["service-api-brain", "default"],
    "token_policies": ["service-api-brain", "default"],
    "metadata": {
      "service": "api-brain",
      "environment": "production"
    },
    "entity_id": "entity-123",
    "token_type": "service"
  },
  "request": {
    "operation": "read",
    "path": "secret/data/services/api-brain",
    "data": null,
    "remote_address": "172.20.0.13",
    "namespace": {
      "id": "root"
    }
  },
  "response": {
    "data": {
      "data": {
        "jwt_secret": "hmac-sha256:..."
      }
    }
  }
}
```

### Access Review

```bash
#!/bin/bash
# scripts/review-access.sh

echo "Access Review Report"
echo "==================="
echo "Generated: $(date)"
echo ""

# List all entities
echo "Entities:"
vault list identity/entity/id | tail -n +2

# List all groups
echo ""
echo "Groups:"
vault list identity/group/id | tail -n +2

# List all tokens
echo ""
echo "Active Tokens:"
vault list auth/token/accessors | tail -n +2 | wc -l
echo "Total active tokens"

# List all policies
echo ""
echo "Policies:"
vault policy list

# Check for unused policies
echo ""
echo "Checking for unused policies..."
# Custom logic to identify unused policies
```

---

## 📝 Document Information

| Attribute | Value |
|-----------|-------|
| **Document ID** | SEC-12-ACCESS-CONTROL |
| **Version** | 1.0.0 |
| **Classification** | Internal Use Only |
| **Author** | SIN-Solver Security Team |
| **Created** | 2026-01-30 |
| **Last Updated** | 2026-01-30 |
| **Review Cycle** | Quarterly |
| **Next Review** | 2026-04-30 |

---

*For additional security documentation, see the 26-Pillar Security Documentation Index.*
