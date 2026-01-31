import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import {
  ScreenshotComparator,
  ComparisonResult,
  createStrictComparator,
  createTolerantComparator,
} from './src/screenshot-comparator';

const TEST_DIR = path.join(__dirname, 'test-screenshots');
const DIFF_DIR = path.join(__dirname, 'test-diffs');

function createTestImage(width: number, height: number, color: [number, number, number, number]): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = color[3];
    }
  }
  return PNG.sync.write(png);
}

function createImageWithDifference(
  width: number,
  height: number,
  baseColor: [number, number, number, number],
  diffColor: [number, number, number, number],
  diffX: number,
  diffY: number,
  diffSize: number
): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const isDiff = x >= diffX && x < diffX + diffSize && y >= diffY && y < diffY + diffSize;
      const color = isDiff ? diffColor : baseColor;
      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = color[3];
    }
  }
  return PNG.sync.write(png);
}

function saveTestImage(buffer: Buffer, filename: string): string {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  const filepath = path.join(TEST_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

function cleanup(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(DIFF_DIR)) {
    fs.rmSync(DIFF_DIR, { recursive: true, force: true });
  }
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<void> | void): void {
  const runTest = async () => {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`✅ ${name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name, passed: false, error: message });
      console.log(`❌ ${name}: ${message}`);
    }
  };
  runTest();
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

function assertTrue(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertRange(value: number, min: number, max: number, message?: string): void {
  if (value < min || value > max) {
    throw new Error(message || `Expected ${value} to be between ${min} and ${max}`);
  }
}

async function runTests(): Promise<void> {
  console.log('🧪 Running Screenshot Comparator Tests\n');
  console.log('=' .repeat(50));

  cleanup();

  const comparator = new ScreenshotComparator({ diffOutputDir: DIFF_DIR });

  // Test 1: Identical images should match perfectly
  test('Identical images return match=true with 100% similarity', async () => {
    const img = createTestImage(100, 100, [255, 0, 0, 255]);
    const path1 = saveTestImage(img, 'identical1.png');
    const path2 = saveTestImage(img, 'identical2.png');
    
    const result = await comparator.compare(path1, path2);
    
    assertTrue(result.match, 'Images should match');
    assertEqual(result.mismatchedPixels, 0, 'No mismatched pixels');
    assertEqual(result.similarity, 1, 'Similarity should be 1');
    assertEqual(result.mismatchPercentage, 0, 'Mismatch percentage should be 0');
    assertEqual(result.diffImagePath, null, 'No diff image for identical images');
  });

  // Test 2: Different images should not match
  test('Different images return match=false with similarity < 1', async () => {
    const img1 = createTestImage(100, 100, [255, 0, 0, 255]);
    const img2 = createTestImage(100, 100, [0, 255, 0, 255]);
    const path1 = saveTestImage(img1, 'different1.png');
    const path2 = saveTestImage(img2, 'different2.png');
    
    const result = await comparator.compare(path1, path2);
    
    assertTrue(!result.match, 'Images should not match');
    assertEqual(result.mismatchedPixels, 10000, 'All pixels should be different');
    assertEqual(result.similarity, 0, 'Similarity should be 0');
    assertEqual(result.mismatchPercentage, 100, 'Mismatch percentage should be 100');
    assertTrue(result.diffImagePath !== null, 'Diff image should be generated');
    assertTrue(fs.existsSync(result.diffImagePath!), 'Diff image file should exist');
  });

  // Test 3: Partial difference detection
  test('Partial differences are detected with correct percentage', async () => {
    const img1 = createTestImage(100, 100, [255, 0, 0, 255]);
    const img2 = createImageWithDifference(100, 100, [255, 0, 0, 255], [0, 255, 0, 255], 0, 0, 10);
    const path1 = saveTestImage(img1, 'partial1.png');
    const path2 = saveTestImage(img2, 'partial2.png');
    
    const result = await comparator.compare(path1, path2);
    
    assertTrue(!result.match, 'Images should not match');
    assertEqual(result.mismatchedPixels, 100, '100 pixels should differ (10x10 block)');
    assertEqual(result.mismatchPercentage, 1, 'Mismatch percentage should be 1%');
    assertRange(result.similarity, 0.98, 0.999, 'Similarity should be ~99%');
  });

  // Test 4: Buffer comparison works
  test('Buffer comparison works identically to file comparison', async () => {
    const img1 = createTestImage(50, 50, [128, 128, 128, 255]);
    const img2 = createTestImage(50, 50, [128, 128, 128, 255]);
    
    const result = await comparator.compareBuffers(img1, img2, 'buffer-test');
    
    assertTrue(result.match, 'Buffers should match');
    assertEqual(result.mismatchedPixels, 0, 'No mismatched pixels');
    assertEqual(result.similarity, 1, 'Similarity should be 1');
  });

  // Test 5: getDiffBuffer returns correct data
  test('getDiffBuffer returns comparison result and diff buffer', () => {
    const img1 = createTestImage(50, 50, [255, 255, 255, 255]);
    const img2 = createTestImage(50, 50, [0, 0, 0, 255]);
    
    const { result, diffBuffer } = comparator.getDiffBuffer(img1, img2);
    
    assertTrue(!result.match, 'Images should not match');
    assertTrue(diffBuffer !== null, 'Diff buffer should be generated');
    assertTrue(diffBuffer!.length > 0, 'Diff buffer should have content');
  });

  // Test 6: Dimension mismatch returns error
  test('Dimension mismatch returns error result', async () => {
    const img1 = createTestImage(100, 100, [255, 0, 0, 255]);
    const img2 = createTestImage(50, 50, [255, 0, 0, 255]);
    const path1 = saveTestImage(img1, 'size1.png');
    const path2 = saveTestImage(img2, 'size2.png');
    
    const result = await comparator.compare(path1, path2);
    
    assertTrue(!result.match, 'Should not match');
    assertTrue(result.error !== undefined, 'Should have error message');
    assertTrue(result.error!.includes("dimensions don't match"), 'Error should mention dimensions');
  });

  // Test 7: Missing file returns error
  test('Missing file returns error result', async () => {
    const img = createTestImage(100, 100, [255, 0, 0, 255]);
    const path1 = saveTestImage(img, 'exists.png');
    
    const result = await comparator.compare(path1, '/nonexistent/path.png');
    
    assertTrue(!result.match, 'Should not match');
    assertTrue(result.error !== undefined, 'Should have error message');
    assertTrue(result.error!.includes('not found'), 'Error should mention file not found');
  });

  // Test 8: Strict comparator works
  test('Strict comparator detects minor differences', async () => {
    const strictComparator = createStrictComparator(DIFF_DIR);
    
    const img1 = createTestImage(100, 100, [255, 0, 0, 255]);
    // Use a more noticeable color difference (200 vs 255 = 55 units, well above threshold)
    const img2 = createImageWithDifference(100, 100, [255, 0, 0, 255], [200, 0, 0, 255], 50, 50, 1);
    const path1 = saveTestImage(img1, 'strict1.png');
    const path2 = saveTestImage(img2, 'strict2.png');
    
    const result = await strictComparator.compare(path1, path2);
    
    assertTrue(!result.match, 'Strict comparator should detect minor difference');
    assertTrue(result.mismatchedPixels > 0, 'Should have mismatched pixels');
  });

  // Test 9: Tolerant comparator allows minor differences
  test('Tolerant comparator allows configured percentage of differences', async () => {
    const tolerantComparator = createTolerantComparator(5, DIFF_DIR);
    
    const img1 = createTestImage(100, 100, [255, 0, 0, 255]);
    const img2 = createImageWithDifference(100, 100, [255, 0, 0, 255], [0, 255, 0, 255], 0, 0, 5);
    const path1 = saveTestImage(img1, 'tolerant1.png');
    const path2 = saveTestImage(img2, 'tolerant2.png');
    
    const result = await tolerantComparator.compare(path1, path2);
    
    assertTrue(result.match, 'Tolerant comparator should match with <5% difference');
  });

  // Test 10: Options can be updated
  test('setOptions updates comparator configuration', async () => {
    const testComparator = new ScreenshotComparator({ threshold: 0.1, diffOutputDir: DIFF_DIR });
    
    const originalOptions = testComparator.getOptions();
    assertEqual(originalOptions.threshold, 0.1, 'Initial threshold should be 0.1');
    
    testComparator.setOptions({ threshold: 0.5 });
    
    const updatedOptions = testComparator.getOptions();
    assertEqual(updatedOptions.threshold, 0.5, 'Updated threshold should be 0.5');
  });

  // Wait for async tests to complete
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  cleanup();

  console.log('\n' + '='.repeat(50));
  if (failed === 0) {
    console.log('🎉 All tests passed! 100% success rate.');
    process.exit(0);
  } else {
    console.log(`⚠️  ${failed} test(s) failed.`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test execution failed:', error);
  cleanup();
  process.exit(1);
});
