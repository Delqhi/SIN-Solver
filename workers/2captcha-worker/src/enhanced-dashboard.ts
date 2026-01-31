import { EventEmitter } from 'events';
import * as http from 'http';
import * as WebSocket from 'ws';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import * as puppeteer from 'puppeteer';
import * as cron from 'node-cron';

interface DashboardUser {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'operator' | 'viewer';
  permissions: string[];
}

interface DashboardConfig {
  port: number;
  wsPort: number;
  jwtSecret: string;
  sessionTimeout: number;
  enableAuth: boolean;
}

interface RealtimeMetrics {
  timestamp: number;
  activeWorkers: number;
  solvedToday: number;
  successRate: number;
  avgSolveTime: number;
  queueLength: number;
  errorsLastHour: number;
}

interface ScheduledReport {
  id: string;
  name: string;
  schedule: string;
  recipients: string[];
  format: 'pdf' | 'html' | 'json';
  lastRun?: number;
  nextRun: number;
  enabled: boolean;
}

export class EnhancedDashboard extends EventEmitter {
  private server: http.Server | null = null;
  private wss: WebSocket.Server | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private users: Map<string, DashboardUser> = new Map();
  private sessions: Map<string, { userId: string; expires: number }> = new Map();
  private reports: Map<string, ScheduledReport> = new Map();
  private metrics: RealtimeMetrics;
  private config: DashboardConfig;

  constructor(config?: Partial<DashboardConfig>) {
    super();
    this.config = {
      port: 3000,
      wsPort: 3001,
      jwtSecret: process.env.DASHBOARD_JWT_SECRET || 'change-me-in-production',
      sessionTimeout: 24 * 60 * 60 * 1000,
      enableAuth: true,
      ...config
    };

    this.metrics = {
      timestamp: Date.now(),
      activeWorkers: 0,
      solvedToday: 0,
      successRate: 0,
      avgSolveTime: 0,
      queueLength: 0,
      errorsLastHour: 0
    };

    this.initializeDefaultUsers();
    this.initializeScheduledReports();
  }

  private initializeDefaultUsers(): void {
    this.users.set('admin', {
      id: 'admin',
      username: 'admin',
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      permissions: ['*']
    });

    this.users.set('operator', {
      id: 'operator',
      username: 'operator',
      passwordHash: bcrypt.hashSync('operator123', 10),
      role: 'operator',
      permissions: ['view', 'control', 'reports']
    });

    this.users.set('viewer', {
      id: 'viewer',
      username: 'viewer',
      passwordHash: bcrypt.hashSync('viewer123', 10),
      role: 'viewer',
      permissions: ['view']
    });
  }

  private initializeScheduledReports(): void {
    const dailyReport: ScheduledReport = {
      id: 'daily',
      name: 'Daily Performance Report',
      schedule: '0 9 * * *',
      recipients: ['admin@delqhi.com'],
      format: 'pdf',
      nextRun: this.getNextCronRun('0 9 * * *'),
      enabled: true
    };

    const weeklyReport: ScheduledReport = {
      id: 'weekly',
      name: 'Weekly Summary Report',
      schedule: '0 9 * * 1',
      recipients: ['admin@delqhi.com', 'manager@delqhi.com'],
      format: 'pdf',
      nextRun: this.getNextCronRun('0 9 * * 1'),
      enabled: true
    };

    this.reports.set(dailyReport.id, dailyReport);
    this.reports.set(weeklyReport.id, weeklyReport);

    this.startReportScheduler();
  }

  private getNextCronRun(schedule: string): number {
    const task = cron.schedule(schedule, () => {}, { scheduled: false });
    return Date.now() + 24 * 60 * 60 * 1000;
  }

  /**
   * Start dashboard server with WebSocket
   */
  async start(): Promise<void> {
    await this.startHTTPServer();
    await this.startWebSocketServer();
    this.startMetricsBroadcast();
    console.log(`🚀 Dashboard started on port ${this.config.port}`);
    console.log(`📡 WebSocket server on port ${this.config.wsPort}`);
  }

  private async startHTTPServer(): Promise<void> {
    this.server = http.createServer((req, res) => {
      this.handleHTTPRequest(req, res);
    });

    this.server.listen(this.config.port);
  }

