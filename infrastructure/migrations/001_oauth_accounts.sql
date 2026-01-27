-- Migration: OAuth Accounts and API Keys Tables
-- Description: Create tables for OAuth multi-account support and API key management
-- Date: 2026-01-27

-- OAuth Connected Accounts (Multi-Account Support)
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  avatar TEXT,
  username VARCHAR(255),
  tokens JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(provider, account_id)
);

-- API Keys (Auto-Provisioned or Manual)
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  account_id VARCHAR(255),
  key_name VARCHAR(255),
  key_value TEXT NOT NULL,
  is_auto_provisioned BOOLEAN DEFAULT false,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(provider, account_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_active ON oauth_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);

-- Comments
COMMENT ON TABLE oauth_accounts IS 'Stores OAuth connected accounts for Google, Mistral, GitHub, Discord, HuggingFace';
COMMENT ON TABLE api_keys IS 'Stores API keys (encrypted) for AI providers - auto-provisioned via OAuth or manually added';
COMMENT ON COLUMN oauth_accounts.tokens IS 'Encrypted JSON with access_token, refresh_token, expires_at';
COMMENT ON COLUMN api_keys.key_value IS 'AES-256-GCM encrypted API key value';
