# ADR-010: Free-First Philosophy

## Status

**Accepted** (2026-01-29)

## Context

Das SIN-Solver System hat viele externe Abhängigkeiten:
- AI Models (OpenAI, Anthropic, etc.)
- Cloud Services (AWS, GCP, Azure)
- APIs (Captcha-Solver, Proxy-Dienste)
- Datenbanken (hosted PostgreSQL, Redis Cloud)
- Monitoring (Datadog, New Relic)

Jede Abhängigkeit bedeutet:
- **Kosten**: Monatliche Gebühren
- **Vendor Lock-in**: Schwierig zu migrieren
- **Abhängigkeit**: Ausfall = System-Down
- **Privacy**: Daten auf fremden Servern

## Decision

Wir entscheiden uns für eine **Free-First Philosophy**:

> Bevorzuge kostenlose, self-hosted Lösungen über bezahlte Services.

### Prinzipien

1. **Self-Hosted > SaaS**: Eigene Infrastruktur
2. **Open Source > Commercial**: Freie Software
3. **Local AI > API**: Eigene Modelle
4. **Community > Enterprise**: Kostenlose Tiers

### Kosten-Entscheidungs-Matrix

| Kosten | Beispiel | Entscheidung |
|--------|----------|--------------|
| $0 (Self-Hosted) | Ollama, LocalAI | ✅ **PREFERRED** |
| $0 (Free Tier) | Cloudflare Tunnel | ✅ **ACCEPTABLE** |
| $<10/Monat | Hetzner VPS | ✅ **ACCEPTABLE** |
| $10-50/Monat | OpenAI API | ⚠️ **EVALUATE** |
| $50-100/Monat | AWS RDS | ❌ **AVOID** |
| $>100/Monat | Enterprise SaaS | ❌ **REJECT** |

### Free-First Stack

| Layer | Free Solution | Paid Alternative |
|-------|--------------|------------------|
| **AI Models** | OpenCode ZEN, Ollama | OpenAI, Anthropic |
| **Container Orchestration** | Docker Compose | Kubernetes (managed) |
| **Reverse Proxy** | Cloudflare Tunnel | AWS ALB, NGINX Plus |
| **Database** | Self-hosted PostgreSQL | AWS RDS, Cloud SQL |
| **Cache** | Self-hosted Redis | Redis Cloud |
| **Secret Management** | Vault | AWS Secrets Manager |
| **Monitoring** | Prometheus + Grafana | Datadog, New Relic |
| **Logging** | Loki + Grafana | Splunk, ELK |
| **CI/CD** | GitHub Actions | CircleCI, Travis |
| **Email** | BillionMail | SendGrid, Mailgun |
| **Search** | Meilisearch, Typesense | Algolia |
| **Captcha Solving** | ddddocr + YOLO | 2captcha API |

## Consequences

### Positive

1. **Kosteneinsparung**: $0 für die meisten Services
2. **Datensouveränität**: Daten bleiben auf eigenen Servern
3. **Kein Vendor Lock-in**: Einfach zu migrieren
4. **Lernen**: Tieferes Verständnis der Technologie
5. **Community**: Teil des Open Source Ökosystems
6. **Kontrolle**: Volle Kontrolle über Infrastruktur

### Negative

1. **Betriebsaufwand**: Mehr Zeit für Wartung
2. **Expertise nötig**: Team muss mehr wissen
3. **Kein Support**: Community-Support statt SLA
4. **Feature-Lücken**: Manche Features fehlen
5. **Skalierungsgrenzen**: Self-hosted hat Limits
6. **Sicherheitsverantwortung**: Eigene Sicherheit

### Trade-offs

| Aspekt | Paid Service | Free-First |
|--------|--------------|------------|
| Kosten | $$$ | $ |
| Zeitaufwand | Gering | Hoch |
| Kontrolle | Gering | Hoch |
| Support | 24/7 SLA | Community |
| Features | Alle | Basis |
| Skalierung | Unbegrenzt | Begrenzt |

## Alternatives Considered

### Alternative 1: Enterprise-First

```
Nur Enterprise-SaaS verwenden
AWS, GCP, Azure für alles
```

**Abgelehnt**:
- Hohe Kosten
- Vendor Lock-in
- Datensouveränität

**Wann besser?**
- Große Unternehmen
- Compliance-Anforderungen
- Keine Ops-Expertise

### Alternative 2: Hybrid

```
Kritisch = Enterprise
Nicht-kritisch = Free
```

**Abgelehnt**:
- Komplexere Architektur
- Zwei Welten zu warten
- Inkonsistent

