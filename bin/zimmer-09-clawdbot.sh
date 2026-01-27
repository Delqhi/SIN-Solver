#!/bin/bash
# ==========================================
# 📨 Zimmer-09: ClawdBot Bote
# Telegram & Discord Bot Service
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="zimmer-09-clawdbot-bote"
CONTAINER_NAME="Zimmer-09-ClawdBot-Bote"
IMAGE_NAME="sin-solver-zimmer-09-clawdbot-bote"
PORT_EXTERNAL=8004
PORT_INTERNAL=8080

source "$SCRIPT_DIR/_common.sh"

# Load .env
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Service-specific environment
SERVICE_ENV=(
    -e NODE_ENV=production
    -e PORT=$PORT_INTERNAL
    -e DATABASE_URL="postgresql://ceo_admin:secure_ceo_password_2026@zimmer-archiv-postgres:5432/sin_solver_production"
    -e REDIS_URL="redis://zimmer-speicher-redis:6379"
    -e API_COORDINATOR_URL="http://zimmer-13-api-koordinator:8000"
    -e TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
    -e TELEGRAM_BOT_NAME="${TELEGRAM_BOT_NAME:-DelqhiBot}"
    -e DISCORD_BOT_TOKEN="${DISCORD_BOT_TOKEN:-}"
)

run_service() {
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network haus-netzwerk \
        --ip 172.20.0.55 \
        -p ${PORT_EXTERNAL}:${PORT_INTERNAL} \
        "${SERVICE_ENV[@]}" \
        --restart unless-stopped \
        --health-cmd="wget -q --spider http://localhost:${PORT_INTERNAL}/health || exit 1" \
        --health-interval=30s \
        --health-timeout=10s \
        --health-retries=3 \
        "$IMAGE_NAME"
}

case "${1:-help}" in
    start)   start_container ;;
    stop)    stop_container ;;
    restart) restart_container ;;
    status)  show_status ;;
    logs)    show_logs "${2:-100}" ;;
    build)   build_image "./services/zimmer-09-clawdbot" ;;
    shell)   docker exec -it "$CONTAINER_NAME" /bin/sh ;;
    *)       show_help ;;
esac
