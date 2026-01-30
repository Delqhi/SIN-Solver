/**
 * Parallel Solver
 * - Concurrency-limited promise pool
 * - Supports batching and task mapping
 * - CRITICAL: Only one worker per provider at a time (ban prevention)
 */

export interface ParallelSolverOptions {
  concurrency: number;
}

export interface ProviderTask<T> {
  provider: string;
  task: () => Promise<T>;
}

export class ParallelSolver {
  private readonly concurrency: number;
  private activeProviders: Set<string> = new Set();

  constructor(options: ParallelSolverOptions) {
    this.concurrency = Math.max(1, options.concurrency);
  }

  /**
   * Run tasks with provider-aware scheduling
   * CRITICAL RULE: Only one worker per provider at a time to prevent bans
   */
  async run<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    const results: T[] = [];
    let index = 0;

    const workers = new Array(this.concurrency).fill(0).map(async () => {
      while (index < tasks.length) {
        const currentIndex = index;
        index += 1;
        const result = await tasks[currentIndex]();
        results[currentIndex] = result;
      }
    });

    await Promise.all(workers);
    return results;
  }

  /**
   * Run provider-specific tasks ensuring only one per provider at a time
   * This prevents bans from providers detecting multiple simultaneous workers
   */
  async runProviderTasks<T>(providerTasks: ProviderTask<T>[]): Promise<T[]> {
    const results: T[] = new Array(providerTasks.length);
    const providerQueues: Map<string, Array<{ index: number; task: () => Promise<T> }>> = new Map();

    // Group tasks by provider
    providerTasks.forEach((pt, index) => {
      if (!providerQueues.has(pt.provider)) {
        providerQueues.set(pt.provider, []);
      }
      providerQueues.get(pt.provider)!.push({ index, task: pt.task });
    });

    // Process each provider's tasks sequentially (never parallel for same provider)
    const providerPromises = Array.from(providerQueues.entries()).map(async ([provider, tasks]) => {
      console.log(`[ParallelSolver] Processing ${tasks.length} tasks for provider: ${provider}`);
      
      for (const { index, task } of tasks) {
        // Ensure no other worker is active on this provider
        while (this.activeProviders.has(provider)) {
          console.log(`[ParallelSolver] Waiting for provider ${provider} to be free...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Mark provider as active
        this.activeProviders.add(provider);
        console.log(`[ParallelSolver] Starting task on provider: ${provider}`);

        try {
          results[index] = await task();
        } finally {
          // Mark provider as free
          this.activeProviders.delete(provider);
          console.log(`[ParallelSolver] Finished task on provider: ${provider}`);
        }
      }
    });

    await Promise.all(providerPromises);
    return results;
  }

  async map<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
    return this.run(items.map((item) => () => worker(item)));
  }
}

export default ParallelSolver;
