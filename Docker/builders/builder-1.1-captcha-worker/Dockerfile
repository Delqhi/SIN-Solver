# Multi-stage Dockerfile for builder-1.1-captcha-worker
# Production-ready CAPTCHA solver with YOLO + OCR + Multi-AI consensus

# Stage 1: Dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system dependencies for building
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    wget \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    curl \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY src/ ./src/

# Copy unified captcha solver
COPY app/tools/captcha_solver.py ./app/tools/

# Copy model files
COPY models/ ./models/

# Create directories
RUN mkdir -p /app/logs /app/temp /app/models

# Set environment variables
ENV YOLO_MODEL_PATH=/app/models/best.pt
ENV OCR_MODELS_PATH=/app/models/ocr_models
ENV WHISPER_MODEL_PATH=/app/models/ocr_models/audio_whisper_model
ENV PYTHONPATH=/app:$PYTHONPATH

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8019/health || exit 1

# Expose port
EXPOSE 8019

# Start command
CMD ["python", "-m", "src.main"]
