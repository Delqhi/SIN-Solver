# ADR-002: Cloudflare Tunnel statt Direkter IPs

## Status

**Accepted** (2026-01-29)

## Context

Das SIN-Solver System betreibt 26+ Services, die extern erreichbar sein müssen:
- Dashboard (Room-01)
- n8n Workflows (Agent-01)
- Captcha Worker (Solver-1.1)
- Vault Secrets (Room-02)
- ...

Traditionelle Ansätze:
1. **Direkte IP-Exposure**: Öffentliche IPs für jeden Service
2. **Reverse Proxy (Nginx/Traefik)**: Zentraler Einstiegspunkt
3. **VPN**: WireGuard/OpenVPN für sicheren Zugriff
4. **Cloudflare Tunnel**: Zero-Trust, kein öffentlicher Port nötig

## Decision

Wir entscheiden uns für **Cloudflare Tunnel** als einzige externe Schnittstelle.

### Architektur

```
Internet
    ↓
Cloudflare Edge (DDoS, WAF, CDN)
    ↓
cloudflared Tunnel (outbound-only)
    ↓
Internal Services (172.20.0.0/16)
```

### Konfiguration

```yaml
# cloudflared/config.yml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  # Room-01: Dashboard
  - hostname: dashboard.delqhi.com
    service: http://172.20.0.60:3000
  
  # Agent-01: n8n
  - hostname: n8n.delqhi.com
    service: http://172.20.0.10:5678
  
  # Solver-1.1: Captcha
  - hostname: captcha.delqhi.com
    service: http://172.20.0.81:8019
  
  # Solver-2.1: Survey
  - hostname: survey.delqhi.com
    service: http://172.20.0.80:8018
  
  # Room-02: Vault
  - hostname: vault.delqhi.com
    service: http://172.20.0.31:8200
  
  # Fallback
  - service: http_status:404
```

### Sicherheitsfeatures

1. **Outbound-only**: Keine offenen Ports auf dem Server
2. **Zero-Trust**: Jedes Request durch Cloudflare Edge
3. **DDoS Protection**: Automatisch durch Cloudflare
4. **WAF**: Web Application Firewall
5. **Access Rules**: Authentifizierung pro Subdomain

## Consequences

### Positive

1. **Keine Port-Exposure**: Server hat keine offenen Ports
2. **Automatisches HTTPS**: TLS termination bei Cloudflare
3. **Global CDN**: Schnelle Latenz weltweit
4. **Einfache DNS**: *.delqhi.com → Automatisch konfiguriert
5. **Kostenlos**: Cloudflare Tunnel ist kostenlos
6. **Kein DynDNS**: Statische Domains, keine IP-Änderungen

### Negative

1. **Cloudflare-Abhängigkeit**: Ausfall bei Cloudflare = Ausfall
2. **Privacy**: Traffic geht durch Cloudflare-Infrastruktur
3. **Rate Limits**: Kostenloser Plan hat Limits
4. **Komplexität**: Zusätzliche Schicht zu debuggen

### Trade-offs

| Aspekt | Alternative | Warum Cloudflare besser |
|--------|-------------|------------------------|
| Sicherheit | Nginx Reverse Proxy | Keine offenen Ports |
| Kosten | AWS ALB | Kostenlos vs. $20+/Monat |
| Setup | Direkte IPs | Keine Port-Forwarding Konfiguration |
| Privacy | Self-hosted VPN | Akzeptabler Trade-off für Convenience |

## Alternatives Considered

### Alternative 1: Direkte IP-Exposure mit Firewall

```
Internet → Firewall → Services (Port 80/443)
```

**Abgelehnt**:
- Öffentliche IPs erforderlich
- DDoS-Anfällig
- Port-Forwarding komplex
- Kein automatisches HTTPS

### Alternative 2: Nginx Reverse Proxy

```
Internet → Nginx (443) → Services (intern)
```

**Abgelehnt**:
- Port 443 muss exposed sein
- DDoS-Schutz selbst implementieren
- Zertifikatsmanagement (Let's Encrypt)
- Single Point of Failure

### Alternative 3: WireGuard VPN

```
Internet → WireGuard → Internal Network
```

**Abgelehnt**:
- Clients brauchen VPN-Zugang
- Nicht für öffentliche Services geeignet
- Komplexeres Setup für jeden Nutzer

### Alternative 4: Tailscale Funnel

```
Internet → Tailscale → Services
```

**Abgelehnt**:
- Gut für Entwicklung, aber:
- Kein DDoS-Schutz
- Kein WAF
- Weniger Features als Cloudflare

## Implementation

### Docker Compose

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared-tunnel
    command: tunnel --config /etc/cloudflared/config.yml run
    volumes:
      - ./cloudflared:/etc/cloudflared:ro
    networks:
      - sin-network
    restart: unless-stopped
```

### DNS-Konfiguration

```
Type    Name              Value
A       dashboard         192.0.2.1 (CF anycast)
CNAME   n8n               dashboard.delqhi.com
CNAME   captcha           dashboard.delqhi.com
...
```

### Access Rules (Optional)

```yaml
# Für sensitive Services (Vault, Admin)
- hostname: vault.delqhi.com
  service: http://172.20.0.31:8200
  access:
    - rule: email_domain
      value: delqhi.com
```

## Monitoring

```bash
# Tunnel Status
docker logs cloudflared-tunnel

# Verbindungs-Health
curl -s https://dashboard.delqhi.com/health

# Latenz-Test
ping dashboard.delqhi.com
```

## References

- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [DEPLOYMENT-GUIDE.md](../../DEPLOYMENT-GUIDE.md)
- [SECURITY-WHITEPAPER.md](../../SECURITY-WHITEPAPER.md)

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-29 | Sisyphus | Initial ADR created |

---

**Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)**

Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
