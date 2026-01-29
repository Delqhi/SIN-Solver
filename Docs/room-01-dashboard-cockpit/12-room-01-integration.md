# Room-01 Dashboard Cockpit - Integration

## Integration Guide

This document describes how to integrate the Room-01 Dashboard Cockpit with other systems and services.

---

## Integration Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION LANDSCAPE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ROOM-01 DASHBOARD                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│         ┌────────────────────┼────────────────────┐                        │
│         │                    │                    │                        │
│         ▼                    ▼                    ▼                        │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                   │
│  │  INTERNAL    │   │  EXTERNAL    │   │   CLOUD      │                   │
│  │  SERVICES    │   │  SERVICES    │   │  SERVICES    │                   │
│  │              │   │              │   │              │                   │
│  │ • n8n        │   │ • GitHub     │   │ • Cloudflare │                   │
│  │ • Steel      │   │ • Slack      │   │ • AWS        │                   │
│  │ • Skyvern    │   │ • Discord    │   │ • GCP        │                   │
│  │ • Postgres   │   │ • Telegram   │   │ • Azure      │                   │
│  │ • Redis      │   │ • Email      │   │              │                   │
│  │ • Vault      │   │              │   │              │                   │
│  └──────────────┘   └──────────────┘   └──────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Internal Service Integration

### n8n Integration

#### Configuration

```javascript
// lib/integrations/n8n.js
const N8N_URL = process.env.N8N_URL || 'http://agent-01-n8n-manager:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;

export async function getWorkflows() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY
    }
  });
  return response.json();
}

export async function executeWorkflow(workflowId, data) {
  const response = await fetch(
    `${N8N_URL}/api/v1/workflows/${workflowId}/execute`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY
      },
      body: JSON.stringify(data)
    }
  );
  return response.json();
}
```

#### Embedding n8n

```javascript
// components/Integrations/N8nEmbed.js
export function N8nEmbed() {
  return (
    <iframe
      src="http://agent-01-n8n-manager:5678"
      width="100%"
      height="100%"
      style={{ border: 'none' }}
      title="n8n Workflow Editor"
    />
  );
}
```

---

### Steel Browser Integration

#### CDP Connection

```javascript
// lib/integrations/steel.js
const STEEL_URL = process.env.STEEL_URL || 'http://agent-05-steel-browser:3000';

export async function getBrowserStatus() {
  const response = await fetch(`${STEEL_URL}/json/version`);
  return response.json();
}

export async function createBrowserSession() {
  const response = await fetch(`${STEEL_URL}/json/new`);
  return response.json();
}

export async function closeBrowserSession(sessionId) {
  await fetch(`${STEEL_URL}/json/close/${sessionId}`);
}
```

#### Remote View

```javascript
// components/Integrations/SteelRemoteView.js
export function SteelRemoteView({ sessionId }) {
  return (
    <iframe
      src={`http://agent-05-steel-browser:3000?session=${sessionId}`}
      width="100%"
      height="600px"
      style={{ border: '1px solid #ccc', borderRadius: '8px' }}
      title="Steel Browser Remote View"
    />
  );
}
```

---

### Skyvern Integration

#### API Client

```javascript
// lib/integrations/skyvern.js
const SKYVERN_URL = process.env.SKYVERN_URL || 'http://agent-06-skyvern-solver:8000';

