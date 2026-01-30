import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

export interface WorkerStats {
  accuracy: number;
  captchasSolvedToday: number;
  earningsEstimate: number;
  successRate: number;
  recentSubmissions: Submission[];
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastUpdate: string;
}

export interface Submission {
  id: string;
  timestamp: string;
  captchaType: string;
  result: 'success' | 'failed';
  reward: number;
  duration: number;
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

class WorkerStatsStore {
  private stats: WorkerStats = {
    accuracy: 98.5,
    captchasSolvedToday: 0,
    earningsEstimate: 0,
    successRate: 98.5,
    recentSubmissions: [],
    connectionStatus: 'connected',
    lastUpdate: new Date().toISOString(),
  };

  private alerts: Alert[] = [];
  private clients: Set<WebSocket> = new Set();

  addSubmission(submission: Submission) {
    this.stats.recentSubmissions.unshift(submission);
    if (this.stats.recentSubmissions.length > 100) {
      this.stats.recentSubmissions.pop();
    }

    this.stats.captchasSolvedToday++;
    this.stats.earningsEstimate += submission.reward;

    // Update accuracy
    const total = this.stats.recentSubmissions.length;
    const successful = this.stats.recentSubmissions.filter(s => s.result === 'success').length;
    this.stats.accuracy = total > 0 ? (successful / total) * 100 : 100;
    this.stats.successRate = this.stats.accuracy;
    this.stats.lastUpdate = new Date().toISOString();

    // Check alerts
    this.checkAlerts();

    this.broadcast();
  }

  private checkAlerts() {
    const now = new Date().toISOString();

    if (this.stats.accuracy < 90) {
      this.addAlert({
        id: `emergency-${now}`,
        type: 'error',
        message: `EMERGENCY: Accuracy dropped to ${this.stats.accuracy.toFixed(1)}%. Worker stopped!`,
        timestamp: now,
        acknowledged: false,
      });
    } else if (this.stats.accuracy < 95) {
      this.addAlert({
        id: `warning-${now}`,
        type: 'warning',
        message: `WARNING: Accuracy at ${this.stats.accuracy.toFixed(1)}%. Monitor closely!`,
        timestamp: now,
        acknowledged: false,
      });
    }
  }

  addAlert(alert: Alert) {
    // Don't add duplicate alerts
    const exists = this.alerts.some(a => a.message === alert.message && !a.acknowledged);
    if (!exists) {
      this.alerts.unshift(alert);
      if (this.alerts.length > 50) {
        this.alerts.pop();
      }
      this.broadcast();
    }
  }

  acknowledgeAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.broadcast();
    }
  }

  setConnectionStatus(status: WorkerStats['connectionStatus']) {
    if (this.stats.connectionStatus !== status) {
      this.stats.connectionStatus = status;
      
      if (status === 'error') {
        this.addAlert({
          id: `conn-error-${Date.now()}`,
          type: 'error',
          message: 'Connection error detected. Check worker status!',
          timestamp: new Date().toISOString(),
          acknowledged: false,
        });
      }

      this.broadcast();
    }
  }

  addClient(ws: WebSocket) {
    this.clients.add(ws);
    
    // Send current state immediately
    ws.send(JSON.stringify({
      type: 'stats',
      data: this.stats,
    }));
    
    ws.send(JSON.stringify({
      type: 'alerts',
      data: this.alerts,
    }));

    ws.on('close', () => {
      this.clients.delete(ws);
    });
  }

  private broadcast() {
    const statsMessage = JSON.stringify({
      type: 'stats',
      data: this.stats,
    });

    const alertsMessage = JSON.stringify({
      type: 'alerts',
      data: this.alerts,
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(statsMessage);
        client.send(alertsMessage);
      }
    });
  }

  getStats(): WorkerStats {
    return { ...this.stats };
  }

  getAlerts(): Alert[] {
    return [...this.alerts];
  }
}

export const statsStore = new WorkerStatsStore();

export function startWebSocketServer(port: number = 3001) {
  const server = createServer();
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('Dashboard client connected');
    statsStore.addClient(ws);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'acknowledge_alert') {
          statsStore.acknowledgeAlert(data.alertId);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });
  });

  server.listen(port, () => {
    console.log(`WebSocket server running on port ${port}`);
  });

  // Simulate some data for testing
  setInterval(() => {
    if (Math.random() > 0.7) {
      const types = ['text', 'image', 'slider', 'audio'];
      const success = Math.random() > 0.02;
      
      statsStore.addSubmission({
        id: `sub-${Date.now()}`,
        timestamp: new Date().toISOString(),
        captchaType: types[Math.floor(Math.random() * types.length)],
        result: success ? 'success' : 'failed',
        reward: success ? 0.002 : 0,
        duration: Math.floor(Math.random() * 5000) + 1000,
      });
    }
  }, 5000);

  return { server, wss };
}
