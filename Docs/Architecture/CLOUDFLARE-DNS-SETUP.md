# 🌐 Customer Cloudflare DNS Setup Architecture

**Version:** 1.0.0  
**Status:** Design Phase  
**Last Updated:** 2026-01-27  
**License:** Delqhi Proprietary

---

## 📋 Overview

Automated DNS setup for customer domains using Cloudflare Tunnels to route traffic to customer-specific Docker containers.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE DNS AUTOMATION FLOW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CUSTOMER DOMAIN (e.g., mustermann.de)                                    │
│         │                                                                   │
│         ▼                                                                   │
│   ┌─────────────────────┐                                                  │
│   │   CLOUDFLARE DNS    │ ← Customer changes nameservers                   │
│   │   (Managed by us)   │                                                  │
│   └─────────────────────┘                                                  │
│         │                                                                   │
│         ▼                                                                   │
│   ┌─────────────────────┐                                                  │
│   │  CLOUDFLARE TUNNEL  │ ← cloudflared daemon                             │
│   │  (Zero Trust)       │                                                  │
│   └─────────────────────┘                                                  │
│         │                                                                   │
│         ▼                                                                   │
│   ┌─────────────────────┐                                                  │
│   │  CUSTOMER DOCKER    │ ← Isolated container                             │
│   │  CONTAINER          │    Port: 30XX (unique per customer)              │
│   │  (localhost:30XX)   │                                                  │
│   └─────────────────────┘                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Prerequisites

### Cloudflare Account
- Cloudflare account with Zero Trust enabled
- API Token with permissions:
  - Zone:DNS:Edit
  - Zone:Zone:Read
  - Account:Cloudflare Tunnel:Edit
  - Account:Access: Apps and Policies:Edit

### Server Requirements
- `cloudflared` daemon installed
- Docker installed
- Port range 3000-4000 available
- Static IP or dynamic DNS

---

## 📋 Customer Onboarding Steps

### Step 1: Customer Adds Domain to Cloudflare (Manual)

**Customer Instructions:**
```
1. Go to dash.cloudflare.com
2. Click "Add a Site"
3. Enter your domain: mustermann.de
4. Select FREE plan
5. Copy the nameservers provided
6. Go to your domain registrar
7. Change nameservers to:
   - ns1.cloudflare.com
   - ns2.cloudflare.com
8. Wait 24-48 hours for propagation
9. Notify Delqhi support when complete
```

### Step 2: System Detects Domain Activation

**Detection Script:**
```python
import cloudflare
from datetime import datetime

async def check_domain_activation(domain: str) -> bool:
    """Check if domain nameservers point to Cloudflare"""
    cf = cloudflare.Cloudflare(api_token=CF_API_TOKEN)
    
    zones = cf.zones.list(name=domain)
    if not zones.result:
        return False
    
    zone = zones.result[0]
    return zone.status == "active"

async def monitor_pending_domains():
    """Monitor pending domains and trigger setup when active"""
    pending = await get_pending_domains()
    
    for domain in pending:
        if await check_domain_activation(domain):
            await setup_customer_tunnel(domain)
            await update_domain_status(domain, "active")
```

### Step 3: Create Cloudflare Tunnel

**Tunnel Creation:**
```bash
#!/bin/bash
# create-customer-tunnel.sh

CUSTOMER_ID=$1
CUSTOMER_DOMAIN=$2
CUSTOMER_PORT=$3

# Create tunnel
cloudflared tunnel create "customer-${CUSTOMER_ID}"

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list --output json | jq -r ".[] | select(.name==\"customer-${CUSTOMER_ID}\") | .id")

# Create DNS route
cloudflared tunnel route dns "${TUNNEL_ID}" "${CUSTOMER_DOMAIN}"

# Also create www subdomain
cloudflared tunnel route dns "${TUNNEL_ID}" "www.${CUSTOMER_DOMAIN}"

# Create config file
cat > "/etc/cloudflared/customer-${CUSTOMER_ID}.yml" << EOF
tunnel: ${TUNNEL_ID}
credentials-file: /etc/cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: ${CUSTOMER_DOMAIN}
    service: http://localhost:${CUSTOMER_PORT}
  - hostname: www.${CUSTOMER_DOMAIN}
    service: http://localhost:${CUSTOMER_PORT}
  - service: http_status:404
EOF

# Create systemd service
cat > "/etc/systemd/system/cloudflared-customer-${CUSTOMER_ID}.service" << EOF
[Unit]
Description=Cloudflare Tunnel for Customer ${CUSTOMER_ID}
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --config /etc/cloudflared/customer-${CUSTOMER_ID}.yml run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable cloudflared-customer-${CUSTOMER_ID}
systemctl start cloudflared-customer-${CUSTOMER_ID}

echo "✅ Tunnel created for ${CUSTOMER_DOMAIN} → localhost:${CUSTOMER_PORT}"
```

