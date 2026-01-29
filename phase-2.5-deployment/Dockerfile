# Multi-stage Dockerfile for SIN-Solver CAPTCHA Worker
# Phase 2.5 Deployment - Production-Ready Container
# Build: ~5 minutes | Size: ~350MB | Startup: <30s

# ============================================================================
# STAGE 1: BUILDER - Compile dependencies with all build tools
# ============================================================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    curl \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements early for better caching
COPY services/solver-14-captcha-worker/requirements.txt .

# Create virtual environment and install dependencies
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ============================================================================
# STAGE 2: RUNTIME - Minimal production image
# ============================================================================
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies only (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 appuser

# Copy virtual environment from builder
COPY --from=builder --chown=appuser:appuser /opt/venv /opt/venv

# Copy application code
COPY --chown=appuser:appuser services/solver-14-captcha-worker/src /app/src

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/models /app/temp && \
    chown -R appuser:appuser /app

# Set environment
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Switch to non-root user
USER appuser

# Health check (runs every 30s, waits 40s before marking unhealthy)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE ${PORT}

# Graceful shutdown handling
STOPSIGNAL SIGTERM

# Start application
CMD ["python", "-m", "src.main"]
