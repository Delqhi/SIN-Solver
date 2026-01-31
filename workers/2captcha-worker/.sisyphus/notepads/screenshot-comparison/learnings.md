# Screenshot Comparison - Learnings

## Date: 2026-01-31

### Task 139: Screenshot Comparator Implementation

---

## Key Technical Learnings

### 1. pixelmatch v7+ Color Format

**Issue:** pixelmatch v7+ uses RGB tuples `[r, g, b]` for `diffColor` and `aaColor`, NOT RGBA.

```typescript
// ✅ CORRECT (v7+)
diffColor: [255, 0, 0]    // Red
aaColor: [255, 255, 0]    // Yellow

// ❌ WRONG (old v5 format)
diffColor: [255, 0, 0, 255]  // Will cause type errors
```

---

### 2. Threshold Behavior

**Critical Discovery:** The `threshold` option (0-1 scale) is per-channel normalized.

| Threshold | Color Units Tolerance | Behavior |
|-----------|----------------------|----------|
| `0.0` | 0 | Exact match only |
| `0.01` | ~2.55 | Tolerates 1% difference per channel |
| `0.1` | ~25.5 | Tolerates 10% difference per channel |

**Example:**
- With `threshold: 0.01`, a pixel change from `[255, 0, 0]` to `[254, 0, 0]` is **NOT detected** (1 unit < 2.55)
- To detect it, use `threshold: 0` or make the difference ≥3 units per channel

**Test Fix Applied:**
```typescript
// Changed from [254, 0, 0] to [200, 0, 0] for 55-unit difference
// This ensures reliable detection with threshold: 0.01
const img2 = createImageWithDifference(100, 100, [255, 0, 0, 255], [200, 0, 0, 255], 50, 50, 1);
```

---

### 3. pngjs v7 API

```typescript
import { PNG } from 'pngjs';

// Sync parse from buffer
const png = PNG.sync.read(buffer);

// Create new image
const diffPng = new PNG({ width, height });

// Write to buffer
const outputBuffer = PNG.sync.write(diffPng);
```

---

## Implementation Summary

### Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `src/screenshot-comparator.ts` | Main implementation | 512 |
| `test-screenshot-comparator.ts` | Test suite (10 tests) | ~280 |

### API Design

```typescript
// Basic usage
const comparator = new ScreenshotComparator();
const result = await comparator.compare('before.png', 'after.png');

// Factory helpers
const strict = createStrictComparator();      // threshold: 0.01, maxMismatch: 0%
const tolerant = createTolerantComparator();  // threshold: 0.1, maxMismatch: 5%

// Result interface
interface ComparisonResult {
  match: boolean;
  mismatchedPixels: number;
  totalPixels: number;
  similarity: number;         // 0-1 scale
  mismatchPercentage: number; // 0-100 scale
  diffImagePath?: string;
  width: number;
  height: number;
  error?: string;
}
```

---

## Best Practices

1. **For strict visual regression:** Use `threshold: 0` or `createStrictComparator()`
2. **For UI testing with anti-aliasing:** Use `includeAA: false` to ignore anti-aliased pixels
3. **Always handle dimension mismatches:** Return error result, don't throw
4. **Save diff images:** Set `diffOutputDir` to debug failures visually

---

## Test Results

```
✅ 10/10 tests passing
✅ 100% success rate
```
