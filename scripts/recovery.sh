#!/bin/bash
# recovery.sh - Module 20
# OPENCODE EMERGENCY RESTORE V16.1
# Use only when cognitive collapse is imminent.

echo "[OPS] INITIATING ZERO-DAY RECOVERY..."

# 1. Kill all Zombie Agents & Containers
echo "[OPS] Killing Zombie Agents..."
pkill -f "opencode-agent"

echo "[OPS] Stopping Project Containers..."
docker-compose down

# 2. Restore Configs from SIN-Code Vault (The Truth)
echo "[OPS] Restoring Immutable Configs..."
if [ -d "/Users/jeremy/dev/SIN-Code/OpenCode/templates" ]; then
    cp -R /Users/jeremy/dev/SIN-Code/OpenCode/templates/* ~/.config/opencode/
    echo "[OPS] Configs restored."
else
    echo "[OPS] Warning: Config templates not found at /Users/jeremy/dev/SIN-Code/OpenCode/templates."
fi

# 3. Rebuild Agent Core
echo "[OPS] Rebuilding Project Infrastructure..."
docker-compose up -d --build --remove-orphans

echo "[OPS] ✅ Recovery Complete. System Status:"
docker-compose ps
