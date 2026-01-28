#!/bin/bash

##############################################################################
#                                                                            #
#  PHASE 7: PRE-FLIGHT SETUP SCRIPT                                        #
#  Autonomous Setup for End-to-End Workflow Testing                        #
#                                                                            #
#  This script prepares the infrastructure for Phase 7 automated testing:  #
#  - Creates test tables in PostgreSQL                                     #
#  - Populates test data                                                   #
#  - Verifies all service endpoints                                        #
#  - Generates API documentation                                           #
#  - Creates health check scripts                                          #
#                                                                            #
##############################################################################

set -e

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║          PHASE 7 PRE-FLIGHT SETUP - INITIALIZATION               ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Create PostgreSQL Test Schema
echo "📊 STEP 1: Creating PostgreSQL test schema..."
docker exec room-03-postgres-master psql -U postgres -d sin_solver << SQLEOF
-- Test tables for Phase 7 workflows
CREATE TABLE IF NOT EXISTS workflow_tests (
  id SERIAL PRIMARY KEY,
  workflow_name VARCHAR(255) NOT NULL,
  test_scenario VARCHAR(255),
  execution_time TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50),
  result_data JSONB,
  duration_ms INTEGER,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS solver_attempts (
  id SERIAL PRIMARY KEY,
  solver_id VARCHAR(50) NOT NULL,
  task_type VARCHAR(100),
  input_data JSONB,
  output_data JSONB,
  success BOOLEAN,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_executions (
  id SERIAL PRIMARY KEY,
  agent_name VARCHAR(255) NOT NULL,
  task_description TEXT,
  execution_status VARCHAR(50),
  result_data JSONB,
  execution_time TIMESTAMP DEFAULT NOW(),
  duration_ms INTEGER
);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Verify tables created
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SQLEOF

echo "✅ PostgreSQL test schema created"
echo ""

# Step 2: Test Redis Keys
echo "💾 STEP 2: Setting up Redis test keys..."
docker exec room-04-redis-cache redis-cli -a "sinredis2026!SecurePass" << REDISEOF
SET phase7:setup_complete "true" EX 86400
SET phase7:test_counter "0"
SET phase7:workflow_queue ""
SET phase7:cache_stats "initialized"
PING
