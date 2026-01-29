FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

WORKDIR /app

# Clone firecrawl monorepo
RUN git clone --depth 1 https://github.com/mendableai/firecrawl.git .

# Install pnpm (firecrawl uses pnpm)
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

WORKDIR /app/apps/api

EXPOSE 3002

ENV PORT=3002

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://127.0.0.1:3002/ || exit 1

CMD ["pnpm", "start"]
