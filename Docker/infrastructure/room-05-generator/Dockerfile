FROM node:18-alpine

RUN apk add --no-cache ffmpeg curl wget ca-certificates

WORKDIR /app

COPY package.json .
COPY server.js .

RUN npm install

EXPOSE 8205

CMD ["node", "server.js"]