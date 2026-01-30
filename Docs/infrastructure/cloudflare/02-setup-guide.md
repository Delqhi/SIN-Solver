# Cloudflare Tunnel Setup Guide

**Document ID:** 02-cloudflare-setup-guide  
**Version:** 1.0  
**Last Updated:** 2026-01-30  
**Status:** ACTIVE - PRODUCTION READY  
**Compliance:** 26-Pillar Documentation Standard (Pillar 7: Deployment)

---

## Prerequisites

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **Docker** | 20.10+ | 24.0+ |
| **Docker Compose** | 1.29+ | 2.20+ |
| **cloudflared CLI** | 2023.1.0+ | Latest |
| **RAM** | 4 GB | 8 GB |
| **Network** | Internet access | Stable broadband |

### Cloudflare Requirements

- Cloudflare account (free tier sufficient)
- Domain added to Cloudflare DNS
- Admin access to domain

### Required Access

| Resource | Access Level | Purpose |
|----------|--------------|---------|
| Cloudflare Dashboard | Admin | Create/manage tunnels |
| Domain DNS | Edit | Create DNS records |
| Docker Host | Root/Sudo | Run containers |

---

## Installation

### Step 1: Install cloudflared CLI

#### macOS

```bash
# Using Homebrew
brew install cloudflared

# Verify installation
cloudflared --version
```

#### Linux (Ubuntu/Debian)

```bash
# Download latest release
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64

# Make executable
chmod +x cloudflared-linux-amd64

# Move to PATH
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Verify installation
cloudflared --version
```

#### Linux (CentOS/RHEL/Fedora)

```bash
# Download latest release
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64

# Make executable and install
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Verify
cloudflared --version
```

### Step 2: Authenticate with Cloudflare

```bash
# Login to Cloudflare (opens browser)
cloudflared tunnel login

# This creates ~/.cloudflared/cert.pem
# Keep this file secure - it provides account access
```

**Expected Output:**
```
A browser window should have opened at the following URL:

https://dash.cloudflare.com/argotunnel?callback=https%3A%2F%2Flocalhost%3A...

If the browser failed to open, please visit the URL above directly in your browser.
```

---

## Tunnel Creation

### Step 3: Create the Tunnel

```bash
# Create tunnel with name "Delqhi-Platform"
cloudflared tunnel create Delqhi-Platform

# Expected output:
# Tunnel credentials written to /Users/username/.cloudflared/<tunnel-id>.json
# Keep this file secret. To revoke these credentials, delete the tunnel.
# Created tunnel Delqhi-Platform with id <tunnel-id>
```

### Step 4: Copy Credentials

```bash
# Copy credentials to project directory
cp ~/.cloudflared/*.json infrastructure/cloudflare/credentials.json

# Secure the file
chmod 600 infrastructure/cloudflare/credentials.json

# Add to .gitignore (CRITICAL!)
echo "infrastructure/cloudflare/credentials.json" >> .gitignore
echo "infrastructure/cloudflare/*.json" >> .gitignore
```

**⚠️ SECURITY WARNING:** Never commit credentials.json to git!

---

## Configuration

### Step 5: Configure Ingress Rules

Edit `infrastructure/cloudflare/config.yml`:

