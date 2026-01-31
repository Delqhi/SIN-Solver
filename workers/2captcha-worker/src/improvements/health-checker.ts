/**
 * Health Checker
 * - Aggregates component health
 * - Produces overall status
 */

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message?: string;
  latencyMs?: number;
}

export interface HealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult>;
}

export interface HealthSummary {
  status: HealthStatus;
  checks: HealthCheckResult[];
  timestamp: string;
}

export class HealthChecker {
  private readonly checks: HealthCheck[] = [];

  register(check: HealthCheck): void {
    this.checks.push(check);
  }

  async run(): Promise<HealthSummary> {
    const results = await Promise.all(
      this.checks.map(async (check) => {
        try {
          return await check.check();
        } catch (error) {
          return {
            name: check.name,
            status: 'unhealthy',
            message: error instanceof Error ? error.message : String(error),
          } as HealthCheckResult;
        }
      })
    );

    const status = this.aggregate(results);
    return {
      status,
      checks: results,
      timestamp: new Date().toISOString(),
    };
  }

  private aggregate(results: HealthCheckResult[]): HealthStatus {
    if (results.some((result) => result.status === 'unhealthy')) {
      return 'unhealthy';
    }
    if (results.some((result) => result.status === 'degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }
}

export default HealthChecker;
