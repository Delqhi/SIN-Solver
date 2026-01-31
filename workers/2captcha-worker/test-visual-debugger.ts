#!/usr/bin/env node
/**
 * Test Visual Debugger with screenshots
 */

import { AutoHealingCDPManager } from './src/auto-healing-cdp';
import { VisualDebugger } from './src/visual-debugger';

async function testVisualDebugger() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TASK 117: Test Visual Debugger (Screenshots on Error)    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const manager = new AutoHealingCDPManager({
    httpUrl: 'http://localhost:50072',
    token: 'delqhi-admin',
    maxRetries: 2,
    retryDelay: 1000
  });

  const debugger_ = new VisualDebugger(manager, {
    enabled: true,
    screenshotDir: './test-screenshots',
    captureOnError: true,
    captureOnSteps: true,
    stepsToCapture: ['initial-connection', 'after-navigation', 'error', 'test-step']
  });

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Connect and capture initial screenshot
  console.log('Test 1: Connecting and capturing initial screenshot...');
  try {
    await manager.connect();
    // Wait a moment for page to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    const path = await debugger_.captureStepScreenshot('initial-connection');
    if (path) {
      console.log(`✅ Initial screenshot captured: ${path}\n`);
      testsPassed++;
    } else {
      console.log('❌ Failed to capture initial screenshot\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Connection/screenshot failed:', error, '\n');
    testsFailed++;
  }

  // Test 2: Navigate and capture
  console.log('Test 2: Navigating and capturing screenshot...');
  try {
    await manager.navigate('https://example.com');
    const path = await debugger_.captureStepScreenshot('after-navigation', 'https://example.com');
    if (path) {
      console.log(`✅ Navigation screenshot captured: ${path}\n`);
      testsPassed++;
    } else {
      console.log('❌ Failed to capture navigation screenshot\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Navigation failed:', error, '\n');
    testsFailed++;
  }

  // Test 3: Capture error screenshot
  console.log('Test 3: Testing error screenshot capture...');
  try {
    const testError = new Error('Test error for screenshot');
    const path = await debugger_.captureErrorScreenshot(testError, 'test-context');
    if (path) {
      console.log(`✅ Error screenshot captured: ${path}\n`);
      testsPassed++;
    } else {
      console.log('❌ Failed to capture error screenshot\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Error screenshot failed:', error, '\n');
    testsFailed++;
  }

  // Test 4: Generate report
  console.log('Test 4: Generating debug report...');
  try {
    const reportPath = debugger_.generateReport();
    if (reportPath && require('fs').existsSync(reportPath)) {
      console.log(`✅ Report generated: ${reportPath}\n`);
      testsPassed++;
    } else {
      console.log('❌ Failed to generate report\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Report generation failed:', error, '\n');
    testsFailed++;
  }

  // Test 5: Generate HTML timeline
  console.log('Test 5: Generating HTML timeline...');
  try {
    const htmlPath = debugger_.generateHTMLTimeline();
    if (htmlPath && require('fs').existsSync(htmlPath)) {
      console.log(`✅ HTML timeline generated: ${htmlPath}\n`);
      testsPassed++;
    } else {
      console.log('❌ Failed to generate HTML timeline\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ HTML generation failed:', error, '\n');
    testsFailed++;
  }

  // Cleanup
  console.log('Cleaning up...');
  await manager.disconnect();

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TEST RESULTS                                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total:  ${testsPassed + testsFailed}`);
  console.log('─────────────────────────────────────────────────────────────');
  
  if (testsFailed === 0) {
    console.log('✅ ALL TESTS PASSED - Visual Debugger is working!\n');
    console.log('📸 Screenshots saved in: ./test-screenshots/');
    console.log('📊 Report and HTML timeline generated');
    return true;
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    return false;
  }
}

testVisualDebugger().then(success => {
  process.exit(success ? 0 : 1);
});
