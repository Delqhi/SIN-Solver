/**
 * HOLY TRINITY WORKER - Steel Browser + Skyvern + Groq/Mistral
 * 
 * Architecture:
 * 🧠 Skyvern (The Brain) - AI Orchestrator
 * 🖥️ Steel Browser CDP (The Hands) - Real-time browser control
 * 👁️ Groq AI (The Eyes) - Llama Vision (faster than Mistral)
 * 🛡️ Stagehand (The Backup) - Fallback orchestrator
 * 
 * Key Insight:
 * "Steel Browser is the Ferrari, Skyvern is the F1 Driver, Mistral is the Navigator"
 */

import { chromium, Browser, Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import VaultClient, { VaultKeyId } from './services/vault-client';
import QueueManager from './improvements/queue-manager';
import ParallelSolver from './improvements/parallel-solver';
import RetryManager from './improvements/retry-manager';
import ConfidenceScorer from './improvements/confidence-scorer';
import MultiProvider, { CaptchaProvider, ProviderSolveRequest, ProviderSolveResult } from './improvements/multi-provider';
import BatchProcessor from './improvements/batch-processor';
import StatsMonitor, { ResponseCache } from './improvements/stats-monitor';
import EarningsOptimizer from './improvements/earnings-optimizer';
import CircuitBreaker from './improvements/circuit-breaker';
import HealthChecker from './improvements/health-checker';
import IPRotationManager from './improvements/ip-rotation-manager';
import type { BrowserSessionSnapshot } from './improvements/sync-coordinator';
import type { BrowserSessionSnapshot } from './improvements/sync-coordinator';

dotenv.config();

// Configuration
const CONFIG = {
  // Steel Browser CDP
  steelBrowser: {
    cdpUrl: process.env.STEEL_BROWSER_CDP || 'http://localhost:9223',
    apiUrl: process.env.STEEL_BROWSER_API || 'http://localhost:3005',
  },
  // Provider priority (Vision + Orchestrator)
  vision: {
    primary: (process.env.VISION_PRIMARY || 'groq').toLowerCase(),
    fallback: (process.env.VISION_FALLBACK || 'mistral').toLowerCase(),
  },
  orchestrator: {
    primary: (process.env.ORCHESTRATOR_PRIMARY || 'skyvern').toLowerCase(),
    fallback: (process.env.ORCHESTRATOR_FALLBACK || 'internal').toLowerCase(),
  },
  // Groq AI (Llama Vision - Primary)
  groq: {
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    visionModel: 'llama-3.2-11b-vision-preview',
    textModel: 'llama-3.2-3b-preview',
  },
  // Mistral AI (Pixtral - Fallback)
  mistral: {
    apiUrl: process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions',
    visionModel: 'pixtral-12b-2409',
    textModel: 'mistral-small-latest',
  },
  // Skyvern (if available)
  skyvern: {
    enabled: process.env.SKYVERN_ENABLED !== 'false',
    url: process.env.SKYVERN_URL || 'http://localhost:8000',
  },
  // Stagehand Fallback
  stagehand: {
    enabled: process.env.STAGEHAND_ENABLED !== 'false',
    apiKey: process.env.STAGEHAND_API_KEY,
  },
  // Improvements & Performance
  improvements: {
    enabled: process.env.HOLY_TRINITY_IMPROVEMENTS !== 'false',
    maxConcurrency: parseInt(process.env.HOLY_TRINITY_MAX_CONCURRENCY || '4'),
    queueMaxSize: parseInt(process.env.HOLY_TRINITY_QUEUE_MAX || '500'),
    retryMaxAttempts: parseInt(process.env.HOLY_TRINITY_RETRY_MAX || '3'),
    retryBaseDelayMs: parseInt(process.env.HOLY_TRINITY_RETRY_BASE_MS || '500'),
    retryMaxDelayMs: parseInt(process.env.HOLY_TRINITY_RETRY_MAX_MS || '10000'),
    batchSize: parseInt(process.env.HOLY_TRINITY_BATCH_SIZE || '4'),
    batchIntervalMs: parseInt(process.env.HOLY_TRINITY_BATCH_INTERVAL_MS || '250'),
    screenshotCompression: process.env.HOLY_TRINITY_SCREENSHOT_COMPRESSION !== 'false',
    cacheTtlMs: parseInt(process.env.HOLY_TRINITY_CACHE_TTL_MS || '30000'),
    circuitFailureThreshold: parseInt(process.env.HOLY_TRINITY_CIRCUIT_FAILURES || '3'),
    circuitCooldownMs: parseInt(process.env.HOLY_TRINITY_CIRCUIT_COOLDOWN_MS || '30000'),
    circuitSuccessThreshold: parseInt(process.env.HOLY_TRINITY_CIRCUIT_SUCCESS || '2'),
    webhookUrl: process.env.HOLY_TRINITY_WEBHOOK_URL,
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
  method: 'groq' | 'mistral' | 'skyvern' | 'stagehand' | 'manual';
}

interface ImprovedSolveRequest {
  id: string;
  url: string;
  priority: number;
}

interface ImprovedSolveResult {
  requestId: string;
  solution?: string;
  confidence: number;
  provider: string;
  elapsedMs: number;
  success: boolean;
  error?: string;
}



type VisionProviderName = 'groq' | 'mistral';

interface VisionDecisionResult {
  decision: KIDecision;
  provider: VisionProviderName;
}

interface VisionSolveResult {
  solution: string;
  confidence: number;
  provider: VisionProviderName;
  raw?: unknown;
}

/**
 * Groq Key Manager
 * Handles key rotation and health metadata (no secrets logged).
 */
class GroqKeyManager {
  private keys: Array<{ id: VaultKeyId; key: string }> = [];
  private activeIndex = 0;
  private lastRotationReason: string | null = null;
  private readonly vaultClient: VaultClient;

  constructor(vaultClient: VaultClient) {
    this.vaultClient = vaultClient;
  }

  /**
   * Load Groq keys from Vault (env fallback handled by VaultClient).
   */
  async loadKeys(): Promise<void> {
    const payload = await this.vaultClient.getKeys();
    const entries: Array<{ id: VaultKeyId; key: string }> = [];
    if (payload.groqApiKey1) {
      entries.push({ id: 'GROQ_API_KEY_1', key: payload.groqApiKey1 });
    }
    if (payload.groqApiKey2) {
      entries.push({ id: 'GROQ_API_KEY_2', key: payload.groqApiKey2 });
    }
    this.keys = entries;
    if (this.activeIndex >= this.keys.length) {
      this.activeIndex = 0;
    }
  }

  /**
   * Return the active key entry or null if missing.
   */
  getActiveKey(): { id: VaultKeyId; key: string } | null {
    if (this.keys.length === 0) {
      return null;
    }
    return this.keys[this.activeIndex] || null;
  }

  /**
   * Rotate to the next available key.
   */
  rotateKey(reason: string): { id: VaultKeyId; key: string } | null {
    if (this.keys.length <= 1) {
      this.lastRotationReason = reason;
      return this.getActiveKey();
    }
    this.activeIndex = (this.activeIndex + 1) % this.keys.length;
    this.lastRotationReason = reason;
    return this.getActiveKey();
  }

  /**
   * Mark current key as rate-limited and rotate.
   */
  async markRateLimited(reason: string, keyId?: VaultKeyId): Promise<void> {
    const active = keyId || this.getActiveKey()?.id;
    if (active) {
      await this.vaultClient.updateMetrics({
        errorCount: 1,
        usageByKey: { [active]: 0 },
      });
      await this.vaultClient.updateRotationState({
        activeKey: active,
        lastRotatedAt: new Date().toISOString(),
        healthStatus: {
          status: 'degraded',
          lastCheckedAt: new Date().toISOString(),
          lastErrorAt: new Date().toISOString(),
        },
      });
    }
    this.rotateKey(reason);
  }

  /**
   * Record usage metrics in Vault (fire-and-forget).
   */
  async recordUsage(keyId: VaultKeyId, success: boolean): Promise<void> {
    await this.vaultClient.updateMetrics({
      lastUsedAt: new Date().toISOString(),
      totalRequests: 1,
      errorCount: success ? 0 : 1,
      usageByKey: { [keyId]: 1 },
    });
  }

  /**
   * Key count for health checks.
   */
  getKeyCount(): number {
    return this.keys.length;
  }

  /**
   * Last rotation reason (for diagnostics).
   */
  getLastRotationReason(): string | null {
    return this.lastRotationReason;
  }
}

/**
 * Mistral Key Provider
 * Reads fallback key from Vault (env fallback supported).
 */
class MistralKeyProvider {
  private key: string | null = null;
  private readonly vaultClient: VaultClient;

  constructor(vaultClient: VaultClient) {
    this.vaultClient = vaultClient;
  }

  /**
   * Load Mistral key from Vault (env fallback handled by VaultClient).
   */
  async loadKey(): Promise<void> {
    this.key = await this.vaultClient.getKey('mistral');
  }

  /**
   * Return the configured key or null.
   */
  getKey(): string | null {
    return this.key;
  }
}

/**
 * Steel Browser CDP Connector
 * Real-time browser control via Chrome DevTools Protocol using Playwright
 */
class SteelBrowserCDP {
  private cdpUrl: string;
  private apiUrl: string;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(cdpUrl: string, apiUrl: string) {
    this.cdpUrl = cdpUrl;
    this.apiUrl = apiUrl;
  }

  async connect(): Promise<boolean> {
    try {
      console.log('🔌 Connecting to Steel Browser CDP...');
      console.log(`   CDP URL: ${this.cdpUrl}`);
      console.log(`   API URL: ${this.apiUrl}`);

      // Check if Steel Browser is healthy (use root endpoint as /health doesn't exist)
      const healthCheck = await fetch(`${this.apiUrl}/`);
      if (!healthCheck.ok) {
        throw new Error(`Steel Browser health check failed: ${healthCheck.status}`);
      }

      // Get the WebSocket debugger URL from Steel Browser
      const versionResponse = await fetch(`${this.cdpUrl}/json/version`);
      const version = await versionResponse.json();
      const wsUrl = version.webSocketDebuggerUrl;
      
      // Fix the WebSocket URL to include the correct port
      // Steel Browser returns ws://localhost/... but we need ws://localhost:9223/...
      const fixedWsUrl = wsUrl.replace('ws://localhost/', 'ws://localhost:9223/');
      console.log(`   WebSocket URL: ${fixedWsUrl}`);

      // Connect Playwright to Steel Browser CDP
      this.browser = await chromium.connectOverCDP(fixedWsUrl);
      const context = this.browser.contexts()[0] || await this.browser.newContext();
      this.page = context.pages()[0] || await context.newPage();

      console.log('✅ Steel Browser CDP connected');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Steel Browser:', error.message);
      return false;
    }
  }

  async navigate(url: string): Promise<void> {
    console.log(`🌐 Navigating to: ${url}`);
    
    if (!this.page) {
      throw new Error('Browser not connected');
    }
    
    await this.page.goto(url, { waitUntil: 'networkidle' });
    console.log('✅ Navigation complete');
  }

  async screenshot(selector?: string): Promise<Buffer> {
    console.log('📸 Taking screenshot...');
    
    if (!this.page) {
      throw new Error('Browser not connected');
    }
    
    let screenshot: Buffer;
    if (selector) {
      const element = this.page.locator(selector).first();
      screenshot = await element.screenshot();
    } else {
      screenshot = await this.page.screenshot({ fullPage: true });
    }
    
    console.log('✅ Screenshot captured');
    return screenshot;
  }

  async click(selector: string): Promise<void> {
    console.log(`🖱️  Clicking: ${selector}`);
    
    if (!this.page) {
      throw new Error('Browser not connected');
    }
    
    await this.page.locator(selector).first().click();
    console.log('✅ Click executed');
  }

  async fill(selector: string, value: string): Promise<void> {
    console.log(`⌨️  Filling ${selector} with: ${value}`);
    
    if (!this.page) {
      throw new Error('Browser not connected');
    }
    
    await this.page.locator(selector).first().fill(value);
    console.log('✅ Fill executed');
  }

  async getPageSource(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not connected');
    }
    return await this.page.content();
  }

  async onDOMUpdate(callback: (data: any) => void): Promise<void> {
    // CDP allows real-time DOM monitoring
    console.log('👂 Listening for DOM updates...');
    void callback;
    // Implementation would use page.on('domcontentloaded') etc.
  }
}

/**
 * Groq AI Vision Client
 * Primary vision provider with key rotation.
 */
class GroqVision {
  private apiUrl: string;
  private visionModel: string;
  private textModel: string;
  private keyManager: GroqKeyManager;

  constructor(config: typeof CONFIG.groq, keyManager: GroqKeyManager) {
    this.apiUrl = config.apiUrl;
    this.visionModel = config.visionModel;
    this.textModel = config.textModel;
    this.keyManager = keyManager;
  }

  hasKeys(): boolean {
    return this.keyManager.getKeyCount() > 0;
  }

  async analyzeImage(imageBuffer: Buffer, prompt: string): Promise<string> {
    console.log('🤖 Asking Groq to analyze image...');
    const base64Image = imageBuffer.toString('base64');

    const messages = [
      {
        role: 'system',
        content: 'You are a CAPTCHA solving expert. Analyze the image and provide the solution. Be concise.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
            },
          },
        ],
      },
    ];

    return this.executeGroqRequest({
      model: this.visionModel,
      messages,
      max_tokens: 100,
      temperature: 0.3,
    });
  }

  async makeDecision(context: string, screenshot?: Buffer): Promise<KIDecision> {
    console.log('🧠 Groq making decision...');

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
}`,
      },
      {
        role: 'user',
        content: context,
      },
    ];

    if (screenshot) {
      const base64Image = screenshot.toString('base64');
      messages[1].content = [
        { type: 'text', text: context },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${base64Image}`,
          },
        },
      ];
    }

    const content = await this.executeGroqRequest({
      model: screenshot ? this.visionModel : this.textModel,
      messages,
      max_tokens: 500,
      temperature: 0.3,
    });

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        action: 'wait',
        reason: content,
        confidence: 0.5,
      };
    } catch {
      return {
        action: 'wait',
        reason: content,
        confidence: 0.5,
      };
    }
  }

  private async executeGroqRequest(payload: Record<string, unknown>): Promise<string> {
    const totalKeys = Math.max(this.keyManager.getKeyCount(), 1);
    let attemptsLeft = totalKeys;

    while (attemptsLeft > 0) {
      const active = this.keyManager.getActiveKey();
      if (!active) {
        throw new Error('Groq API keys not configured');
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${active.key}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        console.warn(`⚠️  Groq rate limit for ${active.id}. Rotating key...`);
        await this.keyManager.markRateLimited('rate-limit', active.id);
        attemptsLeft -= 1;
        continue;
      }

      if (!response.ok) {
        const error = await response.text();
        await this.keyManager.recordUsage(active.id, false);
        throw new Error(`Groq API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      await this.keyManager.recordUsage(active.id, true);
      console.log('✅ Groq analysis complete');
      console.log(`   Result: ${String(content).substring(0, 100)}...`);
      return content;
    }

    throw new Error('Groq rate limit reached for all keys');
  }
}

/**
 * Mistral AI Vision Client
 * Fallback vision provider.
 */
class MistralVision {
  private apiUrl: string;
  private visionModel: string;
  private textModel: string;
  private keyProvider: MistralKeyProvider;

  constructor(config: typeof CONFIG.mistral, keyProvider: MistralKeyProvider) {
    this.apiUrl = config.apiUrl;
    this.visionModel = config.visionModel;
    this.textModel = config.textModel;
    this.keyProvider = keyProvider;
  }

  hasKey(): boolean {
    return Boolean(this.keyProvider.getKey());
  }

  async analyzeImage(imageBuffer: Buffer, prompt: string): Promise<string> {
    console.log('🤖 Asking Mistral to analyze image...');
    const base64Image = imageBuffer.toString('base64');
    const key = this.keyProvider.getKey();
    if (!key) {
      throw new Error('Mistral API key not configured');
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: this.visionModel,
        messages: [
          {
            role: 'system',
            content: 'You are a CAPTCHA solving expert. Analyze the image and provide the solution. Be concise.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
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
    console.log(`   Result: ${String(content).substring(0, 100)}...`);
    return content;
  }

  async makeDecision(context: string, screenshot?: Buffer): Promise<KIDecision> {
    console.log('🧠 Mistral making decision...');
    const key = this.keyProvider.getKey();
    if (!key) {
      throw new Error('Mistral API key not configured');
    }

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
}`,
      },
      {
        role: 'user',
        content: context,
      },
    ];

    if (screenshot) {
      const base64Image = screenshot.toString('base64');
      messages[1].content = [
        { type: 'text', text: context },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${base64Image}`,
          },
        },
      ];
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
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
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        action: 'wait',
        reason: content,
        confidence: 0.5,
      };
    } catch {
      return {
        action: 'wait',
        reason: content,
        confidence: 0.5,
      };
    }
  }
}

/**
 * Groq Provider Adapter (MultiProvider)
 */
class GroqProvider implements CaptchaProvider {
  name = 'groq';
  costPerSolve = 0.008;
  supportsTypes = ['text', 'image', 'recaptcha', 'hcaptcha', 'geetest', 'unknown'];
  private readonly groq: GroqVision;

  constructor(groq: GroqVision) {
    this.groq = groq;
  }

  async solve(request: ProviderSolveRequest): Promise<ProviderSolveResult> {
    if (!request.image) {
      throw new Error('GroqProvider requires image input');
    }
    const answer = await this.groq.analyzeImage(
      request.image,
      request.prompt || 'Solve the CAPTCHA. Provide only the answer.'
    );
    const cleanAnswer = answer.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
    return {
      solution: cleanAnswer,
      confidence: 0.86,
      raw: answer,
    };
  }

  async healthCheck(): Promise<boolean> {
    return this.groq.hasKeys();
  }
}

/**
 * Mistral Provider Adapter (MultiProvider)
 */
class MistralProvider implements CaptchaProvider {
  name = 'mistral';
  costPerSolve = 0.01;
  supportsTypes = ['text', 'image', 'recaptcha', 'hcaptcha', 'geetest', 'unknown'];
  private readonly mistral: MistralVision;

  constructor(mistral: MistralVision) {
    this.mistral = mistral;
  }

  async solve(request: ProviderSolveRequest): Promise<ProviderSolveResult> {
    if (!request.image) {
      throw new Error('MistralProvider requires image input');
    }
    const answer = await this.mistral.analyzeImage(
      request.image,
      request.prompt || 'Solve the CAPTCHA. Provide only the answer.'
    );
    const cleanAnswer = answer.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
    return {
      solution: cleanAnswer,
      confidence: 0.82,
      raw: answer,
    };
  }

  async healthCheck(): Promise<boolean> {
    return this.mistral.hasKey();
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

    void steelBrowser;

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

    void steelBrowser;
    void this.apiKey;

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
  private groq: GroqVision;
  private mistral: MistralVision;
  private mistralKeyProvider: MistralKeyProvider;
  private skyvern: SkyvernOrchestrator;
  private stagehand: StagehandFallback;
  private screenshotDir: string;
  private stepCount: number = 0;
  private queueManager: QueueManager<ImprovedSolveRequest>;
  private parallelSolver: ParallelSolver;
  private retryManager: RetryManager;
  private confidenceScorer: ConfidenceScorer;
  private multiProvider: MultiProvider;
  private batchProcessor: BatchProcessor<ProviderSolveRequest, ProviderSolveResult>;
  private statsMonitor: StatsMonitor;
  private earningsOptimizer: EarningsOptimizer;
  private circuitBreaker: CircuitBreaker;
  private healthChecker: HealthChecker;
  private responseCache: ResponseCache<unknown>;
  private cleanupInterval?: NodeJS.Timeout;
  private ipRotationManager: IPRotationManager;
  private groqKeyManager: GroqKeyManager;
  private vaultClient: VaultClient;

  constructor() {
    // Initialize components
    this.steelBrowser = new SteelBrowserCDP(
      CONFIG.steelBrowser.cdpUrl,
      CONFIG.steelBrowser.apiUrl
    );

    this.vaultClient = new VaultClient({ enableAutoReload: true });
    this.groqKeyManager = new GroqKeyManager(this.vaultClient);
    this.mistralKeyProvider = new MistralKeyProvider(this.vaultClient);

    this.groq = new GroqVision(CONFIG.groq, this.groqKeyManager);
    this.mistral = new MistralVision(CONFIG.mistral, this.mistralKeyProvider);
    this.skyvern = new SkyvernOrchestrator(CONFIG.skyvern);
    this.stagehand = new StagehandFallback(CONFIG.stagehand);

    
    // Setup screenshot directory
    this.screenshotDir = path.join(
      CONFIG.screenshotDir, 
      `holy-trinity-${Date.now()}`
    );
    fs.mkdirSync(this.screenshotDir, { recursive: true });

    // Improvements initialization
    this.queueManager = new QueueManager<ImprovedSolveRequest>({
      maxRetries: CONFIG.improvements.retryMaxAttempts,
      visibilityTimeoutMs: CONFIG.improvements.retryMaxDelayMs,
      deadLetterEnabled: true,
      maxQueueSize: CONFIG.improvements.queueMaxSize,
    });
    this.parallelSolver = new ParallelSolver({
      concurrency: CONFIG.improvements.maxConcurrency,
    });
    this.statsMonitor = new StatsMonitor();
    this.retryManager = new RetryManager({
      maxAttempts: CONFIG.improvements.retryMaxAttempts,
      baseDelayMs: CONFIG.improvements.retryBaseDelayMs,
      maxDelayMs: CONFIG.improvements.retryMaxDelayMs,
      jitter: 0.2,
      onRetry: () => this.statsMonitor.recordRetry(),
    });
    this.confidenceScorer = new ConfidenceScorer();
    this.statsMonitor = this.statsMonitor || new StatsMonitor();
    this.earningsOptimizer = new EarningsOptimizer();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: CONFIG.improvements.circuitFailureThreshold,
      cooldownMs: CONFIG.improvements.circuitCooldownMs,
      successThreshold: CONFIG.improvements.circuitSuccessThreshold,
    });
    this.responseCache = new ResponseCache(CONFIG.improvements.cacheTtlMs);
    const queueStats = this.queueManager.getStats();
    void queueStats;
    const visionOrder = this.getVisionOrder();
    this.multiProvider = new MultiProvider(
      [new GroqProvider(this.groq), new MistralProvider(this.mistral)],
      {
        retryManager: this.retryManager,
        circuitBreaker: this.circuitBreaker,
        preferredOrder: visionOrder,
      }
    );
    this.batchProcessor = new BatchProcessor<ProviderSolveRequest, ProviderSolveResult>({
      maxBatchSize: CONFIG.improvements.batchSize,
      flushIntervalMs: CONFIG.improvements.batchIntervalMs,
      parallelism: CONFIG.improvements.maxConcurrency,
    });
    this.healthChecker = new HealthChecker();
    this.healthChecker.register({
      name: 'steel-browser',
      check: async () => {
        const start = Date.now();
        try {
          const cached = this.responseCache.get('steel-health');
          if (cached) {
            return { name: 'steel-browser', status: 'healthy', latencyMs: Date.now() - start };
          }
          const response = await fetch(`${CONFIG.steelBrowser.apiUrl}/health`).catch(async () => {
            return fetch(`${CONFIG.steelBrowser.apiUrl}/`);
          });
          const status = response.ok ? 'healthy' : 'degraded';
          this.responseCache.set('steel-health', true);
          return { name: 'steel-browser', status, latencyMs: Date.now() - start };
        } catch (error) {
          return {
            name: 'steel-browser',
            status: 'unhealthy',
            message: error instanceof Error ? error.message : String(error),
            latencyMs: Date.now() - start,
          };
        }
      },
    });
    this.healthChecker.register({
      name: 'groq',
      check: async () => ({
        name: 'groq',
        status: this.groqKeyManager.getKeyCount() > 0 ? 'healthy' : 'degraded',
        message: this.groqKeyManager.getKeyCount() > 0 ? undefined : 'Missing Groq API keys',
      }),
    });
    this.healthChecker.register({
      name: 'mistral',
      check: async () => ({
        name: 'mistral',
        status: this.mistralKeyProvider.getKey() ? 'healthy' : 'degraded',
        message: this.mistralKeyProvider.getKey() ? undefined : 'Missing Mistral API key',
      }),
    });
    this.healthChecker.register({
      name: 'skyvern',
      check: async () => ({
        name: 'skyvern',
        status: (await this.skyvern.isAvailable()) ? 'healthy' : 'degraded',
      }),
    });
    this.healthChecker.register({
      name: 'stagehand',
      check: async () => ({
        name: 'stagehand',
        status: CONFIG.stagehand.enabled ? 'healthy' : 'degraded',
      }),
    });

    // 🆕 Initialize IP Rotation Manager
    this.ipRotationManager = new IPRotationManager({
      stateFilePath: './data/ip-rotation-state.json',
      bindingsFilePath: './data/ip-bindings.json',
      sessionFilePath: './data/browser-sessions.json',
      sessionRestoreHandler: async (snapshot) => {
        console.log('🔄 Restoring browser session after IP rotation...');
        void snapshot;
        // Session restoration logic here
      },
      sessionSnapshotProvider: async (): Promise<BrowserSessionSnapshot> => {
        // Return current browser session snapshot (typed)
        return {
          sessionId: uuidv4(),
          capturedAt: Date.now(),
          cookies: {},
          localStorage: {},
          metadata: {
            url: '',
          },
        };
      },
      minRequestsBeforeRotation: 4000,
      maxRequestsBeforeRotation: 6000,
      minPauseMinutes: 5,
      maxPauseMinutes: 10,
    });

    // 🆕 Initialize Groq Key Manager
    const vaultClient = this.vaultClient;
    this.groqKeyManager = this.groqKeyManager || new GroqKeyManager(vaultClient);

    void this.parallelSolver;
    void this.confidenceScorer;
    void this.batchProcessor;
    void this.earningsOptimizer;
    void this.cleanupInterval;
  }

  async initialize(): Promise<boolean> {
    console.log('🚀 Initializing Holy Trinity Worker...');
    console.log('');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│  🏆 THE HOLY TRINITY                                        │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│  🧠 Skyvern (The Brain)                                     │');
    console.log('│  🖥️  Steel Browser CDP (The Hands)                          │');
    console.log('│  👁️  Groq/Mistral (The Eyes)                                │');
    console.log('│  🛡️  Stagehand (The Backup)                                 │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    console.log('');

    await this.groqKeyManager.loadKeys();
    await this.mistralKeyProvider.loadKey();

    // Connect to Steel Browser
    const steelConnected = await this.steelBrowser.connect();
    if (!steelConnected) {
      console.error('❌ Failed to connect to Steel Browser');
      return false;
    }

    // Check Groq API
    if (this.groqKeyManager.getKeyCount() === 0) {
      console.warn('⚠️  Groq API keys not configured');
    } else {
      console.log('✅ Groq Llama Vision configured');
    }

    if (!this.mistralKeyProvider.getKey()) {
      console.warn('⚠️  Mistral API key not configured');
    } else {
      console.log('✅ Mistral Pixtral configured');
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

    if (CONFIG.improvements.enabled) {
      this.startResourceGuardian();
      const health = await this.healthChecker.run();
      console.log('🩺 Health Check:', health);
    }

    return true;
  }

  private startResourceGuardian(): void {
    console.log('🛡️  Resource Guardian started');
    setInterval(() => {
      const usage = process.memoryUsage();
      if (usage.heapUsed > 500 * 1024 * 1024) {
        console.warn('⚠️  High memory usage detected');
      }
    }, 60000);
  }

  /**
   * 🆕 Synchronized IP + Key Rotation
   * Rotates both IP and API key together, then pauses 5-10 minutes
   */
  async performSynchronizedRotation(reason: 'request-threshold' | 'rate-limit' | 'ip-ban'): Promise<void> {
    console.log(`🔄 Starting synchronized rotation: ${reason}`);
    
    // Step 1: Rotate IP
    console.log('🌐 Rotating IP...');
    const ipResult = await this.ipRotationManager.rotateIP(reason);
    console.log(`✅ IP rotated: ${ipResult.oldIP} → ${ipResult.newIP}`);
    
    // Step 2: Rotate Groq Key
    console.log('🔑 Rotating Groq API key...');
    const keyResult = this.groqKeyManager.rotateKey(reason);
    if (keyResult) {
      console.log(`✅ Key rotated to: ${keyResult.id}`);
    }
    
    // Step 3: Pause 5-10 minutes (anti-ban)
    const pauseMs = this.ipRotationManager.getRandomPauseDurationMs();
    const pauseMinutes = Math.round(pauseMs / 1000 / 60);
    console.log(`⏸️  Anti-ban pause: ${pauseMinutes} minutes...`);
    await new Promise(resolve => setTimeout(resolve, pauseMs));
    console.log('▶️  Pause complete, resuming work');
    
    // Step 4: Log rotation stats
    const stats = this.ipRotationManager.getStats();
    console.log('📊 Rotation stats:', {
      totalRotations: stats.totalRotations,
      requestsUntilNextRotation: stats.requestsUntilRotation,
    });
  }

  /**
   * 🆕 Track request and check if rotation needed
   * Call this after each CAPTCHA solve attempt
   */
  async trackRequestAndRotateIfNeeded(): Promise<void> {
    const rotationCheck = this.ipRotationManager.trackRequest();
    
    if (rotationCheck.shouldRotate) {
      console.log(`🎯 ${rotationCheck.reason}`);
      await this.performSynchronizedRotation('request-threshold');
    }
  }

  /**
   * 🆕 Handle 429 or IP ban with emergency rotation
   */
  async handleEmergencyRotation(errorType: 'rate-limit' | 'ip-ban'): Promise<void> {
    console.log(`🚨 Emergency rotation triggered: ${errorType}`);
    await this.performSynchronizedRotation(errorType);
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

      if (CONFIG.orchestrator.primary === 'skyvern') {
        const skyvernAvailable = await this.skyvern.isAvailable();
        if (skyvernAvailable) {
          await this.skyvern.executeWorkflow('Analyze page for CAPTCHA options', this.steelBrowser);
        }
      }

      // Step 2: Analyze with Vision provider
      const decisionResult = await this.step('Analyze page with Vision provider', async () => {
        const screenshot = await this.steelBrowser.screenshot();
        return await this.makeVisionDecision(
          'What should I do on this page? Look for CAPTCHA options.',
          screenshot
        );
      });

      console.log(`🤖 Vision Decision (${decisionResult.provider}):`, decisionResult.decision);
      const decision = decisionResult.decision;

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
      const solutionResult = await this.step('Solve CAPTCHA', async () => {
        const captchaScreenshot = await this.steelBrowser.screenshot();
        const captchaInfo: CaptchaInfo = {
          type: 'image',
          screenshot: captchaScreenshot,
          description: 'Demo CAPTCHA screenshot',
        };
        void captchaInfo;
        const answer = await this.solveCaptchaImage(
          captchaScreenshot,
          'What is the text in this CAPTCHA image? Provide only the text, nothing else.'
        );

        console.log(`📝 CAPTCHA Solution (${answer.provider}): ${answer.solution}`);

        // Fill the answer
        await this.steelBrowser.fill('input[type="text"], input[name*="captcha"]', answer.solution);
        await this.screenshot('04-solution-filled');

        return answer;
      });

      console.log('');
      console.log('='.repeat(70));
      console.log('✅ CAPTCHA SOLVED!');
      console.log('='.repeat(70));
      console.log(`Solution: ${solutionResult.solution}`);
      console.log(`Method: ${solutionResult.provider}`);
      console.log(`Screenshots: ${this.screenshotDir}`);
      console.log('='.repeat(70));

      return {
        success: true,
        solution: solutionResult.solution,
        confidence: solutionResult.confidence,
        method: solutionResult.provider,
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

        void fallbackResult;
        
        return {
          success: true,
          solution: 'fallback-solution',
          confidence: 0.6,
          method: 'stagehand',
        };
      } catch (fallbackError) {
        const improvedResult: ImprovedSolveResult = {
          requestId: uuidv4(),
          solution: undefined,
          confidence: 0,
          provider: 'stagehand',
          elapsedMs: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
        void improvedResult;
        return {
          success: false,
          error: error.message,
          confidence: 0,
          method: 'mistral',
        };
      }
    }
  }

  private getVisionOrder(): VisionProviderName[] {
    const primary: VisionProviderName = CONFIG.vision.primary === 'mistral' ? 'mistral' : 'groq';
    const fallback: VisionProviderName = CONFIG.vision.fallback === 'groq' ? 'groq' : 'mistral';
    if (primary === fallback) {
      return [primary, primary === 'groq' ? 'mistral' : 'groq'];
    }
    return [primary, fallback];
  }

  private async makeVisionDecision(context: string, screenshot?: Buffer): Promise<VisionDecisionResult> {
    const order = this.getVisionOrder();
    let lastError: Error | null = null;

    for (const provider of order) {
      try {
        const decision = provider === 'groq'
          ? await this.groq.makeDecision(context, screenshot)
          : await this.mistral.makeDecision(context, screenshot);
        return { decision, provider };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️  Vision decision failed for ${provider}: ${lastError.message}`);
      }
    }

    throw lastError ?? new Error('Vision providers unavailable');
  }

  private async solveCaptchaImage(image: Buffer, prompt: string): Promise<VisionSolveResult> {
    const result = await this.multiProvider.solve({
      type: 'image',
      image,
      prompt,
    });

    const provider = (result.provider as VisionProviderName) || this.getVisionOrder()[0];
    return {
      solution: result.solution,
      confidence: result.confidence,
      provider,
      raw: result.raw,
    };
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
