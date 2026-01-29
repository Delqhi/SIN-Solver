# Room-01 Dashboard Cockpit - Security

## Security Considerations

This document outlines security considerations, best practices, and configurations for the Room-01 Dashboard Cockpit.

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: Network Security                                                   │
│  ├── Firewall rules                                                          │
│  ├── VPN/Private network access                                              │
│  └── DDoS protection (Cloudflare)                                           │
│                                                                             │
│  Layer 2: Transport Security                                                 │
│  ├── TLS 1.2/1.3 encryption                                                  │
│  ├── Certificate pinning                                                     │
│  └── HSTS headers                                                            │
│                                                                             │
│  Layer 3: Application Security                                               │
│  ├── Authentication (JWT)                                                    │
│  ├── Authorization (RBAC)                                                    │
│  ├── Input validation                                                        │
│  └── Rate limiting                                                           │
│                                                                             │
│  Layer 4: Container Security                                                 │
│  ├── Docker socket access controls                                           │
│  ├── Read-only filesystems                                                   │
│  └── Resource limits                                                         │
│                                                                             │
│  Layer 5: Data Security                                                      │
│  ├── Encryption at rest                                                      │
│  ├── Encryption in transit                                                   │
│  └── Secret management                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication

### JWT-Based Authentication

The dashboard uses JSON Web Tokens (JWT) for authentication:

```javascript
// Token structure
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-id",
    "username": "admin",
    "role": "admin",
    "iat": 1706534400,
    "exp": 1706620800
  },
  "signature": "..."
}
```

### Token Configuration

| Setting | Recommended Value | Description |
|---------|------------------|-------------|
| Algorithm | HS256 or RS256 | Signing algorithm |
| Access Token TTL | 15 minutes | Short-lived access tokens |
| Refresh Token TTL | 7 days | Long-lived refresh tokens |
| Secret Length | 256+ bits | Minimum secret entropy |

### Implementation

```javascript
// lib/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '15m';
const JWT_REFRESH_EXPIRES_IN = '7d';

export function generateTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' }
  );
  
  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
  
  return { accessToken, refreshToken };
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

---

## Authorization

### Role-Based Access Control (RBAC)

| Role | Container View | Container Control | Logs | Settings |
|------|---------------|-------------------|------|----------|
| `viewer` | ✓ | ✗ | ✗ | ✗ |
| `operator` | ✓ | ✓ | ✓ | ✗ |
| `admin` | ✓ | ✓ | ✓ | ✓ |

### Permission Implementation

```javascript
// middleware/authorization.js
const PERMISSIONS = {
  viewer: ['containers:read', 'stats:read'],
  operator: ['containers:read', 'containers:control', 'logs:read', 'stats:read'],
  admin: ['*']
};

export function requirePermission(permission) {
  return (req, res, next) => {
    const userRole = req.user.role;
    const userPermissions = PERMISSIONS[userRole] || [];
    
    if (userPermissions.includes('*') || userPermissions.includes(permission)) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  };
}

// Usage
app.post('/api/docker/containers/:id/start', 
  authenticate,
  requirePermission('containers:control'),
  containerController.start
);
```

---

## Docker Socket Security

### Risks

Mounting the Docker socket (`/var/run/docker.sock`) grants the container:
- Full access to Docker daemon
- Ability to start/stop any container
- Access to host filesystem via volume mounts
- Potential for container escape

### Mitigations

#### 1. Read-Only Mount

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

#### 2. Docker Socket Proxy

Use a proxy to filter and limit Docker API access:

```yaml
services:
  docker-proxy:
    image: tecnativa/docker-socket-proxy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - CONTAINERS=1
      - IMAGES=0
      - VOLUMES=0
      - NETWORKS=0
      - POST=0  # Disable POST requests
  
  room-01-dashboard:
    environment:
      - DOCKER_HOST=tcp://docker-proxy:2375
```

#### 3. User Namespace Remapping

Enable Docker user namespace remapping:

```json
// /etc/docker/daemon.json
{
  "userns-remap": "default"
}
```

---

## Input Validation

### API Input Validation

```javascript
// lib/validation.js
import { z } from 'zod';

const containerActionSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  action: z.enum(['start', 'stop', 'restart']),
  timeout: z.number().int().min(1).max(300).optional()
});

const fileRequestSchema = z.object({
  file: z.enum(['AGENTS.md', 'lastchanges.md', 'userprompts.md', 'README.md'])
});

export function validateInput(schema, data) {
  try {
    return schema.parse(data);
  } catch (error) {
    throw new Error(`Validation error: ${error.message}`);
  }
}
```

### File Path Sanitization

```javascript
// lib/security.js
import path from 'path';

const ALLOWED_FILES = ['AGENTS.md', 'lastchanges.md', 'userprompts.md', 'README.md'];
const DOCS_PATH = '/app/docs';

