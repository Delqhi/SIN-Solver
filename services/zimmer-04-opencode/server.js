require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');
const pino = require('pino');
const { v4: uuidv4 } = require('uuid');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://sin_admin:sin-solver-2026@postgres:5432/sin_solver'
});

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const generationHistory = [];
const activeGenerations = new Map();

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini'
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
    defaultModel: 'claude-3-5-sonnet-20241022'
  },
  opencode: {
    name: 'OpenCode',
    models: ['zen/big-pickle', 'kat-coder-pro-v1'],
    defaultModel: 'zen/big-pickle',
    endpoint: 'https://api.opencode.ai/v1/chat/completions'
  }
};

async function generateWithOpenAI(prompt, options = {}) {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await client.chat.completions.create({
    model: options.model || PROVIDERS.openai.defaultModel,
    messages: [
      { role: 'system', content: options.systemPrompt || 'You are an expert programmer. Generate clean, well-documented code.' },
      { role: 'user', content: prompt }
    ],
    temperature: options.temperature || 0.3,
    max_tokens: options.maxTokens || 4096
  });

  return {
    content: response.choices[0].message.content,
    model: response.model,
    usage: response.usage,
    provider: 'openai'
  };
}

async function generateWithAnthropic(prompt, options = {}) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: options.model || PROVIDERS.anthropic.defaultModel,
    max_tokens: options.maxTokens || 4096,
    system: options.systemPrompt || 'You are an expert programmer. Generate clean, well-documented code.',
    messages: [{ role: 'user', content: prompt }]
  });

  return {
    content: response.content[0].text,
    model: response.model,
    usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
    provider: 'anthropic'
  };
}

async function generateWithOpenCode(prompt, options = {}) {
  const response = await fetch(PROVIDERS.opencode.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENCODE_API_KEY}`
    },
    body: JSON.stringify({
      model: options.model || PROVIDERS.opencode.defaultModel,
      messages: [
        { role: 'system', content: options.systemPrompt || 'You are an expert programmer. Generate clean, well-documented code.' },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 4096
    })
  });

  if (!response.ok) {
    throw new Error(`OpenCode API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    model: data.model,
    usage: data.usage,
    provider: 'opencode'
  };
}

async function generate(prompt, options = {}) {
  const provider = options.provider || 'openai';
  
  switch (provider) {
    case 'openai':
      return generateWithOpenAI(prompt, options);
    case 'anthropic':
      return generateWithAnthropic(prompt, options);
    case 'opencode':
      return generateWithOpenCode(prompt, options);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function extractCodeBlocks(content) {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim()
    });
  }

  return blocks;
}

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      service: 'opencode',
      providers: Object.keys(PROVIDERS),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

