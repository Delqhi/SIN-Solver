# ADR-005: Next.js 14 für Dashboard

## Status

**Accepted** (2026-01-29)

## Context

Das SIN-Solver Dashboard (Room-01) ist die zentrale Management-Oberfläche:
- Container-Status Monitoring
- Service Health Checks
- Log-Aggregation
- Configuration Management
- Real-time Updates

Framework-Optionen:
1. **Next.js 14**: React, App Router, Server Components
2. **React + Vite**: Lightweight, client-side only
3. **Vue + Nuxt**: Alternative zu React
4. **SvelteKit**: Modern, kompiliert
5. **Plain HTML/JS**: Minimal, keine Dependencies

## Decision

Wir entscheiden uns für **Next.js 14** mit App Router.

### Architektur

```
Next.js 14 App
├── app/
│   ├── page.tsx              # Dashboard Home
│   ├── layout.tsx            # Root Layout
│   ├── loading.tsx           # Loading States
│   ├── error.tsx             # Error Boundaries
│   ├── api/
│   │   ├── health/route.ts   # Health Check API
│   │   ├── logs/route.ts     # Log Streaming
│   │   └── metrics/route.ts  # Metrics API
│   └── (routes)/
│       ├── containers/
│       ├── services/
│       └── settings/
├── components/
│   ├── ui/                   # Shadcn/UI Components
│   ├── charts/               # Recharts Visualizations
│   └── containers/           # Container Cards
├── lib/
│   ├── docker.ts             # Docker API Client
│   ├── utils.ts              # Utilities
│   └── constants.ts          # Config
└── types/
    └── index.ts              # TypeScript Types
```

### Key Features

#### 1. Server Components (Default)

```tsx
// app/page.tsx - Server Component
import { getContainerStatus } from '@/lib/docker';

export default async function DashboardPage() {
  const containers = await getContainerStatus();
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {containers.map(container => (
        <ContainerCard key={container.id} {...container} />
      ))}
    </div>
  );
}
```

#### 2. Client Components für Interaktivität

```tsx
// components/ContainerCard.tsx
'use client';

import { useState } from 'react';

export function ContainerCard({ name, status }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Card onClick={() => setIsExpanded(!isExpanded)}>
      <CardHeader>{name}</CardHeader>
      <CardContent>
        <StatusBadge status={status} />
        {isExpanded && <ContainerDetails name={name} />}
      </CardContent>
    </Card>
  );
}
```

#### 3. API Routes

```tsx
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { checkAllServices } from '@/lib/health';

export async function GET() {
  const health = await checkAllServices();
  return NextResponse.json(health);
}
```

#### 4. Streaming & Suspense

```tsx
// app/page.tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}
```

## Consequences

### Positive

1. **Server Components**: Weniger JS zum Client, bessere Performance
2. **App Router**: Moderne Routing-Paradigmen
3. **TypeScript**: Type-Safety out of the box
4. **API Routes**: Backend und Frontend in einem Projekt
5. **Vercel-Ökosystem**: Einfaches Deployment
6. **React Server Components**: Progressive Enhancement
7. **Caching**: Intelligentes Caching von Server Components

### Negative

1. **Komplexität**: Steilere Lernkurve als plain React
2. **Bundle Size**: Größer als notwendig für simple Dashboards
3. **Server-Requirement**: Braucht Node.js Server (kein static export)
4. **Caching-Komplexität**: Server Component Caching kann verwirrend sein

### Trade-offs

| Aspekt | Alternative | Warum Next.js besser |
|--------|-------------|---------------------|
| Performance | React + Vite | Server Components = weniger JS |
| Einfachheit | Plain HTML | Langfristige Wartbarkeit |
| Ecosystem | Vue/Nuxt | React ist Standard im Team |

## Alternatives Considered

### Alternative 1: React + Vite

```
Vite + React Router + TanStack Query
```

**Abgelehnt**:
- Keine Server Components
- Manuelles API-Setup
- Kein integriertes Routing
- Mehr Konfiguration nötig

**Wann besser?**
- Sehr kleine Projekte
- Client-side only
- Schneller Prototyp

### Alternative 2: Vue + Nuxt 3

```
Nuxt 3 mit Vue 3 Composition API
```

**Abgelehnt**:
- Team hat mehr React-Erfahrung
- Weniger Third-Party Libraries
- Ecosystem kleiner als React

**Wann besser?**
- Vue-Expertise im Team
- Einfachere Lernkurve gewünscht
- Weniger Dependencies

### Alternative 3: SvelteKit

```
SvelteKit mit Svelte 5
```

**Abgelehnt**:
- Noch experimenteller
- Weniger reife Libraries
- Team nicht vertraut

**Wann besser?**
- Performance kritisch
- Minimaler Bundle-Size
- Moderne Patterns bevorzugt

### Alternative 4: Plain HTML/JS + HTMX

```
HTMX für Server-side Rendering
```

**Abgelehnt**:
- Zu limitiert für komplexes Dashboard
- Keine TypeScript-Unterstützung
- Weniger Tooling

**Wann besser?**
- Maximale Einfachheit
- Kein Build-Step
- Minimaler Overhead

## Implementation

### Tech Stack

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest",
    "recharts": "^2.10.0",
    "dockerode": "^4.0.0"
  }
}
```

### Docker Setup

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

### Docker Compose

```yaml
services:
  room-01-dashboard-cockpit:
    build: ./room-01-dashboard-cockpit
    container_name: room-01-dashboard-cockpit
    ports:
      - "3000:3000"
    environment:
      - DOCKER_HOST=tcp://room-03-archiv-postgres:2375
    networks:
      - sin-network
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

### Development

```bash
# Setup
cd room-01-dashboard-cockpit
npm install

# Development
npm run dev

# Build
npm run build

# Production
npm start
```

## References

- [Next.js 14 Docs](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [room-01-dashboard-cockpit/README.md](../../../room-01-dashboard-cockpit/README.md)

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-29 | Sisyphus | Initial ADR created |

---

**Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)**

Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
