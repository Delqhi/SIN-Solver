FROM node:18-alpine

WORKDIR /app

# Install curl for health checks and build dependencies
RUN apk add --no-cache curl dumb-init

# Copy worker package files (not root package.json which builds dashboard)
COPY workers/2captcha-worker/package*.json ./

# Install ALL dependencies (including dev for TypeScript compilation at build time)
# TypeScript compiler (tsc) is in devDependencies but needed at build time
RUN npm ci && \
    npm cache clean --force

# Copy source code and TypeScript config (from workers/2captcha-worker/)
COPY workers/2captcha-worker/src/ ./src/
COPY workers/2captcha-worker/tsconfig.json ./
COPY workers/2captcha-worker/.env.example ./.env.example

# Build TypeScript to JavaScript (tsc compiles src/ to dist/)
# tsc is from devDependencies - we need it for build but can remove after
RUN npm run build && \
    npm ci --only=production && \
    npm cache clean --force

# Create logs and screenshots directories
RUN mkdir -p ./logs ./screenshots ./temp

# Expose service port
EXPOSE 8020

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8020/health || exit 1

# Use dumb-init to properly handle signals
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]

# Start service (now runs compiled JavaScript from dist/)
CMD ["node", "dist/index.js"]
