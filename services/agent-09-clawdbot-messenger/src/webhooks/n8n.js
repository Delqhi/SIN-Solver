const express = require('express');
const crypto = require('crypto');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
});

class N8NWebhookHandler {
  constructor(config = {}) {
    this.secret = config.secret || process.env.N8N_WEBHOOK_SECRET || 'sin-solver-n8n-secret-2026';
    this.messengerFactory = config.messengerFactory || null;
    this.pool = config.pool || null;
    
    this.router = express.Router();
    this.webhookHistory = [];
    this.maxHistorySize = 200;
    
    this.setupRoutes();
  }
  
  setMessengerFactory(factory) {
    this.messengerFactory = factory;
  }
  
  setPool(pool) {
    this.pool = pool;
  }
  
  setupRoutes() {
    this.router.post('/api/v1/webhook/n8n', this.verifySignature.bind(this), this.handleWebhook.bind(this));
    this.router.post('/api/v1/webhook/n8n/:action', this.verifySignature.bind(this), this.handleActionWebhook.bind(this));
    this.router.get('/api/v1/webhook/n8n/status', this.getWebhookStatus.bind(this));
    this.router.get('/api/v1/webhook/n8n/history', this.getWebhookHistory.bind(this));
    
    this.router.post('/api/v1/webhook/survey', this.handleSurveyWebhook.bind(this));
    this.router.post('/api/v1/webhook/task', this.handleTaskWebhook.bind(this));
    this.router.post('/api/v1/webhook/alert', this.handleAlertWebhook.bind(this));
  }
  