### Step 4: Start Customer Docker Container

**Container Deployment:**
```bash
#!/bin/bash
# deploy-customer-container.sh

CUSTOMER_ID=$1
CUSTOMER_PORT=$2
DOCKER_IMAGE=$3

# Stop existing container if any
docker stop "customer-${CUSTOMER_ID}" 2>/dev/null
docker rm "customer-${CUSTOMER_ID}" 2>/dev/null

# Run new container
docker run -d \
  --name "customer-${CUSTOMER_ID}" \
  -p "${CUSTOMER_PORT}:3000" \
  -e "DELQHI_CUSTOMER_ID=${CUSTOMER_ID}" \
  -e "DELQHI_LICENSE_KEY=${LICENSE_KEY}" \
  --restart unless-stopped \
  --memory="512m" \
  --cpus="0.5" \
  "${DOCKER_IMAGE}"

# Verify container is running
docker ps --filter "name=customer-${CUSTOMER_ID}" --format "{{.Status}}"
```

---

## 🗃️ Port Allocation Strategy

| Port Range | Purpose |
|------------|---------|
| 3000-3099 | Development/staging |
| 3100-3999 | Customer containers |
| 4000+ | Reserved for future use |

**Port Assignment:**
```python
async def allocate_customer_port(customer_id: str) -> int:
    """Allocate unique port for customer container"""
    used_ports = await get_used_ports()
    
    # Start from 3100 for customer containers
    for port in range(3100, 4000):
        if port not in used_ports:
            await save_port_allocation(customer_id, port)
            return port
    
    raise Exception("No available ports")
```

---

## 📊 Database Schema

### Tunnels Table
```sql
CREATE TABLE customer_tunnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  tunnel_id TEXT UNIQUE NOT NULL,
  tunnel_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  port INTEGER NOT NULL,
  config_path TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tunnels_customer ON customer_tunnels(customer_id);
CREATE INDEX idx_tunnels_domain ON customer_tunnels(domain);
CREATE INDEX idx_tunnels_port ON customer_tunnels(port);
```

### Container Table
```sql
CREATE TABLE customer_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  container_id TEXT UNIQUE NOT NULL,
  container_name TEXT NOT NULL,
  image_name TEXT NOT NULL,
  port INTEGER NOT NULL,
  memory_limit TEXT DEFAULT '512m',
  cpu_limit TEXT DEFAULT '0.5',
  status TEXT DEFAULT 'running',
  last_health_check TIMESTAMPTZ,
  health_status TEXT DEFAULT 'healthy',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔄 Automation API

### Tunnel Management Service
```python
from dataclasses import dataclass
from typing import Optional
import subprocess
import json

@dataclass
class TunnelConfig:
    customer_id: str
    domain: str
    port: int
    tunnel_id: Optional[str] = None

