# 2Captcha Worker Dashboard

Real-time monitoring dashboard for the 2Captcha worker with WebSocket updates.

## Features

- **Real-time Stats**: Current accuracy, CAPTCHAs solved today, earnings estimate
- **Success Rate Graph**: Visual chart showing accuracy over time
- **Recent Submissions Table**: Live feed of all submissions
- **Alert System**: 
  - Warning when accuracy drops below 95%
  - Emergency stop when accuracy drops below 90%
  - Connection issue notifications
- **Mobile Responsive**: Works on all device sizes

## Pages

- `/` - Overview (stats, accuracy, earnings, chart)
- `/logs` - Full submission logs with filtering
- `/settings` - Worker configuration

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

Run both the WebSocket server and Next.js dev server:

```bash
npm run dev
```

Or run separately:

```bash
# Terminal 1: WebSocket server
npm run dev:server

# Terminal 2: Next.js dev server
npm run dev:client
```

### Production

```bash
npm run build
npm start
```

## Architecture

- **WebSocket Server** (`server.js`): Real-time data provider running on port 3001
- **Next.js App** (`src/app/`): Dashboard UI
- **Components** (`src/components/`): Reusable UI components
- **Hooks** (`src/lib/websocket-client.ts`): WebSocket connection hook

## WebSocket Protocol

Messages from server:
- `type: 'stats'` - Current worker statistics
- `type: 'alerts'` - Active alerts

Messages to server:
- `type: 'acknowledge_alert'` - Acknowledge an alert

## Environment Variables

- `WS_PORT` - WebSocket server port (default: 3001)
