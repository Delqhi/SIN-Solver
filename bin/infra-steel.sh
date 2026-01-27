#!/bin/bash
# ==========================================
# 🌐 Steel Browser: Zimmer-05 Tarnkappe
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="zimmer-05-steel-tarnkappe"
CONTAINER_NAME="Zimmer-05-Steel-Tarnkappe"
IMAGE_NAME="ghcr.io/steel-dev/steel-browser:latest"
PORT_EXTERNAL=3000
PORT_INTERNAL=3000

source "$SCRIPT_DIR/_common.sh"

run_service() {
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network haus-netzwerk \
        --ip 172.20.0.20 \
        -p ${PORT_EXTERNAL}:${PORT_INTERNAL} \
        -p 9222:9222 \
        -v sin-solver_steel_data:/home/pptruser/.config/google-chrome \
        -e PORT=3000 \
        -e DEBUGGER_PORT=9222 \
        -e STEALTH_MODE=true \
        -e CONCURRENCY=10 \
        --restart unless-stopped \
        --health-cmd="nc -z localhost 3000 || exit 1" \
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
    *)       show_help ;;
esac
