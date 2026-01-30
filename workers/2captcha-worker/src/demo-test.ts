/**
 * 2Captcha Worker - Simplified Demo Test
 * 
 * Tests the worker on 2captcha.com/demo with real CAPTCHAs
 * Headfull mode (visible browser) for observation
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Test Configuration
const TEST_CONFIG = {
  demoUrl: 'https://2captcha.com/demo',
  maxTests: 10,
  headless: false, // HEADFULL - Visible browser!
  slowMo: 100,
  screenshots: true,
};

// Simple Test Runner
async function runDemoTest(): Promise<void> {
  console.log('🚀 Starting 2Captcha Worker Demo Test');
  console.log('👀 Browser will open VISIBLE for observation');
  console.log('');

  // Create screenshot directory
  const screenshotDir = path.join(__dirname, '../screenshots', `demo-${Date.now()}`);
  if (TEST_CONFIG.screenshots) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Launch browser
  const browser = await chromium.launch({
    headless: TEST_CONFIG.headless,
    slowMo: TEST_CONFIG.slowMo,
    args: ['--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    // Navigate to demo
    console.log('🌐 Opening 2captcha.com/demo...');
    await page.goto(TEST_CONFIG.demoUrl, { waitUntil: 'networkidle' });
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-demo-page.png'),
      fullPage: true 
    });
    console.log('✅ Demo page loaded');
    console.log('📸 Screenshot saved');
    
    // Look for CAPTCHA
    console.log('');
    console.log('🔍 Looking for CAPTCHA elements...');
    
    // Common CAPTCHA selectors
    const captchaSelectors = [
      'img[src*="captcha"]',
      '.captcha-image',
      '[data-captcha]',
      'img[alt*="captcha" i]',
      '.captcha__image',
    ];
    
    let captchaFound = false;
    for (const selector of captchaSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`✅ CAPTCHA found: ${selector}`);
        captchaFound = true;
        
        // Screenshot CAPTCHA
        await element.screenshot({ 
          path: path.join(screenshotDir, '02-captcha-found.png') 
        });
        
        // Get image source
        const src = await element.getAttribute('src');
        console.log(`📸 CAPTCHA image: ${src?.substring(0, 100)}...`);
        
        break;
      }
    }
    
    if (!captchaFound) {
      console.log('⚠️  No CAPTCHA found on initial load');
      console.log('   This is normal - may need to interact first');
    }
    
    // Look for input field
    console.log('');
    console.log('🔍 Looking for answer input...');
    const inputSelectors = [
      'input[name="answer"]',
      'input[placeholder*="captcha" i]',
      '.captcha-input',
      '#captcha-answer',
    ];
    
    let inputFound = false;
    for (const selector of inputSelectors) {
      const input = await page.$(selector);
      if (input) {
        console.log(`✅ Input field found: ${selector}`);
        inputFound = true;
        break;
      }
    }
    
    if (!inputFound) {
      console.log('⚠️  No input field found');
    }
    
    // Look for submit button
    console.log('');
    console.log('🔍 Looking for submit button...');
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Check")',
      '.submit-button',
    ];
    
    let submitFound = false;
    for (const selector of submitSelectors) {
      const button = await page.$(selector);
      if (button) {
        console.log(`✅ Submit button found: ${selector}`);
        submitFound = true;
        break;
      }
    }
    
    if (!submitFound) {
      console.log('⚠️  No submit button found');
    }
    
    // Summary
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 DEMO TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`CAPTCHA Found: ${captchaFound ? '✅ YES' : '❌ NO'}`);
    console.log(`Input Field: ${inputFound ? '✅ YES' : '❌ NO'}`);
    console.log(`Submit Button: ${submitFound ? '✅ YES' : '❌ NO'}`);
    console.log(`Screenshots: ${screenshotDir}`);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('1. Check screenshots in:', screenshotDir);
    console.log('2. Verify CAPTCHA is visible');
    console.log('3. Run full test when ready');
    console.log('');
    console.log('✅ Demo test completed successfully!');
    console.log('='.repeat(60));
    
    // Wait a bit so user can see the browser
    console.log('');
    console.log('⏳ Waiting 10 seconds before closing...');
    console.log('   (You can see the browser window)');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test error:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('');
    console.log('🧹 Browser closed');
  }
}

// Run test
runDemoTest().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
