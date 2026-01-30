# 🌐 Network Policies & Segmentation

**Document ID:** SEC-11-NETWORK-POLICIES  
**Version:** 1.0.0  
**Classification:** Internal Use Only  
**Last Updated:** 2026-01-30  

---

## 📋 Overview

This document defines network security policies and segmentation strategies for the SIN-Solver platform. Network segmentation is a critical defense mechanism that limits lateral movement in case of a security breach and ensures that services can only communicate on an as-needed basis.

### Network Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              NETWORK SEGMENTATION ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Internet                                                        │
│     │                                                            │
│     │ HTTPS (TLS 1.3)                                            │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  DMZ: Public-Facing Services (172.20.1.0/24)            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │    │
│  │  │Cloudflare│  │   API    │  │  Webhook │              │    │
│  │  │  Tunnel  │  │  Brain   │  │ Receiver │              │    │
│  │  │          │  │  :8000   │  │          │              │    │
│  │  └──────────┘  └──────────┘  └──────────┘              │    │
│  └─────────────────────────────────────────────────────────┘    │
│     │                                                            │
│     │ Internal API Calls                                         │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Application Tier (172.20.2.0/24)                       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │    │
│  │  │   n8n    │  │ Skyvern  │  │  Steel   │              │    │
│  │  │ :5678    │  │ :8030    │  │ :3005    │              │    │
│  │  └──────────┘  └──────────┘  └──────────┘              │    │
│  └─────────────────────────────────────────────────────────┘    │
│     │                                                            │
│     │ Database Connections                                       │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Data Tier (172.20.3.0/24)                              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │    │
│  │  │ Postgres │  │  Redis   │  │  Vault   │              │    │
│  │  │ :5432    │  │ :6379    │  │ :8200    │              │    │
│  │  └──────────┘  └──────────┘  └──────────┘              │    │
│  └─────────────────────────────────────────────────────────┘    │
│     ▲                                                            │
│     │ Management Access                                          │
│  ┌──┴──────────────────────────────────────────────────────┐    │
│  │  Management Tier (172.20.4.0/24)                        │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │    │
│  │  │Grafana   │  │Prometheus│  │  Vault   │              │    │
│  │  │:3001     │  │ :9090    │  │  UI      │              │    │
│  │  └──────────┘  └──────────┘  └──────────┘              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Default Policy: DENY ALL                                        │
│  Allowed: Explicit service-to-service                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Network Zones

### Zone Definitions

| Zone | CIDR | Purpose | Trust Level |
|------|------|---------|-------------|
| **DMZ** | 172.20.1.0/24 | Public-facing services | Low |
| **Application** | 172.20.2.0/24 | Business logic services | Medium |
| **Data** | 172.20.3.0/24 | Databases and storage | High |
| **Management** | 172.20.4.0/24 | Monitoring and tools | High |
| **External** | Variable | Cloudflare, APIs | Untrusted |

### Zone Communication Matrix

| From / To | DMZ | Application | Data | Management | External |
|-----------|-----|-------------|------|------------|----------|
| **DMZ** | ✓ | ✓ | ✗ | ✗ | ✓ (outbound) |
| **Application** | ✗ | ✓ | ✓ | ✗ | ✓ (limited) |
| **Data** | ✗ | ✗ | ✓ | ✗ | ✗ |
| **Management** | ✓ | ✓ | ✓ | ✓ | ✓ (limited) |
| **External** | ✓ | ✗ | ✗ | ✗ | N/A |

---

## 🔒 Docker Network Policies

### Network Creation

```bash
#!/bin/bash
# scripts/setup-networks.sh

echo "Creating secure Docker networks..."

# Remove existing networks
docker network rm sin-solver-dmz 2>/dev/null || true
docker network rm sin-solver-app 2>/dev/null || true
docker network rm sin-solver-data 2>/dev/null || true
docker network rm sin-solver-mgmt 2>/dev/null || true

# Create DMZ network
docker network create \
    --driver bridge \
    --subnet=172.20.1.0/24 \
    --gateway=172.20.1.1 \
    --opt com.docker.network.bridge.name=sin-dmz \
    --opt com.docker.network.bridge.enable_icc=false \
    sin-solver-dmz

# Create Application network
docker network create \
    --driver bridge \
    --subnet=172.20.2.0/24 \
    --gateway=172.20.2.1 \
    --opt com.docker.network.bridge.name=sin-app \
    --opt com.docker.network.bridge.enable_icc=false \
    sin-solver-app

# Create Data network (internal only)
docker network create \
    --driver bridge \
    --subnet=172.20.3.0/24 \
    --gateway=172.20.3.1 \
    --opt com.docker.network.bridge.name=sin-data \
    --internal \
    sin-solver-data

# Create Management network (internal only)
docker network create \
    --driver bridge \
    --subnet=172.20.4.0/24 \
    --gateway=172.20.4.1 \
    --opt com.docker.network.bridge.name=sin-mgmt \
    --internal \
    sin-solver-mgmt

echo "✅ Networks created successfully"
echo ""
docker network ls | grep sin-solver
```

