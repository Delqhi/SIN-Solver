#!/bin/bash

##############################################################################
# PHASE 3: WORKFLOW IMPORT AUTOMATION SCRIPT
# Purpose: Import 2captcha-worker-production.json into n8n
# Duration: 5-10 minutes (with browser wait time)
# Status: AUTOMATED with browser fallback
##############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                    PHASE 3: WORKFLOW IMPORT                               ║"
echo "║                   n8n Production Setup & Import                           ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Verify n8n is running
echo -e "${BLUE}[STEP 1/5]${NC} Verifying n8n service is running..."
if curl -s http://localhost:5678 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ n8n is running at http://localhost:5678${NC}"
else
    echo -e "${RED}❌ ERROR: n8n is not responding at http://localhost:5678${NC}"
    echo "Please start n8n with: docker-compose -f docker-compose.yml up -d"
    exit 1
fi
echo ""

# Step 2: Verify workflow file
echo -e "${BLUE}[STEP 2/5]${NC} Verifying workflow file..."
WORKFLOW_FILE="$PROJECT_ROOT/infrastructure/n8n/workflows/2captcha-worker-production.json"
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo -e "${RED}❌ ERROR: Workflow file not found at $WORKFLOW_FILE${NC}"
    exit 1
fi

NODES=$(cat "$WORKFLOW_FILE" | jq '.nodes | length' 2>/dev/null || echo "0")
CONNECTIONS=$(cat "$WORKFLOW_FILE" | jq '.connections | length' 2>/dev/null || echo "0")
echo -e "${GREEN}✅ Workflow file found: $WORKFLOW_FILE${NC}"
echo "   - Nodes: $NODES"
echo "   - Connections: $CONNECTIONS"
echo ""

# Step 3: Create workflow import data
echo -e "${BLUE}[STEP 3/5]${NC} Preparing workflow import..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract workflow data
cat "$WORKFLOW_FILE" | jq '{
  name: .name,
  nodes: .nodes,
  connections: .connections,
  settings: .settings,
  active: false
}' > "$TEMP_DIR/workflow-payload.json"

echo -e "${GREEN}✅ Workflow import data prepared${NC}"
echo ""

# Step 4: Display manual import instructions
echo -e "${BLUE}[STEP 4/5]${NC} Displaying import instructions..."
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}IMPORTANT: n8n API requires authentication key${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "MANUAL IMPORT METHOD (GUI):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Open browser: http://localhost:5678"
echo ""
echo "2. In n8n interface, click the menu (☰) in top-left"
echo ""
echo "3. Select: Workflows → Import"
echo ""
echo "4. Copy & paste entire contents of this file:"
echo "   ${WORKFLOW_FILE}"
echo ""
echo "   (You can use this command to view the file:)"
echo "   cat '$WORKFLOW_FILE' | jq ."
echo ""
echo "5. Click Import and confirm"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 5: Provide copy-paste JSON
echo -e "${BLUE}[STEP 5/5]${NC} JSON ready for import (copy entire output below):"
echo ""
echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────────┐${NC}"
echo "│ COPY EVERYTHING BELOW THIS LINE (from { to last }) │"
echo -e "${YELLOW}└─────────────────────────────────────────────────────────────────┘${NC}"
echo ""

# Output the workflow JSON in a format that can be directly pasted
cat "$WORKFLOW_FILE"

echo ""
echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────────┐${NC}"
echo "│ PASTE ABOVE JSON INTO n8n IMPORT DIALOG             │"
echo -e "${YELLOW}└─────────────────────────────────────────────────────────────────┘${NC}"
echo ""

# Offer to open browser
echo ""
echo -e "${BLUE}Would you like me to open the n8n browser? (y/n)${NC}"
read -p "Enter choice: " open_browser

if [ "$open_browser" = "y" ] || [ "$open_browser" = "Y" ]; then
    open http://localhost:5678 || xdg-open http://localhost:5678 || start http://localhost:5678
    echo -e "${GREEN}✅ Browser opened at http://localhost:5678${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}PHASE 3 STEP 1 COMPLETE: Workflow ready for import${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "NEXT: Import workflow into n8n, then we'll configure variables"
echo ""

