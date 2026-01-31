import puppeteer from 'puppeteer';
import UltimateCaptchaSolver from './src/ultimate-solver';
import * as fs from 'fs';

console.log('🚀 LIVE TEST: 2captcha.com/demo');
console.log('================================');

async function liveTest() {
  console.log('\n🔌 Verbinde mit Steel Browser CDP...');
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: 'ws://localhost:9223/devtools/browser',
    defaultViewport: { width: 1280, height: 720 }
  });
  
  console.log('✅ Verbunden!');
  
  const page = await browser.newPage();
  console.log('\n🌐 Navigiere zu 2captcha.com/demo...');
  
  await page.goto('https://2captcha.com/demo/recaptcha-v2', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  console.log('✅ Seite geladen!');
  
  // Warte auf reCAPTCHA
  console.log('\n⏳ Warte auf reCAPTCHA...');
  await page.waitForSelector('.g-recaptcha, iframe[src*="recaptcha"]', { timeout: 10000 });
  
  // Screenshot
  console.log('\n📸 Mache Screenshot...');
  const screenshot = await page.screenshot({ type: 'png', fullPage: false });
  
  const screenshotPath = `/tmp/captcha-${Date.now()}.png`;
  fs.writeFileSync(screenshotPath, screenshot);
  console.log(`✅ Screenshot gespeichert: ${screenshotPath}`);
  
  // LÖSE DAS CAPTCHA!
  console.log('\n🧠 Starte ULTIMATE SOLVER (8 Provider)...');
  console.log('   Reihenfolge: ddddocr → Tesseract → Skyvern → Ollama → OpenCode → Mistral → Groq → Stagehand');
  
  const solver = new UltimateCaptchaSolver();
  const result = await solver.solve(screenshot);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 ERGEBNIS');
  console.log('='.repeat(60));
  console.log(`✅ Erfolg: ${result.success ? 'JA' : 'NEIN'}`);
  console.log(`📝 Lösung: ${result.solution || 'N/A'}`);
  console.log(`🎯 Provider: ${result.provider}`);
  console.log(`📊 Methode: ${result.method}`);
  console.log(`💯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`⏱️  Dauer: ${result.durationMs}ms`);
  
  if (result.error) {
    console.log(`❌ Fehler: ${result.error}`);
  }
  
  console.log('='.repeat(60));
  
  // Versuche die Lösung einzutragen
  if (result.success && result.solution) {
    console.log('\n📝 Trage Lösung ein...');
    try {
      // Für reCAPTCHA müssen wir den Token verwenden
      await page.evaluate((token) => {
        const textarea = document.querySelector('#g-recaptcha-response');
        if (textarea) {
          textarea.value = token;
        }
      }, result.solution);
      console.log('✅ Lösung eingetragen!');
    } catch (e) {
      console.log('⚠️  Konnte Lösung nicht eintragen (reCAPTCHA erfordert Token)');
    }
  }
  
  await browser.disconnect();
  console.log('\n✅ Test abgeschlossen!');
}

liveTest().catch(err => {
  console.error('💥 FEHLER:', err.message);
  process.exit(1);
});
