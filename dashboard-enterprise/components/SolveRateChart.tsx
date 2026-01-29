'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTimeSeriesData } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface ChartDataPoint {
  timestamp: string;
  solves: number;
  errors: number;
  successRate: number;
  latency: number;
  label: string;
}

export default function SolveRateChart() {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [chartType, setChartType] = useState<'solves' | 'success' | 'latency'>('solves');
  const { data, isLoading } = useTimeSeriesData(timeRange);

  const chartData: ChartDataPoint[] = data.map((point) => ({
    ...point,
    label: format(parseISO(point.timestamp), 'HH:mm'),
  }));

  const totalSolves = chartData.reduce((acc, curr) => acc + curr.solves, 0);
  const totalErrors = chartData.reduce((acc, curr) => acc + curr.errors, 0);
  const avgSuccessRate = chartData.length > 0
    ? chartData.reduce((acc, curr) => acc + curr.successRate, 0) / chartData.length
    : 0;
  const avgLatency = chartData.length > 0
    ? chartData.reduce((acc, curr) => acc + curr.latency, 0) / chartData.length
    : 0;

  const trend = chartData.length >= 2
    ? chartData[chartData.length - 1].solves - chartData[chartData.length - 2].solves
    : 0;

  const getChartColor = () => {
    switch (chartType) {
      case 'solves':
        return { stroke: '#3b82f6', fill: '#3b82f6' }; // blue-500
      case 'success':
        return { stroke: '#10b981', fill: '#10b981' }; // emerald-500
      case 'latency':
        return { stroke: '#f59e0b', fill: '#f59e0b' }; // amber-500
      default:
        return { stroke: '#3b82f6', fill: '#3b82f6' };
    }
  };

  const colors = getChartColor();

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <div className="mt-2 space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="font-medium">
                  {entry.name === 'Success Rate' ? `${entry.value.toFixed(1)}%` : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Real-time Solve Rate
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Live monitoring of CAPTCHA solving performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={chartType} onValueChange={(v) => setChartType(v as typeof chartType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solves">Solves/Min</SelectItem>
                <SelectItem value="success">Success Rate</SelectItem>
                <SelectItem value="latency">Avg Latency</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="6h">6 Hours</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Solves</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">{totalSolves.toLocaleString()}</span>
              {trend !== 0 && (
                trend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Errors</p>
            <p className="text-2xl font-bold mt-1">{totalErrors.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Success</p>
            <p className="text-2xl font-bold mt-1 text-emerald-500">{avgSuccessRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Latency</p>
            <p className="text-2xl font-bold mt-1">{avgLatency.toFixed(0)}ms</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-pulse flex space-x-2">
                <div className="h-3 w-3 bg-blue-500 rounded-full animate-bounce" />
                <div className="h-3 w-3 bg-blue-500 rounded-full animate-bounce delay-100" />
                <div className="h-3 w-3 bg-blue-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'solves' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSolves" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={colors.stroke} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="solves"
                    name="Solves"
                    stroke={colors.stroke}
                    fillOpacity={1}
                    fill="url(#colorSolves)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    name="Errors"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorErrors)"
                    strokeWidth={2}
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    domain={chartType === 'success' ? [0, 100] : ['auto', 'auto']}
                    tickFormatter={chartType === 'success' ? (v) => `${v}%` : undefined}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={chartType === 'success' ? 'successRate' : 'latency'}
                    name={chartType === 'success' ? 'Success Rate' : 'Latency (ms)'}
                    stroke={colors.stroke}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
