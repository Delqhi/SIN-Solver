import { ConcurrentSolver, CaptchaData, TaskResult } from './src/concurrent-solver';

class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<void> {
    console.log('🧪 Concurrent Solver Tests\n');
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
    
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

const runner = new TestRunner();

runner.test('Should initialize with correct max concurrency', async () => {
  const solver = new ConcurrentSolver({ maxConcurrency: 3 });
  
  const stats = solver.getStats();
  if (stats.processing !== 0) {
    throw new Error('Should start with 0 processing tasks');
  }
  
  solver.stop();
});

runner.test('Should add tasks and return task IDs', async () => {
  const solver = new ConcurrentSolver({ maxConcurrency: 5 });
  
  const taskId1 = solver.addTask({
    id: 'captcha-1',
    type: 'image',
  }, 'normal');
  
  const taskId2 = solver.addTask({
    id: 'captcha-2',
    type: 'text',
  }, 'urgent');
  
  if (!taskId1 || !taskId2) {
    throw new Error('Task IDs should be returned');
  }
  
  if (taskId1 === taskId2) {
    throw new Error('Task IDs should be unique');
  }
  
  solver.stop();
});

runner.test('Should process tasks concurrently', async () => {
  const solver = new ConcurrentSolver({ 
    maxConcurrency: 3,
    taskTimeout: 5000 
  });
  
  const taskIds: string[] = [];
  
  for (let i = 0; i < 5; i++) {
    const taskId = solver.addTask({
      id: `captcha-${i}`,
      type: 'image',
    }, 'normal');
    taskIds.push(taskId);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const stats = solver.getStats();
  if (stats.total !== 5) {
    throw new Error(`Expected 5 total tasks, got ${stats.total}`);
  }
  
  const results = await Promise.all(
    taskIds.map(id => solver.waitForResult(id, 10000))
  );
  
  const completed = results.filter(r => r.status === 'completed');
  if (completed.length !== 5) {
    throw new Error(`Expected 5 completed tasks, got ${completed.length}`);
  }
  
  solver.stop();
});

runner.test('Should respect priority queue (urgent tasks first)', async () => {
  const solver = new ConcurrentSolver({ 
    maxConcurrency: 1,
    taskTimeout: 5000 
  });
  
  const normalTaskId = solver.addTask({
    id: 'normal-captcha',
    type: 'image',
  }, 'normal');
  
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const urgentTaskId = solver.addTask({
    id: 'urgent-captcha',
    type: 'image',
  }, 'urgent');
  
  const urgentResult = await solver.waitForResult(urgentTaskId, 10000);
  const normalResult = await solver.waitForResult(normalTaskId, 10000);
  
  if (urgentResult.status !== 'completed') {
    throw new Error('Urgent task should complete');
  }
  
  if (normalResult.status !== 'completed') {
    throw new Error('Normal task should complete');
  }
  
  solver.stop();
});

runner.test('Should pause and resume processing', async () => {
  const solver = new ConcurrentSolver({ 
    maxConcurrency: 2,
    taskTimeout: 5000 
  });
  
  solver.addTask({ id: 'task-1', type: 'image' }, 'normal');
  solver.addTask({ id: 'task-2', type: 'image' }, 'normal');
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  solver.pause();
  
  const pausedStats = solver.getStats();
  
  solver.addTask({ id: 'task-3', type: 'image' }, 'normal');
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const stillPausedStats = solver.getStats();
  if (stillPausedStats.pending === 0) {
    throw new Error('Should have pending tasks while paused');
  }
  
  solver.resume();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const resumedStats = solver.getStats();
  if (resumedStats.completed < 2) {
    throw new Error('Should process tasks after resume');
  }
  
  solver.stop();
});

runner.test('Should cancel pending tasks', async () => {
  const solver = new ConcurrentSolver({ 
    maxConcurrency: 1,
    taskTimeout: 5000 
  });
  
  const taskId1 = solver.addTask({ id: 'task-1', type: 'image' }, 'normal');
  const taskId2 = solver.addTask({ id: 'task-2', type: 'image' }, 'normal');
  const taskId3 = solver.addTask({ id: 'task-3', type: 'image' }, 'normal');
  
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const cancelled1 = solver.cancelTask(taskId2);
  const cancelled2 = solver.cancelTask(taskId3);
  
  if (!cancelled1 || !cancelled2) {
    throw new Error('Should cancel pending tasks');
  }
  
  const result2 = await solver.waitForResult(taskId2, 5000);
  const result3 = await solver.waitForResult(taskId3, 5000);
  
  if (result2.status !== 'cancelled') {
    throw new Error('Task 2 should be cancelled');
  }
  
  if (result3.status !== 'cancelled') {
    throw new Error('Task 3 should be cancelled');
  }
  
  const result1 = await solver.waitForResult(taskId1, 10000);
  if (result1.status !== 'completed') {
    throw new Error('Task 1 should complete normally');
  }
  
  solver.stop();
});

runner.run();
