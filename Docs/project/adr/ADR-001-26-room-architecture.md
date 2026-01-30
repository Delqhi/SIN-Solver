# ADR-001: 26-Room Architecture

## Status

**Accepted** (2026-01-29)

## Context

Das SIN-Solver Projekt erforderte eine skalierbare, modulare Infrastruktur für 26+ unabhängige Services:
- AI Agents (n8n, Agent Zero, Steel Browser, etc.)
- Datenbanken (PostgreSQL, Redis, Supabase)
- Spezialisierte Worker (Captcha, Survey, Video)
- Infrastructure Services (Vault, Dashboard, etc.)

Die Herausforderungen waren:
1. **Service Discovery**: 26+ Services müssen sich finden können
2. **Netzwerk-Isolation**: Jeder Service braucht eigenen IP-Bereich
3. **Skalierbarkeit**: Neue Services einfach hinzufügen
4. **Wartbarkeit**: Klare Struktur für 100+ Container
5. **Dokumentation**: Jeder Service muss dokumentiert sein

## Decision

Wir entscheiden uns für eine **26-Room Architecture** mit folgenden Prinzipien:

### 1. Numerische Zuordnung (Room 01-26+)

Jeder Service erhält eine eindeutige Nummer:
- Room-01: n8n Orchestrator
- Room-02: Temporal Scheduler
- Room-03: Agent Zero
- Room-04: OpenCode Coder
- Room-05: Steel Browser
- Room-06: Skyvern Solver
- ...

### 2. Kategorisierung

```
agent-XX-*    → AI Agents & Orchestrators
room-XX-*     → Infrastructure & Storage
solver-X.X-*  → Money-Making Workers
builder-X-*   → Content Creation Workers
```

### 3. IP-Adressierung

```
172.20.0.0/16 Netzwerk
├── 172.20.0.10  → agent-01-n8n-manager
├── 172.20.0.20  → agent-05-steel-browser
├── 172.20.0.30  → agent-06-skyvern-solver
├── 172.20.0.100 → room-03-archiv-postgres
├── 172.20.0.200 → room-04-memory-redis
└── ...
```

### 4. Port-Schema

```
8XXX → Agent Services (8000-8999)
5432 → PostgreSQL
6379 → Redis
3000 → Web Dashboards
```

### 5. Domain-Mapping

```
https://n8n.delqhi.com      → agent-01-n8n-manager
https://steel.delqhi.com    → agent-05-steel-browser
https://captcha.delqhi.com  → solver-1.1-captcha-worker
```

## Consequences

### Positive

1. **Klare Struktur**: Jeder weiß sofort, wo ein Service gehört
2. **Einfache Skalierung**: Room-27, Room-28... folgen demselben Schema
3. **Dokumentation**: Nummerierung erzwingt Dokumentation
4. **Netzwerk-Planung**: IP-Bereiche sind vorhersehbar
5. **Team-Kommunikation**: "Room-05 hat ein Problem" ist eindeutig

### Negative

1. **Einarbeitung**: Neue Teammitglieder müssen das Schema lernen
2. **Refactoring**: Umbenennung erfordert Updates überall
3. **Limitierung**: 26 Rooms scheinen viel, können aber knapp werden

### Trade-offs

| Aspekt | Alternative | Warum 26-Room besser |
|--------|-------------|---------------------|
| Namensgebung | Beliebige Namen | Nummerierung erzwingt Ordnung |
| IPs | DHCP | Statische IPs für Predictability |
| Kategorien | Flache Struktur | Hierarchie für Übersicht |

## Alternatives Considered

### Alternative 1: Microservices ohne Nummerierung

```
n8n-service
temporal-scheduler
agent-zero
...
```

**Abgelehnt**: Keine klare Reihenfolge, schwierig zu dokumentieren

### Alternative 2: Kubernetes-Namespace-Per-Service

```
namespace: n8n
namespace: temporal
...
```

**Abgelehnt**: Zu komplex für aktuelle Anforderungen (siehe ADR-004)

### Alternative 3: Funktionsbasierte Gruppierung

```
orchestration/
  n8n/
  temporal/
browsers/
  steel/
  playwright/
```

**Abgelehnt**: Services überschneiden sich funktional, Nummerierung ist eindeutiger

## Implementation

### Directory Structure

```
SIN-Solver/
├── Docker/
│   ├── agents/
│   │   ├── agent-01-n8n-manager/
│   │   ├── agent-03-agentzero-orchestrator/
│   │   └── ...
│   ├── rooms/
│   │   ├── room-03-archiv-postgres/
│   │   ├── room-04-memory-redis/
│   │   └── ...
│   └── solvers/
│       ├── solver-1.1-captcha-worker/
│       └── solver-2.1-survey-worker/
```

### Docker Compose Network

```yaml
networks:
  sin-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Container Registry

Siehe: `CONTAINER-REGISTRY.md` für vollständige Mapping-Tabelle

## References

- [CONTAINER-REGISTRY.md](../../CONTAINER-REGISTRY.md)
- [ARCHITECTURE-MODULAR.md](../../ARCHITECTURE-MODULAR.md)
- [AGENTS.md](../../AGENTS.md) - Naming Convention

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-29 | Sisyphus | Initial ADR created |

---

**Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)**

Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
