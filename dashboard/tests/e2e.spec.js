const { test, expect } = require('@playwright/test');

test.describe('SIN-Cockpit E2E', () => {
  
  test('Dashboard loads and shows Empire State', async ({ page }) => {
    await page.goto('http://localhost:3011');
    
    await expect(page).toHaveTitle(/SIN-COCKPIT/);
    
    await expect(page.getByText('Empire Control')).toBeVisible();
    
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('Sidebar navigation works', async ({ page }) => {
    await page.goto('http://localhost:3011');
    
    // Use specific role to avoid ambiguity with text on page
    await page.getByRole('button', { name: 'Mission Control' }).click();
    
    await expect(page.getByText('Real-time Telemetry')).toBeVisible();
  });

  test('Settings page loads', async ({ page }) => {
    await page.goto('http://localhost:3011');
    
    await page.getByText('Settings').click();
    
    await expect(page.getByText('General Settings')).toBeVisible();
  });

  test('Real-time telemetry shows data', async ({ page }) => {
    await page.goto('http://localhost:3011');
    
    // Wait for animations to complete or element to appear
    await expect(page.getByText('System Integrity')).toBeVisible({ timeout: 10000 });
  });

});
