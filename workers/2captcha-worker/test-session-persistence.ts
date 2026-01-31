import { SessionPersistence, SessionData } from './src/session-persistence';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = './test-session-data';

class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<void> {
    console.log('🧪 Session Persistence Tests\n');
    console.log('=' .repeat(60));

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ ${name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${name}`);
        console.log(`   Error: ${(error as Error).message}`);
      }
    }

    console.log('=' .repeat(60));
    console.log(`\n📊 Results: ${this.passed}/${this.tests.length} passed`);
    
    this.cleanup();
    process.exit(this.failed > 0 ? 1 : 0);
  }

  private cleanup(): void {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  }
}

const runner = new TestRunner();

runner.test('Should initialize with correct configuration', async () => {
  const sp = new SessionPersistence(TEST_DIR, 5);
  if (!fs.existsSync(TEST_DIR)) {
    throw new Error('Directory not created');
  }
});

runner.test('Should save session data', async () => {
  const sp = new SessionPersistence(TEST_DIR, 5);
  const sessionId = await sp.saveSession({
    url: 'http://test.com',
    cookies: [{name: 'test', value: 'value', domain: 'test.com', path: '/'}],
    localStorage: {key: 'value'},
    sessionStorage: {},
    scrollPosition: {x: 0, y: 0},
    formData: {}
  });
  
  if (!sessionId) {
    throw new Error('Session ID not returned');
  }
});

runner.test('Should restore session data', async () => {
  const sp = new SessionPersistence(TEST_DIR, 5);
  const sessionId = await sp.saveSession({
    url: 'http://test.com',
    cookies: [],
    localStorage: {},
    sessionStorage: {},
    scrollPosition: {x: 100, y: 200},
    formData: {}
  });
  
  const restored = await sp.restoreSession(sessionId);
  if (!restored) {
    throw new Error('Session not restored');
  }
  
  if (restored.scrollPosition.x !== 100) {
    throw new Error('Scroll position not restored');
  }
});

runner.test('Should clear session data', async () => {
  const sp = new SessionPersistence(TEST_DIR, 5);
  const sessionId = await sp.saveSession({
    url: 'http://test.com',
    cookies: [],
    localStorage: {},
    sessionStorage: {},
    scrollPosition: {x: 0, y: 0},
    formData: {}
  });
  
  await sp.clearSession(sessionId);
  const restored = await sp.restoreSession(sessionId);
  
  if (restored !== null) {
    throw new Error('Session not cleared');
  }
});

runner.test('Should list all sessions', async () => {
  // Clean up before this test
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  
  // Create two separate instances to get two separate sessions
  const sp1 = new SessionPersistence(TEST_DIR, 5);
  await sp1.saveSession({
    url: 'http://test1.com',
    cookies: [],
    localStorage: {},
    sessionStorage: {},
    scrollPosition: {x: 0, y: 0},
    formData: {}
  });
  
  const sp2 = new SessionPersistence(TEST_DIR, 5);
  await sp2.saveSession({
    url: 'http://test2.com',
    cookies: [],
    localStorage: {},
    sessionStorage: {},
    scrollPosition: {x: 0, y: 0},
    formData: {}
  });
  
  const sessions = sp2.listSessions();
  if (sessions.length !== 2) {
    throw new Error(`Expected 2 sessions, got ${sessions.length}`);
  }
});

runner.test('Should enforce max sessions limit', async () => {
  const sp = new SessionPersistence(TEST_DIR, 3);
  
  for (let i = 0; i < 5; i++) {
    await sp.saveSession({
      url: `http://test${i}.com`,
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      scrollPosition: {x: 0, y: 0},
      formData: {}
    });
  }
  
  const sessions = sp.listSessions();
  if (sessions.length > 3) {
    throw new Error(`Expected max 3 sessions, got ${sessions.length}`);
  }
});

runner.test('Should handle non-existent session', async () => {
  const sp = new SessionPersistence(TEST_DIR, 5);
  const restored = await sp.restoreSession('non-existent-session');
  
  if (restored !== null) {
    throw new Error('Should return null for non-existent session');
  }
});

runner.test('Should start and stop auto-save', async () => {
  const sp = new SessionPersistence(TEST_DIR, 5);
  let saveCount = 0;
  
  sp.startAutoSave(async () => {
    saveCount++;
  }, 100);
  
  await new Promise(resolve => setTimeout(resolve, 250));
  sp.stopAutoSave();
  
  if (saveCount < 2) {
    throw new Error(`Expected at least 2 auto-saves, got ${saveCount}`);
  }
});

runner.run();
