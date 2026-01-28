# Room 13: Delqhi Network - Architecture

## System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Tunnel                        │
│    delqhi.delqhi.com  |  social-api.delqhi.com             │
└─────────────────┬──────────────────┬────────────────────────┘
                  │                  │
    ┌─────────────▼──────┐   ┌──────▼─────────────┐
    │  Frontend (Next.js)│   │    API (Node.js)   │
    │   172.20.0.131     │───│    172.20.0.130    │
    │   Port 3000        │   │    Port 3000       │
    └────────────────────┘   └─────────┬──────────┘
                                       │
              ┌────────────────────────┼────────────────────┐
              │                        │                    │
    ┌─────────▼────────┐    ┌─────────▼────────┐  ┌────────▼───────┐
    │    PostgreSQL    │    │      Redis       │  │   Meilisearch  │
    │  172.20.0.100    │    │   172.20.0.104   │  │  172.20.0.133  │
    │   (room-03)      │    │    (room-04)     │  │   Port 7700    │
    └──────────────────┘    └──────────────────┘  └────────────────┘
```

## Database Schema

- 20 tables: users, posts, media, hashtags, follows, likes, etc.
- Materialized views for trending topics
- Full-text search with pg_trgm extension

## API Layers

1. Express HTTP server with CORS
2. tRPC procedures for type-safe RPC
3. WebSocket for real-time updates
4. JWT authentication middleware
