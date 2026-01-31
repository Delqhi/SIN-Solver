# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --no-optional

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Runtime stage
FROM node:20-alpine

# Set metadata
LABEL maintainer="SIN-Solver Team"
LABEL description="2Captcha Worker - Steel Browser automation for CAPTCHA solving"
LABEL version="1.0.0"

# Install runtime dependencies
RUN apk add --no-cache \
    libstdc++ \
    libgcc \
    ca-certificates \
    curl \
    dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/package*.json ./

# Copy environment template
COPY --chown=appuser:nodejs .env.example ./

# Create necessary directories
RUN mkdir -p logs screenshots metrics && \
    chown -R appuser:nodejs logs screenshots metrics

# Switch to appuser
USER appuser

# Expose port
EXPOSE 8019

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8019/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