### Service Network Assignment

```yaml
# docker-compose.networks.yml

version: '3.9'

services:
  # DMZ Services
  cloudflared:
    networks:
      - dmz
      - app
    # Can communicate with DMZ and App tiers
  
  api-brain:
    networks:
      - dmz
      - app
      - data
    # Can communicate with all tiers
  
  # Application Services
  n8n:
    networks:
      - app
      - data
    # Can communicate with App and Data tiers
  
  skyvern:
    networks:
      - app
      - data
  
  steel:
    networks:
      - app
  
  # Data Services
  postgres:
    networks:
      - data
    # Only accessible within Data tier
  
  redis:
    networks:
      - data
  
  vault:
    networks:
      - data
      - mgmt
  
  # Management Services
  grafana:
    networks:
      - mgmt
      - app
      - data
    # Can monitor all tiers
  
  prometheus:
    networks:
      - mgmt
      - app
      - data

networks:
  dmz:
    external: true
    name: sin-solver-dmz
  app:
    external: true
    name: sin-solver-app
  data:
    external: true
    name: sin-solver-data
  mgmt:
    external: true
    name: sin-solver-mgmt
```

---

## 🛡️ iptables Firewall Rules

### Host-Level Firewall

```bash
#!/bin/bash
# scripts/setup-firewall.sh

# Flush existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X

# Default policy: DROP
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (from management IPs only)
iptables -A INPUT -p tcp --dport 22 -s 172.20.4.0/24 -j ACCEPT

# Allow Cloudflare Tunnel (outbound only)
iptables -A OUTPUT -p tcp --dport 7844 -d region1.argotunnel.com -j ACCEPT

# Inter-zone forwarding rules

# DMZ to App (limited)
iptables -A FORWARD -i sin-dmz -o sin-app -p tcp --dport 8000 -j ACCEPT  # API Brain
iptables -A FORWARD -i sin-dmz -o sin-app -p tcp --dport 5678 -j ACCEPT  # n8n

# App to Data (limited)
iptables -A FORWARD -i sin-app -o sin-data -p tcp --dport 5432 -j ACCEPT  # PostgreSQL
iptables -A FORWARD -i sin-app -o sin-data -p tcp --dport 6379 -j ACCEPT  # Redis
iptables -A FORWARD -i sin-app -o sin-data -p tcp --dport 8200 -j ACCEPT  # Vault

# Management to all (for monitoring)
iptables -A FORWARD -i sin-mgmt -o sin-app -j ACCEPT
iptables -A FORWARD -i sin-mgmt -o sin-data -j ACCEPT

# Deny all other forwarding
iptables -A FORWARD -j DROP

# Save rules
iptables-save > /etc/iptables/rules.v4

echo "✅ Firewall rules applied"
```

### Docker Network Isolation

```bash
#!/bin/bash
# scripts/isolate-networks.sh

# Disable inter-container communication by default
# (Enabled via explicit --link or networks in compose)

# Prevent containers from accessing host services
echo "net.ipv4.ip_forward=0" >> /etc/sysctl.conf
sysctl -p

# Enable Docker userland proxy (safer than hairpin NAT)
echo '{"userland-proxy": true}' > /etc/docker/daemon.json
systemctl restart docker
```

---

## 📊 Service Communication Policies

### Allowed Connections

| Source Service | Destination | Port | Protocol | Purpose |
|---------------|-------------|------|----------|---------|
| cloudflared | api-brain | 8000 | TCP | API Gateway |
| cloudflared | n8n | 5678 | TCP | Workflow Engine |
| cloudflared | vault | 8200 | TCP | Secrets UI |
| api-brain | postgres | 5432 | TCP | Database |
| api-brain | redis | 6379 | TCP | Cache |
| api-brain | vault | 8200 | TCP | Secrets API |
| n8n | postgres | 5432 | TCP | Workflow storage |
| n8n | redis | 6379 | TCP | Queue/Cache |
| skyvern | postgres | 5432 | TCP | Task storage |
| skyvern | redis | 6379 | TCP | Session cache |
| prometheus | api-brain | 8000 | TCP | Metrics |
| prometheus | postgres | 5432 | TCP | DB Metrics |
| prometheus | redis | 6379 | TCP | Cache Metrics |

### Denied Connections (Blocked by Default)

