FROM --platform=linux/arm64 python:3.11-slim

LABEL maintainer="SIN-Solver Empire"
LABEL version="1.0.0"
LABEL description="Zimmer-20.4 SIN-Deep-Research-MCP - Web Search & Content Extraction"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

ENV PYTHONUNBUFFERED=1
ENV RUN_MODE=http
ENV HTTP_PORT=8204

EXPOSE 8204

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8204/health || exit 1

CMD ["python", "-m", "src.mcp_server"]
