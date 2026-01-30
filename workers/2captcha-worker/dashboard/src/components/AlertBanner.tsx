'use client';

import { Alert } from '@/lib/websocket-client';
import { cn } from '@/lib/utils';

interface AlertBannerProps {
  alert: Alert;
  onAcknowledge: (alertId: string) => void;
}

export function AlertBanner({ alert, onAcknowledge }: AlertBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border",
        alert.type === 'error' && "bg-red-50 border-red-200 text-red-800",
        alert.type === 'warning' && "bg-yellow-50 border-yellow-200 text-yellow-800",
        alert.type === 'info' && "bg-blue-50 border-blue-200 text-blue-800",
        alert.acknowledged && "opacity-50"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">
          {alert.type === 'error' && '⚠️'}
          {alert.type === 'warning' && '⚡'}
          {alert.type === 'info' && 'ℹ️'}
        </span>
        <div>
          <p className="font-medium">{alert.message}</p>
          <p className="text-sm opacity-75">
            {new Date(alert.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>
      {!alert.acknowledged && (
        <button
          onClick={() => onAcknowledge(alert.id)}
          className="px-4 py-2 text-sm font-medium bg-white rounded-md border hover:bg-gray-50 transition-colors"
        >
          Acknowledge
        </button>
      )}
    </div>
  );
}