```yaml
tunnel: Delqhi-Platform
credentials-file: /etc/cloudflared/credentials.json

ingress:
  # Dashboard (Mission Control)
  - hostname: dashboard.delqhi.com
    service: http://room-01-dashboard-cockpit:3011

  # n8n Orchestrator
  - hostname: n8n.delqhi.com
    service: http://agent-01-n8n-orchestrator:5678

  # Skyvern (Visual Solver)
  - hostname: skyvern.delqhi.com
    service: http://agent-06-skyvern-solver:8000

  # Steel Browser (Stealth)
  - hostname: steel.delqhi.com
    service: http://agent-05-steel-browser:3000

  # Stagehand (Research)
  - hostname: stagehand.delqhi.com
    service: http://agent-07-stagehand-research:8000

  # Vault UI (HashiCorp Vault)
  - hostname: vault.delqhi.com
    service: http://room-02-tresor-vault:8200

  # Vault API (Integration Layer)
  - hostname: vault-api.delqhi.com
    service: http://room-02-tresor-api:8002

  # NocoDB (Database UI)
  - hostname: nocodb.delqhi.com
    service: http://room-21-nocodb-ui:8080

  # Supabase Studio
  - hostname: supabase.delqhi.com
    service: http://room-16-supabase-studio:3000

  # CodeServer API
  - hostname: codeserver.delqhi.com
    service: http://agent-04-opencode-secretary:9000

  # Survey Worker
  - hostname: survey.delqhi.com
    service: http://solver-18-survey-worker:8018

  # Captcha Worker
  - hostname: captcha.delqhi.com
    service: http://builder-1.1-captcha-worker:8019

  # RocketChat
  - hostname: chat.delqhi.com
    service: http://room-09-clawdbot-messenger:8080

  # Video Generator
  - hostname: video.delqhi.com
    service: http://room-05-generator-video:8215

  # Social MCP
  - hostname: social.delqhi.com
    service: http://room-20.3-social-mcp:8213

  # Deep Research MCP
  - hostname: research.delqhi.com
    service: http://agent-07-stagehand-research:3000

  # Plane (Project Management)
  - hostname: plane.delqhi.com
    service: http://room-11-plane-mcp:8216

  # API Brain (Main API Gateway)
  - hostname: api.delqhi.com
    service: http://room-13-api-brain:8000

  # Hoppscotch (API Testing)
  - hostname: hoppscotch.delqhi.com
    service: http://room-24-hoppscotch-api:3000

  # BillionMail (Email Marketing)
  - hostname: mail.delqhi.com
    service: http://room-22-billionmail-web:8091

  # FlowiseAI (Visual AI Builder)
  - hostname: flowise.delqhi.com
    service: http://room-23-flowiseai-web:8092

  # Default Fallback
  - service: http_status:404
```

### Step 6: Configure DNS Routes

For each service, create a DNS CNAME record:

```bash
# Dashboard
cloudflared tunnel route dns Delqhi-Platform dashboard.delqhi.com

# n8n
cloudflared tunnel route dns Delqhi-Platform n8n.delqhi.com

# API
cloudflared tunnel route dns Delqhi-Platform api.delqhi.com

# Continue for all services...
```

**Bulk DNS Setup Script:**

```bash
#!/bin/bash
# setup-dns.sh

TUNNEL_NAME="Delqhi-Platform"

DOMAINS=(
  "dashboard.delqhi.com"
  "n8n.delqhi.com"
  "skyvern.delqhi.com"
  "steel.delqhi.com"
  "stagehand.delqhi.com"
  "vault.delqhi.com"
  "vault-api.delqhi.com"
  "nocodb.delqhi.com"
  "supabase.delqhi.com"
  "codeserver.delqhi.com"
  "survey.delqhi.com"
  "captcha.delqhi.com"
  "chat.delqhi.com"
  "video.delqhi.com"
  "social.delqhi.com"
  "research.delqhi.com"
  "plane.delqhi.com"
  "api.delqhi.com"
  "hoppscotch.delqhi.com"
  "mail.delqhi.com"
  "flowise.delqhi.com"
)

for domain in "${DOMAINS[@]}"; do
  echo "Creating DNS route for $domain..."
  cloudflared tunnel route dns "$TUNNEL_NAME" "$domain"
done

echo "All DNS routes created!"
```

Run the script:
```bash
chmod +x setup-dns.sh
./setup-dns.sh
```

---

## Docker Deployment

### Step 7: Create Docker Network

```bash
# Create shared network (if not exists)
docker network create sin-solver-network 2>/dev/null || echo "Network already exists"

# Verify network
docker network ls | grep sin-solver-network
```

### Step 8: Start Cloudflare Tunnel Container

