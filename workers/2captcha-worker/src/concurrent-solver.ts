import { EventEmitter } from 'events';

export interface CaptchaData {
  id: string;
  image?: Buffer;
  url?: string;
  type: 'image' | 'audio' | 'text' | 'recaptcha' | 'hcaptcha';
  metadata?: Record<string, unknown>;
}

export interface Task {
  id: string;
  captchaData: CaptchaData;
  priority: 'urgent' | 'normal' | 'low';
  status: TaskStatus;
  result?: string;
  error?: string;
  retryCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  result?: string;
  error?: string;
  duration: number;
}

export interface SolverStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageDuration: number;
  successRate: number;
}

export interface ConcurrentSolverOptions {
  maxConcurrency: number;
  maxRetries: number;
  retryDelay: number;
  rateLimitPerSecond: number;
  taskTimeout: number;
}

const DEFAULT_OPTIONS: ConcurrentSolverOptions = {
  maxConcurrency: 5,
  maxRetries: 3,
  retryDelay: 1000,
  rateLimitPerSecond: 10,
  taskTimeout: 30000,
};

export class ConcurrentSolver extends EventEmitter {
  private options: ConcurrentSolverOptions;
  private taskQueue: Task[] = [];
  private activeTasks = new Map<string, Task>();
  private completedTasks = new Map<string, Task>();
  private isPaused = false;
  private isStopped = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private rateLimitTokens: number;
  private lastTokenRefill: number;

  /**
   * Creates a new ConcurrentSolver instance
   * @param options - Configuration options for the solver
   */
  constructor(options: Partial<ConcurrentSolverOptions> = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.rateLimitTokens = this.options.rateLimitPerSecond;
    this.lastTokenRefill = Date.now();
    this.startProcessing();
  }

  /**
   * Add a new CAPTCHA solving task to the queue
   * @param captchaData - The CAPTCHA data to solve
   * @param priority - Priority level ('urgent', 'normal', 'low')
   * @returns The task ID
   */
  addTask(captchaData: CaptchaData, priority: 'urgent' | 'normal' | 'low' = 'normal'): string {
    if (this.isStopped) {
      throw new Error('Solver is stopped');
    }

    const task: Task = {
      id: captchaData.id || this.generateTaskId(),
      captchaData,
      priority,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date(),
    };

    this.insertTaskByPriority(task);
    this.emit('taskAdded', task);
    this.processQueue();

    return task.id;
  }

  /**
   * Get the current status of a task
   * @param taskId - The task ID to check
   * @returns The task status or undefined if not found
   */
  getStatus(taskId: string): TaskStatus | undefined {
    const task = this.getTask(taskId);
    return task?.status;
  }

  /**
   * Get detailed information about a task
   * @param taskId - The task ID
   * @returns The task object or undefined
   */
  getTask(taskId: string): Task | undefined {
    return (
      this.taskQueue.find(t => t.id === taskId) ||
      this.activeTasks.get(taskId) ||
      this.completedTasks.get(taskId)
    );
  }

  /**
   * Get all completed task results
   * @returns Array of task results
   */
  getResults(): TaskResult[] {
    return Array.from(this.completedTasks.values()).map(task => ({
      taskId: task.id,
      status: task.status,
      result: task.result,
      error: task.error,
      duration: task.completedAt && task.startedAt
        ? task.completedAt.getTime() - task.startedAt.getTime()
        : 0,
    }));
  }

  /**
   * Cancel a pending or processing task
   * @param taskId - The task ID to cancel
   * @returns True if cancelled, false otherwise
   */
  cancelTask(taskId: string): boolean {
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    
    if (queueIndex >= 0) {
      const task = this.taskQueue.splice(queueIndex, 1)[0];
      task.status = 'cancelled';
      this.completedTasks.set(task.id, task);
      this.emit('taskCancelled', task);
      return true;
    }

    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      activeTask.status = 'cancelled';
      this.activeTasks.delete(taskId);
      this.completedTasks.set(activeTask.id, activeTask);
      this.emit('taskCancelled', activeTask);
      return true;
    }

