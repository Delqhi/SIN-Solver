# Delqhi Social Platform - PostgreSQL Migrations Guide

## Overview

Complete migration suite for Delqhi social media platform. **661 lines total** across 5 atomic migrations designed for PostgreSQL 16.

| Migration | Lines | Purpose |
|-----------|-------|---------|
| `001_initial_schema.sql` | 113 | Core tables (users, posts, media, hashtags) |
| `002_social_features.sql` | 137 | Social interactions (follows, likes, bookmarks, reports) |
| `003_messaging.sql` | 100 | Direct messaging system (conversations, messages, reactions) |
| `004_notifications.sql` | 125 | Notifications and push subscriptions |
| `005_search_indexes.sql` | 186 | Full-text search, trending views, analytics |

## Database Setup

**Prerequisites:**
- PostgreSQL 16+
- Database: `sin_solver`
- User: `sin_admin`

**Create database:**
```sql
CREATE DATABASE sin_solver WITH OWNER sin_admin;
```

## Migration Execution Order

Migrations MUST be applied sequentially:

```bash
# Connect to database
psql -U sin_admin -d sin_solver -f 001_initial_schema.sql
psql -U sin_admin -d sin_solver -f 002_social_features.sql
psql -U sin_admin -d sin_solver -f 003_messaging.sql
psql -U sin_admin -d sin_solver -f 004_notifications.sql
psql -U sin_admin -d sin_solver -f 005_search_indexes.sql
```

Or in Docker container:
```bash
docker exec room-03-archiv-postgres psql -U sin_admin -d sin_solver -f /migrations/001_initial_schema.sql
docker exec room-03-archiv-postgres psql -U sin_admin -d sin_solver -f /migrations/002_social_features.sql
# ... etc
```

## Migration Details

### 001_initial_schema.sql

**Core tables:**

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `users` | User accounts | Soft deletes, counters (followers/following/posts), verification, privacy |
| `posts` | Social posts | Threads (reply_to), quotes, reposts, media support, visibility controls |
| `media` | Media files | Type-specific (image/video/audio/gif), metadata (dimensions, duration) |
| `hashtags` | Trending tags | Post count tracking |
| `post_hashtags` | Many-to-many | Links posts to hashtags |

**Indexes:** 11 performance indexes on users, posts, media, hashtags

**Triggers:**
- `update_timestamp()` - Maintains `updated_at` on user/post changes

### 002_social_features.sql

**Social interaction tables:**

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `follows` | User relationships | Bidirectional, self-follow prevention |
| `likes` | Post likes | Unique per user-post pair |
| `bookmarks` | Saved posts | User-curated collections |
| `blocks` | User blocking | Self-block prevention |
| `mutes` | User muting | Self-mute prevention |
| `reports` | Content moderation | Reason categorization, reviewer tracking |

**Indexes:** 12 performance indexes on all relations

**Triggers:**
- `update_follow_counts()` - Auto-increment/decrement follower counts
- `update_likes_count()` - Auto-increment/decrement post likes
- `update_post_counts()` - Auto-increment/decrement comment/repost counts

**Purpose:** Maintains denormalized counters for fast UI rendering

### 003_messaging.sql

**Messaging system tables:**

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `conversations` | Chat containers | Supports direct & group chats |
| `conversation_participants` | Chat membership | Admin flags, read tracking |
| `messages` | Individual messages | Soft deletes, reply threading, edit flag |
| `message_reactions` | Emoji reactions | Per-user reactions with emojis |
| `message_reads` | Read receipts | Timestamp tracking per user |

**Indexes:** 12 performance indexes on messaging relations

**Triggers:**
- `update_conversation_last_message()` - Updates conversation timestamp
- `update_conversation_timestamp()` - Maintains conversation `updated_at`

### 004_notifications.sql

**Notification system tables:**

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `notifications` | User notifications | 9 types (like, comment, follow, mention, etc.) |
| `push_subscriptions` | Web push | For PWA push notifications |
| `notification_preferences` | User settings | Per-user notification toggles |
| `email_queue` | Email delivery | Async batch processing with retry |

**Indexes:** 10 performance indexes on notification relations

**Triggers:**
- `mark_notification_read()` - Auto-timestamps read notifications
- `create_notification_preferences()` - Auto-initializes preferences on user creation
- `update_notification_prefs_timestamp()` - Maintains preference update times

### 005_search_indexes.sql

**Search and analytics:**

| Component | Purpose | Details |
|-----------|---------|---------|
| **Trigram indexes** | Fuzzy user search | Users, posts, hashtags via GIN indexes |
| **Full-text search** | Post content search | tsvector on post content with stemming |
| **Materialized views** | Trending data | 3 views: hashtags, posts, user stats |
| **Search functions** | Query helpers | 3 PL/pgSQL functions for fast searches |

