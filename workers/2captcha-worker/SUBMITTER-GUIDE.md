# CAPTCHA Submission Integration Guide

## Overview

The `CaptchaSubmitter` module automates the submission of CAPTCHA answers and handling of "Cannot Solve" scenarios with human-like behavior.

## Features

✅ **Human-like Behavior**
- Variable typing delays (50-300ms per character)
- Variable submit delays (500-2000ms)
- Mouse movement simulation
- Realistic click behavior

✅ **Robust Input Detection**
- 8+ selector strategies for input fields
- 8+ selector strategies for submit buttons
- 8+ selector strategies for "Cannot Solve" button
- Automatic fallback to alternative selectors

✅ **Error Handling**
- Graceful handling of missing elements
- Screenshot capture on errors
- Detailed error messages
- Timeout protection

✅ **Audit Trail**
- Screenshots before/after each action
- Submission counting
- Timestamp logging
- Error documentation

## Installation

### Prerequisites
```bash
npm install playwright
npm install --save-dev @types/playwright
```

### Add to TypeScript Project
```typescript
import { CaptchaSubmitter } from './src/submitter';
```

## Usage

### Basic Submission

```typescript
import { chromium, Page } from 'playwright';
import { CaptchaSubmitter } from './src/submitter';

async function submitCaptcha() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navigate to 2captcha.com and reach CAPTCHA page
  await page.goto('https://2captcha.com/api/captcha');
  
  // Initialize submitter
  const submitter = new CaptchaSubmitter(page);
  
  // Submit answer
  const result = await submitter.submitAnswer('12345');
  
  if (result.success) {
    console.log(`✅ Submitted: ${result.answer}`);
    console.log(`📸 Screenshot: ${result.screenshot}`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
  
  await browser.close();
}
```

### Handle "Cannot Solve"

```typescript
const submitter = new CaptchaSubmitter(page);

// When you can't solve the CAPTCHA
const result = await submitter.clickCannotSolve();

if (result.success) {
  console.log('✅ Clicked Cannot Solve');
  // Browser will show next CAPTCHA
} else {
  console.error(`❌ Failed: ${result.error}`);
}
```

### Custom Configuration

```typescript
const submitter = new CaptchaSubmitter(page, {
  minTypingDelay: 100,      // Min delay between keystrokes
  maxTypingDelay: 400,      // Max delay between keystrokes
  minSubmitDelay: 800,      // Min delay before submit click
  maxSubmitDelay: 3000,     // Max delay before submit click
  screenshotDir: './logs',  // Where to save screenshots
  timeout: 20000,           // Timeout for element detection
});

const result = await submitter.submitAnswer('answer');
```

### Get Statistics

```typescript
const stats = submitter.getStats();

console.log(`Total submissions: ${stats.totalSubmissions}`);
console.log(`Screenshot directory: ${stats.screenshotDir}`);

// Reset counter for next batch
submitter.reset();
```

## Integration with Detector

```typescript
import { CaptchaDetector } from './detector';
import { CaptchaSubmitter } from './submitter';

async function autoSolveLoop(page: Page) {
  const detector = new CaptchaDetector(page);
  const submitter = new CaptchaSubmitter(page);
  
  while (true) {
    // Detect CAPTCHA type and get solution
    const detection = await detector.detectCaptcha();
    
    if (!detection.detected) {
      console.log('✅ No CAPTCHA detected');
      break;
    }
    
    console.log(`🔍 Detected: ${detection.type}`);
    
    // Solve using appropriate solver
    let answer: string;
    
    if (detection.type === 'text') {
      // Use OCR solver
      answer = await ocr.recognize(detection.image);
    } else if (detection.type === 'image') {
      // Use image classifier
      answer = await classifier.classify(detection.image);
    } else {
      // Cannot solve
      console.log('⚠️  Cannot solve automatically');
      await submitter.clickCannotSolve();
      continue;
    }
    
    // Submit answer
    const result = await submitter.submitAnswer(answer);
    
    if (!result.success) {
      console.warn(`⚠️  Submission failed: ${result.error}`);
      break;
    }
    
    console.log(`✅ Submitted: ${answer}`);
  }
}
```

## Selector Detection Strategy

### Input Field Detection (Order of Priority)

1. `input[name="answer"]` - Standard form field
2. `input[id="answer"]` - ID-based
3. `input[type="text"][data-captcha]` - Data attribute
4. `input[placeholder*="answer"]` - Placeholder match
5. `input[placeholder*="captcha"]` - Captcha placeholder
6. `.captcha-input input` - Class-based wrapper
7. `#captcha-input` - ID-based wrapper
8. `input[data-testid="captcha-answer"]` - Test ID

### Submit Button Detection (Order of Priority)

1. `button[type="submit"]` - Standard submit
2. `button:has-text("Submit")` - Text match
3. `button:has-text("Check Answer")` - Alternative text
4. `button:has-text("Verify")` - Alternative text
5. `button[id="submit"]` - ID-based
6. `.captcha-submit button` - Class wrapper
7. `input[type="submit"]` - Input submit
8. `a[data-action="submit"]` - Link action

