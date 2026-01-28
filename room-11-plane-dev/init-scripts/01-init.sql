-- SIN-Solver Plane Database Initialization
-- Creates additional indexes and extensions for AI Agent integration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create AI Agent tracking table (custom extension for SIN-Solver)
CREATE TABLE IF NOT EXISTS sin_agent_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(50) NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    issue_id UUID,
    project_id UUID,
    command TEXT,
    result JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_agent_activities_agent_id ON sin_agent_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_activities_created_at ON sin_agent_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activities_status ON sin_agent_activities(status);

-- Create agent suggestions table
CREATE TABLE IF NOT EXISTS sin_agent_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(50) NOT NULL,
    issue_id UUID NOT NULL,
    suggestion_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    auto_apply BOOLEAN DEFAULT FALSE,
    applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_suggestions_issue_id ON sin_agent_suggestions(issue_id);
CREATE INDEX IF NOT EXISTS idx_agent_suggestions_applied ON sin_agent_suggestions(applied);

-- Create agent credentials tracking (for Tresor integration)
CREATE TABLE IF NOT EXISTS sin_agent_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credential_name VARCHAR(100) NOT NULL UNIQUE,
    agent_id VARCHAR(50),
    credential_type VARCHAR(50) NOT NULL,
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Log table for audit trail
CREATE TABLE IF NOT EXISTS sin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    actor_type VARCHAR(20) NOT NULL,
    actor_id VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON sin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON sin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON sin_audit_log(event_type);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO plane;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO plane;
