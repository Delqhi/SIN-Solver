# Room 13: Delqhi Network - Social Media Platform

## 🌟 Overview

**"The Social Nexus"**

Room 13 is the complete social media platform infrastructure for the Delqhi Network. It provides a modern, scalable architecture for building and managing social media applications with AI-powered features, real-time search, and seamless API integration.

### Architecture Components

- **API** (`room-13-delqhi-api`) - Node.js REST API with PostgreSQL persistence
- **Frontend** (`room-13-delqhi-frontend`) - Next.js web application
- **MCP Server** (`room-13-delqhi-mcp`) - Model Context Protocol integration for AI features
- **Search Engine** (`room-13-delqhi-search`) - Meilisearch for fast, relevant search results

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│              Delqhi Network Platform                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐         ┌──────────────┐        │
│  │  Frontend    │◄────────┤  API Server  │        │
│  │ (Next.js)    │         │  (Node.js)   │        │
│  │ 172.20.0.131 │         │ 172.20.0.130 │        │
│  │ Port 3000    │         │  Port 3000   │        │
│  └──────────────┘         └──────┬───────┘        │
│                                  │                 │
│        ┌────────────────────────┼─────────────┐   │
│        │                        │             │   │
│   ┌────▼─────┐          ┌──────▼────┐   ┌───▼──┐ │
│   │PostgreSQL│          │  Redis    │   │ MCP  │ │
│   │ Storage  │          │  Cache    │   │ 172. │ │
│   │ 172.20.  │          │ 172.20.   │   │0.132 │ │
│   │ 0.100    │          │ 0.104     │   │ Port │ │
│   └──────────┘          └───────────┘   │ 8213 │ │
│                                         │      │ │
│        ┌─────────────────────────────────┤      │ │
│        │                                 │      │ │
│        │                        ┌────────▼──┐   │ │
│        │                        │Meilisearch│   │ │
│        │                        │ Search    │   │ │
│        │                        │ 172.20.   │   │ │
│        │                        │ 0.133     │   │ │
│        │                        │ Port 7700 │   │ │
│        │                        └───────────┘   │ │
│        │                                        │ │
│        └────────────────────────────────────────┘ │
│                                                    │
└─────────────────────────────────────────────────────┘
```

## 🔌 Service Details

### room-13-delqhi-api

**REST API Server** - The core backend service

- **Image:** `sin-delqhi-api:latest`
- **Internal IP:** `172.20.0.130`
- **Internal Port:** `3000`
- **External Port:** `8130`
- **Container Name:** `room-13-delqhi-api`
- **Build Context:** `./api`

**Dependencies:**
- `room-03-postgres-master:5432` - PostgreSQL database
- `room-04-redis-cache:6379` - Redis cache & session store

**Key Environment Variables:**
```
DATABASE_URL=postgresql://sin_admin:password@room-03-postgres-master:5432/sin_solver
REDIS_URL=redis://room-04-redis-cache:6379/0
JWT_SECRET=your-secret-key
API_DOMAIN=localhost:8130
FRONTEND_URL=http://localhost:3130
```

**Health Check:** `GET /health` returns 200 OK

### room-13-delqhi-frontend

**Next.js Web Application** - User-facing interface

- **Image:** `sin-delqhi-frontend:latest`
- **Internal IP:** `172.20.0.131`
- **Internal Port:** `3000`
- **External Port:** `3130`
- **Container Name:** `room-13-delqhi-frontend`
- **Build Context:** `./frontend`

**Dependencies:**
- `room-13-delqhi-api` - Backend API

**Key Environment Variables:**
```
NEXT_PUBLIC_API_URL=http://room-13-delqhi-api:3000
NEXT_PUBLIC_API_EXTERNAL_URL=http://localhost:8130
NEXT_PUBLIC_SITE_URL=http://localhost:3130
```

**Health Check:** `GET /` returns 200 OK

### room-13-delqhi-mcp

**Model Context Protocol Server** - AI integration layer

- **Image:** `sin-delqhi-mcp:latest`
- **Internal IP:** `172.20.0.132`
- **Internal Port:** `8213`
- **External Port:** `8213`
- **Container Name:** `room-13-delqhi-mcp`
- **Build Context:** `./mcp`

**Dependencies:**
- `room-13-delqhi-api` - Backend API
- `room-13-delqhi-search` - Meilisearch

**Key Environment Variables:**
```
API_BASE_URL=http://room-13-delqhi-api:3000
MCP_API_KEY=your-mcp-key
MEILISEARCH_URL=http://room-13-delqhi-search:7700
```

**Health Check:** `GET /health` returns 200 OK

### room-13-delqhi-search

**Meilisearch Engine** - Full-text search service

- **Image:** `getmeili/meilisearch:v1.6`
- **Internal IP:** `172.20.0.133`
- **Internal Port:** `7700`
- **External Port:** `7700`
- **Container Name:** `room-13-delqhi-search`

**Persistence:**
- Volume: `meilisearch_data:/meili_data`

**Key Environment Variables:**
```
MEILI_MASTER_KEY=your-master-key
MEILI_ENV=production
```

**Health Check:** `GET /health` returns 200 OK

## 🚀 Quick Start

### 1. Prerequisites

Ensure external network exists:
```bash
docker network create --driver bridge --subnet=172.20.0.0/16 haus-netzwerk
```

Ensure dependencies are running:
```bash
# Room 3 (PostgreSQL)
cd ../room-03-postgres && docker compose up -d

