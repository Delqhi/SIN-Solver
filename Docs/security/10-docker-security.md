# 🐳 Docker Security Guide

**Document ID:** SEC-10-DOCKER-SECURITY  
**Version:** 1.0.0  
**Classification:** Internal Use Only  
**Last Updated:** 2026-01-30  

---

## 📋 Overview

This document provides comprehensive security guidelines for Docker container deployment in the SIN-Solver platform. Container security is critical as our entire infrastructure runs on Docker, making proper hardening essential for maintaining a secure environment.

### Container Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│              DOCKER SECURITY LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Host Security                                         │
│  ├── OS hardening                                               │
│  ├── Docker daemon configuration                                │
│  ├── Resource limits                                            │
│  └── Audit logging                                              │
│                                                                  │
│  Layer 2: Image Security                                        │
│  ├── Base image selection                                       │
│  ├── Image scanning                                             │
│  ├── Minimal images                                             │
│  └── No secrets in images                                       │
│                                                                  │
│  Layer 3: Container Runtime                                     │
│  ├── Non-root user                                              │
│  ├── Read-only filesystem                                       │
│  ├── Dropped capabilities                                       │
│  └── Security profiles                                          │
│                                                                  │
│  Layer 4: Network Security                                      │
│  ├── Network segmentation                                       │
│  ├── No exposed ports                                           │
│  ├── Encrypted communication                                    │
│  └── Service mesh                                               │
│                                                                  │
│  Layer 5: Secrets Management                                    │
│  ├── No hardcoded secrets                                       │
│  ├── Runtime secret injection                                   │
│  ├── Secret rotation                                            │
│  └── Audit logging                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Secure Base Images

### Approved Base Images

| Image | Use Case | Size | Security Features |
|-------|----------|------|-------------------|
| `distroless` | Production apps | ~20MB | No shell, minimal attack surface |
| `alpine` | General purpose | ~5MB | musl libc, busybox, minimal |
| `scratch` | Static binaries | ~0MB | Empty base, ultimate minimalism |
| `debian:slim` | Compatibility | ~70MB | Standard libc, good compatibility |
| `ubuntu:minimal` | Enterprise | ~50MB | Canonical security updates |

### Image Selection Guidelines

```dockerfile
# ❌ AVOID: Full Ubuntu image
FROM ubuntu:22.04

# ❌ AVOID: Latest tag (non-deterministic)
FROM node:latest

# ❌ AVOID: No version pinning
FROM python:3.9

# ✅ GOOD: Specific version with slim variant
FROM node:20.11-alpine3.19

# ✅ GOOD: Distroless for production
FROM gcr.io/distroless/nodejs20-debian12

# ✅ GOOD: Multi-stage build
FROM python:3.11-alpine AS builder
# ... build steps ...

FROM python:3.11-alpine
COPY --from=builder /app /app
```

---

## 🔒 Dockerfile Security

### Security Best Practices

```dockerfile
# ============================================
# SECURE DOCKERFILE EXAMPLE
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Install dependencies (as root for build)
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application
COPY . .

# Build application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

WORKDIR /app

# Security: Copy only necessary files
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/package.json ./

# Security: Set proper permissions
RUN chmod -R 550 /app && \
    chmod -R 770 /app/tmp 2>/dev/null || true

# Security: Use non-root user
USER appuser

# Security: Expose only necessary port
EXPOSE 3000

# Security: Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

# Security: No shell
CMD ["node", "dist/main.js"]
```

### Dockerfile Security Checklist

- [ ] Use specific image versions (no `latest`)
- [ ] Use minimal base images (alpine, distroless, slim)
- [ ] Create and use non-root user
- [ ] Copy with `--chown` to set ownership
- [ ] Remove unnecessary tools (curl, wget, ssh)
- [ ] Clean package manager cache
- [ ] Use multi-stage builds
- [ ] No secrets in environment variables
- [ ] No secrets in layers
- [ ] Read-only filesystem where possible
- [ ] Health check defined

