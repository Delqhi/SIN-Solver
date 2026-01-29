# Room-01 Dashboard Cockpit - Deployment

## Deployment Instructions

This document provides comprehensive deployment instructions for the Room-01 Dashboard Cockpit.

---

## Prerequisites

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4 GB |
| Disk | 10 GB | 20 GB SSD |
| Docker | 20.10+ | Latest |
| Docker Compose | 2.0+ | Latest |

### Required Services

Before deploying the dashboard, ensure these services are running:

- **Docker Daemon** - For container management
- **Redis** (room-04) - For caching and session storage
- **PostgreSQL** (room-03) - For persistent data (optional but recommended)
- **API Brain** (room-13) - For authentication and secrets

---

## Deployment Methods

### Method 1: Docker Compose (Recommended)

#### 1. Clone Repository

```bash
git clone https://github.com/Delqhi/SIN-Solver.git
cd SIN-Solver
```

#### 2. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit configuration
nano .env
```

Minimum required configuration:
```bash
# Server
PORT=3011
NODE_ENV=production

# Docker
DOCKER_SOCKET=/var/run/docker.sock

# Redis
REDIS_URL=redis://room-04-memory-redis:6379

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-key
```

#### 3. Start Services

```bash
# Start only the dashboard
docker compose up -d room-01-dashboard-cockpit

# Or start with all dependencies
docker compose up -d
```

#### 4. Verify Deployment

```bash
# Check container status
docker ps | grep room-01

# View logs
docker logs -f room-01-dashboard-cockpit

# Test health endpoint
curl http://localhost:3011/api/health
```

#### 5. Access Dashboard

Open your browser and navigate to:
```
http://localhost:3011
```

---

### Method 2: Docker Run

#### Quick Start

```bash
docker run -d \
  --name room-01-dashboard-cockpit \
  --hostname room-01-dashboard-cockpit \
  -p 3011:3011 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v $(pwd)/docs:/app/docs:ro \
  -e PORT=3011 \
  -e NODE_ENV=production \
  -e DOCKER_SOCKET=/var/run/docker.sock \
  -e REDIS_URL=redis://room-04-memory-redis:6379 \
  -e JWT_SECRET=$(openssl rand -base64 32) \
  --network sin-solver_default \
  --restart unless-stopped \
  room-01-dashboard-cockpit:latest
```

#### With All Options

```bash
docker run -d \
  --name room-01-dashboard-cockpit \
  --hostname room-01-dashboard-cockpit \
  -p 3011:3011 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v $(pwd)/docs:/app/docs:ro \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/certs:/certs:ro \
  -e PORT=3011 \
  -e HOST=0.0.0.0 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  -e DOCKER_SOCKET=/var/run/docker.sock \
  -e REDIS_URL=redis://room-04-memory-redis:6379 \
  -e DATABASE_URL=postgresql://user:pass@room-03-archiv-postgres:5432/dashboard \
  -e API_BRAIN_URL=http://room-13-vault-api:8000 \
  -e JWT_SECRET=your-secret-key \
  -e POLLING_INTERVAL=5000 \
  -e CACHE_ENABLED=true \
  -e CORS_ORIGIN=https://dashboard.delqhi.com \
  -e RATE_LIMIT_ENABLED=true \
  --network sin-solver_default \
  --restart unless-stopped \
  --memory=512m \
  --cpus=1.0 \
  room-01-dashboard-cockpit:latest
```

---

### Method 3: Kubernetes

#### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: room-01-dashboard
  namespace: sin-solver
spec:
  replicas: 1
  selector:
    matchLabels:
      app: room-01-dashboard
  template:
    metadata:
      labels:
        app: room-01-dashboard
    spec:
      containers:
      - name: dashboard
        image: room-01-dashboard-cockpit:latest
        ports:
        - containerPort: 3011
        env:
        - name: PORT
          value: "3011"
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: dashboard-secrets
              key: jwt-secret
        volumeMounts:
        - name: docker-sock
          mountPath: /var/run/docker.sock
        - name: docs
          mountPath: /app/docs
          readOnly: true
        resources:
          limits:
            memory: "512Mi"
            cpu: "1000m"
          requests:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3011
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3011
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: docker-sock
        hostPath:
          path: /var/run/docker.sock
          type: Socket
      - name: docs
        configMap:
          name: dashboard-docs
---
apiVersion: v1
kind: Service
metadata:
  name: room-01-dashboard
  namespace: sin-solver
spec:
  selector:
    app: room-01-dashboard
  ports:
  - port: 3011
    targetPort: 3011
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: room-01-dashboard
  namespace: sin-solver
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt
spec:
  tls:
  - hosts:
    - dashboard.delqhi.com
    secretName: dashboard-tls
  rules:
  - host: dashboard.delqhi.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: room-01-dashboard
            port:
              number: 3011
```

#### Deploy

