import { EventEmitter } from 'events';

export interface CostConfig {
  rates?: RateConfig;
  budget?: number;
  alertThreshold?: number;
  currency?: string;
}

export interface RateConfig {
  connectionPerMinute?: number;
  screenshotPerCapture?: number;
  navigationPerPage?: number;
  cpuPerSecond?: number;
  memoryPerMBPerMinute?: number;
  bandwidthPerMB?: number;
}

export interface Resources {
  cpu?: number;
  memory?: number;
  bandwidth?: number;
}

export interface OperationRecord {
  id: string;
  type: string;
  duration: number;
  resources: Resources;
  timestamp: number;
  cost: number;
}

export interface CostReport {
  total: number;
  byType: Record<string, number>;
  byDay: Record<string, number>;
  projected: number;
  budget: number;
  remaining: number;
  utilization: number;
  operationCount: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface DailyCost {
  date: string;
  total: number;
  operations: number;
}

export class BrowserlessCostMonitor extends EventEmitter {
  private rates: Required<RateConfig>;
  private budget: number;
  private alertThreshold: number;
  private currency: string;
  private operations: OperationRecord[] = [];
  private dailyCosts = new Map<string, DailyCost>();
  private alertTriggered = false;

  /**
   * Creates a new BrowserlessCostMonitor instance
   * @param config - Configuration for cost tracking and budgeting
   */
  constructor(config: CostConfig = {}) {
    super();

    this.rates = {
      connectionPerMinute: 0.001,
      screenshotPerCapture: 0.005,
      navigationPerPage: 0.002,
      cpuPerSecond: 0.0001,
      memoryPerMBPerMinute: 0.00005,
      bandwidthPerMB: 0.001,
      ...config.rates,
    };

    this.budget = config.budget || 100;
    this.alertThreshold = config.alertThreshold || 0.8;
    this.currency = config.currency || 'USD';
  }

  /**
   * Records an operation and calculates its cost
   * @param type - The type of operation (connection, screenshot, navigation, etc.)
   * @param duration - Duration in seconds
   * @param resources - Resource usage (cpu, memory, bandwidth)
   */
  recordOperation(type: string, duration: number, resources: Resources = {}): void {
    const cost = this.calculateOperationCost(type, duration, resources);

    const record: OperationRecord = {
      id: this.generateOperationId(),
      type,
      duration,
      resources,
      timestamp: Date.now(),
      cost,
    };

    this.operations.push(record);
    this.updateDailyCost(record);

    this.emit('operationRecorded', record);

    this.checkBudgetAlert();
  }

  /**
   * Gets the current total cost
   * @returns Total cost in configured currency
   */
  getCurrentCost(): number {
    return this.operations.reduce((total, op) => total + op.cost, 0);
  }

