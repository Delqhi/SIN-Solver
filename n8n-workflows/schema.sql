-- n8n Workflow Database Schema for SIN-Solver
-- Run this SQL in PostgreSQL (sin_solver database) before importing workflows

-- Table 1: workflow_test (used by workflow 01-postgres-test.json)
CREATE TABLE IF NOT EXISTS workflow_test (
    id SERIAL PRIMARY KEY,
    test_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: agent_executions (used by workflow 02-agent-zero-task.json)
CREATE TABLE IF NOT EXISTS agent_executions (
    id SERIAL PRIMARY KEY,
    task_input TEXT,
    agent_response TEXT,
    status VARCHAR(50),
    execution_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: orchestration_log (used by workflow 03-full-orchestration.json)
CREATE TABLE IF NOT EXISTS orchestration_log (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(100) UNIQUE NOT NULL,
    operation VARCHAR(100),
    input_data TEXT,
    agent_response TEXT,
    cache_hit BOOLEAN DEFAULT FALSE,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orchestration_request_id ON orchestration_log(request_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_created_at ON orchestration_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_executions_timestamp ON agent_executions(execution_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_test_created_at ON workflow_test(created_at DESC);

-- Grant permissions to postgres user (if needed)
GRANT ALL PRIVILEGES ON workflow_test TO postgres;
GRANT ALL PRIVILEGES ON agent_executions TO postgres;
GRANT ALL PRIVILEGES ON orchestration_log TO postgres;

-- Optional: Add comments for documentation
COMMENT ON TABLE workflow_test IS 'Tests n8n PostgreSQL connectivity with CRUD operations';
COMMENT ON TABLE agent_executions IS 'Stores results of Agent Zero API calls from n8n workflows';
COMMENT ON TABLE orchestration_log IS 'Full execution log of orchestration workflow including caching and agent responses';

-- Verify tables exist
SELECT 
    schemaname,
    tablename,
    'workflow_test' as type
FROM pg_tables 
WHERE tablename IN ('workflow_test', 'agent_executions', 'orchestration_log')
AND schemaname = 'public';
