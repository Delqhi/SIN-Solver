#!/bin/bash
# ==========================================
# 🔄 N8N: Zimmer-01 Manager
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="zimmer-01-n8n-manager"
CONTAINER_NAME="Zimmer-01-n8n-Manager"
IMAGE_NAME="n8nio/n8n:latest"
PORT_EXTERNAL=5678
PORT_INTERNAL=5678

source "$SCRIPT_DIR/_common.sh"

run_service() {
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network haus-netzwerk \
        --ip 172.20.0.30 \
        -p ${PORT_EXTERNAL}:${PORT_INTERNAL} \
        -v sin-solver_n8n_data:/home/node/.n8n \
        -e N8N_SECURE_COOKIE=false \
        -e N8N_BLOCK_IFRAMES=false \
        -e N8N_EDITOR_BASE_URL="http://192.168.178.21:5678/" \
        -e N8N_USE_SAMESITE_COOKIE=none \
        -e WEBHOOK_URL="http://192.168.178.21:5678/" \
        --restart unless-stopped \
        --health-cmd="curl -f http://localhost:5678/healthz || exit 1" \
        --health-interval=30s \
        --health-timeout=10s \
        --health-retries=5 \
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
