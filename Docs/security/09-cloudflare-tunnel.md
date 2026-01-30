# 🌐 Cloudflare Tunnel Security

**Document ID:** SEC-09-CLOUDFLARE-TUNNEL  
**Version:** 1.0.0  
**Classification:** Internal Use Only  
**Last Updated:** 2026-01-30  

---

## 📋 Overview

Cloudflare Tunnel (formerly Argo Tunnel) provides secure, outbound-only connectivity from our internal infrastructure to Cloudflare's edge network. This eliminates the need for public IP addresses, open firewall ports, or VPN access to expose services.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              CLOUDFLARE TUNNEL ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Internet Users                                                  │
│       │                                                          │
│       │ HTTPS (TLS 1.3)                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Cloudflare Edge Network                     │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │    │
│  │  │   DDoS       │  │     WAF      │  │   Access     │  │    │
│  │  │  Protection  │  │  (Firewall)  │  │  (Identity)  │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │    │
│  │                                                              │
│  │  ┌─────────────────────────────────────────────────────┐    │
│  │  │           Cloudflare Tunnel (HTTP/2)                 │    │
│  │  │    Outbound connection from origin to edge           │    │
│  │  └─────────────────────────────────────────────────────┘    │
│  └─────────────────────────────────────────────────────────┘    │
│       ▲                                                          │
│       │ Outbound-only connection                                 │
│       │ No open inbound ports                                    │
│  ┌────┴─────────────────────────────────────────────────────┐    │
│  │              SIN-Solver Infrastructure                    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │    │
│  │  │ cloudflared│  │  API     │  │   n8n    │  │  Vault   │ │    │
│  │  │  daemon  │──│  Brain   │  │          │  │          │ │    │
│  │  │          │  │  :8000   │  │  :5678   │  │  :8200   │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │    │
│  │                                                              │
│  │  Docker Network: 172.20.0.0/16                               │
│  │  No public IPs required                                      │
│  │  Firewall: All inbound ports closed                          │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Security Benefits

### 1. No Public IP Addresses

```
Traditional Setup:                    Cloudflare Tunnel:
┌──────────────┐                      ┌──────────────┐
│ Public IP    │  ❌ Exposed          │ No Public IP │  ✅ Hidden
│ Port 443 open│  ❌ Attack surface   │ All ports    │  ✅ Closed
│ Firewall rules│ ❌ Complex          │ Outbound only│  ✅ Simple
└──────────────┘                      └──────────────┘
```

### 2. Outbound-Only Connections

- Tunnel originates from **inside** your infrastructure
- No inbound firewall rules required
- Connections are authenticated and encrypted
- Automatic reconnection on failure

### 3. DDoS Protection

All traffic passes through Cloudflare's DDoS protection:
- 51 Tbps network capacity
- Protection against Layer 3, 4, and 7 attacks
- Automatic attack mitigation
- No impact on origin infrastructure

### 4. Web Application Firewall (WAF)

```yaml
WAF Features:
  - OWASP Core Rule Set
  - Custom firewall rules
  - Rate limiting
  - Bot management
  - IP reputation filtering
  - Geo-blocking
  - Custom challenge pages
```

---

## 🚀 Tunnel Configuration

### Installation

```bash
# Download cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install
dpkg -i cloudflared.deb

# Verify installation
cloudflared --version
```

### Authentication

```bash
# Login to Cloudflare (one-time setup)
cloudflared tunnel login

# This will:
# 1. Open browser for authentication
# 2. Generate certificate.pem in ~/.cloudflared/
# 3. Link to your Cloudflare account

# Verify authentication
cloudflared tunnel list
```

### Create Tunnel

```bash
# Create a new tunnel
cloudflared tunnel create sin-solver-tunnel

# Output:
# Tunnel credentials written to /root/.cloudflared/<tunnel-id>.json
# Keep this file secret. To revoke these credentials, delete the tunnel.

# List tunnels
cloudflared tunnel list
```

### Configuration File