  verifySignature(req, res, next) {
    const signature = req.headers['x-n8n-signature'] || req.headers['x-webhook-signature'];
    
    if (!signature && process.env.NODE_ENV === 'production') {
      logger.warn('Missing webhook signature');
      return res.status(401).json({ error: 'Missing signature' });
    }
    
    if (signature) {
      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(payload)
        .digest('hex');
      
      if (signature !== `sha256=${expectedSignature}` && signature !== expectedSignature) {
        logger.warn('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }
    
    next();
  }
  
  async handleWebhook(req, res) {
    try {
      const { action, payload, source } = req.body;
      
      if (!action) {
        return res.status(400).json({ error: 'Action required' });
      }
      
      this.recordWebhook({ action, payload, source, timestamp: new Date().toISOString() });
      
      logger.info({ action, source }, 'N8N webhook received');
      
      const result = await this.processAction(action, payload || {});
      
      res.json({ success: true, result });
    } catch (error) {
      logger.error({ error: error.message }, 'Webhook processing failed');
      res.status(500).json({ error: error.message });
    }
  }
  
  async handleActionWebhook(req, res) {
    try {
      const { action } = req.params;
      const payload = req.body;
      
      this.recordWebhook({ action, payload, source: 'n8n-action', timestamp: new Date().toISOString() });
      
      logger.info({ action }, 'N8N action webhook received');
      
      const result = await this.processAction(action, payload);
      
      res.json({ success: true, result });
    } catch (error) {
      logger.error({ error: error.message }, 'Action webhook failed');
      res.status(500).json({ error: error.message });
    }
  }
  
  async processAction(action, payload) {
    switch (action) {
      case 'notify':
        return this.actionNotify(payload);
        
      case 'broadcast':
        return this.actionBroadcast(payload);
        
      case 'survey_start':
        return this.actionSurveyStart(payload);
        
      case 'survey_stop':
        return this.actionSurveyStop(payload);
        
      case 'task_create':
        return this.actionTaskCreate(payload);
        
      case 'task_update':
        return this.actionTaskUpdate(payload);
        
      case 'worker_status':
        return this.actionWorkerStatus(payload);
        
      case 'system_check':
        return this.actionSystemCheck(payload);
        
      case 'daily_report':
        return this.actionDailyReport(payload);
        
      default:
        logger.warn({ action }, 'Unknown webhook action');
        return { warning: `Unknown action: ${action}` };
    }
  }
  
  async actionNotify(payload) {
    const { message, type = 'info', providers = ['all'] } = payload;
    
    if (!message) {
      throw new Error('Message required for notify action');
    }
    
    if (this.messengerFactory) {
      await this.messengerFactory.broadcast(message, type, providers);
    }
    
    return { notified: true };
  }
  
  async actionBroadcast(payload) {
    return this.actionNotify(payload);
  }
  
  async actionSurveyStart(payload) {
    const { platform, config = {} } = payload;
    
    try {
      const response = await fetch('http://zimmer-18-survey-worker:8018/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, ...config }),
        signal: AbortSignal.timeout(10000)
      });
      
      const data = await response.json();
      
      if (this.messengerFactory) {
        await this.messengerFactory.broadcast(
          `▶️ Survey Worker gestartet\n\nPlatform: ${platform || 'all'}`,
          'info'
        );
      }
      
      return data;
    } catch (error) {
      throw new Error(`Survey start failed: ${error.message}`);
    }
  }
  
  async actionSurveyStop(payload) {
    try {
      const response = await fetch('http://zimmer-18-survey-worker:8018/api/stop', {
        method: 'POST',
        signal: AbortSignal.timeout(10000)
      });
      
      const data = await response.json();
      
      if (this.messengerFactory) {
        await this.messengerFactory.broadcast('⏹️ Survey Worker gestoppt', 'info');
      }
      
      return data;
    } catch (error) {
      throw new Error(`Survey stop failed: ${error.message}`);
    }
  }
  
  async actionTaskCreate(payload) {
    const { type, priority = 5, description } = payload;
    
    if (!type) {
      throw new Error('Task type required');
    }
    
    if (this.pool) {
      const result = await this.pool.query(`
        INSERT INTO tasks (id, type, priority, payload, status, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 'pending', NOW())
        RETURNING id
      `, [type, priority, JSON.stringify({ description, ...payload })]);
      
      return { taskId: result.rows[0].id };
    }
    
    return { warning: 'Database not available' };
  }
  
  async actionTaskUpdate(payload) {
    const { taskId, status, result } = payload;
    
    if (!taskId || !status) {
      throw new Error('Task ID and status required');
    }
    
    if (this.pool) {
      await this.pool.query(`
        UPDATE tasks SET status = $1, result = $2, updated_at = NOW()
        WHERE id = $3
      `, [status, JSON.stringify(result || {}), taskId]);
      
      return { updated: true };
    }
    
    return { warning: 'Database not available' };
  }
  
  async actionWorkerStatus(payload) {
    try {
      const response = await fetch('http://zimmer-18-survey-worker:8018/api/status', {
        signal: AbortSignal.timeout(5000)
      });
      
      return await response.json();
    } catch (error) {
      return { error: error.message, status: 'unreachable' };
    }
  }
  
  async actionSystemCheck(payload) {
    const services = [
      { name: 'survey-worker', url: 'http://zimmer-18-survey-worker:8018/health' },
      { name: 'api-brain', url: 'http://zimmer-13-api-koordinator:8000/health' },
      { name: 'dashboard', url: 'http://zimmer-11-dashboard:3000/health' },
      { name: 'steel', url: 'http://zimmer-05-steel-tarnkappe:3000/health' },
    ];
    
    const results = {};
    
    for (const svc of services) {
      try {
        const res = await fetch(svc.url, { signal: AbortSignal.timeout(3000) });
        results[svc.name] = res.ok ? 'healthy' : 'degraded';
      } catch {
        results[svc.name] = 'down';
      }
    }
    
    return results;
  }
  
  async actionDailyReport(payload) {
    try {
      const status = await this.actionWorkerStatus({});
      const systemCheck = await this.actionSystemCheck({});
      
      const report = `📊 *Tagesbericht*\n\n` +
        `*Survey Worker:*\n` +
        `Completed: ${status.completedSurveys || 0}\n` +
        `Earnings: $${(status.totalEarnings || 0).toFixed(2)}\n\n` +
        `*System Status:*\n` +
        Object.entries(systemCheck).map(([k, v]) => `${v === 'healthy' ? '🟢' : '🔴'} ${k}`).join('\n');
      
      if (this.messengerFactory) {
        await this.messengerFactory.broadcast(report, 'info');
      }
      
      return { reported: true, status, systemCheck };
    } catch (error) {
      return { error: error.message };
    }
  }
  
  async handleSurveyWebhook(req, res) {
    try {
      const { event, data } = req.body;
      
      this.recordWebhook({ action: `survey.${event}`, payload: data, source: 'survey-worker', timestamp: new Date().toISOString() });
      
      if (this.messengerFactory && event && data) {
        let message = '';
        let type = 'info';
        
        if (event === 'completed') {
          message = `📊 Survey abgeschlossen!\n\nPlatform: ${data.platform}\nVerdienst: $${(data.earnings || 0).toFixed(2)}`;
          type = 'success';
        } else if (event === 'failed') {
          message = `❌ Survey fehlgeschlagen\n\nPlatform: ${data.platform}\nGrund: ${data.reason}`;
          type = 'error';
        }
        
        if (message) {
          await this.messengerFactory.broadcast(message, type);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async handleTaskWebhook(req, res) {
    try {
      const { event, taskId, data } = req.body;
      
      this.recordWebhook({ action: `task.${event}`, payload: { taskId, ...data }, source: 'task-system', timestamp: new Date().toISOString() });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async handleAlertWebhook(req, res) {
    try {
      const { message, severity = 'warning' } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message required' });
      }
      
      this.recordWebhook({ action: 'alert', payload: { message, severity }, source: 'system', timestamp: new Date().toISOString() });
      
      if (this.messengerFactory) {
        await this.messengerFactory.broadcast(`🚨 ALERT\n\n${message}`, severity === 'critical' ? 'error' : 'warning');
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  getWebhookStatus(req, res) {
    res.json({
      status: 'active',
      endpoints: [
        'POST /api/v1/webhook/n8n',
        'POST /api/v1/webhook/n8n/:action',
        'POST /api/v1/webhook/survey',
        'POST /api/v1/webhook/task',
        'POST /api/v1/webhook/alert'
      ],
      historySize: this.webhookHistory.length,
      hasMessenger: !!this.messengerFactory,
      hasDatabase: !!this.pool
    });
  }
  
  getWebhookHistory(req, res) {
    const limit = parseInt(req.query.limit) || 50;
    res.json({
      history: this.webhookHistory.slice(-limit).reverse()
    });
  }
  
  recordWebhook(record) {
    this.webhookHistory.push(record);
    if (this.webhookHistory.length > this.maxHistorySize) {
      this.webhookHistory.shift();
    }
  }
  
  getRouter() {
    return this.router;
  }
}

module.exports = N8NWebhookHandler;
