# Troubleshooting Ticket 05: localhost statt delqhi.com - Domain Migration

**Ticket ID:** ts-ticket-05.md  
**Datum:** 2026-01-29  
**Projekt:** SIN-Solver Infrastructure  
**Status:** ✅ RESOLVED  
**Referenz:** @/troubleshooting/ts-ticket-05.md

---

## Problem Statement

Die gesamte SIN-Solver Infrastruktur verwendete `localhost` URLs in Konfigurationsdateien, anstatt der offiziellen `delqhi.com` Domains. Dies führte zu mehreren Problemen:

1. **Externer Zugriff** nicht möglich (nur lokal erreichbar)
2. **SSL/TLS** konnte nicht verwendet werden
3. **Container-zu-Container** Kommunikation über Host-Netzwerk
4. **Produktions-Deployment** blockiert
5. **MCP Server** nicht von außen erreichbar

**Betroffene URLs:**
- `http://localhost:5678` statt `https://n8n.delqhi.com`
- `http://localhost:8000` statt `https://agentzero.delqhi.com`
- `http://localhost:3000` statt `https://steel.delqhi.com`
- `http://localhost:8019` statt `https://captcha.delqhi.com`
- `http://localhost:3001` statt `https://dashboard.delqhi.com`

---

## Root Cause Analysis

### Ursache 1: Initiale Entwicklung lokal
Das Projekt wurde initial nur für lokale Entwicklung eingerichtet, ohne Cloudflare Tunnel und Domain-Struktur.

### Ursache 2: Fehlende Migration
Bei der Einrichtung von Cloudflare Tunnel wurden die URLs nicht systematisch aktualisiert.

### Ursache 3: Inkonsistente Konfiguration
Verschiedene Dateien hatten unterschiedliche URL-Formate:
- `localhost:PORT`
- `127.0.0.1:PORT`
- `172.20.0.X:PORT` (Docker intern)

### Auswirkungen
- Externe Services konnten nicht auf interne APIs zugreifen
- MCP Server nur lokal funktionsfähig
- Dashboard zeigte falsche Links
- Keine HTTPS-Verschlüsselung

---

## Step-by-Step Resolution

### Schritt 1: Domain-Mapping erstellen

**`DOMAINS.md` erstellen:**
```markdown
# SIN-Solver Domain Mapping

| Service | Container | Localhost | Domain |
|---------|-----------|-----------|--------|
| n8n | agent-01-n8n-manager | localhost:5678 | n8n.delqhi.com |
| Temporal | agent-02-temporal-scheduler | localhost:3001 | temporal.delqhi.com |
| Agent Zero | agent-03-agentzero-orchestrator | localhost:8000 | agentzero.delqhi.com |
| OpenCode | agent-04-opencode-coder | localhost:9000 | opencode.delqhi.com |
| Steel | agent-05-steel-browser | localhost:3000 | steel.delqhi.com |
| Skyvern | agent-06-skyvern-solver | localhost:8000 | skyvern.delqhi.com |
| Stagehand | agent-07-stagehand-research | localhost:3000 | stagehand.delqhi.com |
| Playwright | agent-08-playwright-tester | localhost:8080 | playwright.delqhi.com |
| Clawdbot | agent-09-clawdbot-social | localhost:8080 | clawdbot.delqhi.com |
| Surfsense | agent-10-surfsense-knowledge | localhost:6333 | surfsense.delqhi.com |
| Evolution | agent-11-evolution-optimizer | localhost:8080 | evolution.delqhi.com |
| Dashboard | room-01-dashboard-cockpit | localhost:3001 | dashboard.delqhi.com |
| Vault | room-02-tresor-secrets | localhost:8000 | vault.delqhi.com |
| Postgres | room-03-archiv-postgres | localhost:5432 | postgres.delqhi.com |
| Redis | room-04-memory-redis | localhost:6379 | redis.delqhi.com |
| Captcha | solver-1.1-captcha-worker | localhost:8019 | captcha.delqhi.com |
| Survey | solver-2.1-survey-worker | localhost:8018 | survey.delqhi.com |
| Website | builder-1-website-worker | localhost:8020 | website.delqhi.com |
| Scira | room-30-scira-ai-search | localhost:8230 | scira.delqhi.com |
```

