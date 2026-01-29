# Room-01 Dashboard Cockpit - Analytics

## Analytics and Metrics

This document describes analytics capabilities and metrics collection for the Room-01 Dashboard Cockpit.

---

## Analytics Architecture

```
User Actions → Event Tracking → Analytics Pipeline → Storage → Visualization
```

## Event Tracking

### Custom Events

```javascript
// lib/analytics/events.js
export function trackEvent(eventName, properties = {}) {
  const event = {
    name: eventName,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  };
  
  // Send to analytics service
  fetch('/api/analytics/events', {
    method: 'POST',
    body: JSON.stringify(event)
  });
}

// Usage examples
trackEvent('container_started', { containerId: 'abc123' });
trackEvent('logs_viewed', { containerId: 'abc123', duration: 30 });
trackEvent('documentation_opened', { file: 'AGENTS.md' });
```

### Page Views

```javascript
// hooks/usePageView.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export function usePageView() {
  const router = useRouter();
  
  useEffect(() => {
    const handleRouteChange = (url) => {
      trackEvent('page_view', { path: url });
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);
}
```

---

## Metrics Dashboard

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Daily Active Users | Unique users per day | 100+ |
| Avg Session Duration | Time spent in dashboard | > 5 min |
| Container Actions | Start/stop/restart per day | 500+ |
| Page Load Time | Average load time | < 2s |
| Error Rate | Failed requests percentage | < 1% |

### Custom Dashboard

```javascript
// components/Analytics/Dashboard.js
export function AnalyticsDashboard() {
  const { data: metrics } = useAnalytics();
  
  return (
    <div className="analytics-dashboard">
      <MetricCard
        title="Daily Active Users"
        value={metrics.dau}
        trend={metrics.dauTrend}
      />
      <MetricCard
        title="Avg Session Duration"
        value={formatDuration(metrics.avgSession)}
      />
      
      <Chart
        data={metrics.containerActions}
        type="bar"
        title="Container Actions"
      />
    </div>
  );
}
```

---

## Related Documentation

- [11-monitoring.md](./11-room-01-monitoring.md) - System monitoring
- [20-analytics.md](./20-room-01-analytics.md) - Analytics details
