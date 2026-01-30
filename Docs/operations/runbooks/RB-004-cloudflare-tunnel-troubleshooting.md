# RB-004: Cloudflare Tunnel Troubleshooting Runbook

**Purpose:** Diagnose and resolve issues with Cloudflare Tunnel (cloudflared) connectivity.

**Scope:** room-00-cloudflared-tunnel and all public-facing services

**Prerequisites:**
- Cloudflare account access
- Cloudflare API token
- Tunnel token/credentials
- Docker access

---

## Table of Contents

1. [Tunnel Architecture Overview](#1-tunnel-architecture-overview)
2. [Health Checks](#2-health-checks)
3. [Common Issues & Solutions](#3-common-issues--solutions)
4. [Diagnostic Commands](#4-diagnostic-commands)
5. [Advanced Troubleshooting](#5-advanced-troubleshooting)
6. [Recovery Procedures](#6-recovery-procedures)

---

## 1. Tunnel Architecture Overview

### 1.1 Tunnel Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE TUNNEL ARCHITECTURE               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Internet User                                                   │
│       │                                                          │
│       ▼ HTTPS                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Cloudflare Edge Network                      │   │
│  │         (DDoS Protection, SSL, Caching)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│       │                                                          │
│       ▼ Cloudflare Tunnel (HTTP2/QUIC)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         room-00-cloudflared-tunnel                        │   │
│  │              (172.20.0.2)                                 │   │
│  │  - Outbound connection to Cloudflare                      │   │
│  │  - No inbound ports required                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│       │                                                          │
│       ▼ HTTP (Internal Network)                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Internal Services                            │   │
│  │  - room-13-api-brain:8000                                │   │
│  │  - room-01-dashboard:3011                                │   │
│  │  - agent-01-n8n:5678                                     │   │
│  │  - ...                                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Exposed Services

| Public Domain | Internal Service | Port | Status |
|---------------|------------------|------|--------|
| `api.delqhi.com` | room-13-api-brain | 8000 | Critical |
| `dashboard.delqhi.com` | room-01-dashboard | 3011 | Critical |
| `n8n.delqhi.com` | agent-01-n8n | 5678 | Critical |
| `vault.delqhi.com` | room-02-tresor-vault | 8200 | Critical |
| `vault-api.delqhi.com` | room-02-tresor-api | 8002 | High |
| `steel.delqhi.com` | agent-05-steel-browser | 3005 | High |
| `skyvern.delqhi.com` | agent-06-skyvern-solver | 8030 | High |
| `plane.delqhi.com` | room-11-plane-mcp | 8216 | Medium |
| `scira.delqhi.com` | room-30-scira-ai-search | 8230 | Medium |
| `captcha.delqhi.com` | solver-1.1-captcha-worker | 8019 | Medium |
| `survey.delqhi.com` | solver-2.1-survey-worker | 8018 | Medium |

---

## 2. Health Checks

### 2.1 Quick Tunnel Status Check

```bash
# Check if tunnel container is running
docker ps | grep cloudflared

# Expected Output:
# room-00-cloudflared-tunnel   cloudflare/cloudflared:latest   tunnel run   ...

# Check tunnel logs (last 50 lines)
docker logs room-00-cloudflared-tunnel --tail 50

# Expected Output:
# INF Connection registered
# INF Connected to Cloudflare
# INF Each HA connection's tunnel ID: ...
```

### 2.2 Test Public Endpoints

```bash
# Test all critical endpoints
ENDPOINTS=(
    "https://api.delqhi.com/health"
    "https://dashboard.delqhi.com/api/health"
    "https://n8n.delqhi.com/healthz"
)

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Testing: $endpoint"
    status=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
    if [ "$status" -eq 200 ]; then
        echo "✅ HTTP $status"
    else
        echo "❌ HTTP $status"
    fi
    echo ""
done
```

### 2.3 Internal Connectivity Check

```bash
# Test internal services from tunnel container
docker exec room-00-cloudflared-tunnel sh -c '
    echo "Testing API Brain..."
    wget -q --spider --timeout=5 http://room-13-api-brain:8000/health && echo "✅ API Brain OK" || echo "❌ API Brain FAILED"
    
    echo "Testing Dashboard..."
    wget -q --spider --timeout=5 http://room-01-dashboard-cockpit:3011/api/health && echo "✅ Dashboard OK" || echo "❌ Dashboard FAILED"
    
    echo "Testing n8n..."
    wget -q --spider --timeout=5 http://agent-01-n8n-orchestrator:5678/healthz && echo "✅ n8n OK" || echo "❌ n8n FAILED"
'
```

---

## 3. Common Issues & Solutions

### 3.1 Issue: Tunnel Container Not Running

**Symptoms:**
```
$ docker ps | grep cloudflared
# (no output)
```

**Diagnosis:**
```bash
# Check if container exists
docker ps -a | grep cloudflared

# Check container logs
docker logs room-00-cloudflared-tunnel --tail 100

# Check for exit code
docker inspect room-00-cloudflared-tunnel --format='{{.State.ExitCode}}'
```

**Solution:**
```bash
# Start the container
cd /Users/jeremy/dev/SIN-Solver/Docker/rooms/room-00-cloudflared-tunnel
docker-compose up -d

# If it keeps failing, check credentials
docker exec room-00-cloudflared-tunnel cat /etc/cloudflared/credentials.json

# Verify TUNNEL_TOKEN is set
echo $TUNNEL_TOKEN

# Restart with explicit token
docker-compose down
docker-compose up -d
```

### 3.2 Issue: Connection Registered but Services Unreachable

**Symptoms:**
```
INF Connection registered
# But: curl https://api.delqhi.com/health returns 502/503
```

**Diagnosis:**
```bash
# Check internal service health
curl http://localhost:8000/health
curl http://localhost:3011/api/health

# Check from tunnel container
docker exec room-00-cloudflared-tunnel wget -qO- http://room-13-api-brain:8000/health
```

**Solution:**
```bash
# Internal service is down - restart it
docker restart room-13-api-brain

# Wait for service to be ready
sleep 10

# Verify
curl http://localhost:8000/health

# Test via tunnel again
curl https://api.delqhi.com/health
```

### 3.3 Issue: Certificate/TLS Errors

**Symptoms:**
```
error="remote error: tls: bad certificate"
```

**Diagnosis:**
```bash
# Check certificate validity
domain="api.delqhi.com"
echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
    openssl x509 -noout -dates

# Check TLS version
curl -v https://api.delqhi.com/health 2>&1 | grep -E "SSL|TLS"
```

**Solution:**
```bash
# See RB-003-ssl-certificate-renewal.md for certificate issues

# If origin certificate issue, check internal service SSL settings
# Most internal services use HTTP (not HTTPS) behind tunnel

# Verify tunnel config doesn't enforce HTTPS to origin
cat /Users/jeremy/dev/SIN-Solver/infrastructure/cloudflare/config.yml | grep -A2 "service:"
```

### 3.4 Issue: Tunnel Authentication Failed

**Symptoms:**
```
error="failed to authenticate: Authentication error"
```

**Diagnosis:**
```bash
# Check credentials file exists
docker exec room-00-cloudflared-tunnel ls -la /etc/cloudflared/

# Check token validity (don't expose full token)
docker exec room-00-cloudflared-tunnel cat /etc/cloudflared/credentials.json | jq '. | {t: .tunnel, a: .accountTag}'
```

**Solution:**
```bash
# Option 1: Regenerate credentials from Cloudflare dashboard
# 1. Go to Zero Trust > Networks > Tunnels
# 2. Select your tunnel
# 3. Click "Configure" > "Docker"
# 4. Copy new token

# Option 2: Update environment variable
export TUNNEL_TOKEN="your-new-token"
docker-compose down
docker-compose up -d

# Option 3: Update credentials file
cat > /Users/jeremy/dev/SIN-Solver/infrastructure/cloudflare/credentials.json << 'EOF'
{
    "AccountTag": "your-account-tag",
    "TunnelSecret": "your-tunnel-secret",
    "TunnelID": "your-tunnel-id"
}
EOF

docker restart room-00-cloudflared-tunnel
```

### 3.5 Issue: High Latency or Timeouts

**Symptoms:**
```
Requests take >5 seconds or timeout
```

**Diagnosis:**
```bash
# Test latency to Cloudflare
curl -w "@curl-format.txt" -o /dev/null -s https://api.delqhi.com/health

# Check tunnel connection metrics
docker logs room-00-cloudflared-tunnel --tail 100 | grep -E "latency|rtt|connection"

# Check resource usage
docker stats room-00-cloudflared-tunnel --no-stream
```

**Solution:**
```bash
# Restart tunnel to establish fresh connections
docker restart room-00-cloudflared-tunnel

# Check network connectivity
ping -c 10 1.1.1.1

# Check for packet loss
mtr --report --report-cycles 10 api.delqhi.com

# If persistent issues, check Cloudflare status
open "https://www.cloudflarestatus.com/"
```

---

## 4. Diagnostic Commands

### 4.1 Full Tunnel Diagnostics

```bash
#!/bin/bash
# save as: tunnel-diagnostics.sh

echo "========================================"
echo "Cloudflare Tunnel Diagnostics"
echo "========================================"
echo "Timestamp: $(date)"
echo ""

# 1. Container Status
echo "1. Container Status"
echo "-------------------"
docker ps --filter "name=cloudflared" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 2. Container Logs (last 20 lines)
echo "2. Recent Logs"
echo "--------------"
docker logs room-00-cloudflared-tunnel --tail 20 2>&1
echo ""

# 3. Configuration
echo "3. Tunnel Configuration"
echo "-----------------------"
docker exec room-00-cloudflared-tunnel cat /etc/cloudflared/config.yml 2>/dev/null || echo "Config not found"
echo ""

# 4. Internal Connectivity
echo "4. Internal Service Tests"
echo "-------------------------"
docker exec room-00-cloudflared-tunnel sh -c '
    for service in room-13-api-brain:8000 room-01-dashboard-cockpit:3011 agent-01-n8n-orchestrator:5678; do
        IFS=":" read -r host port <<< "$service"
        if wget -q --spider --timeout=3 "http://$host:$port" 2>/dev/null; then
            echo "✅ $service - REACHABLE"
        else
            echo "❌ $service - UNREACHABLE"
        fi
    done
'
echo ""

# 5. Public Endpoint Tests
echo "5. Public Endpoint Tests"
echo "------------------------"
for domain in api.delqhi.com dashboard.delqhi.com n8n.delqhi.com; do
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$domain/health" 2>/dev/null || echo "000")
    if [ "$status" = "200" ]; then
        echo "✅ $domain - HTTP $status"
    else
        echo "❌ $domain - HTTP $status"
    fi
done
echo ""

# 6. DNS Resolution
echo "6. DNS Resolution"
echo "-----------------"
for domain in api.delqhi.com; do
    echo "Resolving $domain:"
    dig +short "$domain" | head -5
done
echo ""

# 7. SSL Certificate
echo "7. SSL Certificate Status"
echo "-------------------------"
echo | openssl s_client -connect api.delqhi.com:443 -servername api.delqhi.com 2>/dev/null | \
    openssl x509 -noout -dates -subject
echo ""

echo "========================================"
echo "Diagnostics Complete"
echo "========================================"
EOF

chmod +x tunnel-diagnostics.sh
./tunnel-diagnostics.sh
```

### 4.2 Network Path Analysis

```bash
# Trace network path to Cloudflare
mtr --report --report-cycles 10 api.delqhi.com

# Check DNS resolution
dig api.delqhi.com +trace

# Check Cloudflare anycast IPs
dig +short api.delqhi.com

# Test specific Cloudflare datacenter
# Replace with actual IP from dig output
curl --resolve api.delqhi.com:443:104.16.123.456 https://api.delqhi.com/health
```

### 4.3 Tunnel Metrics

```bash
# Get tunnel metrics (if enabled)
docker exec room-00-cloudflared-tunnel cloudflared tunnel info

# Check connection health
docker logs room-00-cloudflared-tunnel 2>&1 | grep -E "connection|registered|error" | tail -20

# Monitor in real-time
docker logs room-00-cloudflared-tunnel -f
```

---

## 5. Advanced Troubleshooting

### 5.1 Enable Debug Logging

```bash
# Stop current tunnel
docker stop room-00-cloudflared-tunnel

# Run with debug logging
docker run --rm -it \
    --network delqhi-platform-network \
    -e TUNNEL_TOKEN="$TUNNEL_TOKEN" \
    cloudflare/cloudflared:latest \
    tunnel --log-level debug run

# Watch for detailed connection logs
# Press Ctrl+C to stop
```

### 5.2 Test with Minimal Config

```bash
# Create minimal test config
cat > /tmp/test-config.yml << 'EOF'
tunnel: your-tunnel-id
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: api.delqhi.com
    service: http://room-13-api-brain:8000
  - service: http_status:404
EOF

# Run with test config
docker run --rm -it \
    --network delqhi-platform-network \
    -v /tmp/test-config.yml:/etc/cloudflared/config.yml:ro \
    -v /Users/jeremy/dev/SIN-Solver/infrastructure/cloudflare/credentials.json:/etc/cloudflared/credentials.json:ro \
    cloudflare/cloudflared:latest \
    tunnel --config /etc/cloudflared/config.yml run
```

### 5.3 Check for IP Blocking

```bash
# Check if your IP is blocked by Cloudflare
curl -s "https://api.delqhi.com/health" -w "\nHTTP Code: %{http_code}\n"

# Check for captcha/interstitial
curl -s "https://api.delqhi.com/health" | grep -i "captcha\|challenge\|interstitial"

# Check Cloudflare security events
open "https://dash.cloudflare.com/?to=/:account/:zone/security/events"
```

### 5.4 Verify Tunnel Credentials

```bash
# Decode and verify JWT token (credentials.json)
# This shows token expiration and claims

# Extract token components
token=$(jq -r '.TunnelSecret' /Users/jeremy/dev/SIN-Solver/infrastructure/cloudflare/credentials.json)

# Note: TunnelSecret is base64 encoded, not JWT
# To verify tunnel via API:

curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/tunnels" \
    -H "Authorization: Bearer $API_TOKEN" | \
    jq '.result[] | {id: .id, name: .name, status: .status, connections: .connections}'
```

---

## 6. Recovery Procedures

### 6.1 Complete Tunnel Rebuild

```bash
# Step 1: Stop and remove existing tunnel
docker stop room-00-cloudflared-tunnel
docker rm room-00-cloudflared-tunnel

# Step 2: Verify internal services are healthy
./scripts/health-check-all.sh

# Step 3: Recreate tunnel container
cd /Users/jeremy/dev/SIN-Solver/Docker/rooms/room-00-cloudflared-tunnel
docker-compose up -d

# Step 4: Wait for registration
sleep 10

# Step 5: Verify logs
docker logs room-00-cloudflared-tunnel --tail 20

# Step 6: Test public endpoints
curl https://api.delqhi.com/health
curl https://dashboard.delqhi.com/api/health
```

### 6.2 Create New Tunnel (Emergency)

```bash
# If existing tunnel is corrupted, create new one

# Step 1: Install cloudflared locally (if not already)
brew install cloudflared

# Step 2: Authenticate
cloudflared tunnel login

# Step 3: Create new tunnel
cloudflared tunnel create sin-solver-tunnel-new

# Step 4: Get tunnel credentials
# Credentials saved to: ~/.cloudflared/*.json

# Step 5: Create config
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: your-new-tunnel-id
credentials-file: /Users/jeremy/.cloudflared/your-new-tunnel-id.json

ingress:
  - hostname: api.delqhi.com
    service: http://localhost:8000
  - hostname: dashboard.delqhi.com
    service: http://localhost:3011
  - hostname: n8n.delqhi.com
    service: http://localhost:5678
  - service: http_status:404
EOF

# Step 6: Add DNS records via Cloudflare dashboard or API
# For each hostname:
# Type: CNAME
# Name: api
# Target: your-new-tunnel-id.cfargotunnel.com

# Step 7: Copy new credentials to project
cp ~/.cloudflared/*.json /Users/jeremy/dev/SIN-Solver/infrastructure/cloudflare/credentials.json

# Step 8: Update docker-compose with new token
# Get token from Cloudflare dashboard: Zero Trust > Networks > Tunnels > Token

# Step 9: Restart tunnel
docker-compose down
docker-compose up -d
```

### 6.3 Fallback to Direct Access (Emergency)

```bash
# If tunnel is completely down, access services directly via localhost

# API Brain
curl http://localhost:8000/health

# Dashboard
open http://localhost:3011

# n8n
open http://localhost:5678

# Vault
open http://localhost:8200

# Note: Update any external integrations to use localhost temporarily
# Remember to revert once tunnel is restored
```

### 6.4 Rollback to Previous Version

```bash
# If new cloudflared version has issues

# Check current version
docker exec room-00-cloudflared-tunnel cloudflared --version

# Stop current container
docker-compose down

# Edit docker-compose.yml to use specific version
# Change: image: cloudflare/cloudflared:latest
# To:     image: cloudflare/cloudflared:2024.1.0

# Start with specific version
docker-compose up -d
```

---

## Quick Reference

### Essential Commands

```bash
# Check tunnel status
docker ps | grep cloudflared
docker logs room-00-cloudflared-tunnel --tail 50

# Restart tunnel
docker restart room-00-cloudflared-tunnel

# Test public endpoint
curl -I https://api.delqhi.com/health

# Test internal endpoint from tunnel
docker exec room-00-cloudflared-tunnel wget -qO- http://room-13-api-brain:8000/health

# View full logs
docker logs room-00-cloudflared-tunnel -f
```

### Cloudflare API Commands

```bash
# List tunnels
curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/tunnels" \
    -H "Authorization: Bearer $API_TOKEN" | jq '.result[].name'

# Get tunnel details
curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/tunnels/$TUNNEL_ID" \
    -H "Authorization: Bearer $API_TOKEN" | jq '.result | {name, status, connections}'

# Get tunnel token
curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/tunnels/$TUNNEL_ID/token" \
    -H "Authorization: Bearer $API_TOKEN" | jq -r '.result'
```

### Emergency Contacts

| Issue | Contact | Method |
|-------|---------|--------|
| Cloudflare Outage | Cloudflare Status | https://www.cloudflarestatus.com |
| Account Issues | Cloudflare Support | https://support.cloudflare.com |
| Critical Incident | On-call Engineer | PagerDuty/Opsgenie |

---

**Last Updated:** 2026-01-30  
**Version:** 1.0  
**Owner:** Network Operations Team  
**Review Cycle:** Monthly
