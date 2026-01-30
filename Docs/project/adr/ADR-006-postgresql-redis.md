# ADR-006: PostgreSQL + Redis

## Status

**Accepted** (2026-01-29)

## Context

Das SIN-Solver System benötigt persistente Datenspeicherung für:
- **Konfigurationen**: Service-Einstellungen, API-Keys
- **Logs**: Container-Logs, Audit-Trails
- **State**: Workflow-Status, Queue-Informationen
- **Cache**: Session-Daten, API-Responses
- **Metriken**: Performance-Daten, Health-Checks

Datenbank-Optionen:
1. **PostgreSQL**: Relational, ACID, JSON-Support
2. **MySQL/MariaDB**: Relational, weit verbreitet
3. **MongoDB**: Document, schema-frei
4. **SQLite**: Embedded, serverlos
5. **Redis**: In-Memory, Key-Value, Cache
6. **Cassandra**: Distributed, Column-Family

## Decision

Wir entscheiden uns für **PostgreSQL** als primäre Datenbank und **Redis** als Cache/Queue.

### Architektur

```
┌─────────────────────────────────────────────┐
│              Application Layer               │
│  (n8n, Agents, Dashboard, Workers)          │
└─────────────────┬───────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
    ▼                           ▼
┌──────────┐            ┌──────────────┐
│PostgreSQL│            │    Redis     │
│(Room-03) │            │  (Room-04)   │
├──────────┤            ├──────────────┤
│Configs   │            │Sessions      │
│Logs      │            │Cache         │
│State     │            │Queues        │
│Audit     │            │Pub/Sub       │
│Metrics   │            │Rate Limiting │
└──────────┘            └──────────────┘
```

### PostgreSQL (Room-03)

```yaml
services:
  room-03-archiv-postgres:
    image: postgres:16-alpine
    container_name: room-03-archiv-postgres
    environment:
      POSTGRES_DB: sinsolver
      POSTGRES_USER: sinadmin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init:/docker-entrypoint-initdb.d
    networks:
      sin-network:
        ipv4_address: 172.20.0.100
    ports:
      - "5432:5432"
```

#### Schema-Design

```sql
-- Services Registry
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    container_name VARCHAR(100) NOT NULL,
    ip_address INET NOT NULL,
    port INTEGER NOT NULL,
    domain VARCHAR(255),
    status VARCHAR(20) DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configuration Store
CREATE TABLE configurations (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id),
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_id, key)
);

-- Logs
CREATE TABLE logs (
    id BIGSERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id),
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Trail
CREATE TABLE audit_trail (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    changes JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_logs_service_timestamp ON logs(service_id, timestamp DESC);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_audit_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX idx_configurations_key ON configurations(service_id, key);
```

### Redis (Room-04)

```yaml
services:
  room-04-memory-redis:
    image: redis:7-alpine
    container_name: room-04-memory-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      sin-network:
        ipv4_address: 172.20.0.200
    ports:
      - "6379:6379"
```

#### Redis Use Cases

```javascript
// Session Store
await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(userData));

// Cache
await redis.setex(`cache:api:${key}`, 300, JSON.stringify(response));

// Rate Limiting
const current = await redis.incr(`ratelimit:${ip}`);
if (current === 1) await redis.expire(`ratelimit:${ip}`, 60);

// Queue
await redis.lpush('queue:tasks', JSON.stringify(task));
const task = await redis.brpop('queue:tasks', 0);

// Pub/Sub
await redis.publish('channel:updates', JSON.stringify(update));
```

## Consequences

### Positive

1. **PostgreSQL**:
   - ACID-Compliance für kritische Daten
   - JSONB für flexible Schemas
   - Erweiterte Features (Window Functions, CTEs)
   - Große Community, viele Tools
   - Open Source, keine Lizenzkosten

2. **Redis**:
   - Extrem schnell (In-Memory)
   - Vielseitig (Cache, Queue, Pub/Sub)
   - Einfache API
   - Persistence optional
   - Open Source