---

## 🛡️ Container Runtime Security

### Docker Compose Security

```yaml
# Docker/agents/agent-01-n8n/docker-compose.yml

version: '3.9'

services:
  agent-01-n8n-orchestrator:
    image: n8nio/n8n:latest
    container_name: agent-01-n8n-orchestrator
    
    # Security: Non-root user
    user: "1000:1000"
    
    # Security: Read-only root filesystem
    read_only: true
    
    # Security: Temporary filesystems
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
      - /var/tmp:noexec,nosuid,size=100m
    
    # Security: Drop all capabilities
    cap_drop:
      - ALL
    
    # Security: Add only required capabilities
    cap_add:
      - NET_BIND_SERVICE  # Only if binding to ports < 1024
    
    # Security: No new privileges
    security_opt:
      - no-new-privileges:true
    
    # Security: AppArmor profile
    security_opt:
      - apparmor:docker-default
    
    # Security: Seccomp profile
    security_opt:
      - seccomp:./seccomp-profile.json
    
    # Security: Resource limits
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
          pids: 100
        reservations:
          cpus: '0.5'
          memory: 512M
    
    # Security: Restart policy
    restart: unless-stopped
    
    # Security: No exposed ports (use Cloudflare Tunnel)
    # ports:
    #   - "5678:5678"  # ❌ Don't expose directly
    
    # Security: Internal network only
    networks:
      - sin-solver-network
    
    # Security: Secrets from Vault (not env vars)
    environment:
      N8N_HOST: agent-01-n8n-orchestrator
      # ❌ DON'T: N8N_ENCRYPTION_KEY: "hardcoded-secret"
      # ✅ DO: Use Vault integration
    
    # Security: Health check
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:5678/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    
    # Security: Logging
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service_name,environment"

networks:
  sin-solver-network:
    external: true
```

### Security Profiles

#### AppArmor Profile

```bash
# /etc/apparmor.d/docker-n8n

#include <tunables/global>

profile docker-n8n flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  
  network inet stream,
  network inet6 stream,
  
  # Allow specific capabilities
  capability net_bind_service,
  
  # Deny dangerous capabilities
  deny capability sys_admin,
  deny capability sys_ptrace,
  deny capability sys_module,
  deny capability dac_read_search,
  
  # File access
  /app/** r,
  /app/data/** rw,
  /tmp/** rw,
  
  # Deny access to sensitive files
  deny /etc/shadow r,
  deny /etc/passwd r,
  deny /proc/*/mem r,
  deny /proc/*/mem w,
}
```

#### Seccomp Profile

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64", "SCMP_ARCH_X86"],
  "syscalls": [
    {
      "names": [
        "accept",
        "accept4",
        "bind",
        "clone",
        "close",
        "connect",
        "epoll_create",
        "epoll_create1",
        "epoll_ctl",
        "epoll_pwait",
        "epoll_wait",
        "exit",
        "exit_group",
        "fcntl",
        "fstat",
        "futex",
        "getpid",
        "getrandom",
        "getsockname",
        "getsockopt",
        "ioctl",
        "listen",
        "mmap",
        "mprotect",
        "munmap",
        "nanosleep",
        "open",
        "openat",
        "poll",
        "read",
        "recvfrom",
        "recvmsg",
        "rt_sigaction",
        "rt_sigprocmask",
        "rt_sigreturn",
        "select",
        "sendmsg",
        "sendto",
        "setitimer",
        "setsockopt",
        "shutdown",
        "sigaltstack",
        "socket",
        "socketpair",
        "write",
        "writev"
      ],
      "action": "SCMP_ACT_ALLOW"
    },
    {
      "names": ["execve", "execveat"],
      "action": "SCMP_ACT_ALLOW",
      "args": []
    }
  ]
}
```

---

## 🔍 Image Scanning

### Trivy Security Scanner

```bash
#!/bin/bash
# scripts/scan-images.sh