  private async startWebSocketServer(): Promise<void> {
    this.wss = new WebSocket.Server({ port: this.config.wsPort });

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateId();
      this.clients.set(clientId, ws);

      console.log(`🔌 Client connected: ${clientId}`);

      ws.on('message', (message) => {
        this.handleWebSocketMessage(clientId, message.toString());
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`🔌 Client disconnected: ${clientId}`);
      });

      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        metrics: this.metrics
      }));
    });
  }

  private handleHTTPRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;

    if (path === '/api/login' && req.method === 'POST') {
      this.handleLogin(req, res);
    } else if (path === '/api/logout' && req.method === 'POST') {
      this.handleLogout(req, res);
    } else if (path === '/api/metrics' && req.method === 'GET') {
      this.handleGetMetrics(req, res);
    } else if (path === '/api/reports' && req.method === 'GET') {
      this.handleGetReports(req, res);
    } else if (path === '/api/reports' && req.method === 'POST') {
      this.handleCreateReport(req, res);
    } else if (path === '/api/export/pdf' && req.method === 'GET') {
      this.handleExportPDF(req, res);
    } else if (path === '/') {
      this.serveDashboardHTML(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }

  private handleLogin(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body);
        const user = this.users.get(username);

        if (user && bcrypt.compareSync(password, user.passwordHash)) {
          const token = jwt.sign(
            { userId: user.id, role: user.role },
            this.config.jwtSecret,
            { expiresIn: '24h' }
          );

          const sessionId = this.generateId();
          this.sessions.set(sessionId, {
            userId: user.id,
            expires: Date.now() + this.config.sessionTimeout
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            token,
            sessionId,
            user: {
              id: user.id,
              username: user.username,
              role: user.role,
              permissions: user.permissions
            }
          }));
        } else {
          res.writeHead(401);
          res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
        }
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
      }
    });
  }

  private handleLogout(req: http.IncomingMessage, res: http.ServerResponse): void {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, this.config.jwtSecret) as any;
        for (const [sessionId, session] of this.sessions) {
          if (session.userId === decoded.userId) {
            this.sessions.delete(sessionId);
            break;
          }
        }
      } catch (error) {
        // Invalid token, ignore
      }
    }

    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  }

  private handleGetMetrics(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!this.isAuthenticated(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.metrics));
  }

  private handleGetReports(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!this.isAuthenticated(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const reports = Array.from(this.reports.values());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(reports));
  }

  private handleCreateReport(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!this.isAuthenticated(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const reportData = JSON.parse(body);
        const report: ScheduledReport = {
          id: this.generateId(),
          ...reportData,
          nextRun: this.getNextCronRun(reportData.schedule),
          enabled: true
        };

        this.reports.set(report.id, report);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
  }

  private async handleExportPDF(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (!this.isAuthenticated(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      const html = this.generateReportHTML();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });

      await browser.close();

      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=report.pdf'
      });
      res.end(pdf);
    } catch (error) {
      console.error('PDF export failed:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'PDF generation failed' }));
    }
  }

  private serveDashboardHTML(res: http.ServerResponse): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>SIN-Solver Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 20px;
      border-bottom: 2px solid #0f3460;
    }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .header .status { color: #4CAF50; font-size: 14px; }
    .container { padding: 20px; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #0f3460;
    }
    .metric-card h3 {
      font-size: 14px;
      color: #888;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #4CAF50;
    }
    .metric-value.warning { color: #ff9800; }
    .metric-value.error { color: #f44336; }
    .actions {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .btn {
      background: #0f3460;
      color: #fff;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s;
    }
    .btn:hover { background: #1a4a7a; }
    .btn.primary { background: #4CAF50; }
    .btn.primary:hover { background: #45a049; }
    #ws-status {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }
    #ws-status.connected { background: #4CAF50; }
    #ws-status.disconnected { background: #f44336; }
  </style>
</head>
<body>
  <div id="ws-status" class="disconnected">● Disconnected</div>
  
  <div class="header">
    <h1>🚀 SIN-Solver Dashboard</h1>
    <div class="status">Real-time CAPTCHA Solving Monitor</div>
  </div>

  <div class="container">
    <div class="actions">
      <button class="btn primary" onclick="exportPDF()">📄 Export PDF</button>
      <button class="btn" onclick="refreshMetrics()">🔄 Refresh</button>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <h3>Active Workers</h3>
        <div class="metric-value" id="active-workers">0</div>
      </div>
      <div class="metric-card">
        <h3>Solved Today</h3>
        <div class="metric-value" id="solved-today">0</div>
      </div>
      <div class="metric-card">
        <h3>Success Rate</h3>
        <div class="metric-value" id="success-rate">0%</div>
      </div>
      <div class="metric-card">
        <h3>Avg Solve Time</h3>
        <div class="metric-value" id="avg-time">0ms</div>
      </div>
      <div class="metric-card">
        <h3>Queue Length</h3>
        <div class="metric-value" id="queue-length">0</div>
      </div>
      <div class="metric-card">
        <h3>Errors (1h)</h3>
        <div class="metric-value" id="errors-hour">0</div>
      </div>
    </div>
  </div>

  <script>
    const ws = new WebSocket('ws://localhost:3001');
    const statusEl = document.getElementById('ws-status');

    ws.onopen = () => {
      statusEl.textContent = '● Connected';
      statusEl.className = 'connected';
    };

    ws.onclose = () => {
      statusEl.textContent = '● Disconnected';
      statusEl.className = 'disconnected';
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'metrics') {
        updateMetrics(data.metrics);
      }
    };

    function updateMetrics(metrics) {
      document.getElementById('active-workers').textContent = metrics.activeWorkers;
      document.getElementById('solved-today').textContent = metrics.solvedToday;
      document.getElementById('success-rate').textContent = metrics.successRate + '%';
      document.getElementById('avg-time').textContent = Math.round(metrics.avgSolveTime) + 'ms';
      document.getElementById('queue-length').textContent = metrics.queueLength;
      document.getElementById('errors-hour').textContent = metrics.errorsLastHour;
    }

    function exportPDF() {
      window.open('/api/export/pdf', '_blank');
    }

    function refreshMetrics() {
      fetch('/api/metrics')
        .then(r => r.json())
        .then(updateMetrics);
    }

    refreshMetrics();
  </script>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  private handleWebSocketMessage(clientId: string, message: string): void {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe') {
        const client = this.clients.get(clientId);
        if (client) {
          client.send(JSON.stringify({
            type: 'subscribed',
            channel: data.channel
          }));
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  }

  private startMetricsBroadcast(): void {
    setInterval(() => {
      this.broadcastMetrics();
    }, 5000);
  }

  private broadcastMetrics(): void {
    const message = JSON.stringify({
      type: 'metrics',
      metrics: this.metrics
    });

    for (const [clientId, client] of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  private startReportScheduler(): void {
    cron.schedule('* * * * *', () => {
      const now = Date.now();
      for (const report of this.reports.values()) {
        if (report.enabled && report.nextRun <= now) {
          this.generateReport(report);
          report.lastRun = now;
          report.nextRun = this.getNextCronRun(report.schedule);
        }
      }
    });
  }

  private async generateReport(report: ScheduledReport): Promise<void> {
    console.log(`📊 Generating report: ${report.name}`);
    
    this.emit('report:generated', {
      reportId: report.id,
      name: report.name,
      format: report.format,
      timestamp: Date.now()
    });
  }

  private generateReportHTML(): string {
    return `
      <html>
        <body>
          <h1>SIN-Solver Performance Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <hr/>
          <h2>Metrics</h2>
          <ul>
            <li>Active Workers: ${this.metrics.activeWorkers}</li>
            <li>Solved Today: ${this.metrics.solvedToday}</li>
            <li>Success Rate: ${this.metrics.successRate}%</li>
            <li>Avg Solve Time: ${this.metrics.avgSolveTime}ms</li>
          </ul>
        </body>
      </html>
    `;
  }

  private isAuthenticated(req: http.IncomingMessage): boolean {
    if (!this.config.enableAuth) return true;

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return false;

    try {
      jwt.verify(token, this.config.jwtSecret);
      return true;
    } catch (error) {
      return false;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Update metrics (called by external systems)
   */
  updateMetrics(metrics: Partial<RealtimeMetrics>): void {
    this.metrics = { ...this.metrics, ...metrics, timestamp: Date.now() };
    this.broadcastMetrics();
  }

  /**
   * Stop dashboard server
   */
  async stop(): Promise<void> {
    if (this.wss) {
      this.wss.close();
    }
    if (this.server) {
      this.server.close();
    }
  }
}

export function createDashboard(config?: Partial<DashboardConfig>): EnhancedDashboard {
  return new EnhancedDashboard(config);
}
