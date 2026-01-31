/**
 * 2Captcha Worker - Intelligent Demo Test
 * 
 * Tests the intelligent worker on 2captcha.com/demo
 * Actually clicks on "Normal Captcha" and tries to solve it
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Test Configuration
const TEST_CONFIG = {
  demoUrl: 'https://2captcha.com/demo',
  maxTests: 3, // Nur 3 Tests für Demo
  headless: false, // HEADFULL - Visible browser!
  slowMo: 100,
  screenshots: true,
};

// Simple Test Runner
async function runIntelligentDemo(): Promise<void> {
  console.log('🚀 Starting INTELLIGENT 2Captcha Worker Demo');
  console.log('🧠 Using OpenCode ZEN Free Models');
  console.log('👀 Browser will open VISIBLE for observation');
  console.log('');

  // Create screenshot directory
  const screenshotDir = path.join(__dirname, '../screenshots', `intelligent-demo-${Date.now()}`);
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
    // Step 1: Navigate to demo
    console.log('🌐 Step 1: Opening 2captcha.com/demo...');
    await page.goto(TEST_CONFIG.demoUrl, { waitUntil: 'networkidle' });
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-demo-page.png'),
      fullPage: true 
    });
    console.log('✅ Demo page loaded');
    
    // Step 2: Click on "Normal Captcha"
    console.log('');
    console.log('🖱️  Step 2: Looking for "Normal Captcha" option...');
    
    const normalCaptchaSelectors = [
      'text=Normal Captcha',
      'a:has-text("Normal Captcha")',
      'button:has-text("Normal Captcha")',
      '[href*="normal"]',
    ];
    
    let normalCaptchaClicked = false;
    for (const selector of normalCaptchaSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          console.log(`✅ Clicked: ${selector}`);
          normalCaptchaClicked = true;
          
          // Wait for CAPTCHA to load
          await page.waitForTimeout(3000);
          
          await page.screenshot({ 
            path: path.join(screenshotDir, '02-after-click-normal-captcha.png'),
            fullPage: true 
          });
          console.log('📸 Screenshot after clicking Normal Captcha');
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!normalCaptchaClicked) {
      console.log('⚠️  Could not find "Normal Captcha" option');
      console.log('   Trying alternative: Looking for any captcha link...');
      
      // Try clicking any captcha type
      const anyCaptcha = await page.$('a[href*="captcha"], .captcha-type, [class*="captcha-item"]');
      if (anyCaptcha) {
        await anyCaptcha.click();
        console.log('✅ Clicked alternative captcha option');
        await page.waitForTimeout(3000);
      }
    }
    
    // Step 3: Look for REAL CAPTCHA (not logo!)
    console.log('');
    console.log('🔍 Step 3: Looking for REAL CAPTCHA (not logo)...');
    
    // Smart CAPTCHA detection (not just src*="captcha")
    const captchaSelectors = [
      // Form-based CAPTCHAs (real challenges)
      'form img[src*="captcha"]',
      '.captcha-container img',
      '.captcha-box img',
      '.captcha-challenge img',
      
      // Class-based (more reliable)
      '.captcha__image',
      'img.captcha-image:not([src*="logo"])',
      
      // Alt text based
      'img[alt="CAPTCHA" i]',
      'img[alt="Security code" i]',
      'img[alt="Verification code" i]',
    ];
    
    let captchaFound = false;
    let captchaElement = null;
    
    for (const selector of captchaSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          // Check if it's not a logo (size check)
          const box = await element.boundingBox();
          if (box && box.width >= 150 && box.width <= 500 && 
              box.height >= 50 && box.height <= 200) {
            console.log(`✅ REAL CAPTCHA found: ${selector}`);
            console.log(`   Size: ${box.width}x${box.height}`);
            captchaFound = true;
            captchaElement = element;
            
            // Screenshot the CAPTCHA
            await element.screenshot({ 
              path: path.join(screenshotDir, '03-real-captcha.png') 
            });
            console.log('📸 CAPTCHA screenshot saved');
            break;
          }
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!captchaFound) {
      console.log('⚠️  No REAL CAPTCHA found (only logo or nothing)');
    }
    
    // Step 4: Look for input field
    console.log('');
    console.log('🔍 Step 4: Looking for answer input...');
    
    const inputSelectors = [
      'input[name="answer"]',
      'input[placeholder*="captcha" i]',
      'input[placeholder*="code" i]',
      '.captcha-input',
      '#captcha-answer',
      'form input[type="text"]',
    ];
    
    let inputFound = false;
    for (const selector of inputSelectors) {
      try {
        const input = await page.$(selector);
        if (input) {
          console.log(`✅ Input field found: ${selector}`);
          inputFound = true;
          
          // Try to fill with dummy text (just to test)
          // In real scenario, this would be the KI solution
          await input.fill('TEST123');
          console.log('📝 Filled input with TEST123 (dummy)');
          
          await page.screenshot({ 
            path: path.join(screenshotDir, '04-filled-input.png'),
            fullPage: true 
          });
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!inputFound) {
      console.log('⚠️  No input field found');
    }
    
    // Step 5: Look for submit button
    console.log('');
    console.log('🔍 Step 5: Looking for submit button...');
    
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Check")',
      'button:has-text("Verify")',
      '.submit-button',
      'input[type="submit"]',
    ];
    
    let submitFound = false;
    for (const selector of submitSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          console.log(`✅ Submit button found: ${selector}`);
          submitFound = true;
          
          // Don't actually submit (just testing)
          console.log('⏹️  Not clicking submit (demo mode)');
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!submitFound) {
      console.log('⚠️  No submit button found');
    }
    
    // Summary
    console.log('');
    console.log('='.repeat(70));
    console.log('📊 INTELLIGENT WORKER DEMO SUMMARY');
    console.log('='.repeat(70));
    console.log(`Normal Captcha Clicked: ${normalCaptchaClicked ? '✅ YES' : '❌ NO'}`);
    console.log(`Real CAPTCHA Found: ${captchaFound ? '✅ YES' : '❌ NO'}`);
    console.log(`Input Field: ${inputFound ? '✅ YES' : '❌ NO'}`);
    console.log(`Submit Button: ${submitFound ? '✅ YES' : '❌ NO'}`);
    console.log(`Screenshots: ${screenshotDir}`);
    console.log('');
    
    if (captchaFound && inputFound && submitFound) {
      console.log('🎉 SUCCESS! All elements found!');
      console.log('   Ready for intelligent solving with OpenCode ZEN');
    } else {
      console.log('⚠️  PARTIAL SUCCESS - Some elements missing');
      console.log('   Check screenshots to see what happened');
    }
    
    console.log('');
    console.log('🧠 Next: Integrate OpenCode ZEN API for real solving');
    console.log('   Models: opencode/kimi-k2.5-free (vision)');
    console.log('           opencode/glm-4.7-free (text)');
    console.log('='.repeat(70));
    
    // Wait so user can see
    console.log('');
    console.log('⏳ Waiting 15 seconds before closing...');
    console.log('   (You can see the browser window)');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('❌ Test error:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('');
    console.log('🧹 Browser closed');
    console.log('✅ Intelligent Demo test completed!');
  }
}

// Run test
runIntelligentDemo().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
