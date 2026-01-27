#!/bin/bash
# ==========================================
# 🧠 Zimmer-13: API Koordinator
# Central API Brain (FastAPI/Python)
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="zimmer-13-api-koordinator"
CONTAINER_NAME="Zimmer-13-API-Koordinator"
IMAGE_NAME="sin-solver-zimmer-13-api-koordinator"
PORT_EXTERNAL=8000
PORT_INTERNAL=8000

source "$SCRIPT_DIR/_common.sh"

# Load .env
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Service-specific environment
SERVICE_ENV=(
    -e POSTGRES_URL="postgresql://ceo_admin:secure_ceo_password_2026@zimmer-archiv-postgres:5432/sin_solver_production"
    -e REDIS_URL="redis://zimmer-speicher-redis:6379"
    -e ENCRYPTION_KEY="${ENCRYPTION_KEY:-sin-solver-encryption-key-2026-ceo}"
    -e JWT_SECRET="${JWT_SECRET:-sin-solver-jwt-secret-2026-ceo-empire}"
)

run_service() {
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network haus-netzwerk \
        --ip 172.20.0.31 \
        -p ${PORT_EXTERNAL}:${PORT_INTERNAL} \
        "${SERVICE_ENV[@]}" \
        --restart unless-stopped \
        --health-cmd="curl -f http://localhost:${PORT_INTERNAL}/health || exit 1" \
        --health-interval=10s \
        --health-timeout=5s \
        --health-retries=3 \
        "$IMAGE_NAME"
}

case "${1:-help}" in
    start)   start_container ;;
    stop)    stop_container ;;
    restart) restart_container ;;
    status)  show_status ;;
    logs)    show_logs "${2:-100}" ;;
    build)   build_image "./services/zimmer-13-api-coordinator" ;;
    shell)   docker exec -it "$CONTAINER_NAME" /bin/bash ;;
    *)       show_help ;;
esac
