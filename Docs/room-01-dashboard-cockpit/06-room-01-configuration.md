# Room-01 Dashboard Cockpit - Configuration

## Configuration Guide

This document describes all configuration options available for the Room-01 Dashboard Cockpit.

---

## Configuration Files

### Environment Variables

The dashboard uses environment variables for configuration. Create a `.env` file in the project root:

```bash
# Copy example file
cp .env.example .env

# Edit configuration
nano .env
```

### Configuration Hierarchy

Configuration is loaded in this order (later overrides earlier):

1. Default values in code
2. `.env` file
3. Environment variables
4. Runtime configuration API

---

## Core Configuration

### Server Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3011` | HTTP server port |
| `HOST` | `0.0.0.0` | Server bind address |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |

```bash
# Production example
PORT=3011
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=warn
```

### Docker Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Path to Docker socket |
| `DOCKER_HOST` | - | Docker daemon host (alternative to socket) |
| `DOCKER_TLS_VERIFY` | `0` | Enable TLS verification |
| `DOCKER_CERT_PATH` | - | Path to TLS certificates |

```bash
# Unix socket (default)
DOCKER_SOCKET=/var/run/docker.sock

# TCP connection (remote Docker)
DOCKER_HOST=tcp://192.168.1.100:2376
DOCKER_TLS_VERIFY=1
DOCKER_CERT_PATH=/certs
```

### Database Configuration

#### Redis

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `REDIS_PASSWORD` | - | Redis password |
| `REDIS_DB` | `0` | Redis database number |

```bash
# Local Redis
REDIS_URL=redis://localhost:6379

# With authentication
REDIS_URL=redis://:password@localhost:6379/0

# Sentinel configuration
REDIS_SENTINEL_HOSTS=sentinel1:26379,sentinel2:26379
REDIS_SENTINEL_MASTER=mymaster
```

#### PostgreSQL

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | - | PostgreSQL connection string |
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `5432` | Database port |
| `DB_NAME` | `dashboard` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | - | Database password |

```bash
# Connection string (recommended)
DATABASE_URL=postgresql://user:password@localhost:5432/dashboard

# Individual parameters
DB_HOST=room-03-postgres-master
DB_PORT=5432
DB_NAME=dashboard
DB_USER=dashboard
DB_PASSWORD=secure_password
```

### API Integration

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BRAIN_URL` | - | URL to API Brain (room-13) |
| `VAULT_URL` | - | URL to Vault service (room-02) |
| `N8N_URL` | - | URL to n8n instance |
| `STEEL_URL` | - | URL to Steel Browser |
| `SKYVERN_URL` | - | URL to Skyvern |

```bash
# Internal Docker network URLs
API_BRAIN_URL=http://room-13-vault-api:8000
VAULT_URL=http://room-02-tresor-secrets:8200
N8N_URL=http://agent-01-n8n-manager:5678
STEEL_URL=http://agent-05-steel-browser:3000
SKYVERN_URL=http://agent-06-skyvern-solver:8000

# External URLs (via Cloudflare)
API_BRAIN_URL=https://api.delqhi.com
N8N_URL=https://n8n.delqhi.com
```

---

## Authentication Configuration

### JWT Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | - | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | `24h` | JWT token expiration |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token expiration |

```bash
# Generate secure secret
# openssl rand -base64 32
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

### OAuth Providers

#### Google OAuth

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL |

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://dashboard.delqhi.com/api/auth/google/callback
```

#### GitHub OAuth

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth app ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app secret |
| `GITHUB_CALLBACK_URL` | OAuth callback URL |

```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=https://dashboard.delqhi.com/api/auth/github/callback
```

---

## Feature Configuration

### Container Monitoring

| Variable | Default | Description |
|----------|---------|-------------|
| `POLLING_INTERVAL` | `5000` | Container status poll interval (ms) |
| `STATS_INTERVAL` | `2000` | Stats update interval (ms) |
| `LOGS_TAIL_LINES` | `100` | Default number of log lines to fetch |
| `LOGS_MAX_LINES` | `10000` | Maximum log lines to keep in memory |

```bash
# High-frequency monitoring (more resource intensive)
POLLING_INTERVAL=2000
STATS_INTERVAL=1000

