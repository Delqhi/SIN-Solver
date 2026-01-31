#!/usr/bin/env node
/**
 * Test Proxy Rotation System
 */

import { ProxyRotator } from './src/proxy-rotator';

async function testProxyRotation() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TASK 119: Test Proxy Rotation System                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Test proxies
  const proxies = [
    { host: 'proxy1.example.com', port: 1080, type: 'socks5' as const, weight: 2 },
    { host: 'proxy2.example.com', port: 8080, type: 'http' as const, weight: 1 },
    { host: 'proxy3.example.com', port: 1080, type: 'socks5' as const },
    { host: 'proxy4.example.com', port: 3128, type: 'http' as const }
  ];

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Round-robin strategy
  console.log('Test 1: Round-robin rotation strategy...');
  try {
    const rotator = new ProxyRotator(proxies, 'round-robin');
    const selected: string[] = [];
    
    for (let i = 0; i < 8; i++) {
      const proxy = rotator.getNextProxy();
      if (proxy) {
        selected.push(`${proxy.host}:${proxy.port}`);
      }
    }
    
    // Should cycle through all 4 proxies twice
    const unique = new Set(selected);
    if (unique.size === 4 && selected.length === 8) {
      console.log(`✅ Round-robin working: ${selected.slice(0, 4).join(', ')}...`);
      testsPassed++;
    } else {
      console.log('❌ Round-robin not cycling correctly');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Round-robin test failed:', error);
    testsFailed++;
  }

  // Test 2: Random strategy
  console.log('\nTest 2: Random rotation strategy...');
  try {
    const rotator = new ProxyRotator(proxies, 'random');
    const selected: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const proxy = rotator.getNextProxy();
      if (proxy) {
        selected.push(`${proxy.host}:${proxy.port}`);
      }
    }
    
    // Should have some variety (not all same)
    const unique = new Set(selected);
    if (unique.size >= 2) {
      console.log(`✅ Random selection working: ${unique.size} unique proxies selected`);
      testsPassed++;
    } else {
      console.log('❌ Random not providing variety');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Random test failed:', error);
    testsFailed++;
  }

  // Test 3: Least-used strategy
  console.log('\nTest 3: Least-used rotation strategy...');
  try {
    const rotator = new ProxyRotator(proxies, 'least-used');
    
    // Get multiple proxies - least-used should distribute evenly
    const selected: string[] = [];
    for (let i = 0; i < 8; i++) {
      const proxy = rotator.getNextProxy();
      if (proxy) {
        selected.push(`${proxy.host}:${proxy.port}`);
      }
    }
    
    // Should have used all proxies (least-used distributes evenly)
    const unique = new Set(selected);
    if (unique.size >= 3) {
      console.log(`✅ Least-used strategy working: ${unique.size} unique proxies`);
      testsPassed++;
    } else {
      console.log(`❌ Least-used not distributing: only ${unique.size} unique`);
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Least-used test failed:', error);
    testsFailed++;
  }

  // Test 4: Weighted strategy
  console.log('\nTest 4: Weighted rotation strategy...');
  try {
    const weightedProxies = [
      { host: 'heavy.example.com', port: 1080, type: 'socks5' as const, weight: 5 },
      { host: 'light.example.com', port: 1080, type: 'socks5' as const, weight: 1 }
    ];
    
    const rotator = new ProxyRotator(weightedProxies, 'weighted');
    const counts = new Map<string, number>();
    
    // Sample many times
    for (let i = 0; i < 100; i++) {
      const proxy = rotator.getNextProxy();
      if (proxy) {
        const key = proxy.host;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    
    const heavyCount = counts.get('heavy.example.com') || 0;
    const lightCount = counts.get('light.example.com') || 0;
    
    // Heavy should be selected roughly 5x more than light
    if (heavyCount > lightCount * 3) {
      console.log(`✅ Weighted strategy working: heavy=${heavyCount}, light=${lightCount}`);
      testsPassed++;
    } else {
      console.log(`❌ Weighted not respecting weights: heavy=${heavyCount}, light=${lightCount}`);
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Weighted test failed:', error);
    testsFailed++;
  }

  // Test 5: Health check and failure tracking
  console.log('\nTest 5: Health check and failure tracking...');
  try {
    const rotator = new ProxyRotator(proxies, 'round-robin');
    const proxy = rotator.getNextProxy();
    
    if (proxy) {
      // Record failures
      rotator.recordFailure(proxy);
      rotator.recordFailure(proxy);
      rotator.recordFailure(proxy);
      
      // Check stats
      const stats = rotator.getStats();
      const key = `${proxy.type}://${proxy.host}:${proxy.port}`;
      const proxyStats = stats.get(key);
      
      if (proxyStats && proxyStats.failures === 3 && !proxyStats.isHealthy) {
        console.log('✅ Failure tracking working - proxy marked unhealthy');
        testsPassed++;
      } else {
        console.log('❌ Failure tracking not working correctly');
        testsFailed++;
      }
    }
  } catch (error) {
    console.log('❌ Health check test failed:', error);
    testsFailed++;
  }

  // Test 6: Add/remove proxies
  console.log('\nTest 6: Add and remove proxies...');
  try {
    const rotator = new ProxyRotator(proxies.slice(0, 2), 'round-robin');
    
    // Add new proxy
    rotator.addProxy({ host: 'new.example.com', port: 1080, type: 'socks5' });
    
    // Remove proxy
    rotator.removeProxy(proxies[0]);
    
    const allProxies = rotator.getAllProxies();
    const hasNew = allProxies.some(p => p.host === 'new.example.com');
    const hasRemoved = allProxies.some(p => p.host === proxies[0].host);
    
    if (hasNew && !hasRemoved) {
      console.log('✅ Add/remove working correctly');
      testsPassed++;
    } else {
      console.log('❌ Add/remove not working');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Add/remove test failed:', error);
    testsFailed++;
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  TEST RESULTS                                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total:  ${testsPassed + testsFailed}`);
  console.log('─────────────────────────────────────────────────────────────');
  
  if (testsFailed === 0) {
    console.log('✅ ALL TESTS PASSED - Proxy Rotation System is working!\n');
    return true;
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    return false;
  }
}

testProxyRotation().then(success => {
  process.exit(success ? 0 : 1);
});
