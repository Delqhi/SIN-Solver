# SIN-Solver Enterprise Deployment Guide

> **Production Deployment Documentation**  
> **Version:** 2.1.0  
> **Last Updated:** February 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Infrastructure Requirements](#infrastructure-requirements)
3. [Docker Compose Deployment](#docker-compose-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Docker Swarm Deployment](#docker-swarm-deployment)
6. [Terraform Infrastructure](#terraform-infrastructure)
7. [CI/CD Pipelines](#cicd-pipelines)
8. [Backup Strategies](#backup-strategies)
9. [Disaster Recovery](#disaster-recovery)
10. [Monitoring & Alerting](#monitoring--alerting)
11. [Security Hardening](#security-hardening)

---

## Overview

This guide covers production deployment options for SIN-Solver Enterprise:

| Deployment Type | Best For | Complexity | Scale |
|-----------------|----------|------------|-------|
| Docker Compose | Small teams, testing | Low | < 1000 req/min |
| Kubernetes | Enterprise, scale | High | Unlimited |
| Docker Swarm | Mid-size, simplicity | Medium | < 5000 req/min |
| Terraform Cloud | Multi-region, IaC | High | Unlimited |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌───────────────┐   │
│  │   CDN/WAF       │───▶│  Load Balancer  │───▶│  API Gateway  │   │
│  │  Cloudflare     │    │   (HAProxy)     │    │   (Kong/AWS)  │   │
│  └─────────────────┘    └─────────────────┘    └───────┬───────┘   │
│                                                        │            │
│                           ┌────────────────────────────┤            │
│                           ▼                            ▼            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    KUBERNETES CLUSTER                        │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐              │   │
│  │  │ API Pods   │ │ Worker Pods│ │ Steel Pool │              │   │
│  │  │ (3+ replicas)│ (10+ nodes)│ │ (5+ nodes) │              │   │
│  │  └────────────┘ └────────────┘ └────────────┘              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│       ┌───────────────────┼───────────────────┐                    │
│       ▼                   ▼                   ▼                    │
│  ┌──────────┐      ┌──────────┐      ┌──────────────┐             │
│  │ Postgres │      │  Redis   │      │ HashiCorp    │             │
│  │ Cluster  │      │ Cluster  │      │ Vault        │             │
│  │ (HA)     │      │ (Sentinel)│     │ (HA)         │             │
│  └──────────┘      └──────────┘      └──────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Infrastructure Requirements

### Minimum Production Specs

| Component | CPU | Memory | Storage | Instances |
|-----------|-----|--------|---------|-----------|
| API Server | 2 cores | 4 GB | 20 GB SSD | 3 |
| Worker Nodes | 4 cores | 8 GB | 50 GB SSD | 10 |
| Steel Browser | 4 cores | 8 GB | 30 GB SSD | 5 |
| PostgreSQL | 4 cores | 16 GB | 500 GB SSD | 3 (HA) |
| Redis | 2 cores | 4 GB | 20 GB SSD | 3 (HA) |
| Vault | 2 cores | 4 GB | 20 GB SSD | 3 (HA) |

### Recommended Production Specs (High Volume)

| Component | CPU | Memory | Storage | Instances |
|-----------|-----|--------|---------|-----------|
| API Server | 4 cores | 8 GB | 50 GB NVMe | 5 |
| Worker Nodes | 8 cores | 16 GB | 100 GB NVMe | 20 |
| Steel Browser | 8 cores | 16 GB | 50 GB NVMe | 10 |
| PostgreSQL | 8 cores | 32 GB | 2 TB NVMe | 3 (HA) |
| Redis | 4 cores | 16 GB | 100 GB NVMe | 5 (Cluster) |
| Vault | 2 cores | 8 GB | 50 GB NVMe | 3 (HA) |

### Network Requirements

| Requirement | Specification |
|-------------|---------------|
| Bandwidth | 1 Gbps minimum |
| Latency | < 50ms between nodes |
| Firewall | Allow 80, 443, 8000, 5678, 5432, 6379 |
| DNS | Internal DNS resolution |
| TLS | Valid certificates required |

### Supported Platforms

| Platform | Versions | Status |
|----------|----------|--------|
| AWS EKS | 1.28+ | ✅ Fully Supported |
| GCP GKE | 1.28+ | ✅ Fully Supported |
| Azure AKS | 1.28+ | ✅ Fully Supported |
| On-premise K8s | 1.28+ | ✅ Supported |
| Docker 20.10+ | Any | ✅ Supported |
| Podman | 4.0+ | ⚠️ Experimental |

---

## Docker Compose Deployment

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/Delqhi/SIN-Solver.git
cd SIN-Solver

# 2. Copy production environment
cp .env.example .env.production

# 3. Edit environment variables
nano .env.production

# 4. Create Docker network
docker network create sin-solver-network

# 5. Start infrastructure
docker-compose -f docker-compose.prod.yml up -d

# 6. Verify deployment
./scripts/health-check.sh
```

### Production Docker Compose File

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # API Gateway
  api:
    image: sin-solver/api:v2.1.0
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - VAULT_ADDR=${VAULT_ADDR}
      - SECRET_KEY=${SECRET_KEY}
    ports:
      - "8000:8000"
    networks:
      - sin-solver
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # Worker Pool
  worker:
    image: sin-solver/worker:v2.1.0
    deploy:
      replicas: 10
      resources:
        limits:
          cpus: '4'
          memory: 8G
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - MISTRAL_API_KEY=${MISTRAL_API_KEY}
    networks:
      - sin-solver
    restart: unless-stopped

  # Steel Browser Pool
  steel:
    image: sin-solver/steel:v2.1.0
    deploy:
      replicas: 5
      resources:
        limits:
          cpus: '4'
          memory: 8G
    environment:
      - STEEL_MAX_SESSIONS=10
    networks:
      - sin-solver
    restart: unless-stopped

  # PostgreSQL Primary
  postgres-primary:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres-primary-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    networks:
      - sin-solver
    restart: unless-stopped

  # PostgreSQL Replica
  postgres-replica:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres-replica-data:/var/lib/postgresql/data
    networks:
      - sin-solver
    restart: unless-stopped

  # Redis Cluster
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 4gb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    networks:
      - sin-solver
    restart: unless-stopped

  # HashiCorp Vault
  vault:
    image: hashicorp/vault:1.15
    cap_add:
      - IPC_LOCK
    environment:
      - VAULT_ADDR=http://0.0.0.0:8200
    volumes:
      - vault-data:/vault/file
      - ./vault-config:/vault/config
    networks:
      - sin-solver
    restart: unless-stopped

  # Load Balancer
  haproxy:
    image: haproxy:2.8-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./haproxy/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
      - ./certs:/etc/ssl/certs:ro
    networks:
      - sin-solver
    restart: unless-stopped

volumes:
  postgres-primary-data:
  postgres-replica-data:
  redis-data:
  vault-data:

networks:
  sin-solver:
    driver: bridge
```

### Environment Variables

```bash
# .env.production
# Core Settings
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=$(openssl rand -hex 32)

# Database
DATABASE_URL=postgresql://sinuser:${POSTGRES_PASSWORD}@postgres-primary:5432/sinsolver
POSTGRES_USER=sinuser
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=sinsolver

# Redis
REDIS_URL=redis://redis-master:6379/0

# Vault
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=$(cat vault/root-token)

# AI Model API Keys
GEMINI_API_KEY=your-gemini-key
MISTRAL_API_KEY=your-mistral-key
GROQ_API_KEY=your-groq-key

# Monitoring
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
GRAFANA_API_KEY=your-grafana-key

# SSL/TLS
SSL_CERT_PATH=/etc/ssl/certs/sin-solver.crt
SSL_KEY_PATH=/etc/ssl/private/sin-solver.key
```

---

## Kubernetes Deployment

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     KUBERNETES CLUSTER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    INGRESS CONTROLLER                    │   │
│  │                 (nginx-ingress / Traefik)               │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│  ┌─────────────────────────┴───────────────────────────────┐   │
│  │                     SERVICES LAYER                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │   │
│  │  │ API svc  │  │ Worker   │  │ Steel    │  │ Vault  │  │   │
│  │  │:8000     │  │ svc      │  │ svc      │  │ svc    │  │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  │   │
│  └───────┼─────────────┼─────────────┼────────────┼───────┘   │
│          │             │             │            │            │
│  ┌───────┴─────────────┴─────────────┴────────────┴───────┐   │
│  │                     WORKLOADS                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │   │
│  │  │ API Pods │  │ Worker   │  │ Steel    │  │ Vault  │  │   │
│  │  │(3 replicas)│ StatefulSet│  │ DaemonSet│  │Stateful│  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     DATA STORES                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ PostgreSQL   │  │ Redis Cluster│  │ Vault HA     │   │   │
│  │  │(StatefulSet) │  │(StatefulSet) │  │(StatefulSet) │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Namespace and RBAC

```yaml
# k8s/00-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sin-solver
  labels:
    name: sin-solver
    environment: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sin-solver-api
  namespace: sin-solver
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: sin-solver-api
  namespace: sin-solver
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: sin-solver-api
  namespace: sin-solver
subjects:
  - kind: ServiceAccount
    name: sin-solver-api
roleRef:
  kind: Role
  name: sin-solver-api
  apiGroup: rbac.authorization.k8s.io
```

### ConfigMap and Secrets

```yaml
# k8s/01-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sin-solver-config
  namespace: sin-solver
data:
  ENVIRONMENT: "production"
  DEBUG: "false"
  DATABASE_URL: "postgresql://sinuser:placeholder@postgres:5432/sinsolver"
  REDIS_URL: "redis://redis:6379/0"
  VAULT_ADDR: "http://vault:8200"
---
apiVersion: v1
kind: Secret
metadata:
  name: sin-solver-secrets
  namespace: sin-solver
type: Opaque
stringData:
  SECRET_KEY: "your-secret-key-here"
  GEMINI_API_KEY: "your-gemini-key"
  MISTRAL_API_KEY: "your-mistral-key"
  POSTGRES_PASSWORD: "your-postgres-password"
```

### API Deployment

```yaml
# k8s/10-api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sin-solver-api
  namespace: sin-solver
  labels:
    app: sin-solver-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: sin-solver-api
  template:
    metadata:
      labels:
        app: sin-solver-api
    spec:
      serviceAccountName: sin-solver-api
      containers:
        - name: api
          image: sin-solver/api:v2.1.0
          ports:
            - containerPort: 8000
              name: http
          envFrom:
            - configMapRef:
                name: sin-solver-config
            - secretRef:
                name: sin-solver-secrets
          resources:
            requests:
              memory: "2Gi"
              cpu: "1000m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: sin-solver-api
  namespace: sin-solver
  labels:
    app: sin-solver-api
spec:
  type: ClusterIP
  ports:
    - port: 8000
      targetPort: 8000
      name: http
  selector:
    app: sin-solver-api
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sin-solver-api
  namespace: sin-solver
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
    - hosts:
        - api.sin-solver.io
      secretName: sin-solver-tls
  rules:
    - host: api.sin-solver.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: sin-solver-api
                port:
                  number: 8000
```

### Worker Deployment

```yaml
# k8s/11-worker-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: sin-solver-worker
  namespace: sin-solver
  labels:
    app: sin-solver-worker
spec:
  serviceName: sin-solver-worker
  replicas: 10
  selector:
    matchLabels:
      app: sin-solver-worker
  template:
    metadata:
      labels:
        app: sin-solver-worker
    spec:
      containers:
        - name: worker
          image: sin-solver/worker:v2.1.0
          envFrom:
            - configMapRef:
                name: sin-solver-config
            - secretRef:
                name: sin-solver-secrets
          resources:
            requests:
              memory: "4Gi"
              cpu: "2000m"
            limits:
              memory: "8Gi"
              cpu: "4000m"
          volumeMounts:
            - name: worker-data
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: worker-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 50Gi
```

### PostgreSQL StatefulSet

```yaml
# k8s/20-postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: sin-solver
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_USER
              value: sinuser
            - name: POSTGRES_DB
              value: sinsolver
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: sin-solver-secrets
                  key: POSTGRES_PASSWORD
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              memory: "16Gi"
              cpu: "4000m"
            limits:
              memory: "32Gi"
              cpu: "8000m"
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 500Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: sin-solver
spec:
  type: ClusterIP
  clusterIP: None
  ports:
    - port: 5432
  selector:
    app: postgres
```

### Redis Cluster

```yaml
# k8s/21-redis.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: sin-solver
spec:
  serviceName: redis
  replicas: 5
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
              name: redis
            - containerPort: 16379
              name: cluster
          command:
            - redis-server
            - --appendonly
            - "yes"
            - --maxmemory
            - 4gb
            - --maxmemory-policy
            - allkeys-lru
            - --cluster-enabled
            - "yes"
            - --cluster-config-file
            - /data/nodes.conf
          volumeMounts:
            - name: redis-data
              mountPath: /data
          resources:
            requests:
              memory: "4Gi"
              cpu: "2000m"
            limits:
              memory: "16Gi"
              cpu: "4000m"
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi
```

### Horizontal Pod Autoscaler

```yaml
# k8s/30-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sin-solver-api-hpa
  namespace: sin-solver
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sin-solver-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sin-solver-worker-hpa
  namespace: sin-solver
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: sin-solver-worker
  minReplicas: 10
  maxReplicas: 100
  metrics:
    - type: External
      external:
        metric:
          name: redis_queue_depth
        target:
          type: AverageValue
          averageValue: "100"
```

### Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-config.yaml
kubectl apply -f k8s/10-api-deployment.yaml
kubectl apply -f k8s/11-worker-deployment.yaml
kubectl apply -f k8s/20-postgres.yaml
kubectl apply -f k8s/21-redis.yaml
kubectl apply -f k8s/30-hpa.yaml

# Verify deployment
kubectl get pods -n sin-solver
kubectl get svc -n sin-solver
kubectl get ingress -n sin-solver

# Check logs
kubectl logs -f deployment/sin-solver-api -n sin-solver
```

---

## Docker Swarm Deployment

### Initialize Swarm

```bash
# Initialize manager
docker swarm init --advertise-addr <MANAGER-IP>

# Join workers
docker swarm join --token <TOKEN> <MANAGER-IP>:2377

# Verify nodes
docker node ls
```

### Stack Configuration

```yaml
# docker-stack.yml
version: '3.8'

services:
  api:
    image: sin-solver/api:v2.1.0
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: '2'
          memory: 4G
    environment:
      - ENVIRONMENT=production
    networks:
      - sin-solver
    ports:
      - "8000:8000"

  worker:
    image: sin-solver/worker:v2.1.0
    deploy:
      mode: global
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: '4'
          memory: 8G
    environment:
      - ENVIRONMENT=production
    networks:
      - sin-solver

  postgres:
    image: postgres:15-alpine
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
    secrets:
      - postgres_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - sin-solver

  redis:
    image: redis:7-alpine
    deploy:
      replicas: 1
    networks:
      - sin-solver

secrets:
  postgres_password:
    external: true

volumes:
  postgres-data:

networks:
  sin-solver:
    driver: overlay
    attachable: true
```

### Deploy Stack

```bash
# Create secrets
echo "your-postgres-password" | docker secret create postgres_password -

# Deploy stack
docker stack deploy -c docker-stack.yml sin-solver

# Verify
docker stack ps sin-solver
docker service ls
```

---

## Terraform Infrastructure

### Directory Structure

```
terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── backend.tf
├── modules/
│   ├── vpc/
│   ├── eks/
│   ├── rds/
│   ├── elasticache/
│   └── vault/
└── environments/
    ├── production/
    ├── staging/
    └── development/
```

### Main Configuration

```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
  
  backend "s3" {
    bucket         = "sin-solver-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "sin-solver-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "SIN-Solver"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  name               = "sin-solver-${var.environment}"
  cidr               = var.vpc_cidr
  availability_zones = var.availability_zones
  private_subnets    = var.private_subnets
  public_subnets     = var.public_subnets
}

# EKS Cluster
module "eks" {
  source = "./modules/eks"
  
  cluster_name    = "sin-solver-${var.environment}"
  cluster_version = "1.28"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  
  node_groups = {
    api = {
      desired_size   = 3
      min_size       = 2
      max_size       = 10
      instance_types = ["m6i.xlarge"]
      capacity_type  = "ON_DEMAND"
    }
    workers = {
      desired_size   = 10
      min_size       = 5
      max_size       = 50
      instance_types = ["m6i.2xlarge"]
      capacity_type  = "SPOT"
    }
  }
}

# RDS PostgreSQL
module "rds" {
  source = "./modules/rds"
  
  identifier     = "sin-solver-${var.environment}"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  
  allocated_storage = 500
  max_storage       = 2000
  
  multi_az               = true
  db_subnet_group_name   = module.vpc.database_subnet_group
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
}

# ElastiCache Redis
module "redis" {
  source = "./modules/elasticache"
  
  cluster_id       = "sin-solver-${var.environment}"
  engine_version   = "7.0"
  node_type        = "cache.r6g.xlarge"
  num_cache_nodes  = 3
  
  subnet_group_name  = module.vpc.elasticache_subnet_group
  security_group_ids = [aws_security_group.redis.id]
}
```

### Variables

```hcl
# terraform/variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnets" {
  description = "Private subnet CIDRs"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets" {
  description = "Public subnet CIDRs"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}
```

### Deploy with Terraform

```bash
# Initialize
cd terraform/environments/production
terraform init

# Plan
terraform plan -out=tfplan

# Apply
terraform apply tfplan

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name sin-solver-production

# Verify
kubectl get nodes
```

---

## CI/CD Pipelines

### GitHub Actions

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: sin-solver
  EKS_CLUSTER: sin-solver-production

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: pytest tests/ --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build and push images
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/api:$IMAGE_TAG -f Dockerfile.api .
          docker build -t $ECR_REGISTRY/worker:$IMAGE_TAG -f Dockerfile.worker .
          docker push $ECR_REGISTRY/api:$IMAGE_TAG
          docker push $ECR_REGISTRY/worker:$IMAGE_TAG
          
          # Tag as latest
          docker tag $ECR_REGISTRY/api:$IMAGE_TAG $ECR_REGISTRY/api:latest
          docker tag $ECR_REGISTRY/worker:$IMAGE_TAG $ECR_REGISTRY/worker:latest
          docker push $ECR_REGISTRY/api:latest
          docker push $ECR_REGISTRY/worker:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER
      
      - name: Deploy to EKS
        env:
          IMAGE_TAG: ${{ github.sha }}
        run: |
          # Update image tags
          sed -i "s|image: sin-solver/api:.*|image: ${{ steps.login-ecr.outputs.registry }}/api:$IMAGE_TAG|" k8s/10-api-deployment.yaml
          sed -i "s|image: sin-solver/worker:.*|image: ${{ steps.login-ecr.outputs.registry }}/worker:$IMAGE_TAG|" k8s/11-worker-deployment.yaml
          
          # Apply manifests
          kubectl apply -f k8s/
          
          # Wait for rollout
          kubectl rollout status deployment/sin-solver-api -n sin-solver
          kubectl rollout status statefulset/sin-solver-worker -n sin-solver
      
      - name: Verify deployment
        run: |
          kubectl get pods -n sin-solver
          kubectl get svc -n sin-solver
          
          # Health check
          kubectl run health-check --rm -i --restart=Never --image=curlimages/curl -- \
            curl -f http://sin-solver-api.sin-solver.svc.cluster.local:8000/health

  notify:
    needs: [test, build, deploy]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ""

.test_template: &test
  stage: test
  image: python:3.11
  script:
    - pip install -r requirements.txt
    - pip install pytest pytest-cov
    - pytest tests/ --cov=app --cov-report=xml
  coverage: '/TOTAL.*\s+(\d+%)$/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE/api:$CI_COMMIT_SHA -f Dockerfile.api .
    - docker build -t $CI_REGISTRY_IMAGE/worker:$CI_COMMIT_SHA -f Dockerfile.worker .
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker push $CI_REGISTRY_IMAGE/api:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE/worker:$CI_COMMIT_SHA

deploy_production:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context production
    - kubectl set image deployment/sin-solver-api api=$CI_REGISTRY_IMAGE/api:$CI_COMMIT_SHA -n sin-solver
    - kubectl set image statefulset/sin-solver-worker worker=$CI_REGISTRY_IMAGE/worker:$CI_COMMIT_SHA -n sin-solver
    - kubectl rollout status deployment/sin-solver-api -n sin-solver
  environment:
    name: production
    url: https://api.sin-solver.io
  only:
    - main
```

---

## Backup Strategies

### PostgreSQL Backup

```bash
#!/bin/bash
# scripts/backup-postgres.sh

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="sinsolver"
RETENTION_DAYS=30

# Create backup
pg_dump -h postgres -U sinuser -d $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$TIMESTAMP.sql.gz s3://sin-solver-backups/postgres/

# Clean old backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
aws s3 ls s3://sin-solver-backups/postgres/ | awk '{print $4}' | sort -r | tail -n +$((RETENTION_DAYS+1)) | xargs -I {} aws s3 rm s3://sin-solver-backups/postgres/{}
```

### Kubernetes CronJob for Backups

```yaml
# k8s/40-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: sin-solver
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:15-alpine
              command:
                - /bin/sh
                - -c
                - |
                  pg_dump -h postgres -U sinuser sinsolver | gzip > /backup/backup_$(date +%Y%m%d_%H%M%S).sql.gz
                  aws s3 cp /backup/*.sql.gz s3://sin-solver-backups/postgres/
              env:
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: sin-solver-secrets
                      key: POSTGRES_PASSWORD
              volumeMounts:
                - name: backup
                  mountPath: /backup
          volumes:
            - name: backup
              emptyDir: {}
          restartPolicy: OnFailure
```

### Redis Backup

```yaml
# Redis persistence is enabled (AOF + RDB)
# Backup the RDB file
apiVersion: batch/v1
kind: CronJob
metadata:
  name: redis-backup
  namespace: sin-solver
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: redis:7-alpine
              command:
                - /bin/sh
                - -c
                - |
                  redis-cli -h redis SAVE
                  aws s3 cp /data/dump.rdb s3://sin-solver-backups/redis/dump_$(date +%Y%m%d_%H%M%S).rdb
              volumeMounts:
                - name: redis-data
                  mountPath: /data
          volumes:
            - name: redis-data
              persistentVolumeClaim:
                claimName: redis-data-redis-0
          restartPolicy: OnFailure
```

### Disaster Recovery Plan

```yaml
# docs/disaster-recovery.yml
Recovery Objectives:
  RTO (Recovery Time Objective): 15 minutes
  RPO (Recovery Point Objective): 5 minutes

Scenarios:
  Database Failure:
    Detection: Automated health checks
    Response: 
      - Promote read replica to primary
      - Update application configuration
      - Alert on-call engineer
    Testing: Monthly failover drill

  Complete Region Failure:
    Detection: Global health monitoring
    Response:
      - Activate standby region
      - Update DNS to point to standby
      - Verify data consistency
    Testing: Quarterly DR drill

  Data Corruption:
    Detection: Data integrity checks
    Response:
      - Stop writes immediately
      - Restore from backup
      - Replay WAL logs to point-in-time
    Testing: Semi-annual recovery test
```

---

## Monitoring & Alerting

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  - job_name: 'sin-solver-api'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - sin-solver
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: sin-solver-api
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Alert Rules

```yaml
# monitoring/alert_rules.yml
groups:
  - name: sin-solver
    rules:
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for 5 minutes"

      - alert: HighLatency
        expr: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "p99 latency is above 500ms"

      - alert: QueueDepthHigh
        expr: redis_queue_depth > 1000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Queue depth is high"
          description: "Redis queue has {{ $value }} items"

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod is crash looping"
          description: "Pod {{ $labels.pod }} is restarting frequently"
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "SIN-Solver Production",
    "panels": [
      {
        "title": "Request Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
          }
        ]
      },
      {
        "title": "Solve Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(captcha_solves_total{status=\"success\"}[5m])) / sum(rate(captcha_solves_total[5m]))"
          }
        ]
      },
      {
        "title": "Average Solve Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(captcha_solve_duration_seconds_bucket[5m])) by (le))"
          }
        ]
      }
    ]
  }
}
```

---

## Security Hardening

### Pod Security Policies

```yaml
# k8s/security/psp.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: sin-solver-restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

### Network Policies

```yaml
# k8s/security/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: sin-solver-api
  namespace: sin-solver
spec:
  podSelector:
    matchLabels:
      app: sin-solver-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
```

### Secrets Management

```bash
# Use Sealed Secrets for GitOps
# 1. Install kubeseal
brew install kubeseal

# 2. Create secret
kubectl create secret generic sin-solver-secrets \
  --from-literal=API_KEY=secret-value \
  --dry-run=client -o yaml > secret.yaml

# 3. Seal the secret
kubeseal --format=yaml < secret.yaml > sealed-secret.yaml

# 4. Apply sealed secret
kubectl apply -f sealed-secret.yaml

# Sealed secret can be safely committed to git
```

---

<p align="center">
  <strong>SIN-Solver Enterprise Deployment Guide</strong><br>
  <sub>For additional support, contact: enterprise@sin-solver.io</sub>
</p>
