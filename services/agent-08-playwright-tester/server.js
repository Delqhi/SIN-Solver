require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { v4: uuidv4 } = require('uuid');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://sin_admin:sin-solver-2026@postgres:5432/sin_solver',
});

const API_BRAIN_URL = process.env.API_BRAIN_URL || 'http://api-brain:8000';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://dashboard:80';

app.use(express.json());
app.use(pinoHttp({ logger }));

const testSuites = {
  'api-health': {
    name: 'API Health Checks',
    tests: [
      { name: 'API-Brain health', fn: async () => { await axios.get(`${API_BRAIN_URL}/health`); } },
      { name: 'Dashboard reachable', fn: async () => { await axios.get(DASHBOARD_URL, { timeout: 5000 }); } },
      { name: 'Database connection', fn: async () => { await pool.query('SELECT 1'); } },
    ],
  },
  'worker-registration': {
    name: 'Worker Registration',
    tests: [
      {
        name: 'Can register worker',
        fn: async () => {
          const res = await axios.post(`${API_BRAIN_URL}/api/workers`, {
            name: 'test-worker',
            type: 'general',
            capabilities: ['test'],
          });
          if (!res.data.id) throw new Error('No worker ID returned');
          await axios.delete(`${API_BRAIN_URL}/api/workers/${res.data.id}`);
        },
      },
      {
        name: 'Can list workers',
        fn: async () => {
          const res = await axios.get(`${API_BRAIN_URL}/api/workers`);
          if (!Array.isArray(res.data)) throw new Error('Expected array');
        },
      },
    ],
  },
  'task-lifecycle': {
    name: 'Task Lifecycle',
    tests: [
      {
        name: 'Can create task',
        fn: async () => {
          const res = await axios.post(`${API_BRAIN_URL}/api/tasks`, {
            type: 'test-task',
            payload: { test: true },
          });
          if (!res.data.id) throw new Error('No task ID returned');
        },
      },
      {
        name: 'Can list tasks',
        fn: async () => {
          const res = await axios.get(`${API_BRAIN_URL}/api/tasks`);
          if (!Array.isArray(res.data)) throw new Error('Expected array');
        },
      },
      {
        name: 'Can get stats',
        fn: async () => {
          const res = await axios.get(`${API_BRAIN_URL}/api/stats`);
          if (!res.data.workers) throw new Error('Missing workers in stats');
        },
      },
    ],
  },
  'database': {
    name: 'Database Tests',
    tests: [
      {
        name: 'Tables exist',
        fn: async () => {
          const tables = ['workers', 'tasks', 'workflows', 'schedules'];
          for (const table of tables) {
            const { rows } = await pool.query(
              `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
              [table]
            );
            if (!rows[0].exists) throw new Error(`Table ${table} not found`);
          }
        },
      },
      {
        name: 'Can insert and delete',
        fn: async () => {
          const { rows } = await pool.query(
            `INSERT INTO workers (name, type) VALUES ('qa-test', 'general') RETURNING id`
          );
          await pool.query('DELETE FROM workers WHERE id = $1', [rows[0].id]);
        },
      },
    ],
  },
};

const runTest = async (test) => {
  const start = Date.now();
  try {
    await test.fn();
    return { name: test.name, status: 'passed', duration: Date.now() - start };
  } catch (err) {
    return { name: test.name, status: 'failed', duration: Date.now() - start, error: err.message };
  }
};

const runSuite = async (suiteName) => {
  const suite = testSuites[suiteName];
  if (!suite) throw new Error(`Suite not found: ${suiteName}`);

  const runId = uuidv4();
  const startTime = Date.now();

  await pool.query(
    'INSERT INTO test_results (id, suite, status, triggered_by) VALUES ($1, $2, $3, $4)',
    [runId, suiteName, 'running', 'api']
  );

  const results = [];
  for (const test of suite.tests) {
    const result = await runTest(test);
    results.push(result);
  }

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const status = failed === 0 ? 'passed' : 'failed';

  await pool.query(
    `UPDATE test_results SET status = $1, tests = $2, summary = $3, duration_ms = $4, completed_at = NOW() WHERE id = $5`,
    [status, JSON.stringify(results), JSON.stringify({ passed, failed, total: results.length }), Date.now() - startTime, runId]
  );

  return { id: runId, suite: suiteName, status, tests: results, summary: { passed, failed, total: results.length } };
};

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', uptime: process.uptime(), suites: Object.keys(testSuites).length });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

app.get('/api/tests', (req, res) => {
  const suites = Object.entries(testSuites).map(([id, suite]) => ({
    id,
    name: suite.name,
    testCount: suite.tests.length,
  }));
  res.json(suites);
});

app.post('/api/tests/run', async (req, res) => {
  try {
    const results = [];
    for (const suiteName of Object.keys(testSuites)) {
      const result = await runSuite(suiteName);
      results.push(result);
    }
    const passed = results.every(r => r.status === 'passed');
    res.json({ status: passed ? 'passed' : 'failed', suites: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tests/run/:suite', async (req, res) => {
  try {
    const result = await runSuite(req.params.suite);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const { rows } = await pool.query(
      'SELECT * FROM test_results ORDER BY started_at DESC LIMIT $1',
      [parseInt(limit)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM test_results WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Result not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, 'QA service started');
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
