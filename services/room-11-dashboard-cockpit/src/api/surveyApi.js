const API_URL = import.meta.env.VITE_SURVEY_API || 'http://localhost:8018';

/**
 * SIN-Solver Survey Worker API Client
 * 100% FREE - No paid services
 */

export const surveyApi = {
  // Platform Management
  async getPlatforms() {
    const res = await fetch(`${API_URL}/platforms`);
    if (!res.ok) throw new Error(`Failed to fetch platforms: ${res.statusText}`);
    return res.json();
  },

  async getPlatformStatus(platformId) {
    const res = await fetch(`${API_URL}/platforms/${platformId}/status`);
    if (!res.ok) throw new Error(`Failed to fetch status: ${res.statusText}`);
    return res.json();
  },

  async startPlatform(platformId) {
    const res = await fetch(`${API_URL}/platforms/${platformId}/start`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to start: ${res.statusText}`);
    return res.json();
  },

  async stopPlatform(platformId) {
    const res = await fetch(`${API_URL}/platforms/${platformId}/stop`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to stop: ${res.statusText}`);
    return res.json();
  },

  async updatePlatformConfig(platformId, config) {
    const res = await fetch(`${API_URL}/platforms/${platformId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error(`Failed to update config: ${res.statusText}`);
    return res.json();
  },

  // Cookie Management
  async importCookies(platformId, cookies) {
    const res = await fetch(`${API_URL}/cookies/${platformId}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookies })
    });
    if (!res.ok) throw new Error(`Failed to import cookies: ${res.statusText}`);
    return res.json();
  },

  async getCookieStatus(platformId) {
    const res = await fetch(`${API_URL}/cookies/${platformId}`);
    if (!res.ok) throw new Error(`Failed to get cookie status: ${res.statusText}`);
    return res.json();
  },

  // Proxy Management
  async getProxies() {
    const res = await fetch(`${API_URL}/proxies`);
    if (!res.ok) throw new Error(`Failed to fetch proxies: ${res.statusText}`);
    return res.json();
  },

  async addProxy(proxyUrl) {
    const res = await fetch(`${API_URL}/proxies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: proxyUrl })
    });
    if (!res.ok) throw new Error(`Failed to add proxy: ${res.statusText}`);
    return res.json();
  },

  async removeProxy(proxyId) {
    const res = await fetch(`${API_URL}/proxies/${proxyId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to remove proxy: ${res.statusText}`);
    return res.json();
  },

  async testProxy(proxyId) {
    const res = await fetch(`${API_URL}/proxies/${proxyId}/test`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to test proxy: ${res.statusText}`);
    return res.json();
  },

  async assignProxy(proxyId, platformId) {
    const res = await fetch(`${API_URL}/proxies/${proxyId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platformId })
    });
    if (!res.ok) throw new Error(`Failed to assign proxy: ${res.statusText}`);
    return res.json();
  },

  // AI Chat
  async chat(message, context = {}) {
    const res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context })
    });
    if (!res.ok) throw new Error(`Failed to chat: ${res.statusText}`);
    return res.json();
  },

  // Earnings & Stats
  async getEarnings(period = 'week') {
    const res = await fetch(`${API_URL}/earnings?period=${period}`);
    if (!res.ok) throw new Error(`Failed to fetch earnings: ${res.statusText}`);
    return res.json();
  },

  async getStats() {
    const res = await fetch(`${API_URL}/stats`);
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
    return res.json();
  },

  // Health Check
  async health() {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error(`API unhealthy: ${res.statusText}`);
    return res.json();
  }
};

export default surveyApi;