```bash
# Create namespace
kubectl create namespace sin-solver

# Create secrets
kubectl create secret generic dashboard-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  -n sin-solver

# Apply configuration
kubectl apply -f k8s/dashboard-deployment.yaml

# Verify
kubectl get pods -n sin-solver
kubectl logs -f deployment/room-01-dashboard -n sin-solver
```

---

### Method 4: Bare Metal / VM

#### Prerequisites

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

#### Installation

```bash
# Clone repository
git clone https://github.com/Delqhi/SIN-Solver.git
cd SIN-Solver/dashboard

# Install dependencies
npm install

# Build application
npm run build

# Configure environment
cp .env.example .env
nano .env
```

#### Start with PM2

```bash
# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'room-01-dashboard',
    script: './node_modules/next/dist/bin/next',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3011
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save
pm2 startup
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] SSL/TLS certificates ready
- [ ] Domain DNS configured
- [ ] Firewall rules configured
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Log aggregation configured

### Security

- [ ] JWT secret is strong and unique
- [ ] Database credentials are secure
- [ ] Docker socket has proper permissions
- [ ] CORS origins are restricted
- [ ] Rate limiting is enabled
- [ ] Authentication is required
- [ ] HTTPS is enforced

### Performance

- [ ] Redis caching enabled
- [ ] Polling interval optimized
- [ ] Resource limits set
- [ ] CDN configured for static assets
- [ ] Compression enabled

### Monitoring

- [ ] Health checks configured
- [ ] Metrics collection enabled
- [ ] Alerting rules set up
- [ ] Log aggregation working
- [ ] Uptime monitoring active

---

## SSL/TLS Configuration

### Using Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name dashboard.delqhi.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dashboard.delqhi.com;

    ssl_certificate /etc/letsencrypt/live/delqhi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/delqhi.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/logs/stream {
        proxy_pass http://localhost:3011;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### Using Traefik

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.dashboard.rule=Host(`dashboard.delqhi.com`)"
  - "traefik.http.routers.dashboard.tls=true"
  - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"
  - "traefik.http.services.dashboard.loadbalancer.server.port=3011"
```

---

## Cloudflare Tunnel

### Setup

```bash
# Install cloudflared
brew install cloudflared  # macOS
# or
docker pull cloudflare/cloudflared:latest

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create room-01-dashboard

# Configure tunnel
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: your-tunnel-id
credentials-file: /home/user/.cloudflared/your-tunnel-id.json

ingress:
  - hostname: dashboard.delqhi.com
    service: http://localhost:3011
  - service: http_status:404
EOF

# Start tunnel
cloudflared tunnel run room-01-dashboard
```

### Docker Compose

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared-tunnel
    command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
    restart: unless-stopped
    networks:
      - sin-solver
```

---

## Database Migration

### Initial Setup

```bash
# Run migrations
npm run migrate

# Seed initial data
npm run seed
```

### Backup Before Migration

```bash
# Backup PostgreSQL
docker exec room-03-archiv-postgres pg_dump -U postgres dashboard > backup.sql

# Backup Redis
docker exec room-04-memory-redis redis-cli BGSAVE
docker cp room-04-memory-redis:/data/dump.rdb ./redis-backup.rdb
```

---

## Rollback Procedure

### Docker Compose Rollback

```bash
# Stop current version
docker compose down

# Restore previous image
docker pull room-01-dashboard-cockpit:previous-version

# Update docker-compose.yml to use previous version

# Start with previous version
docker compose up -d
```

### Database Rollback

```bash
# Restore from backup
docker exec -i room-03-archiv-postgres psql -U postgres dashboard < backup.sql
```

---

## Post-Deployment Verification

### Health Checks

```bash
# Check application health
curl https://dashboard.delqhi.com/api/health

# Check all services
curl https://dashboard.delqhi.com/api/docker/containers

# Test authentication
curl -X POST https://dashboard.delqhi.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'
```

### Load Testing

```bash
# Install k6
brew install k6

# Run load test
k6 run --vus 10 --duration 30s load-test.js
```

---

## Troubleshooting Deployment

### Container Won't Start

```bash
# Check logs
docker logs room-01-dashboard-cockpit

# Check environment variables
docker inspect room-01-dashboard-cockpit | grep -A 20 Env

# Verify network connectivity
docker network inspect sin-solver_default
```

### Database Connection Failed

```bash
# Test database connection
docker exec room-01-dashboard-cockpit nc -zv room-03-archiv-postgres 5432

# Check database credentials
docker exec room-01-dashboard-cockpit env | grep DB
```

### SSL Certificate Issues

```bash
# Verify certificate
openssl s_client -connect dashboard.delqhi.com:443 -servername dashboard.delqhi.com

# Check certificate expiration
echo | openssl s_client -servername dashboard.delqhi.com -connect dashboard.delqhi.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Related Documentation

- [03-troubleshooting.md](./03-room-01-troubleshooting.md) - Troubleshooting guide
- [06-configuration.md](./06-room-01-configuration.md) - Configuration options
- [14-backup.md](./14-room-01-backup.md) - Backup procedures
- [16-maintenance.md](./16-room-01-maintenance.md) - Maintenance procedures
