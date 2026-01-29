'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/lib/api';
import { 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  Activity,
  BarChart3
} from 'lucide-react';
import { formatNumber, formatPercentage, formatCurrency, formatDuration, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
  colorClass?: string;
}

function KPICard({ title, value, subtitle, icon, trend, loading, colorClass }: KPICardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className={cn("absolute top-0 right-0 p-3 opacity-10", colorClass)}>
        {icon}
      </div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg", colorClass?.replace('text-', 'bg-').replace('500', '500/10'))}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold tracking-tight">{value}</div>
        )}
        <div className="flex items-center gap-2 mt-1">
          {trend && !loading && (
            <span className={cn(
              "text-xs font-medium flex items-center gap-0.5",
              trend.positive ? "text-emerald-500" : "text-red-500"
            )}>
              {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatNumber(trend.value, 1)}%
            </span>
          )}
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KPICards() {
  const { stats, isLoading } = useDashboardStats();

  // Mock trends - in real app these would come from comparing with previous period
  const trends = {
    solves: { value: 12.5, positive: true },
    successRate: { value: 2.3, positive: true },
    latency: { value: 5.2, positive: false },
    cost: { value: 8.1, positive: true },
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total Solves"
        value={isLoading ? '' : formatNumber(stats?.totalSolves || 0)}
        subtitle="All time solves"
        icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
        trend={trends.solves}
        loading={isLoading}
        colorClass="text-blue-500"
      />
      <KPICard
        title="Success Rate"
        value={isLoading ? '' : formatPercentage(stats?.successRate || 0)}
        subtitle="Overall success rate"
        icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        trend={trends.successRate}
        loading={isLoading}
        colorClass="text-emerald-500"
      />
      <KPICard
        title="Avg Latency"
        value={isLoading ? '' : formatDuration(stats?.avgLatency || 0)}
        subtitle="Response time"
        icon={<Clock className="h-5 w-5 text-amber-500" />}
        trend={trends.latency}
        loading={isLoading}
        colorClass="text-amber-500"
      />
      <KPICard
        title="Total Cost"
        value={isLoading ? '' : formatCurrency(stats?.totalCost || 0)}
        subtitle="Lifetime cost"
        icon={<DollarSign className="h-5 w-5 text-purple-500" />}
        trend={trends.cost}
        loading={isLoading}
        colorClass="text-purple-500"
      />

      {/* Secondary KPIs */}
      <KPICard
        title="Solves Today"
        value={isLoading ? '' : formatNumber(stats?.solvesToday || 0)}
        subtitle="Last 24 hours"
        icon={<Activity className="h-5 w-5 text-cyan-500" />}
        loading={isLoading}
        colorClass="text-cyan-500"
      />
      <KPICard
        title="Solves This Hour"
        value={isLoading ? '' : formatNumber(stats?.solvesThisHour || 0)}
        subtitle="Last 60 minutes"
        icon={<Zap className="h-5 w-5 text-yellow-500" />}
        loading={isLoading}
        colorClass="text-yellow-500"
      />
      <KPICard
        title="Cost Efficiency"
        value={isLoading ? '' : `$${((stats?.totalCost || 0) / (stats?.totalSolves || 1)).toFixed(4)}`}
        subtitle="Cost per solve"
        icon={<DollarSign className="h-5 w-5 text-rose-500" />}
        loading={isLoading}
        colorClass="text-rose-500"
      />
      <KPICard
        title="System Health"
        value={isLoading ? '' : '98.5%'}
        subtitle="Uptime this month"
        icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
        loading={isLoading}
        colorClass="text-green-500"
      />
    </div>
  );
}
