/**
 * PostgreSQL Client Service
 * 
 * Handles job persistence, audit logging, and historical tracking for the auto-correction system.
 * Connects to: room-03-postgres-master:5432
 */

import { Pool } from 'pg';

class PostgresClient {
  constructor(config = {}) {
    this.config = {
      user: config.user || 'postgres',
      password: config.password || 'postgres',
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database || 'sin_solver',
      ...config,
    };

    this.pool = null;
    this.initialized = false;
  }

  /**
   * Initialize connection pool and create tables if needed
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.pool = new Pool(this.config);

      // Test connection
      const client = await this.pool.connect();
      console.log('[PostgresClient] Connected to PostgreSQL');
      client.release();

      // Create tables if they don't exist
      await this.createTablesIfNeeded();
      this.initialized = true;
    } catch (error) {
      console.error('[PostgresClient] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create required tables
   */
  async createTablesIfNeeded() {
    const createTablesSQL = `
      -- Auto-correction jobs table
      CREATE TABLE IF NOT EXISTS auto_correction_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id VARCHAR(255) UNIQUE NOT NULL,
        workflow_id VARCHAR(255) NOT NULL,
        error_message TEXT NOT NULL,
        error_code VARCHAR(50),
        error_type VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        fix_strategy VARCHAR(100),
        attempt_count INTEGER DEFAULT 0,
        success BOOLEAN DEFAULT FALSE,
        performance_improved BOOLEAN DEFAULT FALSE,
        data_preserved BOOLEAN DEFAULT TRUE,
        time_to_fix_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_job_id (job_id),
        INDEX idx_workflow_id (workflow_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      );

      -- Audit log table
      CREATE TABLE IF NOT EXISTS auto_correction_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id VARCHAR(255) NOT NULL,
        step VARCHAR(100) NOT NULL,
        action TEXT NOT NULL,
        details JSONB,
        duration_ms INTEGER,
        success BOOLEAN,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES auto_correction_jobs(job_id) ON DELETE CASCADE,
        INDEX idx_job_id (job_id),
        INDEX idx_step (step),
        INDEX idx_created_at (created_at)
      );

      -- Strategy statistics table
      CREATE TABLE IF NOT EXISTS strategy_statistics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        strategy_name VARCHAR(100) NOT NULL UNIQUE,
        total_attempts INTEGER DEFAULT 0,
        successful_attempts INTEGER DEFAULT 0,
        failed_attempts INTEGER DEFAULT 0,
        avg_duration_ms FLOAT,
        last_used TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_strategy_name (strategy_name)
      );
    `;

    try {
      await this.pool.query(createTablesSQL);
      console.log('[PostgresClient] Tables created/verified');
    } catch (error) {
      console.error('[PostgresClient] Create tables error:', error);
      // Tables might already exist, which is fine
    }
  }

  /**
   * Save job to database
   */
  async saveJob(jobData) {
    if (!this.initialized) await this.initialize();

    const {
      jobId,
      workflowId,
      errorMessage,
      errorCode,
      errorType,
    } = jobData;

    try {
      const query = `
        INSERT INTO auto_correction_jobs 
        (job_id, workflow_id, error_message, error_code, error_type, status)
        VALUES ($1, $2, $3, $4, $5, 'PENDING')
        RETURNING id, job_id, created_at
      `;

      const result = await this.pool.query(query, [
        jobId,
        workflowId,
        errorMessage,
        errorCode,
        errorType,
      ]);

      console.log(`[PostgresClient] Job saved: ${jobId}`);
      return result.rows[0];
    } catch (error) {
      console.error('[PostgresClient] Save job error:', error);
      throw error;
    }
  }