```yaml
# /etc/cloudflared/config.yml

tunnel: <TUNNEL-ID>
credentials-file: /etc/cloudflared/<TUNNEL-ID>.json

# Logging
logfile: /var/log/cloudflared.log
log-level: info

# Metrics
metrics: 0.0.0.0:2000

# Ingress rules - map hostnames to internal services
ingress:
  # API Brain
  - hostname: api.delqhi.com
    service: http://room-13-api-brain:8000
    originRequest:
      connectTimeout: 10s
      tlsTimeout: 10s
      tcpKeepAlive: 30s
      noTLSVerify: false
  
  # n8n
  - hostname: n8n.delqhi.com
    service: http://agent-01-n8n-orchestrator:5678
    originRequest:
      connectTimeout: 10s
  
  # Vault
  - hostname: vault.delqhi.com
    service: http://room-02-tresor-vault:8200
    originRequest:
      connectTimeout: 5s
  
  # Dashboard
  - hostname: dashboard.delqhi.com
    service: http://room-01-dashboard-cockpit:3011
    originRequest:
      connectTimeout: 10s
  
  # Steel Browser
  - hostname: steel.delqhi.com
    service: http://agent-05-steel-browser:3005
    originRequest:
      connectTimeout: 10s
  
  # Skyvern
  - hostname: skyvern.delqhi.com
    service: http://agent-06-skyvern-solver:8030
    originRequest:
      connectTimeout: 10s
  
  # Plane
  - hostname: plane.delqhi.com
    service: http://room-11-plane-mcp:8216
    originRequest:
      connectTimeout: 10s
  
  # Scira
  - hostname: scira.delqhi.com
    service: http://room-30-scira-ai-search:8230
    originRequest:
      connectTimeout: 10s
  
  # Captcha Worker
  - hostname: captcha.delqhi.com
    service: http://solver-1.1-captcha-worker:8019
    originRequest:
      connectTimeout: 10s
  
  # Survey Worker
  - hostname: survey.delqhi.com
    service: http://solver-2.1-survey-worker:8018
    originRequest:
      connectTimeout: 10s
  
  # Default: Return 404
  - service: http_status:404
```

### DNS Configuration

```bash
# Route DNS records to tunnel
cloudflared tunnel route dns sin-solver-tunnel api.delqhi.com
cloudflared tunnel route dns sin-solver-tunnel n8n.delqhi.com
cloudflared tunnel route dns sin-solver-tunnel vault.delqhi.com
cloudflared tunnel route dns sin-solver-tunnel dashboard.delqhi.com
cloudflared tunnel route dns sin-solver-tunnel steel.delqhi.com
cloudflared tunnel route dns sin-solver-tunnel skyvern.delqhi.com
cloudflared tunnel route dns sin-solver-tunnel plane.delqhi.com
cloudflared tunnel route dns sin-solver-tunnel scira.delqhi.com
cloudflared tunnel route dns sin-solver-tunnel captcha.delqhi.com
cloudflared tunnel route dns sin-solver-tunnel survey.delqhi.com

# Verify routes
cloudflared tunnel route list
```

---

## 🐳 Docker Deployment

### Docker Compose

```yaml
# Docker/rooms/room-00-cloudflared-tunnel/docker-compose.yml

version: '3.9'

services:
  room-00-cloudflared-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: room-00-cloudflared-tunnel
    hostname: room-00-cloudflared-tunnel
    command: tunnel run
    environment:
      TUNNEL_TOKEN: ${TUNNEL_TOKEN}
    volumes:
      - ./config:/etc/cloudflared:ro
      - ./logs:/var/log/cloudflared
    networks:
      - sin-solver-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "cloudflared", "tunnel", "info"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    # Security options
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 128M
        reservations:
          cpus: '0.1'
          memory: 64M

networks:
  sin-solver-network:
    external: true
```

### Alternative: Using Tunnel Token

```yaml
# For zero-touch deployment, use tunnel token

services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel run --token ${TUNNEL_TOKEN}
    environment:
      TUNNEL_TOKEN: ${TUNNEL_TOKEN}
    networks:
      - sin-solver-network
    restart: unless-stopped
```

---

## 🔒 Security Hardening

### 1. Access Control (Cloudflare Access)

