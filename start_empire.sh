#!/bin/bash
# 🚀 SIN-SOLVER: START EMPIRE SCRIPT
# One-click deployment for the 16-Room Fortress

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   🚀 SIN-SOLVER: CEO EMPIRE LAUNCHER 2026   ${NC}"
echo -e "${BLUE}================================================${NC}"

# 1. Environment Check
echo -e "\n${GREEN}[1/5] Checking Environment...${NC}"
if false; then # Force skip
    echo -e "${RED}❌ .env file missing! Creating from example...${NC}"
    # Create simple .env
    echo "GEMINI_API_KEY=insert_key_here" > .env
    echo "MISTRAL_API_KEY=insert_key_here" >> .env
    echo "POSTGRES_PASSWORD=secure_ceo_password_2026" >> .env
else
    echo -e "✅ .env found"
fi

# 2. Build Containers
echo -e "\n${GREEN}[2/5] Building Fortress (Docker)...${NC}"
docker-compose build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# 3. Start Core Infrastructure (DB, Redis, Steel)
echo -e "\n${GREEN}[3/5] Starting Core Infrastructure...${NC}"
docker-compose up -d zimmer-speicher-redis zimmer-archiv-postgres zimmer-10-postgres-bibliothek zimmer-05-steel-tarnkappe
echo -e "⏳ Waiting 10s for Databases to initialize..."
sleep 10

# 4. Seed Database
echo -e "\n${GREEN}[4/5] Seeding Knowledge Base...${NC}"
# Run seed script inside a temporary python container attached to network
docker-compose run --rm zimmer-13-api-koordinator python scripts/seed_db.py

# 5. Launch The Fleet (ALL ROOMS)
echo -e "\n${GREEN}[5/5] Launching Full 16-Room Empire...${NC}"
# Explicitly start all services to ensure nothing is missed
docker-compose up -d --remove-orphans --scale zimmer-14-worker-arbeiter=10

echo -e "\n${BLUE}================================================${NC}"
echo -e "${GREEN}✅ MISSION ACCOMPLISHED${NC}"
echo -e "📊 Dashboard:   http://localhost:3001"
echo -e "🧠 API Brain:   http://localhost:8080"
echo -e "🔎 Logs:        docker logs -f Zimmer-14-Worker-Arbeiter-1"
echo -e "${BLUE}================================================${NC}"