# Install Trivy
# curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh

IMAGES=(
    "sin-solver/api-brain:latest"
    "sin-solver/n8n:latest"
    "sin-solver/vault:latest"
)

SEVERITY="HIGH,CRITICAL"
EXIT_CODE=0

for image in "${IMAGES[@]}"; do
    echo "================================"
    echo "Scanning: $image"
    echo "================================"
    
    # Scan for vulnerabilities
    trivy image \
        --severity $SEVERITY \
        --exit-code 1 \
        --no-progress \
        --format table \
        $image
    
    if [ $? -ne 0 ]; then
        echo "❌ Vulnerabilities found in $image"
        EXIT_CODE=1
    else
        echo "✅ No vulnerabilities found in $image"
    fi
    
    echo ""
done

exit $EXIT_CODE
```

### Docker Scout

```bash
# Enable Docker Scout
docker scout enroll

# Scan image
docker scout cves sin-solver/api-brain:latest

# Compare with base image
docker scout compare sin-solver/api-brain:latest --to node:20-alpine

# Generate SBOM
docker scout sbom --format spdx sin-solver/api-brain:latest
```

### CI/CD Integration

```yaml
# .github/workflows/security-scan.yml

name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build image
        run: docker build -t test-image .
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'test-image'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
      
      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

---

## 🔐 Secrets Management in Containers

### Anti-Patterns (NEVER DO)

```dockerfile
# ❌ NEVER: Hardcoded secrets
ENV API_KEY="sk-abc123..."

# ❌ NEVER: Secrets in build args
ARG DATABASE_PASSWORD
ENV DB_PASS=$DATABASE_PASSWORD

# ❌ NEVER: Secrets in layers
COPY secrets.txt /app/

# ❌ NEVER: Secrets in environment variables
ENV JWT_SECRET="my-super-secret-key"
```

### Best Practices (ALWAYS DO)

```dockerfile
# ✅ ALWAYS: Use runtime secret injection
# Dockerfile
FROM node:20-alpine
# ... no secrets here ...
CMD ["node", "server.js"]

# docker-compose.yml
services:
  app:
    image: myapp:latest
    environment:
      # Reference Vault, not hardcoded value
      VAULT_ADDR: http://vault:8200
    secrets:
      - vault_token

secrets:
  vault_token:
    external: true
```

### Runtime Secret Injection

```bash
#!/bin/bash
# entrypoint.sh - Runtime secret injection

set -e

# Fetch secrets from Vault
export DB_PASSWORD=$(vault kv get -field=password secret/infrastructure/postgres)
export API_KEY=$(vault kv get -field=api_key secret/services/api-brain)

# Verify secrets are set
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Failed to fetch database password"
    exit 1
fi

# Start application
exec "$@"
```

---

## 🌐 Network Security

### Docker Network Segmentation

```yaml
# docker-compose.networks.yml

version: '3.9'

networks:
  # Public-facing services
  frontend:
    driver: bridge
    internal: false
    ipam:
      config:
        - subnet: 172.20.1.0/24
  
  # Internal services only
  backend:
    driver: bridge
    internal: true  # No external access
    ipam:
      config:
        - subnet: 172.20.2.0/24
  
  # Database tier
  database:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.20.3.0/24
  
  # Management/Monitoring
  management:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.20.4.0/24

services:
  api:
    networks:
      - frontend
      - backend
  
  database:
    networks:
      - database
    # No access to frontend or backend
  
  monitoring:
    networks:
      - management
      - backend
      - database
```

### Firewall Rules

```bash
#!/bin/bash
# scripts/docker-firewall.sh

# Default deny all
docker network create --opt com.docker.network.bridge.name=docker0 \
    --opt com.docker.network.bridge.enable_icc=false \
    --opt com.docker.network.bridge.enable_ip_masquerade=true \
    secure-network

# Allow specific inter-container communication
# Using Docker Compose networking instead of iptables
```

