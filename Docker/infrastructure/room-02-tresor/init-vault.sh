#!/bin/bash
# ============================================================================
# Vault Initialization Script (room-02-tresor-vault)
# ============================================================================
# This script initializes Vault with SIN-Solver secrets.
# It should be run ONCE after Vault container starts.
#
# Usage: docker exec room-02-tresor-vault /vault/init-vault.sh
#
# Author: SIN-Solver Team
# Version: 2.0.0
# Date: 2026-01-28
# ============================================================================

set -e

# Configuration
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_DEV_ROOT_TOKEN_ID:-s.root2026SINSolver}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "============================================"
echo "  SIN-Solver Vault Initialization"
echo "  Vault: ${VAULT_ADDR}"
echo "============================================"
echo ""

# Wait for Vault to be ready
log_info "Waiting for Vault to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if vault status > /dev/null 2>&1; then
        log_success "Vault is ready!"
        break
    fi
    attempt=$((attempt + 1))
    sleep 1
done

if [ $attempt -eq $max_attempts ]; then
    log_error "Vault failed to become ready after ${max_attempts} seconds"
    exit 1
fi

# Enable KV v2 secrets engine
log_info "Enabling KV v2 secrets engine at 'sin-solver/'..."
vault secrets enable -path=sin-solver -version=2 kv 2>/dev/null || {
    log_warn "KV engine may already be enabled (continuing...)"
}

# Store PostgreSQL credentials
log_info "Storing PostgreSQL credentials..."
vault kv put sin-solver/postgres \
    host="${POSTGRES_HOST:-room-03-postgres-master}" \
    port="${POSTGRES_PORT:-5432}" \
    username="${POSTGRES_USER:-postgres}" \
    password="${POSTGRES_PASSWORD:-}" \
    database="${POSTGRES_DB:-sin_solver}"
log_success "PostgreSQL secrets stored"

# Store Redis credentials
log_info "Storing Redis credentials..."
vault kv put sin-solver/redis \
    host="${REDIS_HOST:-room-04-redis-cache}" \
    port="${REDIS_PORT:-6379}" \
    password="${REDIS_PASSWORD:-}"
log_success "Redis secrets stored"

# Store n8n security keys
log_info "Storing n8n security keys..."
vault kv put sin-solver/n8n \
    encryption_key="${N8N_ENCRYPTION_KEY:-}" \
    jwt_secret="${N8N_USER_MANAGEMENT_JWT_SECRET:-}" \
    host="${N8N_HOST:-http://agent-01-n8n-orchestrator:5678}"
log_success "n8n secrets stored"

# Store OpenCode credentials
log_info "Storing OpenCode credentials..."
vault kv put sin-solver/opencode \
    api_key="${OPENCODE_API_KEY:-}" \
    base_url="${OPENCODE_BASE_URL:-https://api.opencode.ai/v1}"
log_success "OpenCode secrets stored"

# Store Vercel credentials (if provided)
if [ -n "${VERCEL_TOKEN:-}" ]; then
    log_info "Storing Vercel credentials..."
    vault kv put sin-solver/vercel \
        token="${VERCEL_TOKEN}" \
        project_id="${VERCEL_PROJECT_ID:-}" \
        team_id="${VERCEL_TEAM_ID:-}" \
        NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}" \
        NEXT_PUBLIC_CODESERVER_API_URL="${NEXT_PUBLIC_CODESERVER_API_URL:-}" \
        NEXT_PUBLIC_ENVIRONMENT="${NEXT_PUBLIC_ENVIRONMENT:-development}"
    log_success "Vercel secrets stored"
else
    log_warn "Skipping Vercel (VERCEL_TOKEN not set)"
fi

# Store GitHub credentials (if provided)
if [ -n "${GITHUB_TOKEN:-}" ]; then
    log_info "Storing GitHub credentials..."
    vault kv put sin-solver/github \
        token="${GITHUB_TOKEN}" \
        repo="${GITHUB_REPO:-}"
    log_success "GitHub secrets stored"
else
    log_warn "Skipping GitHub (GITHUB_TOKEN not set)"
fi

# Store CodeServer credentials (if provided)
if [ -n "${CODESERVER_API_URL:-}" ]; then
    log_info "Storing CodeServer credentials..."
    vault kv put sin-solver/codeserver \
        api_url="${CODESERVER_API_URL}" \
        api_key="${CODESERVER_API_KEY:-}"
    log_success "CodeServer secrets stored"
else
    log_warn "Skipping CodeServer (CODESERVER_API_URL not set)"
fi

# List stored secrets
echo ""
log_info "============================================"
log_info "Vault Initialization Complete"
log_info "============================================"
echo ""
log_info "Stored secrets:"
vault kv list sin-solver/ 2>/dev/null || log_warn "Could not list secrets"

echo ""
log_success "✅ Vault secrets initialized successfully!"
echo ""
log_info "Access Vault:"
log_info "  - UI: ${VAULT_ADDR}/ui"
log_info "  - API: ${VAULT_ADDR}/v1/sin-solver/data/{path}"
log_info "  - Token: ${VAULT_TOKEN}"
echo ""