# Room 4 (Redis)
cd ../room-04-redis && docker compose up -d
```

### 2. Setup Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit with your values
vim .env
```

### 3. Build Services

```bash
# Build all images
docker compose build

# Or build specific service
docker compose build room-13-delqhi-api
```

### 4. Start Services

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker compose ps
```

### 5. Verify Installation

```bash
# Check API health
curl http://localhost:8130/health

# Check Frontend
curl http://localhost:3130

# Check Search Engine
curl http://localhost:7700/health

# Check MCP Server
curl http://localhost:8213/health
```

## 📝 Configuration

### Environment Variables

All configuration is managed via `.env` file (copied from `.env.example`).

**Critical Variables:**
- `JWT_SECRET` - Must be at least 32 characters for production
- `MEILISEARCH_MASTER_KEY` - Master key for search engine
- `MCP_API_KEY` - API key for MCP server

**Service URLs (Internal):**
- API: `http://room-13-delqhi-api:3000`
- Frontend: `http://room-13-delqhi-frontend:3000`
- Search: `http://room-13-delqhi-search:7700`
- MCP: `http://room-13-delqhi-mcp:8213`

**Database Connection (from containers):**
- PostgreSQL: `room-03-postgres-master:5432`
- Redis: `room-04-redis-cache:6379`

### Volumes

| Volume | Path | Purpose |
|--------|------|---------|
| `meilisearch_data` | `/meili_data` | Meilisearch indexes and data |

### Networks

- **Network:** `haus-netzwerk` (external)
- **Subnet:** `172.20.0.0/16`
- **IP Range (Room 13):** `172.20.0.130-139`

## 🔧 Development

### Building Images Locally

```bash
# Build API
docker build -t sin-delqhi-api:latest ./api

# Build Frontend
docker build -t sin-delqhi-frontend:latest ./frontend

# Build MCP
docker build -t sin-delqhi-mcp:latest ./mcp
```

### Running in Development

```bash
# Start without building
docker compose up -d

# Rebuild and start
docker compose up -d --build

# Start specific service
docker compose up -d room-13-delqhi-api
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f room-13-delqhi-api

# Last 100 lines
docker compose logs --tail=100 room-13-delqhi-api
```

### Executing Commands in Container

```bash
# API container shell
docker compose exec room-13-delqhi-api sh

# Frontend container shell
docker compose exec room-13-delqhi-frontend sh

# MCP container shell
docker compose exec room-13-delqhi-mcp sh

# Database migrations
docker compose exec room-13-delqhi-api npm run migrate
```

## 📊 Monitoring & Debugging

### Container Status

```bash
# List all containers
docker compose ps

# Detailed stats
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Resource usage
docker stats
```

### Health Checks

```bash
# API Health
curl -v http://localhost:8130/health

# Frontend Status
curl -v http://localhost:3130

# Search Health
curl -v http://localhost:7700/health

# MCP Health
curl -v http://localhost:8213/health
```

### Database Connection

