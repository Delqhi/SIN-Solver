#!/bin/bash
# ==========================================
# 🧪 Zimmer-08: QA Prüfer
# Automated Testing & Quality Assurance
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="zimmer-08-qa-pruefer"
CONTAINER_NAME="Zimmer-08-QA-Pruefer"
IMAGE_NAME="sin-solver-zimmer-08-qa-pruefer"
PORT_EXTERNAL=8005
PORT_INTERNAL=8080

source "$SCRIPT_DIR/_common.sh"

# Service-specific environment
SERVICE_ENV=(
    -e NODE_ENV=production
    -e PORT=$PORT_INTERNAL
    -e DATABASE_URL="postgresql://ceo_admin:secure_ceo_password_2026@zimmer-archiv-postgres:5432/sin_solver_production"
    -e REDIS_URL="redis://zimmer-speicher-redis:6379"
    -e API_COORDINATOR_URL="http://zimmer-13-api-koordinator:8000"
)

run_service() {
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network haus-netzwerk \
        --ip 172.20.0.56 \
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
    build)   build_image "./services/zimmer-08-qa" ;;
    shell)   docker exec -it "$CONTAINER_NAME" /bin/sh ;;
    *)       show_help ;;
esac