3. **Kombination**:
   - Best of both worlds
   - Klare Trennung: Persistent vs. Cache
   - Skalierbar unabhängig

### Negative

1. **PostgreSQL**:
   - Höherer Ressourcenverbrauch als SQLite
   - Setup-Komplexität
   - Backup-Strategie nötig

2. **Redis**:
   - Datenverlust bei Crash (ohne AOF)
   - RAM-limitiert
   - Keine komplexen Queries

3. **Zwei Systeme**:
   - Mehr Komplexität als eine DB
   - Zwei Verbindungen zu managen
   - Consistency zwischen DB und Cache

### Trade-offs

| Aspekt | Alternative | Warum PostgreSQL+Redis besser |
|--------|-------------|------------------------------|
| Einfachheit | SQLite allein | Skalierbarkeit, Concurrency |
| Performance | MongoDB | ACID für kritische Daten |
| Flexibilität | MySQL | JSONB, bessere Features |

## Alternatives Considered

### Alternative 1: SQLite

```
SQLite für alles (eingebettet)
```

**Abgelehnt**:
- Keine Concurrency für schreibende Zugriffe
- Nicht für Multi-Container geeignet
- Kein Netzwerk-Zugriff

**Wann besser?**
- Single-User-Anwendungen
- Embedded Systems
- Prototypen

### Alternative 2: MongoDB

```
MongoDB als Document Store
```

**Abgelehnt**:
- Keine ACID-Transaktionen (früher)
- Komplexeres Query-System
- Weniger reifes Ökosystem

**Wann besser?**
- Schema-freie Daten
- Horizontale Skalierung
- Document-Struktur passt besser

### Alternative 3: MySQL/MariaDB

```
MySQL als relationale DB
```

**Abgelehnt**:
- PostgreSQL hat bessere Features
- JSONB überlegen zu MySQL JSON
- Lizenz-Uncertainties bei MySQL

**Wann besser?**
- Bestehende MySQL-Infrastruktur
- Spezifische MySQL-Features nötig

### Alternative 4: Single Database (nur PostgreSQL)

```
PostgreSQL für alles (inkl. Cache mit UNLOGGED tables)
```

**Abgelehnt**:
- Redis ist schneller für Cache
- Redis Queues sind eleganter
- Getrennte Skalierung wichtig

**Wann besser?**
- Einfachheit priorisiert
- Weniger Infrastruktur
- Keine hohe Last

## Implementation

### Connection Pooling

```typescript
// lib/db.ts
import { Pool } from 'pg';

export const pgPool = new Pool({
  host: '172.20.0.100',
  port: 5432,
  database: 'sinsolver',
  user: 'sinadmin',
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// lib/redis.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: '172.20.0.200',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});
```

### Backup Strategy

```bash
#!/bin/bash
# scripts/backup.sh

# PostgreSQL Backup
docker exec room-03-archiv-postgres pg_dump -U sinadmin sinsolver > backup/sinsolver_$(date +%Y%m%d).sql

# Redis Backup (AOF already enabled)
docker exec room-04-memory-redis redis-cli BGSAVE

# Upload to S3 (optional)
aws s3 cp backup/ s3://sin-solver-backups/ --recursive
```

### Monitoring

```sql
-- PostgreSQL Health Check
SELECT 1;

-- Connection Count
SELECT count(*) FROM pg_stat_activity;

-- Table Sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname='public';
```

```bash
# Redis Health Check
redis-cli ping

# Memory Usage
redis-cli INFO memory

# Connected Clients
redis-cli INFO clients
```

## References

- [PostgreSQL 16 Docs](https://www.postgresql.org/docs/16/)
- [Redis 7 Docs](https://redis.io/docs/)
- [room-03-archiv-postgres/README.md](../../../room-03-archiv-postgres/README.md)
- [room-04-memory-redis/README.md](../../../room-04-memory-redis/README.md)

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-29 | Sisyphus | Initial ADR created |

---

**Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)**

Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
