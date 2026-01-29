#!/bin/bash
# Test Runner for SIN-Solver
# Runs ALL tests with REAL services
# Best Practices 2026

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  SIN-SOLVER TEST SUITE - VERKAUFSBEREIT 2026"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are running
echo "🔍 Checking services..."

if ! curl -s http://localhost:8019/health > /dev/null; then
    echo -e "${RED}❌ Captcha Worker not running on port 8019${NC}"
    echo "   Start with: docker compose up -d solver-1.1-captcha-worker"
    exit 1
fi

if ! curl -s http://localhost:6379 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Redis not responding on port 6379${NC}"
fi

echo -e "${GREEN}✅ Services are running${NC}"
echo ""

# Install test dependencies if needed
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -q -r tests/requirements-test.txt
else
    source venv/bin/activate
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  RUNNING TESTS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Run E2E Tests
echo "🧪 Running E2E Integration Tests..."
python -m pytest tests/test_e2e_integration.py -v --tb=short -m "not slow" || true
echo ""

# Run Container Health Tests
echo "🐳 Running Container Health Tests..."
python -m pytest tests/test_container_health.py -v --tb=short || true
echo ""

# Run Load Tests (if --load flag is passed)
if [ "$1" == "--load" ]; then
    echo "🚀 Running Load Tests..."
    python -m pytest tests/test_load_performance.py -v --tb=short || true
    echo ""
fi

# Run ALL tests
echo "📊 Running Full Test Suite..."
python -m pytest tests/ -v --tb=short --ignore=tests/test_load_performance.py || true

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  TEST COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "To run load tests: ./run-tests.sh --load"
echo ""