export async function createTask(url, prompt) {
  const response = await fetch(`${SKYVERN_URL}/api/v1/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, prompt })
  });
  return response.json();
}

export async function getTaskStatus(taskId) {
  const response = await fetch(`${SKYVERN_URL}/api/v1/tasks/${taskId}`);
  return response.json();
}
```

---

### Database Integration

#### PostgreSQL

```javascript
// lib/db/postgres.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function query(sql, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Usage
const containers = await query(
  'SELECT * FROM containers WHERE status = $1',
  ['running']
);
```

#### Redis

```javascript
// lib/db/redis.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function cacheContainerStats(containerId, stats) {
  await redis.setex(
    `container:stats:${containerId}`,
    5,  // TTL in seconds
    JSON.stringify(stats)
  );
}

export async function getCachedContainerStats(containerId) {
  const cached = await redis.get(`container:stats:${containerId}`);
  return cached ? JSON.parse(cached) : null;
}
```

---

## External Service Integration

### GitHub Integration

#### OAuth Setup

```javascript
// app/api/auth/github/route.js
import { Octokit } from '@octokit/rest';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  
  // Exchange code for token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    })
  });
  
  const { access_token } = await tokenResponse.json();
  
  // Get user info
  const octokit = new Octokit({ auth: access_token });
  const { data: user } = await octokit.rest.users.getAuthenticated();
  
  // Create session
  // ...
  
  return Response.redirect('/dashboard');
}
```

#### Repository Webhooks

```javascript
// app/api/webhooks/github/route.js
import { verify } from '@octokit/webhooks-methods';

export async function POST(req) {
  const signature = req.headers.get('x-hub-signature-256');
  const body = await req.text();
  
  // Verify webhook signature
  const isValid = await verify(
    process.env.GITHUB_WEBHOOK_SECRET,
    body,
    signature
  );
  
  if (!isValid) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const event = JSON.parse(body);
  
  // Handle different events
  switch (req.headers.get('x-github-event')) {
    case 'push':
      await handlePushEvent(event);
      break;
    case 'pull_request':
      await handlePullRequestEvent(event);
      break;
  }
  
  return Response.json({ received: true });
}
```

---

### Slack Integration

#### Incoming Webhooks

```javascript
// lib/integrations/slack.js
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function sendSlackNotification(message) {
  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: message,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Dashboard Alert'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message
          }
        }
      ]
    })
  });
}

// Usage
await sendSlackNotification('Container agent-01-n8n-manager has stopped unexpectedly');
```

#### Slash Commands

```javascript
// app/api/slack/command/route.js
export async function POST(req) {
  const data = await req.formData();
  const command = data.get('command');
  const text = data.get('text');
  
  switch (command) {
    case '/container-status':
      return handleContainerStatusCommand(text);
    case '/restart-container':
      return handleRestartContainerCommand(text);
    default:
      return Response.json({ text: 'Unknown command' });
  }
}
```

---

### Telegram Integration

#### Bot Setup

```javascript
// lib/integrations/telegram.js
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramMessage(message) {
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    }
  );
}

// Webhook handler
export async function handleTelegramWebhook(update) {
  if (update.message?.text === '/status') {
    const status = await getSystemStatus();
    await sendTelegramMessage(`*System Status*\n\n${status}`);
  }
}
```

---

## Cloud Service Integration

### Cloudflare Integration

#### Tunnel Management

```bash
# Start Cloudflare tunnel
cloudflared tunnel run room-01-dashboard

# Or with Docker
docker run -d \
  --name cloudflared \
  cloudflare/cloudflared:latest \
  tunnel --no-autoupdate run --token ${TUNNEL_TOKEN}
```

#### API Integration

```javascript
// lib/integrations/cloudflare.js
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;

export async function listDNSRecords() {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`,
    {
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.json();
}
```

---

### AWS Integration

#### S3 for Backups

```javascript
// lib/integrations/aws.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export async function uploadBackup(fileBuffer, filename) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_BACKUP_BUCKET,
    Key: `backups/${filename}`,
    Body: fileBuffer
  }));
}
```

---

## API Integration Patterns

### REST API Client

```javascript
// lib/api/client.js
class ApiClient {
  constructor(baseURL, options = {}) {
    this.baseURL = baseURL;
    this.headers = options.headers || {};
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
  
  get(endpoint) {
    return this.request(endpoint);
  }
  
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
}

export const apiBrainClient = new ApiClient(
  process.env.API_BRAIN_URL,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

### WebSocket Integration

```javascript
// lib/websocket/client.js
export class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectInterval = 5000;
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.onMessage?.(data);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(() => this.connect(), this.reconnectInterval);
    };
  }
  
  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  disconnect() {
    this.ws?.close();
  }
}
```

---

## Authentication Integration

### OAuth 2.0 Flow

```javascript
// lib/auth/oauth.js
export async function initiateOAuth(provider) {
  const state = generateRandomState();
  
  const params = new URLSearchParams({
    client_id: process.env[`${provider}_CLIENT_ID`],
    redirect_uri: `${process.env.APP_URL}/api/auth/${provider}/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state
  });
  
  // Store state in session
  await storeOAuthState(state);
  
  return `https://${provider}.com/oauth/authorize?${params}`;
}

export async function handleOAuthCallback(provider, code, state) {
  // Verify state
  await verifyOAuthState(state);
  
  // Exchange code for token
  const tokenResponse = await fetch(`https://${provider}.com/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env[`${provider}_CLIENT_ID`],
      client_secret: process.env[`${provider}_CLIENT_SECRET`],
      code,
      redirect_uri: `${process.env.APP_URL}/api/auth/${provider}/callback`
    })
  });
  
  const { access_token } = await tokenResponse.json();
  
  // Get user info
  const userResponse = await fetch(`https://${provider}.com/api/user`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  
  return userResponse.json();
}
```

---

## Integration Testing

```javascript
// tests/integration/integrations.test.js
describe('Integration Tests', () => {
  describe('n8n', () => {
    it('fetches workflows', async () => {
      const workflows = await getWorkflows();
      expect(workflows).toBeDefined();
      expect(Array.isArray(workflows.data)).toBe(true);
    });
  });
  
  describe('Steel Browser', () => {
    it('gets browser status', async () => {
      const status = await getBrowserStatus();
      expect(status.Browser).toBe('Chrome/HeadlessShell');
    });
  });
  
  describe('Slack', () => {
    it('sends notification', async () => {
      await expect(
        sendSlackNotification('Test message')
      ).resolves.not.toThrow();
    });
  });
});
```

---

## Related Documentation

- [05-api-reference.md](./05-room-01-api-reference.md) - API documentation
- [08-security.md](./08-room-01-security.md) - Security considerations
- [12-integration.md](./12-room-01-integration.md) - More integration details
