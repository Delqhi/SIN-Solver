#!/bin/bash
set -a
source .env.production.local
set +a

cd /Users/jeremy/dev/Delqhi-Platform/Docker

echo "================================================"
echo "Delqhi-Platform Docker Infrastructure Startup (V18.3)"
echo "================================================"
echo ""

echo "✅ Environment variables loaded"
echo "   DB_PASSWORD: ${DB_PASSWORD:0:10}***"
echo "   REDIS_PASSWORD: ${REDIS_PASSWORD:0:10}***"
echo "   N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY:0:10}***"
echo ""

echo "🚀 Starting infrastructure services..."
echo ""

echo "1️⃣  Starting PostgreSQL (room-03-postgres-master)..."
docker compose -f infrastructure/room-03-postgres/docker-compose.yml up -d
echo "   Waiting for PostgreSQL to be healthy..."
sleep 12
docker ps | grep room-03 | grep -q "healthy" || echo "   ⚠️  PostgreSQL still initializing..."
echo ""

echo "2️⃣  Starting Redis (room-04-redis-cache)..."
docker compose -f infrastructure/room-04-redis/docker-compose.yml up -d
echo "   Waiting for Redis to be healthy..."
sleep 5
docker ps | grep room-04 | grep -q "healthy" && echo "   ✅ Redis is ready" || echo "   ⚠️  Redis initializing..."
echo ""

echo "3️⃣  Starting n8n Orchestrator (agent-01-n8n-orchestrator)..."
docker compose -f agents/agent-01-n8n/docker-compose.yml up -d
echo "   Waiting for n8n to initialize..."
sleep 30
echo ""

echo "📊 Service Status Check:"
echo "================================================"
docker ps -a | grep -E "room-03|room-04|agent-01" | awk '{print $NF, "(" $7 ")"}'
echo ""

echo "🔍 Health Status:"
echo "   PostgreSQL: $(docker ps | grep room-03 | grep -o 'healthy\|starting\|unhealthy' | head -1)"
echo "   Redis: $(docker ps | grep room-04 | grep -o 'healthy\|starting\|unhealthy' | head -1)"
echo "   n8n: $(docker ps | grep agent-01 | grep -o 'healthy\|starting\|unhealthy' | head -1)"
echo ""

echo "📝 Logs:"
echo "================================================"
echo "n8n (last 20 lines):"
docker logs agent-01-n8n-orchestrator 2>&1 | tail -20
echo ""

echo "✅ Startup complete!"
echo ""
echo "🌐 Access Points:"
echo "   n8n Editor: http://localhost:5678"
echo "   PostgreSQL: localhost:5432"
echo "   Redis: localhost:6379"
