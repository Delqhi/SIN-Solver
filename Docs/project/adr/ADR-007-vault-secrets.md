# ADR-007: Vault für Secrets

## Status

**Accepted** (2026-01-29)

## Context

Das SIN-Solver System verwendet zahlreiche Secrets:
- API Keys (OpenAI, Cloudflare, etc.)
- Database Credentials
- JWT Signing Keys
- TLS Certificates
- OAuth Tokens
- Encryption Keys

Secret-Management-Optionen:
1. **Environment Variables**: Einfach, aber unsicher
2. **.env Files**: Besser, aber noch plaintext
3. **Docker Secrets**: Integriert, aber limitiert
4. **HashiCorp Vault**: Enterprise-grade, komplex
5. **AWS/GCP/Azure Secrets Manager**: Cloud-native
6. **1Password/Bitwarden**: User-freundlich, aber nicht für Apps

## Decision

Wir entscheiden uns für **HashiCorp Vault** (Room-02) als zentrales Secret-Management.

### Architektur

```
┌─────────────────────────────────────────────┐
│           Applications                       │
│  (n8n, Agents, Dashboard, Workers)          │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         Vault (Room-02)                      │
│  ┌─────────────┐  ┌─────────────┐           │
│  │   KV v2     │  │  Database   │           │
│  │   Secrets   │  │   Dynamic   │           │
│  └─────────────┘  └─────────────┘           │
│  ┌─────────────┐  ┌─────────────┐           │
│  │  Transit    │  │   PKI       │           │
│  │ Encryption  │  │  Certificates│          │
│  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         Storage Backend                      │
│      (PostgreSQL / File)                     │
└─────────────────────────────────────────────┘
```

### Vault Konfiguration

```yaml
services:
  room-02-tresor-secrets:
    image: hashicorp/vault:latest
    container_name: room-02-tresor-secrets
    cap_add:
      - IPC_LOCK
    environment:
      VAULT_ADDR: http://0.0.0.0:8200
      VAULT_API_ADDR: http://room-02-tresor-secrets:8200
    volumes:
      - vault_data:/vault/file
      - ./vault/config:/vault/config
    networks:
      sin-network:
        ipv4_address: 172.20.0.31
    ports:
      - "8200:8200"
    command: server -config=/vault/config/vault.hcl
```

### Vault Policy

```hcl
# vault/policies/sin-solver.hcl
# Read-only access to application secrets
path "secret/data/sin-solver/*" {
  capabilities = ["read"]
}

# Dynamic database credentials
path "database/creds/sin-solver" {
  capabilities = ["read"]
}

# Encryption operations
path "transit/encrypt/sin-solver" {
  capabilities = ["update"]
}

path "transit/decrypt/sin-solver" {
  capabilities = ["update"]
}
```

### Secret-Struktur

```
secret/
├── sin-solver/
│   ├── api-keys/
│   │   ├── openai
│   │   ├── cloudflare
│   │   └── stripe
│   ├── database/
│   │   ├── postgres-admin
│   │   └── redis-password
│   ├── jwt/
│   │   ├── signing-key
│   │   └── verification-key
│   └── tls/
│       ├── dashboard-cert
│       └── dashboard-key
```

### Integration

```typescript
// lib/vault.ts
import Vault from 'node-vault';

const vault = Vault({
  apiVersion: 'v1',
  endpoint: 'http://172.20.0.31:8200',
  token: process.env.VAULT_TOKEN,
});

export async function getSecret(path: string): Promise<string> {
  const { data } = await vault.read(`secret/data/${path}`);
  return data.data.value;
}

export async function getDatabaseCredentials(): Promise<{username: string, password: string}> {
  const { data } = await vault.read('database/creds/sin-solver');
  return {
    username: data.username,
    password: data.password,
  };
}
```

## Consequences

### Positive

1. **Zentrales Management**: Ein Ort für alle Secrets
2. **Audit Logging**: Wer hat wann auf welches Secret zugegriffen?
3. **Dynamic Secrets**: Automatisch rotierende DB-Credentials
4. **Encryption as a Service**: Vault kann für uns verschlüsseln
5. **PKI**: Automatische Zertifikats-Verwaltung
6. **Access Control**: Granulare Policies
7. **High Availability**: Kann clustered werden