---

## 📊 Monitoring & Auditing

### Container Auditing

```bash
#!/bin/bash
# scripts/audit-containers.sh

echo "Container Security Audit"
echo "======================="

# Check for privileged containers
echo "Privileged containers:"
docker ps -q | xargs -I {} docker inspect {} --format='{{.Name}}: {{.HostConfig.Privileged}}' | grep true

# Check for containers running as root
echo ""
echo "Containers running as root:"
docker ps -q | xargs -I {} docker exec {} id -u 2>/dev/null | grep "^0$"

# Check for containers with mounted Docker socket
echo ""
echo "Containers with Docker socket:"
docker ps -q | xargs -I {} docker inspect {} --format='{{.Name}}: {{range .Mounts}}{{if eq .Source "/var/run/docker.sock"}}MOUNTED{{end}}{{end}}' | grep MOUNTED

# Check for containers without resource limits
echo ""
echo "Containers without memory limits:"
docker ps -q | xargs -I {} docker inspect {} --format='{{.Name}}: {{.HostConfig.Memory}}' | grep "0$"

# Check image vulnerabilities
echo ""
echo "Scanning images for vulnerabilities..."
for image in $(docker images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>"); do
    echo "Scanning $image..."
    trivy image --severity HIGH,CRITICAL --exit-code 0 --quiet $image 2>/dev/null | grep -E "(Total|HIGH|CRITICAL)" || echo "  No vulnerabilities found"
done
```

### Docker Bench Security

```bash
# Run Docker Bench for Security
docker run -it --net host --pid host --userns host --cap-add audit_control \
    -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST \
    -v /etc:/etc:ro \
    -v /usr/bin/docker-containerd:/usr/bin/docker-containerd:ro \
    -v /usr/bin/docker-runc:/usr/bin/docker-runc:ro \
    -v /usr/lib/systemd:/usr/lib/systemd:ro \
    -v /var/lib:/var/lib:ro \
    -v /var/run/docker.sock:/var/run/docker.sock:ro \
    --label docker_bench_security \
    docker/docker-bench-security
```

---

## 🚨 Incident Response

### Container Compromise Response

```bash
#!/bin/bash
# scripts/respond-to-compromise.sh

CONTAINER_ID=$1

echo "🚨 Container Compromise Response"
echo "Container: $CONTAINER_ID"
echo "Time: $(date)"
echo ""

# Step 1: Isolate container
echo "Step 1: Isolating container..."
docker network disconnect sin-solver-network $CONTAINER_ID
docker network disconnect bridge $CONTAINER_ID 2>/dev/null || true

# Step 2: Capture forensic data
echo "Step 2: Capturing forensic data..."
mkdir -p /forensics/$(date +%Y%m%d-%H%M%S)
docker inspect $CONTAINER_ID > /forensics/container-inspect.json
docker logs $CONTAINER_ID > /forensics/container-logs.txt
docker export $CONTAINER_ID -o /forensics/container-filesystem.tar

# Step 3: Stop but don't remove (preserve evidence)
echo "Step 3: Stopping container..."
docker stop $CONTAINER_ID

# Step 4: Alert
echo "Step 4: Sending alerts..."
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"🚨 Container compromise detected: $CONTAINER_ID\"}"

echo ""
echo "✅ Response completed"
echo "📁 Forensic data: /forensics/"
echo "🔍 Container preserved for investigation"
```

---

## 📝 Document Information

| Attribute | Value |
|-----------|-------|
| **Document ID** | SEC-10-DOCKER-SECURITY |
| **Version** | 1.0.0 |
| **Classification** | Internal Use Only |
| **Author** | SIN-Solver Security Team |
| **Created** | 2026-01-30 |
| **Last Updated** | 2026-01-30 |
| **Review Cycle** | Quarterly |
| **Next Review** | 2026-04-30 |

---

*For additional security documentation, see the 26-Pillar Security Documentation Index.*