  /**
   * Gets cost breakdown for a specific time period
   * @param start - Start date
   * @param end - End date
   * @returns Cost report for the period
   */
  getCostByPeriod(start: Date, end: Date): CostReport {
    const startTime = start.getTime();
    const endTime = end.getTime();

    const periodOperations = this.operations.filter(
      op => op.timestamp >= startTime && op.timestamp <= endTime
    );

    const total = periodOperations.reduce((sum, op) => sum + op.cost, 0);

    const byType: Record<string, number> = {};
    periodOperations.forEach(op => {
      byType[op.type] = (byType[op.type] || 0) + op.cost;
    });

    const byDay: Record<string, number> = {};
    periodOperations.forEach(op => {
      const date = new Date(op.timestamp).toISOString().split('T')[0];
      byDay[date] = (byDay[date] || 0) + op.cost;
    });

    const daysDiff = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)));
    const dailyAverage = total / daysDiff;
    const projected = dailyAverage * 30;

    return {
      total,
      byType,
      byDay,
      projected,
      budget: this.budget,
      remaining: Math.max(0, this.budget - total),
      utilization: total / this.budget,
      operationCount: periodOperations.length,
      period: { start, end },
    };
  }

  /**
   * Gets projected cost for a number of days
   * @param days - Number of days to project
   * @returns Projected cost
   */
  getProjectedCost(days: number): number {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    const recentOperations = this.operations.filter(
      op => op.timestamp >= now - 7 * dayInMs
    );

    if (recentOperations.length === 0) {
      return 0;
    }

    const weeklyCost = recentOperations.reduce((sum, op) => sum + op.cost, 0);
    const dailyAverage = weeklyCost / 7;

    return dailyAverage * days;
  }

  /**
   * Sets the budget limit
   * @param amount - Budget amount in configured currency
   */
  setBudget(amount: number): void {
    this.budget = amount;
    this.alertTriggered = false;
    this.emit('budgetSet', amount);
    this.checkBudgetAlert();
  }

  /**
   * Checks if current cost exceeds budget
   * @returns True if over budget, false otherwise
   */
  isOverBudget(): boolean {
    return this.getCurrentCost() > this.budget;
  }

  /**
   * Gets the budget utilization percentage
   * @returns Percentage of budget used (0-100)
   */
  getBudgetUtilization(): number {
    return (this.getCurrentCost() / this.budget) * 100;
  }

  /**
   * Exports a detailed cost report as JSON
   * @returns JSON string representation of cost report
   */
  exportReport(): string {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const report = this.getCostByPeriod(startOfMonth, now);

    const exportData = {
      generatedAt: now.toISOString(),
      currency: this.currency,
      rates: this.rates,
      summary: {
        currentCost: this.getCurrentCost(),
        budget: this.budget,
        remaining: this.budget - this.getCurrentCost(),
        utilization: this.getBudgetUtilization(),
        isOverBudget: this.isOverBudget(),
      },
      report,
      dailyCosts: Array.from(this.dailyCosts.values()),
      topOperations: this.getTopOperations(10),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Gets cost breakdown by operation type
   * @returns Record of costs by type
   */
  getCostByType(): Record<string, number> {
    const byType: Record<string, number> = {};

    this.operations.forEach(op => {
      byType[op.type] = (byType[op.type] || 0) + op.cost;
    });

    return byType;
  }

  /**
   * Gets daily cost breakdown
   * @returns Array of daily costs
   */
  getDailyCosts(): DailyCost[] {
    return Array.from(this.dailyCosts.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  /**
   * Gets the most expensive operations
   * @param limit - Maximum number of operations to return
   * @returns Array of operation records
   */
  getTopOperations(limit: number = 10): OperationRecord[] {
    return [...this.operations]
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  /**
   * Clears all recorded operations and costs
   */
  clearHistory(): void {
    this.operations = [];
    this.dailyCosts.clear();
    this.alertTriggered = false;
    this.emit('historyCleared');
  }

  /**
   * Updates the cost rates
   * @param rates - New rate configuration
   */
  updateRates(rates: RateConfig): void {
    this.rates = { ...this.rates, ...rates };
    this.emit('ratesUpdated', this.rates);
  }

  /**
   * Gets the current rate configuration
   * @returns Current rates
   */
  getRates(): RateConfig {
    return { ...this.rates };
  }

  private calculateOperationCost(type: string, duration: number, resources: Resources): number {
    let cost = 0;

    switch (type) {
      case 'connection':
        cost += (duration / 60) * this.rates.connectionPerMinute;
        break;
      case 'screenshot':
        cost += this.rates.screenshotPerCapture;
        cost += (duration / 60) * this.rates.connectionPerMinute;
        break;
      case 'navigation':
        cost += this.rates.navigationPerPage;
        cost += (duration / 60) * this.rates.connectionPerMinute;
        break;
      default:
        cost += (duration / 60) * this.rates.connectionPerMinute;
    }

    if (resources.cpu) {
      cost += resources.cpu * this.rates.cpuPerSecond;
    }

    if (resources.memory) {
      cost += (resources.memory / 1024) * (duration / 60) * this.rates.memoryPerMBPerMinute;
    }

    if (resources.bandwidth) {
      cost += resources.bandwidth * this.rates.bandwidthPerMB;
    }

    return Math.round(cost * 10000) / 10000;
  }

  private updateDailyCost(record: OperationRecord): void {
    const date = new Date(record.timestamp).toISOString().split('T')[0];

    const existing = this.dailyCosts.get(date);
    if (existing) {
      existing.total += record.cost;
      existing.operations++;
    } else {
      this.dailyCosts.set(date, {
        date,
        total: record.cost,
        operations: 1,
      });
    }
  }

  private checkBudgetAlert(): void {
    const utilization = this.getBudgetUtilization();
    const threshold = this.alertThreshold * 100;

    if (utilization >= threshold && !this.alertTriggered) {
      this.alertTriggered = true;
      this.emit('budgetAlert', {
        threshold: threshold,
        utilization: utilization,
        currentCost: this.getCurrentCost(),
        budget: this.budget,
      });
    }
  }

  private generateOperationId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default BrowserlessCostMonitor;
