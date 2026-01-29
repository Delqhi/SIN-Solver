# Delqhi API Setup & Deployment Guide

## Quick Start (Local Development)

```bash
cd /Users/jeremy/dev/sin-code/Docker/rooms/room-13-delqhi-network/api

# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Start development server with hot reload
npm run dev
```

Server runs on `http://localhost:3000`

## Production Deployment

### 1. Build Docker Image

```bash
docker build -t room-13-delqhi-api:latest .
```

### 2. Run with Docker Compose

```bash
docker compose up -d room-13-delqhi-api
```

### 3. Verify Health

```bash
curl http://localhost:3000/health
# Expected response: {"status":"healthy","timestamp":"2024-01-27T22:00:00.000Z"}
```

## Configuration

### Required Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production

# Database (must match room-03-archiv-postgres)
DB_HOST=room-03-archiv-postgres
DB_PORT=5432
DB_USER=sin_admin
DB_PASSWORD=delqhi-platform-2026
DB_NAME=sin_solver

# Redis (must match room-04-memory-redis)
REDIS_HOST=room-04-memory-redis
REDIS_PORT=6379

# JWT (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secret-key-minimum-32-chars-recommended

# CORS (frontend origins)
CORS_ORIGINS=http://localhost:3130,https://delqhi.delqhi.com

# Meilisearch (for full-text search)
MEILISEARCH_HOST=http://room-13-delqhi-search:7700
MEILISEARCH_MASTER_KEY=your-meili-key
```

## Database Setup

Run these SQL commands on `room-03-archiv-postgres`:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]',
  visibility VARCHAR(20) DEFAULT 'public',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reply_to_id UUID REFERENCES posts(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT content_not_empty CHECK (length(content) > 0)
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id)
);

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Comments table (for future use)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT comment_not_empty CHECK (length(content) > 0)
);

-- Create indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
```

## tRPC Client Example

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './path/to/api/src/trpc/router';

const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      headers: () => ({
        authorization: `Bearer ${token}`,
      }),
    }),
  ],
});

// Register user
const user = await trpc.auth.register.mutate({
  username: 'john_doe',
  email: 'john@example.com',
  password: 'SecurePassword123!',
  displayName: 'John Doe',
});

// Create post
const post = await trpc.posts.create.mutate({
  content: 'Hello Delqhi!',
  visibility: 'public',
});

// Get timeline
const { items, nextCursor } = await trpc.posts.timeline.query({
  limit: 20,
});

// Follow user
await trpc.users.follow.mutate({
  userId: 'target-user-id',
});
```

## WebSocket Usage

```typescript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'posts',
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.onclose = () => {
  console.log('Connection closed');
};
```

## Docker Network

This API connects to the SIN-Code 26-room network:

```
Network: sin-network (172.20.0.0/16)

room-03-archiv-postgres: 172.20.0.100:5432
room-04-memory-redis: 172.20.0.50:6379
room-13-delqhi-search: 172.20.0.140:7700
room-13-delqhi-api: 172.20.0.130:3000
```

## Monitoring

### Health Endpoint

```bash
curl http://localhost:3000/health
```

### Container Logs

```bash
docker logs -f room-13-delqhi-api
```

### Database Connections

```sql
SELECT * FROM pg_stat_activity WHERE datname = 'sin_solver';
```

## Troubleshooting

### Database Connection Failed

```
Error: connect ECONNREFUSED 172.20.0.100:5432
```

**Solution:**
- Verify room-03-archiv-postgres is running
- Check network connectivity: `docker network inspect sin-network`
- Verify DB credentials in .env

### JWT Token Expired

**Solution:**
- Use refresh token endpoint to get new access token
- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days

### CORS Errors

**Solution:**
- Check CORS_ORIGINS environment variable matches frontend URL
- Development: `http://localhost:3130`
- Production: `https://delqhi.delqhi.com`

### WebSocket Connection Failed

**Solution:**
- Verify WebSocket server is running on `/ws` path
- Check browser console for specific error
- Ensure frontend uses `wss://` for HTTPS

## Performance Optimization

### Database Connection Pool

Current settings:
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

Monitor with:
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'sin_solver';
```

### Redis Caching (Future)

Planned implementation for:
- Session tokens
- User activity feeds
- Post caches
- Rate limiting

### Query Optimization

All queries use indexed columns:
- `users.username` - BTREE index
- `posts.user_id` - BTREE index
- `posts.created_at` - BTREE index DESC
- `follows.follower_id` - BTREE index

## Security Best Practices

1. **JWT Secret**: Change in production
   ```bash
   openssl rand -base64 32
   ```

2. **Database**: Use strong passwords
   ```bash
   # Generate secure password
   openssl rand -base64 16
   ```

3. **CORS**: Whitelist only trusted origins

4. **Rate Limiting**: Coming soon

5. **HTTPS**: Use TLS reverse proxy in production

## Deployment Checklist

- [ ] Set strong JWT_SECRET
- [ ] Configure production CORS_ORIGINS
- [ ] Set NODE_ENV=production
- [ ] Create database tables (SQL above)
- [ ] Test health endpoint
- [ ] Test tRPC endpoint
- [ ] Configure database backups
- [ ] Set up monitoring/logging
- [ ] Configure reverse proxy (Nginx/Caddy)
- [ ] Enable HTTPS/TLS

## Related Services

- **room-03-archiv-postgres**: Master database
- **room-04-memory-redis**: Cache layer
- **room-13-delqhi-search**: Meilisearch (full-text)
- **room-13-delqhi-web**: Frontend UI

## Support

For issues, check:
1. `/Users/jeremy/dev/sin-code/Docker/rooms/room-13-delqhi-network/api/README.md`
2. Docker logs: `docker logs room-13-delqhi-api`
3. Database queries: `SELECT * FROM pg_stat_statements`
