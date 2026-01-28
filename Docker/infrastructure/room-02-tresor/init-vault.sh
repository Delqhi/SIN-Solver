#!/bin/bash
# Vault Initialization Script (room-02-tresor-vault)
# This script initializes vault with SIN-Solver secrets

set -e

VAULT_ADDR="http://localhost:8200"
VAULT_TOKEN="${VAULT_DEV_ROOT_TOKEN_ID:-s.root2026SINSolver}"

echo "⏳ Waiting for Vault to be ready..."
sleep 5

echo "🔑 Initializing Vault Secrets..."

# Enable KV v2 secrets engine (if not already enabled)
vault secrets enable -path=sin-solver kv || true

# Store PostgreSQL credentials
vault kv put sin-solver/postgres \
  username=postgres \
  password="${POSTGRES_PASSWORD}" \
  database="sin_solver" \
  host="room-03-postgres-master" \
  port="5432"

# Store Redis credentials
vault kv put sin-solver/redis \
  password="${REDIS_PASSWORD}" \
  host="room-04-redis-cache" \
  port="6379"

# Store n8n security keys
vault kv put sin-solver/n8n \
  encryption_key="${N8N_ENCRYPTION_KEY}" \
  jwt_secret="${N8N_USER_MANAGEMENT_JWT_SECRET}" \
  sendgrid_api_key="${SENDGRID_API_KEY}" \
  sendgrid_from_email="${SENDGRID_FROM_EMAIL}" \
  slack_api_token="${SLACK_API_TOKEN}"

# Store OpenCode credentials
vault kv put sin-solver/opencode \
  api_key="${OPENCODE_API_KEY}" \
  base_url="https://api.opencode.ai/v1"

echo "✅ Vault secrets initialized successfully!"
echo "📍 Access Vault at: $VAULT_ADDR"
echo "🔐 Token: $VAULT_TOKEN"
