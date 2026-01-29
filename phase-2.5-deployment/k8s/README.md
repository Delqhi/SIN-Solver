# Kubernetes Deployment Guide for SIN-Solver CAPTCHA Solver

**Phase:** 2.5 Kubernetes Deployment  
**Date:** 2026-01-30  
**Version:** 1.0.0  
**Status:** Production-Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Deployment Steps](#deployment-steps)
5. [Verification & Health Checks](#verification--health-checks)
6. [Operations Guide](#operations-guide)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)
9. [Scaling & Performance](#scaling--performance)
10. [Rollback Procedures](#rollback-procedures)
11. [Monitoring & Observability](#monitoring--observability)

---

## Overview

This guide provides step-by-step instructions for deploying the SIN-Solver CAPTCHA solving service to Kubernetes. The deployment includes:

- **Namespace Isolation** - Dedicated `sin-solver` namespace with resource quotas
- **ConfigMap Management** - 70+ environment variables for configuration
- **Secrets Management** - Sensitive credentials stored securely
- **Stateful Deployment** - 3-10 replicas with persistent storage for models
- **Service Discovery** - Multiple service types (LoadBalancer, ClusterIP, Headless)
- **Auto-scaling** - HPA for dynamic scaling based on CPU/memory metrics
- **HTTPS/TLS** - Ingress with automatic certificate management
- **RBAC** - Fine-grained role-based access control
- **Health Checks** - Comprehensive liveness, readiness, and startup probes

### Deployment Components

| Component | File | Purpose |
|-----------|------|---------|
| **Namespace** | `namespace.yaml` | Isolation, resource quotas, network policies |
| **ConfigMap** | `configmap.yaml` | Environment variables & app configuration |
| **Secrets** | `secrets.yaml` | Credentials, API keys, TLS certificates |
| **Deployment** | `deployment.yaml` | Pod deployment, init containers, volumes, RBAC |
| **Services** | `service.yaml` | LoadBalancer, ClusterIP, Headless services |
| **HPA** | `hpa.yaml` | Auto-scaling based on metrics |
| **Ingress** | `ingress.yaml` | HTTPS routing, hostname-based rules |

---

## Architecture

### Deployment Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     KUBERNETES CLUSTER                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  sin-solver namespace (ResourceQuota: 10 CPU, 20GB)    │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │                                                        │   │
│  │  ConfigMap: sin-solver-config (70 env vars)           │   │
│  │  ConfigMap: sin-solver-app-config (logging, YOLO)     │   │
│  │                                                        │   │
│  │  Secrets: postgres-creds, redis-creds, api-secrets    │   │
│  │  Secrets: tls, docker-registry                        │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │  Deployment: sin-solver-captcha-solver      │    │   │
│  │  │  (Replicas: 3, managed by HPA 3-10)         │    │   │
│  │  ├──────────────────────────────────────────────┤    │   │
│  │  │                                              │    │   │
│  │  │  ┌────────────────────┐                     │    │   │
│  │  │  │ INIT CONTAINERS    │                     │    │   │
│  │  │  ├────────────────────┤                     │    │   │
│  │  │  │ wait-for-postgres  │                     │    │   │
│  │  │  │ wait-for-redis     │                     │    │   │
│  │  │  └────────────────────┘                     │    │   │
│  │  │           ▼                                  │    │   │
│  │  │  ┌────────────────────┐                     │    │   │
│  │  │  │ POD REPLICAS (3)   │                     │    │   │
│  │  │  ├────────────────────┤                     │    │   │
│  │  │  │ Container:         │                     │    │   │
│  │  │  │ captcha-solver     │                     │    │   │
│  │  │  │ port: 8000         │                     │    │   │
│  │  │  │ port: 9090 (metrics) │                  │    │   │
│  │  │  │                    │                     │    │   │
│  │  │  │ Probes:            │                     │    │   │
│  │  │  │ • liveness         │                     │    │   │
│  │  │  │ • readiness        │                     │    │   │
│  │  │  │ • startup          │                     │    │   │
│  │  │  │                    │                     │    │   │
│  │  │  │ Volumes:           │                     │    │   │
│  │  │  │ • models (PVC)     │                     │    │   │
│  │  │  │ • logs (emptyDir)  │                     │    │   │
│  │  │  │ • temp (emptyDir)  │                     │    │   │
│  │  │  │ • config (ConfigMap) │                  │    │   │
│  │  │  └────────────────────┘                     │    │   │
│  │  │           ▼                                  │    │   │
│  │  │  Services:                                  │    │   │
│  │  │  • LoadBalancer (external)                  │    │   │
│  │  │  • ClusterIP (internal)                     │    │   │
│  │  │  • Headless (DNS discovery)                 │    │   │
│  │  │                                              │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  │                      ▼                                │   │
│  │  HPA: sin-solver-captcha-solver-hpa                  │   │
│  │  (Min: 3, Max: 10 replicas)                         │   │
│  │  (Metrics: CPU 70%, Memory 80%)                     │   │
│  │                      ▼                                │   │
│  │  Ingress: sin-solver-captcha-solver-ingress          │   │
│  │  (TLS: api.sin-solver.local, captcha.*, solver.*)   │   │
│  │                                                        │   │
│  │  RBAC: ServiceAccount, Role, RoleBinding             │   │
│  │                                                        │   │
│  │  PVC: sin-solver-models-pvc (20GB)                   │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  External: Database (PostgreSQL), Cache (Redis), etc.        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Service Communication

```
External Clients (HTTPS)
    │
    ▼
┌─────────────────────────┐
│   Ingress (TLS)         │
│   Multiple hostnames    │
└──────────────┬──────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Services:                                  │
│  • LoadBalancer (external access)           │
│  • ClusterIP (internal access)              │
│  • Headless (DNS pod discovery)             │
└──────────────┬──────────────────────────────┘
               │
     ┌─────────┴─────────┬─────────────┐
     │                   │             │
     ▼                   ▼             ▼
  ┌─────┐            ┌─────┐       ┌─────┐
  │Pod 1│            │Pod 2│       │Pod 3│
  └──┬──┘            └──┬──┘       └──┬──┘
     │                 │             │
     └─────────────────┼─────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
    PostgreSQL             Redis Cache
    (data store)           (sessions)
```

---

## Prerequisites

### Cluster Requirements

- **Kubernetes Version:** 1.21+ (1.24+ recommended)
- **Node Count:** Minimum 3 nodes
- **Node Spec:** Each node should have:
  - **CPU:** 2+ cores
  - **Memory:** 4GB+ RAM
  - **Disk:** 20GB+ available
- **Total Cluster Capacity:**
  - **CPU:** 6+ cores available
  - **Memory:** 12GB+ available
  - **Disk:** 40GB+ available

### Required Cluster Components

1. **Metrics Server** (for HPA)
   ```bash
   kubectl get deployment metrics-server -n kube-system
   # If not installed:
   kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
   ```

2. **NGINX Ingress Controller** (for Ingress)
   ```bash
   helm install nginx-ingress nginx-stable/nginx-ingress \
     -n ingress-nginx --create-namespace
   ```

3. **Cert-Manager** (for automatic TLS certificates - optional)
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

### Local Tools Required

- **kubectl** 1.21+ - Kubernetes CLI
  ```bash
  kubectl version --client
  ```

- **Helm** 3.0+ (optional, for advanced deployments)
  ```bash
  helm version
  ```

### Access Requirements

- **Cluster Access:** Kubeconfig file with sufficient permissions
- **Namespace Admin:** Ability to create resources in `sin-solver` namespace
- **Secret Creation:** Permission to create secrets

### Environment Setup

```bash
# Set default namespace
kubectl config set-context --current --namespace=sin-solver

# Verify access
kubectl auth can-i create deployments --namespace=sin-solver

# View cluster info
kubectl cluster-info
kubectl get nodes
```

---

## Deployment Steps

### Step 1: Create Namespace & Network Policy

```bash
# Apply namespace definition
kubectl apply -f k8s/namespace.yaml

# Verify namespace created
kubectl get namespace sin-solver
kubectl describe ns sin-solver

# Check ResourceQuota
kubectl get resourcequota -n sin-solver
kubectl describe quota -n sin-solver

# Check NetworkPolicy
kubectl get networkpolicies -n sin-solver
```

**Expected Output:**
```
NAME         STATUS   AGE
sin-solver   Active   5s

NAME                    HARD   USED   AGE
sin-solver-quota        ...    ...    5s

NAME                    POD-SELECTOR   AGE
sin-solver-netpolicy    app=...        5s
```

### Step 2: Create Configuration (ConfigMap)

```bash
# Apply ConfigMap with environment variables
kubectl apply -f k8s/configmap.yaml

# Verify ConfigMap created
kubectl get configmap -n sin-solver
kubectl describe configmap sin-solver-config -n sin-solver

# View specific ConfigMap content
kubectl get configmap sin-solver-config -n sin-solver -o yaml
```

**Expected Output:**
```
NAME                       DATA   AGE
sin-solver-config          70     5s
sin-solver-app-config      2      5s
```

### Step 3: Create Secrets (Credentials)

⚠️ **CRITICAL:** Update placeholder values before applying!

```bash
# BEFORE applying, update the secrets with real values:
# 1. Database credentials
# 2. Redis password
# 3. API secret keys
# 4. Third-party API keys
# 5. TLS certificate and key

# Option A: Apply as-is (development only - has placeholder values)
kubectl apply -f k8s/secrets.yaml

# Option B: Create from command line (recommended)
kubectl create secret generic sin-solver-postgres-credentials \
  -n sin-solver \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=<YOUR_SECURE_PASSWORD> \
  --from-literal=DATABASE_USER=captcha_user \
  --from-literal=DATABASE_PASSWORD=<YOUR_SECURE_PASSWORD> \
  --from-literal=DATABASE_URL=postgresql://captcha_user:<PASSWORD>@postgres:5432/sin_solver

# Option C: Create from .env file
kubectl create secret generic sin-solver-api-secrets \
  -n sin-solver \
  --from-env-file=.env.secrets

# Verify secrets created
kubectl get secrets -n sin-solver
kubectl describe secret sin-solver-postgres-credentials -n sin-solver

# ⚠️ DO NOT commit secrets.yaml to git!
echo "k8s/secrets.yaml" >> .gitignore
```

**Expected Output:**
```
NAME                                    TYPE                 DATA   AGE
sin-solver-postgres-credentials         Opaque               5      5s
sin-solver-redis-credentials            Opaque               2      5s
sin-solver-api-secrets                  Opaque               6      5s
sin-solver-tls                          kubernetes.io/tls    2      5s
sin-solver-docker-registry              kubernetes.io/dockercfg 1   5s
```

### Step 4: Deploy Application (Deployment + RBAC + Storage)

```bash
# Apply Deployment, ServiceAccount, Role, RoleBinding, and PVC
kubectl apply -f k8s/deployment.yaml

# Wait for deployment to be ready
kubectl rollout status deployment/sin-solver-captcha-solver -n sin-solver --timeout=5m

# Verify deployment
kubectl get deployment -n sin-solver
kubectl describe deployment sin-solver-captcha-solver -n sin-solver

# Check pods status
kubectl get pods -n sin-solver -o wide
kubectl describe pod -n sin-solver -l app.kubernetes.io/name=sin-solver

# Check ServiceAccount and RBAC
kubectl get serviceaccount -n sin-solver
kubectl get role -n sin-solver
kubectl get rolebinding -n sin-solver

# Check PVC
kubectl get pvc -n sin-solver
kubectl describe pvc sin-solver-models-pvc -n sin-solver
```

**Expected Output:**
```
NAME                        READY   UP-TO-DATE   AVAILABLE   AGE
sin-solver-captcha-solver   3/3     3            3           30s

NAME                              STATUS   VOLUME                 CAPACITY
sin-solver-models-pvc             Bound    pvc-xxxxx              20Gi
```

### Step 5: Create Services

```bash
# Apply all services
kubectl apply -f k8s/service.yaml

# Verify services created
kubectl get services -n sin-solver
kubectl describe service -n sin-solver

# Check service endpoints
kubectl get endpoints -n sin-solver

# Get LoadBalancer external IP (may take 1-2 minutes)
kubectl get service sin-solver-captcha-solver -n sin-solver \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

**Expected Output:**
```
NAME                                    TYPE           CLUSTER-IP      PORT(S)
sin-solver-captcha-solver               LoadBalancer   10.0.0.100      80:30000/TCP,443:30001/TCP,9090:30090/TCP
sin-solver-captcha-solver-internal      ClusterIP      10.0.0.101      8000/TCP,9090/TCP
sin-solver-captcha-solver-headless      ClusterIP      None            8000/TCP
```

### Step 6: Set Up Auto-scaling (HPA)

```bash
# Verify Metrics Server is installed
kubectl get deployment metrics-server -n kube-system

# Apply HPA
kubectl apply -f k8s/hpa.yaml

# Verify HPA created
kubectl get hpa -n sin-solver
kubectl describe hpa sin-solver-captcha-solver-hpa -n sin-solver

# Watch HPA status (wait 1-2 minutes for metrics)
kubectl get hpa -n sin-solver -w
```

**Expected Output:**
```
NAME                                  REFERENCE                                      TARGETS           MINPODS   MAXPODS   REPLICAS
sin-solver-captcha-solver-hpa         Deployment/sin-solver-captcha-solver           15%/70%, 20%/80%   3         10        3
```

### Step 7: Configure Ingress (HTTPS/TLS)

#### Step 7a: Install NGINX Ingress Controller

```bash
# Check if NGINX ingress controller is already installed
kubectl get pods -n ingress-nginx

# If not installed, install via Helm
helm repo add nginx-stable https://helm.nginx.com/stable
helm repo update
helm install nginx-ingress nginx-stable/nginx-ingress \
  -n ingress-nginx --create-namespace

# Verify installation
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

#### Step 7b: Create TLS Certificate

**Option 1: Self-Signed (Development)**

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout tls.key -out tls.crt \
  -days 365 -nodes \
  -subj "/CN=sin-solver.local/O=SIN-Solver/C=US"

# Create secret
kubectl create secret tls sin-solver-tls -n sin-solver \
  --cert=tls.crt --key=tls.key

# Verify
kubectl get secret sin-solver-tls -n sin-solver
```

**Option 2: Cert-Manager (Production - Automatic)**

```bash
# Install cert-manager (if not already installed)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager pods
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Cert-manager will automatically create certificates when Ingress is created
```

#### Step 7c: Update /etc/hosts (Development Only)

```bash
# Add entries to /etc/hosts
sudo tee -a /etc/hosts <<EOF

# SIN-Solver Kubernetes Services
127.0.0.1 api.sin-solver.local
127.0.0.1 captcha.sin-solver.local
127.0.0.1 solver.sin-solver.local
EOF

# Verify
ping api.sin-solver.local
```

#### Step 7d: Apply Ingress

```bash
# Apply Ingress configuration
kubectl apply -f k8s/ingress.yaml

# Verify Ingress created
kubectl get ingress -n sin-solver
kubectl describe ingress sin-solver-captcha-solver-ingress -n sin-solver

# Check TLS certificate status
kubectl get certificate -n sin-solver

# Watch Ingress status (wait for IP to appear)
kubectl get ingress -n sin-solver -w
```

**Expected Output:**
```
NAME                                   CLASS   HOSTS                                        ADDRESS        PORTS     AGE
sin-solver-captcha-solver-ingress      nginx   api.sin-solver.local,captcha.sin-solver...  <IP>           80,443    5s
```

---

## Verification & Health Checks

### Check Cluster Health

```bash
# View cluster nodes
kubectl get nodes
kubectl describe nodes

# View cluster info
kubectl cluster-info

# Check metrics server
kubectl get deployment metrics-server -n kube-system
```

### Check Namespace

```bash
# View namespace
kubectl get ns sin-solver
kubectl describe ns sin-solver

# Check ResourceQuota
kubectl describe quota sin-solver-quota -n sin-solver

# Check NetworkPolicy
kubectl get networkpolicies -n sin-solver
```

### Check Pods

```bash
# List all pods
kubectl get pods -n sin-solver -o wide

# Check pod status in detail
kubectl describe pods -n sin-solver

# View pod logs (main container)
kubectl logs -n sin-solver -l app.kubernetes.io/name=sin-solver --tail=50

# View logs from specific pod
kubectl logs -n sin-solver <pod-name>

# Stream logs in real-time
kubectl logs -n sin-solver <pod-name> -f

# View init container logs
kubectl logs -n sin-solver <pod-name> -c wait-for-postgres
kubectl logs -n sin-solver <pod-name> -c wait-for-redis
```

### Health Endpoints

```bash
# Port-forward to test health endpoints
kubectl port-forward -n sin-solver svc/sin-solver-captcha-solver 8000:8000 &

# Test liveness probe
curl -v http://localhost:8000/health

# Test readiness probe
curl -v http://localhost:8000/ready

# Test API endpoint
curl -v http://localhost:8000/api/v1/status

# View metrics
curl http://localhost:9090/metrics
```

### Check Services

```bash
# List all services
kubectl get services -n sin-solver -o wide

# Check LoadBalancer external IP
kubectl get svc sin-solver-captcha-solver -n sin-solver

# Get service details
kubectl describe svc sin-solver-captcha-solver -n sin-solver

# Check endpoints
kubectl get endpoints -n sin-solver
```

### Check Storage

```bash
# List PVCs
kubectl get pvc -n sin-solver

# Check PVC details
kubectl describe pvc sin-solver-models-pvc -n sin-solver

# Check PV (if exists)
kubectl get pv | grep sin-solver

# Check disk usage in pod
kubectl exec -n sin-solver <pod-name> -- df -h /app/models
kubectl exec -n sin-solver <pod-name> -- du -sh /app/models
```

### Check Auto-scaling

```bash
# View HPA status
kubectl get hpa -n sin-solver
kubectl describe hpa sin-solver-captcha-solver-hpa -n sin-solver

# Watch HPA in action
kubectl get hpa -n sin-solver -w

# View metrics
kubectl top nodes
kubectl top pods -n sin-solver
```

### Check Ingress

```bash
# List ingress resources
kubectl get ingress -n sin-solver

# Check ingress details
kubectl describe ingress sin-solver-captcha-solver-ingress -n sin-solver

# Test HTTPS access (after cert is ready)
curl -k https://api.sin-solver.local/health

# Check TLS certificate
kubectl get secret sin-solver-tls -n sin-solver -o yaml | grep tls.crt | base64 -d | openssl x509 -text -noout
```

### Comprehensive Health Check Script

```bash
#!/bin/bash
# health-check.sh - Comprehensive cluster health check

echo "=== CLUSTER HEALTH ==="
kubectl cluster-info

echo -e "\n=== NODES ==="
kubectl get nodes -o wide

echo -e "\n=== NAMESPACE ==="
kubectl get ns sin-solver
kubectl describe quota -n sin-solver

echo -e "\n=== PODS ==="
kubectl get pods -n sin-solver -o wide
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=sin-solver -n sin-solver --timeout=60s

echo -e "\n=== SERVICES ==="
kubectl get svc -n sin-solver -o wide

echo -e "\n=== HPA ==="
kubectl get hpa -n sin-solver
kubectl top pods -n sin-solver

echo -e "\n=== STORAGE ==="
kubectl get pvc -n sin-solver

echo -e "\n=== INGRESS ==="
kubectl get ingress -n sin-solver

echo -e "\n=== LOGS ==="
kubectl logs -n sin-solver -l app.kubernetes.io/name=sin-solver --tail=20

echo "=== HEALTH CHECK COMPLETE ==="
```

---

## Operations Guide

### Viewing Logs

```bash
# View logs from all pods
kubectl logs -n sin-solver -l app.kubernetes.io/name=sin-solver --all-containers=true

# View logs from specific pod
kubectl logs -n sin-solver sin-solver-captcha-solver-xxxxx --all-containers=true

# Stream logs in real-time
kubectl logs -n sin-solver -l app.kubernetes.io/name=sin-solver -f

# View previous pod logs (if pod crashed)
kubectl logs -n sin-solver <pod-name> --previous

# Export logs to file
kubectl logs -n sin-solver <pod-name> > pod.log
```

### Executing Commands in Pods

```bash
# Interactive shell
kubectl exec -it -n sin-solver <pod-name> -- bash

# Run single command
kubectl exec -n sin-solver <pod-name> -- python --version

# Check model files
kubectl exec -n sin-solver <pod-name> -- ls -la /app/models

# Monitor memory usage
kubectl exec -n sin-solver <pod-name> -- free -h
```

### Scaling

#### Manual Scaling

```bash
# Scale deployment to specific number of replicas
kubectl scale deployment sin-solver-captcha-solver -n sin-solver --replicas=5

# Verify scaling
kubectl get deployment sin-solver-captcha-solver -n sin-solver
kubectl get pods -n sin-solver
```

#### Auto-scaling via HPA

```bash
# View current HPA settings
kubectl describe hpa sin-solver-captcha-solver-hpa -n sin-solver

# Change min/max replicas
kubectl patch hpa sin-solver-captcha-solver-hpa -n sin-solver -p '{"spec":{"minReplicas":4,"maxReplicas":12}}'

# Change target metrics
kubectl patch hpa sin-solver-captcha-solver-hpa -n sin-solver -p '{"spec":{"metrics":[{"type":"Resource","resource":{"name":"cpu","target":{"type":"Utilization","averageUtilization":60}}}]}}'
```

### Updating Deployment

#### Update Docker Image

```bash
# Set new image
kubectl set image deployment/sin-solver-captcha-solver \
  captcha-solver=sin-solver:2.5.1 \
  -n sin-solver

# Watch rollout
kubectl rollout status deployment/sin-solver-captcha-solver -n sin-solver

# Verify new image is running
kubectl get pods -n sin-solver -o custom-columns=POD:.metadata.name,IMAGE:.spec.containers[0].image
```

#### Update Environment Variables

```bash
# Edit ConfigMap
kubectl edit configmap sin-solver-config -n sin-solver

# Save and exit editor
# Restart deployment to pick up new config
kubectl rollout restart deployment/sin-solver-captcha-solver -n sin-solver

# Watch restart
kubectl rollout status deployment/sin-solver-captcha-solver -n sin-solver
```

#### Update Secrets

```bash
# Delete old secret
kubectl delete secret sin-solver-postgres-credentials -n sin-solver

# Create new secret
kubectl create secret generic sin-solver-postgres-credentials -n sin-solver \
  --from-literal=POSTGRES_PASSWORD=new-password

# Restart deployment
kubectl rollout restart deployment/sin-solver-captcha-solver -n sin-solver
```

### Rolling Updates

```bash
# Perform rolling update (zero-downtime)
# Edit deployment
kubectl edit deployment sin-solver-captcha-solver -n sin-solver

# Or apply updated manifest
kubectl apply -f k8s/deployment.yaml

# Check rollout status
kubectl rollout status deployment/sin-solver-captcha-solver -n sin-solver --timeout=10m

# View rollout history
kubectl rollout history deployment/sin-solver-captcha-solver -n sin-solver
```

---

## Troubleshooting

### Common Issues & Solutions

#### Issue 1: Pod Stuck in Pending

**Symptoms:**
```
NAME                                      READY   STATUS    RESTARTS
sin-solver-captcha-solver-xxxxx           0/1     Pending   0
```

**Causes & Solutions:**
```bash
# Check events
kubectl describe pod -n sin-solver <pod-name>

# Common causes:
# 1. Insufficient resources
kubectl describe nodes
kubectl top nodes

# 2. PVC not available
kubectl get pvc -n sin-solver
kubectl describe pvc sin-solver-models-pvc -n sin-solver

# 3. Image pull failure
kubectl logs -n sin-solver <pod-name>

# 4. ImagePullBackOff → wrong image or registry creds
kubectl describe pod -n sin-solver <pod-name>
kubectl get secret sin-solver-docker-registry -n sin-solver
```

#### Issue 2: CrashLoopBackOff

**Symptoms:**
```
NAME                                      READY   STATUS             RESTARTS
sin-solver-captcha-solver-xxxxx           0/1     CrashLoopBackOff   5
```

**Diagnosis & Fix:**
```bash
# Check logs
kubectl logs -n sin-solver <pod-name>
kubectl logs -n sin-solver <pod-name> --previous

# Common causes:
# 1. Application startup error
kubectl logs -n sin-solver <pod-name> | tail -50

# 2. Database connection failure
# → Check DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD
kubectl exec -n sin-solver <pod-name> -- nc -zv postgres 5432

# 3. Redis connection failure
# → Check REDIS_HOST, REDIS_PASSWORD
kubectl exec -n sin-solver <pod-name> -- redis-cli -h redis ping

# 4. Init container failure
kubectl logs -n sin-solver <pod-name> -c wait-for-postgres
kubectl logs -n sin-solver <pod-name> -c wait-for-redis
```

#### Issue 3: Health Checks Failing

**Symptoms:**
```
NAME                                      READY   STATUS    RESTARTS
sin-solver-captcha-solver-xxxxx           0/1     Running   3
```

**Diagnosis & Fix:**
```bash
# Check pod events
kubectl describe pod -n sin-solver <pod-name> | grep -A 10 "Events:"

# Test health endpoints
kubectl port-forward -n sin-solver <pod-name> 8000:8000
curl -v http://localhost:8000/health
curl -v http://localhost:8000/ready

# Check probe configuration
kubectl get deployment sin-solver-captcha-solver -n sin-solver -o yaml | grep -A 20 "livenessProbe:"

# Common issues:
# 1. Endpoint timeout (app not responding)
# → Check application logs
# 2. Wrong port
# → Verify containerPort in deployment
# 3. DNS resolution issue
# → Check service endpoints
```

#### Issue 4: Out of Memory

**Symptoms:**
```bash
# Pod OOMKilled
kubectl describe pod -n sin-solver <pod-name> | grep "OOMKilled"

# Metrics show high memory
kubectl top pods -n sin-solver
```

**Solutions:**
```bash
# Increase memory limit
kubectl patch deployment sin-solver-captcha-solver -n sin-solver -p '{"spec":{"template":{"spec":{"containers":[{"name":"captcha-solver","resources":{"limits":{"memory":"4Gi"}}}]}}}}'

# Or edit and redeploy
kubectl edit deployment sin-solver-captcha-solver -n sin-solver

# Check memory usage
kubectl exec -n sin-solver <pod-name> -- free -m
kubectl exec -n sin-solver <pod-name> -- ps aux
```

#### Issue 5: Ingress Not Working

**Symptoms:**
```
curl: (7) Failed to connect to api.sin-solver.local
```

**Diagnosis & Fix:**
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx

# Check ingress status
kubectl get ingress -n sin-solver sin-solver-captcha-solver-ingress
kubectl describe ingress -n sin-solver sin-solver-captcha-solver-ingress

# Check TLS certificate
kubectl get secret sin-solver-tls -n sin-solver
kubectl get certificate -n sin-solver

# Verify DNS resolution
nslookup api.sin-solver.local
ping api.sin-solver.local

# Common issues:
# 1. Ingress controller not installed
# → Install NGINX ingress: helm install...
# 2. TLS certificate not ready
# → Check cert-manager, cert status
# 3. Host entries not set
# → Add to /etc/hosts
```

#### Issue 6: HPA Not Scaling

**Symptoms:**
```
kubectl describe hpa -n sin-solver
# Shows: unknown: the server could not find the requested resource
```

**Diagnosis & Fix:**
```bash
# Check metrics server
kubectl get deployment metrics-server -n kube-system

# If not installed:
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Wait for metrics
kubectl wait --for=condition=ready pod -l k8s-app=metrics-server -n kube-system --timeout=60s

# Check metrics availability
kubectl top nodes
kubectl top pods -n sin-solver

# If still failing, check HPA status
kubectl describe hpa -n sin-solver sin-solver-captcha-solver-hpa
```

### Debugging Commands

```bash
# Get detailed info
kubectl get events -n sin-solver --sort-by='.lastTimestamp'
kubectl describe all -n sin-solver

# Check resource quotas
kubectl describe quota -n sin-solver

# Debug network
kubectl run -it --rm debug --image=busybox --restart=Never -n sin-solver -- sh
  # Test DNS
  nslookup sin-solver-captcha-solver
  # Test connectivity
  nc -zv sin-solver-captcha-solver 8000

# Check RBAC permissions
kubectl auth can-i get pods --as=system:serviceaccount:sin-solver:sin-solver-captcha-solver -n sin-solver
```

---

## Security Considerations

### Secret Management

```bash
# ✅ DO: Store secrets securely
# Encrypt secrets at rest in etcd
# Use sealed-secrets or external-secrets operator for GitOps

# ❌ DON'T: Check secrets into git
echo "k8s/secrets.yaml" >> .gitignore
git rm --cached k8s/secrets.yaml

# Rotate secrets regularly
kubectl delete secret sin-solver-postgres-credentials -n sin-solver
kubectl create secret generic sin-solver-postgres-credentials -n sin-solver \
  --from-literal=POSTGRES_PASSWORD=<NEW_PASSWORD>
kubectl rollout restart deployment/sin-solver-captcha-solver -n sin-solver
```

### RBAC

```bash
# View ServiceAccount permissions
kubectl get rolebindings -n sin-solver
kubectl describe rolebinding sin-solver-captcha-solver-rolebinding -n sin-solver

# Test permissions
kubectl auth can-i get configmaps --as=system:serviceaccount:sin-solver:sin-solver-captcha-solver -n sin-solver

# Follow principle of least privilege
# Only grant necessary permissions
```

### Network Policies

```bash
# Verify NetworkPolicy is active
kubectl get networkpolicies -n sin-solver
kubectl describe networkpolicy sin-solver-netpolicy -n sin-solver

# Test policy enforcement
# Only pods with correct labels can communicate
```

### TLS/HTTPS

```bash
# Ensure all external traffic uses HTTPS
# Check ingress TLS configuration
kubectl get ingress -n sin-solver -o yaml | grep -A 10 "tls:"

# Verify certificate validity
kubectl get secret sin-solver-tls -n sin-solver -o yaml | grep tls.crt | \
  base64 -d | openssl x509 -text -noout | grep -E "Issuer:|Subject:|Not After"

# Update certificate before expiry
kubectl delete secret sin-solver-tls -n sin-solver
kubectl create secret tls sin-solver-tls -n sin-solver --cert=new.crt --key=new.key
```

---

## Scaling & Performance

### Viewing Metrics

```bash
# CPU and memory usage
kubectl top nodes
kubectl top pods -n sin-solver

# Detailed metrics
kubectl describe nodes
kubectl describe hpa -n sin-solver sin-solver-captcha-solver-hpa

# Historical trends
kubectl get hpa -n sin-solver -w  # Watch mode
```

### Optimization Tips

1. **Request/Limit Tuning**
   ```bash
   # Current settings: requests 1CPU/1GB, limits 2CPU/2GB
   # Adjust based on actual usage
   kubectl patch deployment sin-solver-captcha-solver -n sin-solver -p '{"spec":{"template":{"spec":{"containers":[{"name":"captcha-solver","resources":{"requests":{"cpu":"500m","memory":"512Mi"},"limits":{"cpu":"2","memory":"2Gi"}}}]}}}}'
   ```

2. **HPA Threshold Tuning**
   ```bash
   # Adjust target CPU/memory utilization
   # Lower = more aggressive scaling
   kubectl patch hpa sin-solver-captcha-solver-hpa -n sin-solver -p '{"spec":{"metrics":[{"type":"Resource","resource":{"name":"cpu","target":{"type":"Utilization","averageUtilization":60}}}]}}'
   ```

3. **PVC Size**
   ```bash
   # Monitor model storage usage
   kubectl exec -n sin-solver <pod-name> -- du -sh /app/models
   
   # Resize PVC if needed (must increase, not decrease)
   # 1. Backup data
   # 2. Delete PVC
   # 3. Create new PVC with larger size
   # 4. Restore data
   ```

---

## Rollback Procedures

### Rollback Deployment

```bash
# View rollout history
kubectl rollout history deployment/sin-solver-captcha-solver -n sin-solver

# Rollback to previous version
kubectl rollout undo deployment/sin-solver-captcha-solver -n sin-solver

# Rollback to specific revision
kubectl rollout undo deployment/sin-solver-captcha-solver -n sin-solver --to-revision=2

# Watch rollback
kubectl rollout status deployment/sin-solver-captcha-solver -n sin-solver

# Verify old version is running
kubectl get pods -n sin-solver -o custom-columns=POD:.metadata.name,IMAGE:.spec.containers[0].image
```

### Rollback Secrets/Config

```bash
# ConfigMap changes
kubectl edit configmap sin-solver-config -n sin-solver
# Edit to previous values and save

# Secret changes (if you have backup)
kubectl delete secret sin-solver-postgres-credentials -n sin-solver
kubectl create secret generic sin-solver-postgres-credentials -n sin-solver \
  --from-literal=POSTGRES_PASSWORD=<OLD_PASSWORD>

# Restart deployment to pick up changes
kubectl rollout restart deployment/sin-solver-captcha-solver -n sin-solver
```

---

## Monitoring & Observability

### Prometheus Metrics

```bash
# Port-forward to Prometheus (if installed)
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# View metrics
curl http://localhost:9090/api/v1/query?query=up{job%3D%22sin-solver%22}

# Common metrics
# - http_requests_total: Total HTTP requests
# - http_request_duration_seconds: Request latency
# - process_resident_memory_bytes: Memory usage
# - captcha_processing_duration_seconds: CAPTCHA solve time
```

### Logging

```bash
# View logs from all pods
kubectl logs -n sin-solver -l app.kubernetes.io/name=sin-solver --all-containers=true --tail=100

# Stream logs
kubectl logs -n sin-solver -l app.kubernetes.io/name=sin-solver -f

# Grep logs
kubectl logs -n sin-solver -l app.kubernetes.io/name=sin-solver | grep ERROR
```

### Tracing

```bash
# Port-forward to Jaeger (if installed)
kubectl port-forward -n monitoring svc/jaeger 16686:16686

# View traces in browser
# http://localhost:16686
```

---

## Appendix: Commands Cheat Sheet

```bash
# Namespace
kubectl get ns
kubectl create ns sin-solver
kubectl delete ns sin-solver

# ConfigMap
kubectl get cm -n sin-solver
kubectl describe cm sin-solver-config -n sin-solver
kubectl edit cm sin-solver-config -n sin-solver

# Secrets
kubectl get secrets -n sin-solver
kubectl create secret generic name --from-literal=key=value
kubectl delete secret name -n sin-solver

# Deployment
kubectl get deploy -n sin-solver
kubectl describe deploy sin-solver-captcha-solver -n sin-solver
kubectl edit deploy sin-solver-captcha-solver -n sin-solver
kubectl delete deploy sin-solver-captcha-solver -n sin-solver

# Pods
kubectl get pods -n sin-solver
kubectl describe pod <pod-name> -n sin-solver
kubectl logs <pod-name> -n sin-solver
kubectl exec -it <pod-name> -n sin-solver -- bash
kubectl delete pod <pod-name> -n sin-solver

# Services
kubectl get svc -n sin-solver
kubectl describe svc sin-solver-captcha-solver -n sin-solver
kubectl port-forward svc/sin-solver-captcha-solver 8000:8000 -n sin-solver

# HPA
kubectl get hpa -n sin-solver
kubectl describe hpa sin-solver-captcha-solver-hpa -n sin-solver
kubectl top pods -n sin-solver

# Ingress
kubectl get ingress -n sin-solver
kubectl describe ingress sin-solver-captcha-solver-ingress -n sin-solver

# RBAC
kubectl get sa -n sin-solver
kubectl get role -n sin-solver
kubectl get rolebinding -n sin-solver

# Rollout
kubectl rollout status deploy/sin-solver-captcha-solver -n sin-solver
kubectl rollout history deploy/sin-solver-captcha-solver -n sin-solver
kubectl rollout undo deploy/sin-solver-captcha-solver -n sin-solver

# Scale
kubectl scale deploy sin-solver-captcha-solver --replicas=5 -n sin-solver

# Resource metrics
kubectl top nodes
kubectl top pods -n sin-solver

# Events
kubectl get events -n sin-solver --sort-by='.lastTimestamp'
```

---

## Conclusion

This comprehensive guide covers the complete deployment of SIN-Solver to Kubernetes. For additional support:

- **Documentation:** See `/docs/` in the SIN-Solver repository
- **Issues:** Report problems on GitHub Issues
- **Community:** Join discussions on GitHub Discussions

**Deployed Version:** 1.0.0  
**Last Updated:** 2026-01-30  
**Maintainer:** SIN-Solver Team
