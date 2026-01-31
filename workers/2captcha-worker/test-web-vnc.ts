#!/usr/bin/env node
/**
 * Task 113: Verify Web VNC Connection (Browserless Debugger UI)
 * Tests the visual debugger interface on port 50070
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:50070';
const TOKEN = 'delqhi-admin';

async function testWebVNC() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TASK 113: Verify Web VNC Connection (Browserless UI)     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results = {
    docs: false,
    debugger: false,
    version: false,
    sessions: false,
    overall: false
  };

  try {
    // Test 1: Documentation endpoint
    console.log('Test 1: Checking /docs endpoint...');
    const docsRes = await fetch(`${BASE_URL}/docs?token=${TOKEN}`);
    if (docsRes.ok) {
      const docsHtml = await docsRes.text();
      if (docsHtml.includes('Browserless Docs')) {
        console.log('✅ Documentation UI accessible');
        results.docs = true;
      }
    }

    // Test 2: Debugger UI endpoint
    console.log('\nTest 2: Checking /debugger endpoint...');
    const debuggerRes = await fetch(`${BASE_URL}/debugger?token=${TOKEN}`);
    if (debuggerRes.ok) {
      const debuggerHtml = await debuggerRes.text();
      if (debuggerHtml.includes('Browserless Debugger')) {
        console.log('✅ Debugger UI accessible');
        console.log('   URL: http://localhost:50070/debugger?token=delqhi-admin');
        results.debugger = true;
      }
    }

    // Test 3: Version endpoint (CDP API)
    console.log('\nTest 3: Checking /json/version endpoint...');
    const versionRes = await fetch(`${BASE_URL}/json/version?token=${TOKEN}`);
    if (versionRes.ok) {
      const version = await versionRes.json();
      console.log('✅ CDP API accessible');
      console.log(`   Browser: ${version.Browser}`);
      console.log(`   Protocol: ${version['Protocol-Version']}`);
      results.version = true;
    }

    // Test 4: Sessions endpoint
    console.log('\nTest 4: Checking /sessions endpoint...');
    const sessionsRes = await fetch(`${BASE_URL}/sessions?token=${TOKEN}`);
    if (sessionsRes.ok) {
      const sessions = await sessionsRes.json();
      console.log('✅ Sessions API accessible');
      console.log(`   Active sessions: ${sessions.length}`);
      results.sessions = true;
    }

    // Overall result
    results.overall = results.docs && results.debugger && results.version && results.sessions;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  TEST RESULTS                                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Documentation UI: ${results.docs ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Debugger UI:      ${results.debugger ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`CDP API:          ${results.version ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Sessions API:     ${results.sessions ? '✅ PASS' : '❌ FAIL'}`);
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`Overall:          ${results.overall ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('');

    if (results.overall) {
      console.log('🎉 Browserless Web VNC is fully operational!');
      console.log('');
      console.log('📱 Access URLs:');
      console.log('   Debugger UI: http://localhost:50070/debugger?token=delqhi-admin');
      console.log('   Documentation: http://localhost:50070/docs?token=delqhi-admin');
      console.log('   CDP API: http://localhost:50072/json/version?token=delqhi-admin');
      console.log('');
    }

    return results.overall;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

testWebVNC().then(success => {
  process.exit(success ? 0 : 1);
});