### "Cannot Solve" Button Detection (Order of Priority)

1. `button:has-text("Cannot Solve")`
2. `button:has-text("Cannot solve")`
3. `button:has-text("Skip")`
4. `button[data-action="cannot-solve"]`
5. `button[id="cannot-solve"]`
6. `.cannot-solve-btn`
7. `button[aria-label*="Cannot"]`
8. `a:has-text("Cannot Solve")`

## Output Structure

Screenshots are organized by action:

```
submission-logs/
├── submission-1-before-submit-1706614543210.png
├── submission-1-after-typing-1706614543450.png
├── submission-1-after-submit-1706614543890.png
├── submission-2-before-cannot-solve-1706614545000.png
├── submission-2-after-cannot-solve-1706614545200.png
└── submission-3-error-1706614546100.png
```

Each submission gets:
- `before-submit` - Initial state
- `after-typing` - After answer typed
- `after-submit` - After submission
- `error` - If something failed

## Error Handling

### Common Errors

**"Cannot find CAPTCHA answer input field"**
- The expected input selector is not on page
- Page might still be loading
- DOM structure different than expected
- Solution: Check page structure, increase timeout

**"Cannot find submit button"**
- Submit button not visible or not found
- Page might require different action
- Solution: Check button visibility, add new selector

**"Cannot find Cannot Solve button"**
- Button doesn't exist on this CAPTCHA type
- Page might not support skipping
- Solution: Try different button text selector

### Timeout Scenarios

```typescript
try {
  const result = await submitter.submitAnswer('12345');
  
  if (!result.success && result.error?.includes('timeout')) {
    // Network delay or page loading issue
    await page.reload();
    // Retry
  }
} catch (error) {
  console.error('Critical error:', error);
}
```

## Best Practices

### 1. Always Handle Errors

```typescript
const result = await submitter.submitAnswer(answer);

if (!result.success) {
  // Log error for review
  console.error(`Submission failed: ${result.error}`);
  
  // Save screenshot for debugging
  console.log(`See: ${result.screenshot}`);
  
  // Decide next action
  if (result.error?.includes('input field')) {
    // Try clicking Cannot Solve instead
    await submitter.clickCannotSolve();
  }
}
```

### 2. Monitor Statistics

```typescript
const stats = submitter.getStats();

console.log(`Submitted: ${stats.totalSubmissions} CAPTCHAs`);

// Every 100 submissions, log stats
if (stats.totalSubmissions % 100 === 0) {
  console.log(`Progress: ${stats.totalSubmissions}/1000`);
}
```

### 3. Use Custom Timeouts for Slow Pages

```typescript
const submitter = new CaptchaSubmitter(page, {
  timeout: 30000, // 30 seconds for slow networks
});
```

### 4. Screenshot Review

```typescript
// Periodically review screenshots for debugging
const stats = submitter.getStats();
console.log(`Screenshots saved to: ${stats.screenshotDir}`);
console.log('Review them to verify correct behavior');
```

## Testing

Run tests with:

```bash
npm test -- src/submitter.test.ts
```

Tests cover:
- ✅ Successful submission
- ✅ Multiple selector strategies
- ✅ Error handling (missing elements)
- ✅ Human-like typing delays
- ✅ Cannot Solve button click
- ✅ Statistics tracking
- ✅ Counter reset

## Performance

- **Typing:** 50-300ms per character (human-like)
- **Submit delay:** 500-2000ms (realistic pause)
- **Element detection:** <100ms (fast scanning)
- **Screenshot:** <200ms per action
- **Total per submission:** 1-5 seconds (human-paced)

## Debugging

Enable detailed logging:

```typescript
const submitter = new CaptchaSubmitter(page, {
  // Add logging
});

// Monitor all actions
submitter.on('input-found', (selector) => {
  console.log(`Found input with: ${selector}`);
});
```

## Known Limitations

⚠️ **Selector Limitations**
- Relies on CSS selectors (not visual recognition)
- Different sites may have different DOM structures
- New sites may require selector updates

⚠️ **Detection Evasion**
- Delays are randomized but basic
- Professional detection systems may still flag
- Use residential proxies for additional stealth

⚠️ **CAPTCHA Types**
- Works with text/image input CAPTCHAs
- May not work with slider/click-based CAPTCHAs
- Requires proper solver integration

## Future Improvements

- [ ] Visual CAPTCHA confirmation (screenshot comparison)
- [ ] Adaptive delay based on site behavior
- [ ] Machine learning for selector auto-detection
- [ ] Cross-site selector learning
- [ ] Performance metrics collection
- [ ] Batch submission statistics

## Support

For issues or questions:
1. Check screenshots in `submission-logs/`
2. Verify page structure with browser DevTools
3. Test selectors manually in console
4. Review error messages in logs
