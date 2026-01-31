import { EventEmitter } from 'events';

export interface Endpoint {
  url: string;
  healthy: boolean;
  weight: number;
  activeConnections: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastChecked: number;
  lastFailureReason?: string;
  consecutiveFailures: number;
}

export interface EndpointStatus {
  url: string;
  healthy: boolean;
  activeConnections: number;
  totalRequests: number;
  failedRequests: number;
  lastChecked: number;
}

export interface LoadBalancerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  queuedRequests: number;
  activeEndpoints: number;
  totalEndpoints: number;
}

export interface QueuedRequest {
  id: string;
  resolve: (endpoint: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeout: number;
}

export type LoadBalancingStrategy = 'round-robin' | 'least-connections' | 'weighted';

export interface LoadBalancerOptions {
  strategy?: LoadBalancingStrategy;
  maxConnectionsPerEndpoint?: number;
  maxQueueSize?: number;
  healthCheckIntervalMs?: number;
  requestTimeout?: number;
  maxConsecutiveFailures?: number;
  failureCooldownMs?: number;
}

export class BrowserlessLoadBalancer extends EventEmitter {
  private endpoints: Map<string, Endpoint> = new Map();
  private strategy: LoadBalancingStrategy;
  private maxConnectionsPerEndpoint: number;
  private maxQueueSize: number;
  private healthCheckIntervalMs: number;
  private requestTimeout: number;
  private maxConsecutiveFailures: number;
  private failureCooldownMs: number;
  
  private requestQueue: QueuedRequest[] = [];
  private roundRobinIndex = 0;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private totalRequests = 0;
  private totalResponseTime = 0;

  /**
   * Creates a new BrowserlessLoadBalancer instance
   * @param endpoints - Array of Browserless endpoint URLs
   * @param options - Configuration options for the load balancer
   */
  constructor(endpoints: string[] = [], options: LoadBalancerOptions = {}) {
    super();
    
    this.strategy = options.strategy || 'round-robin';
    this.maxConnectionsPerEndpoint = options.maxConnectionsPerEndpoint || 100;
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.healthCheckIntervalMs = options.healthCheckIntervalMs || 30000;
    this.requestTimeout = options.requestTimeout || 30000;
    this.maxConsecutiveFailures = options.maxConsecutiveFailures || 3;
    this.failureCooldownMs = options.failureCooldownMs || 60000;

    endpoints.forEach(url => this.addEndpoint(url));
    this.startHealthChecks();
  }

  /**
   * Adds a new endpoint to the load balancer
   * @param url - The endpoint URL to add
   * @param weight - The weight for weighted strategy (default: 1)
   */
  addEndpoint(url: string, weight: number = 1): void {
    if (this.endpoints.has(url)) {
      console.warn(`Endpoint ${url} already exists`);
      return;
    }

    const endpoint: Endpoint = {
      url,
      healthy: true,
      weight: Math.max(1, weight),
      activeConnections: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastChecked: Date.now(),
      consecutiveFailures: 0,
    };

    this.endpoints.set(url, endpoint);
    this.emit('endpointAdded', endpoint);
  }

  /**
   * Removes an endpoint from the load balancer
   * @param url - The endpoint URL to remove
   */
  removeEndpoint(url: string): void {
    const endpoint = this.endpoints.get(url);
    if (!endpoint) {
      console.warn(`Endpoint ${url} not found`);
      return;
    }

    this.endpoints.delete(url);
    this.emit('endpointRemoved', endpoint);
  }

  /**
   * Gets the next available endpoint based on the configured strategy
   * @returns Promise resolving to the endpoint URL
   */
  async getNextEndpoint(): Promise<string> {
    const endpoint = this.selectEndpoint();
    
    if (endpoint) {
      this.totalRequests++;
      endpoint.activeConnections++;
      endpoint.totalRequests++;
      this.emit('endpointSelected', endpoint);
      return endpoint.url;
    }

    return this.queueRequest();
  }

  /**
   * Releases an endpoint after use
   * @param url - The endpoint URL to release
   * @param success - Whether the request was successful
   * @param responseTime - The response time in milliseconds
   */
  releaseEndpoint(url: string, success: boolean, responseTime: number): void {
    const endpoint = this.endpoints.get(url);
    if (!endpoint) return;

    endpoint.activeConnections = Math.max(0, endpoint.activeConnections - 1);
    
    if (success) {
      endpoint.successfulRequests++;
      endpoint.consecutiveFailures = 0;
      endpoint.averageResponseTime = 
        (endpoint.averageResponseTime * (endpoint.successfulRequests - 1) + responseTime) /
        endpoint.successfulRequests;
      
      this.totalResponseTime += responseTime;
    } else {
      endpoint.failedRequests++;
      endpoint.consecutiveFailures++;
      
      if (endpoint.consecutiveFailures >= this.maxConsecutiveFailures) {
        this.markEndpointUnhealthy(url, 'Too many consecutive failures');
      }
    }

    this.processQueue();
  }

  /**
   * Marks an endpoint as healthy
   * @param url - The endpoint URL to mark healthy
   */
  markEndpointHealthy(url: string): void {
    const endpoint = this.endpoints.get(url);
    if (!endpoint) return;

    const wasUnhealthy = !endpoint.healthy;
    endpoint.healthy = true;
    endpoint.consecutiveFailures = 0;
    endpoint.lastFailureReason = undefined;
    endpoint.lastChecked = Date.now();

    if (wasUnhealthy) {
      this.emit('endpointHealthy', endpoint);
    }
  }

