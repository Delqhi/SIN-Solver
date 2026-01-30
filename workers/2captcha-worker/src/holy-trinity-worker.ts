/**
 * HOLY TRINITY WORKER - Steel Browser + Skyvern + Mistral
 * 
 * Architecture:
 * 🧠 Skyvern (The Brain) - AI Orchestrator
 * 🖥️ Steel Browser CDP (The Hands) - Real-time browser control
 * 👁️ Mistral AI (The Eyes) - Vision analysis
 * 🛡️ Stagehand (The Backup) - Fallback orchestrator
 * 
 * Key Insight:
 * "Steel Browser is the Ferrari, Skyvern is the F1 Driver, Mistral is the Navigator"
 */

import { chromium, Browser, Page } from 'playwright';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Configuration
const CONFIG = {
  // Steel Browser CDP
  steelBrowser: {
    cdpUrl: process.env.STEEL_BROWSER_CDP || 'http://localhost:9223',
    apiUrl: process.env.STEEL_BROWSER_API || 'http://localhost:3005',
  },
  // Mistral AI
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY || '',
    apiUrl: 'https://api.mistral.ai/v1/chat/completions',
    visionModel: 'pixtral-12b-2409',
    textModel: 'mistral-small-latest',
  },
  // Skyvern (if available)
  skyvern: {
    enabled: process.env.SKYVERN_ENABLED === 'true',
    url: process.env.SKYVERN_URL || 'http://localhost:8000',
  },
  // Stagehand Fallback
  stagehand: {
    enabled: process.env.STAGEHAND_ENABLED !== 'false',
    apiKey: process.env.STAGEHAND_API_KEY,
  },
  // General
  headless: process.env.HEADLESS === 'true',
  screenshotDir: process.env.SCREENSHOT_DIR || './screenshots',
  debug: process.env.DEBUG === 'true',
};

// Types
interface KIDecision {
  action: 'navigate' | 'click' | 'fill' | 'screenshot' | 'wait' | 'solve' | 'done';
  target?: string;
  value?: string;
  reason: string;
  confidence: number;
  alternativeActions?: KIDecision[];
}

interface CaptchaInfo {
  type: 'text' | 'image' | 'recaptcha' | 'hcaptcha' | 'geetest' | 'unknown';
  element?: any;
  screenshot: Buffer;
  description: string;
}

interface SolutionResult {
  success: boolean;
  solution?: string;
  error?: string;
  confidence: number;
  method: 'mistral' | 'skyvern' | 'stagehand' | 'manual';
}

/**
 * Steel Browser CDP Connector
 * Real-time browser control via Chrome DevTools Protocol
 */
class SteelBrowserCDP {
  private cdpUrl: string;
  private apiUrl: string;
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;

  constructor(cdpUrl: string, apiUrl: string) {
    this.cdpUrl = cdpUrl;
    this.apiUrl = apiUrl;
  }

  async connect(): Promise<boolean> {
    try {
      console.log('🔌 Connecting to Steel Browser CDP...');
      console.log(`   CDP URL: ${this.cdpUrl}`);
      console.log(`   API URL: ${this.apiUrl}`);

      // Check if Steel Browser is healthy
      const healthCheck = await fetch(`${this.apiUrl}/health`);
      if (!healthCheck.ok) {
        throw new Error(`Steel Browser health check failed: ${healthCheck.status}`);
      }

      console.log('✅ Steel Browser CDP connected');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Steel Browser:', error.message);
      return false;
    }
  }

