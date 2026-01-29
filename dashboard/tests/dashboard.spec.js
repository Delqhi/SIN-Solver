const { test, expect } = require('@playwright/test');

test.describe('SIN-Cockpit Dashboard', () => {
  
  test('API returns real Docker data', async ({ request }) => {
    const response = await request.get('http://localhost:3011/api/services');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.services).toBeDefined();
    expect(data.services.length).toBeGreaterThan(0);
    expect(data.source).toBe('docker-socket');
    expect(data.summary.total).toBeGreaterThan(0);
  });

  test('Health endpoint returns healthy', async ({ request }) => {
    const response = await request.get('http://localhost:3011/api/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('cockpit-dashboard');
  });

});
