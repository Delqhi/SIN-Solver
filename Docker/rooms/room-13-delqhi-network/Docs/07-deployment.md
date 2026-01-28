# Room 13: Delqhi Network - Deployment

## Prerequisites

1. Docker network exists:
```bash
docker network create --subnet=172.20.0.0/16 haus-netzwerk
```

2. Dependencies running:
- room-03-postgres-master
- room-04-redis-cache

## Deploy Steps

```bash
cd /Users/jeremy/dev/sin-code/Docker/rooms/room-13-delqhi-network

cp .env.example .env
# Edit .env with production values

docker compose build
docker compose up -d
```

## Database Migrations

```bash
docker exec -i room-03-postgres-master psql -U sin_admin -d sin_solver < migrations/001_initial_schema.sql
docker exec -i room-03-postgres-master psql -U sin_admin -d sin_solver < migrations/002_social_features.sql
docker exec -i room-03-postgres-master psql -U sin_admin -d sin_solver < migrations/003_messaging.sql
docker exec -i room-03-postgres-master psql -U sin_admin -d sin_solver < migrations/004_notifications.sql
docker exec -i room-03-postgres-master psql -U sin_admin -d sin_solver < migrations/005_search_indexes.sql
```

## Verify Deployment

```bash
curl https://social-api.delqhi.com/health
curl https://delqhi.delqhi.com
```

## Rollback

```bash
docker compose down
docker compose up -d --force-recreate
```
