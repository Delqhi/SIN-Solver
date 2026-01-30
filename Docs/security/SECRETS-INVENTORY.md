# 🔐 Secrets Inventory

**Document ID:** SEC-SECRETS-INVENTORY  
**Version:** 1.0.0  
**Classification:** CONFIDENTIAL  
**Last Updated:** 2026-01-30  
**WARNING:** This document contains NO actual secret values. All secrets are stored in HashiCorp Vault only.

---

## 📋 Overview

This document provides a complete inventory of all secrets used in the SIN-Solver platform. It documents the structure, location, and rotation requirements for each secret without revealing actual values.

### Secret Storage Location

**Primary Store:** HashiCorp Vault (`room-02-tresor-vault`)  
**Path Prefix:** `secret/`  
**Access:** Via Vault API or CLI  
**Audit:** All access logged to `/vault/logs/audit.log`

---

## 🗂️ Secret Categories

### Category 1: Infrastructure Secrets (Tier 1 - Critical)

| Secret Path | Fields | Rotation | Owner | Services |
|-------------|--------|----------|-------|----------|
| `secret/infrastructure/postgres` | `username`, `password`, `host`, `port`, `database` | 90 days | DBA | All services |
| `secret/infrastructure/redis` | `password`, `host`, `port` | 90 days | DevOps | All services |
| `secret/infrastructure/cloudflare` | `tunnel_token`, `api_token`, `zone_id` | 180 days | Infra | Cloudflared |
| `secret/infrastructure/vault` | `unseal_keys` (x5), `root_token` | Never | Security | Vault only |

### Category 2: Service Secrets (Tier 2 - High)

| Secret Path | Fields | Rotation | Owner | Services |
|-------------|--------|----------|-------|----------|
| `secret/services/n8n` | `encryption_key`, `jwt_secret`, `db_password` | 180 days | DevOps | n8n |
| `secret/services/api-brain` | `jwt_secret`, `encryption_key`, `api_key` | 180 days | DevOps | API Brain |
| `secret/services/steel` | `api_key`, `auth_token` | 90 days | DevOps | Steel Browser |
| `secret/services/skyvern` | `api_key`, `vision_api_key` | 90 days | DevOps | Skyvern |
| `secret/services/vault-api` | `vault_token`, `vercel_token`, `n8n_api_key` | 90 days | DevOps | Vault API |
| `secret/services/captcha` | `api_key`, `model_api_keys` | 90 days | AI Team | Captcha Worker |
| `secret/services/survey` | `api_key`, `platform_tokens` | 90 days | AI Team | Survey Worker |
| `secret/services/clawdbot` | `telegram_bot_token`, `discord_bot_token` | 180 days | DevOps | Clawdbot |
| `secret/services/scira` | `api_keys` (multiple) | 90 days | AI Team | Scira AI |
| `secret/services/plane` | `api_key`, `secret_key` | 90 days | DevOps | Plane MCP |

### Category 3: External API Keys (Tier 3 - Standard)

| Secret Path | Fields | Rotation | Owner | Usage |
|-------------|--------|----------|-------|-------|
| `secret/external/openai` | `api_key`, `org_id` | 90 days | AI Team | GPT models |
| `secret/external/anthropic` | `api_key` | 90 days | AI Team | Claude models |
| `secret/external/groq` | `api_key` | 90 days | AI Team | Fast inference |
| `secret/external/gemini` | `api_key`, `project_id` | 90 days | AI Team | Google AI |
| `secret/external/tavily` | `api_key` | 180 days | AI Team | Web search |
| `secret/external/exa` | `api_key` | 180 days | AI Team | Neural search |
| `secret/external/xai` | `api_key` | 90 days | AI Team | xAI models |
| `secret/external/deepseek` | `api_key` | 90 days | AI Team | DeepSeek models |
| `secret/external/mistral` | `api_key` | 90 days | AI Team | Mistral models |
| `secret/external/qwen` | `api_key` | 90 days | AI Team | Qwen models |
| `secret/external/kimi` | `api_key` | 90 days | AI Team | Moonshot AI |

### Category 4: TLS Certificates

| Secret Path | Fields | Rotation | Owner | Usage |
|-------------|--------|----------|-------|-------|
| `secret/certificates/tls/api` | `cert`, `key`, `chain` | Auto (90 days) | Infra | api.delqhi.com |
| `secret/certificates/tls/n8n` | `cert`, `key`, `chain` | Auto (90 days) | Infra | n8n.delqhi.com |
| `secret/certificates/tls/vault` | `cert`, `key`, `chain` | Auto (90 days) | Infra | vault.delqhi.com |
| `secret/certificates/tls/wildcard` | `cert`, `key`, `chain` | Auto (90 days) | Infra | *.delqhi.com |
| `secret/certificates/ca/internal` | `cert`, `key` | 365 days | Security | Internal CA |

### Category 5: Development Secrets

| Secret Path | Fields | Rotation | Owner | Usage |
|-------------|--------|----------|-------|-------|
| `secret/dev/database` | `username`, `password` | 90 days | DevOps | Dev environment |
| `secret/dev/api-keys` | `test_keys` | 90 days | DevOps | Testing |
| `secret/dev/stripe` | `test_key`, `webhook_secret` | 180 days | DevOps | Payment testing |

