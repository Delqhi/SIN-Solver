# SIN-Solver Quick Start Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [5-Minute Setup](#5-minute-setup)
5. [First CAPTCHA Solution](#first-captcha-solution)
6. [Next Steps](#next-steps)
7. [Getting Help](#getting-help)

---

## Overview

SIN-Solver is an enterprise-grade AI automation platform designed to solve complex tasks at scale. Built on a 26-room distributed architecture, it provides powerful capabilities for CAPTCHA solving, survey automation, web scraping, and AI-driven task orchestration.

### What You Can Do with SIN-Solver

- **Solve CAPTCHAs automatically** using computer vision and AI
- **Automate survey completion** across multiple platforms
- **Perform stealth web automation** with anti-detection capabilities
- **Orchestrate AI agents** for complex multi-step tasks
- **Monitor and manage** all operations through a centralized dashboard

### Key Features

| Feature | Description |
|---------|-------------|
| 26-Room Architecture | Distributed microservices for scalability |
| CAPTCHA Solving | YOLOv8 + OCR + Vision AI for all CAPTCHA types |
| Stealth Browser | Steel Browser with CDP for undetectable automation |
| AI Orchestration | n8n workflows with multiple AI agents |
| Real-time Monitoring | Prometheus + Grafana observability stack |
| 100% Self-Hosted | No external dependencies or paid services |

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Docker | 24.0+ | Container orchestration |
| Docker Compose | 2.20+ | Multi-container management |
| Python | 3.9+ | Backend services |
| Node.js | 18+ | Frontend and tooling |
| Git | 2.40+ | Version control |

### System Requirements

**Minimum Requirements:**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 50 GB free space
- OS: macOS 12+, Ubuntu 20.04+, or Windows 11 with WSL2

**Recommended Requirements:**
- CPU: 8+ cores
- RAM: 16+ GB
- Storage: 100+ GB SSD
- GPU: NVIDIA with CUDA support (for ML training)

### Network Requirements

- Internet connection for initial setup
- Ports 8000-9000 available for services
- Docker network access (172.20.0.0/16 subnet)

---

## Installation

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/SIN-Solver.git
cd SIN-Solver

# Verify the structure
ls -la
```

Expected directory structure:
```
SIN-Solver/
├── Docker/                 # Container definitions
├── docs/                   # Documentation
├── app/                    # Application code
├── training/               # ML model training
├── docker-compose.yml      # Development compose
├── docker-compose.enterprise.yml  # Production compose
└── README.md
```

### Step 2: Environment Configuration

Create your environment configuration file:

```bash
# Copy the example environment file
cp .env.example .env

# Edit the environment variables
nano .env  # or use your preferred editor
```

Required environment variables:

```bash
# Database Configuration
POSTGRES_USER=sin_solver
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=sin_solver_db

# Redis Configuration
REDIS_PASSWORD=your_redis_password

# API Configuration
API_SECRET_KEY=your_api_secret_key
JWT_SECRET=your_jwt_secret

# Domain Configuration (for production)
DOMAIN=delqhi.com
API_SUBDOMAIN=api
N8N_SUBDOMAIN=n8n
GRAFANA_SUBDOMAIN=grafana

# Optional: External Services
# Only needed if using external APIs
OPENAI_API_KEY=your_openai_key  # Optional
ANTHROPIC_API_KEY=your_anthropic_key  # Optional
```

### Step 3: Initialize Docker Network

```bash
# Create the Docker network
docker network create sin-solver-network

# Verify network creation
docker network ls | grep sin-solver
```

---

## 5-Minute Setup

### Minute 1: Start Core Infrastructure

```bash
# Start the core infrastructure services
docker-compose up -d room-03-postgres room-04-redis

# Wait for services to be healthy
sleep 10

# Verify services are running
docker-compose ps
```

You should see:
```
NAME                STATUS          PORTS
room-03-postgres    Up 10 seconds   0.0.0.0:5432->5432/tcp
room-04-redis       Up 10 seconds   0.0.0.0:6379->6379/tcp
```

### Minute 2: Start API Gateway

```bash
# Start the API Brain (FastAPI gateway)
docker-compose up -d room-13-api-brain

# Wait for API to be ready
sleep 15

# Test the health endpoint
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-30T10:30:00Z"
}
```

### Minute 3: Start CAPTCHA Worker

```bash
# Start the CAPTCHA solving service
docker-compose up -d solver-1.1-captcha-worker

# Wait for service initialization
sleep 10

# Verify CAPTCHA worker is running
curl http://localhost:8019/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "captcha-worker",
  "version": "1.0.0"
}
```

### Minute 4: Start n8n Orchestrator

```bash
# Start the n8n workflow orchestrator
docker-compose up -d agent-01-n8n-orchestrator

# Wait for n8n to initialize
sleep 20

# Verify n8n is accessible
curl http://localhost:5678/healthz
```

Access the n8n web interface:
- URL: http://localhost:5678
- Default credentials: See your `.env` file

### Minute 5: Verify Complete Setup

```bash
# Check all running services
docker-compose ps

# Run the comprehensive health check
curl http://localhost:8000/api/v1/health/all
```

Expected output:
```json
{
  "status": "healthy",
  "services": {
    "postgres": "healthy",
    "redis": "healthy",
    "api-brain": "healthy",
    "captcha-worker": "healthy",
    "n8n": "healthy"
  }
}
```

---

## First CAPTCHA Solution

Now that your SIN-Solver is running, let's solve your first CAPTCHA:

### Using the API

```bash
# Solve a text CAPTCHA
curl -X POST http://localhost:8019/api/v1/solve \
  -H "Content-Type: application/json" \
  -d '{
    "captcha_type": "text",
    "image_url": "https://example.com/captcha.png",
    "timeout": 30
  }'
