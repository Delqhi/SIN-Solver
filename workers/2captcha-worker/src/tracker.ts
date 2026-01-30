import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Real-Time Accuracy Tracker für 2Captcha Worker
 * Überwacht Lösungsqualität und triggert Auto-Stop bei schlechter Performance
 */
export class AccuracyTracker extends EventEmitter {
  private stats = {
    total: 0,
    correct: 0,
    skipped: 0,
    currentAccuracy: 100.0,
    last10Results: [] as boolean[],
    hourlyAccuracy: [] as { timestamp: number; accuracy: number }[],
    sessionStart: Date.now(),
    lastUpdate: Date.now(),
    consecutiveErrors: 0,
    maxConsecutiveErrors: 5,
  };

  private persistencePath: string;
  private isPaused = false;
  private shouldStop = false;

  constructor(persistencePath?: string) {
    super();
    this.persistencePath =
      persistencePath ||
      path.join(process.cwd(), '.captcha-tracker-stats.json');
    this.loadStats();
  }

  /**
   * Registriere ein Captcha-Lösungs-Ergebnis
   */
  public recordSubmission(answer: string, wasCorrect: boolean): void {
    if (this.isPaused || this.shouldStop) {
      this.emit('SUBMISSION_IGNORED', {
        reason: this.shouldStop ? 'Auto-Stop aktiv' : 'Tracker pausiert',
      });
      return;
    }

    // Update stats
    this.stats.total++;
    if (wasCorrect) {
      this.stats.correct++;
      this.stats.consecutiveErrors = 0;
    } else {
      this.stats.consecutiveErrors++;
    }
    this.stats.skipped = 0;

    // Update last 10
    this.stats.last10Results.push(wasCorrect);
    if (this.stats.last10Results.length > 10) {
      this.stats.last10Results.shift();
    }

    // Recalculate accuracy
    this.stats.currentAccuracy =
      (this.stats.correct / this.stats.total) * 100;
    this.stats.lastUpdate = Date.now();

    // Log submission
    this.emit('SUBMISSION_RECORDED', {
      total: this.stats.total,
      correct: this.stats.correct,
      accuracy: this.stats.currentAccuracy.toFixed(2),
      answer: answer.substring(0, 10), // Log only first 10 chars for privacy
      wasCorrect,
    });

    // Check for triggers
    this.checkTriggers();

    // Save to persistent storage
    this.saveStats().catch((err) =>
      this.emit('STORAGE_ERROR', { error: err.message })
    );
  }

  /**
   * Registriere übersprungenes Captcha
   */
  public recordSkipped(): void {
    this.stats.total++;
    this.stats.skipped++;
    this.stats.lastUpdate = Date.now();

    this.emit('CAPTCHA_SKIPPED', {
      total: this.stats.total,
      skipped: this.stats.skipped,
    });

    this.checkTriggers();
    this.saveStats().catch((err) =>
      this.emit('STORAGE_ERROR', { error: err.message })
    );
  }

  /**
   * Prüfe auf Auto-Stop Trigger
   */
  private checkTriggers(): void {
    // Trigger 1: Last 10 Ergebnisse unter 95%
    if (this.stats.last10Results.length >= 10) {
      const last10Accuracy =
        (this.stats.last10Results.filter((r) => r).length / 10) * 100;

      if (last10Accuracy < 95) {
        this.emit('WARNING_ACCURACY_DROP', {
          last10Accuracy: last10Accuracy.toFixed(2),
          threshold: 95,
          results: this.stats.last10Results,
        });

        // Wenn länger als 2 Runden unter 95%, dann Emergency Stop
        if (last10Accuracy < 85) {
          this.triggerEmergencyStop(
            `Last 10 accuracy critical: ${last10Accuracy.toFixed(2)}%`
          );
        }
      }
    }

    // Trigger 2: Gesamtgenauigkeit unter 90%
    if (this.stats.total >= 20 && this.stats.currentAccuracy < 90) {
      this.triggerEmergencyStop(
        `Overall accuracy below 90%: ${this.stats.currentAccuracy.toFixed(2)}%`
      );
    }

    // Trigger 3: Zu viele aufeinanderfolgende Fehler
    if (this.stats.consecutiveErrors >= this.stats.maxConsecutiveErrors) {
      this.triggerEmergencyStop(
        `${this.stats.maxConsecutiveErrors} consecutive errors detected`
      );
    }

    // Trigger 4: Skipped rate zu hoch
    if (this.stats.total >= 10) {
      const skippedRate = (this.stats.skipped / this.stats.total) * 100;
      if (skippedRate > 30) {
        this.emit('WARNING_SKIP_RATE_HIGH', {
          skippedRate: skippedRate.toFixed(2),
          total: this.stats.total,
          skipped: this.stats.skipped,
        });
      }
    }
  }

  /**
   * Trigger Emergency Stop
   */
  private triggerEmergencyStop(reason: string): void {
    if (this.shouldStop) return; // Already stopped

    this.shouldStop = true;
    this.emit('EMERGENCY_STOP', {
      reason,
      stats: this.getStats(),
      timestamp: new Date().toISOString(),
    });

    // Save final stats
    this.saveStats().catch((err) =>
      console.error('Failed to save final stats:', err)
    );
  }

