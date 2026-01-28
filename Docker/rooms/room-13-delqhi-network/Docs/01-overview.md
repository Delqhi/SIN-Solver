# Room 13: Delqhi Network - Overview

## Service Summary

| Service | Container | IP | Port | External |
|---------|-----------|-----|------|----------|
| API | room-13-delqhi-api | 172.20.0.130 | 3000 | 8130 |
| Frontend | room-13-delqhi-frontend | 172.20.0.131 | 3000 | 3130 |
| MCP | room-13-delqhi-mcp | 172.20.0.132 | 8213 | 8213 |
| Search | room-13-delqhi-search | 172.20.0.133 | 7700 | 7700 |

## Public URLs (Cloudflare Tunnel)

- Frontend: https://delqhi.delqhi.com
- API: https://social-api.delqhi.com
- MCP: https://social-mcp.delqhi.com
- Search: https://social-search.delqhi.com

## Tech Stack

- **Backend**: Node.js + Express + tRPC + PostgreSQL + Redis
- **Frontend**: Next.js 14 + Tailwind CSS + TypeScript
- **Search**: Meilisearch v1.6
- **MCP**: Model Context Protocol for AI integration

## Features

- User registration/authentication (JWT)
- Posts with media attachments
- Follows, likes, bookmarks
- Direct messaging
- Full-text search
- Real-time notifications
- MCP tools for AI agents

## Dependencies

- room-03-postgres-master (172.20.0.100:5432)
- room-04-redis-cache (172.20.0.104:6379)

## Quick Start

```bash
cd /Users/jeremy/dev/sin-code/Docker/rooms/room-13-delqhi-network
docker compose up -d
```