```yaml
# Require authentication for sensitive services

# Cloudflare Dashboard: Access > Applications

Application: vault.delqhi.com
Policies:
  - Name: "Allow Admins"
    Decision: Allow
    Include:
      - Email: admin@delqhi.com
      - Email: security@delqhi.com
    Require:
      - GeoIP Country: US, DE, GB

Application: n8n.delqhi.com
Policies:
  - Name: "Allow Developers"
    Decision: Allow
    Include:
      - Email domain: delqhi.com
    Require:
      - Device Posture: Corporate device
```

### 2. Firewall Rules

```yaml
# Cloudflare Dashboard: Security > WAF > Firewall Rules

# Block countries with high attack rates
Rule: "Block High-Risk Countries"
Expression: (ip.geoip.country in {"CN" "RU" "KP" "IR"})
Action: Block

# Rate limiting
Rule: "API Rate Limit"
Expression: (http.request.uri.path contains "/api/")
Action: Rate Limit (100 requests / 1 minute)

# Challenge suspicious traffic
Rule: "Challenge Bots"
Expression: (cf.threat_score gt 10)
Action: Managed Challenge
```

### 3. Bot Management

```yaml
# Cloudflare Dashboard: Security > Bots

Bot Fight Mode: ON
Super Bot Fight Mode: ON
  - Definitely automated: Block
  - Likely automated: Challenge
  - Verified bots: Allow

Custom Rules:
  - Allow: Googlebot, Bingbot
  - Block: Scrapers, Crawlers
```

### 4. SSL/TLS Settings

```yaml
# Cloudflare Dashboard: SSL/TLS > Overview

SSL/TLS Encryption: Full (strict)
Always Use HTTPS: ON
Automatic HTTPS Rewrites: ON
TLS 1.3: ON
Minimum TLS Version: 1.2
```

---

## 📊 Monitoring & Logging

### Tunnel Metrics

```bash
# Access metrics endpoint
curl http://localhost:2000/metrics

# Key metrics to monitor:
# - cloudflared_tunnel_requests_total
# - cloudflared_tunnel_response_latency_seconds
# - cloudflared_tunnel_errors_total
# - cloudflared_tunnel_active_streams
```

### Prometheus Integration

```yaml
# prometheus.yml

scrape_configs:
  - job_name: 'cloudflared'
    static_configs:
      - targets: ['room-00-cloudflared-tunnel:2000']
    metrics_path: /metrics
```

### Log Analysis

```bash
# View tunnel logs
docker logs room-00-cloudflared-tunnel

# Follow logs
docker logs -f room-00-cloudflared-tunnel

# Search for errors
docker logs room-00-cloudflared-tunnel 2>&1 | grep -i error

# Export logs
docker logs room-00-cloudflared-tunnel > cloudflared-$(date +%Y%m%d).log
```

### Health Checks

```bash
#!/bin/bash
# scripts/check-tunnel-health.sh

TUNNEL_ID=$1

echo "Checking tunnel health: $TUNNEL_ID"

# Check tunnel status
cloudflared tunnel info $TUNNEL_ID

# Check connections
cloudflared tunnel info $TUNNEL_ID --connections

# Test connectivity
curl -s -o /dev/null -w "%{http_code}" https://api.delqhi.com/health
```

---

## 🚨 Troubleshooting

### Common Issues

#### Tunnel Not Connecting

```bash
# Check logs
docker logs room-00-cloudflared-tunnel

# Verify credentials
cloudflared tunnel list

# Test tunnel manually
cloudflared tunnel run --url http://localhost:8080

# Check network connectivity
cloudflared access tcp --hostname api.delqhi.com --url localhost:8080
```

#### Certificate Issues

```bash
# Re-authenticate
cloudflared tunnel login

# Verify certificate
ls -la ~/.cloudflared/cert.pem

# Check certificate validity
openssl x509 -in ~/.cloudflared/cert.pem -noout -dates
```

#### DNS Resolution Issues

```bash
# Check DNS records
cloudflared tunnel route list

# Verify DNS propagation
dig api.delqhi.com

# Flush DNS cache
sudo systemd-resolve --flush-caches
```

#### High Latency

