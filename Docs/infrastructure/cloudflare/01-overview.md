# Cloudflare Tunnel Infrastructure - Overview

**Document ID:** 01-cloudflare-overview  
**Version:** 1.0  
**Last Updated:** 2026-01-30  
**Status:** ACTIVE - PRODUCTION READY  
**Compliance:** 26-Pillar Documentation Standard (Pillar 1: Overview)

---

## Executive Summary

The Cloudflare Tunnel infrastructure provides secure, encrypted public access to all Delqhi-Platform services without exposing internal infrastructure. Using Cloudflare's Zero Trust network, we route traffic from public domains through secure tunnels to internal Docker containers.

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Security** | No public IP exposure; all traffic encrypted via Cloudflare |
| **Simplicity** | No firewall rules, port forwarding, or VPN required |
| **Reliability** | Cloudflare's global network with 99.99% uptime SLA |
| **Performance** | Argo Smart Routing for optimal path selection |
| **Zero Trust** | Identity-aware access with Cloudflare Access integration |

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PUBLIC INTERNET                                      │
│  Users → DNS (Cloudflare) → Cloudflare Edge Network                         │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Encrypted Tunnel (TLS 1.3)
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE TUNNEL (cloudflared)                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  room-00-cloudflared-tunnel                                           │  │
│  │  Container: cloudflare/cloudflared:latest                             │  │
│  │  Network: sin-solver-network (172.20.0.0/16)                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Internal Docker Network
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      INTERNAL SERVICES (Docker)                              │
│                                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Dashboard    │ │ n8n          │ │ API Brain    │ │ Vault        │       │
│  │ (Port 3011)  │ │ (Port 5678)  │ │ (Port 8000)  │ │ (Port 8200)  │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Steel        │ │ Skyvern      │ │ Survey       │ │ Captcha      │       │
│  │ (Port 3000)  │ │ (Port 8000)  │ │ (Port 8018)  │ │ (Port 8019)  │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Supabase     │ │ NocoDB       │ │ Plane        │ │ Hoppscotch   │       │
│  │ (Port 3000)  │ │ (Port 8080)  │ │ (Port 8216)  │ │ (Port 3000)  │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Traffic Flow

1. **User Request** → Public DNS resolves to Cloudflare edge
2. **Cloudflare Edge** → Applies WAF rules, DDoS protection, Access policies
3. **Encrypted Tunnel** → Traffic routed through secure tunnel to origin
4. **cloudflared** → Receives traffic, routes to internal service based on hostname
5. **Internal Service** → Processes request, returns response through same path

---

## Tunnel Configuration

### Tunnel Identity

| Property | Value |
|----------|-------|
| **Tunnel Name** | Delqhi-Platform |
| **Tunnel ID** | (Stored in credentials.json) |
| **Credentials File** | `infrastructure/cloudflare/credentials.json` |
| **Config File** | `infrastructure/cloudflare/config.yml` |
| **Container** | `room-00-cloudflared-tunnel` |

### Configuration Files

```
infrastructure/cloudflare/
├── config.yml              # Main tunnel configuration (ingress rules)
├── credentials.json        # Tunnel authentication (DO NOT COMMIT)
└── tunnel.sh              # Management script
```

### Docker Configuration

```yaml
# Docker/rooms/room-00-cloudflared-tunnel/docker-compose.yml
services:
  room-00-cloudflared-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: room-00-cloudflared-tunnel
    command: tunnel run
    environment:
      TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN}
    volumes:
      - ../../../infrastructure/cloudflare/config.yml:/etc/cloudflared/config.yml:ro
      - ../../../infrastructure/cloudflare/credentials.json:/etc/cloudflared/credentials.json:ro
    networks:
      - sin-solver-network
```

---

## Service Inventory (18+ Services)

### Complete Service Mapping

