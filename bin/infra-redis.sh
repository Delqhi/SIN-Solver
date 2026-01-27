#!/bin/bash
# ==========================================
# 🔴 Redis: Zimmer-Speicher
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="zimmer-speicher-redis"
CONTAINER_NAME="Zimmer-Speicher-Redis"
IMAGE_NAME="redis:7.2-alpine"
PORT_EXTERNAL=6379
PORT_INTERNAL=6379

source "$SCRIPT_DIR/_common.sh"

run_service() {
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network haus-netzwerk \
        --ip 172.20.0.10 \
        -p ${PORT_EXTERNAL}:${PORT_INTERNAL} \
        -v sin-solver_redis_data:/data \
        --restart unless-stopped \
        --health-cmd="redis-cli ping" \
        --health-interval=5s \
        --health-timeout=3s \
        --health-retries=5 \
        "$IMAGE_NAME" \
        redis-server --save 60 1 --loglevel warning
}

case "${1:-help}" in
    start)   start_container ;;
    stop)    stop_container ;;
    restart) restart_container ;;
    status)  show_status ;;
    logs)    show_logs "${2:-100}" ;;
    cli)     docker exec -it "$CONTAINER_NAME" redis-cli ;;
    *)       show_help ;;
esac