  /**
   * Update job status
   */
  async updateJobStatus(jobId, status, data = {}) {
    if (!this.initialized) await this.initialize();

    try {
      const query = `
        UPDATE auto_correction_jobs
        SET 
          status = $1,
          fix_strategy = $2,
          attempt_count = $3,
          success = $4,
          performance_improved = $5,
          data_preserved = $6,
          time_to_fix_ms = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $8
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        status,
        data.fixStrategy || null,
        data.attemptCount || 0,
        data.success || false,
        data.performanceImproved || false,
        data.dataPreserved !== false,
        data.timeToFixMs || null,
        jobId,
      ]);

      if (result.rows.length > 0) {
        console.log(`[PostgresClient] Job ${jobId} updated to status: ${status}`);
        return result.rows[0];
      }
      return null;
    } catch (error) {
      console.error('[PostgresClient] Update job status error:', error);
      throw error;
    }
  }

  /**
   * Record audit log entry
   */
  async recordAuditLog(jobId, step, action, details = {}, duration = 0) {
    if (!this.initialized) await this.initialize();

    try {
      const query = `
        INSERT INTO auto_correction_audit_logs
        (job_id, step, action, details, duration_ms, success)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at
      `;

      const result = await this.pool.query(query, [
        jobId,
        step,
        action,
        JSON.stringify(details),
        duration,
        details.success !== false,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('[PostgresClient] Record audit log error:', error);
      // Don't throw - logging failures shouldn't break main flow
      return null;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId) {
    if (!this.initialized) await this.initialize();

    try {
      const query = `
        SELECT * FROM auto_correction_jobs
        WHERE job_id = $1
      `;

      const result = await this.pool.query(query, [jobId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('[PostgresClient] Get job error:', error);
      return null;
    }
  }

  /**
   * Get audit log for a job
   */
  async getAuditLog(jobId) {
    if (!this.initialized) await this.initialize();

    try {
      const query = `
        SELECT * FROM auto_correction_audit_logs
        WHERE job_id = $1
        ORDER BY created_at ASC
      `;

      const result = await this.pool.query(query, [jobId]);
      return result.rows || [];
    } catch (error) {
      console.error('[PostgresClient] Get audit log error:', error);
      return [];
    }
  }

  /**
   * Update strategy statistics
   */
  async recordStrategyAttempt(strategyName, success, durationMs) {
    if (!this.initialized) await this.initialize();

    try {
      // Try to update existing record
      let query = `
        UPDATE strategy_statistics
        SET 
          total_attempts = total_attempts + 1,
          successful_attempts = successful_attempts + $1,
          failed_attempts = failed_attempts + $2,
          avg_duration_ms = (
            (avg_duration_ms * (total_attempts - 1) + $3) / total_attempts
          ),
          last_used = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE strategy_name = $4
        RETURNING *
      `;

      const updateResult = await this.pool.query(query, [
        success ? 1 : 0,
        success ? 0 : 1,
        durationMs,
        strategyName,
      ]);

      if (updateResult.rows.length > 0) {
        return updateResult.rows[0];
      }

      // Insert new record if it doesn't exist
      query = `
        INSERT INTO strategy_statistics
        (strategy_name, total_attempts, successful_attempts, failed_attempts, avg_duration_ms, last_used)
        VALUES ($1, 1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const insertResult = await this.pool.query(query, [
        strategyName,
        success ? 1 : 0,
        success ? 0 : 1,
        durationMs,
      ]);

      return insertResult.rows[0];
    } catch (error) {
      console.error('[PostgresClient] Record strategy attempt error:', error);
      return null;
    }
  }

  /**
   * Get strategy statistics
   */
  async getStrategyStats(strategyName) {
    if (!this.initialized) await this.initialize();

    try {
      const query = `
        SELECT * FROM strategy_statistics
        WHERE strategy_name = $1
      `;

      const result = await this.pool.query(query, [strategyName]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('[PostgresClient] Get strategy stats error:', error);
      return null;
    }
  }

  /**
   * Get all strategy statistics (for analytics)
   */
  async getAllStrategyStats() {
    if (!this.initialized) await this.initialize();

    try {
      const query = `
        SELECT * FROM strategy_statistics
        ORDER BY total_attempts DESC
      `;

      const result = await this.pool.query(query);
      return result.rows || [];
    } catch (error) {
      console.error('[PostgresClient] Get all strategy stats error:', error);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.initialized) await this.initialize();
      const result = await this.pool.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      console.error('[PostgresClient] Health check failed:', error);
      return false;
    }
  }

  /**
   * Close connection pool
   */
  async disconnect() {
    if (this.pool) {
      try {
        await this.pool.end();
        this.initialized = false;
        console.log('[PostgresClient] Disconnected');
      } catch (error) {
        console.error('[PostgresClient] Disconnect error:', error);
      }
    }
  }
}

export { PostgresClient };
