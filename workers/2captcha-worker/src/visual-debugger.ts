/**
 * Visual Debugger for Browserless Automation
 * Captures screenshots at key steps and on errors
 */

import * as fs from 'fs';
import * as path from 'path';
import { AutoHealingCDPManager } from './auto-healing-cdp';

interface ScreenshotEvent {
  timestamp: number;
  step: string;
  url?: string;
  error?: string;
  screenshotPath: string;
}

interface VisualDebugConfig {
  enabled: boolean;
  screenshotDir: string;
  captureOnError: boolean;
  captureOnSteps: boolean;
  stepsToCapture: string[];
  maxScreenshots: number;
}

export class VisualDebugger {
  private config: VisualDebugConfig;
  private events: ScreenshotEvent[] = [];
  private screenshotCount = 0;
  private cdpManager: AutoHealingCDPManager;

  constructor(cdpManager: AutoHealingCDPManager, config?: Partial<VisualDebugConfig>) {
    this.cdpManager = cdpManager;
    this.config = {
      enabled: true,
      screenshotDir: './screenshots',
      captureOnError: true,
      captureOnSteps: true,
      stepsToCapture: ['navigation', 'captcha-detected', 'before-submit', 'after-submit', 'error'],
      maxScreenshots: 100,
      ...config
    };

    // Ensure screenshot directory exists
    if (!fs.existsSync(this.config.screenshotDir)) {
      fs.mkdirSync(this.config.screenshotDir, { recursive: true });
    }
  }

  /**
   * Capture screenshot at current state
   */
  async captureScreenshot(step: string, metadata?: { url?: string; error?: string }): Promise<string | null> {
    if (!this.config.enabled) return null;
    if (this.screenshotCount >= this.config.maxScreenshots) {
      console.log('⚠️ [VisualDebugger] Max screenshots reached');
      return null;
    }

    try {
      const timestamp = Date.now();
      const filename = `${timestamp}-${step}.png`;
      const filepath = path.join(this.config.screenshotDir, filename);

      // Capture screenshot via CDP
      const result = await this.cdpManager.sendCommand('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true
      });

      // Handle different response formats
      const screenshotData = result?.data || result?.result?.data;
      
      if (screenshotData) {
        // Save screenshot
        const buffer = Buffer.from(screenshotData, 'base64');
        fs.writeFileSync(filepath, buffer);

        // Record event
        const event: ScreenshotEvent = {
          timestamp,
          step,
          url: metadata?.url,
          error: metadata?.error,
          screenshotPath: filepath
        };
        this.events.push(event);
        this.screenshotCount++;

        console.log(`📸 [VisualDebugger] Screenshot captured: ${filename}`);
        return filepath;
      }
    } catch (error) {
      console.error('❌ [VisualDebugger] Screenshot failed:', error);
    }

    return null;
  }

  /**
   * Capture screenshot on error
   */
  async captureErrorScreenshot(error: Error, context?: string): Promise<string | null> {
    if (!this.config.enabled || !this.config.captureOnError) return null;

    const step = `error-${context || 'unknown'}`;
    return this.captureScreenshot(step, { error: error.message });
  }

  /**
   * Capture screenshot on specific step
   */
  async captureStepScreenshot(step: string, url?: string): Promise<string | null> {
    if (!this.config.enabled || !this.config.captureOnSteps) return null;
    if (!this.config.stepsToCapture.includes(step)) return null;

    return this.captureScreenshot(step, { url });
  }

  /**
   * Generate debug report
   */
  generateReport(): string {
    const reportPath = path.join(this.config.screenshotDir, `debug-report-${Date.now()}.json`);
    
    const report = {
      generatedAt: new Date().toISOString(),
      totalScreenshots: this.screenshotCount,
      events: this.events,
      config: this.config
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 [VisualDebugger] Report generated: ${reportPath}`);
    
    return reportPath;
  }

  /**
   * Generate HTML debug timeline
   */
  generateHTMLTimeline(): string {
    const htmlPath = path.join(this.config.screenshotDir, `timeline-${Date.now()}.html`);
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Debug Timeline</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .timeline { max-width: 1200px; margin: 0 auto; }
    .event { background: white; margin: 10px 0; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .event.error { border-left: 4px solid #e74c3c; }
    .event.success { border-left: 4px solid #2ecc71; }
    .timestamp { color: #7f8c8d; font-size: 12px; }
    .step { font-weight: bold; color: #2c3e50; margin: 5px 0; }
    .screenshot { max-width: 100%; border: 1px solid #ddd; margin-top: 10px; }
    .error-msg { color: #e74c3c; background: #fee; padding: 8px; border-radius: 4px; margin-top: 5px; }
    h1 { color: #2c3e50; }
    .summary { background: #3498db; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="timeline">
    <h1>🐛 Debug Timeline</h1>
    <div class="summary">
      <strong>Total Screenshots:</strong> ${this.screenshotCount} | 
      <strong>Generated:</strong> ${new Date().toLocaleString()}
    </div>
    ${this.events.map(event => `
      <div class="event ${event.error ? 'error' : 'success'}">
        <div class="timestamp">${new Date(event.timestamp).toLocaleString()}</div>
        <div class="step">${event.step}</div>
        ${event.url ? `<div class="url">URL: ${event.url}</div>` : ''}
        ${event.error ? `<div class="error-msg">Error: ${event.error}</div>` : ''}
        <img class="screenshot" src="${path.basename(event.screenshotPath)}" alt="${event.step}" />
      </div>
    `).join('')}
  </div>
</body>
</html>`;

    fs.writeFileSync(htmlPath, html);
    console.log(`🌐 [VisualDebugger] HTML timeline generated: ${htmlPath}`);
    
    return htmlPath;
  }

  /**
   * Get all events
   */
  getEvents(): ScreenshotEvent[] {
    return [...this.events];
  }

  /**
   * Clear all events and screenshots
   */
  clear(): void {
    this.events = [];
    this.screenshotCount = 0;
    
    // Clear screenshot directory
    if (fs.existsSync(this.config.screenshotDir)) {
      const files = fs.readdirSync(this.config.screenshotDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.config.screenshotDir, file));
      }
    }
    
    console.log('🗑️ [VisualDebugger] Cleared all screenshots');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VisualDebugConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ [VisualDebugger] Configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): VisualDebugConfig {
    return { ...this.config };
  }
}

export default VisualDebugger;
