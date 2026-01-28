require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');
const Redis = require('ioredis');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://ceo_admin:secure_ceo_password_2026@zimmer-archiv-postgres:5432/sin_solver_production'
});

const redis = new Redis(process.env.REDIS_URL || 'redis://zimmer-speicher-redis:6379');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const STEEL_CDP_URL = process.env.STEEL_CDP_URL || 'ws://zimmer-05-steel-tarnkappe:3000';
const CAPTCHA_WORKER_URL = process.env.CAPTCHA_WORKER_URL || 'http://zimmer-19-captcha-worker:8019';
const CLAWDBOT_URL = process.env.CLAWDBOT_URL || 'http://zimmer-09-clawdbot:8080';

const activeTasks = new Map();
const taskQueue = [];
let isProcessing = false;

const PLATFORMS = {
  swagbucks: {
    name: 'Swagbucks',
    loginUrl: 'https://www.swagbucks.com/p/login',
    dashboardUrl: 'https://www.swagbucks.com/surveys',
    selectors: {
      email: '#sbxJx498499949',
      password: '#sbxJxInputField',
      submit: 'button[type="submit"]',
      surveys: '.surveyItem'
    }
  },
  prolific: {
    name: 'Prolific',
    loginUrl: 'https://app.prolific.co/login',
    dashboardUrl: 'https://app.prolific.co/studies',
    selectors: {
      email: 'input[name="email"]',
      password: 'input[name="password"]',
      submit: 'button[type="submit"]',
      studies: '.study-card'
    }
  },
  toluna: {
    name: 'Toluna',
    loginUrl: 'https://de.toluna.com/signin',
    dashboardUrl: 'https://de.toluna.com/surveys',
    selectors: {
      email: '#Email',
      password: '#Password',
      submit: 'button[type="submit"]',
      surveys: '.survey-card'
    }
  },
  clickworker: {
    name: 'Clickworker',
    loginUrl: 'https://workplace.clickworker.com/en/login',
    dashboardUrl: 'https://workplace.clickworker.com/en/jobs',
    selectors: {
      email: '#username',
      password: '#password',
      submit: 'button[type="submit"]',
      jobs: '.job-item'
    }
  }
};

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'sin-solver-website-worker',
    version: '1.0.0',
    activeTasks: activeTasks.size,
    queueLength: taskQueue.length,
    platforms: Object.keys(PLATFORMS).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/platforms', (req, res) => {
  res.json({
    platforms: Object.entries(PLATFORMS).map(([id, p]) => ({
      id,
      name: p.name,
      status: 'available'
    }))
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    isProcessing,
    activeTasks: Array.from(activeTasks.entries()).map(([id, task]) => ({
      id,
      platform: task.platform,
      status: task.status,
      startedAt: task.startedAt
    })),
    queueLength: taskQueue.length
  });
});

app.post('/api/tasks/create', async (req, res) => {
  const { platform, action, credentials } = req.body;
  
  if (!platform || !PLATFORMS[platform]) {
    return res.status(400).json({ error: 'Invalid platform' });
  }
  
  const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const task = {
    id: taskId,
    platform,
    action: action || 'check_surveys',
    credentials: credentials || null,
    status: 'queued',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    result: null,
    error: null
  };
  
  taskQueue.push(task);
  activeTasks.set(taskId, task);
  
  await redis.publish('website-worker:task:created', JSON.stringify({ taskId, platform }));
  
  processQueue();
  
  res.json({ success: true, taskId, position: taskQueue.length });
});

app.get('/api/tasks/:taskId', (req, res) => {
  const task = activeTasks.get(req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

app.post('/api/tasks/:taskId/cancel', (req, res) => {
  const task = activeTasks.get(req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  task.status = 'cancelled';
  task.completedAt = new Date().toISOString();
  
  const queueIndex = taskQueue.findIndex(t => t.id === task.id);
  if (queueIndex >= 0) {
    taskQueue.splice(queueIndex, 1);
  }
  
  res.json({ success: true });
});

app.post('/api/scrape', async (req, res) => {
  const { url, selectors, waitFor } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }
  
  try {
    const result = await scrapeUrl(url, selectors, waitFor);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error: error.message, url }, 'Scrape failed');
    res.status(500).json({ error: error.message });
  }
});

async function scrapeUrl(url, selectors = {}, waitFor = 5000) {
  const puppeteer = require('puppeteer-core');
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: STEEL_CDP_URL
  });
  
  try {
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(waitFor);
    
    const result = {};
    
    for (const [key, selector] of Object.entries(selectors)) {
      try {
        const elements = await page.$$(selector);
        result[key] = await Promise.all(elements.map(async el => {
          return {
            text: await el.evaluate(e => e.textContent?.trim()),
            href: await el.evaluate(e => e.href || null)
          };
        }));
      } catch (e) {
        result[key] = [];
      }
    }
    
    result.title = await page.title();
    result.url = page.url();
    result.screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 50 });
    
    await page.close();
    return result;
  } finally {
    await browser.disconnect();
  }
}

