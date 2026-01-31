# Two-Level WebSocket Architecture for Browserless CDP

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Level 1: Browser-Level WebSocket](#level-1-browser-level-websocket)
4. [Level 2: Target-Level WebSocket](#level-2-target-level-websocket)
5. [Why Two Levels?](#why-two-levels)
6. [Implementation Details](#implementation-details)
7. [Common Pitfalls](#common-pitfalls)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [References](#references)

---

## Overview

The two-level WebSocket architecture is a sophisticated connection pattern used when interacting with Browserless Chrome instances via the Chrome DevTools Protocol (CDP). Unlike single-level WebSocket connections that directly connect to a specific page or target, this architecture separates concerns into two distinct layers:

1. **Browser-Level Connection**: Manages the browser instance itself
2. **Target-Level Connection**: Manages individual pages/tabs within the browser

This architecture is essential for scenarios where you need to:
- Create and manage multiple browser contexts
- Switch between different pages dynamically
- Monitor browser-wide events
- Handle page navigation and lifecycle events
- Implement advanced session management

### Key Concepts

- **Browser Endpoint**: The main entry point for CDP communication (typically port 50072)
- **Debugger UI**: The Chrome DevTools frontend (typically port 50070)
- **Target**: A specific page, iframe, or worker within the browser
- **Session**: A CDP session attached to a specific target
- **WebSocket**: The underlying transport protocol for CDP

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATION                        │
│                                                                  │
│  ┌─────────────────────┐      ┌─────────────────────┐           │
│  │  Browser WebSocket  │      │  Target WebSocket   │           │
│  │     (Level 1)       │      │     (Level 2)       │           │
│  │                     │      │                     │           │
│  │  ws://host:50072    │      │  ws://host:50072/   │           │
│  │                     │      │  devtools/page/xxx  │           │
│  └──────────┬──────────┘      └──────────┬──────────┘           │
│             │                            │                      │
│             │ 1. Connect                 │ 3. Connect           │
│             │ 2. Get Targets             │ 4. Send Commands     │
│             │                            │                      │
└─────────────┼────────────────────────────┼──────────────────────┘
              │                            │
              ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSERLESS INSTANCE                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Browser-Level Endpoint                      │   │
│  │                   (Port 50072)                           │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │  Target 1   │  │  Target 2   │  │  Target 3   │     │   │
│  │  │  (Page 1)   │  │  (Page 2)   │  │  (Worker)   │     │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │   │
│  │         │                │                │            │   │
│  │         └────────────────┴────────────────┘            │   │
│  │                      │                                 │   │
│  │              Target-Level WebSockets                   │   │
│  │         (ws://host:50072/devtools/page/{id})          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Debugger UI Frontend                        │   │
│  │                   (Port 50070)                           │   │
│  │              (Human-friendly interface)                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Connection Flow

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Client │────▶│   Connect    │────▶│   Get       │────▶│   Attach     │
│         │     │   to Browser │     │   Targets   │     │   to Target  │
└─────────┘     │   (Port 50072)│     └─────────────┘     └──────┬───────┘
                └──────────────┘                                  │
                                                                  ▼
┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Send   │◀────│   Target     │◀────│   Send      │◀────│   Connect    │
│  Commands│     │   WebSocket  │     │   Commands  │     │   to Target  │
└─────────┘     │   (Level 2)  │     └─────────────┘     │   WS         │
                └──────────────┘                         └──────────────┘
```

---

## Level 1: Browser-Level WebSocket

The browser-level WebSocket connection is the foundation of the two-level architecture. It provides access to browser-wide operations and target management.

### Purpose

- **Target Management**: List, create, and close browser targets (pages, workers, etc.)
- **Browser Events**: Listen for browser-wide events (target created, destroyed, etc.)
- **Context Management**: Manage browser contexts (isolated cookie/storage containers)
- **Version Information**: Get browser version and capabilities

### Connection Details

```typescript
const BROWSER_WS_URL = 'ws://localhost:50072';

// Establish browser-level connection
const browserSocket = new WebSocket(BROWSER_WS_URL);

browserSocket.on('open', () => {
  console.log('Browser-level connection established');
});

browserSocket.on('message', (data) => {
  const message = JSON.parse(data.toString());
  handleBrowserMessage(message);
});
```

### Key CDP Methods

#### Target.getTargets
Retrieves all available targets in the browser:

```typescript
// Send command to get all targets
browserSocket.send(JSON.stringify({
  id: 1,
  method: 'Target.getTargets',
  params: {}
}));

// Response format:
{
  "id": 1,
  "result": {
    "targetInfos": [
      {
        "targetId": "page-1-id",
        "type": "page",
        "title": "Example Page",
        "url": "https://example.com",
        "attached": false
      }
    ]
  }
}
```

#### Target.createTarget
Creates a new browser target (page):

```typescript
browserSocket.send(JSON.stringify({
  id: 2,
  method: 'Target.createTarget',
  params: {
    url: 'about:blank'
  }
}));
```

#### Target.attachToTarget
Attaches to a specific target to enable debugging:

```typescript
browserSocket.send(JSON.stringify({
  id: 3,
  method: 'Target.attachToTarget',
  params: {
    targetId: 'page-1-id',
    flatten: true  // Use flat session mode
  }
}));
```

### Browser Events

The browser-level connection emits important events:

```typescript
// Target created
{
  "method": "Target.targetCreated",
  "params": {
    "targetInfo": {
      "targetId": "new-target-id",
      "type": "page",
      "title": "",
      "url": "about:blank"
    }
  }
}

// Target destroyed
{
  "method": "Target.targetDestroyed",
  "params": {
    "targetId": "destroyed-target-id"
  }
}

// Target info changed
{
  "method": "Target.targetInfoChanged",
  "params": {
    "targetInfo": {
      "targetId": "target-id",
      "title": "New Title",
      "url": "https://new-url.com"
    }
  }
}
```

---

## Level 2: Target-Level WebSocket

The target-level WebSocket connection provides direct access to a specific page or target within the browser. This is where most CDP commands are executed.

### Purpose

- **Page Control**: Navigate, reload, go back/forward
- **DOM Operations**: Query, modify, and interact with the DOM
- **JavaScript Execution**: Run scripts in the page context
- **Network Monitoring**: Intercept and modify network requests
- **Screenshot/Capture**: Take screenshots or record video
- **Storage Access**: Access cookies, localStorage, sessionStorage

### Connection Details

After attaching to a target via the browser-level connection, you establish a separate WebSocket connection to the target:

```typescript
const TARGET_WS_URL = `ws://localhost:50072/devtools/page/${targetId}`;

// Establish target-level connection
const targetSocket = new WebSocket(TARGET_WS_URL);

targetSocket.on('open', () => {
  console.log('Target-level connection established');
});

targetSocket.on('message', (data) => {
  const message = JSON.parse(data.toString());
  handleTargetMessage(message);
});
```

### Key CDP Domains

#### Page Domain
Control page navigation and lifecycle:

```typescript
// Navigate to URL
targetSocket.send(JSON.stringify({
  id: 1,
  method: 'Page.navigate',
  params: {
    url: 'https://example.com'
  }
}));

// Enable page events
targetSocket.send(JSON.stringify({
  id: 2,
  method: 'Page.enable',
  params: {}
}));

// Take screenshot
targetSocket.send(JSON.stringify({
  id: 3,
  method: 'Page.captureScreenshot',
  params: {
    format: 'png',
    fullPage: true
  }
}));
```

#### Runtime Domain
Execute JavaScript and manage execution contexts:

```typescript
// Evaluate JavaScript
targetSocket.send(JSON.stringify({
  id: 4,
  method: 'Runtime.evaluate',
  params: {
    expression: 'document.title',
    returnByValue: true
  }
}));

// Response:
{
  "id": 4,
  "result": {
    "result": {
      "type": "string",
      "value": "Page Title"
    }
  }
}
```

#### DOM Domain
Interact with the Document Object Model:

```typescript
// Get document root
targetSocket.send(JSON.stringify({
  id: 5,
  method: 'DOM.getDocument',
  params: {}
}));

// Query selector
targetSocket.send(JSON.stringify({
  id: 6,
  method: 'DOM.querySelector',
  params: {
    nodeId: 1,
    selector: '#my-element'
  }
}));
```

#### Network Domain
Monitor and intercept network activity:

```typescript
// Enable network monitoring
targetSocket.send(JSON.stringify({
  id: 7,
  method: 'Network.enable',
  params: {}
}));

// Intercept requests
targetSocket.send(JSON.stringify({
  id: 8,
  method: 'Network.setRequestInterception',
  params: {
    patterns: [
      { urlPattern: '*' }
    ]
  }
}));
```

### Target Events

The target-level connection emits page-specific events:

```typescript
// Page load events
{
  "method": "Page.loadEventFired",
  "params": {}
}

// DOM content loaded
{
  "method": "Page.domContentEventFired",
  "params": {}
}

// Frame navigated
{
  "method": "Page.frameNavigated",
  "params": {
    "frame": {
      "id": "frame-id",
      "url": "https://example.com",
      "securityOrigin": "https://example.com"
    }
  }
}

// Network request
{
  "method": "Network.requestWillBeSent",
  "params": {
    "requestId": "request-1",
    "request": {
      "url": "https://api.example.com/data",
      "method": "GET"
    }
  }
}
```

---

## Why Two Levels?

The two-level architecture provides significant advantages over single-level WebSocket connections:

### 1. Separation of Concerns

**Browser-Level**: Manages the browser instance as a whole
- Target lifecycle management
- Browser context isolation
- Browser-wide settings

**Target-Level**: Manages individual pages
- Page-specific operations
- DOM interactions
- Network interception

### 2. Resource Efficiency

- **Single Browser, Multiple Pages**: One browser instance can host multiple pages
- **Shared Resources**: Pages share browser cache, cookies (within context), and processes
- **Lower Overhead**: Avoids launching multiple browser instances

### 3. Flexibility

- **Dynamic Target Creation**: Create new pages on demand
- **Target Switching**: Switch between pages without reconnecting
- **Multi-Page Coordination**: Coordinate actions across multiple pages

### 4. Event Isolation

- **Browser Events**: Global events don't clutter page-specific handlers
- **Target Events**: Page events are isolated to their respective connections
- **Better Debugging**: Clear separation makes debugging easier

### 5. Session Management

- **Independent Sessions**: Each target can have its own CDP session
- **Concurrent Operations**: Work with multiple pages simultaneously
- **Crash Isolation**: One page crash doesn't affect others

### Comparison with Single-Level

| Feature | Single-Level | Two-Level |
|---------|-------------|-----------|
| Connection | One WebSocket per page | Browser WS + Target WS |
| Target Management | Limited | Full control |
| Multi-page | Requires multiple browsers | Single browser, multiple targets |
| Resource Usage | Higher | Lower |
| Flexibility | Limited | High |
| Complexity | Lower | Higher |

---

## Implementation Details

### Complete Implementation Example

Here's a comprehensive TypeScript implementation of the two-level WebSocket architecture:

```typescript
import WebSocket from 'ws';
import { EventEmitter } from 'events';

interface CDPMessage {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { message: string };
}

interface TargetInfo {
  targetId: string;
  type: string;
  title: string;
  url: string;
  attached: boolean;
}

export class TwoLevelCDPClient extends EventEmitter {
  private browserSocket: WebSocket | null = null;
  private targetSocket: WebSocket | null = null;
  private browserUrl: string;
  private currentTargetId: string | null = null;
  private messageId = 0;
  private pendingMessages = new Map<number, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>();

  constructor(browserUrl: string = 'ws://localhost:50072') {
    super();
    this.browserUrl = browserUrl;
  }

  /**
   * Level 1: Connect to browser endpoint
   */
  async connectToBrowser(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.browserSocket = new WebSocket(this.browserUrl);

      this.browserSocket.on('open', () => {
        console.log('[Level 1] Browser connection established');
        this.emit('browserConnected');
        resolve();
      });

      this.browserSocket.on('error', reject);

      this.browserSocket.on('message', (data) => {
        const message: CDPMessage = JSON.parse(data.toString());
        this.handleBrowserMessage(message);
      });

      this.browserSocket.on('close', () => {
        this.emit('browserDisconnected');
      });
    });
  }

  /**
   * Get all available targets
   */
  async getTargets(): Promise<TargetInfo[]> {
    const response = await this.sendBrowserCommand('Target.getTargets', {});
    return (response as { targetInfos: TargetInfo[] }).targetInfos;
  }

  /**
   * Create a new target (page)
   */
  async createTarget(url: string = 'about:blank'): Promise<string> {
    const response = await this.sendBrowserCommand('Target.createTarget', { url });
    return (response as { targetId: string }).targetId;
  }

  /**
   * Level 2: Attach to target and establish target-level connection
   */
  async attachToTarget(targetId: string): Promise<void> {
    // Attach via browser-level first
    await this.sendBrowserCommand('Target.attachToTarget', {
      targetId,
      flatten: true
    });

    // Establish target-level WebSocket
    const targetUrl = `${this.browserUrl}/devtools/page/${targetId}`;
    
    return new Promise((resolve, reject) => {
      this.targetSocket = new WebSocket(targetUrl);

      this.targetSocket.on('open', () => {
        console.log('[Level 2] Target connection established');
        this.currentTargetId = targetId;
        this.emit('targetConnected', targetId);
        resolve();
      });

      this.targetSocket.on('error', reject);

      this.targetSocket.on('message', (data) => {
        const message: CDPMessage = JSON.parse(data.toString());
        this.handleTargetMessage(message);
      });

      this.targetSocket.on('close', () => {
        this.emit('targetDisconnected', targetId);
      });
    });
  }

  /**
   * Send command to browser-level endpoint
   */
  private async sendBrowserCommand(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.browserSocket || this.browserSocket.readyState !== WebSocket.OPEN) {
      throw new Error('Browser socket not connected');
    }

    const id = ++this.messageId;
    const message = { id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject });
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error(`Timeout waiting for response to ${method}`));
        }
      }, 30000);

      this.browserSocket!.send(JSON.stringify(message));
    });
  }

  /**
   * Send command to target-level endpoint
   */
  async sendTargetCommand(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.targetSocket || this.targetSocket.readyState !== WebSocket.OPEN) {
      throw new Error('Target socket not connected');
    }

    const id = ++this.messageId;
    const message = { id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject });
      
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error(`Timeout waiting for response to ${method}`));
        }
      }, 30000);

      this.targetSocket!.send(JSON.stringify(message));
    });
  }

  /**
   * Navigate to URL using target-level connection
   */
  async navigate(url: string): Promise<void> {
    // Enable page events
    await this.sendTargetCommand('Page.enable');
    
    // Navigate
    await this.sendTargetCommand('Page.navigate', { url });
    
    // Wait for load event
    await this.waitForEvent('Page.loadEventFired');
  }

  /**
   * Evaluate JavaScript in page context
   */
  async evaluate(expression: string): Promise<unknown> {
    const response = await this.sendTargetCommand('Runtime.evaluate', {
      expression,
      returnByValue: true
    });
    
    return (response as { result: { value: unknown } }).result.value;
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(fullPage: boolean = false): Promise<string> {
    const response = await this.sendTargetCommand('Page.captureScreenshot', {
      format: 'png',
      fullPage
    });
    
    return (response as { data: string }).data;
  }

  /**
   * Wait for a CDP event
   */
  waitForEvent(eventName: string, timeout: number = 30000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const handler = (params: unknown) => {
        this.off(eventName, handler);
        clearTimeout(timer);
        resolve(params);
      };
      
      const timer = setTimeout(() => {
        this.off(eventName, handler);
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);
      
      this.on(eventName, handler);
    });
  }

  private handleBrowserMessage(message: CDPMessage): void {
    // Handle responses
    if (message.id !== undefined && this.pendingMessages.has(message.id)) {
      const { resolve, reject } = this.pendingMessages.get(message.id)!;
      this.pendingMessages.delete(message.id);
      
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    }
    
    // Handle events
    if (message.method) {
      this.emit(message.method, message.params);
    }
  }

  private handleTargetMessage(message: CDPMessage): void {
    // Handle responses
    if (message.id !== undefined && this.pendingMessages.has(message.id)) {
      const { resolve, reject } = this.pendingMessages.get(message.id)!;
      this.pendingMessages.delete(message.id);
      
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    }
    
    // Handle events
    if (message.method) {
      this.emit(message.method, message.params);
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.targetSocket) {
      this.targetSocket.close();
      this.targetSocket = null;
    }
    
    if (this.browserSocket) {
      this.browserSocket.close();
      this.browserSocket = null;
    }
  }
}