    return false;
  }

  /**
   * Pause processing new tasks
   */
  pause(): void {
    this.isPaused = true;
    this.emit('paused');
  }

  /**
   * Resume processing tasks
   */
  resume(): void {
    this.isPaused = false;
    this.emit('resumed');
    this.processQueue();
  }

  /**
   * Stop all tasks and clear the queue
   */
  stop(): void {
    this.isStopped = true;
    this.pause();

    this.taskQueue.forEach(task => {
      task.status = 'cancelled';
      this.completedTasks.set(task.id, task);
    });
    this.taskQueue = [];

    this.activeTasks.forEach(task => {
      task.status = 'cancelled';
      this.completedTasks.set(task.id, task);
    });
    this.activeTasks.clear();

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.emit('stopped');
  }

  /**
   * Get current solver statistics
   * @returns Statistics object
   */
  getStats(): SolverStats {
    const completed = Array.from(this.completedTasks.values());
    const successful = completed.filter(t => t.status === 'completed');
    
    const totalDuration = successful.reduce((sum, t) => {
      if (t.completedAt && t.startedAt) {
        return sum + (t.completedAt.getTime() - t.startedAt.getTime());
      }
      return sum;
    }, 0);

    return {
      total: this.taskQueue.length + this.activeTasks.size + this.completedTasks.size,
      pending: this.taskQueue.length,
      processing: this.activeTasks.size,
      completed: completed.filter(t => t.status === 'completed').length,
      failed: completed.filter(t => t.status === 'failed').length,
      cancelled: completed.filter(t => t.status === 'cancelled').length,
      averageDuration: successful.length > 0 ? totalDuration / successful.length : 0,
      successRate: completed.length > 0 ? (successful.length / completed.length) * 100 : 0,
    };
  }

  /**
   * Wait for a specific task to complete
   * @param taskId - The task ID to wait for
   * @param timeout - Maximum wait time in milliseconds
   * @returns The task result
   */
  async waitForResult(taskId: string, timeout: number = 60000): Promise<TaskResult> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const task = this.completedTasks.get(taskId);
        
        if (task) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve({
            taskId: task.id,
            status: task.status,
            result: task.result,
            error: task.error,
            duration: task.completedAt && task.startedAt
              ? task.completedAt.getTime() - task.startedAt.getTime()
              : 0,
          });
        }
      }, 100);

      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error(`Timeout waiting for task ${taskId}`));
      }, timeout);
    });
  }

  /**
   * Clear all completed tasks from memory
   */
  clearCompleted(): void {
    this.completedTasks.clear();
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private insertTaskByPriority(task: Task): void {
    const priorityOrder = { urgent: 0, normal: 1, low: 2 };
    const insertIndex = this.taskQueue.findIndex(
      t => priorityOrder[t.priority] > priorityOrder[task.priority]
    );
    
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 100);
  }

  private processQueue(): void {
    if (this.isPaused || this.isStopped) {
      return;
    }

    while (
      this.activeTasks.size < this.options.maxConcurrency &&
      this.taskQueue.length > 0 &&
      this.consumeRateLimitToken()
    ) {
      const task = this.taskQueue.shift();
      if (task) {
        this.executeTask(task);
      }
    }
  }

  private async executeTask(task: Task): Promise<void> {
    task.status = 'processing';
    task.startedAt = new Date();
    this.activeTasks.set(task.id, task);
    this.emit('taskStarted', task);

    try {
      const result = await this.solveCaptcha(task.captchaData);
      task.result = result;
      task.status = 'completed';
      task.completedAt = new Date();
      this.emit('taskCompleted', task);
    } catch (error) {
      task.retryCount++;
      
      if (task.retryCount < this.options.maxRetries) {
        task.status = 'pending';
        this.taskQueue.unshift(task);
        this.emit('taskRetry', task, error);
        await this.delay(this.options.retryDelay * task.retryCount);
      } else {
        task.error = error instanceof Error ? error.message : String(error);
        task.status = 'failed';
        task.completedAt = new Date();
        this.emit('taskFailed', task, error);
      }
    } finally {
      if (task.status !== 'pending') {
        this.activeTasks.delete(task.id);
        this.completedTasks.set(task.id, task);
      }
    }
  }

  private async solveCaptcha(captchaData: CaptchaData): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Task timeout'));
      }, this.options.taskTimeout);

      this.performSolve(captchaData)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private async performSolve(captchaData: CaptchaData): Promise<string> {
    await this.delay(Math.random() * 1000 + 500);
    
    if (Math.random() < 0.1) {
      throw new Error('Simulated solving error');
    }
    
    return `solved-${captchaData.id}`;
  }

  private consumeRateLimitToken(): boolean {
    const now = Date.now();
    const timePassed = now - this.lastTokenRefill;
    const tokensToAdd = Math.floor(timePassed / 1000) * this.options.rateLimitPerSecond;
    
    if (tokensToAdd > 0) {
      this.rateLimitTokens = Math.min(
        this.options.rateLimitPerSecond,
        this.rateLimitTokens + tokensToAdd
      );
      this.lastTokenRefill = now;
    }

    if (this.rateLimitTokens > 0) {
      this.rateLimitTokens--;
      return true;
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ConcurrentSolver;
