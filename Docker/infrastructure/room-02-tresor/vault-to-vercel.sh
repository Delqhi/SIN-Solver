#!/bin/bash
# ============================================================================
# vault-to-vercel.sh - Sync Vault secrets to Vercel environment variables
# ============================================================================
# 
# Usage: ./vault-to-vercel.sh [environment]
#   environment: production (default), preview, development
#
# Requirements:
#   - VAULT_ADDR environment variable
#   - VAULT_TOKEN environment variable  
#   - VERCEL_TOKEN environment variable
#   - VERCEL_PROJECT_ID environment variable
#   - VERCEL_TEAM_ID environment variable (optional)
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
VERCEL_API="https://api.vercel.com"
TARGET="${1:-production}"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prereqs() {
    log_info "Checking prerequisites..."
    
    if [ -z "${VERCEL_TOKEN:-}" ]; then
        log_error "VERCEL_TOKEN is not set"
        exit 1
    fi
    
    if [ -z "${VERCEL_PROJECT_ID:-}" ]; then
        log_error "VERCEL_PROJECT_ID is not set"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Read secret from Vault
read_vault_secret() {
    local path=$1
    curl -s -H "X-Vault-Token: ${VAULT_TOKEN}" \
        "${VAULT_ADDR}/v1/${VAULT_MOUNT}/data/${path}" | jq -r '.data.data // empty'
}

# Set Vercel environment variable
set_vercel_env() {
    local key=$1
    local value=$2
    local target=$3
    
    local url="${VERCEL_API}/v10/projects/${VERCEL_PROJECT_ID}/env"
    if [ -n "${VERCEL_TEAM_ID:-}" ]; then
        url="${url}?teamId=${VERCEL_TEAM_ID}"
    fi
    
    # Try to create first
    local response
    response=$(curl -s -X POST "$url" \
        -H "Authorization: Bearer ${VERCEL_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"key\":\"${key}\",\"value\":\"${value}\",\"type\":\"encrypted\",\"target\":[\"${target}\"]}")
    
    # Check if it already exists
    if echo "$response" | grep -q "already exists"; then
        # Get existing env ID and update
        local env_id
        env_id=$(curl -s "$url" \
            -H "Authorization: Bearer ${VERCEL_TOKEN}" | \
            jq -r ".envs[] | select(.key == \"${key}\") | .id")
        
        if [ -n "$env_id" ] && [ "$env_id" != "null" ]; then
            local update_url="${VERCEL_API}/v10/projects/${VERCEL_PROJECT_ID}/env/${env_id}"
            if [ -n "${VERCEL_TEAM_ID:-}" ]; then
                update_url="${update_url}?teamId=${VERCEL_TEAM_ID}"
            fi
            
            response=$(curl -s -X PATCH "$update_url" \
                -H "Authorization: Bearer ${VERCEL_TOKEN}" \
                -H "Content-Type: application/json" \
                -d "{\"value\":\"${value}\",\"target\":[\"${target}\"]}")
        fi
    fi
    
    if echo "$response" | grep -q "error"; then
        log_error "Failed to set ${key}: $(echo "$response" | jq -r '.error.message // .error')"
        return 1
    fi
    
    return 0
}

# Main sync function
sync_secrets() {
    log_info "Syncing secrets from Vault to Vercel (${TARGET})..."
    
    local synced=0
    local failed=0
    
    # Sync PostgreSQL secrets
    log_info "Syncing PostgreSQL secrets..."
    local postgres_data
    postgres_data=$(read_vault_secret "postgres")
    if [ -n "$postgres_data" ]; then
        for key in host port username password database; do
            local value
            value=$(echo "$postgres_data" | jq -r ".${key} // empty")
            if [ -n "$value" ]; then
                local env_key="POSTGRES_${key^^}"
                if set_vercel_env "$env_key" "$value" "$TARGET"; then
                    log_success "Synced $env_key"
                    ((synced++))
                else
                    ((failed++))
                fi
            fi
        done
    else
        log_warn "No PostgreSQL secrets found in Vault"
    fi
    
    # Sync Redis secrets
    log_info "Syncing Redis secrets..."
    local redis_data
    redis_data=$(read_vault_secret "redis")
    if [ -n "$redis_data" ]; then
        for key in host port password; do
            local value
            value=$(echo "$redis_data" | jq -r ".${key} // empty")
            if [ -n "$value" ]; then
                local env_key="REDIS_${key^^}"
                if set_vercel_env "$env_key" "$value" "$TARGET"; then
                    log_success "Synced $env_key"
                    ((synced++))
                else
                    ((failed++))
                fi
            fi
        done
    else
        log_warn "No Redis secrets found in Vault"
    fi
    
    # Sync OpenCode secrets
    log_info "Syncing OpenCode secrets..."
    local opencode_data
    opencode_data=$(read_vault_secret "opencode")
    if [ -n "$opencode_data" ]; then
        local api_key
        api_key=$(echo "$opencode_data" | jq -r ".api_key // empty")
        if [ -n "$api_key" ]; then
            if set_vercel_env "OPENCODE_API_KEY" "$api_key" "$TARGET"; then
                log_success "Synced OPENCODE_API_KEY"
                ((synced++))
            else
                ((failed++))
            fi
        fi
        
        local base_url
        base_url=$(echo "$opencode_data" | jq -r ".base_url // empty")
        if [ -n "$base_url" ]; then
            if set_vercel_env "OPENCODE_BASE_URL" "$base_url" "$TARGET"; then
                log_success "Synced OPENCODE_BASE_URL"
                ((synced++))
            else
                ((failed++))
            fi
        fi
    else
        log_warn "No OpenCode secrets found in Vault"
    fi
    
    # Sync n8n secrets
    log_info "Syncing n8n secrets..."
    local n8n_data
    n8n_data=$(read_vault_secret "n8n")
    if [ -n "$n8n_data" ]; then
        local encryption_key
        encryption_key=$(echo "$n8n_data" | jq -r ".encryption_key // empty")
        if [ -n "$encryption_key" ]; then
            if set_vercel_env "N8N_ENCRYPTION_KEY" "$encryption_key" "$TARGET"; then
                log_success "Synced N8N_ENCRYPTION_KEY"
                ((synced++))
            else
                ((failed++))
            fi
        fi
    fi
    
    # Sync Vercel-specific env vars
    log_info "Syncing Vercel-specific environment..."
    local vercel_data
    vercel_data=$(read_vault_secret "vercel")
    if [ -n "$vercel_data" ]; then
        for key in NEXT_PUBLIC_API_URL NEXT_PUBLIC_CODESERVER_API_URL NEXT_PUBLIC_ENVIRONMENT; do
            local value
            value=$(echo "$vercel_data" | jq -r ".${key} // empty")
            if [ -n "$value" ]; then
                if set_vercel_env "$key" "$value" "$TARGET"; then
                    log_success "Synced $key"
                    ((synced++))
                else
                    ((failed++))
                fi
            fi
        done
    fi
    
    echo ""
    log_info "============================================"
    log_info "Sync Summary for ${TARGET}"
    log_info "============================================"
    log_success "Synced: ${synced}"
    if [ $failed -gt 0 ]; then
        log_error "Failed: ${failed}"
    fi
}

# Main execution
main() {
    echo ""
    echo "============================================"
    echo "  Vault → Vercel Sync Script"
    echo "  Target: ${TARGET}"
    echo "============================================"
    echo ""
    
    check_prereqs
    sync_secrets
    
    echo ""
    log_success "Sync complete!"
}

main "$@"