```bash
# Connect to PostgreSQL
psql -h localhost -U sin_admin -d sin_solver

# From container
docker compose exec room-13-delqhi-api psql -h room-03-postgres-master -U sin_admin -d sin_solver
```

### Redis Connection

```bash
# Interactive
docker compose exec room-04-redis-cache redis-cli

# From API container
docker compose exec room-13-delqhi-api redis-cli -h room-04-redis-cache
```

## 🛑 Stopping & Cleanup

### Stop Services

```bash
# Stop all (keep volumes)
docker compose down

# Remove images too
docker compose down --rmi local

# Remove everything (including volumes)
docker compose down -v
```

### Cleanup Volumes

```bash
# Remove specific volume
docker volume rm meilisearch_data

# Remove all unused volumes
docker volume prune
```

## 🔗 Integration with Other Rooms

### Room 03 (PostgreSQL)
- Service: `room-03-postgres-master`
- Connection: `postgresql://sin_admin:password@room-03-postgres-master:5432/sin_solver`
- Used by: API, MCP

### Room 04 (Redis)
- Service: `room-04-redis-cache`
- Connection: `redis://room-04-redis-cache:6379/0`
- Used by: API

### Network Communication

All services communicate via service names on the `haus-netzwerk` network:
```
room-13-delqhi-api → room-03-postgres-master
room-13-delqhi-api → room-04-redis-cache
room-13-delqhi-mcp → room-13-delqhi-api
room-13-delqhi-frontend → room-13-delqhi-api
```

## 📂 Directory Structure

```
room-13-delqhi-network/
├── docker-compose.yml      # Service definitions
├── .env.example            # Environment template
├── README.md               # This file
│
├── api/                    # API Service
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│
├── frontend/               # Next.js Frontend
│   ├── Dockerfile
│   ├── package.json
│   └── pages/
│
├── mcp/                    # MCP Server
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│
├── migrations/             # Database migrations
│   └── *.sql
│
└── Docs/                   # 26-Pillar Documentation
    ├── 01-overview.md
    ├── 02-lastchanges.md
    ├── 03-troubleshooting.md
    └── ...
```

## 🐛 Troubleshooting

### Services Won't Start

**Check Docker daemon:**
```bash
docker ps
```

**Check logs:**
```bash
docker compose logs room-13-delqhi-api
```

**Common issues:**
- Network not created: `docker network create --driver bridge --subnet=172.20.0.0/16 haus-netzwerk`
- Port already in use: Change port mappings in docker-compose.yml
- Database not running: Start room-03-postgres first

### Database Connection Issues

```bash
# Test connection from API container
docker compose exec room-13-delqhi-api pg_isready -h room-03-postgres-master -p 5432

# Check environment variables
docker compose exec room-13-delqhi-api env | grep DATABASE
```

### API Health Check Failing

```bash
# Check API logs
docker compose logs -f room-13-delqhi-api

# Manually test endpoint
docker compose exec room-13-delqhi-api curl http://localhost:3000/health

# Check if port is open
docker compose exec room-13-delqhi-api sh
# Inside container:
netstat -tlnp | grep 3000
```

### Search Engine Issues

```bash
# Check Meilisearch logs
docker compose logs -f room-13-delqhi-search

# Test connection
curl -v http://localhost:7700/health

# Check indexes
curl -X GET http://localhost:7700/indexes
```

## 📚 Related Documentation

- **PostgreSQL (Room 03):** `/Users/jeremy/dev/sin-code/Docker/rooms/room-03-postgres/README.md`
- **Redis (Room 04):** `/Users/jeremy/dev/sin-code/Docker/rooms/room-04-redis/README.md`
- **Meilisearch Docs:** https://docs.meilisearch.com/
- **Next.js Docs:** https://nextjs.org/docs
- **Node.js API Best Practices:** https://nodejs.org/docs

## 📞 Support & Documentation

For issues or questions:
1. Check troubleshooting section above
2. Review logs: `docker compose logs`
3. Verify environment: `docker compose config`
4. Check network: `docker network inspect haus-netzwerk`

---

**Version:** 1.0.0  
**Last Updated:** 2026-01-27  
**Maintenance:** Regular health checks, log rotation, and volume management required