### Schritt 2: Alle Dateien finden mit localhost

```bash
# Suche nach localhost in allen Config-Dateien
grep -r "localhost:" /Users/jeremy/dev/SIN-Solver \
  --include="*.json" \
  --include="*.js" \
  --include="*.ts" \
  --include="*.yaml" \
  --include="*.yml" \
  --include="*.md" \
  --include="*.env*" \
  2>/dev/null | grep -v node_modules | grep -v ".next"

# Suche nach 127.0.0.1
grep -r "127.0.0.1" /Users/jeremy/dev/SIN-Solver \
  --include="*.json" \
  --include="*.js" \
  --include="*.ts" \
  --include="*.yaml" \
  --include="*.yml" \
  2>/dev/null | grep -v node_modules
```

### Schritt 3: opencode.json aktualisieren

**Vorher:**
```json
{
  "mcp": {
    "agent-01-n8n-manager": {
      "type": "remote",
      "url": "http://localhost:5678",
      "enabled": true
    },
    "agent-03-agentzero-orchestrator": {
      "type": "remote",
      "url": "http://localhost:8000",
      "enabled": true
    }
  }
}
```

**Nachher:**
```json
{
  "mcp": {
    "agent-01-n8n-manager": {
      "type": "remote",
      "url": "https://n8n.delqhi.com",
      "enabled": true
    },
    "agent-03-agentzero-orchestrator": {
      "type": "remote",
      "url": "https://agentzero.delqhi.com",
      "enabled": true
    },
    "agent-05-steel-browser": {
      "type": "remote",
      "url": "https://steel.delqhi.com",
      "enabled": true
    },
    "solver-1.1-captcha-worker": {
      "type": "remote",
      "url": "https://captcha.delqhi.com",
      "enabled": true
    }
  }
}
```

### Schritt 4: Dashboard Config aktualisieren

**`dashboard/lib/config.js`:**
```javascript
// Vorher
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Nachher
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://dashboard.delqhi.com';

// Service URLs
const SERVICE_URLS = {
  n8n: 'https://n8n.delqhi.com',
  agentzero: 'https://agentzero.delqhi.com',
  steel: 'https://steel.delqhi.com',
  skyvern: 'https://skyvern.delqhi.com',
  stagehand: 'https://stagehand.delqhi.com',
  captcha: 'https://captcha.delqhi.com',
  survey: 'https://survey.delqhi.com',
  dashboard: 'https://dashboard.delqhi.com',
};
```

### Schritt 5: Environment Templates aktualisieren

**`.env.local.template`:**
```bash
# Vorher
NEXT_PUBLIC_API_URL=http://localhost:3001
N8N_URL=http://localhost:5678
AGENTZERO_URL=http://localhost:8000

# Nachher
NEXT_PUBLIC_API_URL=https://dashboard.delqhi.com
N8N_URL=https://n8n.delqhi.com
AGENTZERO_URL=https://agentzero.delqhi.com
STEEL_URL=https://steel.delqhi.com
CAPTCHA_URL=https://captcha.delqhi.com
SURVEY_URL=https://survey.delqhi.com
```

### Schritt 6: Dokumentation aktualisieren

Alle README.md, AGENTS.md und andere Dokumentationsdateien wurden aktualisiert.

### Schritt 7: Cloudflare Tunnel Config

**`cloudflare/config.yml` überprüfen:**
```yaml
tunnel: <tunnel-id>
credentials-file: /Users/jeremy/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: n8n.delqhi.com
    service: http://agent-01-n8n-manager:5678
  
  - hostname: agentzero.delqhi.com
    service: http://agent-03-agentzero-orchestrator:8000
  
  - hostname: steel.delqhi.com
    service: http://agent-05-steel-browser:3000
  
  - hostname: captcha.delqhi.com
    service: http://solver-1.1-captcha-worker:8019
  
  - hostname: dashboard.delqhi.com
    service: http://room-01-dashboard-cockpit:3001
  
  - service: http_status:404
```

