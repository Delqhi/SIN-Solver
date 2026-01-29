# SIN-Solver Enterprise Dashboard

A modern, enterprise-grade monitoring dashboard for the SIN-Solver CAPTCHA solving platform. Built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## Features

### 📊 Real-time Monitoring
- Live solve rate charts with WebSocket updates
- System health indicators with latency tracking
- Recent solves log with real-time updates
- Connection status indicator

### 🎨 Modern UI
- Dark theme with blue accents (professional enterprise look)
- Fully responsive design
- Collapsible sidebar navigation
- Smooth animations and transitions

### 📈 Analytics
- KPI cards with trend indicators
- Time-series charts (Recharts)
- CAPTCHA type distribution (pie chart)
- AI model performance table

### 🔧 Components
- **KPICards**: Key performance indicators with trends
- **SolveRateChart**: Real-time line/area charts
- **CaptchaTypeDistribution**: Pie chart breakdown
- **ModelPerformance**: AI model statistics table
- **RecentSolves**: Live activity feed
- **SystemHealth**: Component status monitoring

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Navigate to dashboard directory
cd dashboard-enterprise

# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_DASHBOARD_TITLE=SIN-Solver Enterprise
NEXT_PUBLIC_ENABLE_REALTIME=true
```

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
dashboard-enterprise/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Dashboard page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── KPICards.tsx
│   ├── SolveRateChart.tsx
│   ├── CaptchaTypeDistribution.tsx
│   ├── ModelPerformance.tsx
│   ├── RecentSolves.tsx
│   ├── SystemHealth.tsx
│   ├── Sidebar.tsx
│   └── TopBar.tsx
├── lib/                   # Utilities and hooks
│   ├── utils.ts          # Helper functions
│   ├── api.ts            # SWR hooks for API
│   ├── websocket.ts      # WebSocket client
│   └── store.ts          # Zustand state
├── types/                 # TypeScript types
│   └── index.ts
├── public/               # Static assets
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

## API Integration

The dashboard expects the following API endpoints:

### REST Endpoints
- `GET /api/v2/dashboard/stats` - Dashboard statistics
- `GET /api/v2/dashboard/timeseries?range=24h` - Time series data
- `GET /api/v2/dashboard/captcha-types` - CAPTCHA type distribution
- `GET /api/v2/models/performance` - AI model performance
- `GET /api/v2/solves/recent?limit=50` - Recent solves
- `GET /api/v2/system/health` - System health status
- `GET /api/v2/alerts` - Active alerts

### WebSocket Events
- `stats` - Real-time statistics updates
- `solve` - New solve events
- `alert` - System alerts
- `health` - Health status changes

## Technology Stack

- **Framework**: Next.js 15.1 with App Router
- **UI Library**: React 19
- **Language**: TypeScript 5.6
- **Styling**: Tailwind CSS 3.4
- **Components**: shadcn/ui + Radix UI
- **Charts**: Recharts
- **State**: Zustand
- **Data Fetching**: SWR
- **WebSocket**: Socket.io Client
- **Icons**: Lucide React

## Customization

### Themes
Edit `tailwind.config.ts` to customize colors:
- Primary: Blue accent color
- Status colors: Online (emerald), Warning (amber), Error (red)

### Layout
Modify `app/page.tsx` to rearrange dashboard sections.

### API Base URL
Update `NEXT_PUBLIC_API_URL` in `.env.local`.

## License

Apache 2.0 - See LICENSE file for details.
