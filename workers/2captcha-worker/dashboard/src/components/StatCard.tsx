'use client';

import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
  alert?: boolean;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendValue,
  icon,
  className,
  alert = false
}: StatCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-lg border p-6 shadow-sm",
      alert && "border-red-500 bg-red-50",
      !alert && "border-gray-200",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={cn(
            "text-3xl font-bold mt-2",
            alert ? "text-red-600" : "text-gray-900"
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                "text-sm font-medium",
                trend === 'up' && "text-green-600",
                trend === 'down' && "text-red-600",
                trend === 'neutral' && "text-gray-600"
              )}>
                {trend === 'up' && '↑'}
                {trend === 'down' && '↓'}
                {trend === 'neutral' && '→'} {trendValue}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn(
            "p-3 rounded-lg",
            alert ? "bg-red-100" : "bg-gray-100"
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