```bash
# Navigate to tunnel directory
cd Docker/rooms/room-00-cloudflared-tunnel

# Start the container
docker-compose up -d

# Verify it's running
docker-compose ps

# Check logs
docker-compose logs -f
```

**Expected Output:**
```
NAME                           IMAGE                              STATUS
room-00-cloudflared-tunnel     cloudflare/cloudflared:latest      Up 5 seconds
```

### Step 9: Verify Tunnel Health

```bash
# Check tunnel status in Cloudflare
cloudflared tunnel info Delqhi-Platform

# Expected output:
# NAME              ID      CREATED              STATUS  
# Delqhi-Platform   xxxxx   2026-01-30T10:00:00Z Healthy
```

---

## Adding New Services

### Step-by-Step Process

#### 1. Update config.yml

Add new ingress rule to `infrastructure/cloudflare/config.yml`:

```yaml
# New Service: Example
- hostname: newservice.delqhi.com
  service: http://container-name:port
```

**Best Practices:**
- Add in alphabetical order by hostname
- Include descriptive comment
- Use consistent naming convention

#### 2. Create DNS Route

```bash
cloudflared tunnel route dns Delqhi-Platform newservice.delqhi.com
```

#### 3. Reload Tunnel Configuration

```bash
# Option 1: Restart container
cd Docker/rooms/room-00-cloudflared-tunnel
docker-compose restart

# Option 2: Send reload signal
docker kill --signal=HUP room-00-cloudflared-tunnel
```

#### 4. Verify Access

```bash
# Test with curl
curl -I https://newservice.delqhi.com

# Expected: HTTP/2 200
```

### Service Configuration Template

```yaml
# Add to infrastructure/cloudflare/config.yml

  # [Service Name] - [Brief Description]
  - hostname: [subdomain].delqhi.com
    service: http://[container-name]:[port]
    # Optional: Add headers
    originRequest:
      connectTimeout: 30s
      tlsTimeout: 10s
```

---

## Environment Variables

### Required Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `CLOUDFLARE_TUNNEL_TOKEN` | Tunnel authentication token | Yes | - |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TUNNEL_LOG_LEVEL` | Logging verbosity | `info` |
| `TUNNEL_METRICS` | Metrics endpoint | `localhost:45678` |
| `TUNNEL_TRANSPORT_PROTOCOL` | QUIC or http2 | `quic` |

### Setting Environment Variables

Create `.env` file in `Docker/rooms/room-00-cloudflared-tunnel/`:

```bash
# .env
CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token-here
TUNNEL_LOG_LEVEL=info
```

**Get Tunnel Token:**
```bash
# List tunnels to get ID
cloudflared tunnel list

# Get token for specific tunnel
cloudflared tunnel token <tunnel-id>
```

---

## Advanced Configuration

### Load Balancing (Multiple Origins)

```yaml
ingress:
  - hostname: api.delqhi.com
    service: http://room-13-api-brain:8000
    # Enable load balancing across multiple instances
    originRequest:
      pool: api-pool
      loadBalancer:
        - address: room-13-api-brain-1:8000
        - address: room-13-api-brain-2:8000
```

### Access Policies (Zero Trust)

```yaml
ingress:
  - hostname: vault.delqhi.com
    service: http://room-02-tresor-vault:8200
    # Require authentication
    access:
      required: true
      teamName: your-team
      audTag:
        - your-access-policy-id
```

### Custom Headers

```yaml
ingress:
  - hostname: api.delqhi.com
    service: http://room-13-api-brain:8000
    originRequest:
      httpHeaders:
        X-Forwarded-Proto: https
        X-Real-IP: ${CF-Connecting-IP}
```

---

## Management Commands

### Using tunnel.sh Script

```bash
# From project root
./infrastructure/cloudflare/tunnel.sh <command>

Commands:
  setup      Initial tunnel setup (login, create, configure)
  start      Start the tunnel (local mode)
  stop       Stop the tunnel
  status     Check tunnel status
  endpoints  Show public endpoints
```