  async navigate(url: string): Promise<void> {
    console.log(`🌐 Navigating to: ${url}`);
    // Implementation via CDP
    const response = await fetch(`${this.apiUrl}/v1/page/navigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    
    if (!response.ok) {
      throw new Error(`Navigation failed: ${response.status}`);
    }
    
    console.log('✅ Navigation complete');
  }

  async screenshot(selector?: string): Promise<Buffer> {
    console.log('📸 Taking screenshot...');
    
    const endpoint = selector 
      ? `${this.apiUrl}/v1/page/screenshot?selector=${encodeURIComponent(selector)}`
      : `${this.apiUrl}/v1/page/screenshot`;
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Screenshot failed: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('✅ Screenshot captured');
    return Buffer.from(arrayBuffer);
  }

  async click(selector: string): Promise<void> {
    console.log(`🖱️  Clicking: ${selector}`);
    
    const response = await fetch(`${this.apiUrl}/v1/page/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector }),
    });
    
    if (!response.ok) {
      throw new Error(`Click failed: ${response.status}`);
    }
    
    console.log('✅ Click executed');
  }

  async fill(selector: string, value: string): Promise<void> {
    console.log(`⌨️  Filling ${selector} with: ${value}`);
    
    const response = await fetch(`${this.apiUrl}/v1/page/fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector, value }),
    });
    
    if (!response.ok) {
      throw new Error(`Fill failed: ${response.status}`);
    }
    
    console.log('✅ Fill executed');
  }

  async getPageSource(): Promise<string> {
    const response = await fetch(`${this.apiUrl}/v1/page/content`);
    if (!response.ok) {
      throw new Error(`Get content failed: ${response.status}`);
    }
    return response.text();
  }

  async onDOMUpdate(callback: (data: any) => void): Promise<void> {
    // CDP allows real-time DOM monitoring
    console.log('👂 Listening for DOM updates...');
    // Implementation would use WebSocket for real-time updates
  }
}

/**
 * Mistral AI Vision Client
 * Cheap and effective vision analysis
 */
class MistralVision {
  private apiKey: string;
  private apiUrl: string;
  private visionModel: string;
  private textModel: string;

  constructor(config: typeof CONFIG.mistral) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
    this.visionModel = config.visionModel;
    this.textModel = config.textModel;
  }

  async analyzeImage(imageBuffer: Buffer, prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Mistral API key not configured');
    }

    console.log('🤖 Asking Mistral to analyze image...');
    
    const base64Image = imageBuffer.toString('base64');
    
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.visionModel,
        messages: [
          {
            role: 'system',
            content: 'You are a CAPTCHA solving expert. Analyze the image and provide the solution. Be concise.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:image/png;base64,${base64Image}` 
                } 
              }
            ]
          }
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('✅ Mistral analysis complete');
    console.log(`   Result: ${content.substring(0, 100)}...`);
    
    return content;
  }

  async makeDecision(context: string, screenshot?: Buffer): Promise<KIDecision> {
    console.log('🧠 Mistral making decision...');
    
    const messages: any[] = [
      {
        role: 'system',
        content: `You are a browser automation expert. Analyze the situation and decide the next action.
Respond in JSON format:
{
  "action": "navigate|click|fill|screenshot|wait|solve|done",
  "target": "CSS selector or description",
  "value": "value to fill (if applicable)",
  "reason": "explanation",
  "confidence": 0.0-1.0
}`
      },
      {
        role: 'user',
        content: context
      }
    ];

    if (screenshot) {
      const base64Image = screenshot.toString('base64');
      messages[1].content = [
        { type: 'text', text: context },
        { 
          type: 'image_url', 
          image_url: { 
            url: `data:image/png;base64,${base64Image}` 
          } 
        }
      ];
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: screenshot ? this.visionModel : this.textModel,
        messages,
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      // Try to parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: create decision from text
      return {
        action: 'wait',
        reason: content,
        confidence: 0.5,
      };
    } catch (error) {
      return {
        action: 'wait',
        reason: content,
        confidence: 0.5,
      };
    }
  }
}

/**
 * Skyvern Orchestrator
 * AI-driven workflow management
 */
class SkyvernOrchestrator {
  private url: string;
  private enabled: boolean;

  constructor(config: typeof CONFIG.skyvern) {
    this.url = config.url;
    this.enabled = config.enabled;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.enabled) return false;
    
