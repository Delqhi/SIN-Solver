#!/usr/bin/env node
import { AutonomousCaptchaWorker } from './src/autonomous-worker';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  AUTONOMOUS CAPTCHA WORKER - 100% KI-GESTEUERT            ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

const worker = new AutonomousCaptchaWorker();

// EINFACH NUR DIESEN PROMPT:
worker.solve('https://2captcha.com/demo/recaptcha-v2', 'Löse das reCAPTCHA')
  .then(result => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ERGEBNIS                                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`✅ Erfolg: ${result.success}`);
    console.log(`📝 Lösung: ${result.solution || 'N/A'}`);
    console.log(`🎯 Provider: ${result.provider}`);
    console.log(`📊 Methode: ${result.method}`);
    console.log(`💯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`⏱️  Dauer: ${result.durationMs}ms`);
    console.log('');
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('💥 FEHLER:', err);
    process.exit(1);
  });
