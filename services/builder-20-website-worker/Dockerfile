FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget curl

COPY package*.json ./
RUN npm install --production

COPY . .

ENV NODE_ENV=production
ENV PORT=8020

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:8020/health || exit 1

EXPOSE 8020

CMD ["node", "server.js"]