# Low-frequency monitoring (resource efficient)
POLLING_INTERVAL=30000
STATS_INTERVAL=10000
```

### Caching Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_ENABLED` | `true` | Enable Redis caching |
| `CACHE_TTL` | `10` | Default cache TTL (seconds) |
| `CACHE_CONTAINER_TTL` | `5` | Container stats cache TTL |
| `CACHE_LOGS_TTL` | `60` | Logs cache TTL |

```bash
CACHE_ENABLED=true
CACHE_TTL=10
CACHE_CONTAINER_TTL=5
CACHE_LOGS_TTL=60
```

### Log Streaming

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_STREAM_BUFFER_SIZE` | `1000` | Log buffer size |
| `LOG_STREAM_HEARTBEAT` | `30000` | SSE heartbeat interval (ms) |
| `LOG_STREAM_MAX_CONNECTIONS` | `10` | Max concurrent log streams per user |

```bash
LOG_STREAM_BUFFER_SIZE=1000
LOG_STREAM_HEARTBEAT=30000
LOG_STREAM_MAX_CONNECTIONS=10
```

---

## Security Configuration

### CORS Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ENABLED` | `true` | Enable CORS |
| `CORS_ORIGIN` | `*` | Allowed origins (comma-separated) |
| `CORS_METHODS` | `GET,POST,PUT,DELETE` | Allowed HTTP methods |
| `CORS_CREDENTIALS` | `true` | Allow credentials |

```bash
# Development (allow all)
CORS_ENABLED=true
CORS_ORIGIN=*

# Production (specific origins)
CORS_ENABLED=true
CORS_ORIGIN=https://dashboard.delqhi.com,https://admin.delqhi.com
CORS_METHODS=GET,POST,PUT,DELETE
CORS_CREDENTIALS=true
```

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `RATE_LIMIT_WINDOW` | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `RATE_LIMIT_STREAM_MAX` | `5` | Max concurrent streams per user |

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
RATE_LIMIT_STREAM_MAX=5
```

### File Access

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCS_PATH` | `/app/docs` | Path to documentation files |
| `ALLOWED_FILES` | `AGENTS.md,lastchanges.md` | Whitelist of accessible files |

```bash
DOCS_PATH=/app/docs
ALLOWED_FILES=AGENTS.md,lastchanges.md,userprompts.md,README.md
```

---

## UI Configuration

### Theme Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_THEME` | `dark` | Default theme (dark/light) |
| `THEME_STORAGE` | `localStorage` | Where to store theme preference |

```bash
DEFAULT_THEME=dark
THEME_STORAGE=localStorage
```

### Layout Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SIDEBAR_COLLAPSED` | `false` | Start with collapsed sidebar |
| `SIDEBAR_WIDTH` | `280` | Sidebar width in pixels |
| `LOGS_AUTO_SCROLL` | `true` | Auto-scroll logs to bottom |

```bash
SIDEBAR_COLLAPSED=false
SIDEBAR_WIDTH=280
LOGS_AUTO_SCROLL=true
```

---

## Docker Compose Configuration

### Full Example

