# Troubleshooting Ticket 02: MCP Config Fehler - Falsche Container-Namen

**Ticket ID:** ts-ticket-02.md  
**Datum:** 2026-01-29  
**Projekt:** SIN-Solver MCP Konfiguration  
**Status:** ✅ RESOLVED  
**Referenz:** @/troubleshooting/ts-ticket-02.md

---

## Problem Statement

Die MCP (Model Context Protocol) Konfiguration in `~/.config/opencode/opencode.json` enthielt falsche Container-Namen, die nicht dem offiziellen Naming Convention Standard entsprachen. Dies führte zu Verbindungsfehlern und nicht funktionierenden MCP Servern.

**Falsche Namen (vorher):**
- `sin-zimmer-01-n8n` statt `agent-01-n8n-manager`
- `sin-zimmer-03-agent-zero` statt `agent-03-agentzero-orchestrator`
- `sin-zimmer-05-steel` statt `agent-05-steel-browser`

**Auswirkungen:**
- MCP Server konnten Container nicht finden
- Docker Compose Services nicht erreichbar
- Fehlende Konsistenz in der gesamten Infrastruktur

---

## Root Cause Analysis

### Ursache 1: Inkonsistente Naming Convention
Die ursprüngliche Konfiguration verwendete ein veraltetes Naming Schema (`sin-zimmer-XX-name`), das nicht mit der aktuellen Docker-Infrastruktur übereinstimmte.

### Ursache 2: Fehlende Dokumentation
Es gab keine zentrale Referenz für die korrekten Container-Namen, was zu willkürlichen Benennungen führte.

### Ursache 3: Keine Validierung
Die MCP Konfiguration wurde nicht gegen die tatsächlich laufenden Container validiert.

### Naming Convention Standard (MANDATORY)
```
FORMAT: {category}-{number}-{name}

CATEGORIES:
├── agent-XX-    → AI Workers, Orchestrators, Automation
├── room-XX-     → Infrastructure, Databases, Storage
├── solver-X.X-  → Money-Making Workers (Captcha, Survey)
└── builder-X-   → Content Creation Workers

EXAMPLES:
✅ agent-01-n8n-manager
✅ agent-03-agentzero-orchestrator
✅ solver-1.1-captcha-worker
✅ room-01-dashboard-cockpit

❌ sin-zimmer-01-n8n        (Falsches Präfix)
❌ sin-zimmer-03-agent-zero (Falsches Präfix)
```

---

## Step-by-Step Resolution

### Schritt 1: Container Registry erstellen
```bash
# CONTAINER-REGISTRY.md erstellen
cat > /Users/jeremy/dev/SIN-Solver/CONTAINER-REGISTRY.md << 'EOF'
# Container Registry - Single Source of Truth

## Naming Convention
FORMAT: {category}-{number}-{name}

## Active Containers
| Service | Container Name | Port | Domain |
|---------|---------------|------|--------|
| n8n | agent-01-n8n-manager | 5678 | n8n.delqhi.com |
| Temporal | agent-02-temporal-scheduler | 3001 | temporal.delqhi.com |
| Agent Zero | agent-03-agentzero-orchestrator | 8000 | agentzero.delqhi.com |
| ... | ... | ... | ... |
EOF
```

### Schritt 2: Alle Container-Namen identifizieren
```bash
# Laufende Container anzeigen
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

# Docker Compose Services listen
cd /Users/jeremy/dev/SIN-Solver/Docker/agents
docker-compose config --services
```

### Schritt 3: MCP Config korrigieren

**Vorher (FALSCH):**
```json
{
  "mcp": {
    "n8n": {
      "type": "remote",
      "url": "http://sin-zimmer-01-n8n:5678",
      "enabled": true
    },
    "agent-zero": {
      "type": "remote",
      "url": "http://sin-zimmer-03-agent-zero:8000",
      "enabled": true
    }
  }
}
```

