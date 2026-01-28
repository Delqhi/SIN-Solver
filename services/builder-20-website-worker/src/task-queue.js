/**
 * Task Queue - Redis-backed task management
 * 
 * Features:
 * - Persistent task storage
 * - Priority-based processing
 * - Task status tracking
 * - Automatic retry on failure
 * - Task history with TTL
 */

const Redis = require('ioredis');

class TaskQueue {
  constructor(logger) {
    this.logger = logger || console;
    this.redis = null;
    this.keyPrefix = 'website-worker';
    this.defaultTTL = 86400 * 7; // 7 days
  }

  async init() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://zimmer-speicher-redis:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    this.redis.on('error', (error) => {
      this.logger.error({ error: error.message }, 'Redis connection error');
    });

    this.redis.on('connect', () => {
      this.logger.info('📦 TaskQueue connected to Redis');
    });

    await this.redis.ping();
  }

  async addTask(taskData) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    const task = {
      id: taskId,
      platform: taskData.platform,
      action: taskData.action || 'scrape',
      url: taskData.url || null,
      selectors: taskData.selectors || null,
      formData: taskData.formData || null,
      credentials: taskData.credentials || null,
      cookies: taskData.cookies || null,
      priority: taskData.priority || 5, // 1-10, lower = higher priority
      retryCount: 0,
      maxRetries: taskData.maxRetries || 3,
      status: 'pending',
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    // Store task data
    await this.redis.hset(
      this.key('tasks'),
      taskId,
      JSON.stringify(task)
    );

    // Add to pending queue with priority score
    await this.redis.zadd(
      this.key('queue:pending'),
      task.priority,
      taskId
    );

    // Publish event
    await this.redis.publish(
      this.key('events'),
      JSON.stringify({ event: 'task:created', taskId, platform: task.platform })
    );

    this.logger.info({ taskId, platform: task.platform, action: task.action }, '📝 Task created');

    return task;
  }

  async getTask(taskId) {
    const taskJson = await this.redis.hget(this.key('tasks'), taskId);
    return taskJson ? JSON.parse(taskJson) : null;
  }

  async getTasks(options = {}) {
    const { status, limit = 50, platform } = options;

    // Get all task IDs
    let taskIds;
    
    if (status === 'pending') {
      taskIds = await this.redis.zrange(this.key('queue:pending'), 0, limit - 1);
    } else if (status === 'processing') {
      taskIds = await this.redis.smembers(this.key('queue:processing'));
    } else if (status === 'completed') {
      taskIds = await this.redis.zrevrange(this.key('queue:completed'), 0, limit - 1);
    } else if (status === 'failed') {
      taskIds = await this.redis.zrevrange(this.key('queue:failed'), 0, limit - 1);
    } else {
      // Get all tasks
      taskIds = await this.redis.hkeys(this.key('tasks'));
    }

    // Fetch task data
    const tasks = [];
    for (const taskId of taskIds.slice(0, limit)) {
      const task = await this.getTask(taskId);
      if (task) {
        if (platform && task.platform !== platform) continue;
        tasks.push(task);
      }
    }

    return tasks;
  }

  async getNextTask() {
    // Get highest priority task (lowest score)
    const result = await this.redis.zpopmin(this.key('queue:pending'), 1);
    
    if (!result || result.length === 0) {
      return null;
    }

    const taskId = result[0];
    const task = await this.getTask(taskId);
    
    if (!task) {
      return null;
    }

    // Move to processing queue
    await this.redis.sadd(this.key('queue:processing'), taskId);

    // Update task status
    task.status = 'processing';
    task.startedAt = new Date().toISOString();
    await this.updateTask(taskId, task);

    return task;
  }

  async updateTask(taskId, updates) {
    const existing = await this.getTask(taskId);
    if (!existing) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updated = { ...existing, ...updates };
    
    await this.redis.hset(
      this.key('tasks'),
      taskId,
      JSON.stringify(updated)
    );

    return updated;
  }

  async completeTask(taskId, result) {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'completed';
    task.result = result;
    task.completedAt = new Date().toISOString();

    // Update task data
    await this.redis.hset(
      this.key('tasks'),
      taskId,
      JSON.stringify(task)
    );

    // Move from processing to completed
    await this.redis.srem(this.key('queue:processing'), taskId);
    await this.redis.zadd(
      this.key('queue:completed'),
      Date.now(),
      taskId
    );

    // Set TTL on task data
    await this.redis.expire(this.key(`task:${taskId}`), this.defaultTTL);

    // Publish event
    await this.redis.publish(
      this.key('events'),
      JSON.stringify({ event: 'task:completed', taskId, platform: task.platform })
    );

    return task;
  }

  async failTask(taskId, error) {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.retryCount++;
    task.error = error;

    if (task.retryCount < task.maxRetries) {
      // Retry - put back in pending queue with lower priority
      task.status = 'pending';
      
      await this.redis.hset(
        this.key('tasks'),
        taskId,
        JSON.stringify(task)
      );

      await this.redis.srem(this.key('queue:processing'), taskId);
      await this.redis.zadd(
        this.key('queue:pending'),
        task.priority + task.retryCount, // Lower priority on retry
        taskId
      );

      this.logger.info({ taskId, retryCount: task.retryCount }, '🔄 Task scheduled for retry');
    } else {
      // Max retries exceeded
      task.status = 'failed';
      task.completedAt = new Date().toISOString();

      await this.redis.hset(
        this.key('tasks'),
        taskId,
        JSON.stringify(task)
      );

      await this.redis.srem(this.key('queue:processing'), taskId);
      await this.redis.zadd(
        this.key('queue:failed'),
        Date.now(),
        taskId
      );

      // Publish event
      await this.redis.publish(
        this.key('events'),
        JSON.stringify({ event: 'task:failed', taskId, platform: task.platform, error })
      );

      this.logger.error({ taskId, error }, '❌ Task failed permanently');
    }

    return task;
  }

  async cancelTask(taskId) {
    const task = await this.getTask(taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    if (task.status === 'completed' || task.status === 'cancelled') {
      return { success: false, error: `Cannot cancel task with status: ${task.status}` };
    }

    task.status = 'cancelled';
    task.completedAt = new Date().toISOString();

    await this.redis.hset(
      this.key('tasks'),
      taskId,
      JSON.stringify(task)
    );

    // Remove from all queues
    await this.redis.zrem(this.key('queue:pending'), taskId);
    await this.redis.srem(this.key('queue:processing'), taskId);

    this.logger.info({ taskId }, '🚫 Task cancelled');

    return { success: true, task };
  }

  async getStats() {
    const [pending, processing, completed, failed] = await Promise.all([
      this.redis.zcard(this.key('queue:pending')),
      this.redis.scard(this.key('queue:processing')),
      this.redis.zcard(this.key('queue:completed')),
      this.redis.zcard(this.key('queue:failed'))
    ]);

    return {
      pending,
      processing,
      completed,
      failed,
      total: pending + processing + completed + failed
    };
  }

  async cleanup(olderThanDays = 7) {
    const cutoff = Date.now() - (olderThanDays * 86400 * 1000);

    // Remove old completed tasks
    const removedCompleted = await this.redis.zremrangebyscore(
      this.key('queue:completed'),
      '-inf',
      cutoff
    );

    // Remove old failed tasks
    const removedFailed = await this.redis.zremrangebyscore(
      this.key('queue:failed'),
      '-inf',
      cutoff
    );

    this.logger.info({ removedCompleted, removedFailed }, '🧹 Cleaned up old tasks');

    return { removedCompleted, removedFailed };
  }

  key(suffix) {
    return `${this.keyPrefix}:${suffix}`;
  }

  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

module.exports = { TaskQueue };