class TunnelManager:
    def __init__(self, cf_api_token: str):
        self.cf_api_token = cf_api_token
    
    async def create_tunnel(self, config: TunnelConfig) -> str:
        """Create Cloudflare tunnel for customer"""
        tunnel_name = f"customer-{config.customer_id}"
        
        # Create tunnel
        result = subprocess.run([
            "cloudflared", "tunnel", "create", tunnel_name
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            raise Exception(f"Failed to create tunnel: {result.stderr}")
        
        # Get tunnel ID
        tunnel_id = self._get_tunnel_id(tunnel_name)
        
        # Create DNS routes
        await self._create_dns_routes(tunnel_id, config.domain)
        
        # Create config file
        await self._create_config_file(config, tunnel_id)
        
        # Create and start systemd service
        await self._create_systemd_service(config.customer_id)
        
        return tunnel_id
    
    async def delete_tunnel(self, customer_id: str):
        """Delete tunnel and cleanup"""
        tunnel_name = f"customer-{customer_id}"
        
        # Stop service
        subprocess.run([
            "systemctl", "stop", f"cloudflared-{tunnel_name}"
        ])
        
        # Delete tunnel
        subprocess.run([
            "cloudflared", "tunnel", "delete", "-f", tunnel_name
        ])
        
        # Cleanup files
        os.remove(f"/etc/cloudflared/{tunnel_name}.yml")
        os.remove(f"/etc/systemd/system/cloudflared-{tunnel_name}.service")
    
    async def get_tunnel_status(self, customer_id: str) -> dict:
        """Get tunnel health status"""
        tunnel_name = f"customer-{customer_id}"
        
        result = subprocess.run([
            "cloudflared", "tunnel", "info", tunnel_name, "--output", "json"
        ], capture_output=True, text=True)
        
        return json.loads(result.stdout)
    
    def _get_tunnel_id(self, tunnel_name: str) -> str:
        """Get tunnel ID by name"""
        result = subprocess.run([
            "cloudflared", "tunnel", "list", "--output", "json"
        ], capture_output=True, text=True)
        
        tunnels = json.loads(result.stdout)
        for tunnel in tunnels:
            if tunnel["name"] == tunnel_name:
                return tunnel["id"]
        
        raise Exception(f"Tunnel {tunnel_name} not found")
    
    async def _create_dns_routes(self, tunnel_id: str, domain: str):
        """Create DNS routes for domain"""
        # Main domain
        subprocess.run([
            "cloudflared", "tunnel", "route", "dns", tunnel_id, domain
        ])
        
        # WWW subdomain
        subprocess.run([
            "cloudflared", "tunnel", "route", "dns", tunnel_id, f"www.{domain}"
        ])
    
    async def _create_config_file(self, config: TunnelConfig, tunnel_id: str):
        """Create tunnel config file"""
        config_content = f"""
tunnel: {tunnel_id}
credentials-file: /etc/cloudflared/{tunnel_id}.json

ingress:
  - hostname: {config.domain}
    service: http://localhost:{config.port}
  - hostname: www.{config.domain}
    service: http://localhost:{config.port}
  - service: http_status:404
"""
        
        with open(f"/etc/cloudflared/customer-{config.customer_id}.yml", "w") as f:
            f.write(config_content)
    
    async def _create_systemd_service(self, customer_id: str):
        """Create and start systemd service"""
        service_content = f"""
[Unit]
Description=Cloudflare Tunnel for Customer {customer_id}
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --config /etc/cloudflared/customer-{customer_id}.yml run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
"""
        
        service_path = f"/etc/systemd/system/cloudflared-customer-{customer_id}.service"
        with open(service_path, "w") as f:
            f.write(service_content)
        
        subprocess.run(["systemctl", "daemon-reload"])
        subprocess.run(["systemctl", "enable", f"cloudflared-customer-{customer_id}"])
        subprocess.run(["systemctl", "start", f"cloudflared-customer-{customer_id}"])
```

---

## 🩺 Health Monitoring

### Health Check Service
```python
import aiohttp
import asyncio
from datetime import datetime

class HealthMonitor:
    def __init__(self, check_interval: int = 60):
        self.check_interval = check_interval
    
    async def check_customer_health(self, customer_id: str, port: int) -> dict:
        """Check customer container health"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"http://localhost:{port}/health"
                async with session.get(url, timeout=10) as resp:
                    return {
                        "status": "healthy" if resp.status == 200 else "unhealthy",
                        "response_code": resp.status,
                        "checked_at": datetime.now().isoformat()
                    }
        except Exception as e:
            return {
                "status": "unreachable",
                "error": str(e),
                "checked_at": datetime.now().isoformat()
            }
    
    async def check_tunnel_health(self, customer_id: str) -> dict:
        """Check tunnel connectivity"""
        result = subprocess.run([
            "systemctl", "is-active", f"cloudflared-customer-{customer_id}"
        ], capture_output=True, text=True)
        
        return {
            "status": result.stdout.strip(),
            "checked_at": datetime.now().isoformat()
        }
    
    async def run_health_loop(self):
        """Continuous health monitoring"""
        while True:
            customers = await get_active_customers()
            
            for customer in customers:
                container_health = await self.check_customer_health(
                    customer["id"], 
                    customer["port"]
                )
                tunnel_health = await self.check_tunnel_health(customer["id"])
                
                await save_health_status(customer["id"], {
                    "container": container_health,
                    "tunnel": tunnel_health
                })
                
                # Auto-restart if unhealthy
                if container_health["status"] != "healthy":
                    await self.restart_container(customer["id"])
                
                if tunnel_health["status"] != "active":
                    await self.restart_tunnel(customer["id"])
            
            await asyncio.sleep(self.check_interval)
    
    async def restart_container(self, customer_id: str):
        """Restart unhealthy container"""
        subprocess.run(["docker", "restart", f"customer-{customer_id}"])
        await notify_admin(f"Restarted container for {customer_id}")
    
    async def restart_tunnel(self, customer_id: str):
        """Restart unhealthy tunnel"""
        subprocess.run([
            "systemctl", "restart", f"cloudflared-customer-{customer_id}"
        ])
        await notify_admin(f"Restarted tunnel for {customer_id}")
```

---

## 🛡️ Security Considerations

### Isolation
- Each customer runs in isolated Docker container
- Separate Cloudflare tunnel per customer
- No cross-customer network access
- Resource limits (CPU, memory)

### Access Control
- Cloudflare Access policies per customer
- IP-based restrictions (optional)
- Rate limiting via Cloudflare

### Monitoring
- All traffic logged via Cloudflare
- Container logs centralized
- Alerting on anomalies

---

## 📋 Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Install cloudflared on server
- [ ] Create Cloudflare API token
- [ ] Set up port allocation system
- [ ] Create tunnel management scripts

### Phase 2: Automation
- [ ] Domain activation monitoring
- [ ] Automatic tunnel creation
- [ ] Container deployment automation
- [ ] Systemd service management

### Phase 3: Monitoring
- [ ] Health check system
- [ ] Auto-restart on failure
- [ ] Admin notifications
- [ ] Metrics dashboard

### Phase 4: Customer Portal
- [ ] DNS status display
- [ ] Container status display
- [ ] Manual restart button
- [ ] Analytics integration

---

## 🎯 Environment Variables

```bash
# Cloudflare
CF_API_TOKEN=your_cloudflare_api_token
CF_ACCOUNT_ID=your_account_id
CF_ZONE_ID=your_zone_id

# Server
TUNNEL_CONFIG_DIR=/etc/cloudflared
CUSTOMER_PORT_START=3100
CUSTOMER_PORT_END=3999

# Database
DATABASE_URL=postgresql://...

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
ADMIN_EMAIL=admin@delqhi.com
```

---

## 🔧 CLI Commands

```bash
# Create tunnel for customer
./scripts/create-customer-tunnel.sh customer_123 example.com 3100

# Delete tunnel
./scripts/delete-customer-tunnel.sh customer_123

# Check tunnel status
cloudflared tunnel info customer-customer_123

# List all tunnels
cloudflared tunnel list

# View tunnel logs
journalctl -u cloudflared-customer-customer_123 -f

# Restart tunnel
systemctl restart cloudflared-customer-customer_123
```

---

**Room:** Architecture  
**Status:** 📐 Design Complete  
**Last Updated:** 2026-01-27  
**Maintainer:** Delqhi-Platform Team  
**License:** Delqhi Proprietary