| # | Public Domain | Internal Service | Container Name | Port | Category | Status |
|---|---------------|------------------|----------------|------|----------|--------|
| 1 | `dashboard.delqhi.com` | Dashboard Cockpit | `room-01-dashboard-cockpit` | 3011 | Room | ✅ Active |
| 2 | `n8n.delqhi.com` | n8n Orchestrator | `agent-01-n8n-orchestrator` | 5678 | Agent | ✅ Active |
| 3 | `skyvern.delqhi.com` | Skyvern Solver | `agent-06-skyvern-solver` | 8000 | Agent | ✅ Active |
| 4 | `steel.delqhi.com` | Steel Browser | `agent-05-steel-browser` | 3000 | Agent | ✅ Active |
| 5 | `stagehand.delqhi.com` | Stagehand Research | `agent-07-stagehand-research` | 8000 | Agent | ✅ Active |
| 6 | `vault.delqhi.com` | Vault UI | `room-02-tresor-vault` | 8200 | Infrastructure | ✅ Active |
| 7 | `vault-api.delqhi.com` | Vault API | `room-02-tresor-api` | 8002 | Infrastructure | ✅ Active |
| 8 | `nocodb.delqhi.com` | NocoDB UI | `room-21-nocodb-ui` | 8080 | Room | ✅ Active |
| 9 | `supabase.delqhi.com` | Supabase Studio | `room-16-supabase-studio` | 3000 | Room | ✅ Active |
| 10 | `codeserver.delqhi.com` | CodeServer API | `agent-04-opencode-secretary` | 9000 | Agent | ✅ Active |
| 11 | `survey.delqhi.com` | Survey Worker | `solver-18-survey-worker` | 8018 | Solver | ✅ Active |
| 12 | `captcha.delqhi.com` | Captcha Worker | `builder-1.1-captcha-worker` | 8019 | Builder | ✅ Active |
| 13 | `chat.delqhi.com` | RocketChat | `room-09-clawdbot-messenger` | 8080 | Room | ✅ Active |
| 14 | `video.delqhi.com` | Video Generator | `room-05-generator-video` | 8215 | Room | ✅ Active |
| 15 | `social.delqhi.com` | Social MCP | `room-20.3-social-mcp` | 8213 | Room | ✅ Active |
| 16 | `research.delqhi.com` | Deep Research | `agent-07-stagehand-research` | 3000 | Agent | ✅ Active |
| 17 | `plane.delqhi.com` | Plane PM | `room-11-plane-mcp` | 8216 | Room | ✅ Active |
| 18 | `api.delqhi.com` | API Brain | `room-13-api-brain` | 8000 | Room | ✅ Active |
| 19 | `hoppscotch.delqhi.com` | Hoppscotch | `room-24-hoppscotch-api` | 3000 | Room | ✅ Active |
| 20 | `mail.delqhi.com` | BillionMail | `room-22-billionmail-web` | 8091 | Room | ✅ Active |
| 21 | `flowise.delqhi.com` | FlowiseAI | `room-23-flowiseai-web` | 8092 | Room | ✅ Active |

**Total Services:** 21 active public endpoints

---

## Service Categories

### By Category

#### Agents (6 services)
- `n8n.delqhi.com` - Workflow orchestration
- `skyvern.delqhi.com` - Visual AI automation
- `steel.delqhi.com` - Stealth browser automation
- `stagehand.delqhi.com` - Research automation
- `codeserver.delqhi.com` - Code generation API
- `research.delqhi.com` - Deep research MCP

#### Rooms (11 services)
- `dashboard.delqhi.com` - Central dashboard
- `vault.delqhi.com` / `vault-api.delqhi.com` - Secrets management
- `nocodb.delqhi.com` - No-code database
- `supabase.delqhi.com` - Backend as a service
- `chat.delqhi.com` - Team communication
- `video.delqhi.com` - Video generation
- `social.delqhi.com` - Social media automation
- `plane.delqhi.com` - Project management
- `api.delqhi.com` - Main API gateway
- `hoppscotch.delqhi.com` - API testing
- `mail.delqhi.com` - Email marketing
- `flowise.delqhi.com` - Visual AI builder

#### Solvers (1 service)
- `survey.delqhi.com` - Survey automation

#### Builders (1 service)
- `captcha.delqhi.com` - CAPTCHA solving

---

## Network Architecture

### Docker Network

| Property | Value |
|----------|-------|
| **Network Name** | `sin-solver-network` |
| **Subnet** | `172.20.0.0/16` |
| **Gateway** | `172.20.0.1` |
| **Type** | External (shared across all services) |

### Container IP Assignments

| Container | IP Address | Port | Domain |
|-----------|------------|------|--------|
| room-00-cloudflared-tunnel | DHCP | - | - |
| room-01-dashboard-cockpit | 172.20.0.x | 3011 | dashboard.delqhi.com |
| agent-01-n8n-orchestrator | 172.20.0.x | 5678 | n8n.delqhi.com |
| agent-05-steel-browser | 172.20.0.x | 3000 | steel.delqhi.com |
| agent-06-skyvern-solver | 172.20.0.x | 8000 | skyvern.delqhi.com |
| room-02-tresor-vault | 172.20.0.x | 8200 | vault.delqhi.com |
| room-13-api-brain | 172.20.0.x | 8000 | api.delqhi.com |

