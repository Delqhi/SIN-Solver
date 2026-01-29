FROM node:20-slim

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENTRYPOINT ["node", "build/index.js"]
