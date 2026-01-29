'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebSocketMessage } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState<number>(0);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      options.onConnect?.();
      
      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        const start = Date.now();
        socket.emit('ping', () => {
          setLatency(Date.now() - start);
        });
      }, 5000);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      options.onDisconnect?.();
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    });

    socket.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      options.onError?.(error);
    });

    socket.on('message', (message: WebSocketMessage) => {
      options.onMessage?.(message);
    });

    // Subscribe to specific events
    socket.on('stats', (data) => {
      options.onMessage?.({ type: 'stats', payload: data, timestamp: new Date().toISOString() });
    });

    socket.on('solve', (data) => {
      options.onMessage?.({ type: 'solve', payload: data, timestamp: new Date().toISOString() });
    });

    socket.on('alert', (data) => {
      options.onMessage?.({ type: 'alert', payload: data, timestamp: new Date().toISOString() });
    });

    socket.on('health', (data) => {
      options.onMessage?.({ type: 'health', payload: data, timestamp: new Date().toISOString() });
    });

    socketRef.current = socket;
  }, [options]);

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const sendMessage = useCallback((type: string, payload: unknown) => {
    socketRef.current?.emit(type, payload);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    latency,
    sendMessage,
    connect,
    disconnect,
  };
}

// Hook for real-time stats
export function useRealtimeStats() {
  const [stats, setStats] = useState<WebSocketMessage['payload'] | null>(null);
  
  const { isConnected } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'stats') {
        setStats(message.payload);
      }
    },
  });

  return { stats, isConnected };
}
