# Room-01 Dashboard Cockpit - Architecture

## Technical Architecture

This document describes the technical architecture of the Room-01 Dashboard Cockpit, including system design, component structure, and data flow.

---

## System Overview

The Room-01 Dashboard Cockpit is built as a modern Next.js 15 application with real-time Docker integration. It follows a modular architecture with clear separation of concerns.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        CLIENT LAYER                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Browser    │  │   Browser    │  │   Browser    │              │   │
│  │  │   (User 1)   │  │   (User 2)   │  │   (User N)   │              │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │   │
│  └─────────┼─────────────────┼─────────────────┼──────────────────────┘   │
│            │                 │                 │                           │
│            └─────────────────┼─────────────────┘                           │
│                              ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     APPLICATION LAYER                                │   │
│  │                    (Next.js 15 + Node.js)                           │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                    PRESENTATION LAYER                         │   │   │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐  │   │   │
│  │  │  │  Sidebar   │ │ MainStage  │ │  Terminal  │ │  Modals   │  │   │   │
│  │  │  │ Component  │ │ Component  │ │ Component  │ │ Components│  │   │   │
│  │  │  └────────────┘ └────────────┘ └────────────┘ └───────────┘  │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                     API LAYER (Next.js API Routes)            │   │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │   │
│  │  │  │/api/docs │ │/api/docker│ │/api/logs │ │/api/health│        │   │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                   SERVICE LAYER                               │   │   │
│  │  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │   │   │
│  │  │  │DockerService │ │  LogService  │ │  DocService  │          │   │   │
│  │  │  └──────────────┘ └──────────────┘ └──────────────┘          │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     INFRASTRUCTURE LAYER                             │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                   Docker Integration                          │   │   │
│  │  │  ┌────────────────────────────────────────────────────────┐  │   │   │
│  │  │  │              Docker Daemon (Unix Socket)                │  │   │   │
│  │  │  │  ┌────────────┐ ┌────────────┐ ┌────────────────────┐  │  │   │   │
│  │  │  │  │ Container  │ │   Images   │ │     Networks       │  │  │   │   │
│  │  │  │  │   API      │ │    API     │ │      API           │  │  │   │   │
│  │  │  │  └────────────┘ └────────────┘ └────────────────────┘  │  │   │   │
│  │  │  └────────────────────────────────────────────────────────┘  │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                   Data Storage                                │   │   │
│  │  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │   │   │
│  │  │  │   Redis      │ │   Postgres   │ │  File System │          │   │   │
│  │  │  │   (Cache)    │ │   (State)    │ │   (Logs)     │          │   │   │
│  │  │  └──────────────┘ └──────────────┘ └──────────────┘          │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend Components

#### Layout Components

```
components/
├── Layout/
│   ├── DashboardLayout.js      # Main layout wrapper
│   ├── Sidebar.js              # Navigation sidebar
│   ├── MainStage.js            # Content area
│   ├── Header.js               # Top navigation
│   └── Footer.js               # Bottom status bar
```

**DashboardLayout.js**
- Wraps all pages with consistent layout
- Manages sidebar state (collapsed/expanded)
- Handles responsive breakpoints
- Provides context providers

**Sidebar.js**
- Displays container list
- Navigation menu
- User profile section
- System status indicators

**MainStage.js**
- Dynamic content area
- Supports multiple view modes
- Iframe integration for external tools
- Terminal/log viewer integration

#### Feature Components

```
components/
├── Docker/
│   ├── ContainerList.js        # List of containers
│   ├── ContainerCard.js        # Individual container display
│   ├── ContainerActions.js     # Start/stop/restart buttons
│   └── ContainerStats.js       # CPU/RAM metrics
├── Terminal/
│   ├── LogViewer.js            # Real-time log display
│   ├── Terminal.js             # Interactive terminal
│   └── LogFilter.js            # Log filtering controls
├── Docs/
│   ├── MarkdownViewer.js       # Markdown rendering
│   ├── DocsSidebar.js          # Document navigation
│   └── FileTree.js             # File browser
└── UI/
    ├── GlassCard.js            # Glassmorphism card
    ├── StatusBadge.js          # Status indicators
    ├── MetricChart.js          # Performance charts
    └── LoadingSpinner.js       # Loading states
```

### Backend Architecture

#### API Routes (Next.js App Router)

```
app/
├── api/
│   ├── docker/
│   │   ├── containers/
│   │   │   └── route.js        # GET /api/docker/containers
│   │   ├── containers/[id]/
│   │   │   ├── route.js        # GET/POST /api/docker/containers/:id
│   │   │   ├── start/route.js  # POST /api/docker/containers/:id/start
│   │   │   ├── stop/route.js   # POST /api/docker/containers/:id/stop
│   │   │   └── logs/route.js   # GET /api/docker/containers/:id/logs
│   │   └── stats/route.js      # GET /api/docker/stats
│   ├── docs/
│   │   └── content/route.js    # GET /api/docs/content?file=
│   ├── health/
│   │   └── route.js            # GET /api/health
│   └── logs/
│       └── stream/route.js     # GET /api/logs/stream
```

#### Services

```
lib/
├── services/
│   ├── DockerService.js        # Docker API abstraction
│   ├── LogService.js           # Log aggregation
│   ├── DocService.js           # File system access
│   └── CacheService.js         # Redis caching
├── docker.js                   # Docker client singleton
├── redis.js                    # Redis client
└── utils.js                    # Utility functions
```

**DockerService.js**
```javascript
class DockerService {
  async listContainers() { }
  async getContainerStats(id) { }
  async startContainer(id) { }
  async stopContainer(id) { }
  async getContainerLogs(id, options) { }
  async streamLogs(id, callback) { }
}
```