### Category 6: Monitoring & Alerting

| Secret Path | Fields | Rotation | Owner | Usage |
|-------------|--------|----------|-------|-------|
| `secret/monitoring/grafana` | `admin_password`, `secret_key` | 180 days | DevOps | Grafana |
| `secret/monitoring/alertmanager` | `slack_webhook`, `pagerduty_key` | 180 days | DevOps | Alerting |
| `secret/monitoring/datadog` | `api_key`, `app_key` | 180 days | DevOps | APM (optional) |
| `secret/monitoring/sentry` | `dsn`, `auth_token` | 180 days | DevOps | Error tracking |

---

## 🔄 Rotation Schedule

### Monthly Rotations

| Day | Secrets | Owner |
|-----|---------|-------|
| 1st | TLS certificates (if expiring) | Infra |
| 15th | Database credentials | DBA |

### Quarterly Rotations

| Month | Secrets | Owner |
|-------|---------|-------|
| Jan, Apr, Jul, Oct | Service API keys | DevOps |
| Jan, Apr, Jul, Oct | External AI keys | AI Team |
| Feb, May, Aug, Nov | Cloudflare tokens | Infra |
| Mar, Jun, Sep, Dec | JWT signing keys | DevOps |

### Annual Rotations

| Month | Secrets | Owner |
|-------|---------|-------|
| January | Internal CA certificates | Security |
| January | Master encryption keys | Security |

---

## 🔍 Secret Access Patterns

### Service Access Matrix

| Service | Secrets Accessed | Method |
|---------|-----------------|--------|
| **api-brain** | `secret/services/api-brain`, `secret/infrastructure/postgres`, `secret/infrastructure/redis` | AppRole |
| **n8n** | `secret/services/n8n`, `secret/infrastructure/postgres`, `secret/infrastructure/redis` | AppRole |
| **vault-api** | `secret/infrastructure/*`, `secret/services/*` | Token |
| **captcha-worker** | `secret/services/captcha`, `secret/external/*` | AppRole |
| **survey-worker** | `secret/services/survey`, `secret/services/captcha` | AppRole |
| **scira** | `secret/services/scira`, `secret/external/*` | AppRole |
| **grafana** | `secret/monitoring/grafana` | Environment |
| **cloudflared** | `secret/infrastructure/cloudflare` | Environment |

### User Access Matrix

| Role | Secrets Access | Method |
|------|---------------|--------|
| **Admin** | All secrets | Token + MFA |
| **Developer** | `secret/dev/*`, `secret/services/*` (read-only) | Token |
| **Operator** | `secret/infrastructure/*` (read-only) | Token |
| **AI Engineer** | `secret/external/*`, `secret/services/*` (relevant) | Token |
| **Auditor** | All secrets (read-only, audit logs) | Token |

---

## 📝 Secret Metadata

Each secret in Vault includes the following metadata:

```json
{
  "created_time": "2026-01-30T10:30:00Z",
  "custom_metadata": {
    "owner": "security-team@sin-solver.com",
    "rotation_schedule": "90 days",
    "last_rotation": "2026-01-30T10:30:00Z",
    "next_rotation": "2026-04-30T10:30:00Z",
    "tier": "1",
    "services": ["api-brain", "n8n"],
    "description": "Database credentials for PostgreSQL"
  },
  "deletion_time": "",
  "destroyed": false,
  "version": 1
}
```

---

## 🚨 Emergency Contacts

For secret-related emergencies:

| Role | Contact | Responsibility |
|------|---------|----------------|
| **Security Lead** | security@sin-solver.com | Secret compromise response |
| **Vault Admin** | vault-admin@sin-solver.com | Vault unseal, recovery |
| **On-Call Engineer** | oncall@sin-solver.com | Service restoration |
| **CISO** | ciso@sin-solver.com | Policy decisions |

---

## 📊 Inventory Statistics

| Metric | Count |
|--------|-------|
| **Total Secret Paths** | 45+ |
| **Infrastructure Secrets** | 4 |
| **Service Secrets** | 10 |
| **External API Keys** | 10+ |
| **Certificates** | 5 |
| **Development Secrets** | 3 |
| **Monitoring Secrets** | 4 |
| **Total Fields** | 150+ |

---

## 📝 Document Information

| Attribute | Value |
|-----------|-------|
| **Document ID** | SEC-SECRETS-INVENTORY |
| **Version** | 1.0.0 |
| **Classification** | CONFIDENTIAL |
| **Author** | SIN-Solver Security Team |
| **Created** | 2026-01-30 |
| **Last Updated** | 2026-01-30 |
| **Review Cycle** | Monthly |
| **Next Review** | 2026-02-28 |

---

**⚠️ IMPORTANT REMINDER:**
- This document contains NO actual secret values
- All secrets are stored in HashiCorp Vault only
- Never commit secrets to Git
- Never share secrets via email or chat
- Rotate secrets according to schedule
- Report any suspected compromise immediately

---

*For access to actual secrets, contact the Security Team.*

*For additional security documentation, see the 26-Pillar Security Documentation Index.*
