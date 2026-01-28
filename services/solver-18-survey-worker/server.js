const express = require('express');
const { SurveyOrchestrator } = require('./src/orchestrator');
const { PlatformManager } = require('./src/platform-manager');
const { CookieManager } = require('./src/cookie-manager');
const { ProxyRotator } = require('./src/proxy-rotator');
const { AIAssistant } = require('./src/ai-assistant');
const winston = require('winston');

const app = express();
app.use(express.json());

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const orchestrator = new SurveyOrchestrator();
const platformManager = new PlatformManager();
const cookieManager = new CookieManager();
const proxyRotator = new ProxyRotator();
const aiAssistant = new AIAssistant();

app.get('/health', (req, res) => {
  res.json({
    status: 'active',
    service: 'sin-survey-worker',
    zimmer: 18,
    mode: 'one_worker_per_platform',
    paid_services: false,
    ai_providers: ['gemini', 'mistral', 'huggingface_free', 'azure_free'],
    uptime: process.uptime()
  });
});

app.get('/platforms', async (req, res) => {
  const platforms = await platformManager.getAllPlatforms();
  res.json(platforms);
});

app.get('/platforms/:id/status', async (req, res) => {
  const status = await platformManager.getPlatformStatus(req.params.id);
  res.json(status);
});

app.post('/platforms/:id/start', async (req, res) => {
  const result = await orchestrator.startPlatformWorker(req.params.id, req.body);
  res.json(result);
});

app.post('/platforms/:id/stop', async (req, res) => {
  const result = await orchestrator.stopPlatformWorker(req.params.id);
  res.json(result);
});

app.post('/platforms/:id/config', async (req, res) => {
  const result = await platformManager.updateConfig(req.params.id, req.body);
  res.json(result);
});

app.get('/cookies/:platformId', async (req, res) => {
  const cookies = await cookieManager.getCookies(req.params.platformId);
  res.json({ count: cookies.length, valid: cookies.length > 0 });
});

app.post('/cookies/:platformId/import', async (req, res) => {
  const result = await cookieManager.importCookies(req.params.platformId, req.body.cookies);
  res.json(result);
});

app.get('/proxies', async (req, res) => {
  const proxies = await proxyRotator.getProxyStatus();
  res.json(proxies);
});

app.post('/proxies', async (req, res) => {
  const result = await proxyRotator.addProxy(req.body);
  res.json(result);
});

app.post('/chat', async (req, res) => {
  const response = await aiAssistant.chat(req.body.message, req.body.context);
  res.json(response);
});

app.get('/stats', async (req, res) => {
  const stats = await orchestrator.getGlobalStats();
  res.json(stats);
});

app.get('/earnings', async (req, res) => {
  const earnings = await orchestrator.getEarnings(req.query.period || '24h');
  res.json(earnings);
});

const PORT = process.env.PORT || 8018;
app.listen(PORT, () => {
  logger.info(`🎯 Zimmer-18: SIN-Survey-Worker running on port ${PORT}`);
  logger.info('📋 Mode: One worker per platform (ban prevention)');
  logger.info('🔐 Cookie persistence enabled');
  logger.info('🌐 Proxy rotation enabled');
  logger.info('🤖 AI: Gemini, Mistral, HuggingFace FREE, Azure FREE');
});