  /**
   * Pause Tracking (lädt aber weiter auf)
   */
  public pause(): void {
    this.isPaused = true;
    this.emit('TRACKER_PAUSED', { stats: this.getStats() });
  }

  /**
   * Resume Tracking
   */
  public resume(): void {
    if (this.shouldStop) {
      this.emit('CANNOT_RESUME', { reason: 'Emergency stop active' });
      return;
    }
    this.isPaused = false;
    this.emit('TRACKER_RESUMED', { stats: this.getStats() });
  }

  /**
   * Reset Tracking (neuer Session)
   */
  public reset(): void {
    this.stats = {
      total: 0,
      correct: 0,
      skipped: 0,
      currentAccuracy: 100.0,
      last10Results: [],
      hourlyAccuracy: [],
      sessionStart: Date.now(),
      lastUpdate: Date.now(),
      consecutiveErrors: 0,
      maxConsecutiveErrors: 5,
    };
    this.shouldStop = false;
    this.isPaused = false;
    this.emit('TRACKER_RESET', { timestamp: new Date().toISOString() });
  }

  /**
   * Get aktuellen Stats
   */
  public getStats() {
    const sessionDurationMs = Date.now() - this.stats.sessionStart;
    const sessionDurationMin = Math.round(sessionDurationMs / 60000);

    return {
      total: this.stats.total,
      correct: this.stats.correct,
      skipped: this.stats.skipped,
      currentAccuracy: this.stats.currentAccuracy.toFixed(2),
      last10Results: this.stats.last10Results,
      last10Accuracy:
        this.stats.last10Results.length > 0
          ? (
              (this.stats.last10Results.filter((r) => r).length /
                this.stats.last10Results.length) *
              100
            ).toFixed(2)
          : 'N/A',
      consecutiveErrors: this.stats.consecutiveErrors,
      status: this.shouldStop
        ? 'STOPPED'
        : this.isPaused
          ? 'PAUSED'
          : 'RUNNING',
      sessionDurationMinutes: sessionDurationMin,
      sessionStart: new Date(this.stats.sessionStart).toISOString(),
      lastUpdate: new Date(this.stats.lastUpdate).toISOString(),
    };
  }

  /**
   * Get detailed hourly report
   */
  public getHourlyReport() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentStats = this.stats.hourlyAccuracy.filter(
      (s) => s.timestamp > oneHourAgo
    );

    return {
      lastHourEntries: recentStats.length,
      hourlyAccuracies: recentStats.map((s) => ({
        time: new Date(s.timestamp).toISOString(),
        accuracy: s.accuracy.toFixed(2),
      })),
      averageLastHour:
        recentStats.length > 0
          ? (
              recentStats.reduce((sum, s) => sum + s.accuracy, 0) /
              recentStats.length
            ).toFixed(2)
          : 'N/A',
    };
  }

  /**
   * Save stats to JSON file
   */
  private async saveStats(): Promise<void> {
    try {
      const statsToSave = {
        ...this.stats,
        savedAt: new Date().toISOString(),
      };
      await fs.writeFile(
        this.persistencePath,
        JSON.stringify(statsToSave, null, 2)
      );
    } catch (error) {
      this.emit('STORAGE_ERROR', {
        operation: 'save',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Load stats from JSON file
   */
  private async loadStats(): Promise<void> {
    try {
      const data = await fs.readFile(this.persistencePath, 'utf-8');
      const loaded = JSON.parse(data);
      if (loaded && typeof loaded === 'object') {
        this.stats = {
          total: loaded.total || 0,
          correct: loaded.correct || 0,
          skipped: loaded.skipped || 0,
          currentAccuracy: loaded.currentAccuracy || 100.0,
          last10Results: loaded.last10Results || [],
          hourlyAccuracy: loaded.hourlyAccuracy || [],
          sessionStart: loaded.sessionStart || Date.now(),
          lastUpdate: loaded.lastUpdate || Date.now(),
          consecutiveErrors: loaded.consecutiveErrors || 0,
          maxConsecutiveErrors: 5,
        };
        this.emit('STATS_LOADED', { loaded: true });
      }
    } catch (error) {
      // File doesn't exist yet, that's OK
      if (
        error instanceof Error &&
        !error.message.includes('ENOENT')
      ) {
        this.emit('STORAGE_ERROR', {
          operation: 'load',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Check if worker should continue
   */
  public canContinue(): boolean {
    return !this.shouldStop;
  }

  /**
   * Get status string
   */
  public getStatusString(): string {
    const stats = this.getStats();
    return (
      `[${stats.status}] Accuracy: ${stats.currentAccuracy}% ` +
      `(${stats.correct}/${stats.total}) | Last 10: ${stats.last10Accuracy}% | ` +
      `Consecutive errors: ${stats.consecutiveErrors}`
    );
  }
}

export default AccuracyTracker;
