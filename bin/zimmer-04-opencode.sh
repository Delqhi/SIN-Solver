#!/bin/bash
# ==========================================
# 🤖 Zimmer-04: OpenCode Sekretär
# LLM Gateway & AI Integration Service
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="zimmer-04-opencode-sekretaer"
CONTAINER_NAME="Zimmer-04-OpenCode-Sekretaer"
IMAGE_NAME="sin-solver-zimmer-04-opencode-sekretaer"
PORT_EXTERNAL=3002
PORT_INTERNAL=9000

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
    -e OPENAI_API_KEY="${OPENAI_API_KEY:-}"
    -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
    -e API_COORDINATOR_URL="http://zimmer-13-api-koordinator:8000"
)

run_service() {
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network haus-netzwerk \
        --ip 172.20.0.41 \
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
    build)   build_image "./services/zimmer-04-opencode" ;;
    shell)   docker exec -it "$CONTAINER_NAME" /bin/sh ;;
    *)       show_help ;;
esac
