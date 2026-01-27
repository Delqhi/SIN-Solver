#!/bin/bash
# ==========================================
# 📊 Zimmer-11: Dashboard Zentrale
# Web UI & Monitoring Dashboard
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="zimmer-11-dashboard-zentrale"
CONTAINER_NAME="Zimmer-11-Dashboard-Zentrale"
IMAGE_NAME="sin-solver-zimmer-11-dashboard-zentrale"
PORT_EXTERNAL=3100
PORT_INTERNAL=80

source "$SCRIPT_DIR/_common.sh"

# Service-specific environment
SERVICE_ENV=(
    -e NODE_ENV=production
    -e API_URL="http://zimmer-13-api-koordinator:8000"
)

run_service() {
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network haus-netzwerk \
        --ip 172.20.0.40 \
        -p ${PORT_EXTERNAL}:${PORT_INTERNAL} \
        "${SERVICE_ENV[@]}" \
        --restart unless-stopped \
        --health-cmd="wget -q --spider http://localhost:${PORT_INTERNAL}/ || exit 1" \
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
    build)   build_image "./services/zimmer-11-dashboard" ;;
    shell)   docker exec -it "$CONTAINER_NAME" /bin/sh ;;
    *)       show_help ;;
esac
