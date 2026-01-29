# MIGRATION PLAN: SIN-Komponenten nach /dev/sin-solver/

**Datum:** 2026-01-29  
**Status:** KRITISCH - Best Practices 2026 Compliance  
**Priorität:** HOCH

---

## 🚨 PROBLEM

Docker/Agent/Worker/MCP-Komponenten liegen VERSTREUT im Dateisystem:
- `/Users/jeremy/dev/sin-agent-zero-mcp/`
- `/Users/jeremy/dev/sin-chrome-devtools-mcp/`
- `/Users/jeremy/dev/sin-stagehand/`

Dies verstößt gegen Best Practices 2026:
- ❌ Keine zentrale Projektstruktur
- ❌ Schwierige Wartung
- ❌ Keine klare Zuordnung
- ❌ Verletzung MANDATE 0.8 (Modularität)

---

## 🎯 ZIEL

Alle SIN-Komponenten zentralisieren in `/Users/jeremy/dev/SIN-Solver/`

---

## 📋 KOMPONENTEN ZUR MIGRATION

### 1. sin-agent-zero-mcp
**Aktueller Pfad:** `/Users/jeremy/dev/sin-agent-zero-mcp/`  
**Ziel-Pfad:** `/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-agent-zero-mcp/`  
**Typ:** MCP Wrapper für Agent Zero Integration  
**Dateien:**
- Dockerfile
- package.json
- src/ (TypeScript)
- tsconfig.json

**Migrations-Schritte:**
1. [ ] Verzeichnis erstellen: `mkdir -p SIN-Solver/mcp-wrappers/sin-agent-zero-mcp`
2. [ ] Dateien kopieren (nicht verschieben - Backup!)
3. [ ] In AGENTS.md dokumentieren (nur HINZUFÜGEN!)
4. [ ] In CONTAINER-REGISTRY.md eintragen
5. [ ] docker-compose.yml erstellen
6. [ ] Testen: `docker build .`
7. [ ] Altes Verzeichnis umbenennen: `sin-agent-zero-mcp.migrated.2026-01-29`

---

### 2. sin-chrome-devtools-mcp
**Aktueller Pfad:** `/Users/jeremy/dev/sin-chrome-devtools-mcp/`  
**Ziel-Pfad:** `/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-chrome-devtools-mcp/`  
**Typ:** MCP Wrapper für Chrome DevTools  
**Dateien:**
- Dockerfile
- package.json
- src/
- tsconfig.json

**Migrations-Schritte:**
1. [ ] Verzeichnis erstellen
2. [ ] Dateien kopieren
3. [ ] In AGENTS.md dokumentieren (APPEND ONLY!)
4. [ ] In CONTAINER-REGISTRY.md eintragen
5. [ ] docker-compose.yml erstellen
6. [ ] Testen
7. [ ] Altes Verzeichnis umbenennen

---

### 3. sin-stagehand
**Aktueller Pfad:** `/Users/jeremy/dev/sin-stagehand/`  
**Ziel-Pfad:** `/Users/jeremy/dev/SIN-Solver/mcp-wrappers/sin-stagehand-mcp/`  
**Typ:** MCP Wrapper für Stagehand  
**Dateien:**
- Dockerfile
- package.json
- src/
- tsconfig.json

**Migrations-Schritte:**
1. [ ] Verzeichnis erstellen
2. [ ] Dateien kopieren
3. [ ] In AGENTS.md dokumentieren (APPEND ONLY!)
4. [ ] In CONTAINER-REGISTRY.md eintragen
5. [ ] docker-compose.yml erstellen
6. [ ] Testen
7. [ ] Altes Verzeichnis umbenennen

---

## 📁 ZIEL-STRUKTUR

```
/Users/jeremy/dev/SIN-Solver/
├── mcp-wrappers/
│   ├── sin-agent-zero-mcp/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   ├── tsconfig.json
│   │   └── docker-compose.yml
│   ├── sin-chrome-devtools-mcp/
│   │   ├── ...
│   │   └── docker-compose.yml
│   └── sin-stagehand-mcp/
│       ├── ...
│       └── docker-compose.yml
├── Docker/
│   └── ... (bestehende Container)
└── ...
```

---

## 📝 DOKUMENTATION (WICHTIG!)

### In AGENTS.md HINZUFÜGEN (NIEMALS LÖSCHEN!)

```markdown
## [2026-01-29] MIGRATION: MCP Wrapper Zentralisierung

**Aktion:** Migration verteilter MCP-Wrapper nach SIN-Solver

**Komponenten:**
- sin-agent-zero-mcp → mcp-wrappers/sin-agent-zero-mcp
- sin-chrome-devtools-mcp → mcp-wrappers/sin-chrome-devtools-mcp
- sin-stagehand → mcp-wrappers/sin-stagehand-mcp

**Grund:** Best Practices 2026 - Zentrale Projektstruktur

**Backup:**
- sin-agent-zero-mcp.migrated.2026-01-29
- sin-chrome-devtools-mcp.migrated.2026-01-29
- sin-stagehand.migrated.2026-01-29
```

### In lastchanges.md HINZUFÜGEN

```markdown
## [2026-01-29] [MCP-WRAPPER-MIGRATION]

**Migration:** 3 MCP-Wrapper zentralisiert
**Vorher:** Verstreut in /dev/
**Nachher:** In SIN-Solver/mcp-wrappers/
**Status:** ✅ Abgeschlossen
```

---

## ⚠️ WICHTIGE REGELN

1. **NIEMALS INHALTE LÖSCHEN** - Nur kopieren und umbenennen
2. **BACKUP ERSTELLEN** - _old oder .migrated.2026-01-29
3. **DOKUMENTATION** - In AGENTS.md nur HINZUFÜGEN
4. **TESTEN** - Jede Komponente nach Migration testen
5. **CONTAINER-REGISTRY** - Alle neuen Container eintragen

---

## ✅ AKZEPTANZKRITERIEN

- [ ] Alle 3 Komponenten in SIN-Solver/mcp-wrappers/
- [ ] Jede Komponente hat docker-compose.yml
- [ ] AGENTS.md aktualisiert (nur hinzugefügt)
- [ ] lastchanges.md dokumentiert
- [ ] CONTAINER-REGISTRY.md aktualisiert
- [ ] Alte Verzeichnisse umbenannt (nicht gelöscht)
- [ ] Build-Tests erfolgreich

---

**Erstellt:** 2026-01-29  
**Priorität:** KRITISCH für Best Practices 2026  
**Verantwortlich:** Atlas Orchestrator