---

## Data Flow

### Container Status Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Docker    │────▶│   Docker    │────▶│    React    │────▶│     UI      │
│   Daemon    │     │   Service   │     │    Query    │     │  Components │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      │ 1. Poll/Stream    │ 2. Transform      │ 3. Cache          │ 4. Render
      │    (dockerode)    │    & Filter       │    & State        │    (React)
      │                   │                   │                   │
      ▼                   ▼                   ▼                   ▼
   Raw JSON           Processed          Cached State        Visual
   Container          Data               (5s stale time)     Display
   Data
```

### Log Streaming Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Docker    │────▶│   Server    │────▶│   WebSocket │────▶│   Client    │
│   Daemon    │     │   (API)     │     │  / SSE      │     │  (Terminal) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Redis     │
                    │   (Buffer)  │
                    └─────────────┘
```

---

## State Management

### Client State (React Query)

```
┌─────────────────────────────────────────────────────────────┐
│                     REACT QUERY CACHE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  containers: {                                              │
│    queryKey: ['containers'],                                │
│    queryFn: fetchContainers,                                │
│    refetchInterval: 5000,  // 5 seconds                     │
│    staleTime: 3000                                         │
│  }                                                          │
│                                                             │
│  containerStats: {                                          │
│    queryKey: ['containerStats', containerId],               │
│    queryFn: fetchContainerStats,                            │
│    refetchInterval: 2000  // 2 seconds                      │
│  }                                                          │
│                                                             │
│  logs: {                                                    │
│    queryKey: ['logs', containerId],                         │
│    queryFn: fetchLogs,                                      │
│    enabled: isLogViewerOpen                                 │
│  }                                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Server State (Redis)

```
┌─────────────────────────────────────────────────────────────┐
│                      REDIS CACHE                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Key                          Value                         │
│  ─────────────────────────────────────────────────────────  │
│  container:list               JSON array (TTL: 10s)         │
│  container:stats:${id}        JSON object (TTL: 5s)         │
│  logs:buffer:${id}            List (max 1000 items)         │
│  session:${token}             User session (TTL: 24h)       │
│  rate:limit:${ip}             Request count (TTL: 1m)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Docker Integration

### Dockerode Configuration

```javascript
// lib/docker.js
import Docker from 'dockerode';

const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
  protocol: 'http',
  timeout: 5000
});

export default docker;
```

### Container Mapping

The dashboard maps Docker container names to human-readable metadata:

```javascript
const containerMetadata = {
  'agent-01-n8n-manager': {
    name: 'n8n Orchestrator',
    category: 'agent',
    icon: 'Workflow',
    description: 'Workflow automation engine',
    port: 5678
  },
  'agent-05-steel-browser': {
    name: 'Steel Browser',
    category: 'agent',
    icon: 'Globe',
    description: 'Stealth browser engine',
    port: 3005
  },
  // ... more containers
};
```

---

## Security Architecture

### Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User   │────▶│   Login     │────▶│   Vault     │────▶│   Token     │
│         │     │   Page      │     │   (room-02) │     │   Issued    │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                              │
                                                              ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User   │◀────│   API       │◀────│   JWT       │◀────│   Token     │
│         │     │   Response  │     │   Verify    │     │   Validate  │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### File Access Security

```javascript
// Whitelist for file access
const ALLOWED_FILES = [
  'AGENTS.md',
  'lastchanges.md',
  'userprompts.md',
  'README.md'
];

// Path validation
function validateFilePath(requestedFile) {
  if (!ALLOWED_FILES.includes(requestedFile)) {
    throw new Error('File not in whitelist');
  }
  // Prevent directory traversal
  if (requestedFile.includes('..') || requestedFile.includes('/')) {
    throw new Error('Invalid file path');
  }
  return path.join('/app/docs', requestedFile);
}
```

---

## Performance Optimizations

### Caching Strategy

| Data Type | Cache Layer | TTL | Strategy |
|-----------|-------------|-----|----------|
| Container List | Redis | 10s | Stale-while-revalidate |
| Container Stats | Redis | 5s | Time-based |
| Logs | Memory | 1m | LRU eviction |
| Static Assets | CDN | 1h | Immutable |
| API Responses | HTTP | 5s | Cache-Control headers |

### Lazy Loading

```javascript
// Components loaded on demand
const LogViewer = dynamic(() => import('@/components/Terminal/LogViewer'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const MarkdownViewer = dynamic(() => import('@/components/Docs/MarkdownViewer'), {
  loading: () => <LoadingSpinner />
});
```

---

## Deployment Architecture

### Docker Compose

```yaml
version: '3.8'
services:
  room-01-dashboard:
    build: .
    container_name: room-01-dashboard-cockpit
    ports:
      - "3011:3011"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./docs:/app/docs:ro
    environment:
      - DOCKER_SOCKET=/var/run/docker.sock
      - REDIS_URL=redis://room-04-redis:6379
      - API_BRAIN_URL=http://room-13-vault-api:8000
    networks:
      - sin-solver
    depends_on:
      - room-04-redis
      - room-03-postgres
```

### Production Considerations

1. **Load Balancing**: Use nginx or traefik for multiple instances
2. **SSL/TLS**: Terminate SSL at reverse proxy
3. **Monitoring**: Integrate with Prometheus/Grafana
4. **Logging**: Centralized logging with ELK stack

---

## Related Documentation

- [05-api-reference.md](./05-room-01-api-reference.md) - API endpoints
- [06-configuration.md](./06-room-01-configuration.md) - Configuration options
- [07-deployment.md](./07-room-01-deployment.md) - Deployment guide
- [09-performance.md](./09-room-01-performance.md) - Performance tuning
