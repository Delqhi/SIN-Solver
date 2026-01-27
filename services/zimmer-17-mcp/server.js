require('dotenv').config();
const express = require('express');
const axios = require('axios');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { v4: uuidv4 } = require('uuid');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

const API_BRAIN_URL = process.env.API_BRAIN_URL || 'http://api-brain:8000';
const sseClients = new Map();

const tools = [
  {
    name: 'create-task',
    description: 'Create a new task in the worker queue',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Task type (captcha-solve, web-scrape, form-fill, etc.)' },
        payload: { type: 'object', description: 'Task-specific payload' },
        priority: { type: 'number', description: 'Task priority (0-10)', default: 0 },
      },
      required: ['type', 'payload'],
    },
  },
  {
    name: 'get-worker-status',
    description: 'Get status of all workers or a specific worker',
    inputSchema: {
      type: 'object',
      properties: {
        workerId: { type: 'string', description: 'Optional worker ID' },
      },
    },
  },
  {
    name: 'solve-captcha',
    description: 'Submit a CAPTCHA for solving',
    inputSchema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'URL of the CAPTCHA image' },
        captchaType: { type: 'string', enum: ['recaptcha', 'hcaptcha', 'image'], default: 'image' },
      },
      required: ['imageUrl'],
    },
  },
  {
    name: 'scrape-website',
    description: 'Scrape data from a website',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to scrape' },
        selector: { type: 'string', description: 'CSS selector for data extraction' },
        waitFor: { type: 'string', description: 'Selector to wait for before scraping' },
      },
      required: ['url'],
    },
  },
  {
    name: 'run-workflow',
    description: 'Execute a predefined workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', description: 'Workflow ID to execute' },
        inputs: { type: 'object', description: 'Input variables for the workflow' },
      },
      required: ['workflowId'],
    },
  },
  {
    name: 'get-stats',
    description: 'Get dashboard statistics',
    inputSchema: { type: 'object', properties: {} },
  },
];

const executeTool = async (name, args) => {
  switch (name) {
    case 'create-task': {
      const response = await axios.post(`${API_BRAIN_URL}/api/tasks`, args);
      return { taskId: response.data.id, status: 'created' };
    }
    case 'get-worker-status': {
      if (args.workerId) {
        const response = await axios.get(`${API_BRAIN_URL}/api/workers/${args.workerId}`);
        return response.data;
      }
      const response = await axios.get(`${API_BRAIN_URL}/api/workers`);
      return response.data;
    }
    case 'solve-captcha': {
      const response = await axios.post(`${API_BRAIN_URL}/api/tasks`, {
        type: 'captcha-solve',
        payload: { imageUrl: args.imageUrl, captchaType: args.captchaType },
        priority: 5,
      });
      return { taskId: response.data.id, message: 'CAPTCHA task queued' };
    }
    case 'scrape-website': {
      const response = await axios.post(`${API_BRAIN_URL}/api/tasks`, {
        type: 'web-scrape',
        payload: { url: args.url, selector: args.selector, waitFor: args.waitFor },
      });
      return { taskId: response.data.id, message: 'Scrape task queued' };
    }
    case 'run-workflow': {
      const response = await axios.post(`${API_BRAIN_URL}/api/workflows/${args.workflowId}/execute`, {
        variables: args.inputs || {},
      });
      return { runId: response.data.id, status: 'started' };
    }
    case 'get-stats': {
      const response = await axios.get(`${API_BRAIN_URL}/api/stats`);
      return response.data;
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};

app.use(express.json());
app.use(pinoHttp({ logger }));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime(), tools: tools.length });
});

app.get('/api/tools', (req, res) => {
  res.json(tools);
});

app.get('/api/resources', (req, res) => {
  res.json([
    { uri: 'workers://list', name: 'Worker List', description: 'List of all registered workers' },
    { uri: 'tasks://pending', name: 'Pending Tasks', description: 'Current pending task queue' },
    { uri: 'workflows://list', name: 'Workflows', description: 'Available workflows' },
    { uri: 'stats://dashboard', name: 'Dashboard Stats', description: 'System statistics' },
  ]);
});

app.post('/api/execute', async (req, res) => {
  try {
    const { tool, arguments: args } = req.body;
    const result = await executeTool(tool, args || {});
    res.json({ success: true, result });
  } catch (err) {
    logger.error({ err }, 'Tool execution failed');
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/sse', (req, res) => {
  const clientId = uuidv4();
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  sseClients.set(clientId, res);
  logger.info({ clientId }, 'SSE client connected');

  req.on('close', () => {
    sseClients.delete(clientId);
    logger.info({ clientId }, 'SSE client disconnected');
  });
});

app.post('/mcp/tools/list', (req, res) => {
  res.json({ tools });
});

app.post('/mcp/tools/call', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;
    const tool = tools.find(t => t.name === name);
    if (!tool) {
      return res.status(404).json({ error: `Tool not found: ${name}` });
    }
    const result = await executeTool(name, args || {});
    res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/mcp/resources/list', async (req, res) => {
  res.json({
    resources: [
      { uri: 'workers://list', name: 'Workers', mimeType: 'application/json' },
      { uri: 'tasks://pending', name: 'Pending Tasks', mimeType: 'application/json' },
      { uri: 'stats://dashboard', name: 'Stats', mimeType: 'application/json' },
    ],
  });
});

app.post('/mcp/resources/read', async (req, res) => {
  try {
    const { uri } = req.body;
    let data;
    
    switch (uri) {
      case 'workers://list':
        data = (await axios.get(`${API_BRAIN_URL}/api/workers`)).data;
        break;
      case 'tasks://pending':
        data = (await axios.get(`${API_BRAIN_URL}/api/tasks?status=pending`)).data;
        break;
      case 'stats://dashboard':
        data = (await axios.get(`${API_BRAIN_URL}/api/stats`)).data;
        break;
      default:
        return res.status(404).json({ error: `Resource not found: ${uri}` });
    }
    
    res.json({ contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, 'MCP server started');
});

process.on('SIGTERM', () => process.exit(0));
