import 'dotenv/config';
import express from 'express';
import { WorkerRuntime } from './worker-runtime';
import { WorkerConfig, WorkerType } from './types';

const app = express();
app.use(express.json());

const config: WorkerConfig = {
  name: process.env.WORKER_NAME || `worker-${Date.now()}`,
  type: (process.env.WORKER_TYPE || 'general') as WorkerType,
  capabilities: (process.env.WORKER_CAPABILITIES || '').split(',').filter(Boolean),
  apiBrainUrl: process.env.API_COORDINATOR_URL || process.env.API_BRAIN_URL || 'http://room-13-api-coordinator:8000',
  stagehandUrl: process.env.STAGEHAND_URL || 'http://stagehand:3000',
  heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30000', 10),
};

const worker = new WorkerRuntime(config);

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    worker: config.name,
    type: config.type,
    uptime: process.uptime(),
  });
});

app.get('/status', (req, res) => {
  res.json({
    name: config.name,
    type: config.type,
    capabilities: config.capabilities,
    apiBrainUrl: config.apiBrainUrl,
  });
});

const PORT = process.env.PORT || 8080;

const start = async () => {
  try {
    await worker.start();
    
    app.listen(PORT, () => {
      console.log(`Worker health server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start worker:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down...');
  await worker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down...');
  await worker.stop();
  process.exit(0);
});

start();
