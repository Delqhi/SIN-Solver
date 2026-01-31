import { createAccountManager, DEFAULT_ACCOUNTS } from '../src/account-isolation-manager';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  PARALLEL CAPTCHA SOLVER - 5 ACCOUNTS TEST                ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

const manager = createAccountManager(DEFAULT_ACCOUNTS);

console.log('📊 Initial Status:');
console.table(manager.getStatus());

console.log('\n🚀 Testing Parallel Solve (3 CAPTCHAs with 5 accounts)...\n');

const testUrls = [
  'https://2captcha.com/demo/recaptcha-v2',
  'https://2captcha.com/demo/recaptcha-v3',
  'https://2captcha.com/demo/hcaptcha'
];

const start = Date.now();

manager.solveParallel(testUrls.map(url => ({ url })))
  .then(results => {
    console.log('\n✅ RESULTS:');
    console.table(results.map(r => ({
      Account: r.accountName,
      Success: r.result.success,
      Provider: r.result.provider,
      Confidence: `${r.result.confidence}%`,
      Duration: `${r.result.durationMs}ms`
    })));
    
    console.log(`\n⏱️  Total Time: ${Date.now() - start}ms`);
    console.log('\n📊 Final Status:');
    console.table(manager.getStatus());
    
    console.log('\n📈 Metrics:');
    console.log(manager.getMetrics());
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