| Source | Destination | Reason |
|--------|-------------|--------|
| Any external | postgres | Direct DB access prohibited |
| Any external | redis | Direct cache access prohibited |
| Any external | vault | Direct vault access prohibited |
| n8n | external APIs | Must use proxy/vault |
| skyvern | external APIs | Must use proxy/vault |

---

## 🔐 Zero Trust Network Access

### Principles

1. **Never Trust, Always Verify**
   - Every connection is authenticated
   - Every request is authorized
   - Every action is logged

2. **Least Privilege Access**
   - Services only access what they need
   - Time-limited credentials
   - Just-in-time access

3. **Assume Breach**
   - Network segmentation limits blast radius
   - Lateral movement is restricted
   - Monitoring detects anomalies

### Implementation

```yaml
# Zero Trust Policy Configuration

authentication:
  method: mTLS
  certificate_authority: vault-pki
  
authorization:
  policy_engine: opa  # Open Policy Agent
  policies:
    - service-to-service
    - user-to-service
    - admin-override

auditing:
  log_destination: loki
  retention: 90 days
  real_time_alerting: true
```

---

## 📈 Monitoring & Alerting

### Network Flow Monitoring

```bash
#!/bin/bash
# scripts/monitor-network.sh

# Monitor inter-container traffic
echo "Active connections between containers:"
netstat -tn | grep ESTABLISHED | awk '{print $4, $5}' | sort | uniq -c | sort -rn

# Monitor by network
echo ""
echo "Traffic by Docker network:"
for network in sin-solver-dmz sin-solver-app sin-solver-data sin-solver-mgmt; do
    echo "Network: $network"
    iptables -L FORWARD -v -n | grep $network
done

# Detect unusual connections
echo ""
echo "Checking for unauthorized connections..."
# Implement custom checks based on allowed_connections matrix
```

### Alerting Rules

```yaml
# prometheus-rules/network.yml

groups:
  - name: network_security
    rules:
      - alert: UnauthorizedNetworkAccess
        expr: |
          (
            container_network_receive_bytes_total{interface!="eth0"} > 0
            and
            container_label_network_zone != "allowed"
          )
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Unauthorized network access detected"
          description: "Container {{ $labels.name }} accessing unauthorized network"
      
      - alert: DatabaseExternalAccess
        expr: |
          container_network_receive_bytes_total{name=~".*postgres.*", interface="eth0"} > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database receiving external traffic"
          description: "PostgreSQL container receiving traffic from external interface"
      
      - alert: HighInterZoneTraffic
        expr: |
          rate(container_network_transmit_bytes_total[5m]) > 104857600
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High inter-zone network traffic"
          description: "Container {{ $labels.name }} generating >100MB/s traffic"
```

---

## 🚨 Incident Response

### Network Compromise Response

```bash
#!/bin/bash
# scripts/respond-network-compromise.sh

COMPROMISED_CONTAINER=$1

echo "🚨 Network Compromise Response"
echo "Container: $COMPROMISED_CONTAINER"
echo "Time: $(date)"

# Step 1: Isolate from network
echo "Step 1: Isolating container..."
docker network disconnect sin-solver-dmz $COMPROMISED_CONTAINER 2>/dev/null || true
docker network disconnect sin-solver-app $COMPROMISED_CONTAINER 2>/dev/null || true
docker network disconnect sin-solver-data $COMPROMISED_CONTAINER 2>/dev/null || true
docker network disconnect sin-solver-mgmt $COMPROMISED_CONTAINER 2>/dev/null || true

# Step 2: Capture network traffic
echo "Step 2: Capturing network traffic..."
tcpdump -i any -w /forensics/capture-$(date +%Y%m%d-%H%M%S).pcap -W 1 -G 60 2>/dev/null &
TCPDUMP_PID=$!
sleep 30
kill $TCPDUMP_PID 2>/dev/null || true

# Step 3: Block at firewall level
echo "Step 3: Blocking at firewall..."
CONTAINER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $COMPROMISED_CONTAINER)
iptables -A INPUT -s $CONTAINER_IP -j DROP
iptables -A FORWARD -s $CONTAINER_IP -j DROP
iptables -A OUTPUT -d $CONTAINER_IP -j DROP

# Step 4: Alert
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"🚨 Network compromise: $COMPROMISED_CONTAINER isolated\"}"

echo "✅ Response completed"
```

---

## 📝 Document Information

| Attribute | Value |
|-----------|-------|
| **Document ID** | SEC-11-NETWORK-POLICIES |
| **Version** | 1.0.0 |
| **Classification** | Internal Use Only |
| **Author** | SIN-Solver Security Team |
| **Created** | 2026-01-30 |
| **Last Updated** | 2026-01-30 |
| **Review Cycle** | Quarterly |
| **Next Review** | 2026-04-30 |

---

*For additional security documentation, see the 26-Pillar Security Documentation Index.*
