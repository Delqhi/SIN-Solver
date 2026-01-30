# Architecture Decision Records (ADR)

Dieses Verzeichnis enthält alle Architecture Decision Records (ADRs) für das SIN-Solver Projekt.

## Was sind ADRs?

Architecture Decision Records dokumentieren wichtige architektonische Entscheidungen, die während der Entwicklung getroffen wurden. Sie beantworten:

- **Warum** wurde diese Entscheidung getroffen?
- **Welche Alternativen** wurden erwogen?
- **Was sind die Konsequenzen** dieser Entscheidung?

## ADR-Liste

| # | Titel | Status | Datum |
|---|-------|--------|-------|
| [ADR-001](ADR-001-26-room-architecture.md) | 26-Room Architecture | ✅ Accepted | 2026-01-29 |
| [ADR-002](ADR-002-cloudflare-tunnel.md) | Cloudflare Tunnel statt Direkter IPs | ✅ Accepted | 2026-01-29 |
| [ADR-003](ADR-003-mcp-wrapper-pattern.md) | MCP Wrapper Pattern | ✅ Accepted | 2026-01-29 |
| [ADR-004](ADR-004-docker-compose-vs-kubernetes.md) | Docker Compose statt Kubernetes | ✅ Accepted | 2026-01-29 |
| [ADR-005](ADR-005-nextjs-14-dashboard.md) | Next.js 14 für Dashboard | ✅ Accepted | 2026-01-29 |
| [ADR-006](ADR-006-postgresql-redis.md) | PostgreSQL + Redis | ✅ Accepted | 2026-01-29 |
| [ADR-007](ADR-007-vault-secrets.md) | Vault für Secrets | ✅ Accepted | 2026-01-29 |
| [ADR-008](ADR-008-26-pillar-documentation.md) | 26-Pillar Documentation | ✅ Accepted | 2026-01-29 |
| [ADR-009](ADR-009-semantic-commits.md) | Semantic Commits | ✅ Accepted | 2026-01-29 |
| [ADR-010](ADR-010-free-first-philosophy.md) | Free-First Philosophy | ✅ Accepted | 2026-01-29 |

## ADR-Format

Jede ADR folgt diesem Template:

```markdown
# ADR-XXX: Titel

## Status
- Proposed | Accepted | Deprecated | Superseded

## Context
Was ist der Hintergrund? Welches Problem lösen wir?

## Decision
Was haben wir entschieden?

## Consequences
- Positive: Was ist besser?
- Negative: Was ist schlechter?
- Trade-offs: Was haben wir aufgegeben?

## Alternatives Considered
Welche anderen Optionen gab es? Warum abgelehnt?

## Implementation
Wie wurde es umgesetzt?

## References
Links zu relevanten Dokumenten.
```

## Status-Legende

| Status | Bedeutung |
|--------|-----------|
| **Proposed** | Vorgeschlagen, noch nicht entschieden |
| **Accepted** | Entschieden und implementiert |
| **Deprecated** | Veraltet, wird nicht mehr verwendet |
| **Superseded** | Ersetzt durch neuere ADR |

## Neue ADR erstellen

1. Nächste Nummer vergeben (ADR-011, ADR-012, ...)
2. Template kopieren und ausfüllen
3. In dieses Verzeichnis speichern
4. Diesen Index aktualisieren
5. Cross-References zu Code und Docs hinzufügen

## Cross-References

### Zu Code
- [CONTAINER-REGISTRY.md](../../CONTAINER-REGISTRY.md) - ADR-001, ADR-002
- [ARCHITECTURE-MODULAR.md](../../ARCHITECTURE-MODULAR.md) - ADR-001, ADR-004
- [mcp-wrappers/](../../../mcp-wrappers/) - ADR-003
- [Docker/](../../../Docker/) - ADR-001, ADR-004, ADR-006, ADR-007

### Zu Dokumentation
- [26-PILLAR-INDEX.md](../../26-PILLAR-INDEX.md) - ADR-008
- [DOCS.md](../../DOCS.md) - ADR-008, ADR-009
- [AGENTS.md](../../AGENTS.md) - ADR-003, ADR-008, ADR-009, ADR-010
- [SECURITY-WHITEPAPER.md](../../SECURITY-WHITEPAPER.md) - ADR-002, ADR-007

---

**Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)**

Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
