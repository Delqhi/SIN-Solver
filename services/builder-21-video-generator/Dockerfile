FROM node:20-alpine

# Install FFmpeg and Python for edge-tts
RUN apk add --no-cache ffmpeg python3 py3-pip

# Install edge-tts CLI globally
RUN pip3 install edge-tts --break-system-packages

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create directories for media
RUN mkdir -p /app/media/audio /app/media/video /app/media/output

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8021/health || exit 1

# Expose port
EXPOSE 8021

# Start service
CMD ["npm", "start"]