**Nachher (RICHTIG):**
```json
{
  "mcp": {
    "agent-01-n8n-manager": {
      "type": "remote",
      "url": "http://agent-01-n8n-manager:5678",
      "enabled": true
    },
    "agent-03-agentzero-orchestrator": {
      "type": "remote",
      "url": "http://agent-03-agentzero-orchestrator:8000",
      "enabled": true
    },
    "agent-05-steel-browser": {
      "type": "remote",
      "url": "http://agent-05-steel-browser:3000",
      "enabled": true
    },
    "agent-06-skyvern-solver": {
      "type": "remote",
      "url": "http://agent-06-skyvern-solver:8000",
      "enabled": true
    },
    "agent-07-stagehand-research": {
      "type": "remote",
      "url": "http://agent-07-stagehand-research:3000",
      "enabled": true
    }
  }
}
```

### Schritt 4: Docker Compose anpassen
Alle `docker-compose.yml` Dateien mussten aktualisiert werden:

```yaml
# Vorher
services:
  sin-zimmer-01-n8n:
    container_name: sin-zimmer-01-n8n
    
# Nachher
services:
  agent-01-n8n-manager:
    container_name: agent-01-n8n-manager
```

### Schritt 5: Validierung
```bash
# MCP Config testen
opencode --version

# Container erreichen
curl http://agent-01-n8n-manager:5678/health
curl http://agent-03-agentzero-orchestrator:8000/health

# Docker Netzwerk prüfen
docker network inspect sin-network
```

---

## Commands & Code

### Backup der alten Config
```bash
cp ~/.config/opencode/opencode.json ~/.config/opencode/opencode.json.backup.$(date +%Y%m%d)
```

### Container-Namen korrigieren (Bulk Script)
```bash
#!/bin/bash
# fix-container-names.sh

OLD_PREFIX="sin-zimmer"
NEW_PREFIX="agent"

# In allen docker-compose.yml Dateien
find /Users/jeremy/dev/SIN-Solver/Docker -name "docker-compose.yml" -exec sed -i \
  -e "s/${OLD_PREFIX}-01-n8n/agent-01-n8n-manager/g" \
  -e "s/${OLD_PREFIX}-02-temporal/agent-02-temporal-scheduler/g" \
  -e "s/${OLD_PREFIX}-03-agent-zero/agent-03-agentzero-orchestrator/g" \
  -e "s/${OLD_PREFIX}-05-steel/agent-05-steel-browser/g" \
  -e "s/${OLD_PREFIX}-06-skyvern/agent-06-skyvern-solver/g" \
  -e "s/${OLD_PREFIX}-07-stagehand/agent-07-stagehand-research/g" \
  {} +
```

### MCP Config Validierung
```javascript
// validate-mcp-config.js
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('~/.config/opencode/opencode.json', 'utf8'));
const validPattern = /^(agent|room|solver|builder)-\d+/;

Object.keys(config.mcp || {}).forEach(name => {
  if (!validPattern.test(name)) {
    console.error(`❌ Invalid MCP name: ${name}`);
    console.error('   Must follow: {category}-{number}-{name}');
  } else {
    console.log(`✅ Valid: ${name}`);
  }
});
```

