'use client';

import { create } from 'zustand';
import { DashboardState, Alert } from '@/types';

interface DashboardStore extends DashboardState {
  // Actions
  setStats: (stats: DashboardState['stats']) => void;
  addTimeSeriesPoint: (point: DashboardState['timeSeries'][0]) => void;
  setCaptchaTypes: (types: DashboardState['captchaTypes']) => void;
  setModels: (models: DashboardState['models']) => void;
  addRecentSolve: (solve: DashboardState['recentSolves'][0]) => void;
  setSystemHealth: (health: DashboardState['systemHealth']) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (alertId: string) => void;
  setConnected: (connected: boolean) => void;
  updateLastUpdate: () => void;
}

const initialState: DashboardState = {
  stats: {
    totalSolves: 0,
    successRate: 0,
    avgLatency: 0,
    totalCost: 0,
    solvesToday: 0,
    solvesThisHour: 0,
  },
  timeSeries: [],
  captchaTypes: [],
  models: [],
  recentSolves: [],
  systemHealth: [],
  alerts: [],
  isConnected: false,
  lastUpdate: new Date().toISOString(),
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  ...initialState,

  setStats: (stats) => set({ stats }),

  addTimeSeriesPoint: (point) =>
    set((state) => ({
      timeSeries: [...state.timeSeries.slice(-99), point],
    })),

  setCaptchaTypes: (captchaTypes) => set({ captchaTypes }),

  setModels: (models) => set({ models }),

  addRecentSolve: (solve) =>
    set((state) => ({
      recentSolves: [solve, ...state.recentSolves.slice(0, 49)],
    })),

  setSystemHealth: (systemHealth) => set({ systemHealth }),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
    })),

  acknowledgeAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ),
    })),

  setConnected: (isConnected) => set({ isConnected }),

  updateLastUpdate: () => set({ lastUpdate: new Date().toISOString() }),
}));
