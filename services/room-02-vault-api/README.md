# Room-02: Vault API Integration Service

**Port:** 8002 | **IP:** 172.20.0.42 | **Container:** room-02-vault-api

Central secrets coordinator for the SIN-Solver empire. Manages secrets in HashiCorp Vault and syncs them to Vercel environments and n8n credentials automatically.

## 🎯 Purpose

This service provides a unified REST API for managing secrets across the entire SIN-Solver ecosystem:
- **Vault Operations** - Create, read, update, delete secrets in HashiCorp Vault
- **Vercel Sync** - Automatically sync secrets to Vercel environment variables (production, preview, development)
- **n8n Sync** - Automatically create and update n8n credentials for database connections and services
- **Agent Integration** - Simplified endpoint for agents to fetch their required secrets

## 🏗️ Architecture

### Core Components

1. **VaultClient** (`src/lib/vault-client.js`)
   - Handles all HashiCorp Vault operations
   - Read, write, update, delete secrets
   - List secrets recursively
   - Validate secret structure
   - Rotate secrets

2. **VercelSync** (`src/lib/vercel-sync.js`)
   - Syncs secrets to Vercel environment variables
   - Manages environment variable lifecycle
   - Supports production, preview, development environments
   - Handles encrypted values

3. **N8nSync** (`src/lib/n8n-sync.js`)
   - Creates n8n credentials from secrets
   - Manages credential lifecycle
   - Tests credential connectivity
   - Executes workflows with secret parameters

4. **REST API Routes**
   - `routes/secrets.js` - Secret CRUD operations
   - `routes/sync.js` - Sync trigger endpoints

## 📡 API Endpoints

### Health & Status

**GET /health** - Health check
```json
{
  "status": "active",
  "service": "sin-vault-api",
  "zimmer": "02-vault-api",
  "uptime": 3600,
  "vault": { "authenticated": true },
  "integrations": { "vercel": true, "n8n": true }
}
```

**GET /status** - Comprehensive system status
```json
{
  "timestamp": "2026-01-28T15:30:00Z",
  "vault": { "status": "healthy" },
  "vercel": { "status": "connected", "projectName": "sin-solver-dashboard" },
  "n8n": { "status": "connected", "user": "..." }
}
```

### Secret Management

**GET /api/secrets** - List all secret paths
```bash
curl http://localhost:8002/api/secrets?path=secret/
```

**GET /api/secrets/:path** - Get specific secret
```bash
curl http://localhost:8002/api/secrets/databases/postgres
```

**POST /api/secrets/:path** - Create/update secret
```bash
curl -X POST http://localhost:8002/api/secrets/databases/postgres \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "host": "postgres.example.com",
      "port": "5432",
      "username": "admin",
      "password": "secret123",
      "database": "sindb"
    },
    "sync": {
      "vercel": true,
      "vercelEnvs": ["production", "preview"],
      "n8n": true,
      "n8nCredType": "postgres"
    }
  }'
```

**PUT /api/secrets/:path** - Update specific secret values
```bash
curl -X PUT http://localhost:8002/api/secrets/databases/postgres \
  -H "Content-Type: application/json" \
  -d '{
    "updates": {
      "password": "newpassword123"
    },
    "sync": { "vercel": true, "n8n": false }
  }'
```

**DELETE /api/secrets/:path** - Delete secret
```bash
curl -X DELETE http://localhost:8002/api/secrets/databases/postgres \
  -H "X-Confirm-Deletion: true"
```

**POST /api/secrets/:path/rotate** - Rotate secret (create new version)
```bash
curl -X POST http://localhost:8002/api/secrets/databases/postgres/rotate \
  -H "Content-Type: application/json" \
  -d '{
    "newData": {
      "password": "rotated_password_123"
    }
  }'
```

**GET /api/secrets/:path/validate** - Validate secret structure
```bash
curl "http://localhost:8002/api/secrets/databases/postgres/validate?keys=host,port,username,password"
```

### Synchronization

**POST /api/sync/vercel** - Sync secrets to Vercel
```bash
curl -X POST http://localhost:8002/api/sync/vercel \
  -H "Content-Type: application/json" \
  -d '{
    "secrets": {
      "DATABASE_URL": "postgres://user:pass@host:5432/db",
      "API_KEY": "sk_live_1234567890"
    },
    "environments": ["production", "preview", "development"]
  }'
```