```yaml
version: '3.8'

services:
  room-01-dashboard:
    build: .
    container_name: room-01-dashboard-cockpit
    hostname: room-01-dashboard-cockpit
    
    ports:
      - "${PORT:-3011}:3011"
    
    volumes:
      # Docker socket for container management
      - /var/run/docker.sock:/var/run/docker.sock:ro
      
      # Documentation files
      - ./docs:/app/docs:ro
      
      # Logs directory
      - ./logs:/app/logs
      
      # TLS certificates (if using TLS)
      - ./certs:/certs:ro
    
    environment:
      # Server
      - PORT=${PORT:-3011}
      - NODE_ENV=${NODE_ENV:-production}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      
      # Docker
      - DOCKER_SOCKET=${DOCKER_SOCKET:-/var/run/docker.sock}
      
      # Database
      - REDIS_URL=${REDIS_URL:-redis://room-04-redis:6379}
      - DATABASE_URL=${DATABASE_URL}
      
      # API Integration
      - API_BRAIN_URL=${API_BRAIN_URL}
      - VAULT_URL=${VAULT_URL}
      
      # Authentication
      - JWT_SECRET=${JWT_SECRET}
      
      # Features
      - POLLING_INTERVAL=${POLLING_INTERVAL:-5000}
      - CACHE_ENABLED=${CACHE_ENABLED:-true}
      
      # Security
      - CORS_ORIGIN=${CORS_ORIGIN}
      - RATE_LIMIT_ENABLED=${RATE_LIMIT_ENABLED:-true}
    
    networks:
      - delqhi-platform
    
    depends_on:
      - room-04-redis
      - room-03-postgres
    
    restart: unless-stopped
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3011/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

networks:
  delqhi-platform:
    external: true
```

---

## Runtime Configuration

### Configuration API

Some settings can be changed at runtime via the API:

```bash
# Get current configuration
curl http://localhost:3011/api/config \
  -H "Authorization: Bearer <token>"

# Update configuration
curl -X POST http://localhost:3011/api/config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "pollingInterval": 10000,
    "theme": "light"
  }'
```

### Configuration Persistence

Runtime configuration is stored in:
- **Redis**: For shared state across instances
- **PostgreSQL**: For persistent settings
- **Browser**: For user preferences (localStorage)

---

## Environment-Specific Configuration

### Development

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
POLLING_INTERVAL=2000
CACHE_ENABLED=false
CORS_ORIGIN=*
```

### Staging

```bash
# .env.staging
NODE_ENV=production
LOG_LEVEL=info
API_BRAIN_URL=https://api-staging.delqhi.com
CORS_ORIGIN=https://dashboard-staging.delqhi.com
```

### Production

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=warn
POLLING_INTERVAL=10000
CACHE_ENABLED=true
CORS_ORIGIN=https://dashboard.delqhi.com
RATE_LIMIT_ENABLED=true
```

---

## Secrets Management

### Using Docker Secrets

```yaml
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  db_password:
    file: ./secrets/db_password.txt

services:
  room-01-dashboard:
    secrets:
      - jwt_secret
      - db_password
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - DB_PASSWORD_FILE=/run/secrets/db_password
```

### Using Vault

```bash
# Configure Vault integration
VAULT_URL=http://room-02-tresor-secrets:8200
VAULT_TOKEN=s.token
VAULT_PATH=secret/dashboard
```

---

## Configuration Validation

The dashboard validates configuration on startup:

```
✓ Server configuration valid
✓ Docker socket accessible
✓ Redis connection successful
✓ Database connection successful
✓ API Brain reachable
⚠ JWT_SECRET using default value (not recommended for production)
```

### Required Variables

These variables must be set for the dashboard to start:

- `JWT_SECRET` (production only)
- `DATABASE_URL` (if using Postgres features)

### Optional Variables

These have sensible defaults but can be customized:

- `PORT`
- `POLLING_INTERVAL`
- `CACHE_TTL`
- `LOG_LEVEL`

---

## Troubleshooting Configuration

### Common Issues

**Issue: "DOCKER_SOCKET not found"**
```bash
# Verify socket exists
ls -la /var/run/docker.sock

# Check Docker is running
systemctl status docker
```

**Issue: "Redis connection failed"**
```bash
# Test Redis connection
redis-cli -h room-04-redis ping

# Check Redis URL format
REDIS_URL=redis://host:port
```

**Issue: "CORS errors in browser"**
```bash
# Verify CORS origin matches your domain
CORS_ORIGIN=https://your-domain.com
```

---

## Related Documentation

- [04-architecture.md](./04-room-01-architecture.md) - System architecture
- [05-api-reference.md](./05-room-01-api-reference.md) - API documentation
- [07-deployment.md](./07-room-01-deployment.md) - Deployment guide
- [03-troubleshooting.md](./03-room-01-troubleshooting.md) - Troubleshooting
