const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
});

const SERVICES = {
  API_COORDINATOR: process.env.API_COORDINATOR_URL || 'http://zimmer-13-api-koordinator:8000',
  CLAWDBOT: process.env.CLAWDBOT_URL || 'http://zimmer-09-clawdbot-bote:8080',
  SURVEY_WORKER: process.env.SURVEY_WORKER_URL || 'http://zimmer-18-survey-worker:8018',
  CAPTCHA_WORKER: process.env.CAPTCHA_WORKER_URL || 'http://zimmer-19-captcha-worker:8019',
  WEBSITE_WORKER: process.env.WEBSITE_WORKER_URL || 'http://zimmer-20-website-worker:8020',
  CHRONOS: process.env.CHRONOS_URL || 'http://zimmer-02-chronos-stratege:3001',
  EVOLUTION: process.env.EVOLUTION_URL || 'http://zimmer-12-evolution-optimizer:8080',
  N8N: process.env.N8N_URL || 'http://zimmer-01-n8n-manager:5678'
};

async function request(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    logger.error({ url, error: error.message }, 'Request failed');
    throw error;
  }
}

const serviceClient = {
  SERVICES,
  
  api: {
    async getSecrets() { return request(SERVICES.API_COORDINATOR, '/api/secrets'); },
    async getCredentials(platform) { return request(SERVICES.API_COORDINATOR, `/api/credentials/${platform}`); },
    async logTask(taskData) { return request(SERVICES.API_COORDINATOR, '/api/tasks', { method: 'POST', body: taskData }); }
  },
  
  clawdbot: {
    async notify(message, type = 'info') {
      return request(SERVICES.CLAWDBOT, '/api/notify', { method: 'POST', body: { message, type } });
    },
    async alert(message, severity = 'warning') {
      return request(SERVICES.CLAWDBOT, '/api/alert', { method: 'POST', body: { message, severity } });
    },
    async sendToTelegram(chatId, message) {
      return request(SERVICES.CLAWDBOT, '/api/telegram/send', { method: 'POST', body: { chatId, message } });
    }
  },
  
  captcha: {
    async solve(type, imageBase64, options = {}) {
      return request(SERVICES.CAPTCHA_WORKER, '/api/solve', { 
        method: 'POST', 
        body: { type, image: imageBase64, ...options },
        timeout: 60000
      });
    },
    async getStats() { return request(SERVICES.CAPTCHA_WORKER, '/api/stats'); }
  },
  
  survey: {
    async createTask(platform, action, credentials) {
      return request(SERVICES.SURVEY_WORKER, '/api/tasks/create', { 
        method: 'POST', 
        body: { platform, action, credentials } 
      });
    },
    async getStatus(taskId) { return request(SERVICES.SURVEY_WORKER, `/api/tasks/${taskId}`); }
  },
  
  website: {
    async createTask(platform, action, credentials) {
      return request(SERVICES.WEBSITE_WORKER, '/api/tasks/create', { 
        method: 'POST', 
        body: { platform, action, credentials } 
      });
    },
    async scrape(url, selectors) {
      return request(SERVICES.WEBSITE_WORKER, '/api/scrape', { 
        method: 'POST', 
        body: { url, selectors },
        timeout: 60000
      });
    }
  },
  
  chronos: {
    async schedule(taskType, cronExpression, taskData) {
      return request(SERVICES.CHRONOS, '/api/schedule', { 
        method: 'POST', 
        body: { taskType, cronExpression, taskData } 
      });
    },
    async getScheduledTasks() { return request(SERVICES.CHRONOS, '/api/tasks'); }
  }
};

module.exports = serviceClient;
