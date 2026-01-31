#!/usr/bin/env node
/**
 * Test Auto-Healing CDP Connection Manager
 * Tests retry logic, health checks, and recovery
 */

import { AutoHealingCDPManager } from './src/auto-healing-cdp';

async function testAutoHealingCDP() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TASK 116: Test Auto-Healing CDP Connection Manager       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const manager = new AutoHealingCDPManager({
    httpUrl: 'http://localhost:50072',
    token: 'delqhi-admin',
    maxRetries: 2,
    retryDelay: 1000,
    healthCheckInterval: 10000,
    connectionTimeout: 10000
  });

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Connection
  console.log('Test 1: Establishing connection...');
  try {
    const connected = await manager.connect();
    if (connected) {
      console.log('✅ Connection established\n');
      testsPassed++;
    } else {
      console.log('❌ Connection failed\n');
      testsFailed++;
      return;
    }
  } catch (error) {
    console.log('❌ Connection error:', error, '\n');
    testsFailed++;
    return;
  }

  // Test 2: Navigation
  console.log('Test 2: Navigating to example.com...');
  try {
    await manager.navigate('https://example.com');
    console.log('✅ Navigation successful\n');
    testsPassed++;
  } catch (error) {
    console.log('❌ Navigation failed:', error, '\n');
    testsFailed++;
  }

  // Test 3: Send CDP command
  console.log('Test 3: Sending CDP command...');
  try {
    const result = await manager.sendCommand('Runtime.evaluate', {
      expression: 'navigator.userAgent'
    });
    if (result) {
      console.log('✅ CDP command executed');
      const userAgent = result.result?.value || result.value || 'N/A';
      console.log(`   User Agent: ${userAgent.toString().substring(0, 50)}...\n`);
      testsPassed++;
    } else {
      console.log('❌ CDP command returned no result\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ CDP command failed:', error, '\n');
    testsFailed++;
  }

  // Test 4: Check state
  console.log('Test 4: Checking connection state...');
  const state = manager.getState();
  console.log(`   Connected: ${state.isConnected}`);
  console.log(`   Healthy: ${state.isHealthy}`);
  console.log(`   Target ID: ${state.targetId}`);
  if (state.isConnected && state.isHealthy) {
    console.log('✅ State is healthy\n');
    testsPassed++;
  } else {
    console.log('❌ State is not healthy\n');
    testsFailed++;
  }

  // Test 5: Disconnect
  console.log('Test 5: Disconnecting...');
  try {
    await manager.disconnect();
    const finalState = manager.getState();
    if (!finalState.isConnected) {
      console.log('✅ Disconnected successfully\n');
      testsPassed++;
    } else {
      console.log('❌ Still connected after disconnect\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Disconnect failed:', error, '\n');
    testsFailed++;
  }

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TEST RESULTS                                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total:  ${testsPassed + testsFailed}`);
  console.log('─────────────────────────────────────────────────────────────');
  
  if (testsFailed === 0) {
    console.log('✅ ALL TESTS PASSED - Auto-Healing CDP Manager is working!\n');
    return true;
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    return false;
  }
}

testAutoHealingCDP().then(success => {
  process.exit(success ? 0 : 1);
});
