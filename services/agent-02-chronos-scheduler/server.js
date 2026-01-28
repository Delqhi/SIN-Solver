require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { Pool } = require('pg');
const axios = require('axios');
const pino = require('pino');
const pinoHttp = require('pino-http');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://sin_admin:sin-solver-2026@postgres:5432/sin_solver',
});

const API_BRAIN_URL = process.env.API_BRAIN_URL || 'http://api-brain:8000';
const activeJobs = new Map();

app.use(express.json());
app.use(pinoHttp({ logger }));

const loadSchedules = async () => {
  try {
    const { rows } = await pool.query('SELECT * FROM schedules WHERE enabled = true');
    rows.forEach(schedule => registerJob(schedule));
    logger.info({ count: rows.length }, 'Loaded schedules from database');
  } catch (err) {
    logger.error({ err }, 'Failed to load schedules');
  }
};

const registerJob = (schedule) => {
  if (activeJobs.has(schedule.id)) {
    activeJobs.get(schedule.id).stop();
  }
  
  if (!cron.validate(schedule.cron_expression)) {
    logger.error({ scheduleId: schedule.id, cron: schedule.cron_expression }, 'Invalid cron expression');
    return;
  }
  
  const job = cron.schedule(schedule.cron_expression, async () => {
    await executeSchedule(schedule);
  }, { timezone: schedule.timezone || 'UTC' });
  
  activeJobs.set(schedule.id, job);
  logger.info({ scheduleId: schedule.id, name: schedule.name, cron: schedule.cron_expression }, 'Registered job');
};

const executeSchedule = async (schedule) => {
  const startTime = Date.now();
  let taskId = null;
  let status = 'completed';
  let error = null;
  
  try {
    const response = await axios.post(`${API_BRAIN_URL}/api/tasks`, {
      type: schedule.task_type,
      payload: schedule.task_payload,
      priority: 1,
    });
    taskId = response.data.id;
    
    await pool.query(
      'UPDATE schedules SET last_run_at = NOW(), run_count = run_count + 1 WHERE id = $1',
      [schedule.id]
    );
    
    logger.info({ scheduleId: schedule.id, taskId }, 'Schedule executed successfully');
  } catch (err) {
    status = 'failed';
    error = err.message;
    logger.error({ scheduleId: schedule.id, err }, 'Schedule execution failed');
  }
  
  await pool.query(
    `INSERT INTO schedule_executions (schedule_id, task_id, status, error, duration_ms) 
     VALUES ($1, $2, $3, $4, $5)`,
    [schedule.id, taskId, status, error, Date.now() - startTime]
  );
};

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', activeJobs: activeJobs.size, uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

app.get('/api/schedules', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM schedules ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedules', async (req, res) => {
  try {
    const { name, description, cron_expression, timezone, task_type, task_payload = {}, workflow_id, enabled = true } = req.body;
    
    if (!cron.validate(cron_expression)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }
    
    const { rows } = await pool.query(
      `INSERT INTO schedules (name, description, cron_expression, timezone, task_type, task_payload, workflow_id, enabled, next_run_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [name, description, cron_expression, timezone || 'UTC', task_type, JSON.stringify(task_payload), workflow_id, enabled]
    );
    
    if (enabled) registerJob(rows[0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/schedules/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM schedules WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Schedule not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/schedules/:id', async (req, res) => {
  try {
    const { name, description, cron_expression, timezone, task_type, task_payload, workflow_id, enabled } = req.body;
    
    if (cron_expression && !cron.validate(cron_expression)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }
    
    const { rows } = await pool.query(
      `UPDATE schedules SET 
       name = COALESCE($1, name), description = COALESCE($2, description),
       cron_expression = COALESCE($3, cron_expression), timezone = COALESCE($4, timezone),
       task_type = COALESCE($5, task_type), task_payload = COALESCE($6, task_payload),
       workflow_id = COALESCE($7, workflow_id), enabled = COALESCE($8, enabled),
       updated_at = NOW() WHERE id = $9 RETURNING *`,
      [name, description, cron_expression, timezone, task_type, 
       task_payload ? JSON.stringify(task_payload) : null, workflow_id, enabled, req.params.id]
    );
    
    if (!rows.length) return res.status(404).json({ error: 'Schedule not found' });
    
    if (rows[0].enabled) {
      registerJob(rows[0]);
    } else if (activeJobs.has(req.params.id)) {
      activeJobs.get(req.params.id).stop();
      activeJobs.delete(req.params.id);
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/schedules/:id', async (req, res) => {
  try {
    if (activeJobs.has(req.params.id)) {
      activeJobs.get(req.params.id).stop();
      activeJobs.delete(req.params.id);
    }
    const { rowCount } = await pool.query('DELETE FROM schedules WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Schedule not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedules/:id/run', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM schedules WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Schedule not found' });
    await executeSchedule(rows[0]);
    res.json({ success: true, message: 'Schedule executed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/executions', async (req, res) => {
  try {
    const { limit = 50, schedule_id } = req.query;
    let query = 'SELECT e.*, s.name as schedule_name FROM schedule_executions e JOIN schedules s ON e.schedule_id = s.id';
    const params = [];
    if (schedule_id) {
      params.push(schedule_id);
      query += ` WHERE e.schedule_id = $${params.length}`;
    }
    params.push(parseInt(limit));
    query += ` ORDER BY e.executed_at DESC LIMIT $${params.length}`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', async () => {
  logger.info({ port: PORT }, 'Chronos scheduler started');
  await loadSchedules();
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  activeJobs.forEach(job => job.stop());
  await pool.end();
  process.exit(0);
});
