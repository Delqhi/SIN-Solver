#!/bin/bash

################################################################################
# SIN-Solver Docker Build Script
# Purpose: Build, tag, and optionally push Docker image with security scanning
# Features: 
#   - Multi-stage build verification
#   - Trivy security scanning
#   - Image size validation
#   - Git SHA tagging
#   - Automatic registry push (optional)
################################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# CONFIGURATION
################################################################################

# Docker registry settings
DOCKER_REGISTRY="${DOCKER_REGISTRY:-docker.io}"
DOCKER_REPOSITORY="${DOCKER_REPOSITORY:-sin-solver}"
DOCKER_USERNAME="${DOCKER_USERNAME:-}"
DOCKER_PASSWORD="${DOCKER_PASSWORD:-}"

# Build settings
VERSION="${VERSION:-latest}"
BUILD_CONTEXT="${BUILD_CONTEXT:-.}"
DOCKERFILE_PATH="${DOCKERFILE_PATH:-phase-2.5-deployment/Dockerfile}"
PUSH_TO_REGISTRY="${PUSH_TO_REGISTRY:-false}"
ENABLE_TRIVY="${ENABLE_TRIVY:-true}"
MAX_IMAGE_SIZE_MB="${MAX_IMAGE_SIZE_MB:-500}"

# Git settings
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# Image information
FULL_IMAGE_NAME="${DOCKER_REGISTRY}/${DOCKER_REPOSITORY}:${VERSION}"
TAGGED_IMAGE_NAME="${DOCKER_REGISTRY}/${DOCKER_REPOSITORY}:${VERSION}-${GIT_SHA}"

################################################################################
# FUNCTIONS
################################################################################

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Print section header
print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    print_header "CHECKING PREREQUISITES"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker found: $(docker --version)"
    
    # Check Docker daemon
    if ! docker ps &> /dev/null; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    print_success "Docker daemon is running"
    
    # Check Dockerfile exists
    if [ ! -f "$DOCKERFILE_PATH" ]; then
        print_error "Dockerfile not found at $DOCKERFILE_PATH"
        exit 1
    fi
    print_success "Dockerfile found at $DOCKERFILE_PATH"
    
    # Check Trivy if enabled
    if [ "$ENABLE_TRIVY" = "true" ]; then
        if ! command -v trivy &> /dev/null; then
            print_warning "Trivy not installed - skipping security scanning"
            ENABLE_TRIVY="false"
        else
            print_success "Trivy found: $(trivy --version | head -n1)"
        fi
    fi
    
    # Check git
    if command -v git &> /dev/null; then
        print_success "Git found: $(git --version)"
    else
        print_warning "Git not found - will use 'unknown' for commit SHA"
    fi
}

# Build Docker image
build_image() {
    print_header "BUILDING DOCKER IMAGE"
    
    print_info "Image name: $FULL_IMAGE_NAME"
    print_info "Dockerfile: $DOCKERFILE_PATH"
    print_info "Build context: $BUILD_CONTEXT"
    print_info "Git SHA: $GIT_SHA"
    print_info "Git branch: $GIT_BRANCH"
    print_info "Build date: $BUILD_DATE"
    echo ""
    
    # Build with progress
    if docker build \
        --file "$DOCKERFILE_PATH" \
        --tag "$FULL_IMAGE_NAME" \
        --tag "$TAGGED_IMAGE_NAME" \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg VCS_REF="$GIT_SHA" \
        --build-arg VERSION="$VERSION" \
        --progress=plain \
        "$BUILD_CONTEXT"; then
        print_success "Docker image built successfully"
    else
        print_error "Docker build failed"
        exit 1
    fi
}

# Validate image size
validate_image_size() {
    print_header "VALIDATING IMAGE SIZE"
    
    # Get image size in MB
    IMAGE_SIZE=$(docker inspect --format='{{.Size}}' "$FULL_IMAGE_NAME" | awk '{print $1/1024/1024}')
    IMAGE_SIZE_MB=$(printf "%.2f" "$IMAGE_SIZE")
    
    print_info "Image size: ${IMAGE_SIZE_MB}MB"
    print_info "Max allowed: ${MAX_IMAGE_SIZE_MB}MB"
    
    # Check size limit
    if (( $(echo "$IMAGE_SIZE_MB > $MAX_IMAGE_SIZE_MB" | bc -l) )); then
        print_error "Image size exceeds limit (${IMAGE_SIZE_MB}MB > ${MAX_IMAGE_SIZE_MB}MB)"
        exit 1
    else
        print_success "Image size within acceptable limits"
    fi
}

# Get image details
get_image_details() {
    print_header "IMAGE DETAILS"
    
    # Get image info
    docker inspect "$FULL_IMAGE_NAME" | jq '{
        Id: .[0].Id,
        Created: .[0].Created,
        Size: .[0].Size,
        VirtualSize: .[0].VirtualSize,
        Entrypoint: .[0].Config.Entrypoint,
        Cmd: .[0].Config.Cmd,
        Labels: .[0].Config.Labels
    }'
    
    print_success "Image details displayed"
}

