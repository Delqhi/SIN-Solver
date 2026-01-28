import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc/router.js';
import { createContext } from './trpc/context.js';
import { config } from './config.js';
import { closePool } from './db/client.js';

const app = express();
const server = createServer(app);

app.use(helmet());
app.use(cors({ origin: config.corsOrigins }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  console.log('WebSocket connected from:', req.socket.remoteAddress);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('WebSocket message:', message);
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket disconnected');
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`🚀 Delqhi API running on port ${PORT}`);
  console.log(`   tRPC endpoint: http://localhost:${PORT}/trpc`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await closePool();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await closePool();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server, wss };
