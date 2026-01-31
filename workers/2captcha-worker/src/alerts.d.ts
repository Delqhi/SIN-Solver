declare module './alerts' {
  export class AlertSystem extends import('events').EventEmitter {
    constructor(config?: unknown);
    sendAlert(priority: 'info' | 'warning' | 'critical', type: string, message: string, data?: Record<string, unknown>): void;
    workerStarted?: (details?: Record<string, unknown>) => void;
    workerStopped?: (details?: Record<string, unknown>) => void;
    errorAlert?: (error: Error, context?: Record<string, unknown>) => void;
    timeoutWarning?: (context?: Record<string, unknown>) => void;
    consecutiveFailures?: (count: number) => void;
    emergencyStop?: (message: string) => void;
    accuracyWarning?: (message: string) => void;
    sendSlack?: (message: string) => Promise<void>;
    sendTelegram?: (message: string) => Promise<void>;
  }
}
