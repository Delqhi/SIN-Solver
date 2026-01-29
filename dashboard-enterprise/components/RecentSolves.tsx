'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecentSolves } from '@/lib/api';
import { ScrollText, CheckCircle2, XCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatRelativeTime, formatDuration, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const statusIcons = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  timeout: <Clock className="h-4 w-4 text-amber-500" />,
};

const statusColors = {
  success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
  timeout: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

const captchaTypeColors: Record<string, string> = {
  'recaptcha_v2': 'bg-blue-500/10 text-blue-500',
  'recaptcha_v3': 'bg-blue-600/10 text-blue-600',
  'hcaptcha': 'bg-purple-500/10 text-purple-500',
  'turnstile': 'bg-orange-500/10 text-orange-500',
  'funcaptcha': 'bg-pink-500/10 text-pink-500',
  'text': 'bg-gray-500/10 text-gray-500',
  'image': 'bg-cyan-500/10 text-cyan-500',
  'slider': 'bg-yellow-500/10 text-yellow-500',
};

export default function RecentSolves() {
  const { solves, isLoading } = useRecentSolves(20);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-blue-500" />
          Recent Solves
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Latest CAPTCHA solving attempts
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : solves.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
              <p>No recent solves</p>
            </div>
          ) : (
            <div className="space-y-1 p-6 pt-0">
              {solves.map((solve) => (
                <div
                  key={solve.id}
                  className="group flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  {/* Status Icon */}
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    statusColors[solve.status].split(' ')[0]
                  )}>
                    {statusIcons[solve.status]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", captchaTypeColors[solve.type] || 'bg-gray-500/10')}
                      >
                        {solve.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {solve.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(solve.timestamp)}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-sm font-mono">
                        {formatDuration(solve.latency)}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  {solve.siteUrl && (
                    <a
                      href={solve.siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-accent rounded-md"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
