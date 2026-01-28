FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
RUN npm install -D typescript @types/node
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev
EXPOSE 8213
CMD ["node", "dist/index.js"]
