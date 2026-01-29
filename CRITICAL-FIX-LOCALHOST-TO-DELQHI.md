# KRITISCHER FIX: localhost zu delqhi.com

**Datum:** 2026-01-29  
**Prioritaet:** KRITISCH  
**Status:** IN ARBEIT

---

## PROBLEM

Alle Services verwenden localhost statt der oeffentlichen delqhi.com Domains.

**Gefundene localhost-Referenzen:**
- Dashboard: http://localhost:3011 
- API: http://localhost:8041
- Terminal: http://localhost:7681

**Folgen:**
- Services nicht ueber Cloudflare Tunnel erreichbar
- Externe Zugriffe blockiert

---

## LOESUNG

### Schritt 1: Build-Ordner loeschen
rm -rf /Users/jeremy/dev/Delqhi-Platform/dashboard/.next

### Schritt 2: Umgebungsvariablen setzen
export NEXT_PUBLIC_API_URL="https://api.delqhi.com"
export NEXT_PUBLIC_DASHBOARD_URL="https://dashboard.delqhi.com"

### Schritt 3: Neu bauen
cd /Users/jeremy/dev/Delqhi-Platform/dashboard
npm run build

### Schritt 4: Tests aktualisieren
- tests/dashboard.spec.js
- tests/e2e.spec.js
- playwright.config.js

---

## DOKUMENTATION

In AGENTS.md hinzufuegen:
[2026-01-29] [CRITICAL-FIX] localhost zu delqhi.com
