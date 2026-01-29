import 'dotenv/config';
import { BrowserCaptchaWorker } from './browser-captcha-worker';
import pino from 'pino';

const logger = pino();

const config = {
  provider: (process.env.PROVIDER || '2captcha') as '2captcha' | 'kolotibablo' | 'captcha-guru' | 'anti-captcha',
  username: process.env.USERNAME || '',
  password: process.env.PASSWORD || '',
  headless: process.env.HEADLESS !== 'false',
  steelBrowserUrl: process.env.STEEL_BROWSER_URL || 'http://localhost:3000'
};

if (!config.username || !config.password) {
  logger.error('❌ Missing USERNAME or PASSWORD environment variables');
  logger.error('Set them in .env file or environment:');
  logger.error('  USERNAME=your_worker_username');
  logger.error('  PASSWORD=your_worker_password');
  process.exit(1);
}

logger.info({
  provider: config.provider,
  username: config.username,
  headless: config.headless
}, '🌐 STARTING BROWSER CAPTCHA WORKER');

const worker = new BrowserCaptchaWorker(config);

const startWorker = async () => {
  try {
    await worker.start();
  } catch (error) {
    logger.error(error, '❌ Worker crashed');
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('📋 SIGTERM received, shutting down gracefully...');
  await worker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('📋 SIGINT received, shutting down gracefully...');
  await worker.stop();
  process.exit(0);
});

startWorker();

