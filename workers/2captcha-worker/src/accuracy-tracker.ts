/**
 * Accuracy Tracker - Real-time accuracy monitoring
 * 
 * Tracks success rate and enforces 95% minimum accuracy rule
 */

export interface AccuracyStats {
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  currentAccuracy: number;
  last10Results: boolean[];
  hourlyAccuracy: number[];
}

export class AccuracyTracker {
  private stats: AccuracyStats = {
    total: 0,
    correct: 0,
    wrong: 0,
    skipped: 0,
    currentAccuracy: 100.0,
    last10Results: [],
    hourlyAccuracy: []
  };

  private onWarning?: (accuracy: number) => void;
  private onEmergencyStop?: (accuracy: number) => void;

  constructor(callbacks?: {
    onWarning?: (accuracy: number) => void;
    onEmergencyStop?: (accuracy: number) => void;
  }) {
    this.onWarning = callbacks?.onWarning;
    this.onEmergencyStop = callbacks?.onEmergencyStop;
  }

  /**
   * Record a submission result
   */
  recordSubmission(wasCorrect: boolean): void {
    this.stats.total++;
    
    if (wasCorrect) {
      this.stats.correct++;
    } else {
      this.stats.wrong++;
    }

    // Update current accuracy
    this.stats.currentAccuracy = (this.stats.correct / this.stats.total) * 100;

    // Update last 10 results
    this.stats.last10Results.push(wasCorrect);
    if (this.stats.last10Results.length > 10) {
      this.stats.last10Results.shift();
    }

    // Check triggers
    this.checkTriggers();
  }

  /**
   * Record a skip (cannot solve)
   */
  recordSkip(): void {
    this.stats.skipped++;
  }

  /**
   * Check auto-stop triggers
   */
  private checkTriggers(): void {
    // Trigger 1: Last 10 below 95%
    if (this.stats.last10Results.length >= 10) {
      const last10Correct = this.stats.last10Results.filter(r => r).length;
      const last10Accuracy = (last10Correct / 10) * 100;
      
      if (last10Accuracy < 95) {
        console.warn(`⚠️ WARNING: Last 10 accuracy is ${last10Accuracy.toFixed(1)}% (below 95%)`);
        this.onWarning?.(last10Accuracy);
      }
    }

    // Trigger 2: Overall below 90%
    if (this.stats.currentAccuracy < 90) {
      console.error(`🚨 EMERGENCY STOP: Overall accuracy is ${this.stats.currentAccuracy.toFixed(1)}% (below 90%)`);
      this.onEmergencyStop?.(this.stats.currentAccuracy);
    }
  }

  /**
   * Get current stats
   */
  getStats(): AccuracyStats {
    return { ...this.stats };
  }

  /**
   * Get formatted accuracy string
   */
  getAccuracyString(): string {
    return `${this.stats.currentAccuracy.toFixed(1)}% (${this.stats.correct}/${this.stats.total})`;
  }

  /**
   * Reset stats
   */
  reset(): void {
    this.stats = {
      total: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      currentAccuracy: 100.0,
      last10Results: [],
      hourlyAccuracy: []
    };
  }
}
