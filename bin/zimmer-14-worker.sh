#!/bin/bash
# ==========================================
# ⚙️ Zimmer-14: Worker Arbeiter
# Task Processing Workers (Scalable)
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="zimmer-14-worker-arbeiter"
CONTAINER_NAME="Zimmer-14-Worker-Arbeiter"
IMAGE_NAME="sin-solver-zimmer-14-worker-arbeiter"
PORT_INTERNAL=8080
REPLICAS=5

source "$SCRIPT_DIR/_common.sh"

# Service-specific environment
SERVICE_ENV=(
    -e NODE_ENV=production
    -e PORT=$PORT_INTERNAL
    -e DATABASE_URL="postgresql://ceo_admin:secure_ceo_password_2026@zimmer-archiv-postgres:5432/sin_solver_production"
    -e REDIS_URL="redis://zimmer-speicher-redis:6379"
    -e API_COORDINATOR_URL="http://zimmer-13-api-koordinator:8000"
    -e STEEL_CDP_URL="ws://zimmer-05-steel-tarnkappe:3000/"
    -e CONCURRENT_TASKS=3
)

# Override for workers (no fixed IP, multiple instances)
run_service() {
    local instance="${1:-1}"
    local name="${CONTAINER_NAME}-${instance}"
    
    docker run -d \
        --name "$name" \
        --network haus-netzwerk \
        "${SERVICE_ENV[@]}" \
        --restart unless-stopped \
        --health-cmd="wget -q --spider http://localhost:${PORT_INTERNAL}/health || exit 1" \
        --health-interval=30s \
        --health-timeout=10s \
        --health-retries=3 \
        "$IMAGE_NAME"
    
    echo "$name"
}

# Custom start for workers
start_workers() {
    ensure_network
    
    local running=$(docker ps --filter "name=${CONTAINER_NAME}" --format '{{.Names}}' | wc -l | tr -d ' ')
    
    if [ "$running" -ge "$REPLICAS" ]; then
        log_warn "Already running $running workers"
        return 0
    fi
    
    if ! image_exists; then
        log_error "Image not found: $IMAGE_NAME"
        log_info "Run: $0 build"
        exit 1
    fi
    
    log_info "Starting $REPLICAS worker instances..."
    
    for i in $(seq 1 $REPLICAS); do
        local name="${CONTAINER_NAME}-${i}"
        if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
            docker rm -f "$name" 2>/dev/null || true
        fi
        run_service "$i"
        log_success "Started: $name"
    done
    
    log_success "All $REPLICAS workers started"
}

# Custom stop for workers
stop_workers() {
    log_info "Stopping all workers..."
    docker ps -a --filter "name=${CONTAINER_NAME}" --format '{{.Names}}' | while read name; do
        docker stop "$name" 2>/dev/null || true
        docker rm "$name" 2>/dev/null || true
        log_success "Stopped: $name"
    done
}

# Custom status for workers
status_workers() {
    echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}  $SERVICE_NAME (Replicas: $REPLICAS)${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}\n"
    
    local running=$(docker ps --filter "name=${CONTAINER_NAME}" --format '{{.Names}}' | wc -l | tr -d ' ')
    echo -e "Running Workers: ${GREEN}$running${NC} / $REPLICAS"
    echo ""
    
    docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
}

case "${1:-help}" in
    start)   start_workers ;;
    stop)    stop_workers ;;
    restart) stop_workers; sleep 2; start_workers ;;
    status)  status_workers ;;
    logs)    docker logs --tail "${2:-100}" -f "${CONTAINER_NAME}-1" 2>/dev/null || log_error "No worker running" ;;
    build)   build_image "./services/zimmer-14-worker" ;;
    scale)   REPLICAS="${2:-5}"; start_workers ;;
    *)       
        echo -e "\n${CYAN}$SERVICE_NAME${NC}"
        echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  start      Start $REPLICAS worker instances"
        echo "  stop       Stop all workers"
        echo "  restart    Restart all workers"
        echo "  status     Show worker status"
        echo "  logs [n]   Show logs from worker-1"
        echo "  build      Build the Docker image"
        echo "  scale [n]  Start n workers (default: 5)"
        echo ""
        ;;
esac
