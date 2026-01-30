# Captcha Worker - Production Dockerfile
# Multi-stage build for optimal image size and security

# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install dependencies for builder stage
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim

LABEL maintainer="SIN-Solver Team"
LABEL description="Production-ready Captcha Worker with monitoring and human behavior simulation"
LABEL version="1.0.0"

# Set environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    WORKER_TYPE="captcha" \
    MONITOR_PORT=8080 \
    STATS_DIR="/app/stats" \
    LOG_LEVEL="INFO"

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy wheels from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY monitor.py .
COPY session_manager.py .
COPY human_behavior.py .
COPY captcha_worker_integrated.py .
COPY consensus_solver.py .
COPY example_usage.py .
COPY README.md .
COPY QUICKSTART.md .
COPY INTEGRATION_GUIDE.md .
COPY SESSION_MANAGER_README.md .
COPY HUMAN_BEHAVIOR_GUIDE.md .

# Create stats directory with proper permissions
RUN mkdir -p /app/stats && \
    chmod 755 /app/stats && \
    chown -R nobody:nogroup /app

# Set PATH to include user packages
ENV PATH=/root/.local/bin:$PATH

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${MONITOR_PORT}/health || exit 1

# Create non-root user for security
RUN useradd -m -u 1000 worker && \
    chown -R worker:worker /app

USER worker

# Copy entrypoint script
COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

# Expose ports
EXPOSE 8080 8081 8082

# Use entrypoint script for clean startup
ENTRYPOINT ["/app/entrypoint.sh"]
