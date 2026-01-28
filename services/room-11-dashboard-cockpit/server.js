const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' http://localhost:8080 http://localhost:8018 https://*.delqhi.com wss://*.delqhi.com; " +
    "frame-src 'self' https://*.delqhi.com; " +
    "frame-ancestors 'self'"
  );
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.setHeader('Content-Type', contentType);
    res.writeHead(200);
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  setSecurityHeaders(res);
  
  res.setHeader('Access-Control-Allow-Origin', 'https://dashboard.delqhi.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      service: 'sin-solver-dashboard',
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      security: 'headers-enabled'
    }));
    return;
  }

  if (req.url.startsWith('/api/agents')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      agents: [
        { id: 1, name: 'n8n', status: 'running', port: 5678 },
        { id: 2, name: 'chronos', status: 'running', port: 3001 },
        { id: 3, name: 'agent-zero', status: 'running', port: 8050 },
        { id: 4, name: 'opencode', status: 'running', port: 9000 },
        { id: 5, name: 'steel', status: 'stopped', port: 3005 },
        { id: 6, name: 'skyvern', status: 'stopped', port: 8030 },
        { id: 7, name: 'stagehand', status: 'running', port: 3007 },
        { id: 8, name: 'qa', status: 'running', port: 8008 },
        { id: 9, name: 'clawdbot', status: 'running', port: 8009 },
        { id: 10, name: 'postgres', status: 'running', port: 5432 },
        { id: 11, name: 'dashboard', status: 'running', port: 3011 },
        { id: 12, name: 'evolution', status: 'running', port: 8012 },
        { id: 13, name: 'api-brain', status: 'running', port: 8031 },
        { id: 14, name: 'worker', status: 'running', port: 8014 },
        { id: 15, name: 'surfsense', status: 'running', port: 6333 },
        { id: 16, name: 'supabase', status: 'running', port: 5433 },
        { id: 17, name: 'mcp', status: 'running', port: 8040 },
      ]
    }));
    return;
  }

  let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  if (!fs.existsSync(filePath) || !ext) {
    filePath = path.join(distPath, 'index.html');
  }

  const contentType = mimeTypes[path.extname(filePath)] || 'application/octet-stream';
  serveFile(res, filePath, contentType);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`SIN-Solver Dashboard running on http://0.0.0.0:${port}`);
  console.log(`Security headers: ENABLED`);
  console.log(`Serving static files from: ${distPath}`);
});