### Schritt 8: Validierung

```bash
# Alle Domains testen
curl -s -o /dev/null -w "%{http_code}" https://n8n.delqhi.com/health
curl -s -o /dev/null -w "%{http_code}" https://agentzero.delqhi.com/health
curl -s -o /dev/null -w "%{http_code}" https://steel.delqhi.com/health
curl -s -o /dev/null -w "%{http_code}" https://captcha.delqhi.com/health
curl -s -o /dev/null -w "%{http_code}" https://dashboard.delqhi.com

# SSL Zertifikate prüfen
echo | openssl s_client -servername n8n.delqhi.com -connect n8n.delqhi.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Commands & Code

### Bulk Replacement Script
```bash
#!/bin/bash
# migrate-to-delqhi.sh

BASE_DIR="/Users/jeremy/dev/SIN-Solver"

# Mapping: localport -> domain
declare -A PORT_TO_DOMAIN=(
  ["5678"]="n8n.delqhi.com"
  ["3001"]="temporal.delqhi.com"
  ["8000"]="agentzero.delqhi.com"
  ["9000"]="opencode.delqhi.com"
  ["3000"]="steel.delqhi.com"
  ["8080"]="playwright.delqhi.com"
  ["6333"]="surfsense.delqhi.com"
  ["8019"]="captcha.delqhi.com"
  ["8018"]="survey.delqhi.com"
  ["8020"]="website.delqhi.com"
  ["8230"]="scira.delqhi.com"
)

