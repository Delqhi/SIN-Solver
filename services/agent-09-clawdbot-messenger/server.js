require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');
const pino = require('pino');

const { MessengerFactory } = require('./src/providers/index');
const TelegramMessenger = require('./src/providers/telegram');
const WhatsAppMessenger = require('./src/providers/whatsapp');
const DiscordMessenger = require('./src/providers/discord');
const { SurveyEventSubscriber } = require('./src/events/survey-events');
const N8NWebhookHandler = require('./src/webhooks/n8n');
const OAuthHandler = require('./src/webhooks/oauth');
const { router: socialRouter, initializeSocialPlatforms } = require('./src/social/routes');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://ceo_admin:secure_ceo_password_2026@zimmer-archiv-postgres:5432/sin_solver_production'
});

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const messengerFactory = MessengerFactory.getInstance();
const surveyEventSubscriber = new SurveyEventSubscriber();
const n8nWebhookHandler = new N8NWebhookHandler();
const oauthHandler = new OAuthHandler({ pool });

const sentNotifications = [];

async function initializeMessengers() {
  const telegram = new TelegramMessenger({ pool });
  messengerFactory.register('telegram', telegram);
  
  if (process.env.WHATSAPP_ENABLED === 'true' || process.env.WHATSAPP_CEO_NUMBERS) {
    const whatsapp = new WhatsAppMessenger();
    messengerFactory.register('whatsapp', whatsapp);
  }
  
  if (process.env.DISCORD_BOT_TOKEN) {
    const discord = new DiscordMessenger();
    messengerFactory.register('discord', discord);
  }
  
  await messengerFactory.initializeAll();
  
  surveyEventSubscriber.setMessengerFactory(messengerFactory);
  n8nWebhookHandler.setMessengerFactory(messengerFactory);
  n8nWebhookHandler.setPool(pool);
  
  try {
    await surveyEventSubscriber.initialize();
  } catch (error) {
    logger.warn({ error: error.message }, 'Redis subscriber failed to initialize (non-fatal)');
  }
}

app.use(n8nWebhookHandler.getRouter());
app.use(oauthHandler.getRouter());
app.use(socialRouter);

app.get('/health', async (req, res) => {
  const status = messengerFactory.getStatus();
  
  res.json({
    status: 'healthy',
    service: 'sin-solver-clawdbot',
    version: '3.0.0',
    messengers: status.providers,
    redis: surveyEventSubscriber.getStatus().connected,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    messengers: messengerFactory.getStatus(),
    events: surveyEventSubscriber.getStatus(),
    notifications: sentNotifications.length
  });
});

app.get('/api/messengers', (req, res) => {
  res.json(messengerFactory.getStatus());
});

app.get('/api/messengers/:name', (req, res) => {
  const provider = messengerFactory.get(req.params.name);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  res.json(provider.getStatus ? provider.getStatus() : { connected: provider.isConnected() });
});

app.get('/api/whatsapp/qr', (req, res) => {
  const whatsapp = messengerFactory.get('whatsapp');
  if (!whatsapp) {
    return res.status(404).json({ error: 'WhatsApp not configured' });
  }
  
  const qr = whatsapp.getQRCode();
  const status = whatsapp.getConnectionState();
  
  res.json({
    status,
    hasQR: !!qr,
    qr: qr || null
  });
});

app.post('/api/whatsapp/logout', async (req, res) => {
  const whatsapp = messengerFactory.get('whatsapp');
  if (!whatsapp) {
    return res.status(404).json({ error: 'WhatsApp not configured' });
  }
  
  try {
    await whatsapp.logout();
    res.json({ success: true, message: 'WhatsApp logged out' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notify', async (req, res) => {
  const { message, type = 'info', providers = ['all'] } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  
  const results = await messengerFactory.broadcast(message, type, providers);
  
  const notification = {
    id: Date.now().toString(36),
    message, type, providers,
    timestamp: new Date().toISOString()
  };
  sentNotifications.push(notification);
  if (sentNotifications.length > 100) sentNotifications.shift();
  
  res.json({ success: true, results });
});

app.post('/api/alert', async (req, res) => {
  const { message, severity = 'warning' } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  
  const results = await messengerFactory.broadcast(
    `🚨 ALERT\n${message}`, 
    severity === 'critical' ? 'error' : 'warning'
  );
  
  res.json({ success: true, results });
});

app.get('/api/notifications', (req, res) => {
  res.json({ notifications: sentNotifications.slice(-50).reverse() });
});

app.get('/api/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const channel = req.query.channel || null;
  
  res.json({
    events: surveyEventSubscriber.getEventHistory(limit, channel)
  });
});

app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    messages: messengerFactory.getHistory(limit)
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    telegram: {
      enabled: !!process.env.TELEGRAM_BOT_TOKEN,
      configured: !!process.env.TELEGRAM_BOT_TOKEN
    },
    whatsapp: {
      enabled: process.env.WHATSAPP_ENABLED === 'true' || !!process.env.WHATSAPP_CEO_NUMBERS,
      configured: !!messengerFactory.get('whatsapp'),
      needsQR: messengerFactory.get('whatsapp')?.getConnectionState() === 'awaiting_scan'
    },
    discord: {
      enabled: !!process.env.DISCORD_BOT_TOKEN,
      configured: !!process.env.DISCORD_BOT_TOKEN
    },
    redis: {
      enabled: !!process.env.REDIS_URL,
      connected: surveyEventSubscriber.getStatus().connected
    }
  });
});

app.post('/api/config/test/:provider', async (req, res) => {
  const { provider } = req.params;
  const messenger = messengerFactory.get(provider);
  
  if (!messenger) {
    return res.status(404).json({ error: `Provider ${provider} not found` });
  }
  
  try {
    const testMessage = `🧪 Test Nachricht vom Dashboard\n⏰ ${new Date().toLocaleString('de-DE')}`;
    await messenger.broadcast(testMessage, 'info');
    res.json({ success: true, message: 'Test message sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;

async function start() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected');
    
    await initializeMessengers();
    initializeSocialPlatforms();
    logger.info('Social media platforms initialized');
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT }, 'SIN-Solver Clawdbot v3.0 started');
      logger.info('Multi-Messenger: Telegram + WhatsApp + Discord');
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Startup failed');
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await messengerFactory.shutdown();
  await surveyEventSubscriber.shutdown();
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await messengerFactory.shutdown();
  await surveyEventSubscriber.shutdown();
  await pool.end();
  process.exit(0);
});

start();
