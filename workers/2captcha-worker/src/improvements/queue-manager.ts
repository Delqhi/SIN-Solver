/**
 * Queue Manager
 * - Priority queue with dead-letter support
 * - Visibility timeouts for in-flight tasks
 * - Event hooks for monitoring
 */

import { EventEmitter } from 'events';

export type QueueStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'dead-letter';

export interface QueueItem<T> {
  id: string;
  payload: T;
  priority: number;
  createdAt: Date;
  attempts: number;
  status: QueueStatus;
  lastError?: Error;
  metadata?: Record<string, unknown>;
}

export interface QueueStats {
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  deadLetter: number;
  oldestPendingMs?: number;
}

export interface QueueManagerOptions {
  maxRetries: number;
  visibilityTimeoutMs: number;
  deadLetterEnabled: boolean;
  maxQueueSize: number;
}

export class QueueManager<T> extends EventEmitter {
  private readonly options: QueueManagerOptions;
  private readonly queue: QueueItem<T>[] = [];
  private readonly inFlight = new Map<string, NodeJS.Timeout>();
  private readonly deadLetter: QueueItem<T>[] = [];
  private readonly completed: QueueItem<T>[] = [];
  private readonly failed: QueueItem<T>[] = [];

  constructor(options: QueueManagerOptions) {
    super();
    this.options = options;
  }

  enqueue(item: Omit<QueueItem<T>, 'createdAt' | 'attempts' | 'status'>): QueueItem<T> {
    if (this.queue.length >= this.options.maxQueueSize) {
      throw new Error(`Queue capacity exceeded: ${this.options.maxQueueSize}`);
    }

    const queueItem: QueueItem<T> = {
      ...item,
      createdAt: new Date(),
      attempts: 0,
      status: 'pending',
    };

    const index = this.queue.findIndex((existing) => existing.priority > queueItem.priority);
    if (index === -1) {
      this.queue.push(queueItem);
    } else {
      this.queue.splice(index, 0, queueItem);
    }

    this.emit('enqueued', queueItem);
    return queueItem;
  }

  dequeue(): QueueItem<T> | undefined {
    const next = this.queue.shift();
    if (!next) {
      return undefined;
    }

    next.status = 'in-progress';
    next.attempts += 1;
    this.emit('started', next);

    const timeout = setTimeout(() => {
      this.handleVisibilityTimeout(next.id);
    }, this.options.visibilityTimeoutMs);

    this.inFlight.set(next.id, timeout);
    return next;
  }

  markCompleted(id: string): void {
    const item = this.clearInflight(id);
    if (!item) return;
    item.status = 'completed';
    this.completed.push(item);
    this.emit('completed', item);
  }

  markFailed(id: string, error: Error): void {
    const item = this.clearInflight(id);
    if (!item) return;
    item.lastError = error;
    item.status = 'failed';
    this.failed.push(item);
    this.emit('failed', item);

    if (item.attempts < this.options.maxRetries) {
      item.status = 'pending';
      this.queue.push(item);
      this.emit('requeued', item);
      return;
    }

    if (this.options.deadLetterEnabled) {
      item.status = 'dead-letter';
      this.deadLetter.push(item);
      this.emit('dead-letter', item);
    }
  }

  requeue(item: QueueItem<T>, reason?: string): void {
    item.status = 'pending';
    if (reason) {
      item.metadata = { ...(item.metadata || {}), requeueReason: reason };
    }
    this.queue.push(item);
    this.emit('requeued', item);
  }

  getStats(): QueueStats {
    const oldest = this.queue[0]?.createdAt;
    return {
      pending: this.queue.length,
      inProgress: this.inFlight.size,
      completed: this.completed.length,
      failed: this.failed.length,
      deadLetter: this.deadLetter.length,
      oldestPendingMs: oldest ? Date.now() - oldest.getTime() : undefined,
    };
  }

  getDeadLetterQueue(): QueueItem<T>[] {
    return [...this.deadLetter];
  }

  drain(): QueueItem<T>[] {
    const drained = [...this.queue];
    this.queue.length = 0;
    return drained;
  }

  private clearInflight(id: string): QueueItem<T> | undefined {
    const timeout = this.inFlight.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.inFlight.delete(id);
    }

    const item = this.completed.find((entry) => entry.id === id)
      || this.failed.find((entry) => entry.id === id)
      || this.queue.find((entry) => entry.id === id);

    return item;
  }

  private handleVisibilityTimeout(id: string): void {
    const item = this.queue.find((entry) => entry.id === id);
    if (item) {
      return;
    }
    this.emit('visibility-timeout', { id });
  }
}

export default QueueManager;
