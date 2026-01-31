# ADR-004: Docker Compose statt Kubernetes

## Status

**Accepted** (2026-01-29)

## Context

Das SIN-Solver System betreibt 26+ Container. Für Container-Orchestrierung stehen mehrere Optionen:

1. **Docker Compose**: Einfach, single-node, deklarativ
2. **Kubernetes**: Komplex, multi-node, industry standard
3. **Docker Swarm**: Mittelweg, eingebaut in Docker
4. **Nomad**: HashiCorp-Alternative

Anforderungen:
- Einfache lokale Entwicklung
- Single-Server-Deployment
- Schnelle Iteration
- Geringe Betriebskosten
- Kein Vendor-Lock-in

## Decision

Wir entscheiden uns für **Docker Compose** als primäre Orchestrierungslösung.

### Architektur

```
Single Server (Mac Mini / VPS)
├── Docker Compose
│   ├── docker-compose.yml (Core Services)
│   ├── docker-compose.agents.yml
│   ├── docker-compose.rooms.yml
│   └── docker-compose.solvers.yml
└── Cloudflare Tunnel (External Access)
```

### Modular Compose

```yaml
# docker-compose.yml - Core
version: '3.8'
services:
  cloudflared:
    extends:
      file: docker-compose.network.yml
      service: cloudflared

networks:
  sin-network:
    external: true
```

```yaml
# docker-compose.agents.yml
version: '3.8'
services:
  agent-01-n8n:
    image: n8nio/n8n:latest
    container_name: agent-01-n8n-manager
    networks:
      sin-network:
        ipv4_address: 172.20.0.10
    # ...
```

### Deployment-Workflow

```bash
# 1. Netzwerk erstellen
docker network create --subnet=172.20.0.0/16 sin-network

# 2. Core starten
docker-compose up -d

# 3. Agents starten
docker-compose -f docker-compose.agents.yml up -d

# 4. Rooms starten
docker-compose -f docker-compose.rooms.yml up -d

# 5. Solvers starten
docker-compose -f docker-compose.solvers.yml up -d
```

## Consequences

### Positive

1. **Einfachheit**: Eine Datei pro Service-Gruppe
2. **Schnell**: Keine komplexe Setup-Zeit
3. **Lokal entwickelbar**: Identisch auf Dev/Prod
4. **Kein K8s-Wissen nötig**: Geringere Einstiegshürde
5. **Ressourcen-schonend**: Kein K8s-Control-Plane Overhead
6. **Debugging**: Einfacher Zugriff auf Container

### Negative

1. **Kein Auto-Scaling**: Manuelle Skalierung
2. **Single Point of Failure**: Ein Server
3. **Kein Service Discovery**: Statische IPs nötig
4. **Kein Rolling Update**: Downtime bei Updates
5. **Limitiert**: Nicht für 100+ Container geeignet

### Trade-offs

| Aspekt | Kubernetes | Docker Compose |
|--------|------------|----------------|
| Komplexität | Hoch | Niedrig |
| Lernkurve | Steil | Flach |
| Ressourcen | 2GB+ für Control Plane | Minimal |
| Skalierung | Horizontal | Vertikal |
| Hochverfügbarkeit | Ja | Nein |
| Betriebskosten | $$$ | $ |

## Alternatives Considered

### Alternative 1: Kubernetes (k3s/microk8s)

```
Single-Node Kubernetes für lokale Entwicklung
```

**Abgelehnt**:
- Overhead für 26 Container nicht gerechtfertigt
- Steile Lernkurve
- Komplexere Debugging
- Mehr Ressourcen nötig

**Wann Kubernetes?**
- >50 Container
- Multi-Node-Requirement
- Auto-Scaling nötig
- Team mit K8s-Expertise

### Alternative 2: Docker Swarm

```
docker swarm init
docker stack deploy -c docker-compose.yml sin-solver
```

**Abgelehnt**:
- Docker Swarm wird weniger gepflegt
- Kein signifikanter Vorteil gegenüber Compose
- Komplexer als nötig

### Alternative 3: Nomad

```
HashiCorp Nomad als leichtgewichtige Alternative
```

**Abgelehnt**:
- Zusätzliche Komplexität
- Weniger Community-Support
- Kein Vorteil für unseren Use Case

### Alternative 4: Podman + Podman Compose

```
Rootless Container als Alternative zu Docker
```

**Abgelehnt**:
- Docker ist etablierter Standard
- Podman hat Kompatibilitätsprobleme
- Kein Vorteil für unseren Use Case

## Migration Path

### Phase 1: Docker Compose (Current)

- Alle 26 Services in Compose
- Single-Server-Deployment
- Manuelles Management

### Phase 2: Kubernetes (Future)

Wenn nötig:
- k3s für leichtgewichtiges K8s
- Kompose für Migration (docker-compose.yml → k8s manifests)
- Schrittweise Migration pro Service

```bash
# Kompose Beispiel
kompose convert -f docker-compose.yml
kubectl apply -f .
```

## Implementation

### Directory Structure

```
SIN-Solver/
├── Docker/
│   ├── docker-compose.yml
│   ├── docker-compose.agents.yml
│   ├── docker-compose.rooms.yml
│   ├── docker-compose.solvers.yml
│   └── docker-compose.override.yml (local dev)
├── scripts/
│   ├── start-all.sh
│   ├── stop-all.sh
│   └── restart-service.sh
└── .env (secrets)
```

### Start-Skript

```bash
#!/bin/bash
# scripts/start-all.sh

docker network create --subnet=172.20.0.0/16 sin-network 2>/dev/null || true

docker-compose up -d
docker-compose -f docker-compose.agents.yml up -d
docker-compose -f docker-compose.rooms.yml up -d
docker-compose -f docker-compose.solvers.yml up -d

echo "All services started!"
```

### Monitoring

```bash
# Alle Services
docker-compose ps
docker-compose -f docker-compose.agents.yml ps

# Logs
docker-compose logs -f agent-01-n8n

# Ressourcen
docker stats
```

## References

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [ARCHITECTURE-MODULAR.md](../../ARCHITECTURE-MODULAR.md)
- [DEPLOYMENT-GUIDE.md](../../DEPLOYMENT-GUIDE.md)

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-29 | Sisyphus | Initial ADR created |

---

**Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)**

Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