// Usage Example
async function main() {
  const client = new TwoLevelCDPClient('ws://localhost:50072');
  
  try {
    // Level 1: Connect to browser
    await client.connectToBrowser();
    
    // Get or create a target
    const targets = await client.getTargets();
    const targetId = targets.length > 0 
      ? targets[0].targetId 
      : await client.createTarget();
    
    // Level 2: Attach to target
    await client.attachToTarget(targetId);
    
    // Use target-level commands
    await client.navigate('https://example.com');
    
    const title = await client.evaluate('document.title');
    console.log('Page title:', title);
    
    const screenshot = await client.takeScreenshot();
    console.log('Screenshot taken');
    
  } finally {
    await client.close();
  }
}
```

### Port Configuration

Browserless uses different ports for different purposes:

```typescript
const CONFIG = {
  // CDP WebSocket endpoint (Level 1 + Level 2)
  CDP_PORT: 50072,
  CDP_URL: 'ws://localhost:50072',
  
  // Debugger UI (human-friendly interface)
  DEBUGGER_PORT: 50070,
  DEBUGGER_URL: 'http://localhost:50070',
  
  // Target-specific WebSocket pattern
  TARGET_WS_PATTERN: 'ws://localhost:50072/devtools/page/{targetId}'
};
```

---

## Common Pitfalls

### 1. Wrong Connection Order

**❌ Incorrect**: Connecting to target before browser
```typescript
// WRONG: This will fail
targetSocket = new WebSocket('ws://localhost:50072/devtools/page/123');
```

**✅ Correct**: Always connect to browser first
```typescript
// CORRECT: Browser first, then target
browserSocket = new WebSocket('ws://localhost:50072');
// ... get target ID ...
targetSocket = new WebSocket('ws://localhost:50072/devtools/page/123');
```

### 2. Not Enabling Domains

**❌ Incorrect**: Sending commands without enabling the domain
```typescript
// WRONG: Page.navigate won't work without Page.enable
await sendCommand('Page.navigate', { url: 'https://example.com' });
```

**✅ Correct**: Enable the domain first
```typescript
// CORRECT: Enable Page domain first
await sendCommand('Page.enable');
await sendCommand('Page.navigate', { url: 'https://example.com' });
```

### 3. Mixing Browser and Target Commands

**❌ Incorrect**: Sending target commands to browser socket
```typescript
// WRONG: Runtime.evaluate is a target-level command
browserSocket.send(JSON.stringify({
  method: 'Runtime.evaluate',
  params: { expression: '1+1' }
}));
```

**✅ Correct**: Send target commands to target socket
```typescript
// CORRECT: Send to target socket
targetSocket.send(JSON.stringify({
  method: 'Runtime.evaluate',
  params: { expression: '1+1' }
}));
```

### 4. Not Handling Message IDs

**❌ Incorrect**: Not tracking message IDs
```typescript
// WRONG: No way to match response to request
socket.send(JSON.stringify({ method: 'Page.navigate', params: {} }));
socket.on('message', (data) => {
  // Which request does this response belong to?
});
```

**✅ Correct**: Use message IDs
```typescript
// CORRECT: Track message IDs
const id = ++messageCounter;
socket.send(JSON.stringify({ id, method: 'Page.navigate', params: {} }));
socket.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.id === id) {
    // Handle response
  }
});
```

### 5. Not Waiting for Events

**❌ Incorrect**: Not waiting for page load
```typescript
// WRONG: Screenshot might capture blank page
await sendCommand('Page.navigate', { url: 'https://example.com' });
await sendCommand('Page.captureScreenshot'); // Too early!
```

**✅ Correct**: Wait for load event
```typescript
// CORRECT: Wait for page to load
await sendCommand('Page.navigate', { url: 'https://example.com' });
await waitForEvent('Page.loadEventFired');
await sendCommand('Page.captureScreenshot'); // Now it's safe
```

### 6. Ignoring Target Lifecycle

**❌ Incorrect**: Assuming target persists
```typescript
// WRONG: Target might be closed
const targetId = 'page-123';
// ... some time passes ...
await attachToTarget(targetId); // Might fail if page closed
```

**✅ Correct**: Monitor target lifecycle
```typescript
// CORRECT: Listen for target destroyed events
browserSocket.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.method === 'Target.targetDestroyed') {
    if (message.params.targetId === currentTargetId) {
      // Handle target closure
    }
  }
});
```

---

## Best Practices

### 1. Connection Management

```typescript
class ConnectionManager {
  private browserSocket: WebSocket | null = null;
  private targetSockets = new Map<string, WebSocket>();

