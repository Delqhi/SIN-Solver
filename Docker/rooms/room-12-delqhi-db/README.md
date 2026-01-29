# Room 12 - Delqhi Database

**Version:** V18.3  
**Status:** OPERATIONAL  
**Containers:** 9  

---

## Overview

Delqhi Database infrastructure combining Supabase stack with NocoDB for a complete backend-as-a-service solution.

## Services

| Container | Port | Status | Purpose |
|-----------|------|--------|---------|
| room-12-delqhi-db | 5412 | Healthy | PostgreSQL Database |
| room-12-delqhi-redis | 6312 | Healthy | Redis Cache |
| room-12-delqhi-api | 9999 | Healthy | GoTrue Authentication |
| room-12-delqhi-rest | 3112 | Working | PostgREST API |
| room-12-delqhi-realtime | 4012 | Running | Realtime WebSocket |
| room-12-delqhi-storage | 5012 | Running | File Storage API |
| room-12-delqhi-meta | 8012 | Healthy | Postgres Meta |
| room-12-delqhi-nocodb | 8127 | Healthy | NocoDB Interface |
| room-12-delqhi-studio | 3012 | Working | Supabase Studio |

## Quick Start

```bash
cd /Users/jeremy/dev/sin-code/Docker/rooms/room-12-delqhi-db
docker compose up -d
```

## Connection Details

### PostgreSQL
```
Host: room-12-delqhi-db (or localhost)
Port: 5412
Database: delqhi
User: delqhi_admin
Password: delqhi-db-2026

Connection String:
postgresql://delqhi_admin:delqhi-db-2026@room-12-delqhi-db:5432/delqhi
```

### Redis
```
Host: room-12-delqhi-redis (or localhost)
Port: 6312
```

## Endpoints

| Service | URL |
|---------|-----|
| Supabase Studio | http://localhost:3012 |
| PostgREST | http://localhost:3112 |
| GoTrue Auth | http://localhost:9999 |
| Realtime | ws://localhost:4012 |
| Storage | http://localhost:5012 |
| Postgres Meta | http://localhost:8012 |
| NocoDB | http://localhost:8127 |

## Database Schema

The database contains 115 tables including:
- User management (profiles, accounts, sessions)
- Social features (posts, comments, likes, follows)
- Media handling (uploads, processing)
- Notifications and messaging
- Analytics and metrics

## Environment Variables

See `.env.example` for required configuration:

```bash
# Copy and customize
cp .env.example .env
```

Key variables:
- `POSTGRES_PASSWORD` - Database password
- `JWT_SECRET` - Authentication secret
- `ANON_KEY` - Anonymous API key
- `SERVICE_ROLE_KEY` - Service role key

## Health Checks

```bash
# Check all services
docker compose ps

# Test database connection
docker exec -it room-12-delqhi-db psql -U delqhi_admin -d delqhi -c '\dt'

# Check API health
curl http://localhost:9999/health
```

## Logs

```bash
# All services
docker compose logs -f

# Specific service
docker logs -f room-12-delqhi-db
```

## Network

- **Network:** haus-netzwerk
- **IP Range:** 172.20.0.120-128
- **Subnet:** 172.20.0.0/16

## Related Services

- **Room 13:** Delqhi Network (uses this database)
- **Room 03:** PostgreSQL Master (main system DB)

## Troubleshooting

### PostgREST showing unhealthy
PostgREST may show "unhealthy" but still work. Test with:
```bash
curl http://localhost:3112/
```

### Studio connection issues
Ensure all environment variables are set correctly in `.env`.

### Realtime not connecting
Check that `APP_NAME`, `SELF_HOST`, and `FLY_*` environment variables are set.

---

*Part of the Delqhi-Platform V18.3 Modular Infrastructure*
