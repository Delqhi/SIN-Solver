# Optimiert für Apple Silicon (M1/M2/M3)
FROM --platform=linux/arm64 python:3.11-slim

LABEL maintainer="SIN-Solver Empire"
LABEL version="1.0.0"
LABEL description="Zimmer-20.3 SIN-Social-MCP - Video Analysis & Social Media Integration"

# System-Abhängigkeiten
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Python Dependencies
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application Code
COPY src/ ./src/

ENV PYTHONUNBUFFERED=1
ENV RUN_MODE=http
ENV HTTP_PORT=8203

EXPOSE 8203

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8203/health || exit 1

CMD ["python", "-m", "src.mcp_server"]