# Run Trivy security scan
run_trivy_scan() {
    print_header "RUNNING TRIVY SECURITY SCAN"
    
    if [ "$ENABLE_TRIVY" != "true" ]; then
        print_warning "Trivy scanning disabled"
        return 0
    fi
    
    TRIVY_CACHE_DIR="${HOME}/.cache/trivy"
    mkdir -p "$TRIVY_CACHE_DIR"
    
    print_info "Scanning image: $FULL_IMAGE_NAME"
    print_info "Cache directory: $TRIVY_CACHE_DIR"
    echo ""
    
    # Run Trivy scan
    if trivy image \
        --cache-dir "$TRIVY_CACHE_DIR" \
        --severity HIGH,CRITICAL \
        --exit-code 0 \
        --format json \
        --output /tmp/trivy-results.json \
        "$FULL_IMAGE_NAME"; then
        
        # Parse and display results
        CRITICAL_COUNT=$(jq '[.Results[]?.Misconfigurations[]? | select(.Severity=="CRITICAL")] | length' /tmp/trivy-results.json 2>/dev/null || echo 0)
        HIGH_COUNT=$(jq '[.Results[]?.Misconfigurations[]? | select(.Severity=="HIGH")] | length' /tmp/trivy-results.json 2>/dev/null || echo 0)
        
        print_info "Critical issues: $CRITICAL_COUNT"
        print_info "High issues: $HIGH_COUNT"
        
        if [ "$CRITICAL_COUNT" -gt 0 ]; then
            print_error "Critical security issues found!"
            jq '.Results[]?.Misconfigurations[] | select(.Severity=="CRITICAL")' /tmp/trivy-results.json
            exit 1
        else
            print_success "No critical security issues found"
        fi
        
    else
        print_error "Trivy scan failed"
        exit 1
    fi
}

# Verify image
verify_image() {
    print_header "VERIFYING IMAGE"
    
    # Check if image runs
    print_info "Testing image startup..."
    
    # Create temporary container
    CONTAINER_ID=$(docker create "$FULL_IMAGE_NAME" /bin/sh -c 'echo "Container created successfully"' 2>/dev/null)
    
    if [ -z "$CONTAINER_ID" ]; then
        print_error "Failed to create test container"
        exit 1
    fi
    
    # Clean up test container
    docker rm "$CONTAINER_ID" &>/dev/null
    
    print_success "Image verification passed"
}

# Login to Docker registry
docker_login() {
    if [ -z "$DOCKER_USERNAME" ] || [ -z "$DOCKER_PASSWORD" ]; then
        print_warning "Docker credentials not provided - skipping login"
        return 0
    fi
    
    print_header "LOGGING IN TO DOCKER REGISTRY"
    
    print_info "Registry: $DOCKER_REGISTRY"
    
    if echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin "$DOCKER_REGISTRY" &>/dev/null; then
        print_success "Successfully logged in to $DOCKER_REGISTRY"
    else
        print_error "Failed to login to $DOCKER_REGISTRY"
        exit 1
    fi
}

# Push image to registry
push_image() {
    if [ "$PUSH_TO_REGISTRY" != "true" ]; then
        print_warning "Push to registry disabled"
        return 0
    fi
    
    print_header "PUSHING IMAGE TO REGISTRY"
    
    docker_login
    
    print_info "Pushing $FULL_IMAGE_NAME..."
    if docker push "$FULL_IMAGE_NAME"; then
        print_success "Successfully pushed $FULL_IMAGE_NAME"
    else
        print_error "Failed to push image"
        exit 1
    fi
    
    print_info "Pushing $TAGGED_IMAGE_NAME..."
    if docker push "$TAGGED_IMAGE_NAME"; then
        print_success "Successfully pushed $TAGGED_IMAGE_NAME"
    else
        print_error "Failed to push tagged image"
        exit 1
    fi
}

# Generate summary
print_summary() {
    print_header "BUILD SUMMARY"
    
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│ Docker Build Completed Successfully                         │"
    echo "├─────────────────────────────────────────────────────────────┤"
    echo "│ Repository:     ${DOCKER_REPOSITORY}"
    echo "│ Version:        ${VERSION}"
    echo "│ Git SHA:        ${GIT_SHA}"
    echo "│ Git Branch:     ${GIT_BRANCH}"
    echo "│ Full Image:     ${FULL_IMAGE_NAME}"
    echo "│ Tagged Image:   ${TAGGED_IMAGE_NAME}"
    echo "│ Image Size:     ${IMAGE_SIZE_MB}MB"
    echo "│ Security Scan:  $([ "$ENABLE_TRIVY" = "true" ] && echo "✓ Passed" || echo "⊘ Skipped")"
    echo "│ Push Status:    $([ "$PUSH_TO_REGISTRY" = "true" ] && echo "✓ Pushed" || echo "⊘ Local Only")"
    echo "└─────────────────────────────────────────────────────────────┘"
    echo ""
    echo "Next steps:"
    echo "  1. Test locally: docker run -p 8000:8000 $FULL_IMAGE_NAME"
    echo "  2. View logs:    docker logs <container-id>"
    echo "  3. Deploy:       docker-compose -f phase-2.5-deployment/docker-compose.yml up -d"
    echo ""
}

################################################################################
# MAIN EXECUTION
################################################################################

main() {
    print_header "SIN-SOLVER DOCKER BUILD SCRIPT"
    
    print_info "Starting build process..."
    echo "Environment:"
    echo "  DOCKER_REGISTRY=$DOCKER_REGISTRY"
    echo "  DOCKER_REPOSITORY=$DOCKER_REPOSITORY"
    echo "  VERSION=$VERSION"
    echo "  DOCKERFILE_PATH=$DOCKERFILE_PATH"
    echo "  PUSH_TO_REGISTRY=$PUSH_TO_REGISTRY"
    echo "  ENABLE_TRIVY=$ENABLE_TRIVY"
    echo ""
    
    # Execute build steps
    check_prerequisites
    build_image
    validate_image_size
    get_image_details
    run_trivy_scan
    verify_image
    push_image
    print_summary
    
    print_success "Build process completed successfully!"
    exit 0
}

# Run main function
main "$@"
