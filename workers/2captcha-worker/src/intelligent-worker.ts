/**
 * Intelligent CAPTCHA Worker - KI-gesteuert
 * 
 * Nutzt OpenCode ZEN Free Models:
 * - opencode/kimi-k2.5-free (Vision, Bild-CAPTCHAs)
 * - opencode/glm-4.7-free (Text, OCR)
 * 
 * Deaktiviert (nicht gelöscht):
 * - Gemini (kostenpflichtig)
 * - Mistral (kostenpflichtig)
 * 
 * Features:
 * - Natural Language Anweisungen
 * - Autonome Fehlerkorrektur
 * - Rocket.Chat Benachrichtigung
 * - API Response Caching (Token sparen)
 * - Self-healing Workflows
 */

import { Page, Browser } from 'playwright';
import { EventEmitter } from 'events';

// OpenCode ZEN Free API Endpoints
const OPENCODE_API = {
  baseUrl: 'https://api.opencode.ai/v1',
  models: {
    vision: 'opencode/kimi-k2.5-free',      // Für Bild-CAPTCHAs
    text: 'opencode/glm-4.7-free',          // Für Text/OCR
  }
};

// Cache für API Responses (spart Tokens!)
interface CacheEntry {
  response: string;
  timestamp: number;
  imageHash: string;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 24 * 60 * 60 * 1000; // 24h

  get(imageHash: string): string | null {
    const entry = this.cache.get(imageHash);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(imageHash);
      return null;
    }
    
    console.log('[CACHE] Hit! Using cached response (saved token cost)');
    return entry.response;
  }

  set(imageHash: string, response: string): void {
    this.cache.set(imageHash, {
      response,
      timestamp: Date.now(),
      imageHash
    });
  }
}

/**
 * Intelligent Worker - Versteht natürliche Sprache
 */
export class IntelligentCaptchaWorker extends EventEmitter {
  private page: Page;
  private browser: Browser;
  private cache: ResponseCache;
  private rocketChatWebhook: string;
  private currentWorkflow: WorkflowStep[] = [];
  private isRunning = false;

  constructor(
    browser: Browser, 
    page: Page,
    rocketChatWebhook: string
  ) {
    super();
    this.browser = browser;
    this.page = page;
    this.cache = new ResponseCache();
    this.rocketChatWebhook = rocketChatWebhook;
  }

  /**
   * Haupt-Einstieg: Versteht natürliche Sprache
   * 
   * Beispiel: "Gehe auf 2captcha.com, logge dich ein, klicke Start Work"
   */
  async executeInstruction(instruction: string): Promise<void> {
    console.log('[KI-WORKER] Anweisung empfangen:', instruction);
    this.emit('instruction-received', instruction);

    // Schritt 1: KI analysiert Anweisung und erstellt Workflow
    const workflow = await this.parseInstruction(instruction);
    this.currentWorkflow = workflow;

    console.log('[KI-WORKER] Workflow erstellt:', workflow.length, 'Schritte');
    this.emit('workflow-created', workflow);

    // Schritt 2: Führe Workflow aus mit Selbstheilung
    await this.executeWorkflowWithHealing(workflow);
  }

  /**
   * KI parst natürliche Sprache in ausführbare Schritte
   */
  private async parseInstruction(instruction: string): Promise<WorkflowStep[]> {
    // Call OpenCode ZEN für Plan-Erstellung
    const response = await this.callOpenCode({
      model: OPENCODE_API.models.text,
      messages: [{
        role: 'system',
        content: `Du bist ein intelligenter Browser-Automatisierungs-Agent. 
Wandle die Anweisung des Users in eine Liste von ausführbaren Schritten um.
Verfügbare Aktionen:
- navigate(url)
- fill(selector, value)
- click(selector)
- waitFor(selector)
- solveCaptcha()
- screenshot()

Antworte NUR im JSON-Format:
[
  {"action": "navigate", "url": "..."},
  {"action": "click", "selector": "..."}
]`
      }, {
        role: 'user',
        content: instruction
      }]
    });

    try {
      return JSON.parse(response);
    } catch {
      // Fallback: Einfache Heuristik wenn KI kein JSON liefert
      return this.fallbackParse(instruction);
    }
  }

