# Optimiert für Apple Silicon (M1/M2/M3)
FROM python:3.11-slim

LABEL maintainer="SIN-Solver Empire"
LABEL version="1.0.0"
LABEL description="Zimmer-20.5 SIN-Video-Gen-MCP - Elite Video Generator (100% FREE)"

# System-Abhängigkeiten für Video/Audio Processing
# Using edge-tts (Microsoft Edge TTS) - no espeak needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python Dependencies
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application Code
COPY src/ ./src/

# Create directories for video processing
RUN mkdir -p /app/temp /app/output /app/assets

ENV PYTHONUNBUFFERED=1
ENV RUN_MODE=http
ENV HTTP_PORT=8205

EXPOSE 8205

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8205/health || exit 1

CMD ["python", "-m", "src.mcp_server"]
