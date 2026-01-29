export interface DashboardStats {
  totalSolves: number;
  successRate: number;
  avgLatency: number;
  totalCost: number;
  solvesToday: number;
  solvesThisHour: number;
}

export interface TimeSeriesData {
  timestamp: string;
  solves: number;
  errors: number;
  successRate: number;
  latency: number;
}

export interface CaptchaTypeStats {
  type: string;
  count: number;
  successRate: number;
  avgLatency: number;
  percentage: number;
}

export interface ModelPerformance {
  id: string;
  name: string;
  type: 'vision' | 'consensus' | 'fallback';
  totalSolves: number;
  successRate: number;
  avgLatency: number;
  costPerSolve: number;
  status: 'online' | 'offline' | 'degraded';
  lastUsed: string;
}

export interface RecentSolve {
  id: string;
  type: string;
  status: 'success' | 'error' | 'timeout';
  latency: number;
  model: string;
  timestamp: string;
  siteUrl?: string;
}

export interface SystemHealth {
  component: string;
  status: 'healthy' | 'unhealthy' | 'warning';
  latency: number;
  lastCheck: string;
  uptime: number;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  component: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface DashboardState {
  stats: DashboardStats;
  timeSeries: TimeSeriesData[];
  captchaTypes: CaptchaTypeStats[];
  models: ModelPerformance[];
  recentSolves: RecentSolve[];
  systemHealth: SystemHealth[];
  alerts: Alert[];
  isConnected: boolean;
  lastUpdate: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'viewer';
  avatar?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

export interface WebSocketMessage {
  type: 'stats' | 'solve' | 'alert' | 'health' | 'ping';
  payload: unknown;
  timestamp: string;
}
