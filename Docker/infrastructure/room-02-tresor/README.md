# 🔐 SIN-Solver Vault Secrets Management

## Overview

This directory contains the complete HashiCorp Vault setup for SIN-Solver, including:
- **HashiCorp Vault** container for secure secrets storage
- **Vault API Wrapper** (FastAPI) for easy REST access
- **Sync Scripts** for Vercel and n8n integration

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SIN-Solver Secrets Architecture                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │  Vault Server   │     │  Vault API      │     │  Sync Scripts   │   │
│  │  (port 8200)    │◄────│  Wrapper        │     │                 │   │
│  │                 │     │  (port 8201)    │     │  vault-to-*.sh  │   │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘   │
│           │                       │                       │             │
│           │              ┌────────┴────────┐              │             │
│           │              │  REST API       │              │             │
│           │              │  /secrets/*     │              │             │
│           │              │  /secrets/sync  │              │             │
│           │              └────────┬────────┘              │             │
│           │                       │                       │             │
│  ┌────────┴───────────────────────┴───────────────────────┴───────┐    │
│  │                      Secret Consumers                          │    │
│  ├────────────────────────────────────────────────────────────────┤    │
│  │  PostgreSQL  │  Redis  │  n8n  │  Vercel  │  Agents  │  APIs  │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Start Vault Services

```bash
cd /Users/jeremy/dev/SIN-Solver/Docker/infrastructure/room-02-tresor

# Start all services (Vault + API Wrapper)
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 2. Initialize Secrets

After Vault starts, initialize all secrets via the API:

```bash
# Initialize all secrets from environment
curl -X POST http://localhost:8201/secrets/init

# Or manually add a secret
curl -X POST http://localhost:8201/secrets/postgres \
  -H "Content-Type: application/json" \
  -d '{"data": {"host": "room-03-postgres-master", "password": "secret"}}'
```

### 3. Sync to External Services

```bash
# Sync to Vercel
./vault-to-vercel.sh production

# Sync to n8n
./vault-to-n8n.sh
```

## Services

### room-02-tresor-vault (Port 8200)

HashiCorp Vault server running in dev mode with:
- **Root Token:** `s.root2026SINSolver`
- **KV v2 Engine:** Mounted at `sin-solver/`
- **Dev Mode:** Auto-unsealed, data persisted in volume

**Direct Access:**
```bash
# Using vault CLI
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=s.root2026SINSolver

vault kv get sin-solver/postgres
vault kv put sin-solver/redis password=newsecret
```

### room-02-tresor-api (Port 8201)

FastAPI REST wrapper for simplified access:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Detailed health |
| `/secrets` | GET | List all secrets |
| `/secrets/{path}` | GET | Read secret |
| `/secrets/{path}` | POST | Create/update secret |
| `/secrets/{path}` | DELETE | Delete secret |
| `/secrets/init` | POST | Initialize all secrets |
| `/secrets/sync/vercel` | POST | Sync to Vercel |
| `/secrets/sync/n8n` | POST | Sync to n8n |
| `/secrets/sync/all` | POST | Sync to all destinations |

## Secret Paths

All secrets are stored under the `sin-solver/` KV v2 mount:

| Path | Keys | Description |
|------|------|-------------|
| `sin-solver/postgres` | host, port, username, password, database | PostgreSQL credentials |
| `sin-solver/redis` | host, port, password | Redis credentials |
| `sin-solver/n8n` | encryption_key, jwt_secret, host | n8n security keys |
| `sin-solver/opencode` | api_key, base_url | OpenCode API |
| `sin-solver/vercel` | token, project_id, team_id | Vercel deployment |
| `sin-solver/github` | token, repo | GitHub access |
| `sin-solver/codeserver` | api_url, api_key | CodeServer API |

## API Usage Examples

### Read a Secret

```bash
# Get PostgreSQL credentials
curl http://localhost:8201/secrets/postgres

# Response:
{
  "path": "postgres",
  "data": {
    "host": "room-03-postgres-master",
    "port": "5432",
    "username": "postgres",
    "password": "secret",
    "database": "sin_solver"
  },
  "metadata": { ... }
}
```

### Store a Secret

```bash
# Store new secret
curl -X POST http://localhost:8201/secrets/myapp \
  -H "Content-Type: application/json" \
  -d '{"data": {"api_key": "abc123", "secret": "xyz789"}}'
```

### List Secrets

```bash
curl http://localhost:8201/secrets

# Response:
{
  "paths": ["postgres/", "redis/", "n8n/", "opencode/", ...],
  "count": 7
}
```

### Sync to Vercel

```bash
# Sync all secrets to Vercel production environment
curl -X POST "http://localhost:8201/secrets/sync/vercel?target=production"

# Response:
{
  "success": true,
  "synced_secrets": ["POSTGRES_HOST", "POSTGRES_PASSWORD", ...],
  "failed_secrets": [],
  "message": "Synced 12 secrets to Vercel (production)"
}
```

### Sync to n8n

```bash
curl -X POST http://localhost:8201/secrets/sync/n8n

# Response:
{
  "success": true,
  "synced_secrets": ["postgres", "redis"],
  "failed_secrets": [],
  "message": "Synced 2 credentials to n8n"
}
```

## Environment Variables

### Required for Vault Container

| Variable | Default | Description |
|----------|---------|-------------|
| `VAULT_DEV_ROOT_TOKEN_ID` | `s.root2026SINSolver` | Root token for Vault |
| `VAULT_PORT` | `8200` | Vault server port |
| `VAULT_LOG_LEVEL` | `info` | Log verbosity |

### Required for API Wrapper

| Variable | Description |
|----------|-------------|
| `VAULT_ADDR` | Vault server URL |
| `VAULT_TOKEN` | Vault authentication token |
| `POSTGRES_PASSWORD` | PostgreSQL password (for init) |
| `REDIS_PASSWORD` | Redis password (for init) |
| `N8N_ENCRYPTION_KEY` | n8n encryption key |
| `VERCEL_TOKEN` | Vercel API token (for sync) |
| `VERCEL_PROJECT_ID` | Vercel project ID (for sync) |

## Sync Scripts

### vault-to-vercel.sh

Syncs Vault secrets to Vercel environment variables:

```bash
# Usage
./vault-to-vercel.sh [environment]

# Examples
./vault-to-vercel.sh production   # Default
./vault-to-vercel.sh preview
./vault-to-vercel.sh development
```

**Mapping:**
- `sin-solver/postgres/*` → `POSTGRES_*`
- `sin-solver/redis/*` → `REDIS_*`
- `sin-solver/opencode/*` → `OPENCODE_*`
- `sin-solver/vercel/NEXT_PUBLIC_*` → `NEXT_PUBLIC_*`

### vault-to-n8n.sh

Syncs Vault secrets to n8n credentials:

```bash
./vault-to-n8n.sh
```

**Creates n8n Credentials:**
- `SIN-Solver PostgreSQL` (postgres type)
- `SIN-Solver Redis` (redis type)
- `SIN-Solver OpenCode API` (httpHeaderAuth type)
- `SIN-Solver GitHub` (githubApi type)

## Security Considerations

### Development Mode Warning

⚠️ **IMPORTANT:** Vault runs in development mode by default:
- Auto-unsealed on startup
- Data stored in-memory (with volume persistence)
- Suitable for development, NOT for production

### Production Recommendations

For production deployment:

1. **Use Vault Server Mode:**
   ```yaml
   command: server  # Instead of server -dev
   ```

2. **Configure Proper Storage Backend:**
   ```hcl
   storage "consul" { ... }
   # or
   storage "file" { path = "/vault/data" }
   ```

3. **Enable TLS:**
   ```yaml
   environment:
     VAULT_API_ADDR: https://vault:8200
   ```

4. **Implement Proper Authentication:**
   - Use AppRole for service authentication
   - Use JWT/OIDC for user authentication

5. **Set Up Access Policies:**
   ```hcl
   path "sin-solver/data/postgres" {
     capabilities = ["read"]
   }
   ```

## Troubleshooting

### Vault Not Starting

```bash
# Check logs
docker-compose logs room-02-tresor-vault

# Verify network
docker network ls | grep sin-solver
```

### API Wrapper Can't Connect

```bash
# Check if Vault is healthy
curl http://localhost:8200/v1/sys/health

# Verify token
curl -H "X-Vault-Token: s.root2026SINSolver" \
  http://localhost:8200/v1/sys/health
```

### Sync Script Failures

```bash
# Check environment variables
echo $VERCEL_TOKEN
echo $VERCEL_PROJECT_ID

# Test Vercel API directly
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v10/projects
```

## Files in This Directory

```
room-02-tresor/
├── docker-compose.yml          # Service definitions
├── .env                        # Live secrets (DO NOT COMMIT)
├── .env.example               # Template for secrets
├── init-vault.sh              # Vault initialization script
├── vault-to-vercel.sh         # Vercel sync script
├── vault-to-n8n.sh            # n8n sync script
├── README.md                  # This documentation
└── vault-api-wrapper/         # FastAPI wrapper service
    ├── Dockerfile
    ├── requirements.txt
    └── main.py
```

## Integration with Other Services

### From Dashboard (room-01)

```typescript
const response = await fetch('http://room-02-tresor-api:8201/secrets/postgres');
const { data } = await response.json();
// Use data.host, data.password, etc.
```

### From n8n Workflows

Use the HTTP Request node:
- **URL:** `http://room-02-tresor-api:8201/secrets/{path}`
- **Method:** GET
- **Authentication:** None (internal network)

### From Python Services

```python
import httpx

async def get_secret(path: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"http://room-02-tresor-api:8201/secrets/{path}")
        return response.json()["data"]
```

## Related Documentation

- [HashiCorp Vault Documentation](https://developer.hashicorp.com/vault/docs)
- [SIN-Solver Docker README](/Users/jeremy/dev/SIN-Solver/Docker/README.md)
- [AGENTS.md - Security Mandates](/Users/jeremy/dev/SIN-Solver/AGENTS.md)

---

**Version:** 1.0.0  
**Last Updated:** 2026-01-28  
**Compliance:** MANDATE 0.8 (Anti-Monolith), MANDATE 0.6 (Ticket-Based Troubleshooting)