  /**
   * Führe Workflow aus mit Selbstheilung bei Fehlern
   */
  private async executeWorkflowWithHealing(workflow: WorkflowStep[]): Promise<void> {
    for (let i = 0; i < workflow.length; i++) {
      const step = workflow[i];
      
      try {
        console.log(`[WORKFLOW] Schritt ${i + 1}/${workflow.length}: ${step.action}`);
        await this.executeStep(step);
        
      } catch (error) {
        console.error(`[WORKFLOW] Fehler in Schritt ${i + 1}:`, error);
        
        // 🧠 SELBSTHEILUNG: Versuche Fehler zu beheben
        const healed = await this.selfHeal(step, error, i);
        
        if (!healed) {
          // Benachrichtige User
          await this.notifyUser({
            type: 'error',
            step: i + 1,
            action: step.action,
            error: error.message,
            suggestion: 'Workflow kann nicht fortgesetzt werden. Bitte manuell eingreifen.'
          });
          
          throw error;
        }
      }
    }

    console.log('[WORKFLOW] ✅ Alle Schritte erfolgreich abgeschlossen!');
    this.emit('workflow-completed');
  }

  /**
   * Führe einzelnen Schritt aus
   */
  private async executeStep(step: WorkflowStep): Promise<void> {
    switch (step.action) {
      case 'navigate':
        await this.page.goto(step.url!, { waitUntil: 'networkidle' });
        break;
        
      case 'fill':
        await this.page.fill(step.selector!, step.value!);
        break;
        
      case 'click':
        await this.page.click(step.selector!);
        break;
        
      case 'waitFor':
        await this.page.waitForSelector(step.selector!, { timeout: 10000 });
        break;
        
      case 'solveCaptcha':
        await this.solveCaptchaIntelligent();
        break;
        
      case 'screenshot':
        await this.page.screenshot({ path: `screenshot-${Date.now()}.png` });
        break;
        
      default:
        throw new Error(`Unbekannte Aktion: ${step.action}`);
    }
  }

  /**
   * Intelligentes CAPTCHA-Lösen mit OpenCode ZEN Free
   */
  private async solveCaptchaIntelligent(): Promise<void> {
    console.log('[CAPTCHA] Starte intelligentes Lösen...');

    // 1. Finde CAPTCHA (KI-gesteuert, nicht hartkodiert)
    const captchaInfo = await this.findCaptchaWithKI();
    
    if (!captchaInfo) {
      throw new Error('Kein CAPTCHA gefunden');
    }

    // 2. Screenshot
    const screenshot = await captchaInfo.element.screenshot();
    const imageHash = this.hashImage(screenshot);

    // 3. Prüfe Cache (spart Tokens!)
    const cached = this.cache.get(imageHash);
    if (cached) {
      await this.submitAnswer(cached);
      return;
    }

    // 4. KI-Analyse mit OpenCode ZEN
    const solution = await this.analyzeWithOpenCode(screenshot, captchaInfo.type);
    
    // 5. Cache speichern
    this.cache.set(imageHash, solution);
    
    // 6. Einreichen
    await this.submitAnswer(solution);
  }

