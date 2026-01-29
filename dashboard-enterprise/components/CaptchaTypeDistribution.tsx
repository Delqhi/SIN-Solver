'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCaptchaTypeStats } from '@/lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Shield, Layers } from 'lucide-react';
import { formatPercentage } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

export default function CaptchaTypeDistribution() {
  const { types, isLoading } = useCaptchaTypeStats();

  const chartData = types.map((type) => ({
    name: type.type,
    value: type.count,
    successRate: type.successRate,
    avgLatency: type.avgLatency,
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-medium mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p>Count: <span className="font-mono">{data.value.toLocaleString()}</span></p>
            <p>Success Rate: <span className="font-mono text-emerald-500">{formatPercentage(data.successRate)}</span></p>
            <p>Avg Latency: <span className="font-mono">{data.avgLatency.toFixed(0)}ms</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          CAPTCHA Type Distribution
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Breakdown of CAPTCHA types being solved
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Skeleton className="h-48 w-48 rounded-full" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="middle" 
                  align="right" 
                  layout="vertical"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Type List */}
        <div className="mt-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))
          ) : (
            types.slice(0, 5).map((type, index) => (
              <div 
                key={type.type} 
                className="flex items-center justify-between py-1.5 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium">{type.type}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{formatPercentage(type.percentage)}</span>
                  <span className="font-mono text-xs text-emerald-500">
                    {formatPercentage(type.successRate)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
