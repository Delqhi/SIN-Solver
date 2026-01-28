-- Delqhi Social Platform - Full-Text Search Indexes
-- Database: sin_solver
-- Created: 2026-01-27
-- This migration adds search capabilities and trending analytics

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- User search index using trigram (fuzzy matching)
CREATE INDEX idx_users_search ON users USING gin (
    (username || ' ' || COALESCE(display_name, '') || ' ' || COALESCE(bio, '')) gin_trgm_ops
);

-- Post content search index
CREATE INDEX idx_posts_content_search ON posts USING gin (content gin_trgm_ops);

-- Hashtag search index
CREATE INDEX idx_hashtags_search ON hashtags USING gin (tag gin_trgm_ops);

-- Full-text search vector for posts (combines content and hashtags)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION posts_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_posts_search_vector
BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION posts_search_vector_update();

CREATE INDEX idx_posts_search_vector ON posts USING gin (search_vector);

-- Materialized view for trending hashtags (24-hour window)
CREATE MATERIALIZED VIEW trending_hashtags AS
SELECT 
    h.id,
    h.tag,
    COUNT(DISTINCT ph.post_id) as post_count,
    COUNT(DISTINCT p.user_id) as user_count,
    MAX(p.created_at) as latest_post_at
FROM hashtags h
JOIN post_hashtags ph ON h.id = ph.hashtag_id
JOIN posts p ON ph.post_id = p.id
WHERE p.created_at > NOW() - INTERVAL '24 hours' AND p.deleted_at IS NULL
GROUP BY h.id, h.tag
ORDER BY post_count DESC
LIMIT 100;

CREATE UNIQUE INDEX idx_trending_hashtags_id ON trending_hashtags(id);
CREATE INDEX idx_trending_hashtags_post_count ON trending_hashtags(post_count DESC);

-- Materialized view for trending posts (24-hour window)
CREATE MATERIALIZED VIEW trending_posts AS
SELECT 
    p.id,
    p.user_id,
    p.content,
    p.media_urls,
    (p.likes_count + (p.comments_count * 2) + (p.reposts_count * 3) + (p.views_count / 100)) as engagement_score,
    p.created_at
FROM posts p
WHERE p.created_at > NOW() - INTERVAL '24 hours' 
    AND p.deleted_at IS NULL 
    AND p.visibility = 'public'
ORDER BY engagement_score DESC
LIMIT 500;

CREATE UNIQUE INDEX idx_trending_posts_id ON trending_posts(id);
CREATE INDEX idx_trending_posts_engagement ON trending_posts(engagement_score DESC);

-- Materialized view for user engagement stats
CREATE MATERIALIZED VIEW user_engagement_stats AS
SELECT 
    u.id,
    u.username,
    COUNT(DISTINCT p.id) as total_posts,
    COUNT(DISTINCT l.post_id) as total_likes_given,
    COUNT(DISTINCT f.follower_id) as total_followers,
    COUNT(DISTINCT f2.following_id) as total_following,
    AVG((SELECT COUNT(*) FROM likes WHERE post_id = p.id)) as avg_likes_per_post,
    AVG((SELECT COUNT(*) FROM posts WHERE reply_to_id = p.id)) as avg_comments_per_post
FROM users u
LEFT JOIN posts p ON u.id = p.user_id AND p.deleted_at IS NULL
LEFT JOIN likes l ON u.id = l.user_id
LEFT JOIN follows f ON u.id = f.following_id
LEFT JOIN follows f2 ON u.id = f2.follower_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username;

CREATE UNIQUE INDEX idx_user_stats_id ON user_engagement_stats(id);

-- Function to refresh trending materialized views
CREATE OR REPLACE FUNCTION refresh_trending_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY trending_hashtags;
    REFRESH MATERIALIZED VIEW CONCURRENTLY trending_posts;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_engagement_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule via application layer using pg_cron or external task scheduler
-- Example with pg_cron: SELECT cron.schedule('refresh-trending-views', '*/15 * * * *', 'SELECT refresh_trending_views()');

-- Search function for users (case-insensitive)
CREATE OR REPLACE FUNCTION search_users(search_query TEXT, limit_count INT DEFAULT 20)
RETURNS TABLE (
    id UUID,
    username VARCHAR,
    display_name VARCHAR,
    avatar_url TEXT,
    is_verified BOOLEAN,
    followers_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.followers_count
    FROM users u
    WHERE u.deleted_at IS NULL
        AND (
            u.username ILIKE '%' || search_query || '%'
            OR u.display_name ILIKE '%' || search_query || '%'
        )
    ORDER BY 
        CASE 
            WHEN u.username ILIKE search_query THEN 0
            WHEN u.display_name ILIKE search_query THEN 1
            ELSE 2
        END,
        u.followers_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Search function for posts (full-text + content)
CREATE OR REPLACE FUNCTION search_posts(search_query TEXT, limit_count INT DEFAULT 50)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    likes_count INTEGER,
    comments_count INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.user_id, p.content, p.likes_count, p.comments_count, p.created_at
    FROM posts p
    WHERE p.deleted_at IS NULL 
        AND p.visibility = 'public'
        AND (
            p.search_vector @@ plainto_tsquery('english', search_query)
            OR p.content ILIKE '%' || search_query || '%'
        )
    ORDER BY 
        CASE 
            WHEN p.search_vector @@ plainto_tsquery('english', search_query) THEN 0
            ELSE 1
        END,
        p.likes_count DESC,
        p.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Search function for hashtags
CREATE OR REPLACE FUNCTION search_hashtags(search_query TEXT, limit_count INT DEFAULT 20)
RETURNS TABLE (
    id UUID,
    tag VARCHAR,
    posts_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT h.id, h.tag, h.posts_count
    FROM hashtags h
    WHERE h.tag ILIKE '%' || search_query || '%'
    ORDER BY h.posts_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
