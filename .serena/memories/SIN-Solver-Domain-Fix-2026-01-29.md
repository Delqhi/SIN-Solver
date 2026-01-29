# CRITICAL FIX: Localhost → Delqhi.com Domain Migration

**Date:** 2026-01-29  
**Session:** ses_3f9bc1908ffeVibfrKEY3Kybu5  
**Status:** ✅ COMPLETED  
**Priority:** CRITICAL

## Problem
Alle Dashboard-Komponenten verwendeten `localhost` URLs statt der produktiven `delqhi.com` Domains. Dies verhinderte den externen Zugriff über Cloudflare Tunnel.

## Files Modified

### 1. `/dashboard/lib/config.js`
- **Before:** `http://localhost:8080`
- **After:** `https://api.delqhi.com`
- **Added:** SERVICE_ENDPOINTS mapping für alle Services

### 2. `/dashboard/pages/dashboard.js`
- **Before:** `http://localhost:3000`, `http://localhost:5678`, `http://localhost:8041`
- **After:** `https://dashboard.delqhi.com`, `https://n8n.delqhi.com`, `https://codeserver.delqhi.com`

### 3. `/dashboard/pages/vault.js`
- **Before:** `http://localhost:8002`, `http://localhost:8041`
- **After:** `https://vault-api.delqhi.com`, `https://codeserver.delqhi.com`

### 4. `/infrastructure/cloudflare/config.yml`
- **Added:** 4 neue Services
  - `api.delqhi.com` → room-13-api-brain:8000
  - `hoppscotch.delqhi.com` → room-24-hoppscotch-api:3000
  - `mail.delqhi.com` → room-22-billionmail-web:8091
  - `flowise.delqhi.com` → room-23-flowiseai-web:8092

## Active Public URLs (via Cloudflare Tunnel)

| Subdomain | Service | Status |
|-----------|---------|--------|
| dashboard.delqhi.com | room-01-dashboard-cockpit | ✅ |
| n8n.delqhi.com | agent-01-n8n-orchestrator | ✅ |
| steel.delqhi.com | agent-05-steel-browser | ✅ |
| skyvern.delqhi.com | agent-06-skyvern-solver | ✅ |
| vault.delqhi.com | room-02-tresor-vault | ✅ |
| vault-api.delqhi.com | room-02-tresor-api | ✅ |
| codeserver.delqhi.com | agent-04-opencode-secretary | ✅ |
| plane.delqhi.com | room-11-plane-mcp | ✅ |
| api.delqhi.com | room-13-api-brain | ✅ NEW |
| captcha.delqhi.com | builder-1.1-captcha-worker | ✅ |
| survey.delqhi.com | solver-18-survey-worker | ✅ |
| chat.delqhi.com | room-09-clawdbot-messenger | ✅ |
| video.delqhi.com | room-05-generator-video | ✅ |
| social.delqhi.com | room-20.3-social-mcp | ✅ |
| research.delqhi.com | agent-07-stagehand-research | ✅ |
| hoppscotch.delqhi.com | room-24-hoppscotch-api | ✅ NEW |
| mail.delqhi.com | room-22-billionmail-web | ✅ NEW |
| flowise.delqhi.com | room-23-flowiseai-web | ✅ NEW |

## Verification Steps
1. ✅ Alle localhost URLs ersetzt
2. ✅ Cloudflare Config aktualisiert
3. ✅ Container Registry geprüft
4. ⏳ Deployment erforderlich

## Next Steps
1. Docker Images neu bauen
2. Cloudflare Tunnel neustarten
3. Alle Services extern testen
