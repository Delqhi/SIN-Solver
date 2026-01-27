#!/bin/bash
# ==========================================
# 🕐 Zimmer-02: Chronos Stratege
# Scheduler & Task Planning Service
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="zimmer-02-chronos-stratege"
CONTAINER_NAME="Zimmer-02-Chronos-Stratege"
IMAGE_NAME="sin-solver-zimmer-02-chronos-stratege"
PORT_EXTERNAL=3001
PORT_INTERNAL=3001

source "$SCRIPT_DIR/_common.sh"

# Service-specific environment
SERVICE_ENV=(
    -e NODE_ENV=production
    -e PORT=$PORT_INTERNAL
    -e DATABASE_URL="postgresql://ceo_admin:secure_ceo_password_2026@zimmer-archiv-postgres:5432/sin_solver_production"
    -e API_BRAIN_URL="http://zimmer-13-api-koordinator:8000"
)

run_service() {
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network haus-netzwerk \
        --ip 172.20.0.52 \
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
    build)   build_image "./services/zimmer-02-chronos" ;;
    shell)   docker exec -it "$CONTAINER_NAME" /bin/sh ;;
    *)       show_help ;;
esac
