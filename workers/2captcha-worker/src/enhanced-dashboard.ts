import { EventEmitter } from 'events';
import * as http from 'http';

const WebSocket = require('ws');

interface DashboardConfig {
  port: number;
  wsPort: number;
}

export class EnhancedDashboard extends EventEmitter {
  private server: http.Server | null = null;
  private wss: any = null;
  private config: DashboardConfig;

  constructor(config?: Partial<DashboardConfig>) {
    super();
    this.config = {
      port: 3000,
      wsPort: 3001,
      ...config
    };
  }

  async start(): Promise<void> {
    this.server = http.createServer((req, res) => {
      res.writeHead(200);
      res.end('Dashboard OK');
    });

    this.server.listen(this.config.port);

    this.wss = new WebSocket.Server({ port: this.config.wsPort });
    
    this.wss.on('connection', (ws: any) => {
      ws.send(JSON.stringify({ type: 'connected' }));
    });

    console.log(`Dashboard started on port ${this.config.port}`);
    console.log(`WebSocket on port ${this.config.wsPort}`);
  }

  async stop(): Promise<void> {
    if (this.wss) this.wss.close();
    if (this.server) this.server.close();
  }
}

export function createDashboard(config?: Partial<DashboardConfig>): EnhancedDashboard {
  return new EnhancedDashboard(config);
}