export function sanitizeFilePath(requestedFile) {
  // Check whitelist
  if (!ALLOWED_FILES.includes(requestedFile)) {
    throw new Error('File not in whitelist');
  }
  
  // Prevent directory traversal
  if (requestedFile.includes('..') || requestedFile.includes('/')) {
    throw new Error('Invalid file path');
  }
  
  // Resolve to absolute path
  const filePath = path.resolve(DOCS_PATH, requestedFile);
  
  // Ensure path is within allowed directory
  if (!filePath.startsWith(DOCS_PATH)) {
    throw new Error('Path traversal detected');
  }
  
  return filePath;
}
```

---

## Rate Limiting

### Implementation

```javascript
// middleware/rateLimit.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export function rateLimit(options = {}) {
  const { windowMs = 60000, max = 100, keyPrefix = 'rate' } = options;
  
  return async (req, res, next) => {
    const key = `${keyPrefix}:${req.ip}`;
    
    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.pexpire(key, windowMs);
      }
      
      const ttl = await redis.pttl(key);
      
      // Set headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
      res.setHeader('X-RateLimit-Reset', Date.now() + ttl);
      
      if (current > max) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(ttl / 1000)
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Usage
app.use('/api/docker', rateLimit({ windowMs: 60000, max: 100 }));
app.use('/api/docker/containers/:id/start', rateLimit({ windowMs: 60000, max: 10 }));
```

---

## CORS Configuration

### Secure CORS Setup

```javascript
// middleware/cors.js
import cors from 'cors';

const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400  // 24 hours
};

export default cors(corsOptions);
```

---

## Security Headers

### Helmet Configuration

```javascript
// middleware/security.js
import helmet from 'helmet';

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],  // For iframes
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'same-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' }
});

export default securityHeaders;
```

---

## Secret Management

### Environment Variables

Never commit secrets to version control:

```bash
# .env (add to .gitignore!)
JWT_SECRET=your-super-secret-key
DB_PASSWORD=your-db-password
API_KEY=your-api-key
```

### Docker Secrets

```yaml
# docker-compose.yml
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  db_password:
    file: ./secrets/db_password.txt

services:
  room-01-dashboard:
    secrets:
      - jwt_secret
      - db_password
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - DB_PASSWORD_FILE=/run/secrets/db_password
```

### Vault Integration

```javascript
// lib/vault.js
import Vault from 'node-vault';

const vault = Vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_URL,
  token: process.env.VAULT_TOKEN
});

export async function getSecret(path) {
  const { data } = await vault.read(`secret/data/${path}`);
  return data.data;
}

// Usage
const dbCredentials = await getSecret('dashboard/database');
```

---

## Audit Logging

### Security Event Logging

```javascript
// lib/audit.js
import winston from 'winston';

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/audit.log' })
  ]
});

export function logSecurityEvent(event) {
  auditLogger.info({
    timestamp: new Date().toISOString(),
    type: 'security',
    ...event
  });
}

// Usage
logSecurityEvent({
  action: 'container_start',
  user: req.user.username,
  container: req.params.id,
  ip: req.ip,
  userAgent: req.headers['user-agent']
});
```

### Events to Log

- Authentication attempts (success/failure)
- Container start/stop/restart actions
- File access (AGENTS.md, lastchanges.md)
- Permission changes
- Configuration changes
- API key usage

---

## Container Security

### Dockerfile Best Practices

```dockerfile
# Use minimal base image
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Change ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3011

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3011/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

### Security Scanning

```bash
# Scan Docker image for vulnerabilities
docker scan room-01-dashboard-cockpit:latest

# Or use Trivy
trivy image room-01-dashboard-cockpit:latest
```

---

## Network Security

### Firewall Rules

```bash
# UFW (Ubuntu)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow from 172.20.0.0/16 to any port 3011  # Internal network only
ufw enable
```

### Network Segmentation

```yaml
# docker-compose.yml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access

services:
  room-01-dashboard:
    networks:
      - frontend
      - backend
  
  room-03-postgres:
    networks:
      - backend  # Only accessible from backend network
```

---

## Security Checklist

### Pre-Deployment

- [ ] JWT secret is strong (256+ bits)
- [ ] Docker socket is read-only or proxied
- [ ] CORS origins are restricted
- [ ] Rate limiting is enabled
- [ ] Input validation is implemented
- [ ] Security headers are configured
- [ ] HTTPS is enforced
- [ ] Secrets are not in code/repository

### Runtime

- [ ] Container runs as non-root user
- [ ] Resource limits are set
- [ ] Health checks are configured
- [ ] Audit logging is enabled
- [ ] Monitoring alerts are set up
- [ ] Regular security scans scheduled

### Regular Maintenance

- [ ] Update dependencies monthly
- [ ] Review access logs weekly
- [ ] Rotate secrets quarterly
- [ ] Security scan images before deployment
- [ ] Review and update firewall rules

---

## Incident Response

### Security Incident Procedure

1. **Detect**: Monitor logs and alerts
2. **Contain**: Isolate affected systems
3. **Investigate**: Analyze logs and evidence
4. **Remediate**: Fix vulnerabilities
5. **Recover**: Restore services
6. **Learn**: Update procedures

### Emergency Contacts

- Security Team: security@sin-solver.io
- On-Call: +1-XXX-XXX-XXXX
- Slack: #security-incidents

---

## Related Documentation

- [06-configuration.md](./06-room-01-configuration.md) - Security configuration
- [03-troubleshooting.md](./03-room-01-troubleshooting.md) - Security troubleshooting
- [07-deployment.md](./07-room-01-deployment.md) - Secure deployment
