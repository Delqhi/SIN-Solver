-- PostgreSQL Initialization Script for SIN-Solver CAPTCHA Worker
-- Database: captcha_db
-- User: captcha_user
-- Purpose: Initialize schema, tables, indexes, and default data

-- ============================================================================
-- 1. CREATE SCHEMA
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS captcha_solver;
SET search_path TO captcha_solver, public;

-- ============================================================================
-- 2. CREATE TABLES
-- ============================================================================

-- 2.1: CAPTCHA Results Table
-- Stores solved CAPTCHA records with metadata
CREATE TABLE IF NOT EXISTS captcha_results (
    id SERIAL PRIMARY KEY,
    captcha_id VARCHAR(255) NOT NULL UNIQUE,
    captcha_type VARCHAR(50) NOT NULL,
    image_hash VARCHAR(64),
    solution TEXT NOT NULL,
    confidence_score FLOAT DEFAULT 0.0,
    solving_method VARCHAR(100),
    solve_time_ms INTEGER,
    is_correct BOOLEAN DEFAULT NULL,
    verification_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT check_captcha_type CHECK (captcha_type IN (
        'text_recognition',
        'image_classification',
        'slider_captcha',
        'click_target',
        'puzzle_piece',
        'audio_captcha',
        'math_equation',
        'logic_puzzle',
        'pattern_recognition',
        'sequence_completion',
        'gesture_recognition',
        'behavior_analysis'
    ))
);

-- 2.2: Training Data Table
-- Stores labeled training samples for model improvement
CREATE TABLE IF NOT EXISTS training_data (
    id SERIAL PRIMARY KEY,
    captcha_type VARCHAR(50) NOT NULL,
    image_path VARCHAR(500),
    image_hash VARCHAR(64) UNIQUE,
    label TEXT NOT NULL,
    confidence FLOAT DEFAULT 1.0,
    is_validated BOOLEAN DEFAULT FALSE,
    validation_source VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT fk_captcha_type CHECK (captcha_type IN (
        'text_recognition',
        'image_classification',
        'slider_captcha',
        'click_target',
        'puzzle_piece',
        'audio_captcha',
        'math_equation',
        'logic_puzzle',
        'pattern_recognition',
        'sequence_completion',
        'gesture_recognition',
        'behavior_analysis'
    ))
);

-- 2.3: Model Performance Metrics Table
-- Tracks model accuracy, precision, recall, F1 per captcha type
CREATE TABLE IF NOT EXISTS model_metrics (
    id SERIAL PRIMARY KEY,
    model_version VARCHAR(50) NOT NULL,
    captcha_type VARCHAR(50) NOT NULL,
    accuracy FLOAT,
    precision FLOAT,
    recall FLOAT,
    f1_score FLOAT,
    confusion_matrix JSONB,
    test_samples_count INTEGER,
    inference_time_ms FLOAT,
    model_size_mb FLOAT,
    gpu_memory_mb FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT check_metrics CHECK (
        accuracy IS NULL OR (accuracy >= 0 AND accuracy <= 1)
    )
);

