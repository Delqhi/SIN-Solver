import useSWR from 'swr';
import {
  DashboardStats,
  TimeSeriesData,
  CaptchaTypeStats,
  ModelPerformance,
  RecentSolve,
  SystemHealth,
  Alert,
  ApiResponse,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Custom fetcher with error handling
async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse<T> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'API request failed');
  }

  return data.data;
}

// Dashboard Stats
export function useDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    `${API_BASE}/api/v2/dashboard/stats`,
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
    }
  );

  return {
    stats: data,
    error,
    isLoading,
    refresh: mutate,
  };
}

// Time Series Data
export function useTimeSeriesData(range: '1h' | '6h' | '24h' | '7d' = '24h') {
  const { data, error, isLoading } = useSWR<TimeSeriesData[]>(
    `${API_BASE}/api/v2/dashboard/timeseries?range=${range}`,
    fetcher,
    {
      refreshInterval: 10000,
    }
  );

  return {
    data: data || [],
    error,
    isLoading,
  };
}

// Captcha Type Distribution
export function useCaptchaTypeStats() {
  const { data, error, isLoading } = useSWR<CaptchaTypeStats[]>(
    `${API_BASE}/api/v2/dashboard/captcha-types`,
    fetcher,
    {
      refreshInterval: 30000,
    }
  );

  return {
    types: data || [],
    error,
    isLoading,
  };
}

// Model Performance
export function useModelPerformance() {
  const { data, error, isLoading, mutate } = useSWR<ModelPerformance[]>(
    `${API_BASE}/api/v2/models/performance`,
    fetcher,
    {
      refreshInterval: 10000,
    }
  );

  return {
    models: data || [],
    error,
    isLoading,
    refresh: mutate,
  };
}

// Recent Solves
export function useRecentSolves(limit = 50) {
  const { data, error, isLoading } = useSWR<RecentSolve[]>(
    `${API_BASE}/api/v2/solves/recent?limit=${limit}`,
    fetcher,
    {
      refreshInterval: 3000,
    }
  );

  return {
    solves: data || [],
    error,
    isLoading,
  };
}

// System Health
export function useSystemHealth() {
  const { data, error, isLoading } = useSWR<SystemHealth[]>(
    `${API_BASE}/api/v2/system/health`,
    fetcher,
    {
      refreshInterval: 5000,
    }
  );

  return {
    health: data || [],
    error,
    isLoading,
  };
}

// Alerts
export function useAlerts() {
  const { data, error, isLoading, mutate } = useSWR<Alert[]>(
    `${API_BASE}/api/v2/alerts`,
    fetcher,
    {
      refreshInterval: 10000,
    }
  );

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/v2/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to acknowledge alert');
      await mutate();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      throw error;
    }
  };

  return {
    alerts: data || [],
    error,
    isLoading,
    acknowledgeAlert,
    refresh: mutate,
  };
}

// Trigger manual solve (for testing)
export async function triggerSolve(url: string, type: string): Promise<{ id: string }> {
  const response = await fetch(`${API_BASE}/api/v2/solve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, type }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to trigger solve');
  }

  return response.json();
}

// Get solve details
export async function getSolveDetails(id: string): Promise<RecentSolve> {
  return fetcher<RecentSolve>(`${API_BASE}/api/v2/solves/${id}`);
}

// Export data
export async function exportData(format: 'csv' | 'json', range: string): Promise<Blob> {
  const response = await fetch(
    `${API_BASE}/api/v2/export?format=${format}&range=${range}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to export data');
  }

  return response.blob();
}
