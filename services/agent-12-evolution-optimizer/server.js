require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const cron = require('node-cron');
const ss = require('simple-statistics');
const pino = require('pino');
const pinoHttp = require('pino-http');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://sin_admin:sin-solver-2026@postgres:5432/sin_solver',
});

const API_BRAIN_URL = process.env.API_BRAIN_URL || 'http://api-brain:8000';

app.use(express.json());
app.use(pinoHttp({ logger }));

let currentMetrics = null;
let recommendations = [];

const collectMetrics = async () => {
  try {
    const statsResponse = await axios.get(`${API_BRAIN_URL}/api/stats`);
    const stats = statsResponse.data;

    const { rows: workers } = await pool.query(`
      SELECT id, name, type, status, tasks_completed, tasks_failed, 
             EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) as seconds_since_heartbeat
      FROM workers
    `);

    const { rows: taskStats } = await pool.query(`
      SELECT type, 
             COUNT(*) as total,
             AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) as avg_duration_ms,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) as success_rate
      FROM tasks
      WHERE created_at > NOW() - INTERVAL '1 hour'
      GROUP BY type
    `);

    const workerUtilization = {};
    workers.forEach(w => {
      const total = w.tasks_completed + w.tasks_failed;
      workerUtilization[w.id] = {
        name: w.name,
        type: w.type,
        status: w.status,
        completed: w.tasks_completed,
        failed: w.tasks_failed,
        successRate: total > 0 ? (w.tasks_completed / total * 100).toFixed(1) : 0,
        stale: w.seconds_since_heartbeat > 60,
      };
    });

    const taskMetrics = {};
    taskStats.forEach(t => {
      taskMetrics[t.type] = {
        total: parseInt(t.total),
        avgDurationMs: Math.round(t.avg_duration_ms || 0),
        successRate: (parseFloat(t.success_rate || 0) * 100).toFixed(1),
      };
    });

    currentMetrics = {
      timestamp: new Date().toISOString(),
      workers: stats.workers,
      tasks: stats.tasks,
      workerUtilization,
      taskMetrics,
    };

    recommendations = generateRecommendations(currentMetrics);

    await pool.query(
      'INSERT INTO metrics_history (metrics, recommendations, period_start, period_end) VALUES ($1, $2, NOW() - INTERVAL \'5 minutes\', NOW())',
      [JSON.stringify(currentMetrics), JSON.stringify(recommendations)]
    );

    logger.info({ metricsCount: Object.keys(taskMetrics).length, recommendationCount: recommendations.length }, 'Metrics collected');
  } catch (err) {
    logger.error({ err }, 'Failed to collect metrics');
  }
};

const generateRecommendations = (metrics) => {
  const recs = [];

  if (metrics.tasks.pending > 100) {
    recs.push({
      type: 'scale',
      priority: 'high',
      message: `Queue depth is ${metrics.tasks.pending}. Consider adding more workers.`,
      action: 'scale_up_workers',
    });
  }

  if (metrics.workers.online === 0 && metrics.workers.total > 0) {
    recs.push({
      type: 'alert',
      priority: 'critical',
      message: 'All workers are offline!',
      action: 'check_worker_health',
    });
  }

  Object.entries(metrics.workerUtilization).forEach(([id, worker]) => {
    if (worker.stale && worker.status === 'online') {
      recs.push({
        type: 'health',
        priority: 'medium',
        message: `Worker ${worker.name} has not sent heartbeat in over 60s`,
        action: 'check_worker',
        workerId: id,
      });
    }

    if (parseFloat(worker.successRate) < 50 && worker.completed + worker.failed > 10) {
      recs.push({
        type: 'performance',
        priority: 'high',
        message: `Worker ${worker.name} has low success rate: ${worker.successRate}%`,
        action: 'investigate_worker',
        workerId: id,
      });
    }
  });

  Object.entries(metrics.taskMetrics).forEach(([type, stats]) => {
    if (parseFloat(stats.successRate) < 70 && stats.total > 5) {
      recs.push({
        type: 'task_quality',
        priority: 'medium',
        message: `Task type "${type}" has ${stats.successRate}% success rate`,
        action: 'review_task_type',
        taskType: type,
      });
    }
  });

  return recs;
};

cron.schedule('*/5 * * * *', collectMetrics);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

app.get('/api/metrics', (req, res) => {
  if (!currentMetrics) {
    return res.status(503).json({ error: 'Metrics not yet collected' });
  }
  res.json(currentMetrics);
});

app.get('/api/metrics/workers/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM worker_performance WHERE worker_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/optimize', async (req, res) => {
  try {
    await collectMetrics();
    res.json({ success: true, metrics: currentMetrics, recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recommendations', (req, res) => {
  res.json(recommendations);
});

app.get('/api/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const { rows } = await pool.query(
      'SELECT * FROM metrics_history ORDER BY created_at DESC LIMIT $1',
      [parseInt(limit)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', async () => {
  logger.info({ port: PORT }, 'Evolution optimizer started');
  await collectMetrics();
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
