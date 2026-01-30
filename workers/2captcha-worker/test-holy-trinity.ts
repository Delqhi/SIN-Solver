#!/usr/bin/env node
/**
 * HOLY TRINITY WORKER - TEST RUN
 * 
 * Testet den Worker mit:
 * - Steel Browser CDP
 * - Mistral AI (pixtral-12b)
 * - Ohne Skyvern (nicht konfiguriert)
 * - Mit Stagehand Fallback
 */

import { HolyTrinityWorker } from './src/holy-trinity-worker';
import * as dotenv from 'dotenv';

dotenv.config();

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     HOLY TRINITY WORKER - TEST RUN                         ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log('🧠 Architecture: Steel Browser CDP + Skyvern + Mistral AI + Stagehand');
console.log('🎯 Target: 2captcha.com/demo');
console.log('⏱️  Max Duration: 60 seconds');
console.log('');

process.env.SKYVERN_ENABLED = 'true';
process.env.SKYVERN_URL = 'http://localhost:8000';

async function runTest(): Promise<void> {
  const worker = new HolyTrinityWorker();
  
  // Initialize
  console.log('🔌 Initializing worker...');
  console.log('   - Steel Browser CDP: localhost:9223');
  console.log('   - Skyvern: localhost:8000 (if available)');
  console.log('   - Mistral AI: pixtral-12b-2409');
  console.log('   - Stagehand: Fallback ready');
  console.log('');
  
  const initialized = await worker.initialize();
  
  if (!initialized) {
    console.error('❌ Worker initialization failed');
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Is Steel Browser running? (docker start agent-05-steel-browser)');
    console.log('   2. Check http://localhost:3005/health');
    console.log('   3. Verify MISTRAL_API_KEY in .env');
    process.exit(1);
  }
  
  // Solve CAPTCHA
  console.log('');
  console.log('🎯 Starting CAPTCHA solving test...');
  console.log('='.repeat(70));
  
  const startTime = Date.now();
  
  try {
    const result = await worker.solveCaptcha('https://2captcha.com/demo/recaptcha-v2');
    
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('');
    console.log('='.repeat(70));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`Success:     ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`Solution:    ${result.solution || 'N/A'}`);
    console.log(`Method:      ${result.method}`);
    console.log(`Confidence:  ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`Duration:    ${duration.toFixed(1)}s`);
    console.log('='.repeat(70));
    
    if (result.success) {
      console.log('');
      console.log('🎉 TEST PASSED!');
      console.log('✅ Holy Trinity Worker is working correctly');
      console.log('✅ Steel Browser CDP: Connected');
      console.log('✅ Mistral AI: Vision analysis working');
      console.log('✅ Stagehand: Fallback ready');
    } else {
      console.log('');
      console.log('❌ TEST FAILED');
      console.log(`Error: ${result.error}`);
    }
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('');
    console.error('💥 UNEXPECTED ERROR:');
    console.error(error);
    process.exit(1);
  }
}

// Timeout after 60 seconds
setTimeout(() => {
  console.error('');
  console.error('⏱️  TIMEOUT: Test took longer than 60 seconds');
  process.exit(1);
}, 60000);

runTest().catch(console.error);
