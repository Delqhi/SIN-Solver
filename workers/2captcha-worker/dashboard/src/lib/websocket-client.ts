'use client';

import { useEffect, useState, useCallback } from 'react';
import type { WorkerStats, Alert, Submission } from './websocket-server';

export function useWebSocket() {
  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:3001');
    
    websocket.onopen = () => {
      console.log('Connected to WebSocket server');
      setConnected(true);
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'stats') {
          setStats(message.data);
        } else if (message.type === 'alerts') {
          setAlerts(message.data);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setConnected(false);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'acknowledge_alert',
        alertId,
      }));
    }
  }, [ws]);

  return { stats, alerts, connected, acknowledgeAlert };
}

export type { WorkerStats, Alert, Submission };