### Aktualisierte opencode.json (Ausschnitt)
```json
{
  "mcp": {
    "agent-01-n8n-manager": {
      "type": "remote",
      "url": "http://agent-01-n8n-manager:5678",
      "enabled": true
    },
    "agent-02-temporal-scheduler": {
      "type": "remote", 
      "url": "http://agent-02-temporal-scheduler:3001",
      "enabled": true
    },
    "agent-03-agentzero-orchestrator": {
      "type": "remote",
      "url": "http://agent-03-agentzero-orchestrator:8000",
      "enabled": true
    },
    "agent-04-opencode-coder": {
      "type": "remote",
      "url": "http://agent-04-opencode-coder:9000",
      "enabled": true
    },
    "agent-05-steel-browser": {
      "type": "remote",
      "url": "http://agent-05-steel-browser:3000",
      "enabled": true
    },
    "agent-06-skyvern-solver": {
      "type": "remote",
      "url": "http://agent-06-skyvern-solver:8000",
      "enabled": true
    },
    "agent-07-stagehand-research": {
      "type": "remote",
      "url": "http://agent-07-stagehand-research:3000",
      "enabled": true
    },
    "agent-08-playwright-tester": {
      "type": "remote",
      "url": "http://agent-08-playwright-tester:8080",
      "enabled": true
    },
    "agent-09-clawdbot-social": {
      "type": "remote",
      "url": "http://agent-09-clawdbot-social:8080",
      "enabled": true
    },
    "agent-10-surfsense-knowledge": {
      "type": "remote",
      "url": "http://agent-10-surfsense-knowledge:6333",
      "enabled": true
    },
    "agent-11-evolution-optimizer": {
      "type": "remote",
      "url": "http://agent-11-evolution-optimizer:8080",
      "enabled": true
    },
    "room-01-dashboard-cockpit": {
      "type": "remote",
      "url": "http://room-01-dashboard-cockpit:3000",
      "enabled": true
    },
    "room-02-tresor-secrets": {
      "type": "remote",
      "url": "http://room-02-tresor-secrets:8000",
      "enabled": true
    },
    "room-03-archiv-postgres": {
      "type": "remote",
      "url": "http://room-03-archiv-postgres:5432",
      "enabled": true
    },
    "room-04-memory-redis": {
      "type": "remote",
      "url": "http://room-04-memory-redis:6379",
      "enabled": true
    },
    "solver-1.1-captcha-worker": {
      "type": "remote",
      "url": "http://solver-1.1-captcha-worker:8019",
      "enabled": true
    },
    "solver-2.1-survey-worker": {
      "type": "remote",
      "url": "http://solver-2.1-survey-worker:8018",
      "enabled": true
    },
    "builder-1-website-worker": {
      "type": "remote",
      "url": "http://builder-1-website-worker:8020",
      "enabled": true
    }
  }
}
```

---

## Sources & References

### Interne Dokumentation
- **CONTAINER-REGISTRY.md:** /Users/jeremy/dev/SIN-Solver/CONTAINER-REGISTRY.md
- **AGENTS.md:** /Users/jeremy/dev/SIN-Solver/AGENTS.md (Naming Convention)
- **ARCHITECTURE-MODULAR.md:** /Users/jeremy/dev/SIN-Solver/ARCHITECTURE-MODULAR.md

### Externe Referenzen
- **Docker Compose:** https://docs.docker.com/compose/
- **MCP Protocol:** https://modelcontextprotocol.io/

### Sessions
- **Session ID:** ses_3f8f80bf6ffe5HhrhI5WDu3okc
- **Datum:** 2026-01-28
- **Agent:** sisyphus

---

## Prevention Measures

1. **CONTAINER-REGISTRY.md pflegen** - Immer als Single Source of Truth verwenden
2. **Naming Convention Checks** - Pre-commit Hook für Container-Namen
3. **Automatische Validierung** - Script das MCP Config gegen Registry prüft
4. **Dokumentation aktuell halten** - Bei neuen Containern sofort eintragen

### Pre-Commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Prüfe Container-Namen in docker-compose.yml
if ! ./scripts/validate-container-names.sh; then
  echo "❌ Container naming convention violation!"
  exit 1
fi
```

---

## Verification

- [x] Alle Container-Namen korrigiert
- [x] MCP Config aktualisiert
- [x] Docker Compose Dateien angepasst
- [x] Container Registry erstellt
- [x] Alle Container erreichbar (`docker ps`)
- [x] MCP Server funktionieren (`opencode --version`)
- [x] Netzwerk-Konnektivität geprüft

---

**Erstellt:** 2026-01-30  
**Letzte Aktualisierung:** 2026-01-30  
**Verantwortlich:** Sisyphus Agent
