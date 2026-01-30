/**
 * Parallel Solver
 * - Concurrency-limited promise pool
 * - Supports batching and task mapping
 */

export interface ParallelSolverOptions {
  concurrency: number;
}

export class ParallelSolver {
  private readonly concurrency: number;

  constructor(options: ParallelSolverOptions) {
    this.concurrency = Math.max(1, options.concurrency);
  }

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

  async map<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
    return this.run(items.map((item) => () => worker(item)));
  }
}

export default ParallelSolver;
