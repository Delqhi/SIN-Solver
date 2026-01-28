import { IAuditEntry } from './types';

export class AuditLogger {
  private entries: IAuditEntry[] = [];

  constructor() {}

  log(entry: Partial<IAuditEntry>): void {
    const fullEntry: IAuditEntry = {
      timestamp: Date.now(),
      action: entry.action || 'UNKNOWN',
      state: entry.state || 'PENDING',
      confidence: entry.confidence || 0,
      error: entry.error || null,
      metadata: entry.metadata || {}
    };
    this.entries.push(fullEntry);
  }

  getEntries(filter?: { action?: string; from?: Date }): IAuditEntry[] {
    return this.entries.filter(e => {
      if (filter?.action && e.action !== filter.action) return false;
      if (filter?.from && new Date(e.timestamp) < filter.from) return false;
      return true;
    });
  }

  export(): string {
    return JSON.stringify({ entries: this.entries }, null, 2);
  }

  clear(): void {
    this.entries = [];
  }

  logAction(action: string, metadata: object): void {
    this.log({ action, state: 'SUCCESS', confidence: 1.0, metadata: metadata as Record<string, unknown> });
  }

  logError(error: Error, context: object): void {
    this.log({ action: 'ERROR', state: 'FAILED', error: error.message, metadata: context as Record<string, unknown> });
  }

  logStateSnapshot(action: string, before: object, after: object, confidence: number): void {
    this.log({
      action,
      state: 'VERIFIED',
      confidence,
      metadata: { state_before: before, state_after: after } as Record<string, unknown>
    });
  }
}
