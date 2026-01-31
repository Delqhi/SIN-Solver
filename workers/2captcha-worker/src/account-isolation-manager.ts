import { HighPerformanceCaptchaWorker, AccountConfig } from './high-performance-worker';
import { EventEmitter } from 'events';

interface WorkerInstance {
  account: AccountConfig;
  worker: HighPerformanceCaptchaWorker;
  status: 'idle' | 'busy' | 'error' | 'paused';
  currentTask?: string;
  lastActivity: number;
}

interface ParallelSolveRequest {
  url: string;
  instructions?: string;
  priority?: number;
  timeout?: number;
}

interface ParallelSolveResult {
  accountId: string;
  accountName: string;
  result: {
    success: boolean;
    solution?: string;
    confidence: number;
    provider: string;
    method: string;
    durationMs: number;
    error?: string;
  };
}

export class AccountIsolationManager extends EventEmitter {
  private workers = new Map<string, WorkerInstance>();
  private taskQueue: Array<{ request: ParallelSolveRequest; resolve: (result: ParallelSolveResult) => void; reject: (error: Error) => void }> = [];
  private isProcessing = false;

  constructor(private accounts: AccountConfig[]) {
    super();
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (const account of this.accounts) {
      const worker = new HighPerformanceCaptchaWorker(account);
      this.workers.set(account.id, {
        account,
        worker,
        status: 'idle',
        lastActivity: Date.now()
      });
      console.log(`✅ Worker initialized: ${account.name} (${account.id})`);
    }
    console.log(`\n📊 Total Workers: ${this.workers.size}`);
    console.log(`🔒 Account Isolation: ENABLED (maxConcurrent=1 per account)`);
  }

  /**
   * Solve CAPTCHA in parallel using ALL available accounts
   * Each account processes ONE CAPTCHA at a time (isolation)
   */
  async solveParallel(requests: ParallelSolveRequest[]): Promise<ParallelSolveResult[]> {
    console.log(`\n🚀 PARALLEL SOLVE: ${requests.length} CAPTCHAs with ${this.workers.size} accounts`);
    
    const availableWorkers = Array.from(this.workers.values()).filter(w => w.status === 'idle');
    
    if (availableWorkers.length === 0) {
      throw new Error('No idle workers available');
    }

    const promises: Promise<ParallelSolveResult>[] = [];
    
    for (let i = 0; i < Math.min(requests.length, availableWorkers.length); i++) {
      const worker = availableWorkers[i];
      const request = requests[i];
      
      promises.push(this.executeOnWorker(worker, request));
    }

    const results = await Promise.allSettled(promises);
    
    return results.map((r, index) => {
      if (r.status === 'fulfilled') {
        return r.value;
      } else {
        const worker = availableWorkers[index];
        return {
          accountId: worker.account.id,
          accountName: worker.account.name,
          result: {
            success: false,
            confidence: 0,
            provider: 'none',
            method: 'error',
            durationMs: 0,
            error: r.reason?.message || 'Unknown error'
          }
        };
      }
    });
  }

  /**
   * Solve ONE CAPTCHA using the FIRST available account
   */
  async solveSingle(request: ParallelSolveRequest): Promise<ParallelSolveResult> {
    const availableWorkers = Array.from(this.workers.values()).filter(w => w.status === 'idle');
    
    if (availableWorkers.length === 0) {
      throw new Error('No idle workers available - all accounts busy');
    }

    const worker = availableWorkers[0];
    return this.executeOnWorker(worker, request);
  }

  /**
   * Execute task on specific worker (with account isolation)
   */
  private async executeOnWorker(
    instance: WorkerInstance, 
    request: ParallelSolveRequest
  ): Promise<ParallelSolveResult> {
    instance.status = 'busy';
    instance.currentTask = request.url;
    instance.lastActivity = Date.now();

    this.emit('worker:busy', { accountId: instance.account.id, url: request.url });

    try {
      const result = await instance.worker.solve(request.url, request.instructions);
      
      instance.status = 'idle';
      instance.currentTask = undefined;
      instance.lastActivity = Date.now();

      this.emit('worker:idle', { accountId: instance.account.id });

      return {
        accountId: instance.account.id,
        accountName: instance.account.name,
        result
      };
    } catch (error) {
      instance.status = 'error';
      instance.currentTask = undefined;
      
      this.emit('worker:error', { accountId: instance.account.id, error });

      setTimeout(() => {
        instance.status = 'idle';
        this.emit('worker:recovered', { accountId: instance.account.id });
      }, 5000);

      throw error;
    }
  }