app.post('/api/generate', async (req, res) => {
  const { prompt, provider, model, systemPrompt, temperature, maxTokens, extractCode } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const generationId = uuidv4();
  activeGenerations.set(generationId, { status: 'running', startedAt: new Date() });

  try {
    logger.info({ generationId, provider, model }, 'Starting code generation');

    const result = await generate(prompt, { provider, model, systemPrompt, temperature, maxTokens });

    const generation = {
      id: generationId,
      prompt: prompt.slice(0, 500),
      result: result.content,
      codeBlocks: extractCode ? extractCodeBlocks(result.content) : [],
      provider: result.provider,
      model: result.model,
      usage: result.usage,
      createdAt: new Date().toISOString()
    };

    generationHistory.push(generation);
    if (generationHistory.length > 100) generationHistory.shift();
    activeGenerations.delete(generationId);

    try {
      await pool.query(
        `INSERT INTO api_usage (endpoint, method, status_code, response_time_ms, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        ['/api/generate', 'POST', 200, Date.now() - new Date(generation.createdAt).getTime(), 
         JSON.stringify({ provider: result.provider, model: result.model, tokens: result.usage })]
      );
    } catch (dbError) {
      logger.debug({ error: dbError.message }, 'Failed to log API usage');
    }

    res.json(generation);
  } catch (error) {
    activeGenerations.delete(generationId);
    logger.error({ error: error.message, generationId }, 'Generation failed');
    res.status(500).json({ error: error.message, generationId });
  }
});

app.post('/api/review', async (req, res) => {
  const { code, language, focus } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  const reviewPrompt = `Review the following ${language || 'code'} and provide detailed feedback on:
${focus ? `Focus areas: ${focus.join(', ')}` : '- Code quality\n- Potential bugs\n- Performance issues\n- Security concerns\n- Best practices'}

Code to review:
\`\`\`${language || ''}
${code}
\`\`\`

Provide your review in a structured format with:
1. Summary
2. Issues found (severity: high/medium/low)
3. Recommendations
4. Improved code (if applicable)`;

  try {
    const result = await generate(reviewPrompt, { 
      provider: req.body.provider || 'openai',
      model: req.body.model,
      systemPrompt: 'You are an expert code reviewer. Be thorough but constructive.',
      temperature: 0.2
    });

    res.json({
      review: result.content,
      model: result.model,
      provider: result.provider,
      usage: result.usage
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Code review failed');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/fix', async (req, res) => {
  const { code, error: codeError, language, context } = req.body;

  if (!code || !codeError) {
    return res.status(400).json({ error: 'Code and error are required' });
  }

  const fixPrompt = `Fix the following ${language || 'code'} that produces this error:

Error: ${codeError}

${context ? `Context: ${context}` : ''}

Code:
\`\`\`${language || ''}
${code}
\`\`\`

Provide:
1. Root cause analysis
2. Fixed code
3. Explanation of changes`;

  try {
    const result = await generate(fixPrompt, {
      provider: req.body.provider || 'openai',
      model: req.body.model,
      systemPrompt: 'You are an expert debugger. Fix the code efficiently and explain your changes.',
      temperature: 0.1
    });

    const codeBlocks = extractCodeBlocks(result.content);

    res.json({
      fix: result.content,
      fixedCode: codeBlocks.length > 0 ? codeBlocks[0].code : null,
      model: result.model,
      provider: result.provider,
      usage: result.usage
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Code fix failed');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/explain', async (req, res) => {
  const { code, language, depth } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  const explainPrompt = `Explain the following ${language || 'code'} in ${depth || 'moderate'} detail:

\`\`\`${language || ''}
${code}
\`\`\`

Include:
1. Overall purpose
2. Step-by-step breakdown
3. Key concepts used
4. Any potential issues or improvements`;

  try {
    const result = await generate(explainPrompt, {
      provider: req.body.provider || 'openai',
      model: req.body.model,
      systemPrompt: 'You are an expert teacher. Explain code clearly and accessibly.',
      temperature: 0.3
    });

    res.json({
      explanation: result.content,
      model: result.model,
      provider: result.provider,
      usage: result.usage
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Code explanation failed');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/refactor', async (req, res) => {
  const { code, language, goals } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  const refactorPrompt = `Refactor the following ${language || 'code'} with these goals:
${goals ? goals.join('\n') : '- Improve readability\n- Reduce complexity\n- Follow best practices\n- Optimize performance'}

Original code:
\`\`\`${language || ''}
${code}
\`\`\`

Provide:
1. Refactored code
2. Summary of changes
3. Benefits of refactoring`;

  try {
    const result = await generate(refactorPrompt, {
      provider: req.body.provider || 'openai',
      model: req.body.model,
      systemPrompt: 'You are an expert refactoring specialist. Improve code while maintaining functionality.',
      temperature: 0.2
    });

    const codeBlocks = extractCodeBlocks(result.content);

    res.json({
      refactored: result.content,
      refactoredCode: codeBlocks.length > 0 ? codeBlocks[0].code : null,
      model: result.model,
      provider: result.provider,
      usage: result.usage
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Code refactoring failed');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test', async (req, res) => {
  const { code, language, framework } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  const testPrompt = `Generate comprehensive tests for the following ${language || 'code'}:

${framework ? `Testing framework: ${framework}` : ''}

Code to test:
\`\`\`${language || ''}
${code}
\`\`\`

Generate:
1. Unit tests for all functions/methods
2. Edge case tests
3. Error handling tests
4. Test setup/teardown if needed`;

  try {
    const result = await generate(testPrompt, {
      provider: req.body.provider || 'openai',
      model: req.body.model,
      systemPrompt: 'You are an expert test engineer. Write thorough, maintainable tests.',
      temperature: 0.2
    });

    const codeBlocks = extractCodeBlocks(result.content);

    res.json({
      tests: result.content,
      testCode: codeBlocks.length > 0 ? codeBlocks[0].code : null,
      model: result.model,
      provider: result.provider,
      usage: result.usage
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Test generation failed');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/providers', (req, res) => {
  const availableProviders = {};
  
  if (process.env.OPENAI_API_KEY) {
    availableProviders.openai = PROVIDERS.openai;
  }
  if (process.env.ANTHROPIC_API_KEY) {
    availableProviders.anthropic = PROVIDERS.anthropic;
  }
  if (process.env.OPENCODE_API_KEY) {
    availableProviders.opencode = PROVIDERS.opencode;
  }

  res.json({
    providers: availableProviders,
    default: process.env.DEFAULT_PROVIDER || 'openai'
  });
});

app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ 
    generations: generationHistory.slice(-limit).reverse(),
    total: generationHistory.length 
  });
});

app.get('/api/generation/:id', (req, res) => {
  const generation = generationHistory.find(g => g.id === req.params.id);
  
  if (!generation) {
    const active = activeGenerations.get(req.params.id);
    if (active) {
      return res.json({ id: req.params.id, status: 'running', ...active });
    }
    return res.status(404).json({ error: 'Generation not found' });
  }

  res.json(generation);
});

app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        AVG(response_time_ms) as avg_response_time,
        COUNT(CASE WHEN status_code = 200 THEN 1 END) as successful,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed
      FROM api_usage
      WHERE endpoint LIKE '/api/%' AND created_at > NOW() - INTERVAL '24 hours'
    `);

    const stats = result.rows[0];

    res.json({
      last24h: {
        totalRequests: parseInt(stats.total_requests) || 0,
        avgResponseTime: Math.round(parseFloat(stats.avg_response_time) || 0),
        successRate: stats.total_requests > 0 
          ? Math.round((parseInt(stats.successful) / parseInt(stats.total_requests)) * 100)
          : 100
      },
      inMemory: {
        historySize: generationHistory.length,
        activeGenerations: activeGenerations.size
      }
    });
  } catch (error) {
    res.json({
      last24h: { totalRequests: 0, avgResponseTime: 0, successRate: 100 },
      inMemory: {
        historySize: generationHistory.length,
        activeGenerations: activeGenerations.size
      }
    });
  }
});

const PORT = process.env.PORT || 9000;

async function start() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection established');

    app.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT }, 'OpenCode service started');
      
      const configuredProviders = [];
      if (process.env.OPENAI_API_KEY) configuredProviders.push('OpenAI');
      if (process.env.ANTHROPIC_API_KEY) configuredProviders.push('Anthropic');
      if (process.env.OPENCODE_API_KEY) configuredProviders.push('OpenCode');
      
      logger.info({ providers: configuredProviders }, 'Configured providers');
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to start OpenCode service');
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await pool.end();
  process.exit(0);
});

start();