### Negative

1. **Komplexität**: Steile Lernkurve
2. **Single Point of Failure**: Vault down = Secrets nicht verfügbar
3. **Overhead**: Für kleine Projekte "overkill"
4. **Token Management**: Vault selbst braucht Authentifizierung
5. **Backup-Kritikalität**: Vault-Daten müssen gesichert werden

### Trade-offs

| Aspekt | Alternative | Warum Vault besser |
|--------|-------------|-------------------|
| Einfachheit | .env Files | Sicherheit > Einfachheit |
| Kosten | Cloud Manager | Self-hosted, keine Vendor-Lock-in |
| Komplexität | Docker Secrets | Mehr Features, besseres Audit |

## Alternatives Considered

### Alternative 1: Environment Variables

```bash
# .env file
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
```

**Abgelehnt**:
- Plaintext in Environment
- Kein Audit-Trail
- Keine Rotation
- Schwierig zu teilen

**Wann besser?**
- Lokale Entwicklung
- Sehr kleine Projekte
- Schneller Prototyp

### Alternative 2: Docker Secrets

```yaml
secrets:
  openai_api_key:
    external: true

services:
  app:
    secrets:
      - openai_api_key
```

**Abgelehnt**:
- Nur in Docker Swarm
- Keine dynamische Rotation
- Kein Audit
- Statisch

**Wann besser?**
- Docker Swarm Umgebung
- Einfache statische Secrets
- Keine Rotation nötig

### Alternative 3: Cloud Provider (AWS Secrets Manager)

```
AWS Secrets Manager / Azure Key Vault / GCP Secret Manager
```

**Abgelehnt**:
- Vendor Lock-in
- Kosten pro Secret
- Internet-Verbindung nötig
- Datensouveränität

**Wann besser?**
- Cloud-native Architektur
- Multi-Region-Deployment
- Bestehende Cloud-Infrastruktur

### Alternative 4: 1Password/Bitwarden

```
1Password Connect / Bitwarden Secrets Manager
```

**Abgelehnt**:
- Nicht für automatisierte Systeme designed
- Lizenzkosten
- Weniger Features für Apps

**Wann besser?**
- Team-Secret-Sharing
- Manuelle Secret-Verwaltung
- Dev/Prod-Parität weniger wichtig

## Implementation

### Initialisierung

```bash
# 1. Vault starten
docker-compose up -d room-02-tresor-secrets

# 2. Vault initialisieren
docker exec -it room-02-tresor-secrets vault operator init

# 3. Unseal (mit 3 von 5 Keys)
vault operator unseal KEY1
vault operator unseal KEY2
vault operator unseal KEY3

# 4. Root Token sichern
export VAULT_TOKEN="hvs.XXXXXXXX"
```

### Secret-Setup

```bash
# KV v2 Engine aktivieren
vault secrets enable -path=secret kv-v2

# Secrets speichern
vault kv put secret/sin-solver/api-keys/openai value="sk-..."
vault kv put secret/sin-solver/database/postgres-admin password="..."

# Lesen
vault kv get secret/sin-solver/api-keys/openai
```

### AppRole Authentifizierung

```bash
# AppRole für Services erstellen
vault auth enable approle

vault write auth/approle/role/sin-solver \
  token_policies="sin-solver" \
  token_ttl=1h \
  token_max_ttl=4h

# Role ID und Secret ID holen
vault read auth/approle/role/sin-solver/role-id
vault write -f auth/approle/role/sin-solver/secret-id
```

### Backup

```bash
#!/bin/bash
# scripts/backup-vault.sh

# Vault muss unsealed sein
docker exec room-02-tresor-secrets vault operator raft snapshot save /tmp/vault.snapshot

docker cp room-02-tresor-secrets:/tmp/vault.snapshot backup/vault_$(date +%Y%m%d).snapshot
```

## References

- [Vault Docs](https://developer.hashicorp.com/vault/docs)
- [Vault Security Model](https://developer.hashicorp.com/vault/docs/internals/security)
- [room-02-tresor-secrets/README.md](../../../room-02-tresor-secrets/README.md)
- [VAULT-API.md](../../VAULT-API.md)

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-29 | Sisyphus | Initial ADR created |

---

**Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)**

Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
