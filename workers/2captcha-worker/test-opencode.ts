/**
 * CAPTCHA Worker Test Script
 * Tests OpenCode Vision Provider with a sample CAPTCHA
 */

import OpenCodeVisionProvider from './src/providers/opencode-vision';
import * as fs from 'fs';
import * as path from 'path';

async function testOpenCodeProvider() {
  console.log('🧪 Testing OpenCode Vision Provider...\n');

  // Initialize provider
  const provider = new OpenCodeVisionProvider({
    baseUrl: 'http://localhost:8080',
    model: 'kimi-k2.5-free',
    timeoutMs: 30000,
  });

  console.log('🔌 Initializing provider...');
  const initialized = await provider.initialize();
  
  if (!initialized) {
    console.error('❌ Failed to initialize provider');
    process.exit(1);
  }

  console.log('✅ Provider initialized\n');

  // Create a simple test image with text
  // In production, this would be a real CAPTCHA screenshot
  console.log('📝 Note: For a real test, provide a CAPTCHA image path');
  console.log('   Usage: npm run test:captcha -- <image-path>\n');

  // Test with a sample image if provided
  const imagePath = process.argv[2];
  
  if (imagePath && fs.existsSync(imagePath)) {
    console.log(`🖼️  Testing with image: ${imagePath}`);
    
    try {
      const result = await provider.solveCaptcha(imagePath);
      
      console.log('\n✅ CAPTCHA Solved!');
      console.log(`   Solution: ${result.solution}`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Latency: ${result.latencyMs}ms`);
      console.log(`   Model: ${result.model}`);
    } catch (error) {
      console.error('\n❌ CAPTCHA solving failed:', error);
    }
  } else {
    console.log('ℹ️  No image provided or file not found');
    console.log('   To test with a real CAPTCHA:');
    console.log('   1. Take a screenshot of a CAPTCHA');
    console.log('   2. Run: npm run test:captcha -- ./captcha.png');
  }

  // Cleanup
  await provider.dispose();
  console.log('\n🧹 Cleanup complete');
}

// Run test
testOpenCodeProvider().catch(console.error);
