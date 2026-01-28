#!/bin/bash
# ============================================================================
# vault-to-n8n.sh - Sync Vault secrets to n8n credentials
# ============================================================================
# 
# Usage: ./vault-to-n8n.sh
#
# Requirements:
#   - VAULT_ADDR environment variable
#   - VAULT_TOKEN environment variable
#   - N8N_HOST environment variable
#   - N8N_API_KEY environment variable (optional, for API access)
#
# Author: SIN-Solver Team
# Version: 1.0.0
# Date: 2026-01-28
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-s.root2026SINSolver}"
VAULT_MOUNT="sin-solver"
N8N_HOST="${N8N_HOST:-http://localhost:5678}"
N8N_API_KEY="${N8N_API_KEY:-}"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prereqs() {
    log_info "Checking prerequisites..."
    
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed"
        exit 1
    fi
    
    # Check Vault connectivity
    if ! curl -s -o /dev/null -w '%{http_code}' "${VAULT_ADDR}/v1/sys/health" | grep -qE "200|429|472|473|501|503"; then
        log_error "Cannot connect to Vault at ${VAULT_ADDR}"
        exit 1
    fi
    
    # Check n8n connectivity
    if ! curl -s -o /dev/null -w '%{http_code}' "${N8N_HOST}/api/v1/health" 2>/dev/null | grep -qE "200"; then
        log_warn "n8n health check failed - continuing anyway (API may require auth)"
    fi
    
    log_success "Prerequisites check passed"
}

# Read secret from Vault
read_vault_secret() {
    local path=$1
    curl -s -H "X-Vault-Token: ${VAULT_TOKEN}" \
        "${VAULT_ADDR}/v1/${VAULT_MOUNT}/data/${path}" | jq -r '.data.data // empty'
}

# Create n8n credential
create_n8n_credential() {
    local name=$1
    local type=$2
    local data=$3
    
    local headers=(-H "Content-Type: application/json")
    if [ -n "${N8N_API_KEY}" ]; then
        headers+=(-H "X-N8N-API-KEY: ${N8N_API_KEY}")
    fi
    
    local response
    response=$(curl -s -X POST "${N8N_HOST}/api/v1/credentials" \
        "${headers[@]}" \
        -d "{\"name\":\"${name}\",\"type\":\"${type}\",\"data\":${data}}")
    
    if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
        return 0
    elif echo "$response" | grep -qi "already exists"; then
        log_warn "Credential '${name}' already exists"
        return 0
    else
        log_error "Failed to create credential: $(echo "$response" | jq -r '.message // .')"
        return 1
    fi
}

# Sync PostgreSQL credential
sync_postgres() {
    log_info "Syncing PostgreSQL credential..."
    
    local postgres_data
    postgres_data=$(read_vault_secret "postgres")
    
    if [ -z "$postgres_data" ]; then
        log_warn "No PostgreSQL secrets found in Vault"
        return 1
    fi
    
    local host port username password database
    host=$(echo "$postgres_data" | jq -r '.host // "room-03-postgres-master"')
    port=$(echo "$postgres_data" | jq -r '.port // "5432"')
    username=$(echo "$postgres_data" | jq -r '.username // "postgres"')
    password=$(echo "$postgres_data" | jq -r '.password // ""')
    database=$(echo "$postgres_data" | jq -r '.database // "sin_solver"')
    
    local cred_data
    cred_data=$(jq -n \
        --arg host "$host" \
        --arg port "$port" \
        --arg user "$username" \
        --arg password "$password" \
        --arg database "$database" \
        '{
            host: $host,
            port: ($port | tonumber),
            user: $user,
            password: $password,
            database: $database,
            ssl: false
        }')
    
    if create_n8n_credential "SIN-Solver PostgreSQL" "postgres" "$cred_data"; then
        log_success "PostgreSQL credential synced"
        return 0
    fi
    return 1
}

# Sync Redis credential
sync_redis() {
    log_info "Syncing Redis credential..."
    
    local redis_data
    redis_data=$(read_vault_secret "redis")
    
    if [ -z "$redis_data" ]; then
        log_warn "No Redis secrets found in Vault"
        return 1
    fi
    
    local host port password
    host=$(echo "$redis_data" | jq -r '.host // "room-04-redis-cache"')
    port=$(echo "$redis_data" | jq -r '.port // "6379"')
    password=$(echo "$redis_data" | jq -r '.password // ""')
    
    local cred_data
    cred_data=$(jq -n \
        --arg host "$host" \
        --arg port "$port" \
        --arg password "$password" \
        '{
            host: $host,
            port: ($port | tonumber),
            password: $password
        }')
    
    if create_n8n_credential "SIN-Solver Redis" "redis" "$cred_data"; then
        log_success "Redis credential synced"
        return 0
    fi
    return 1
}

# Sync OpenCode API credential
sync_opencode() {
    log_info "Syncing OpenCode API credential..."
    
    local opencode_data
    opencode_data=$(read_vault_secret "opencode")
    
    if [ -z "$opencode_data" ]; then
        log_warn "No OpenCode secrets found in Vault"
        return 1
    fi
    
    local api_key base_url
    api_key=$(echo "$opencode_data" | jq -r '.api_key // ""')
    base_url=$(echo "$opencode_data" | jq -r '.base_url // "https://api.opencode.ai/v1"')
    
    local cred_data
    cred_data=$(jq -n \
        --arg api_key "$api_key" \
        --arg base_url "$base_url" \
        '{
            apiKey: $api_key,
            baseUrl: $base_url
        }')
    
    if create_n8n_credential "SIN-Solver OpenCode API" "httpHeaderAuth" "$cred_data"; then
        log_success "OpenCode API credential synced"
        return 0
    fi
    return 1
}

# Sync GitHub credential
sync_github() {
    log_info "Syncing GitHub credential..."
    
    local github_data
    github_data=$(read_vault_secret "github")
    
    if [ -z "$github_data" ]; then
        log_warn "No GitHub secrets found in Vault"
        return 1
    fi
    
    local token
    token=$(echo "$github_data" | jq -r '.token // ""')
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        log_warn "GitHub token is empty"
        return 1
    fi
    
    local cred_data
    cred_data=$(jq -n \
        --arg token "$token" \
        '{
            accessToken: $token
        }')
    
    if create_n8n_credential "SIN-Solver GitHub" "githubApi" "$cred_data"; then
        log_success "GitHub credential synced"
        return 0
    fi
    return 1
}

# Main sync function
sync_secrets() {
    log_info "Syncing secrets from Vault to n8n..."
    
    local synced=0
    local failed=0
    
    sync_postgres && ((synced++)) || ((failed++))
    sync_redis && ((synced++)) || ((failed++))
    sync_opencode && ((synced++)) || ((failed++))
    sync_github && ((synced++)) || ((failed++))
    
    echo ""
    log_info "============================================"
    log_info "Sync Summary"
    log_info "============================================"
    log_success "Synced: ${synced}"
    if [ $failed -gt 0 ]; then
        log_warn "Skipped/Failed: ${failed}"
    fi
}

# Main execution
main() {
    echo ""
    echo "============================================"
    echo "  Vault → n8n Sync Script"
    echo "  n8n: ${N8N_HOST}"
    echo "============================================"
    echo ""
    
    check_prereqs
    sync_secrets
    
    echo ""
    log_success "Sync complete!"
}

main "$@"
