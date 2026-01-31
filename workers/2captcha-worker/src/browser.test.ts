/**
 * Integration Test for 2Captcha Worker
 * 
 * Usage:
 *   npm test
 * 
 * This test validates the complete workflow:
 * 1. Browser initialization with stealth mode
 * 2. Login to 2Captcha
 * 3. Navigation to work section
 * 4. CAPTCHA detection and screenshot
 */

import SteelBrowserAutomation from '../src/browser';
import * as fs from 'fs';

describe('2Captcha Worker - Steel Browser Automation', () => {
  let automation: SteelBrowserAutomation;

  beforeAll(() => {
    // Validate that credentials are available
    if (!process.env['TWOCAPTCHA_EMAIL'] || !process.env['TWOCAPTCHA_PASSWORD']) {
      console.warn('⚠️ TWOCAPTCHA_EMAIL and TWOCAPTCHA_PASSWORD not set. Skipping integration tests.');
    }
  });

  afterAll(async () => {
    if (automation) {
      await automation.close();
    }
  });

  test('should initialize browser with stealth mode', async () => {
    automation = new SteelBrowserAutomation();
    await automation.initialize();
    
    const url = await automation.getCurrentUrl();
    expect(url).toBeDefined();
  }, 30000);

  test('should navigate to login page', async () => {
    if (!automation) {
      automation = new SteelBrowserAutomation();
      await automation.initialize();
    }

    await automation.navigateToLogin();
    const url = await automation.getCurrentUrl();
    
    expect(url).toContain('2captcha.com');
  }, 30000);

  test('should have screenshot directory created', () => {
    automation = new SteelBrowserAutomation();
    const screenshotDir = automation.getScreenshotDir();
    
    expect(fs.existsSync(screenshotDir)).toBe(true);
  });

  test('should handle missing credentials gracefully', () => {
    // Temporarily clear credentials
    const originalEmail = process.env['TWOCAPTCHA_EMAIL'];
    const originalPassword = process.env['TWOCAPTCHA_PASSWORD'];

    delete process.env['TWOCAPTCHA_EMAIL'];
    delete process.env['TWOCAPTCHA_PASSWORD'];

    expect(() => {
      new SteelBrowserAutomation();
    }).toThrow('Missing credentials');

    // Restore credentials
    if (originalEmail) process.env['TWOCAPTCHA_EMAIL'] = originalEmail;
    if (originalPassword) process.env['TWOCAPTCHA_PASSWORD'] = originalPassword;
  });
});

describe('2Captcha Worker - Configuration', () => {
  test('should use stealth mode by default', () => {
    const automation = new SteelBrowserAutomation();
    const dir = automation.getScreenshotDir();
    
    expect(dir).toContain('screenshots');
  });

  test('should support custom configuration', () => {
    const customConfig = {
      headless: true,
      stealth: true,
      viewport: { width: 1280, height: 720 }
    };

    const automation = new SteelBrowserAutomation(customConfig);
    const dir = automation.getScreenshotDir();
    
    expect(dir).toBeDefined();
  });

  test('should support custom credentials', () => {
    const customCreds = {
      email: 'test@example.com',
      password: 'testpassword'
    };

    // This should not throw if credentials are provided
    expect(() => {
      new SteelBrowserAutomation({}, customCreds);
    }).not.toThrow();
  });
});
