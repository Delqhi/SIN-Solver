#!/bin/bash
# Zimmer-18: Survey Worker
# 100% FREE Survey Automation with AI

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
source "$SCRIPT_DIR/_common.sh"

SERVICE_NAME="Zimmer-18-Survey-Worker"
CONTAINER_NAME="Zimmer-18-Survey-Worker"
IMAGE_NAME="sin-solver/zimmer-18-survey-worker:latest"
PORT_EXTERNAL=8018
PORT_INTERNAL=8018
IP_ADDRESS="172.20.0.80"

run_service() {
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network haus-netzwerk \
        --ip "$IP_ADDRESS" \
        -p "$PORT_EXTERNAL:$PORT_INTERNAL" \
        -e NODE_ENV=production \
        -e PORT=$PORT_INTERNAL \
        -e REDIS_URL=redis://172.20.0.10:6379 \
        -e API_COORDINATOR_URL=http://172.20.0.31:8000 \
        -e STEEL_CDP_URL=ws://172.20.0.20:3000/ \
        -e GEMINI_API_KEY="${GEMINI_API_KEY}" \
        -e MISTRAL_API_KEY="${MISTRAL_API_KEY}" \
        -e OPENCODE_ZEN_API_KEY="${OPENCODE_ZEN_API_KEY}" \
        -e GROQ_API_KEY="${GROQ_API_KEY}" \
        -e HUGGINGFACE_API_KEY="${HUGGINGFACE_API_KEY}" \
        -e ENCRYPTION_KEY="${ENCRYPTION_KEY}" \
        -v "${PROJECT_ROOT}/services/zimmer-18-survey-worker/cookies:/app/cookies" \
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
    build)   build_image "./services/zimmer-18-survey-worker" ;;
    shell)   docker exec -it "$CONTAINER_NAME" /bin/sh ;;
    *)       show_help ;;
esac
