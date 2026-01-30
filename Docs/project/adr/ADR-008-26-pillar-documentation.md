# ADR-008: 26-Pillar Documentation

## Status

**Accepted** (2026-01-29)

## Context

Das SIN-Solver System ist komplex:
- 26+ Services
- 100+ Container
- Mehrere Programmiersprachen
- Verschiedene Teams
- Langfristige Wartung

Dokumentations-Herausforderungen:
1. **Wissen geht verloren**: Team-Wechsel, Zeit
2. **Inkonsistenz**: Jeder dokumentiert anders
3. **Unvollständigkeit**: Wichtige Details fehlen
4. **Schlechte Auffindbarkeit**: Docs verteilt überall
5. **Veralterung**: Docs nicht aktuell

## Decision

Wir entscheiden uns für ein **26-Pillar Documentation System**.

### Das 26-Pillar Konzept

Jedes Modul/Projekt hat genau 26 Dokumentations-Dateien:

```
docs/[module-name]/
├── 01-[name]-overview.md          # Übersicht
├── 02-[name]-lastchanges.md       # Änderungshistorie
├── 03-[name]-troubleshooting.md   # Problemlösungen
├── 04-[name]-architecture.md      # Architektur
├── 05-[name]-api-reference.md     # API Dokumentation
├── 06-[name]-configuration.md     # Konfiguration
├── 07-[name]-deployment.md        # Deployment
├── 08-[name]-security.md          # Sicherheit
├── 09-[name]-performance.md       # Performance
├── 10-[name]-testing.md           # Testing
├── 11-[name]-monitoring.md        # Monitoring
├── 12-[name]-integration.md       # Integrationen
├── 13-[name]-migration.md         # Migration
├── 14-[name]-backup.md            # Backup
├── 15-[name]-scaling.md           # Skalierung
├── 16-[name]-maintenance.md       # Wartung
├── 17-[name]-compliance.md        # Compliance
├── 18-[name]-accessibility.md     # Barrierefreiheit
├── 19-[name]-localization.md      # Lokalisierung
├── 20-[name]-analytics.md         # Analytics
├── 21-[name]-support.md           # Support
├── 22-[name]-roadmap.md           # Roadmap
├── 23-[name]-glossary.md          # Glossar
├── 24-[name]-faq.md               # FAQ
├── 25-[name]-examples.md          # Beispiele
└── 26-[name]-appendix.md          # Anhang
```

### Pillar-Kategorien

| # | Pillar | Purpose | Audience |
|---|--------|---------|----------|
| 1 | Overview | Schneller Einstieg | Alle |
| 2 | Lastchanges | Was wurde wann geändert? | Entwickler |
| 3 | Troubleshooting | Bekannte Probleme | Ops |
| 4 | Architecture | System-Design | Architekten |
| 5 | API Reference | Technische Details | Entwickler |
| 6 | Configuration | Setup-Anleitung | DevOps |
| 7 | Deployment | Wie deployt man? | DevOps |
| 8 | Security | Sicherheitsaspekte | Security |
| 9 | Performance | Optimierung | Performance |
| 10 | Testing | Test-Strategie | QA |
| 11 | Monitoring | Observability | Ops |
| 12 | Integration | Mit anderen Systemen | Integratoren |
| 13 | Migration | Umzug/Upgrade | Migration |
| 14 | Backup | Datensicherung | Ops |
| 15 | Scaling | Wachstum | Architekten |
| 16 | Maintenance | Wartung | Ops |
| 17 | Compliance | Regulatorisches | Compliance |
| 18 | Accessibility | Barrierefreiheit | UX |
| 19 | Localization | Mehrsprachigkeit | i18n |
| 20 | Analytics | Datenanalyse | Product |
| 21 | Support | Hilfe für Nutzer | Support |
| 22 | Roadmap | Zukunftspläne | Product |
| 23 | Glossary | Begriffe | Alle |
| 24 | FAQ | Häufige Fragen | Alle |
| 25 | Examples | Code-Beispiele | Entwickler |
| 26 | Appendix | Zusätzliches | Alle |

### Mindestgröße

Jede Pillar-Datei muss **mindestens 500 Zeilen** haben (wenn anwendbar).

Warum 500 Zeilen?
- Erzwingt gründliche Dokumentation
- Verhindert oberflächliche Beschreibungen
- Sichert langfristiges Wissen

Ausnahmen:
- 02-lastchanges.md: Append-only, wächst automatisch
- 24-faq.md: Kann kürzer sein, wenn wenige Fragen

### Trinity Documentation Standard

Zusätzlich zu den 26 Pillars pro Modul:

```
/project-root/
├── docs/
│   ├── non-dev/       # Für Nutzer
│   ├── dev/           # Für Entwickler
│   ├── project/       # Für das Team
│   └── postman/       # API Collections
├── DOCS.md            # Dokumentations-Regeln
└── README.md          # Einstiegspunkt
```

## Consequences

### Positive

1. **Vollständigkeit**: Keine Lücken in der Dokumentation
2. **Konsistenz**: Jedes Modul gleiche Struktur
3. **Auffindbarkeit**: Man weiß sofort, wo was steht
4. **Qualität**: 500-Zeilen-Minimum erzwingt Tiefe
5. **Onboarding**: Neue Teammitglieder finden sich schneller
6. **Wartung**: Struktur erleichtert Updates

