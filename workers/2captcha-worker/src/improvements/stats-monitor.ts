/**
 * Stats Monitor
 * - Real-time metrics aggregation
 * - Prometheus-style export
 * - Lightweight tracing spans
 */

import { EventEmitter } from 'events';

export interface StatsSnapshot {
  total: number;
  success: number;
  failed: number;
  retries: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  lastUpdated: string;
}

export interface SolveMetric {
  latencyMs: number;
  success: boolean;
  provider?: string;
}

export class ResponseCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}

export class TraceSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly name: string;
  readonly startMs: number;
  endMs?: number;

  constructor(name: string) {
    this.name = name;
    this.traceId = `trace_${Math.random().toString(36).slice(2)}`;
    this.spanId = `span_${Math.random().toString(36).slice(2)}`;
    this.startMs = Date.now();
  }

  end(): number {
    this.endMs = Date.now();
    return this.endMs - this.startMs;
  }
}

export class StatsMonitor extends EventEmitter {
  private total = 0;
  private success = 0;
  private failed = 0;
  private retries = 0;
  private latencies: number[] = [];

  recordSolve(metric: SolveMetric): void {
    this.total += 1;
    if (metric.success) {
      this.success += 1;
    } else {
      this.failed += 1;
    }
    this.latencies.push(metric.latencyMs);
    this.emit('metric', metric);
  }

  recordRetry(): void {
    this.retries += 1;
  }

  getSnapshot(): StatsSnapshot {
    const latencies = [...this.latencies].sort((a, b) => a - b);
    const avgLatency = latencies.reduce((sum, value) => sum + value, 0) / (latencies.length || 1);
    const percentile = (p: number) => latencies[Math.floor((p / 100) * (latencies.length - 1))] || 0;
    return {
      total: this.total,
      success: this.success,
      failed: this.failed,
      retries: this.retries,
      avgLatencyMs: avgLatency,
      p95LatencyMs: percentile(95),
      p99LatencyMs: percentile(99),
      lastUpdated: new Date().toISOString(),
    };
  }

  getPrometheusMetrics(): string {
    const snapshot = this.getSnapshot();
    return [
      `captcha_total ${snapshot.total}`,
      `captcha_success ${snapshot.success}`,
      `captcha_failed ${snapshot.failed}`,
      `captcha_retries ${snapshot.retries}`,
      `captcha_latency_avg_ms ${snapshot.avgLatencyMs}`,
      `captcha_latency_p95_ms ${snapshot.p95LatencyMs}`,
      `captcha_latency_p99_ms ${snapshot.p99LatencyMs}`,
    ].join('\n');
  }

  startSpan(name: string): TraceSpan {
    return new TraceSpan(name);
  }
}

export default StatsMonitor;