  /**
   * Marks an endpoint as unhealthy
   * @param url - The endpoint URL to mark unhealthy
   * @param reason - The reason for marking unhealthy
   */
  markEndpointUnhealthy(url: string, reason: string): void {
    const endpoint = this.endpoints.get(url);
    if (!endpoint) return;

    const wasHealthy = endpoint.healthy;
    endpoint.healthy = false;
    endpoint.lastFailureReason = reason;
    endpoint.lastChecked = Date.now();

    if (wasHealthy) {
      this.emit('endpointUnhealthy', endpoint, reason);
      
      setTimeout(() => {
        this.checkEndpointHealth(url);
      }, this.failureCooldownMs);
    }
  }

  /**
   * Gets the status of all endpoints
   * @returns Array of endpoint status objects
   */
  getEndpointStatus(): EndpointStatus[] {
    return Array.from(this.endpoints.values()).map(endpoint => ({
      url: endpoint.url,
      healthy: endpoint.healthy,
      activeConnections: endpoint.activeConnections,
      totalRequests: endpoint.totalRequests,
      failedRequests: endpoint.failedRequests,
      lastChecked: endpoint.lastChecked,
    }));
  }

  /**
   * Gets load balancer metrics
   * @returns Load balancer metrics object
   */
  getMetrics(): LoadBalancerMetrics {
    const endpoints = Array.from(this.endpoints.values());
    const healthyEndpoints = endpoints.filter(e => e.healthy);
    
    const totalSuccessful = endpoints.reduce((sum, e) => sum + e.successfulRequests, 0);
    const totalFailed = endpoints.reduce((sum, e) => sum + e.failedRequests, 0);
    
    return {
      totalRequests: this.totalRequests,
      successfulRequests: totalSuccessful,
      failedRequests: totalFailed,
      averageResponseTime: totalSuccessful > 0 ? this.totalResponseTime / totalSuccessful : 0,
      queuedRequests: this.requestQueue.length,
      activeEndpoints: healthyEndpoints.length,
      totalEndpoints: endpoints.length,
    };
  }

  /**
   * Stops the load balancer and cleans up resources
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.requestQueue.forEach(request => {
      request.reject(new Error('Load balancer stopped'));
    });
    this.requestQueue = [];

    this.emit('stopped');
  }

  /**
   * Updates the load balancing strategy
   * @param strategy - The new strategy to use
   */
  setStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    this.emit('strategyChanged', strategy);
  }

  private selectEndpoint(): Endpoint | null {
    const availableEndpoints = Array.from(this.endpoints.values()).filter(
      endpoint => endpoint.healthy && endpoint.activeConnections < this.maxConnectionsPerEndpoint
    );

    if (availableEndpoints.length === 0) {
      return null;
    }

    switch (this.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(availableEndpoints);
      case 'least-connections':
        return this.selectLeastConnections(availableEndpoints);
      case 'weighted':
        return this.selectWeighted(availableEndpoints);
      default:
        return this.selectRoundRobin(availableEndpoints);
    }
  }

  private selectRoundRobin(endpoints: Endpoint[]): Endpoint {
    const endpoint = endpoints[this.roundRobinIndex % endpoints.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % endpoints.length;
    return endpoint;
  }

  private selectLeastConnections(endpoints: Endpoint[]): Endpoint {
    return endpoints.reduce((min, endpoint) =>
      endpoint.activeConnections < min.activeConnections ? endpoint : min
    );
  }

  private selectWeighted(endpoints: Endpoint[]): Endpoint {
    const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return endpoints[0];
  }

  private queueRequest(): Promise<string> {
    if (this.requestQueue.length >= this.maxQueueSize) {
      return Promise.reject(new Error('Request queue full'));
    }

    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: this.generateRequestId(),
        resolve,
        reject,
        timestamp: Date.now(),
        timeout: this.requestTimeout,
      };

      this.requestQueue.push(request);
      this.emit('requestQueued', request);

      setTimeout(() => {
        const index = this.requestQueue.findIndex(r => r.id === request.id);
        if (index >= 0) {
          this.requestQueue.splice(index, 1);
          request.reject(new Error('Request timeout'));
        }
      }, this.requestTimeout);
    });
  }

  private processQueue(): void {
    while (this.requestQueue.length > 0) {
      const endpoint = this.selectEndpoint();
      if (!endpoint) break;

      const request = this.requestQueue.shift();
      if (!request) break;

      endpoint.activeConnections++;
      endpoint.totalRequests++;
      this.totalRequests++;
      
      this.emit('requestDequeued', request, endpoint);
      request.resolve(endpoint.url);
    }
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.endpoints.forEach((_, url) => {
        void this.checkEndpointHealth(url);
      });
    }, this.healthCheckIntervalMs);
  }

  private async checkEndpointHealth(url: string): Promise<void> {
    const endpoint = this.endpoints.get(url);
    if (!endpoint) return;

    try {
      const isHealthy = await this.performHealthCheck(url);
      
      if (isHealthy) {
        this.markEndpointHealthy(url);
      } else {
        this.markEndpointUnhealthy(url, 'Health check failed');
      }
    } catch (error) {
      this.markEndpointUnhealthy(url, error instanceof Error ? error.message : String(error));
    }
  }

  private async performHealthCheck(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, 5000);

      try {
        const ws = new WebSocket(url);
        
        ws.on('open', () => {
          clearTimeout(timeoutId);
          ws.close();
          resolve(true);
        });
        
        ws.on('error', () => {
          clearTimeout(timeoutId);
          resolve(false);
        });
      } catch {
        clearTimeout(timeoutId);
        resolve(false);
      }
    });
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

import WebSocket from 'ws';

export default BrowserlessLoadBalancer;
