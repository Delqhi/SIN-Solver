import { CaptchaTypeDetector, DOMElement } from './src/captcha-type-detector';

class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<void> {
    console.log('🧪 Captcha Type Detector Tests\n');
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

function createMockImageData(width: number, height: number, pattern: string): Buffer {
  const size = width * height * 3;
  const buffer = Buffer.alloc(size);
  
  for (let i = 0; i < size; i++) {
    switch (pattern) {
      case 'text':
        buffer[i] = Math.random() > 0.7 ? Math.floor(Math.random() * 100) : 200;
        break;
      case 'grid': {
        const x = (i / 3) % width;
        const y = Math.floor((i / 3) / width);
        buffer[i] = (x % 50 < 25) === (y % 50 < 25) ? 100 : 200;
        break;
      }
      case 'slider':
        buffer[i] = i < size / 2 ? 150 : 200;
        break;
      default:
        buffer[i] = Math.floor(Math.random() * 255);
    }
  }
  
  return buffer;
}

runner.test('Should initialize correctly', async () => {
  const detector = new CaptchaTypeDetector();
  
  const confidence = detector.getConfidence();
  if (confidence !== 0) {
    throw new Error(`Expected initial confidence to be 0, got ${confidence}`);
  }
  
  const features = detector.getDetectedFeatures();
  if (features.length !== 0) {
    throw new Error('Expected no detected features initially');
  }
});

runner.test('Should detect text CAPTCHA from image', async () => {
  const detector = new CaptchaTypeDetector();
  
  // Create a wider image that looks more like text CAPTCHA
  const mockImageData = createMockImageData(400, 80, 'text');
  
  const result = await detector.analyzeImage(mockImageData);
  
  // Should detect as either 'text' or 'click' (both valid for this pattern)
  if (result !== 'text' && result !== 'click') {
    throw new Error(`Expected 'text' or 'click', got '${result}'`);
  }
  
  const confidence = detector.getConfidence();
  if (confidence <= 0) {
    throw new Error(`Expected positive confidence, got ${confidence}`);
  }
  
  const features = detector.getDetectedFeatures();
  if (features.length === 0) {
    throw new Error('Expected some detected features');
  }
});

runner.test('Should detect image-grid CAPTCHA from DOM elements', async () => {
  const detector = new CaptchaTypeDetector();
  
  const mockDOMElements: DOMElement[] = [
    {
      tagName: 'div',
      className: 'captcha-container grid-container',
      children: [
        {
          tagName: 'div',
          className: 'tile',
        },
        {
          tagName: 'div',
          className: 'tile',
        },
      ],
    },
    {
      tagName: 'p',
      textContent: 'Select all images with cars',
    },
  ];
  
  const result = await detector.analyzeDOM(mockDOMElements);
  
  if (result !== 'image-grid') {
    throw new Error(`Expected 'image-grid', got '${result}'`);
  }
  
  const confidence = detector.getConfidence();
  if (confidence <= 0) {
    throw new Error(`Expected positive confidence, got ${confidence}`);
  }
});

runner.test('Should detect slider CAPTCHA from DOM', async () => {
  const detector = new CaptchaTypeDetector();
  
  const mockDOMElements: DOMElement[] = [
    {
      tagName: 'div',
      className: 'captcha-wrapper',
      children: [
        {
          tagName: 'div',
          className: 'slider-container',
          children: [
            {
              tagName: 'div',
              className: 'slider-handle',
            },
          ],
        },
        {
          tagName: 'p',
          textContent: 'Drag the slider to complete the puzzle',
        },
      ],
    },
  ];
  
  const result = await detector.analyzeDOM(mockDOMElements);
  
  if (result !== 'slider') {
    throw new Error(`Expected 'slider', got '${result}'`);
  }
  
  const confidence = detector.getConfidence();
  if (confidence <= 0) {
    throw new Error(`Expected positive confidence, got ${confidence}`);
  }
});

runner.test('Should return unknown for ambiguous input', async () => {
  const detector = new CaptchaTypeDetector();
  
  const ambiguousImageData = Buffer.alloc(100);
  for (let i = 0; i < ambiguousImageData.length; i++) {
    ambiguousImageData[i] = 128;
  }
  
  const result = await detector.analyzeImage(ambiguousImageData);
  
  if (result !== 'unknown') {
    throw new Error(`Expected 'unknown', got '${result}'`);
  }
  
  const confidence = detector.getConfidence();
  if (confidence !== 0) {
    throw new Error(`Expected confidence to be 0 for unknown, got ${confidence}`);
  }
});

runner.run();
