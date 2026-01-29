'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSystemHealth } from '@/lib/api';
import { 
  Activity, 
  Server, 
  Database, 
  Wifi, 
  Shield, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { formatDuration, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const componentIcons: Record<string, React.ReactNode> = {
  'api': <Server className="h-4 w-4" />,
  'database': <Database className="h-4 w-4" />,
  'redis': <Database className="h-4 w-4 text-red-400" />,
  'websocket': <Wifi className="h-4 w-4" />,
  'worker': <Activity className="h-4 w-4" />,
  'security': <Shield className="h-4 w-4" />,
  'default': <Activity className="h-4 w-4" />,
};

const statusConfig = {
  healthy: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Healthy',
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: 'Warning',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  unhealthy: {
    icon: <XCircle className="h-4 w-4" />,
    label: 'Critical',
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
};

export default function SystemHealth() {
  const { health, isLoading } = useSystemHealth();

  const healthyCount = health.filter(h => h.status === 'healthy').length;
  const warningCount = health.filter(h => h.status === 'warning').length;
  const criticalCount = health.filter(h => h.status === 'unhealthy').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              System Health
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time component status
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
              {healthyCount} Healthy
            </Badge>
            {warningCount > 0 && (
              <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                {warningCount} Warning
              </Badge>
            )}
            {criticalCount > 0 && (
              <Badge variant="outline" className="text-red-500 border-red-500/30">
                {criticalCount} Critical
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))
          ) : health.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No health data available
            </div>
          ) : (
            health.map((component) => {
              const config = statusConfig[component.status];
              const icon = componentIcons[component.component.toLowerCase()] || componentIcons.default;

              return (
                <div
                  key={component.component}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center",
                      config.color.split(' ')[0]
                    )}>
                      {icon}
                    </div>
                    <div>
                      <p className="font-medium capitalize">{component.component}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Latency: {component.latency}ms</span>
                        <span>•</span>
                        <span>Uptime: {formatDuration(component.uptime * 1000)}</span>
                      </div>
                    </div>
                  </div>

                  <Badge variant="outline" className={cn("gap-1", config.color)}>
                    {config.icon}
                    {config.label}
                  </Badge>
                </div>
              );
            })
          )}
        </div>

        {/* Health Overview */}
        {!isLoading && health.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">System Health</span>
                  <span className="font-medium">
                    {Math.round((healthyCount / health.length) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500"
                    style={{ 
                      width: '100%',
                      background: `linear-gradient(to right, 
                        #10b981 0%, 
                        #10b981 ${(healthyCount / health.length) * 100}%, 
                        #f59e0b ${(healthyCount / health.length) * 100}%, 
                        #f59e0b ${((healthyCount + warningCount) / health.length) * 100}%, 
                        #ef4444 ${((healthyCount + warningCount) / health.length) * 100}%, 
                        #ef4444 100%)`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