  /**
   * Get status of all workers
   */
  getStatus(): Array<{
    accountId: string;
    accountName: string;
    status: string;
    currentTask?: string;
    lastActivity: number;
    dailyProgress: string;
  }> {
    return Array.from(this.workers.values()).map(w => ({
      accountId: w.account.id,
      accountName: w.account.name,
      status: w.status,
      currentTask: w.currentTask,
      lastActivity: w.lastActivity,
      dailyProgress: `${w.account.currentCount}/${w.account.dailyLimit}`
    }));
  }

  /**
   * Pause specific worker
   */
  pauseWorker(accountId: string): boolean {
    const worker = this.workers.get(accountId);
    if (worker && worker.status === 'idle') {
      worker.status = 'paused';
      this.emit('worker:paused', { accountId });
      return true;
    }
    return false;
  }

  /**
   * Resume specific worker
   */
  resumeWorker(accountId: string): boolean {
    const worker = this.workers.get(accountId);
    if (worker && worker.status === 'paused') {
      worker.status = 'idle';
      this.emit('worker:resumed', { accountId });
      return true;
    }
    return false;
  }

  /**
   * Reset daily counters for all accounts
   */
  resetDailyCounters(): void {
    for (const worker of this.workers.values()) {
      worker.account.currentCount = 0;
      worker.account.lastReset = Date.now();
    }
    this.emit('daily:reset');
    console.log('📅 Daily counters reset for all accounts');
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): {
    totalAccounts: number;
    activeAccounts: number;
    busyAccounts: number;
    pausedAccounts: number;
    totalSolved: number;
    totalFailed: number;
  } {
    const workers = Array.from(this.workers.values());
    return {
      totalAccounts: workers.length,
      activeAccounts: workers.filter(w => w.status === 'idle').length,
      busyAccounts: workers.filter(w => w.status === 'busy').length,
      pausedAccounts: workers.filter(w => w.status === 'paused').length,
      totalSolved: workers.reduce((sum, w) => sum + w.worker.getMetrics().totalSolved, 0),
      totalFailed: workers.reduce((sum, w) => sum + w.worker.getMetrics().totalFailed, 0)
    };
  }
}

export function createAccountManager(accounts: AccountConfig[]): AccountIsolationManager {
  return new AccountIsolationManager(accounts);
}

export const DEFAULT_ACCOUNTS: AccountConfig[] = [
  {
    id: 'account-1',
    name: 'Jero',
    email: 'jero@2captcha.com',
    password: process.env.ACCOUNT_1_PASSWORD || '',
    maxConcurrent: 1,
    dailyLimit: 1000,
    currentCount: 0,
    lastReset: Date.now()
  },
  {
    id: 'account-2',
    name: 'Gina',
    email: 'gina@2captcha.com',
    password: process.env.ACCOUNT_2_PASSWORD || '',
    maxConcurrent: 1,
    dailyLimit: 1000,
    currentCount: 0,
    lastReset: Date.now()
  },
  {
    id: 'account-3',
    name: 'Mone',
    email: 'mone@2captcha.com',
    password: process.env.ACCOUNT_3_PASSWORD || '',
    maxConcurrent: 1,
    dailyLimit: 1000,
    currentCount: 0,
    lastReset: Date.now()
  },
  {
    id: 'account-4',
    name: 'Mako',
    email: 'mako@2captcha.com',
    password: process.env.ACCOUNT_4_PASSWORD || '',
    maxConcurrent: 1,
    dailyLimit: 1000,
    currentCount: 0,
    lastReset: Date.now()
  },
  {
    id: 'account-5',
    name: 'Rico',
    email: 'rico@2captcha.com',
    password: process.env.ACCOUNT_5_PASSWORD || '',
    maxConcurrent: 1,
    dailyLimit: 1000,
    currentCount: 0,
    lastReset: Date.now()
  }
];