async function processQueue() {
  if (isProcessing || taskQueue.length === 0) return;
  
  isProcessing = true;
  
  while (taskQueue.length > 0) {
    const task = taskQueue.shift();
    
    if (task.status === 'cancelled') continue;
    
    task.status = 'processing';
    task.startedAt = new Date().toISOString();
    
    try {
      await processTask(task);
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      
      await notifyCompletion(task);
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date().toISOString();
      
      logger.error({ taskId: task.id, error: error.message }, 'Task failed');
      await notifyFailure(task);
    }
    
    setTimeout(() => {
      activeTasks.delete(task.id);
    }, 3600000);
  }
  
  isProcessing = false;
}

async function processTask(task) {
  const platform = PLATFORMS[task.platform];
  
  switch (task.action) {
    case 'check_surveys':
      task.result = await checkSurveys(task.platform, platform);
      break;
    case 'login':
      task.result = await loginToPlatform(task.platform, platform, task.credentials);
      break;
    case 'scrape_dashboard':
      task.result = await scrapeDashboard(task.platform, platform);
      break;
    default:
      throw new Error(`Unknown action: ${task.action}`);
  }
}

async function checkSurveys(platformId, platform) {
  const result = await scrapeUrl(platform.dashboardUrl, {
    surveys: platform.selectors.surveys || platform.selectors.studies || platform.selectors.jobs
  });
  
  return {
    platform: platformId,
    surveyCount: result.surveys?.length || 0,
    surveys: result.surveys?.slice(0, 10) || [],
    timestamp: new Date().toISOString()
  };
}

async function loginToPlatform(platformId, platform, credentials) {
  if (!credentials?.email || !credentials?.password) {
    throw new Error('Credentials required');
  }
  
  const puppeteer = require('puppeteer-core');
  const browser = await puppeteer.connect({ browserWSEndpoint: STEEL_CDP_URL });
  
  try {
    const page = await browser.newPage();
    await page.goto(platform.loginUrl, { waitUntil: 'networkidle2' });
    
    await page.type(platform.selectors.email, credentials.email, { delay: 50 });
    await page.type(platform.selectors.password, credentials.password, { delay: 50 });
    
    await Promise.all([
      page.click(platform.selectors.submit),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
    ]);
    
    const cookies = await page.cookies();
    
    await page.close();
    
    return {
      success: true,
      platform: platformId,
      cookieCount: cookies.length,
      timestamp: new Date().toISOString()
    };
  } finally {
    await browser.disconnect();
  }
}

async function scrapeDashboard(platformId, platform) {
  return await scrapeUrl(platform.dashboardUrl, {
    items: platform.selectors.surveys || platform.selectors.studies || platform.selectors.jobs
  });
}

async function notifyCompletion(task) {
  try {
    await fetch(`${CLAWDBOT_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Task completed: ${task.platform} - ${task.action}\nResult: ${JSON.stringify(task.result?.surveyCount || 'OK')}`,
        type: 'success'
      })
    });
  } catch (e) {
    logger.warn({ error: e.message }, 'Failed to notify completion');
  }
}

async function notifyFailure(task) {
  try {
    await fetch(`${CLAWDBOT_URL}/api/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Task failed: ${task.platform} - ${task.action}\nError: ${task.error}`,
        severity: 'warning'
      })
    });
  } catch (e) {
    logger.warn({ error: e.message }, 'Failed to notify failure');
  }
}

const PORT = process.env.PORT || 8020;

async function start() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected');
    
    await redis.ping();
    logger.info('Redis connected');
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT }, 'SIN-Solver Website Worker v1.0 started');
      logger.info(`Platforms: ${Object.keys(PLATFORMS).join(', ')}`);
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Startup failed');
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await redis.quit();
  await pool.end();
  process.exit(0);
});

start();