**Materialized Views (refresh needed via `refresh_trending_views()`):**

1. `trending_hashtags` - Top 100 hashtags in 24 hours
2. `trending_posts` - Top 500 posts by engagement score
3. `user_engagement_stats` - Per-user engagement metrics

**Search Functions:**
- `search_users(query, limit)` - Fuzzy user search with relevance ranking
- `search_posts(query, limit)` - Full-text + fuzzy post search
- `search_hashtags(query, limit)` - Hashtag lookup with post counts

## Key Design Decisions

### UUID Primary Keys
All tables use UUID instead of auto-increment for:
- Distributed system compatibility
- Security (no ID enumeration)
- Sharding readiness

### Soft Deletes
`deleted_at TIMESTAMPTZ` columns on:
- users, posts, messages
Allows data recovery and maintains referential integrity

### Denormalized Counters
Counts stored in rows (followers_count, likes_count, etc.) for:
- O(1) query performance
- UI-friendly access patterns
Triggers maintain consistency automatically

### JSONB for Flexible Media
`media_urls` stored as JSONB for:
- Variable media properties
- Future extensibility
- Native PostgreSQL support

### Triggers for Business Logic
Automatic counter updates and timestamp maintenance prevent:
- Race conditions
- Manual update errors
- Inconsistent state

## Performance Optimization

### Index Strategy

**Foreign key indexes:**
```sql
idx_posts_user_id, idx_likes_post, idx_follows_follower, etc.
```

**Temporal queries:**
```sql
idx_posts_created_at, idx_notifications_created, etc.
```

**Full-text search:**
```sql
idx_posts_content_search, idx_users_search, etc.
```

**Partial indexes:**
```sql
idx_posts_reply_to -- WHERE reply_to_id IS NOT NULL
```

### Materialized View Refresh

Schedule refresh every 15 minutes:
```bash
# Using pg_cron extension (if installed)
SELECT cron.schedule('refresh-trending-views', '*/15 * * * *', 'SELECT refresh_trending_views()');

# Or via application cron:
0 */15 * * * * psql -d sin_solver -c "SELECT refresh_trending_views();"
```

## Verification Checklist

```bash
# Check tables created
psql -U sin_admin -d sin_solver -c "\dt"

# Check indexes
psql -U sin_admin -d sin_solver -c "\di"

# Check triggers
psql -U sin_admin -d sin_solver -c "\dy"

# Check materialized views
psql -U sin_admin -d sin_solver -c "SELECT * FROM information_schema.views WHERE table_schema = 'public';"

# Check functions
psql -U sin_admin -d sin_solver -c "\df+"

# Test search function
psql -U sin_admin -d sin_solver -c "SELECT search_users('test', 10);"
```

## Rollback Strategy

Each migration is independent. To rollback:

```sql
-- Drop in reverse order (if needed)
DROP VIEW IF EXISTS user_engagement_stats CASCADE;
DROP VIEW IF EXISTS trending_posts CASCADE;
DROP VIEW IF EXISTS trending_hashtags CASCADE;
DROP TABLE IF EXISTS email_queue CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
-- ... etc
```

For production, create separate `DOWN` migrations alongside `UP` migrations.

## Extensions Required

Automatically created by migrations:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

Optional (for scheduled refresh):
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

## Docker Integration

Mount migrations directory in `docker-compose.yml`:

```yaml
services:
  room-03-archiv-postgres:
    volumes:
      - ./migrations:/migrations
    environment:
      POSTGRES_DB: sin_solver
      POSTGRES_USER: sin_admin
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| UUID extension not found | PostgreSQL 13+ required; extension auto-loads |
| Foreign key constraint errors | Apply migrations in order; verify dependency order |
| Search function returns empty | Call `SELECT refresh_trending_views()` manually |
| Slow queries | Check indexes with `EXPLAIN ANALYZE` |
| Trigger not firing | Verify trigger syntax with `\dy` command |

## Future Enhancements

- [ ] Add role-based access control (RBAC) table
- [ ] Add content moderation history tracking
- [ ] Add analytics event logging table
- [ ] Add subscription/payment tables
- [ ] Add backup/restore procedures
- [ ] Add partitioning for large tables (posts, notifications)
- [ ] Add query performance monitoring views

## Migration Statistics

```
Total Lines: 661
Total Tables: 23
Total Indexes: 49+
Total Triggers: 12
Total Functions: 15+
Total Materialized Views: 3
```

**Created:** 2026-01-27  
**Database:** PostgreSQL 16  
**Target:** sin_solver  
**User:** sin_admin
