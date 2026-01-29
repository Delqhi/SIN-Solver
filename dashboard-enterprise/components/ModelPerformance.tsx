'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useModelPerformance } from '@/lib/api';
import { 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  DollarSign,
  TrendingUp,
  Brain
} from 'lucide-react';
import { formatPercentage, formatDuration, formatCurrency, getStatusDot } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const modelIcons: Record<string, React.ReactNode> = {
  gemini: <Brain className="h-4 w-4 text-blue-500" />,
  mistral: <Brain className="h-4 w-4 text-purple-500" />,
  groq: <Brain className="h-4 w-4 text-orange-500" />,
  yolo: <Cpu className="h-4 w-4 text-emerald-500" />,
  consensus: <TrendingUp className="h-4 w-4 text-cyan-500" />,
  default: <Cpu className="h-4 w-4 text-gray-500" />,
};

export default function ModelPerformance() {
  const { models, isLoading, error } = useModelPerformance();

  const getModelIcon = (name: string) => {
    const key = Object.keys(modelIcons).find(k => name.toLowerCase().includes(k));
    return key ? modelIcons[key] : modelIcons.default;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Online
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="error" className="gap-1">
            <XCircle className="h-3 w-3" />
            Offline
          </Badge>
        );
      case 'degraded':
        return (
          <Badge variant="warning" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Degraded
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'vision':
        return <Badge variant="outline" className="text-blue-500 border-blue-500/30">Vision</Badge>;
      case 'consensus':
        return <Badge variant="outline" className="text-cyan-500 border-cyan-500/30">Consensus</Badge>;
      case 'fallback':
        return <Badge variant="outline" className="text-amber-500 border-amber-500/30">Fallback</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-500" />
            AI Model Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            Failed to load model performance data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Cpu className="h-5 w-5 text-blue-500" />
          AI Model Performance
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Performance metrics for all CAPTCHA solving models
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px]">Model</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Success Rate</TableHead>
                <TableHead className="text-right">Avg Latency</TableHead>
                <TableHead className="text-right">Cost/Solve</TableHead>
                <TableHead className="text-right">Total Solves</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : models.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-32">
                    No model data available
                  </TableCell>
                </TableRow>
              ) : (
                models.map((model) => (
                  <TableRow key={model.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getModelIcon(model.name)}
                        <span className="font-medium">{model.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(model.type)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              model.successRate >= 95
                                ? 'bg-emerald-500'
                                : model.successRate >= 90
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${model.successRate}%` }}
                          />
                        </div>
                        <span className={`font-mono font-medium ${
                          model.successRate >= 95
                            ? 'text-emerald-500'
                            : model.successRate >= 90
                            ? 'text-amber-500'
                            : 'text-red-500'
                        }`}>
                          {formatPercentage(model.successRate)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="font-mono">{formatDuration(model.avgLatency)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-mono">{formatCurrency(model.costPerSolve)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono">{model.totalSolves.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(model.status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Footer */}
        {!isLoading && models.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Models</p>
              <p className="text-xl font-bold text-emerald-500">
                {models.filter(m => m.status === 'online').length}/{models.length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Success</p>
              <p className="text-xl font-bold">
                {formatPercentage(models.reduce((acc, m) => acc + m.successRate, 0) / models.length)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Latency</p>
              <p className="text-xl font-bold">
                {formatDuration(models.reduce((acc, m) => acc + m.avgLatency, 0) / models.length)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Cost</p>
              <p className="text-xl font-bold">
                {formatCurrency(models.reduce((acc, m) => acc + (m.costPerSolve * m.totalSolves), 0))}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