### Manual Management

```bash
# Start tunnel locally (not in Docker)
cloudflared tunnel --config infrastructure/cloudflare/config.yml run Delqhi-Platform

# Run in background
nohup cloudflared tunnel --config infrastructure/cloudflare/config.yml run Delqhi-Platform > /var/log/cloudflared.log 2>&1 &

# List all tunnels
cloudflared tunnel list

# Delete tunnel (DANGER!)
cloudflared tunnel delete Delqhi-Platform
```

### Docker Management

```bash
# Start
docker-compose -f Docker/rooms/room-00-cloudflared-tunnel/docker-compose.yml up -d

# Stop
docker-compose -f Docker/rooms/room-00-cloudflared-tunnel/docker-compose.yml down

# Restart
docker-compose -f Docker/rooms/room-00-cloudflared-tunnel/docker-compose.yml restart

# View logs
docker-compose -f Docker/rooms/room-00-cloudflared-tunnel/docker-compose.yml logs -f

# Update image
docker-compose -f Docker/rooms/room-00-cloudflared-tunnel/docker-compose.yml pull
docker-compose -f Docker/rooms/room-00-cloudflared-tunnel/docker-compose.yml up -d
```

---

## Verification Checklist

### Post-Setup Verification

- [ ] cloudflared CLI installed and working
- [ ] Tunnel created successfully
- [ ] Credentials file copied and secured
- [ ] config.yml updated with all services
- [ ] DNS routes created for all hostnames
- [ ] Docker network created
- [ ] Container running without errors
- [ ] Tunnel status shows "Healthy"
- [ ] All services accessible via public domains
- [ ] credentials.json in .gitignore

### Testing Commands

```bash
# Test each service
for domain in dashboard n8n api vault; do
  echo "Testing $domain.delqhi.com..."
  curl -s -o /dev/null -w "%{http_code}" https://$domain.delqhi.com
done

# Check tunnel metrics
curl http://localhost:45678/metrics

# View tunnel info
cloudflared tunnel info Delqhi-Platform
```

---

## Troubleshooting Setup Issues

### Issue: "Failed to create tunnel"

**Cause:** Authentication token expired or invalid

**Solution:**
```bash
# Re-authenticate
cloudflared tunnel login

# Try creating tunnel again
cloudflared tunnel create Delqhi-Platform
```

### Issue: "Credentials file not found"

**Cause:** File not copied to correct location

**Solution:**
```bash
# Find credentials file
find ~/.cloudflared -name "*.json" -type f

# Copy to project
cp ~/.cloudflared/<tunnel-id>.json infrastructure/cloudflare/credentials.json
```

### Issue: "DNS route already exists"

**Cause:** Domain already has DNS record

**Solution:**
```bash
# Delete existing route first
cloudflared tunnel route dns delete Delqhi-Platform domain.delqhi.com

# Create new route
cloudflared tunnel route dns Delqhi-Platform domain.delqhi.com
```

### Issue: "Container fails to start"

**Cause:** Network or volume issues

**Solution:**
```bash
# Check network exists
docker network ls | grep sin-solver-network

# Create if missing
docker network create sin-solver-network

# Check config file exists
ls -la infrastructure/cloudflare/config.yml
ls -la infrastructure/cloudflare/credentials.json
```

---

## Next Steps

After completing setup:

1. **Configure Monitoring** - Set up health checks and alerts
2. **Enable Access Policies** - Add Zero Trust authentication
3. **Review Security** - Audit access logs and permissions
4. **Document Changes** - Update service inventory

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [01-overview.md](./01-overview.md) | Architecture and service inventory |
| [03-troubleshooting.md](./03-troubleshooting.md) | Common issues and solutions |
| [04-backup-restore.md](./04-backup-restore.md) | Backup and disaster recovery |
| [05-service-mapping.md](./05-service-mapping.md) | Detailed service configuration |

---

**Document Status:** ✅ COMPLETE - Ready for production deployment