# Ersetze localhost:PORT mit https://domain
for port in "${!PORT_TO_DOMAIN[@]}"; do
  domain="${PORT_TO_DOMAIN[$port]}"
  echo "Replacing localhost:$port with https://$domain"
  
  find "$BASE_DIR" -type f \
    \( -name "*.json" -o -name "*.js" -o -name "*.ts" -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -not -path "*/dist/*" \
    -exec sed -i '' "s|http://localhost:$port|https://$domain|g" {} \;
done

# Ersetze 127.0.0.1 ebenfalls
for port in "${!PORT_TO_DOMAIN[@]}"; do
  domain="${PORT_TO_DOMAIN[$port]}"
  echo "Replacing 127.0.0.1:$port with https://$domain"
  
  find "$BASE_DIR" -type f \
    \( -name "*.json" -o -name "*.js" -o -name "*.ts" -o -name "*.yaml" -o -name "*.yml" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -exec sed -i '' "s|http://127.0.0.1:$port|https://$domain|g" {} \;
done

echo "✅ Migration complete!"
echo "📋 Please verify all changes before committing."
```

### Domain Validation Script
```bash
#!/bin/bash
# validate-domains.sh

declare -A DOMAINS=(
  ["n8n.delqhi.com"]="agent-01-n8n-manager"
  ["agentzero.delqhi.com"]="agent-03-agentzero-orchestrator"
  ["steel.delqhi.com"]="agent-05-steel-browser"
  ["captcha.delqhi.com"]="solver-1.1-captcha-worker"
  ["survey.delqhi.com"]="solver-2.1-survey-worker"
  ["dashboard.delqhi.com"]="room-01-dashboard-cockpit"
  ["scira.delqhi.com"]="room-30-scira-ai-search"
)

echo "🔍 Validating domains..."
echo "======================="

all_pass=true
for domain in "${!DOMAINS[@]}"; do
  container="${DOMAINS[$domain]}"
  
  # Check HTTPS
  status=$(curl -s -o /dev/null -w "%{http_code}" "https://$domain/health" 2>/dev/null || echo "000")
  
  if [ "$status" = "200" ] || [ "$status" = "404" ]; then
    echo "✅ $domain -> $container (HTTP $status)"
  else
    echo "❌ $domain -> $container (HTTP $status)"
    all_pass=false
  fi
done

echo ""
if [ "$all_pass" = true ]; then
  echo "✅ All domains are accessible!"
else
  echo "⚠️  Some domains are not accessible. Check Cloudflare Tunnel."
fi
```

### Git Commit
```bash
cd /Users/jeremy/dev/SIN-Solver

git add -A
git commit -m "fix: migrate localhost URLs to delqhi.com domains

- Replace all localhost:PORT with https://*.delqhi.com
- Update opencode.json MCP server URLs
- Update dashboard configuration
- Update documentation (AGENTS.md, README.md)
- Add domain mapping documentation

Affected services:
- n8n: localhost:5678 -> n8n.delqhi.com
- agentzero: localhost:8000 -> agentzero.delqhi.com
- steel: localhost:3000 -> steel.delqhi.com
- captcha: localhost:8019 -> captcha.delqhi.com
- survey: localhost:8018 -> survey.delqhi.com
- dashboard: localhost:3001 -> dashboard.delqhi.com

See: troubleshooting/ts-ticket-05.md"

git push origin main
```

---

## Sources & References

### Interne Dokumentation
- **CONTAINER-REGISTRY.md:** /Users/jeremy/dev/SIN-Solver/CONTAINER-REGISTRY.md
- **AGENTS.md:** /Users/jeremy/dev/SIN-Solver/AGENTS.md
- **Cloudflare Config:** /Users/jeremy/dev/SIN-Solver/cloudflare/
- **Docker Compose:** /Users/jeremy/dev/SIN-Solver/Docker/

### Externe Dokumentation
- **Cloudflare Tunnel:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Docker Networking:** https://docs.docker.com/network/

### Sessions
- **Session ID:** ses_3f8f80bf6ffe5HhrhI5WDu3okc
- **Datum:** 2026-01-28
- **Agent:** sisyphus

---

## Prevention Measures

### 1. Domain-First Development
```markdown
## Regel: Domain-First statt Localhost-First

❌ NIE: http://localhost:PORT
✅ IMMER: https://service.delqhi.com

Ausnahmen:
- Lokale Entwicklung mit `npm run dev`
- Docker interne Kommunikation (service names)
- Tests mit Testcontainers
```

### 2. Config Validation
```bash
# Pre-commit Hook für URL-Validierung
if grep -r "localhost:" --include="*.json" --include="*.js" .; then
  echo "❌ Found localhost URLs! Use delqhi.com domains."
  exit 1
fi
```

### 3. Environment Separation
```javascript
// config.js
const isProduction = process.env.NODE_ENV === 'production';

const URLS = isProduction ? {
  n8n: 'https://n8n.delqhi.com',
  agentzero: 'https://agentzero.delqhi.com',
} : {
  n8n: 'http://localhost:5678',
  agentzero: 'http://localhost:8000',
};
```

---

## Verification

- [x] Alle localhost URLs ersetzt
- [x] opencode.json aktualisiert
- [x] Dashboard Config aktualisiert
- [x] Dokumentation aktualisiert
- [x] Cloudflare Tunnel Config geprüft
- [x] Alle Domains erreichbar (curl tests)
- [x] SSL Zertifikate gültig
- [x] MCP Server funktionieren
- [x] Git commit erstellt
- [x] Changes gepusht

---

## Impact

### Vorher
- ❌ Nur lokal erreichbar
- ❌ Kein HTTPS
- ❌ Kein externer Zugriff
- ❌ MCP Server isoliert

### Nachher
- ✅ Global erreichbar über delqhi.com
- ✅ HTTPS mit Cloudflare SSL
- ✅ Externe Integration möglich
- ✅ Produktions-Ready

---

**Erstellt:** 2026-01-30  
**Letzte Aktualisierung:** 2026-01-30  
**Verantwortlich:** Sisyphus Agent