### Negative

1. **Overhead**: 26 Dateien pro Modul = viel Dokumentation
2. **Wartungsaufwand**: Docs müssen aktuell gehalten werden
3. **Redundanz**: Manche Informationen wiederholen sich
4. **Einarbeitung**: Neues Team muss System lernen

### Trade-offs

| Aspekt | Alternative | Warum 26-Pillar besser |
|--------|-------------|----------------------|
| Einfachheit | README-only | Langfristige Wartbarkeit |
| Flexibilität | Freie Struktur | Konsistenz über Module |
| Aufwand | Weniger Docs | Vollständigkeit |

## Alternatives Considered

### Alternative 1: README-Only

```
project/
└── README.md  # Alles hier
```

**Abgelehnt**:
- Wird schnell unübersichtlich
- Keine Struktur
- Schwer zu warten

**Wann besser?**
- Sehr kleine Projekte
- Einmalige Scripts
- Interne Tools

### Alternative 2: Wiki (Confluence/Notion)

```
Externes Wiki-System
```

**Abgelehnt**:
- Nicht versioniert mit Code
- Externe Abhängigkeit
- Schwer zu synchronisieren

**Wann besser?**
- Nicht-technische Dokumentation
- Team-Kommunikation
- Prozess-Dokumentation

### Alternative 3: Generated Docs (Swagger/JSDoc)

```
Code → Auto-generated Docs
```

**Abgelehnt**:
- Nur API-Referenz
- Keine Architektur-Doku
- Keine Prozess-Doku

**Wann besser?**
- API-Referenz (als Ergänzung)
- Code-Documentation
- Schnelle Übersicht

### Alternative 4: 12-Pillar (Reduziert)

```
Nur 12 statt 26 Pillars
```

**Abgelehnt**:
- Zu wenig spezifisch
- Wichtige Aspekte fehlen
- 26 erzwingt Gründlichkeit

**Wann besser?**
- Kleinere Projekte
- Weniger komplexe Systeme
- Schneller Einstieg

## Implementation

### Template pro Pillar

```markdown
# 01-[Module]-Overview.md

## Zusammenfassung

**Modul**: [Name]
**Zweck**: [Eine-Satz-Beschreibung]
**Status**: [Active/Deprecated/Experimental]

## Schnellstart

```bash
# Installation
npm install @sin-solver/[module]

# Grundlegende Nutzung
const client = new Client();
await client.connect();
```

## Architektur-Übersicht

```
[Diagramm]
```

## Key Features

1. **Feature 1**: Beschreibung
2. **Feature 2**: Beschreibung

## Abhängigkeiten

- PostgreSQL 16+
- Redis 7+
- Node.js 20+

## Links

- [Architecture](04-[module]-architecture.md)
- [API Reference](05-[module]-api-reference.md)
- [Deployment](07-[module]-deployment.md)

---

**Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)**

Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
```

### DOCS.md (Dokumentations-Regeln)

```markdown
# DOCS.md

## Dokumentations-Struktur

Dieses Projekt folgt dem **26-Pillar Documentation Standard**.

## Verzeichnisstruktur

```
docs/
├── [module]/           # Modul-spezifische Docs
│   ├── 01-*-overview.md
│   └── ... (26 Pillars)
├── non-dev/            # Nutzer-Dokumentation
├── dev/                # Entwickler-Dokumentation
├── project/            # Team-Dokumentation
└── postman/            # API Collections
```

## Regeln

1. **Mindestgröße**: 500 Zeilen pro Pillar
2. **Sprache**: Deutsch oder Englisch (konsistent)
3. **Format**: Markdown
4. **Links**: Kreuzverweise zwischen Pillars
5. **Updates**: Bei jeder Code-Änderung

## Review-Prozess

- Docs müssen im PR reviewt werden
- Kein Merge ohne Doc-Update
- 26-Pillar-Checklist in PR-Template
```

### Checklist-Template

```markdown
## PR Checklist

### Code
- [ ] Tests geschrieben
- [ ] Linting bestanden
- [ ] Type-Checks bestanden

### Dokumentation
- [ ] 02-lastchanges.md aktualisiert
- [ ] Betroffene Pillars aktualisiert
- [ ] API-Changes in 05-api-reference.md
- [ ] Breaking Changes dokumentiert
- [ ] Beispiele in 25-examples.md
```

## Beispiel: SIN-Solver Docs

```
docs/
├── project/
│   ├── adr/                    # Architecture Decision Records
│   │   ├── ADR-001-26-room-architecture.md
│   │   └── ...
│   └── 01-sin-solver-overview.md
├── non-dev/
│   └── user-guide.md
├── dev/
│   ├── api-reference/
│   └── architecture/
└── postman/
    └── SIN-Solver-API.json
```

## References

- [26-PILLAR-INDEX.md](../../26-PILLAR-INDEX.md)
- [DOCS.md](../../DOCS.md)
- [AGENTS.md](../../AGENTS.md) - MANDATE 0.16

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-29 | Sisyphus | Initial ADR created |

---

**Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)**

Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
