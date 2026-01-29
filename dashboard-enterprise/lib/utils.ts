import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals = 0): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(decimals)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(decimals)}K`;
  }
  return num.toFixed(decimals);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${(ms / 60000).toFixed(1)}m`;
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'online':
    case 'healthy':
    case 'success':
      return 'text-status-online bg-status-online/10';
    case 'offline':
    case 'unhealthy':
    case 'error':
      return 'text-status-offline bg-status-offline/10';
    case 'warning':
    case 'degraded':
    case 'timeout':
      return 'text-status-warning bg-status-warning/10';
    default:
      return 'text-status-idle bg-status-idle/10';
  }
}

export function getStatusDot(status: string): string {
  switch (status) {
    case 'online':
    case 'healthy':
    case 'success':
      return 'bg-status-online';
    case 'offline':
    case 'unhealthy':
    case 'error':
      return 'bg-status-offline';
    case 'warning':
    case 'degraded':
    case 'timeout':
      return 'bg-status-warning';
    default:
      return 'bg-status-idle';
  }
}

export function calculateTrend(current: number, previous: number): { value: number; positive: boolean } {
  if (previous === 0) return { value: 0, positive: true };
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(change),
    positive: change >= 0,
  };
}