```bash
# Check tunnel metrics
curl -s http://localhost:2000/metrics | grep latency

# Test direct connection
curl -w "@curl-format.txt" -o /dev/null -s http://room-13-api-brain:8000/health

# Check for packet loss
mtr --report --report-cycles 10 api.delqhi.com
```

---

## 🔐 Security Best Practices

### 1. Credential Management

```bash
# Store tunnel credentials in Vault
vault kv put secret/infrastructure/cloudflared \
    tunnel_token="${TUNNEL_TOKEN}" \
    tunnel_id="${TUNNEL_ID}"

# Inject at runtime
docker run -e TUNNEL_TOKEN=$(vault kv get -field=tunnel_token secret/infrastructure/cloudflared) \
    cloudflare/cloudflared:latest tunnel run
```

### 2. Network Segmentation

```yaml
# Only expose necessary services

# ❌ Bad: Expose all services
ingress:
  - service: http://localhost:8080

# ✅ Good: Explicit service mapping
ingress:
  - hostname: api.delqhi.com
    service: http://api:8000
  - hostname: public.delqhi.com
    service: http://public:3000
  - service: http_status:404  # Deny all others
```

### 3. Regular Audits

```bash
#!/bin/bash
# scripts/audit-tunnel-config.sh

echo "Tunnel Security Audit"
echo "===================="

# List all tunnels
echo "Active Tunnels:"
cloudflared tunnel list

# Check for unused tunnels
echo ""
echo "Checking for inactive tunnels..."
cloudflared tunnel list | grep "IDLE"

# Verify DNS routes
echo ""
echo "DNS Routes:"
cloudflared tunnel route list

# Check for orphaned DNS records
echo ""
echo "Checking for orphaned records..."
# Compare DNS records with tunnel routes
```

### 4. Backup & Recovery

```bash
#!/bin/bash
# scripts/backup-tunnel-config.sh

BACKUP_DIR="/backups/cloudflared/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup credentials
cp ~/.cloudflared/*.json "$BACKUP_DIR/"
cp ~/.cloudflared/cert.pem "$BACKUP_DIR/" 2>/dev/null || true

# Backup config
cp /etc/cloudflared/config.yml "$BACKUP_DIR/"

# Backup tunnel list
cloudflared tunnel list > "$BACKUP_DIR/tunnel-list.txt"

# Compress
tar czf "$BACKUP_DIR.tar.gz" -C "$BACKUP_DIR" .

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

---

## 📋 Configuration Reference

### Complete Ingress Options

```yaml
# Origin request configuration
originRequest:
  # Connection settings
  connectTimeout: 30s
  tlsTimeout: 10s
  tcpKeepAlive: 30s
  noHappyEyeballs: false
  
  # TLS settings
  noTLSVerify: false
  originServerName: api.delqhi.com
  caPool: /etc/ssl/certs/ca.crt
  
  # HTTP settings
  httpHostHeader: api.delqhi.com
  disableChunkedEncoding: false
  
  # Authentication
  http2Origin: true
  
  # Access control
  access:
    required: true
    teamName: delqhi
    audTag:
      - <AUDIENCE_TAG>
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TUNNEL_TOKEN` | Tunnel authentication token | Yes (if using token) |
| `TUNNEL_ORIGIN_CERT` | Path to origin certificate | No |
| `TUNNEL_LOGFILE` | Log file path | No |
| `TUNNEL_LOG_LEVEL` | Log level (debug, info, warn, error) | No |
| `TUNNEL_METRICS` | Metrics endpoint (host:port) | No |
| `TUNNEL_TRANSPORT_PROTOCOL` | QUIC or http2 | No |
| `TUNNEL_REGION` | Preferred Cloudflare region | No |

---

## 📝 Document Information

| Attribute | Value |
|-----------|-------|
| **Document ID** | SEC-09-CLOUDFLARE-TUNNEL |
| **Version** | 1.0.0 |
| **Classification** | Internal Use Only |
| **Author** | SIN-Solver Security Team |
| **Created** | 2026-01-30 |
| **Last Updated** | 2026-01-30 |
| **Review Cycle** | Quarterly |
| **Next Review** | 2026-04-30 |

---

*For additional security documentation, see the 26-Pillar Security Documentation Index.*