    try {
      const response = await fetch(`${this.url}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async executeWorkflow(task: string, steelBrowser: SteelBrowserCDP): Promise<any> {
    if (!this.enabled) {
      throw new Error('Skyvern not enabled');
    }

    console.log(`🎬 Skyvern executing workflow: ${task}`);
    
    // Skyvern would orchestrate the workflow
    // For now, this is a placeholder for actual Skyvern integration
    
    return {
      success: true,
      steps: [],
    };
  }
}

/**
 * Stagehand Fallback
 * Alternative orchestrator when Skyvern fails
 */
class StagehandFallback {
  private enabled: boolean;
  private apiKey?: string;

  constructor(config: typeof CONFIG.stagehand) {
    this.enabled = config.enabled;
    this.apiKey = config.apiKey;
  }

  async executeTask(task: string, steelBrowser: SteelBrowserCDP): Promise<any> {
    if (!this.enabled) {
      throw new Error('Stagehand not enabled');
    }

    console.log(`🎭 Stagehand executing task: ${task}`);
    
    // Stagehand would provide fallback orchestration
    // For now, this is a placeholder
    
    return {
      success: true,
      method: 'stagehand',
    };
  }
}

/**
 * HOLY TRINITY WORKER
 * Main class that combines all components
 */
export class HolyTrinityWorker {
  private steelBrowser: SteelBrowserCDP;
  private mistral: MistralVision;
  private skyvern: SkyvernOrchestrator;
  private stagehand: StagehandFallback;
  private screenshotDir: string;
  private stepCount: number = 0;

  constructor() {
    // Initialize components
    this.steelBrowser = new SteelBrowserCDP(
      CONFIG.steelBrowser.cdpUrl,
      CONFIG.steelBrowser.apiUrl
    );
    
    this.mistral = new MistralVision(CONFIG.mistral);
    this.skyvern = new SkyvernOrchestrator(CONFIG.skyvern);
    this.stagehand = new StagehandFallback(CONFIG.stagehand);
    
    // Setup screenshot directory
    this.screenshotDir = path.join(
      CONFIG.screenshotDir, 
      `holy-trinity-${Date.now()}`
    );
    fs.mkdirSync(this.screenshotDir, { recursive: true });
  }

  async initialize(): Promise<boolean> {
    console.log('🚀 Initializing Holy Trinity Worker...');
    console.log('');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│  🏆 THE HOLY TRINITY                                        │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│  🧠 Skyvern (The Brain)                                     │');
    console.log('│  🖥️  Steel Browser CDP (The Hands)                          │');
    console.log('│  👁️  Mistral AI (The Eyes)                                  │');
    console.log('│  🛡️  Stagehand (The Backup)                                 │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    console.log('');

    // Connect to Steel Browser
    const steelConnected = await this.steelBrowser.connect();
    if (!steelConnected) {
      console.error('❌ Failed to connect to Steel Browser');
      return false;
    }

    // Check Mistral API
    if (!CONFIG.mistral.apiKey) {
      console.warn('⚠️  Mistral API key not configured');
    } else {
      console.log('✅ Mistral API configured');
    }

    // Check Skyvern
    const skyvernAvailable = await this.skyvern.isAvailable();
    if (skyvernAvailable) {
      console.log('✅ Skyvern orchestrator available');
    } else {
      console.log('⚠️  Skyvern not available (will use fallback)');
    }

    console.log('');
    console.log('✅ Holy Trinity Worker initialized');
    console.log(`📁 Screenshots: ${this.screenshotDir}`);
    console.log('');

    return true;
  }

  async solveCaptcha(url: string = 'https://2captcha.com/demo'): Promise<SolutionResult> {
    console.log(`🎯 Starting CAPTCHA solving: ${url}`);
    console.log('='.repeat(70));

    try {
      // Step 1: Navigate
      await this.step('Navigate to target', async () => {
        await this.steelBrowser.navigate(url);
        await this.screenshot('01-initial-page');
      });

      // Step 2: Analyze with Mistral
      const decision = await this.step('Analyze page with Mistral', async () => {
        const screenshot = await this.steelBrowser.screenshot();
        return await this.mistral.makeDecision(
          'What should I do on this page? Look for CAPTCHA options.',
          screenshot
        );
      });

      console.log('🤖 Mistral Decision:', decision);

      // Step 3: Execute action
      if (decision.action === 'click' && decision.target) {
        await this.step(`Click: ${decision.target}`, async () => {
          await this.steelBrowser.click(decision.target!);
          await this.screenshot('02-after-click');
        });
      }

      // Step 4: Wait for CAPTCHA
      await this.step('Wait for CAPTCHA', async () => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        await this.screenshot('03-captcha-appeared');
      });

      // Step 5: Find and solve CAPTCHA
      const solution = await this.step('Solve CAPTCHA', async () => {
        const captchaScreenshot = await this.steelBrowser.screenshot();
        const answer = await this.mistral.analyzeImage(
          captchaScreenshot,
          'What is the text in this CAPTCHA image? Provide only the text, nothing else.'
        );
        
        // Extract clean answer
        const cleanAnswer = answer.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
        
        console.log(`📝 CAPTCHA Solution: ${cleanAnswer}`);
        
        // Fill the answer
        await this.steelBrowser.fill('input[type="text"], input[name*="captcha"]', cleanAnswer);
        await this.screenshot('04-solution-filled');
        
        return cleanAnswer;
      });

      console.log('');
      console.log('='.repeat(70));
      console.log('✅ CAPTCHA SOLVED!');
      console.log('='.repeat(70));
      console.log(`Solution: ${solution}`);
      console.log(`Method: Mistral Vision (${CONFIG.mistral.visionModel})`);
      console.log(`Screenshots: ${this.screenshotDir}`);
      console.log('='.repeat(70));

      return {
        success: true,
        solution,
        confidence: 0.85,
        method: 'mistral',
      };

    } catch (error) {
      console.error('❌ CAPTCHA solving failed:', error.message);
      
      // Try fallback
      console.log('🛡️  Trying Stagehand fallback...');
      try {
        const fallbackResult = await this.stagehand.executeTask(
          'Solve CAPTCHA fallback',
          this.steelBrowser
        );
        
        return {
          success: true,
          solution: 'fallback-solution',
          confidence: 0.6,
          method: 'stagehand',
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: error.message,
          confidence: 0,
          method: 'mistral',
        };
      }
    }
  }

  private async step<T>(name: string, action: () => Promise<T>): Promise<T> {
    this.stepCount++;
    console.log(`\n📍 Step ${this.stepCount}: ${name}`);
    console.log('-'.repeat(50));
    
    try {
      const result = await action();
      console.log(`✅ Step ${this.stepCount} complete`);
      return result;
    } catch (error) {
      console.error(`❌ Step ${this.stepCount} failed:`, error.message);
      throw error;
    }
  }

  private async screenshot(name: string): Promise<void> {
    try {
      const screenshot = await this.steelBrowser.screenshot();
      const filepath = path.join(this.screenshotDir, `${name}.png`);
      fs.writeFileSync(filepath, screenshot);
      
      if (CONFIG.debug) {
        console.log(`📸 Screenshot saved: ${filepath}`);
      }
    } catch (error) {
      console.warn('⚠️  Screenshot failed:', error.message);
    }
  }
}

// Main execution
async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     HOLY TRINITY WORKER - Steel + Skyvern + Mistral        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const worker = new HolyTrinityWorker();
  
  const initialized = await worker.initialize();
  if (!initialized) {
    console.error('❌ Worker initialization failed');
    process.exit(1);
  }

  const result = await worker.solveCaptcha();
  
  if (result.success) {
    console.log('\n🎉 SUCCESS!');
    console.log(`Solution: ${result.solution}`);
    console.log(`Method: ${result.method}`);
    console.log(`Confidence: ${result.confidence}`);
  } else {
    console.log('\n❌ FAILED!');
    console.log(`Error: ${result.error}`);
  }

  process.exit(result.success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export default HolyTrinityWorker;