  /**
   * KI findet CAPTCHA (nicht hartkodierte Selektoren)
   */
  private async findCaptchaWithKI(): Promise<CaptchaInfo | null> {
    // Screenshot der ganzen Seite
    const pageScreenshot = await this.page.screenshot();
    
    // KI analysiert wo das CAPTCHA ist
    const response = await this.callOpenCode({
      model: OPENCODE_API.models.vision,
      messages: [{
         role: 'user',
         content: [
           {
             type: 'text',
             text: `Finde das CAPTCHA auf dieser Webseite. Beschreibe:\n1. Wo ist es positioniert (oben, mitte, unten, links, rechts)?\n2. Welchen Selektor hätte es wahrscheinlich (z.B. img.captcha, div#captcha)?\n3. Ist es ein Bild-CAPTCHA, Text-CAPTCHA, oder reCAPTCHA?`
           },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${pageScreenshot.toString('base64')}`
            }
          }
        ]
      }]
    });

    // Parse KI-Antwort und finde Element
    const selector = this.extractSelectorFromKIResponse(response);
    if (!selector) return null;

    const element = await this.page.$(selector);
    if (!element) return null;

    return {
      element,
      type: this.determineCaptchaType(response),
      selector
    };
  }

  /**
   * OpenCode ZEN API Call (Free Models)
   */
  private async callOpenCode(payload: any): Promise<string> {
    const response = await fetch(`${OPENCODE_API.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENCODE_API_KEY}`
      },
      body: JSON.stringify({
        ...payload,
        temperature: 0.3, // Niedrig für konsistente Ergebnisse
      })
    });

    if (!response.ok) {
      throw new Error(`OpenCode API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Benachrichtige User via Rocket.Chat
   */
  private async notifyUser(notification: UserNotification): Promise<void> {
    const message = {
      text: `🤖 *KI-Worker Benachrichtigung*\n\n` +
            `*Typ:* ${notification.type}\n` +
            `*Schritt:* ${notification.step}\n` +
            `*Aktion:* ${notification.action}\n` +
            (notification.error ? `*Fehler:* ${notification.error}\n` : '') +
            `*Vorschlag:* ${notification.suggestion}\n\n` +
            `[Workflow ansehen](https://delqhi.com/workflows)`
    };

    await fetch(this.rocketChatWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    this.emit('user-notified', notification);
  }

  // Hilfsmethoden...
  private hashImage(buffer: Buffer): string {
    // Einfacher Hash für Cache-Key
    return buffer.toString('base64').substring(0, 32);
  }

  private extractSelectorFromKIResponse(response: string): string | null {
    // Extrahiere CSS-Selektor aus KI-Antwort
    const match = response.match(/selector["']?\s*[:=]\s*["']([^"']+)["']/i);
    return match?.[1] || null;
  }

  private determineCaptchaType(response: string): CaptchaType {
    if (response.includes('reCAPTCHA')) return 'recaptcha';
    if (response.includes('Bild') || response.includes('image')) return 'image';
    if (response.includes('Text')) return 'text';
    return 'unknown';
  }

  private fallbackParse(instruction: string): WorkflowStep[] {
    // Einfache Fallback-Heuristik
    const steps: WorkflowStep[] = [];
    
    if (instruction.includes('2captcha.com')) {
      steps.push({ action: 'navigate', url: 'https://2captcha.com' });
    }
    
    if (instruction.includes('einloggen') || instruction.includes('logge')) {
      steps.push({ action: 'fill', selector: 'input[name="email"]', value: '${EMAIL}' });
      steps.push({ action: 'fill', selector: 'input[name="password"]', value: '${PASSWORD}' });
      steps.push({ action: 'click', selector: 'button[type="submit"]' });
    }
    
    if (instruction.includes('Start Work')) {
      steps.push({ action: 'click', selector: 'button:has-text("Start Work")' });
    }
    
    return steps;
  }

  /**
   * Submit CAPTCHA solution to form
   */
  private async submitAnswer(solution: string): Promise<void> {
    console.log(`[SUBMIT] Sende Lösung: ${solution}`);
    
    // Try multiple common selectors
    const selectors = [
      'input[name="captcha"]',
      'input[name="solution"]',
      'input[name="answer"]',
      'textarea[name="captcha"]',
      '.captcha-input input',
      '#captcha-answer'
    ];

    let submitted = false;

    for (const selector of selectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          await this.page.fill(selector, solution);
          submitted = true;
          console.log(`[SUBMIT] ✅ Gelöst mit Selektor: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!submitted) {
      console.log('[SUBMIT] Kein spezifischer Selektor gefunden, versuche Enter zu drücken');
      await this.page.press('body', 'Enter');
    }
  }

  /**
   * Analyze CAPTCHA with OpenCode Vision AI
   */
  private async analyzeWithOpenCode(
    screenshot: Buffer,
    type: CaptchaType
  ): Promise<string> {
    console.log(`[ANALYSIS] Analysiere ${type} CAPTCHA mit OpenCode...`);

    try {
      // Generate context-aware prompt
      const prompt = this.generateAnalysisPrompt(type);

      // Call OpenCode Vision API
      const response = await this.callOpenCode({
        image: screenshot,
        prompt: prompt,
        type: type
      });

      // Extract solution from AI response
      const solution = this.extractSolutionFromResponse(response);
      console.log(`[ANALYSIS] ✅ Lösung extrahiert: ${solution}`);

      return solution;
    } catch (error) {
      console.error('[ANALYSIS] ❌ Fehler bei OpenCode-Analyse:', error);
      throw error;
    }
  }

  /**
   * Generate AI analysis prompt based on CAPTCHA type
   */
  private generateAnalysisPrompt(type: CaptchaType): string {
    switch (type) {
      case 'image':
        return 'Identify all text/numbers in this CAPTCHA image. Only return the text.';
      case 'text':
        return 'Extract the text content from this CAPTCHA. Return ONLY the text without explanation.';
      case 'recaptcha':
        return 'This is a reCAPTCHA. Describe what image tiles need to be clicked. Return ONLY the targets.';
      default:
        return 'Solve this CAPTCHA and return ONLY the solution.';
    }
  }

  /**
   * Extract solution from AI response text
   */
  private extractSolutionFromResponse(response: string): string {
    console.log('[EXTRACT] Extrahiere Lösung aus KI-Antwort...');

    // Clean markdown code blocks
    let cleaned = response.replace(/```[\s\S]*?```/g, '');
    cleaned = cleaned.replace(/`/g, '');

    // Remove quotes
    cleaned = cleaned.replace(/^["']|["']$/g, '');

    // Remove common prefixes
    cleaned = cleaned.replace(/^(The answer is|Solution:|CAPTCHA:)\s*/i, '');

    // Trim whitespace
    cleaned = cleaned.trim();

    console.log(`[EXTRACT] ✅ Bereinigt: "${cleaned}"`);
    return cleaned;
  }

  /**
   * Find alternative selector using AI
   */
  private async findAlternativeSelector(
    originalSelector: string,
    screenshot: Buffer
  ): Promise<string | null> {
    console.log(`[SELECTOR] Suche alternativen Selektor für: ${originalSelector}`);

    try {
      const prompt = `The selector "${originalSelector}" is broken. Looking at this screenshot, suggest an alternative CSS selector or XPath that would select the same element. Return ONLY the selector, nothing else.`;

      const response = await this.callOpenCode({
        image: screenshot,
        prompt: prompt,
        type: 'text'
      });

      const newSelector = this.extractSolutionFromResponse(response);

      // Validate selector by testing it
      try {
        const element = await this.page.$(newSelector);
        if (element) {
          console.log(`[SELECTOR] ✅ Neuer Selektor funktioniert: ${newSelector}`);
          return newSelector;
        }
      } catch {
        console.log(`[SELECTOR] ❌ Neuer Selektor funktioniert nicht: ${newSelector}`);
        return null;
      }
    } catch (error) {
      console.error('[SELECTOR] ❌ Fehler bei Selektor-Suche:', error);
      return null;
    }
  }

  /**
   * Self-healing error recovery orchestration
   */
  private async selfHeal(
    step: WorkflowStep,
    error: Error,
    stepIndex: number
  ): Promise<boolean> {
    console.log(`[SELBSTHEILUNG] Versuche Fehler zu beheben: ${error.message}`);

    // Strategie 1: Warte länger bei timeout
    if (error.message.includes('timeout')) {
      console.log('[SELBSTHEILUNG] Strategie 1: Warte länger...');
      try {
        await this.page.waitForTimeout(5000);
        await this.executeStep(step);
        console.log('[SELBSTHEILUNG] ✅ Strategie 1 erfolgreich');
        return true;
      } catch {
        // Weiter zur nächsten Strategie
      }
    }

    // Strategie 2: Suche alternativen Selektor
    if (error.message.includes('selector')) {
      console.log('[SELBSTHEILUNG] Strategie 2: Suche alternativen Selektor...');
      try {
        const screenshot = await this.page.screenshot() as Buffer;
        const newSelector = await this.findAlternativeSelector(
          step.selector!,
          screenshot
        );

        if (newSelector) {
          step.selector = newSelector;
          await this.executeStep(step);
          
          // Update workflow
          this.currentWorkflow[stepIndex] = step;
          await this.notifyUser({
            type: 'healed',
            step: stepIndex + 1,
            action: step.action,
            error: '',
            suggestion: `Selektor automatisch korrigiert: ${newSelector}`
          });
          
          console.log('[SELBSTHEILUNG] ✅ Strategie 2 erfolgreich');
          return true;
        }
      } catch {
        // Weiter zur nächsten Strategie
      }
    }

    // Strategie 3: Benachrichtige User
    console.log('[SELBSTHEILUNG] Strategie 3: Benachrichtige User...');
    await this.notifyUser({
      type: 'error',
      step: stepIndex + 1,
      action: step.action,
      error: error.message,
      suggestion: 'Bitte überprüfen Sie den Screenshot und versuchen Sie es manuell'
    });

    return false;
  }
}

// Selbstheilungs-Funktion
async function selfHeal(
  this: IntelligentCaptchaWorker,
  step: WorkflowStep,
  error: Error,
  stepIndex: number
): Promise<boolean> {
  console.log('[SELBSTHEILUNG] Versuche Fehler zu beheben...');
  
  // Strategie 1: Warte länger
  if (error.message.includes('timeout')) {
    console.log('[SELBSTHEILUNG] Warte länger...');
    await this.page.waitForTimeout(5000);
    try {
      await this.executeStep(step);
      return true;
    } catch {
      // Weiter zur nächsten Strategie
    }
  }
  
  // Strategie 2: Suche alternativen Selektor mit KI
  if (error.message.includes('selector')) {
    console.log('[SELBSTHEILUNG] Suche alternativen Selektor...');
    const screenshot = await this.page.screenshot();
    
    const newSelector = await this.findAlternativeSelector(
      step.selector!,
      screenshot
    );
    
    if (newSelector) {
      step.selector = newSelector;
      try {
        await this.executeStep(step);
        
        // Workflow aktualisieren!
        this.currentWorkflow[stepIndex] = step;
        await this.notifyUser({
          type: 'healed',
          step: stepIndex + 1,
          action: step.action,
          error: '',
          suggestion: `Selektor automatisch korrigiert: ${newSelector}`
        });
        
        return true;
      } catch {
        // Weiter zur nächsten Strategie
      }
    }
  }
  
  // Strategie 3: Überspringe Schritt wenn möglich
  console.log('[SELBSTHEILUNG] Versuche Schritt zu überspringen...');
  // ...
  
  return false;
}

// Types
interface WorkflowStep {
  action: 'navigate' | 'fill' | 'click' | 'waitFor' | 'solveCaptcha' | 'screenshot';
  url?: string;
  selector?: string;
  value?: string;
}

interface CaptchaInfo {
  element: any;
  type: CaptchaType;
  selector: string;
}

type CaptchaType = 'image' | 'text' | 'recaptcha' | 'unknown';

interface UserNotification {
  type: 'error' | 'healed' | 'success';
  step: number;
  action: string;
  error: string;
  suggestion: string;
}

export default IntelligentCaptchaWorker;