**POST /api/sync/n8n** - Sync credentials to n8n
```bash
curl -X POST http://localhost:8002/api/sync/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": [
      {
        "type": "postgres",
        "name": "main_database",
        "data": {
          "host": "localhost",
          "port": "5432",
          "user": "admin",
          "password": "secret",
          "database": "mydb"
        }
      }
    ]
  }'
```

**POST /api/sync/all** - Sync to all systems
```bash
curl -X POST http://localhost:8002/api/sync/all \
  -H "Content-Type: application/json" \
  -d '{
    "vaultPath": "secret/databases/postgres",
    "vercel": { "enabled": true, "environments": ["production"] },
    "n8n": { "enabled": true, "credType": "postgres", "credName": "main_db" }
  }'
```

**GET /api/sync/status** - Get sync status for all integrations
```bash
curl http://localhost:8002/api/sync/status
```

**GET /api/agent-secrets/:agentName** - Agent secret fetch endpoint
```bash
curl http://localhost:8002/api/agent-secrets/agent-06-skyvern
```

### Vercel Integration

**POST /api/sync/vercel-env/:envVar** - Sync single env var
```bash
curl -X POST http://localhost:8002/api/sync/vercel-env/DATABASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "value": "postgres://...",
    "environments": ["production"]
  }'
```

**GET /api/sync/vercel-env-vars** - List all Vercel env vars
```bash
curl http://localhost:8002/api/sync/vercel-env-vars
```

### n8n Integration

**POST /api/sync/n8n-credential** - Create n8n credential from Vault
```bash
curl -X POST http://localhost:8002/api/sync/n8n-credential \
  -H "Content-Type: application/json" \
  -d '{
    "vaultPath": "secret/databases/postgres",
    "credentialType": "postgres",
    "credentialName": "main_database"
  }'
```

**GET /api/sync/n8n-credentials** - List all n8n credentials
```bash
curl http://localhost:8002/api/sync/n8n-credentials
```

**POST /api/sync/n8n-test-credential** - Test credential connectivity
```bash
curl -X POST http://localhost:8002/api/sync/n8n-test-credential \
  -H "Content-Type: application/json" \
  -d '{ "credentialId": "cred_123" }'
```

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Copy environment template
cp src/.env.example .env

# Edit .env with your values
nano .env

# Start development server
npm run dev

# Server runs on http://localhost:8002
```

### Docker

```bash
# Build image
docker build -t room-02-vault-api .

# Run container
docker run -p 8002:8002 \
  -e VAULT_ADDR=http://room-02-tresor-vault:8200 \
  -e VAULT_TOKEN=s.root2026SINSolver \
  -e VERCEL_TOKEN=your_token \
  -e VERCEL_PROJECT_ID=your_project_id \
  -e N8N_API_KEY=your_key \
  room-02-vault-api

# Or use docker-compose
docker-compose up -d
```

## 📁 Project Structure

```
room-02-vault-api/
├── server.js                       # Express app entry point
├── package.json                    # Dependencies
├── Dockerfile                      # Docker image
├── docker-compose.yml              # Docker compose configuration
├── src/
│   ├── lib/
│   │   ├── vault-client.js        # Vault operations
│   │   ├── vercel-sync.js         # Vercel environment sync
│   │   └── n8n-sync.js            # n8n credential sync
│   ├── routes/
│   │   ├── secrets.js             # Secret CRUD routes
│   │   └── sync.js                # Sync trigger routes
│   └── .env.example               # Environment template
├── README.md                       # This file
└── tests/                          # Test suite (future)
```

## 🔐 Secret Structure Best Practices

### Database Secrets

```json
{
  "path": "secret/databases/postgres",
  "data": {
    "host": "postgres.internal.example.com",
    "port": "5432",
    "username": "app_user",
    "password": "secure_password_here",
    "database": "application_db",
    "ssl": "require"
  }
}
```

### Redis Secrets

```json
{
  "path": "secret/databases/redis",
  "data": {
    "host": "redis.internal.example.com",
    "port": "6379",
    "password": "redis_password",
    "db": "0",
    "ssl": "true"
  }
}
```

### API Key Secrets

```json
{
  "path": "secret/external-apis/sendgrid",
  "data": {
    "api_key": "SG.xxxxxxxxxxxxxxxxxxxx",
    "from_email": "noreply@example.com",
    "from_name": "SIN-Solver"
  }
}
```

### Service Credentials

```json
{
  "path": "secret/services/opencode",
  "data": {
    "api_key": "sk_live_xxxxxxxxxxxx",
    "base_url": "https://api.opencode.ai",
    "model": "antigravity-gemini-3-flash"
  }
}
```

### Agent Secrets

```json
{
  "path": "secret/agents/agent-06-skyvern",
  "data": {
    "workspace_id": "ws_xxxxxx",
    "api_key": "sk_xxxxxx",
    "environment": "production"
  }
}
```

## 🔗 Integration Examples

### Automatic Sync on Secret Creation

```javascript
// Create secret and sync to all systems
POST /api/secrets/databases/postgres
{
  "data": {
    "host": "db.example.com",
    "port": "5432",
    "username": "user",
    "password": "pass",
    "database": "mydb"
  },
  "sync": {
    "vercel": true,
    "vercelEnvs": ["production", "preview"],
    "n8n": true,
    "n8nCredType": "postgres"
  }
}
```

### Agent Fetching Secrets

Agents can fetch their required secrets:
```bash
# Agent fetches its own credentials
curl http://room-02-vault-api:8002/api/agent-secrets/agent-06-skyvern
```

### n8n Workflow Integration

n8n workflows can reference Vault secrets through synced credentials:
1. Secret is created in Vault at `secret/databases/postgres`
2. Service automatically creates n8n credential `postgres_cred`
3. n8n workflows use credential by name in database nodes

## 📊 Monitoring & Health Checks

The service includes comprehensive health checks:

```bash
# Check service health
curl http://localhost:8002/health