```

Expected response:
```json
{
  "success": true,
  "solution": "A7B9C2",
  "confidence": 0.97,
  "processing_time": 1.23
}
```

### Using Python

```python
import requests

# Solve a CAPTCHA
response = requests.post(
    "http://localhost:8019/api/v1/solve",
    json={
        "captcha_type": "text",
        "image_url": "https://example.com/captcha.png",
        "timeout": 30
    }
)

result = response.json()
print(f"Solution: {result['solution']}")
print(f"Confidence: {result['confidence']}")
```

### Using n8n Workflow

1. Open n8n at http://localhost:5678
2. Create a new workflow
3. Add an HTTP Request node
4. Configure it to POST to `http://solver-1.1-captcha-worker:8019/api/v1/solve`
5. Add your CAPTCHA parameters
6. Execute the workflow

---

## Next Steps

### Explore the Documentation

| Document | Description |
|----------|-------------|
| [User Guide](02-USER-GUIDE.md) | Complete feature documentation |
| [Tutorials](03-TUTORIALS.md) | Step-by-step tutorials |
| [API Reference](../dev/02-API-REFERENCE.md) | Complete API documentation |
| [Architecture](../dev/01-ARCHITECTURE.md) | System architecture overview |

### Try These Tutorials

1. **Basic CAPTCHA Solving** - Solve your first 10 CAPTCHAs
2. **Batch Processing** - Process multiple CAPTCHAs efficiently
3. **Survey Automation** - Automate survey completion
4. **Custom Workflows** - Build your own n8n workflows
5. **Monitoring Setup** - Configure Grafana dashboards

### Start Additional Services

```bash
# Start the full stack (all 26 rooms)
docker-compose -f docker-compose.enterprise.yml up -d

# Or start specific services
docker-compose up -d agent-05-steel      # Stealth browser
docker-compose up -d agent-06-skyvern    # Visual automation
docker-compose up -d room-26-grafana     # Monitoring
```

### Configure Your Environment

```bash
# Set up your development environment
./scripts/setup-dev.sh

# Run tests to verify everything works
pytest tests/

# Start the development server
npm run dev  # or python -m app.main
```

---

## Getting Help

### Documentation

- **Quick Start** (this document) - Get running in 5 minutes
- **User Guide** - Comprehensive feature documentation
- **Tutorials** - Step-by-step learning materials
- **FAQ** - Common questions and answers
- **Troubleshooting** - Solutions to common problems

### Support Channels

| Channel | Purpose | Response Time |
|---------|---------|---------------|
| GitHub Issues | Bug reports, feature requests | 24-48 hours |
| Documentation | Self-service help | Immediate |
| Community Discord | General questions, discussions | Variable |
| Email Support | Enterprise support | 4 hours |

### Common Commands Reference

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Restart a service
docker-compose restart [service-name]

# Update to latest version
git pull
docker-compose pull
docker-compose up -d

# Reset everything (WARNING: Destroys data)
docker-compose down -v
docker-compose up -d
```

### Health Check Commands

```bash
# Check all services
curl http://localhost:8000/api/v1/health/all

# Check specific service
curl http://localhost:8019/health  # CAPTCHA worker
curl http://localhost:8018/health  # Survey worker
curl http://localhost:5678/healthz # n8n

# Check database
docker-compose exec room-03-postgres pg_isready -U sin_solver

# Check Redis
docker-compose exec room-04-redis redis-cli ping
```

---

## Quick Reference Card

### Service URLs

| Service | Local URL | Production URL |
|---------|-----------|----------------|
| API Brain | http://localhost:8000 | https://api.delqhi.com |
| n8n | http://localhost:5678 | https://n8n.delqhi.com |
| Grafana | http://localhost:3001 | https://grafana.delqhi.com |
| CAPTCHA Worker | http://localhost:8019 | https://captcha.delqhi.com |
| Survey Worker | http://localhost:8018 | https://survey.delqhi.com |

### Default Ports

| Service | Port | Purpose |
|---------|------|---------|
| API Brain | 8000 | REST API gateway |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache layer |
| n8n | 5678 | Workflow automation |
| Grafana | 3001 | Monitoring dashboards |
| CAPTCHA Worker | 8019 | CAPTCHA solving |
| Survey Worker | 8018 | Survey automation |

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d [service-name]

# View logs
docker-compose logs [service-name]

# Scale a service
docker-compose up -d --scale [service]=3

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## Summary

Congratulations! You now have SIN-Solver running locally. In just 5 minutes, you've:

1. ✅ Installed and configured the platform
2. ✅ Started the core infrastructure services
3. ✅ Verified all services are healthy
4. ✅ Solved your first CAPTCHA

### What's Next?

- Read the [User Guide](02-USER-GUIDE.md) to learn about all features
- Follow the [Tutorials](03-TUTORIALS.md) for hands-on learning
- Explore the [API Reference](../dev/02-API-REFERENCE.md) for integration
- Check the [Architecture](../dev/01-ARCHITECTURE.md) to understand the system

### Support

If you encounter any issues:
1. Check the [Troubleshooting Guide](05-TROUBLESHOOTING.md)
2. Review the [FAQ](04-FAQ.md)
3. Open an issue on GitHub
4. Join our community Discord

---

**Document Information:**
- Version: 1.0.0
- Last Updated: 2026-01-30
- Maintained by: SIN-Solver Team
- License: MIT