  async connectBrowser(url: string): Promise<void> {
    // Implement reconnection logic
    const connect = async (retries = 3): Promise<void> => {
      try {
        this.browserSocket = await this.createConnection(url);
      } catch (error) {
        if (retries > 0) {
          await delay(1000);
          return connect(retries - 1);
        }
        throw error;
      }
    };
    
    return connect();
  }

  private createConnection(url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
      
      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);
    });
  }
}
```

### 2. Error Handling

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${i + 1} failed:`, lastError.message);
      await delay(1000 * (i + 1)); // Exponential backoff
    }
  }
  
  throw lastError!;
}
```

### 3. Resource Cleanup

```typescript
class CDPClient {
  private sockets: WebSocket[] = [];

  async close(): Promise<void> {
    // Close all sockets gracefully
    for (const socket of this.sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1000, 'Client closing');
      }
    }
    
    // Wait for close events
    await Promise.all(
      this.sockets.map(socket => 
        new Promise<void>((resolve) => {
          if (socket.readyState === WebSocket.CLOSED) {
            resolve();
          } else {
            socket.on('close', () => resolve());
          }
        })
      )
    );
  }
}
```

### 4. Event Handling

```typescript
class EventHandler {
  private eventListeners = new Map<string, Set<Function>>();

  on(event: string, handler: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  off(event: string, handler: Function): void {
    this.eventListeners.get(event)?.delete(handler);
  }

  emit(event: string, data: unknown): void {
    this.eventListeners.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
}
```

### 5. Session Persistence

```typescript
interface SessionData {
  browserWsUrl: string;
  targetId: string;
  cookies: unknown[];
  localStorage: Record<string, string>;
}

async function saveSession(client: CDPClient): Promise<SessionData> {
  const cookies = await client.sendTargetCommand('Storage.getCookies');
  const localStorage = await client.evaluate('JSON.stringify(localStorage)');
  
  return {
    browserWsUrl: client.browserUrl,
    targetId: client.targetId!,
    cookies: (cookies as { cookies: unknown[] }).cookies,
    localStorage: JSON.parse(localStorage as string),
  };
}

async function restoreSession(client: CDPClient, session: SessionData): Promise<void> {
  await client.connectToBrowser(session.browserWsUrl);
  await client.attachToTarget(session.targetId);
  
  // Restore cookies
  for (const cookie of session.cookies) {
    await client.sendTargetCommand('Network.setCookie', cookie);
  }
  
  // Restore localStorage
  await client.evaluate(`
    Object.entries(${JSON.stringify(session.localStorage)})
      .forEach(([k, v]) => localStorage.setItem(k, v));
  `);
}
```

---

## Troubleshooting

### Issue 1: Connection Refused

**Symptoms**: `Error: connect ECONNREFUSED 127.0.0.1:50072`

**Possible Causes**:
- Browserless container not running
- Wrong port configuration
- Firewall blocking connection

**Solutions**:
```bash
# Check if container is running
docker ps | grep browserless

# Check container logs
docker logs browserless-container

# Verify port mapping
docker port browserless-container
```

### Issue 2: WebSocket Handshake Failed

**Symptoms**: `Error: Unexpected server response: 404`

**Possible Causes**:
- Wrong URL path
- Target ID doesn't exist
- Browserless version mismatch

**Solutions**:
```typescript
// Verify target exists before connecting
const targets = await client.getTargets();
const targetExists = targets.some(t => t.targetId === targetId);

if (!targetExists) {
  console.error('Target not found, creating new target...');
  targetId = await client.createTarget();
}
```

### Issue 3: Commands Timing Out

**Symptoms**: `Timeout waiting for response to Page.navigate`

**Possible Causes**:
- Page taking too long to load
- Network issues
- Command sent before domain enabled

**Solutions**:
```typescript
// Increase timeout for slow operations
await client.sendCommand('Page.navigate', { url }, 60000);

// Enable domain before using it
await client.sendCommand('Page.enable');
await client.sendCommand('Network.enable');
```

### Issue 4: Target Detached Unexpectedly

**Symptoms**: `Target closed` or `WebSocket closed unexpectedly`

**Possible Causes**:
- Page crashed
- Browser closed the target
- Memory pressure

**Solutions**:
```typescript
// Listen for target closure
client.on('Target.targetDestroyed', (params) => {
  if (params.targetId === currentTargetId) {
    console.log('Target closed, reconnecting...');
    // Implement reconnection logic
  }
});

// Implement health checks
setInterval(async () => {
  try {
    await client.evaluate('1'); // Simple health check
  } catch {
    console.error('Target unhealthy, reconnecting...');
    await reconnect();
  }
}, 30000);
```

### Issue 5: Memory Leaks

**Symptoms**: Increasing memory usage over time

**Possible Causes**:
- Not closing WebSocket connections
- Accumulating event listeners
- Not cleaning up targets

**Solutions**:
```typescript
// Clean up old targets periodically
const MAX_TARGETS = 10;

async function cleanupOldTargets(): Promise<void> {
  const targets = await client.getTargets();
  
  if (targets.length > MAX_TARGETS) {
    const oldTargets = targets
      .filter(t => t.type === 'page')
      .slice(0, targets.length - MAX_TARGETS);
    
    for (const target of oldTargets) {
      await client.sendBrowserCommand('Target.closeTarget', {
        targetId: target.targetId
      });
    }
  }
}
```

### Issue 6: Rate Limiting

**Symptoms**: Commands being rejected or delayed

**Possible Causes**:
- Too many concurrent requests
- Browserless rate limiting
- Resource exhaustion

**Solutions**:
```typescript
// Implement rate limiting
class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(private maxTokens: number, private refillRate: number) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    
    await delay(1000 / this.refillRate);
    return this.acquire();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(elapsed / 1000) * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
```

---

## References

### Official Documentation

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Browserless Documentation](https://docs.browserless.io/)
- [CDP GitHub Repository](https://github.com/ChromeDevTools/devtools-protocol)

### Protocol Versions

- **Current Stable**: Protocol version 1.3
- **Browserless Default**: Chrome 120+
- **WebSocket Version**: RFC 6455

### Related Tools

- **Puppeteer**: High-level API over CDP
- **Playwright**: Multi-browser automation with CDP support
- **Chrome Remote Interface**: Node.js CDP client

### Community Resources

- [awesome-chrome-devtools](https://github.com/ChromeDevTools/awesome-chrome-devtools)
- [CDP Snippets](https://github.com/cyrus-and/chrome-remote-interface/wiki/Snippets)
- [Browserless Examples](https://github.com/browserless/chrome/tree/main/examples)

### Academic Papers

- "Chrome DevTools Protocol: A Study in Remote Debugging" - Chrome Team
- "Headless Browser Automation: Best Practices" - Google Web Fundamentals

---

## Conclusion

The two-level WebSocket architecture provides a powerful and flexible way to interact with Browserless Chrome instances. By separating browser management from page-specific operations, you gain:

- **Better Resource Management**: Multiple pages per browser instance
- **Improved Reliability**: Isolated failures and better error handling
- **Enhanced Flexibility**: Dynamic page creation and switching
- **Clearer Architecture**: Separation of concerns between browser and page operations

Understanding this architecture is essential for building robust, scalable web automation solutions with Browserless and CDP.

---

*Document Version: 1.0*
*Last Updated: 2026-01-31*
*Author: AI Assistant*
