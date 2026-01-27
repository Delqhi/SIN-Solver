#!/bin/bash
# Zimmer-19: Captcha Worker
# 100% FREE Self-Hosted CAPTCHA Solving (ddddocr + Whisper + YOLO)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
source "$SCRIPT_DIR/_common.sh"

SERVICE_NAME="Zimmer-19-Captcha-Worker"
CONTAINER_NAME="Zimmer-19-Captcha-Worker"
IMAGE_NAME="sin-solver/zimmer-19-captcha-worker:latest"
PORT_EXTERNAL=8019
PORT_INTERNAL=8019
IP_ADDRESS="172.20.0.81"

run_service() {
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network haus-netzwerk \
        --ip "$IP_ADDRESS" \
        -p "$PORT_EXTERNAL:$PORT_INTERNAL" \
        -e PORT=$PORT_INTERNAL \
        -e REDIS_URL=redis://172.20.0.10:6379 \
        -e API_COORDINATOR_URL=http://172.20.0.31:8000 \
        -e GEMINI_API_KEY="${GEMINI_API_KEY}" \
        -e MISTRAL_API_KEY="${MISTRAL_API_KEY}" \
        -v "${PROJECT_ROOT}/models/captcha:/app/models" \
        --restart unless-stopped \
        --health-cmd="wget -q --spider http://localhost:$PORT_INTERNAL/health || exit 1" \
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
    build)   build_image "./services/zimmer-19-captcha-worker" ;;
    shell)   docker exec -it "$CONTAINER_NAME" /bin/sh ;;
    *)       show_help ;;
esac
