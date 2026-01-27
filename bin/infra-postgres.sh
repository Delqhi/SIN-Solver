#!/bin/bash
# ==========================================
# 🐘 PostgreSQL: Zimmer-Archiv
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="zimmer-archiv-postgres"
CONTAINER_NAME="Zimmer-Archiv-Postgres"
IMAGE_NAME="postgres:15-alpine"
PORT_EXTERNAL=5432
PORT_INTERNAL=5432

source "$SCRIPT_DIR/_common.sh"

run_service() {
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network haus-netzwerk \
        --ip 172.20.0.11 \
        -p ${PORT_EXTERNAL}:${PORT_INTERNAL} \
        -v sin-solver_postgres_data:/var/lib/postgresql/data \
        -e POSTGRES_DB=sin_solver_production \
        -e POSTGRES_USER=ceo_admin \
        -e POSTGRES_PASSWORD=secure_ceo_password_2026 \
        --restart unless-stopped \
        --health-cmd="pg_isready -U ceo_admin -d sin_solver_production" \
        --health-interval=5s \
        --health-timeout=5s \
        --health-retries=5 \
        "$IMAGE_NAME"
}

case "${1:-help}" in
    start)   start_container ;;
    stop)    stop_container ;;
    restart) restart_container ;;
    status)  show_status ;;
    logs)    show_logs "${2:-100}" ;;
    psql)    docker exec -it "$CONTAINER_NAME" psql -U ceo_admin -d sin_solver_production ;;
    *)       show_help ;;
esac
