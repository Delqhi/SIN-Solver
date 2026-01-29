#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.yml"
CREDENTIALS_FILE="$SCRIPT_DIR/credentials.json"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

check_cloudflared() {
    if ! command -v cloudflared &> /dev/null; then
        log_error "cloudflared not found"
        echo "Install: brew install cloudflared"
        exit 1
    fi
}

start_tunnel() {
    check_cloudflared
    
    if [ ! -f "$CREDENTIALS_FILE" ]; then
        log_error "Credentials file not found: $CREDENTIALS_FILE"
        echo "Run: cloudflared tunnel login"
        echo "Then: cloudflared tunnel create Delqhi-Platform"
        exit 1
    fi
    
    log_info "Starting Cloudflare Tunnel..."
    cloudflared tunnel --config "$CONFIG_FILE" run Delqhi-Platform
}

stop_tunnel() {
    log_info "Stopping Cloudflare Tunnel..."
    pkill -f "cloudflared tunnel" || true
    log_success "Tunnel stopped"
}

status_tunnel() {
    if pgrep -f "cloudflared tunnel" > /dev/null; then
        log_success "Tunnel is RUNNING"
        pgrep -af "cloudflared tunnel"
    else
        log_error "Tunnel is NOT running"
    fi
}

setup_tunnel() {
    check_cloudflared
    
    log_info "Setting up Cloudflare Tunnel..."
    echo ""
    echo "Step 1: Login to Cloudflare"
    cloudflared tunnel login
    
    echo ""
    echo "Step 2: Create tunnel"
    cloudflared tunnel create Delqhi-Platform
    
    echo ""
    echo "Step 3: Copy credentials"
    CREDS=$(ls ~/.cloudflared/*.json 2>/dev/null | head -1)
    if [ -n "$CREDS" ]; then
        cp "$CREDS" "$CREDENTIALS_FILE"
        log_success "Credentials copied to $CREDENTIALS_FILE"
    fi
    
    echo ""
    echo "Step 4: Configure DNS"
    echo "Run these commands for each subdomain:"
    echo "  cloudflared tunnel route dns Delqhi-Platform dashboard.sin-solver.example.com"
    echo "  cloudflared tunnel route dns Delqhi-Platform api.sin-solver.example.com"
    echo "  cloudflared tunnel route dns Delqhi-Platform survey.sin-solver.example.com"
    echo "  cloudflared tunnel route dns Delqhi-Platform captcha.sin-solver.example.com"
    echo ""
    log_success "Setup complete. Run: $0 start"
}

show_endpoints() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  Delqhi-Platform Public Endpoints${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  Dashboard:  ${GREEN}https://dashboard.sin-solver.example.com${NC}"
    echo -e "  API:        ${GREEN}https://api.sin-solver.example.com${NC}"
    echo -e "  Survey:     ${GREEN}https://survey.sin-solver.example.com${NC}"
    echo -e "  Captcha:    ${GREEN}https://captcha.sin-solver.example.com${NC}"
    echo -e "  N8N:        ${GREEN}https://n8n.sin-solver.example.com${NC}"
    echo -e "  Steel:      ${GREEN}https://steel.sin-solver.example.com${NC}"
    echo -e "  Supabase:   ${GREEN}https://supabase.sin-solver.example.com${NC}"
    echo ""
    echo -e "${YELLOW}Note: Replace 'example.com' with your actual domain${NC}"
    echo ""
}

case "${1:-help}" in
    start)     start_tunnel ;;
    stop)      stop_tunnel ;;
    status)    status_tunnel ;;
    setup)     setup_tunnel ;;
    endpoints) show_endpoints ;;
    *)
        echo "Cloudflare Tunnel Manager"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  setup      Initial tunnel setup (login, create, configure)"
        echo "  start      Start the tunnel"
        echo "  stop       Stop the tunnel"
        echo "  status     Check tunnel status"
        echo "  endpoints  Show public endpoints"
        ;;
esac
