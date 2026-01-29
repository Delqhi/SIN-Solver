# SIN-Solver Quick Start Guide

Get SIN-Solver up and running in 5 minutes.

## Prerequisites

Before you begin, ensure you have:

- **Docker** 20.10+ and Docker Compose 2.0+
- **8GB RAM** minimum (16GB recommended)
- **20GB disk space** for images and data
- A **Gemini API key** (free tier works)

## Step 1: Clone & Configure (2 minutes)

```bash
# Clone the repository
git clone https://github.com/Delqhi/SIN-Solver.git
cd SIN-Solver

# Copy the environment template
cp .env.example .env
```

### Minimal Configuration

Edit `.env` and set these required variables:

```bash
# Required: Get free key at https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Database (keep defaults for local development)
POSTGRES_PASSWORD=sin_solver_secure_2026
REDIS_PASSWORD=sin_redis_2026
```

> 💡 **Tip**: The free Gemini tier provides 15 RPM, sufficient for testing.

## Step 2: Start Services (2 minutes)

```bash
# Start all services (pulls images on first run)
./start.sh

# Wait for services to be healthy (usually 60-90 seconds)
./status.sh
```

You should see output like:
```
✅ room-03-postgres-master: healthy
✅ room-04-redis-cache: healthy
✅ agent-05-steel-browser: healthy
✅ room-01-dashboard-cockpit: healthy
```

## Step 3: Access Dashboard (1 minute)

Open your browser:

```
http://localhost:3011
```

You'll see the SIN-Solver Cockpit with:
- Container status overview
- Real-time telemetry
- Solver controls

## Step 4: Test a CAPTCHA Solve

### Via Dashboard

1. Navigate to **Solver** tab
2. Select **reCAPTCHA v2** type
3. Enter a test sitekey and URL
4. Click **Solve**

### Via API

```bash
curl -X POST http://localhost:8000/api/solve \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAUA..."
  }'
```

Response:
```json
{
  "success": true,
  "solution": "ABC123",
  "solve_time_ms": 1234,
  "solver": "gemini-consensus"
}
```

## Common Commands

| Command | Description |
|---------|-------------|
| `./start.sh` | Start all services |
| `./stop.sh` | Stop all services |
| `./status.sh` | Check service health |
| `docker compose logs -f` | View live logs |
| `docker compose ps` | List running containers |

## Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker info

# Check port availability
lsof -i :3011  # Dashboard
lsof -i :5432  # Postgres
lsof -i :6379  # Redis

# View service logs
docker compose logs room-03-postgres-master
```

### Dashboard shows "Connection Refused"

```bash
# Ensure all core services are running
docker compose ps

# Restart the dashboard
docker compose restart room-01-dashboard-cockpit
```

### API returns 500 errors

```bash
# Check API logs
docker compose logs room-13-vault-api

# Verify environment variables are set
docker compose exec room-13-vault-api env | grep -E "(GEMINI|POSTGRES)"
```

## Next Steps

- 📖 [Full Documentation](./README.md)
- 🏗️ [Architecture Guide](./docs/SIN-SOLVER-TECHNICAL-ARCHITECTURE.md)
- 🔌 [API Reference](./docs/api-reference/)
- 🐛 [Report Issues](https://github.com/Delqhi/SIN-Solver/issues)

## Resource Usage

Typical resource consumption (idle):

| Service | CPU | RAM |
|---------|-----|-----|
| Postgres | 1% | 200MB |
| Redis | 1% | 50MB |
| Steel Browser | 2% | 300MB |
| Dashboard | 1% | 150MB |
| **Total** | **~5%** | **~700MB** |

During active solving, expect 10-20% CPU spikes.

---

**🎉 Congratulations!** You now have SIN-Solver running locally.

Need help? Join our [Discord](https://discord.gg/sin-solver) or open a [GitHub Issue](https://github.com/Delqhi/SIN-Solver/issues).
