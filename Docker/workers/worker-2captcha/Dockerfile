FROM node:18-alpine

WORKDIR /app

# Install curl for health checks and build dependencies
RUN apk add --no-cache curl dumb-init

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY config/ ./config/ 2>/dev/null || true
COPY .env.example ./.env.example 2>/dev/null || true

# Create logs and screenshots directories
RUN mkdir -p ./logs ./screenshots ./temp

# Expose service port
EXPOSE 8020

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8020/health || exit 1

# Use dumb-init to properly handle signals
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]

# Start service
CMD ["node", "src/index.js"]
