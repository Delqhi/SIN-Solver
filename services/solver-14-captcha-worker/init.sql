-- Captcha Worker Database Schema
-- Initialize tables for worker statistics and solve history

-- Create tables if they don't exist
CREATE SCHEMA IF NOT EXISTS captcha_worker;

-- Main worker statistics table
CREATE TABLE IF NOT EXISTS captcha_worker.worker_stats (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(100) NOT NULL DEFAULT 'captcha-worker-001',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_solved INT DEFAULT 0,
    total_failed INT DEFAULT 0,
    total_earned_cents INT DEFAULT 0,
    average_solve_time_ms INT DEFAULT 0,
    success_rate_percent DECIMAL(5,2) DEFAULT 0.0,
    current_streak INT DEFAULT 0,
    earnings_per_hour DECIMAL(10,2) DEFAULT 0.0,
    uptime_seconds INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Per-CAPTCHA solve details
CREATE TABLE IF NOT EXISTS captcha_worker.captcha_solves (
    id BIGSERIAL PRIMARY KEY,
    worker_id VARCHAR(100) NOT NULL DEFAULT 'captcha-worker-001',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    captcha_id VARCHAR(100),
    captcha_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    solve_time_ms INT,
    confidence DECIMAL(4,3),
    answer_submitted VARCHAR(500),
    answer_correct VARCHAR(500),
    image_hash VARCHAR(64),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Earnings history for tracking income over time
CREATE TABLE IF NOT EXISTS captcha_worker.earnings_history (
    id BIGSERIAL PRIMARY KEY,
    worker_id VARCHAR(100) NOT NULL DEFAULT 'captcha-worker-001',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    period VARCHAR(50) NOT NULL,  -- 'hourly', 'daily', 'weekly', 'monthly'
    total_solved INT,
    total_failed INT,
    earned_cents INT,
    average_solve_time_ms INT,
    success_rate_percent DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CAPTCHA type breakdown
CREATE TABLE IF NOT EXISTS captcha_worker.captcha_breakdown (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(100) NOT NULL DEFAULT 'captcha-worker-001',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    text_count INT DEFAULT 0,
    image_click_count INT DEFAULT 0,
    slider_count INT DEFAULT 0,
    math_count INT DEFAULT 0,
    audio_count INT DEFAULT 0,
    other_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session information
CREATE TABLE IF NOT EXISTS captcha_worker.sessions (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(100) NOT NULL,
    session_id UUID UNIQUE,
    provider VARCHAR(50) NOT NULL,
    username VARCHAR(255),
    login_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    logout_timestamp TIMESTAMP WITH TIME ZONE,
    total_solves INT DEFAULT 0,
    total_earnings_cents INT DEFAULT 0,
    status VARCHAR(50),  -- 'active', 'inactive', 'error'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics (per solve type)
CREATE TABLE IF NOT EXISTS captcha_worker.performance_metrics (
    id SERIAL PRIMARY KEY,
    captcha_type VARCHAR(50) NOT NULL UNIQUE,
    total_attempts INT DEFAULT 0,
    total_success INT DEFAULT 0,
    success_rate_percent DECIMAL(5,2) DEFAULT 0.0,
    average_solve_time_ms INT DEFAULT 0,
    min_solve_time_ms INT,
    max_solve_time_ms INT,
    average_confidence DECIMAL(4,3) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_worker_stats_timestamp 
    ON captcha_worker.worker_stats(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_worker_stats_worker_id 
    ON captcha_worker.worker_stats(worker_id);

CREATE INDEX IF NOT EXISTS idx_captcha_solves_timestamp 
    ON captcha_worker.captcha_solves(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_captcha_solves_worker_id 
    ON captcha_worker.captcha_solves(worker_id);

CREATE INDEX IF NOT EXISTS idx_captcha_solves_type 
    ON captcha_worker.captcha_solves(captcha_type);

CREATE INDEX IF NOT EXISTS idx_captcha_solves_success 
    ON captcha_worker.captcha_solves(success);

CREATE INDEX IF NOT EXISTS idx_earnings_history_timestamp 
    ON captcha_worker.earnings_history(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_earnings_history_period 
    ON captcha_worker.earnings_history(period);

CREATE INDEX IF NOT EXISTS idx_sessions_worker_id 
    ON captcha_worker.sessions(worker_id);

CREATE INDEX IF NOT EXISTS idx_sessions_status 
    ON captcha_worker.sessions(status);

-- Create views for easy querying
CREATE OR REPLACE VIEW captcha_worker.v_daily_earnings AS
SELECT 
    worker_id,
    DATE(timestamp) as day,
    COUNT(*) FILTER (WHERE success) as solved,
    COUNT(*) FILTER (WHERE NOT success) as failed,
    COUNT(*) as total,
    AVG(solve_time_ms) as avg_solve_time,
    SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as success_rate
FROM captcha_worker.captcha_solves
GROUP BY worker_id, DATE(timestamp);

CREATE OR REPLACE VIEW captcha_worker.v_hourly_earnings AS
SELECT 
    worker_id,
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) FILTER (WHERE success) as solved,
    COUNT(*) FILTER (WHERE NOT success) as failed,
    COUNT(*) as total,
    AVG(solve_time_ms) as avg_solve_time,
    SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as success_rate
FROM captcha_worker.captcha_solves
GROUP BY worker_id, DATE_TRUNC('hour', timestamp);

CREATE OR REPLACE VIEW captcha_worker.v_captcha_type_stats AS
SELECT 
    captcha_type,
    COUNT(*) FILTER (WHERE success) as solved,
    COUNT(*) FILTER (WHERE NOT success) as failed,
    COUNT(*) as total,
    AVG(solve_time_ms) as avg_solve_time,
    SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as success_rate,
    AVG(confidence) as avg_confidence
FROM captcha_worker.captcha_solves
GROUP BY captcha_type;

-- Grant permissions (if needed for specific users)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA captcha_worker TO worker_app;
-- GRANT USAGE ON SCHEMA captcha_worker TO worker_app;

-- Log: Database schema initialized successfully
-- Tables created:
--   - worker_stats (worker overall statistics)
--   - captcha_solves (per-solve details)
--   - earnings_history (historical earnings)
--   - captcha_breakdown (solve count by type)
--   - sessions (session tracking)
--   - performance_metrics (per-type performance)
--
-- Views created:
--   - v_daily_earnings (daily statistics)
--   - v_hourly_earnings (hourly statistics)
--   - v_captcha_type_stats (per-type statistics)
--
-- Indexes created for optimal query performance
