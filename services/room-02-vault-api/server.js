const express = require('express');
const morgan = require('morgan');
const dotenv = require('dotenv');
const winston = require('winston');
const { VaultClient } = require('./src/lib/vault-client');
const { VercelSync } = require('./src/lib/vercel-sync');
const { N8nSync } = require('./src/lib/n8n-sync');
const secretRoutes = require('./src/routes/secrets');
const syncRoutes = require('./src/routes/sync');

// Load environment variables
dotenv.config();

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'room-02-vault-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize services
const vaultClient = new VaultClient({
  addr: process.env.VAULT_ADDR || 'http://room-02-tresor-vault:8200',
  token: process.env.VAULT_TOKEN,
  logger
});

const vercelSync = new VercelSync({
  token: process.env.VERCEL_TOKEN,
  projectId: process.env.VERCEL_PROJECT_ID,
  logger
});

const n8nSync = new N8nSync({
  apiUrl: process.env.N8N_API_URL || 'http://agent-01-n8n-orchestrator:5678',
  apiKey: process.env.N8N_API_KEY,
  logger
});

// Create Express app
const app = express();

// Middleware
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`[${req.method}] ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'active',
    service: 'sin-vault-api',
    zimmer: '02-vault-api',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    vault: {
      addr: process.env.VAULT_ADDR || 'http://room-02-tresor-vault:8200',
      authenticated: !!process.env.VAULT_TOKEN
    },
    integrations: {
      vercel: !!process.env.VERCEL_TOKEN,
      n8n: !!process.env.N8N_API_KEY
    }
  });
});

// Status endpoint - comprehensive system status
app.get('/status', async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      vault: await vaultClient.healthCheck(),
      vercel: await vercelSync.getStatus(),
      n8n: await n8nSync.getStatus(),
      uptime: process.uptime()
    };
    res.json(status);
  } catch (error) {
    logger.error('Status check failed', { error: error.message });
    res.status(500).json({
      error: 'Status check failed',
      message: error.message
    });
  }
});

// Mount routes
app.use('/api/secrets', secretRoutes(vaultClient, vercelSync, n8nSync, logger));
app.use('/api/sync', syncRoutes(vaultClient, vercelSync, n8nSync, logger));

// Agent secret fetch endpoint - simplified for agents to get their secrets
app.get('/api/agent-secrets/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    
    // Validate agent name
    if (!agentName || typeof agentName !== 'string') {
      return res.status(400).json({ error: 'Invalid agent name' });
    }

    // Fetch agent-specific secrets from Vault
    const secrets = await vaultClient.getSecretsByPath(`agents/${agentName}`);
    
    res.json({
      agent: agentName,
      secrets: secrets.data.data || {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to fetch agent secrets', {
      agent: req.params.agentName,
      error: error.message
    });
    res.status(500).json({
      error: 'Failed to fetch agent secrets',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack
  });

  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// Start server
const PORT = process.env.PORT || 8002;
const server = app.listen(PORT, () => {
  logger.info(`🔐 Room-02: SIN-Vault-API running on port ${PORT}`);
  logger.info(`📍 Vault: ${process.env.VAULT_ADDR || 'http://room-02-tresor-vault:8200'}`);
  logger.info(`✅ Vercel sync: ${process.env.VERCEL_TOKEN ? 'enabled' : 'disabled'}`);
  logger.info(`✅ N8n sync: ${process.env.N8N_API_KEY ? 'enabled' : 'disabled'}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;
