const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
});

const SERVICE_REGISTRY = {
  'zimmer-01-n8n': { url: 'http://zimmer-01-n8n-manager:5678', healthPath: '/healthz' },
  'zimmer-02-chronos': { url: 'http://zimmer-02-chronos-stratege:3001', healthPath: '/health' },
  'zimmer-05-steel': { url: 'http://zimmer-05-steel-tarnkappe:3000', healthPath: '/' },
  'zimmer-08-qa': { url: 'http://zimmer-08-qa-pruefer:8080', healthPath: '/health' },
  'zimmer-09-clawdbot': { url: 'http://zimmer-09-clawdbot-bote:8080', healthPath: '/health' },
  'zimmer-11-dashboard': { url: 'http://zimmer-11-dashboard-zentrale:80', healthPath: '/' },
  'zimmer-12-evolution': { url: 'http://zimmer-12-evolution-optimizer:8080', healthPath: '/health' },
  'zimmer-13-api': { url: 'http://zimmer-13-api-koordinator:8000', healthPath: '/health' },
  'zimmer-17-mcp': { url: 'http://zimmer-17-sin-plugins:8000', healthPath: '/health' },
  'zimmer-18-survey': { url: 'http://zimmer-18-survey-worker:8018', healthPath: '/health' },
  'zimmer-19-captcha': { url: 'http://zimmer-19-captcha-worker:8019', healthPath: '/health' },
  'zimmer-20-website': { url: 'http://zimmer-20-website-worker:8020', healthPath: '/health' }
};

async function checkServiceHealth(serviceName) {
  const service = SERVICE_REGISTRY[serviceName];
  if (!service) {
    return { service: serviceName, status: 'unknown', error: 'Service not in registry' };
  }

  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${service.url}${service.healthPath}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeout);
    const latency = Date.now() - startTime;
    
    return {
      service: serviceName,
      status: response.ok ? 'healthy' : 'unhealthy',
      statusCode: response.status,
      latency,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      service: serviceName,
      status: 'unreachable',
      error: error.message,
      latency,
      timestamp: new Date().toISOString()
    };
  }
}

async function checkAllServices() {
  const results = await Promise.all(
    Object.keys(SERVICE_REGISTRY).map(checkServiceHealth)
  );
  
  const summary = {
    total: results.length,
    healthy: results.filter(r => r.status === 'healthy').length,
    unhealthy: results.filter(r => r.status === 'unhealthy').length,
    unreachable: results.filter(r => r.status === 'unreachable').length,
    timestamp: new Date().toISOString()
  };
  
  return { summary, services: results };
}

function createHealthEndpoint(app, serviceName, additionalChecks = {}) {
  const startTime = Date.now();
  
  app.get('/health', async (req, res) => {
    const checks = { service: serviceName, status: 'healthy', uptime: process.uptime() };
    
    for (const [name, checkFn] of Object.entries(additionalChecks)) {
      try {
        const result = await checkFn();
        checks[name] = { status: 'ok', ...result };
      } catch (error) {
        checks[name] = { status: 'error', error: error.message };
        checks.status = 'degraded';
      }
    }
    
    checks.timestamp = new Date().toISOString();
    res.status(checks.status === 'healthy' ? 200 : 503).json(checks);
  });
  
  app.get('/health/detailed', async (req, res) => {
    const allServices = await checkAllServices();
    res.json({
      self: { service: serviceName, uptime: process.uptime() },
      ecosystem: allServices
    });
  });
  
  app.get('/health/dependencies', async (req, res) => {
    const dependencies = req.query.deps?.split(',') || [];
    const results = await Promise.all(dependencies.map(checkServiceHealth));
    res.json({ dependencies: results });
  });
}

async function waitForDependencies(dependencies, maxRetries = 30, retryDelay = 2000) {
  for (const dep of dependencies) {
    let retries = 0;
    let healthy = false;
    
    while (!healthy && retries < maxRetries) {
      const result = await checkServiceHealth(dep);
      if (result.status === 'healthy') {
        healthy = true;
        logger.info({ dependency: dep }, 'Dependency ready');
      } else {
        retries++;
        logger.warn({ dependency: dep, attempt: retries, maxRetries }, 'Waiting for dependency');
        await new Promise(r => setTimeout(r, retryDelay));
      }
    }
    
    if (!healthy) {
      throw new Error(`Dependency ${dep} not available after ${maxRetries} retries`);
    }
  }
  
  return true;
}

module.exports = {
  SERVICE_REGISTRY,
  checkServiceHealth,
  checkAllServices,
  createHealthEndpoint,
  waitForDependencies
};