---

## Security Features

### Built-in Security

| Feature | Status | Description |
|---------|--------|-------------|
| **TLS 1.3** | ✅ Enabled | End-to-end encryption |
| **DDoS Protection** | ✅ Enabled | Cloudflare mitigation |
| **WAF** | ✅ Configurable | Web Application Firewall |
| **Bot Management** | ✅ Available | Automated threat detection |
| **Access Policies** | ✅ Configurable | Identity-aware access |

### Security Best Practices

1. **Credentials Protection**
   - Never commit `credentials.json` to git
   - Use `.gitignore` to exclude sensitive files
   - Rotate credentials quarterly

2. **Access Control**
   - Implement Cloudflare Access for sensitive services
   - Use IP allowlists where appropriate
   - Enable MFA for admin access

3. **Monitoring**
   - Monitor tunnel health via Cloudflare Dashboard
   - Set up alerts for tunnel disconnections
   - Log all access attempts

---

## Performance Characteristics

### Resource Usage

| Resource | Limit | Reservation |
|----------|-------|-------------|
| **CPU** | 0.25 cores | 0.1 cores |
| **Memory** | 128 MB | 64 MB |
| **Network** | Unlimited | - |

### Performance Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| **Latency** | < 50ms | Edge to origin |
| **Throughput** | 1 Gbps | Per tunnel |
| **Uptime** | 99.99% | Cloudflare SLA |
| **Concurrent Connections** | Unlimited | No hard limit |

---

## Dependencies

### Required Services

The Cloudflare tunnel depends on the following services being healthy:

| Service | Priority | Startup Order |
|---------|----------|---------------|
| room-01-dashboard-cockpit | Critical | 1 |
| room-13-api-brain | Critical | 1 |
| agent-01-n8n-orchestrator | High | 2 |
| room-02-tresor-vault | High | 2 |
| All other services | Medium | 3+ |

### Startup Sequence

```bash
# 1. Start infrastructure first
docker-compose -f Docker/rooms/room-03-postgres-master/docker-compose.yml up -d
docker-compose -f Docker/rooms/room-04-redis-cache/docker-compose.yml up -d

# 2. Start core services
docker-compose -f Docker/rooms/room-01-dashboard/docker-compose.yml up -d
docker-compose -f Docker/rooms/room-13-api-brain/docker-compose.yml up -d

# 3. Start Cloudflare tunnel LAST
docker-compose -f Docker/rooms/room-00-cloudflared-tunnel/docker-compose.yml up -d
```

---

## Management Scripts

### tunnel.sh Commands

```bash
# Setup new tunnel
./infrastructure/cloudflare/tunnel.sh setup

# Start tunnel
./infrastructure/cloudflare/tunnel.sh start

# Stop tunnel
./infrastructure/cloudflare/tunnel.sh stop

# Check status
./infrastructure/cloudflare/tunnel.sh status

# Show endpoints
./infrastructure/cloudflare/tunnel.sh endpoints
```

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| **02-setup-guide.md** | Step-by-step tunnel setup | `Docs/infrastructure/cloudflare/` |
| **03-troubleshooting.md** | Common issues and solutions | `Docs/infrastructure/cloudflare/` |
| **04-backup-restore.md** | Backup and disaster recovery | `Docs/infrastructure/cloudflare/` |
| **05-service-mapping.md** | Detailed service configuration | `Docs/infrastructure/cloudflare/` |
| **ARCHITECTURE-MODULAR.md** | Modular architecture guide | Project root |
| **CONTAINER-REGISTRY.md** | Container inventory | Project root |

---

## Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-30 | Initial documentation | Sisyphus |

---

## Compliance Checklist

- [x] Pillar 1: Overview - Complete
- [x] Architecture documented
- [x] Service inventory complete (21 services)
- [x] Security features documented
- [x] Dependencies identified
- [x] Related documents linked

---

**Next Document:** [02-setup-guide.md](./02-setup-guide.md) - Step-by-step tunnel setup instructions

**Document Status:** ✅ COMPLETE - Ready for production use
