// PRODUCTION: Always use delqhi.com domains, never localhost
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.delqhi.com';

// Service-specific endpoints (all via Cloudflare Tunnel)
export const SERVICE_ENDPOINTS = {
  n8n: 'https://n8n.delqhi.com',
  steel: 'https://steel.delqhi.com',
  skyvern: 'https://skyvern.delqhi.com',
  vault: 'https://vault.delqhi.com',
  vaultApi: 'https://vault-api.delqhi.com',
  plane: 'https://plane.delqhi.com',
  dashboard: 'https://dashboard.delqhi.com',
  api: 'https://api.delqhi.com'
};

export const SITE_CONFIG = {
  name: 'SIN-COCKPIT',
  version: '2.0.26',
  description: 'Mission Control Center'
};