-- 2.4: API Request Logs Table
-- Tracks all API requests for monitoring and debugging
CREATE TABLE IF NOT EXISTS api_request_logs (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL UNIQUE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    captcha_id VARCHAR(255),
    captcha_type VARCHAR(50),
    user_ip VARCHAR(45),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- 2.5: Configuration Table
-- Stores runtime configuration and feature flags
CREATE TABLE IF NOT EXISTS configuration (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    config_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    updated_by VARCHAR(100) DEFAULT 'system',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.6: Model Versions Table
-- Tracks all model versions deployed
CREATE TABLE IF NOT EXISTS model_versions (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL UNIQUE,
    model_path VARCHAR(500),
    file_size_mb FLOAT,
    model_hash VARCHAR(64),
    training_date TIMESTAMP,
    accuracy FLOAT,
    is_active BOOLEAN DEFAULT FALSE,
    deployment_date TIMESTAMP,
    git_commit VARCHAR(40),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- 2.7: System Health Table
-- Tracks system resource usage and health status
CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cpu_percent FLOAT,
    memory_percent FLOAT,
    disk_percent FLOAT,
    gpu_percent FLOAT,
    gpu_memory_percent FLOAT,
    database_latency_ms FLOAT,
    redis_latency_ms FLOAT,
    api_response_time_p95_ms FLOAT,
    api_response_time_p99_ms FLOAT,
    error_rate_percent FLOAT,
    requests_per_second FLOAT,
    status VARCHAR(20) DEFAULT 'healthy',
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================

-- 3.1: Captcha Results Indexes
CREATE INDEX IF NOT EXISTS idx_captcha_results_captcha_id 
    ON captcha_results(captcha_id);
CREATE INDEX IF NOT EXISTS idx_captcha_results_captcha_type 
    ON captcha_results(captcha_type);
CREATE INDEX IF NOT EXISTS idx_captcha_results_created_at 
    ON captcha_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_captcha_results_verification_status 
    ON captcha_results(verification_status);
CREATE INDEX IF NOT EXISTS idx_captcha_results_is_correct 
    ON captcha_results(is_correct) WHERE is_correct IS NOT NULL;

-- 3.2: Training Data Indexes
CREATE INDEX IF NOT EXISTS idx_training_data_captcha_type 
    ON training_data(captcha_type);
CREATE INDEX IF NOT EXISTS idx_training_data_is_validated 
    ON training_data(is_validated);
CREATE INDEX IF NOT EXISTS idx_training_data_image_hash 
    ON training_data(image_hash);
CREATE INDEX IF NOT EXISTS idx_training_data_created_at 
    ON training_data(created_at DESC);

-- 3.3: Model Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_model_metrics_model_version 
    ON model_metrics(model_version);
CREATE INDEX IF NOT EXISTS idx_model_metrics_captcha_type 
    ON model_metrics(captcha_type);
CREATE INDEX IF NOT EXISTS idx_model_metrics_created_at 
    ON model_metrics(created_at DESC);

-- 3.4: API Request Logs Indexes
CREATE INDEX IF NOT EXISTS idx_api_logs_request_id 
    ON api_request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_captcha_id 
    ON api_request_logs(captcha_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint 
    ON api_request_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at 
    ON api_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code 
    ON api_request_logs(status_code);

-- 3.5: Configuration Indexes
CREATE INDEX IF NOT EXISTS idx_configuration_key 
    ON configuration(config_key);
CREATE INDEX IF NOT EXISTS idx_configuration_is_active 
    ON configuration(is_active);

-- 3.6: System Health Indexes
CREATE INDEX IF NOT EXISTS idx_system_health_timestamp 
    ON system_health(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_status 
    ON system_health(status);

-- ============================================================================
-- 4. CREATE VIEWS
-- ============================================================================

-- 4.1: Recent CAPTCHA Results View
CREATE OR REPLACE VIEW v_recent_captcha_results AS
SELECT 
    id,
    captcha_id,
    captcha_type,
    solution,
    confidence_score,
    solve_time_ms,
    is_correct,
    verification_status,
    created_at
FROM captcha_results
ORDER BY created_at DESC
LIMIT 100;

-- 4.2: CAPTCHA Success Rate by Type
CREATE OR REPLACE VIEW v_captcha_success_rate AS
SELECT 
    captcha_type,
    COUNT(*) as total_attempts,
    SUM(CASE WHEN is_correct = TRUE THEN 1 ELSE 0 END) as successful,
    ROUND(
        100.0 * SUM(CASE WHEN is_correct = TRUE THEN 1 ELSE 0 END) / 
        COUNT(*), 
        2
    ) as success_rate_percent,
    AVG(solve_time_ms) as avg_solve_time_ms,
    AVG(confidence_score) as avg_confidence
FROM captcha_results
WHERE is_correct IS NOT NULL
GROUP BY captcha_type
ORDER BY success_rate_percent DESC;

-- 4.3: Training Data Coverage
CREATE OR REPLACE VIEW v_training_data_coverage AS
SELECT 
    captcha_type,
    COUNT(*) as total_samples,
    SUM(CASE WHEN is_validated = TRUE THEN 1 ELSE 0 END) as validated_samples,
    ROUND(
        100.0 * SUM(CASE WHEN is_validated = TRUE THEN 1 ELSE 0 END) / 
        COUNT(*), 
        2
    ) as validation_percent
FROM training_data
GROUP BY captcha_type
ORDER BY total_samples DESC;

-- 4.4: Model Performance Dashboard
CREATE OR REPLACE VIEW v_model_performance_dashboard AS
SELECT 
    model_version,
    captcha_type,
    accuracy,
    precision,
    recall,
    f1_score,
    inference_time_ms,
    model_size_mb,
    created_at
FROM model_metrics
ORDER BY created_at DESC, model_version DESC;

-- ============================================================================
-- 5. INSERT DEFAULT CONFIGURATION
-- ============================================================================

INSERT INTO configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('inference_timeout_seconds', '10', 'integer', 'Maximum inference time per CAPTCHA', TRUE),
    ('max_worker_threads', '4', 'integer', 'Maximum concurrent worker threads', TRUE),
    ('cache_enabled', 'true', 'boolean', 'Enable Redis caching for results', TRUE),
    ('cache_ttl_hours', '24', 'integer', 'Cache time-to-live in hours', TRUE),
    ('model_confidence_threshold', '0.85', 'float', 'Minimum confidence score for acceptance', TRUE),
    ('enable_gpu_inference', 'false', 'boolean', 'Enable GPU acceleration (if available)', FALSE),
    ('batch_inference_enabled', 'true', 'boolean', 'Enable batch inference for efficiency', TRUE),
    ('batch_size', '32', 'integer', 'Batch size for batch inference', TRUE),
    ('enable_logging', 'true', 'boolean', 'Enable detailed request logging', TRUE),
    ('log_level', 'INFO', 'string', 'Logging level (DEBUG, INFO, WARNING, ERROR)', TRUE),
    ('enable_metrics_collection', 'true', 'boolean', 'Enable Prometheus metrics collection', TRUE),
    ('metrics_push_interval_seconds', '60', 'integer', 'Metrics push interval to Prometheus', TRUE),
    ('enable_auto_retraining', 'false', 'boolean', 'Automatically retrain models with new data', FALSE),
    ('retraining_frequency_days', '7', 'integer', 'Days between auto-retraining attempts', FALSE),
    ('enable_model_versioning', 'true', 'boolean', 'Track and manage multiple model versions', TRUE),
    ('database_pool_size', '10', 'integer', 'Database connection pool size', TRUE),
    ('redis_pool_size', '5', 'integer', 'Redis connection pool size', TRUE),
    ('request_timeout_seconds', '30', 'integer', 'HTTP request timeout', TRUE),
    ('enable_cors', 'true', 'boolean', 'Enable Cross-Origin Resource Sharing', TRUE),
    ('cors_allowed_origins', 'localhost:3000,localhost:3001,localhost:8000', 'string', 'Comma-separated CORS allowed origins', TRUE)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 6. INSERT DEFAULT MODEL VERSION
-- ============================================================================

INSERT INTO model_versions (
    model_name,
    version,
    model_path,
    accuracy,
    is_active,
    notes
) VALUES (
    'yolov8-captcha-classifier',
    '1.0.0',
    '/app/models/best.pt',
    0.0,
    FALSE,
    'Initial model placeholder - replaced during training'
) ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- 7. CREATE TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER trigger_update_captcha_results_timestamp
    BEFORE UPDATE ON captcha_results
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_training_data_timestamp
    BEFORE UPDATE ON training_data
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_model_metrics_timestamp
    BEFORE UPDATE ON model_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_model_versions_timestamp
    BEFORE UPDATE ON model_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_configuration_timestamp
    BEFORE UPDATE ON configuration
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant all permissions on schema and tables to captcha_user
GRANT USAGE ON SCHEMA captcha_solver TO captcha_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA captcha_solver TO captcha_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA captcha_solver TO captcha_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA captcha_solver TO captcha_user;

-- Default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA captcha_solver GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO captcha_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA captcha_solver GRANT USAGE, SELECT ON SEQUENCES TO captcha_user;

-- ============================================================================
-- 9. FINAL VERIFICATION
-- ============================================================================

-- Verify schema creation
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'captcha_solver';

-- Verify table creation
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'captcha_solver';

-- Verify index creation
SELECT COUNT(*) as index_count FROM information_schema.statistics WHERE table_schema = 'captcha_solver';

-- Display created tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'captcha_solver' ORDER BY table_name;
