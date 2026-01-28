# Zimmer-19 Captcha Worker - FREE Self-Hosted CAPTCHA Solving
# Base: Python 3.11 with ARM64 support for Mac M1
FROM python:3.11-slim-bookworm

# Labels
LABEL maintainer="SIN-Solver Team"
LABEL description="100% FREE self-hosted captcha solving with ddddocr + Whisper + YOLO"
LABEL version="1.0.0"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Audio processing for Whisper
    ffmpeg \
    # Image processing
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    # OCR dependencies
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-chi-sim \
    tesseract-ocr-chi-tra \
    # Build tools
    gcc \
    g++ \
    # Utilities
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download Whisper models (base is a good balance of speed/accuracy)
RUN python -c "import whisper; whisper.load_model('base')"

# Pre-initialize ddddocr (downloads model on first use)
RUN python -c "import ddddocr; ddddocr.DdddOcr()"

# Copy application code
COPY src/ ./src/

# Create model cache directories
RUN mkdir -p /app/models/whisper /app/models/yolo /app/models/ddddocr

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=8019
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q --spider http://localhost:8019/health || exit 1

# Expose port
EXPOSE 8019

# Run the application
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8019"]