# Get detailed status including all integrations
curl http://localhost:8002/status

# Docker health check
docker exec room-02-vault-api curl -f http://localhost:8002/health
```

## 🛠️ Troubleshooting

### Vault Connection Failed

```bash
# Verify Vault is running
docker ps | grep vault

# Check Vault health
curl http://room-02-tresor-vault:8200/v1/sys/health

# Verify token in .env
echo $VAULT_TOKEN
```

### Vercel Sync Failed

```bash
# Verify Vercel token is valid
curl -H "Authorization: Bearer $VERCEL_TOKEN" https://api.vercel.com/v8/projects

# Check project ID exists
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v8/projects/$VERCEL_PROJECT_ID
```

### n8n Sync Failed

```bash
# Check n8n API endpoint
curl http://agent-01-n8n-orchestrator:5678/api/v1/me \
  -H "X-N8N-API-KEY: $N8N_API_KEY"

# Verify API key has access
# Log into n8n and generate new API key if needed
```

## 🔄 Workflow: Create Secret and Sync Everywhere

1. **Create secret in Vault**
   ```bash
   POST /api/secrets/databases/postgres
   ```

2. **Vercel automatically receives env var**
   - `DATABASE_URL` appears in Vercel dashboard

3. **n8n automatically receives credential**
   - Use in Postgres nodes without manual setup

4. **Agents fetch via dedicated endpoint**
   ```bash
   GET /api/agent-secrets/agent-06-skyvern
   ```

5. **Rotate whenever needed**
   ```bash
   POST /api/secrets/databases/postgres/rotate
   ```

## 📝 Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Required
VAULT_ADDR=http://room-02-tresor-vault:8200
VAULT_TOKEN=s.root2026SINSolver

# Optional (for Vercel sync)
VERCEL_TOKEN=vercel_xxxxxxxxxxxx
VERCEL_PROJECT_ID=xxxxxxxxxxxxxx

# Optional (for n8n sync)
N8N_API_URL=http://agent-01-n8n-orchestrator:5678
N8N_API_KEY=xxxxxxxxxxxx
```

## 🚢 Deployment

### Production Checklist

- [ ] All required environment variables set
- [ ] Vault is accessible and initialized
- [ ] Vercel token has project write permissions
- [ ] n8n API key has credential management permissions
- [ ] Docker network includes all dependent services
- [ ] Health checks pass on startup
- [ ] Logs are configured for production
- [ ] Backup strategy for Vault data is in place

### Container Naming Convention

Following V18.3 AGENTS.md mandate:
- Container name: `room-02-vault-api`
- Service name: `room-02-vault-api`
- Network: `sin_network` (172.20.0.0/16)
- Port: 8002

## 📚 References

- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [n8n API Documentation](https://docs.n8n.io/api/)
- [Project AGENTS.md](../../../AGENTS.md)

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review logs: `docker logs room-02-vault-api`
3. Verify connectivity: `/status` endpoint
4. Create ticket: `troubleshooting/ts-ticket-XX.md`

---

**Version:** 1.0.0 | **Status:** Production Ready | **Last Updated:** 2026-01-28