**Wann besser?**
- Als Übergangslösung
- Spezifische Anforderungen
- Budget-Constraints

### Alternative 3: Pure Open Source

```
Nur FOSS (Free and Open Source Software)
Keine kommerziellen Komponenten
```

**Abgelehnt**:
- Zu restriktiv
- Manche Tools sind "freemium"
- Pragmatismus wichtig

**Wann besser?**
- Open Source Projekte
- Ideologische Gründe
- Community-Projekte

## Implementation

### Kosten-Tracking

```yaml
# docs/project/cost-tracking.yml
monthly_costs:
  infrastructure:
    hetzner_vps: 5.00
    domain: 1.00
  
  services:
    cloudflare_tunnel: 0.00  # Free tier
    github_actions: 0.00     # Free for public repos
  
  ai:
    opencode_zen: 0.00       # Free
    local_models: 0.00       # Self-hosted
  
  total: 6.00  # Target: < $10/month
```

### Evaluation-Checklist

```markdown
## Neue Service-Evaluation

### Name: [Service Name]

#### Kosten
- [ ] Kostenlos? → **ACCEPT**
- [ ] < $10/Monat? → **EVALUATE**
- [ ] > $10/Monat? → **REJECT**

#### Self-Hosted Alternative
- [ ] Gibt es eine self-hosted Version?
- [ ] Ist der Aufwand vertretbar?
- [ ] Passt zu unserem Stack?

#### Vendor Lock-in
- [ ] Einfach zu migrieren?
- [ ] Offene APIs?
- [ ] Daten-Export möglich?

#### Entscheidung
- [ ] **ACCEPT** (Free/Self-hosted)
- [ ] **EVALUATE** (Kosten < $10)
- [ ] **REJECT** (Kosten > $10)
```

### Free-First Alternativen

| Paid | Free Alternative | Migration Path |
|------|-----------------|---------------|
| OpenAI API | OpenCode ZEN | API-compatible |
| AWS RDS | Self-hosted PostgreSQL | pg_dump/pg_restore |
| Redis Cloud | Self-hosted Redis | Redis replication |
| Datadog | Prometheus + Grafana | Export metrics |
| SendGrid | BillionMail | SMTP-compatible |
| Algolia | Meilisearch | API-compatible |
| 2captcha | ddddocr + YOLO | Custom integration |

### Ausnahmen

Manche Services sind die Ausnahme von der Regel:

```markdown
## Ausnahmen (Approved)

### 1. Domain-Registrierung
- **Grund**: Kann nicht self-hosted werden
- **Kosten**: ~$10/Jahr
- **Approved**: ✅

### 2. VPS/Server
- **Grund**: Physische Infrastruktur nötig
- **Kosten**: ~$5/Monat (Hetzner)
- **Approved**: ✅

### 3. Critical AI (Fallback)
- **Grund**: Wenn Free-Modelle nicht ausreichen
- **Kosten**: Pay-per-use
- **Approved**: ⚠️ (Nur als Fallback)
```

## Beispiele

### ✅ Free-First Implementierungen

```typescript
// AI: OpenCode ZEN statt OpenAI
const response = await fetch('https://api.opencode.ai/v1/chat', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${ZEN_TOKEN}` },
  body: JSON.stringify({ model: 'zen/big-pickle', messages })
});
// Kosten: $0
```

```yaml
# Database: Self-hosted PostgreSQL
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
# Kosten: $0 (nur Storage)
```

```yaml
# Monitoring: Prometheus + Grafana
services:
  prometheus:
    image: prom/prometheus:latest
  grafana:
    image: grafana/grafana:latest
# Kosten: $0
```

### ❌ Rejected (zu teuer)

```typescript
// OpenAI API (Rejected)
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages
});
// Kosten: ~$0.03-0.06 pro 1K tokens
// Bei 100K tokens/Tag = ~$90-180/Monat
```

```yaml
# AWS RDS (Rejected)
# db.t3.micro = ~$15/Monat
# Plus Storage, Traffic, etc.
```

## Monitoring

```bash
# Monatliche Kosten prüfen
./scripts/check-costs.sh

# Ausgabe:
# Infrastructure: $6.00
# Services: $0.00
# AI: $0.00
# Total: $6.00 ✅ (Target: < $10)
```

## References

- [OpenCode ZEN](https://opencode.ai)
- [Ollama](https://ollama.ai)
- [Prometheus](https://prometheus.io)
- [Grafana](https://grafana.com)
- [BillionMail](https://billionmail.io)
- [Meilisearch](https://meilisearch.com)

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-29 | Sisyphus | Initial ADR created |

---

**Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)**

Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
