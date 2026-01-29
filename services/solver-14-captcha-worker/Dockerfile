# Playwright base image includes Node.js and all browser dependencies
FROM mcr.microsoft.com/playwright:v1.48.0-jammy AS builder

WORKDIR /app

# Install additional dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm install --frozen-lockfile && npm cache clean --force

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Runtime stage - use same base to avoid large layers
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

# Create non-root user
RUN useradd -m -u 1001 appuser

WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Set permissions
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
