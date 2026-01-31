/**
 * Batch Processor
 * - Coalesces multiple solve requests into batches
 * - Flushes by size or interval
 */

import ParallelSolver from './parallel-solver';

export interface BatchProcessorOptions {
  maxBatchSize: number;
  flushIntervalMs: number;
  parallelism: number;
}

export class BatchProcessor<T, R> {
  private readonly options: BatchProcessorOptions;
  private readonly parallelSolver: ParallelSolver;
  private readonly buffer: Array<{ item: T; resolve: (value: R) => void; reject: (err: Error) => void }> = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(options: BatchProcessorOptions) {
    this.options = options;
    this.parallelSolver = new ParallelSolver({ concurrency: options.parallelism });
  }

  enqueue(item: T, handler: (batch: T[]) => Promise<R[]>): Promise<R> {
    return new Promise((resolve, reject) => {
      this.buffer.push({ item, resolve, reject });
      if (this.buffer.length >= this.options.maxBatchSize) {
        this.flush(handler).catch(reject);
      } else if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flush(handler).catch(() => undefined);
        }, this.options.flushIntervalMs);
      }
    });
  }

  async flush(handler: (batch: T[]) => Promise<R[]>): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.options.maxBatchSize);
    const items = batch.map((entry) => entry.item);

    try {
      const results = await handler(items);
      batch.forEach((entry, index) => entry.resolve(results[index]));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      batch.forEach((entry) => entry.reject(err));
    }
  }

  async drain(handler: (batch: T[]) => Promise<R[]>): Promise<void> {
    while (this.buffer.length > 0) {
      await this.flush(handler);
    }
  }

  async map(items: T[], handler: (batch: T[]) => Promise<R[]>): Promise<R[]> {
    const results: R[] = [];
    await this.parallelSolver.run(
      items.map((item, index) => async () => {
        const value = await this.enqueue(item, handler);
        results[index] = value;
        return value;
      })
    );
    await this.drain(handler);
    return results;
  }
}

export default BatchProcessor;
