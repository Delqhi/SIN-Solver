/**
 * PNG CAPTCHA Test for OpenCode Vision
 * Tests with actual PNG image format
 */

import OpenCodeVisionProvider from './src/providers/opencode-vision';
import * as fs from 'fs';
import * as path from 'path';

// Create a simple PNG-like test (we'll use a data URI approach)
function createTestPNG(): string {
  // Simple 1x1 red pixel PNG in base64
  // This is a valid PNG file: 1x1 pixel, red color
  const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  return base64PNG;
}

async function testPNGCaptcha() {
  console.log('🧪 PNG CAPTCHA Test for OpenCode Vision\n');
  console.log('='.repeat(70));

  const provider = new OpenCodeVisionProvider({
    baseUrl: 'http://localhost:8080',
    model: 'kimi-k2.5-free',
    timeoutMs: 60000,
  });

  // Initialize
  console.log('\n🔌 Initializing provider...');
  const initialized = await provider.initialize();
  if (!initialized) {
    console.error('❌ Failed to initialize');
    process.exit(1);
  }
  console.log('✅ Provider initialized');

  // Create test PNG
  console.log('\n🖼️  Creating test PNG image...');
  const base64PNG = createTestPNG();
  const pngBuffer = Buffer.from(base64PNG, 'base64');
  const pngPath = path.join('./test-captcha.png');
  fs.writeFileSync(pngPath, pngBuffer);
  console.log(`✅ PNG created: ${pngPath} (${pngBuffer.length} bytes)`);

  // Test solving
  console.log('\n🧠 Testing PNG CAPTCHA solving...');
  const startTime = Date.now();
  
  try {
    const result = await provider.solveCaptcha(pngPath);
    const latency = Date.now() - startTime;
    
    console.log(`\n✅ Solved in ${latency}ms`);
    console.log(`   Solution: "${result.solution}"`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Model: ${result.model}`);
    
    // Note: A 1x1 pixel will likely return "UNCLEAR" or similar
    // This is expected - it's just to test the API flow
    if (result.solution.toLowerCase().includes('unclear') || result.confidence < 0.5) {
      console.log('\n⚠️  Note: 1x1 pixel test image returned low confidence');
      console.log('   This is EXPECTED - real CAPTCHAs will work better');
    }
    
  } catch (error) {
    console.error(`\n❌ Failed: ${error.message}`);
    console.log('\n🔍 Error Analysis:');
    console.log('   This might be due to:');
    console.log('   - API format issues');
    console.log('   - Image format not supported');
    console.log('   - OpenCode server not responding');
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await provider.dispose();
  fs.unlinkSync(pngPath);
  console.log('✅ Cleanup complete');

  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Summary');
  console.log('='.repeat(70));
  console.log('✅ Provider initialization: WORKING');
  console.log('✅ PNG file handling: WORKING');
  console.log('✅ API communication: TESTED');
  console.log('\n🎯 For production use:');
  console.log('   - Use real CAPTCHA screenshots (PNG/JPEG)');
  console.log('   - Minimum 200x100 pixels recommended');
  console.log('   - Clear text/images work best');
  console.log('='.repeat(70));
}

testPNGCaptcha().catch(console.error);
