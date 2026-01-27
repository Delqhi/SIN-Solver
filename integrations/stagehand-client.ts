import {
  IBrowserConfig,
  IDOMElement,
  IFormElement,
  ICaptchaElement,
  IStagehandRequest,
  IStagehandResult,
  IInputElement
} from './types';

const DEFAULT_CONFIG: Pick<IBrowserConfig, 'stagehandEndpoint' | 'timeout'> = {
  stagehandEndpoint: 'http://172.20.0.7:3000',
  timeout: 30000
};

interface HoneypotIndicator {
  element: IDOMElement;
  reason: string;
  confidence: number;
}

export class StagehandClient {
  private endpoint: string;
  private timeout: number;

  constructor(config: Partial<Pick<IBrowserConfig, 'stagehandEndpoint' | 'timeout'>> = {}) {
    const merged = { ...DEFAULT_CONFIG, ...config };
    this.endpoint = merged.stagehandEndpoint;
    this.timeout = merged.timeout;
  }

  async analyze(request: IStagehandRequest): Promise<IStagehandResult> {
    const startTime = Date.now();

    const response = await fetch(`${this.endpoint}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: request.url,
        selectors: request.selectors,
        options: {
          detectCaptcha: request.detectCaptcha,
          detectHoneypot: request.detectHoneypot,
          detectForms: request.detectForms,
          screenshot: request.screenshot
        }
      }),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`Stagehand analysis failed: ${response.status}`);
    }

    interface AnalyzeResponse {
      elements?: unknown[];
      forms?: unknown[];
      captchas?: unknown[];
      honeypots?: unknown[];
      screenshot?: string;
    }

    const data = await response.json() as AnalyzeResponse;
    const analysisTime = Date.now() - startTime;

    return {
      elements: this.parseElements(data.elements || []),
      forms: this.parseForms(data.forms || []),
      captchas: this.parseCaptchas(data.captchas || []),
      honeypots: this.parseHoneypots(data.honeypots || data.elements || []),
      screenshot: data.screenshot ? Buffer.from(data.screenshot, 'base64') : undefined,
      analysisTime
    };
  }

  async detectCaptchas(url: string): Promise<ICaptchaElement[]> {
    const result = await this.analyze({
      url,
      detectCaptcha: true,
      detectHoneypot: false,
      detectForms: false,
      screenshot: false
    });

    return result.captchas;
  }

  async detectHoneypots(url: string): Promise<IDOMElement[]> {
    const result = await this.analyze({
      url,
      detectCaptcha: false,
      detectHoneypot: true,
      detectForms: true,
      screenshot: false
    });

    return result.honeypots;
  }

  async detectForms(url: string): Promise<IFormElement[]> {
    const result = await this.analyze({
      url,
      detectCaptcha: true,
      detectHoneypot: true,
      detectForms: true,
      screenshot: false
    });

    return result.forms.map(form => ({
      ...form,
      hasHoneypot: form.inputs.some(i => i.isHoneypot),
      hasCaptcha: result.captchas.length > 0
    }));
  }

  async getElements(url: string, selectors: string[]): Promise<IDOMElement[]> {
    const result = await this.analyze({
      url,
      selectors,
      detectCaptcha: false,
      detectHoneypot: false,
      detectForms: false,
      screenshot: false
    });

    return result.elements;
  }

  async getPageScreenshot(url: string): Promise<Buffer> {
    const response = await fetch(`${this.endpoint}/api/screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`Screenshot failed: ${response.status}`);
    }

    const data = await response.json() as { screenshot: string };
    return Buffer.from(data.screenshot, 'base64');
  }

  async evaluateElement(url: string, selector: string): Promise<IDOMElement | null> {
    const response = await fetch(`${this.endpoint}/api/element`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, selector }),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { element?: Record<string, unknown> };
    if (!data.element) {
      return null;
    }

    return this.parseElement(data.element);
  }

  async findHoneypotIndicators(url: string): Promise<HoneypotIndicator[]> {
    const result = await this.analyze({
      url,
      detectCaptcha: false,
      detectHoneypot: true,
      detectForms: true,
      screenshot: false
    });

    const indicators: HoneypotIndicator[] = [];

    for (const element of result.elements) {
      const reasons = this.getHoneypotReasons(element);
      if (reasons.length > 0) {
        indicators.push({
          element,
          reason: reasons.join('; '),
          confidence: this.calculateHoneypotConfidence(element, reasons)
        });
      }
    }

    for (const form of result.forms) {
      for (const input of form.inputs) {
        if (input.isHoneypot) {
          const element = this.inputToElement(input);
          indicators.push({
            element,
            reason: this.getInputHoneypotReason(input),
            confidence: 0.9
          });
        }
      }
    }

    return indicators.sort((a, b) => b.confidence - a.confidence);
  }

  async getCaptchaDetails(url: string): Promise<{
    captchas: ICaptchaElement[];
    siteKeys: string[];
    iframeUrls: string[];
  }> {
    const captchas = await this.detectCaptchas(url);
    
    const siteKeys = captchas
      .map(c => c.siteKey)
      .filter((key): key is string => key !== undefined);

    const iframeUrls = captchas
      .map(c => c.iframeUrl)
      .filter((url): url is string => url !== undefined);

    return { captchas, siteKeys, iframeUrls };
  }

  async fullPageAnalysis(url: string): Promise<{
    elements: IDOMElement[];
    forms: IFormElement[];
    captchas: ICaptchaElement[];
    honeypots: IDOMElement[];
    screenshot: Buffer | undefined;
    stats: {
      totalElements: number;
      visibleElements: number;
      clickableElements: number;
      formCount: number;
      captchaCount: number;
      honeypotCount: number;
      analysisTime: number;
    };
  }> {
    const result = await this.analyze({
      url,
      detectCaptcha: true,
      detectHoneypot: true,
      detectForms: true,
      screenshot: true
    });

    return {
      elements: result.elements,
      forms: result.forms,
      captchas: result.captchas,
      honeypots: result.honeypots,
      screenshot: result.screenshot,
      stats: {
        totalElements: result.elements.length,
        visibleElements: result.elements.filter(e => e.isVisible).length,
        clickableElements: result.elements.filter(e => e.isClickable).length,
        formCount: result.forms.length,
        captchaCount: result.captchas.length,
        honeypotCount: result.honeypots.length,
        analysisTime: result.analysisTime
      }
    };
  }

  async waitForElement(
    url: string,
    selector: string,
    timeout: number = 10000
  ): Promise<IDOMElement | null> {
    const startTime = Date.now();
    const pollInterval = 500;

    while (Date.now() - startTime < timeout) {
      const element = await this.evaluateElement(url, selector);
      if (element && element.isVisible) {
        return element;
      }
      await this.sleep(pollInterval);
    }

    return null;
  }

  private parseElements(elements: unknown[]): IDOMElement[] {
    return (elements as Record<string, unknown>[]).map(el => this.parseElement(el));
  }

  private parseElement(el: Record<string, unknown>): IDOMElement {
    const className = String(el.className || '').toLowerCase();
    const id = String(el.id || '').toLowerCase();
    const style = String(el.style || '').toLowerCase();

    return {
      selector: String(el.selector || ''),
      tagName: String(el.tagName || ''),
      id: el.id ? String(el.id) : undefined,
      className: el.className ? String(el.className) : undefined,
      textContent: el.textContent ? String(el.textContent) : undefined,
      attributes: (el.attributes || {}) as Record<string, string>,
      boundingBox: (el.boundingBox as { x: number; y: number; width: number; height: number }) || 
                   { x: 0, y: 0, width: 0, height: 0 },
      isVisible: Boolean(el.isVisible),
      isClickable: Boolean(el.isClickable),
      isCaptcha: this.isCaptchaElement(className, id),
      isHoneypot: this.isHoneypotElement(el, className, id, style)
    };
  }

  private parseForms(forms: unknown[]): IFormElement[] {
    return (forms as Record<string, unknown>[]).map(form => ({
      selector: String(form.selector || ''),
      action: String(form.action || ''),
      method: String(form.method || 'GET'),
      inputs: this.parseInputs(form.inputs as unknown[]),
      hasHoneypot: false,
      hasCaptcha: false
    }));
  }

  private parseInputs(inputs: unknown[]): IInputElement[] {
    if (!inputs) return [];

    return (inputs as Record<string, unknown>[]).map(inp => {
      const name = String(inp.name || '').toLowerCase();
      const type = String(inp.type || 'text');
      const style = String(inp.style || '').toLowerCase();

      return {
        selector: String(inp.selector || ''),
        type,
        name: String(inp.name || ''),
        id: inp.id ? String(inp.id) : undefined,
        placeholder: inp.placeholder ? String(inp.placeholder) : undefined,
        required: Boolean(inp.required),
        isHidden: Boolean(inp.isHidden) || type === 'hidden',
        isHoneypot: this.isHoneypotInput(name, type, style, inp)
      };
    });
  }

  private parseCaptchas(captchas: unknown[]): ICaptchaElement[] {
    return (captchas as Record<string, unknown>[]).map(cap => ({
      type: this.mapCaptchaType(String(cap.type || 'unknown')),
      selector: String(cap.selector || ''),
      siteKey: cap.siteKey ? String(cap.siteKey) : undefined,
      iframeUrl: cap.iframeUrl ? String(cap.iframeUrl) : undefined,
      imageUrl: cap.imageUrl ? String(cap.imageUrl) : undefined,
      audioUrl: cap.audioUrl ? String(cap.audioUrl) : undefined,
      challenge: cap.challenge ? String(cap.challenge) : undefined,
      boundingBox: (cap.boundingBox as { x: number; y: number; width: number; height: number }) ||
                   { x: 0, y: 0, width: 300, height: 74 }
    }));
  }

  private parseHoneypots(elements: unknown[]): IDOMElement[] {
    const parsed = this.parseElements(elements);
    return parsed.filter(el => el.isHoneypot);
  }

  private isCaptchaElement(className: string, id: string): boolean {
    const captchaPatterns = ['captcha', 'recaptcha', 'hcaptcha', 'turnstile', 'cf-challenge'];
    return captchaPatterns.some(pattern => 
      className.includes(pattern) || id.includes(pattern)
    );
  }

  private isHoneypotElement(
    el: Record<string, unknown>,
    className: string,
    id: string,
    style: string
  ): boolean {
    const honeypotPatterns = ['honeypot', 'hp-', 'trap', 'ohnohoney', 'pot'];
    const hasHoneypotClass = honeypotPatterns.some(p => className.includes(p) || id.includes(p));

    const isHiddenByStyle = style.includes('display: none') ||
                           style.includes('display:none') ||
                           style.includes('visibility: hidden') ||
                           style.includes('visibility:hidden') ||
                           style.includes('opacity: 0') ||
                           style.includes('opacity:0');

    const isOffScreen = style.includes('left: -9999') ||
                        style.includes('left:-9999') ||
                        style.includes('top: -9999') ||
                        style.includes('top:-9999') ||
                        style.includes('position: absolute') && 
                        (style.includes('left: -') || style.includes('top: -'));

    const attrs = (el.attributes || {}) as Record<string, string>;
    const hasHiddenAttrs = attrs['aria-hidden'] === 'true' ||
                          attrs['tabindex'] === '-1' ||
                          attrs['autocomplete'] === 'off';

    const box = el.boundingBox as { width: number; height: number } | undefined;
    const hasZeroSize = box && (box.width === 0 || box.height === 0);

    return hasHoneypotClass || isHiddenByStyle || isOffScreen || 
           (hasHiddenAttrs && !el.isVisible) || hasZeroSize === true;
  }

  private isHoneypotInput(
    name: string,
    type: string,
    style: string,
    inp: Record<string, unknown>
  ): boolean {
    const honeypotNames = [
      'honeypot', 'hp', 'trap', 'ohnohoney', 'pot',
      'website', 'url', 'phone2', 'fax', 'company2',
      'address2', 'zip2', 'contact_me_by_fax_only'
    ];

    const hasHoneypotName = honeypotNames.some(n => name.includes(n));

    const isHiddenNonCritical = type === 'hidden' && 
                                !name.includes('csrf') && 
                                !name.includes('token') &&
                                !name.includes('_method') &&
                                !name.includes('authenticity');

    const isHiddenByStyle = style.includes('display: none') ||
                           style.includes('opacity: 0') ||
                           style.includes('visibility: hidden');

    const attrs = (inp.attributes || {}) as Record<string, string>;
    const hasHiddenAttrs = attrs['tabindex'] === '-1' && 
                          attrs['autocomplete'] === 'off';

    return hasHoneypotName || isHiddenNonCritical || isHiddenByStyle || hasHiddenAttrs;
  }

  private getHoneypotReasons(element: IDOMElement): string[] {
    const reasons: string[] = [];
    const className = (element.className || '').toLowerCase();
    const id = (element.id || '').toLowerCase();

    if (className.includes('honeypot') || id.includes('honeypot')) {
      reasons.push('Explicit honeypot class/id');
    }

    if (!element.isVisible) {
      reasons.push('Element not visible');
    }

    if (element.boundingBox.width === 0 || element.boundingBox.height === 0) {
      reasons.push('Zero dimensions');
    }

    const attrs = element.attributes;
    if (attrs['aria-hidden'] === 'true') {
      reasons.push('aria-hidden=true');
    }
    if (attrs['tabindex'] === '-1') {
      reasons.push('tabindex=-1');
    }

    return reasons;
  }

  private calculateHoneypotConfidence(element: IDOMElement, reasons: string[]): number {
    let confidence = 0;

    if (reasons.includes('Explicit honeypot class/id')) confidence += 0.5;
    if (reasons.includes('Element not visible')) confidence += 0.2;
    if (reasons.includes('Zero dimensions')) confidence += 0.3;
    if (reasons.includes('aria-hidden=true')) confidence += 0.15;
    if (reasons.includes('tabindex=-1')) confidence += 0.1;

    return Math.min(confidence, 1);
  }

  private inputToElement(input: IInputElement): IDOMElement {
    return {
      selector: input.selector,
      tagName: 'input',
      id: input.id,
      attributes: {
        type: input.type,
        name: input.name,
        placeholder: input.placeholder || ''
      },
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      isVisible: !input.isHidden,
      isClickable: !input.isHidden,
      isCaptcha: false,
      isHoneypot: true
    };
  }

  private getInputHoneypotReason(input: IInputElement): string {
    const reasons: string[] = [];
    const name = input.name.toLowerCase();

    if (name.includes('honeypot') || name.includes('trap')) {
      reasons.push('Explicit honeypot name');
    }
    if (input.isHidden) {
      reasons.push('Hidden input');
    }
    if (['website', 'url', 'fax', 'phone2'].some(n => name.includes(n))) {
      reasons.push('Common honeypot field name');
    }

    return reasons.join('; ') || 'Detected as honeypot';
  }

  private mapCaptchaType(type: string): ICaptchaElement['type'] {
    const typeMap: Record<string, ICaptchaElement['type']> = {
      'recaptcha-v2': 'recaptcha-v2',
      'recaptcha_v2': 'recaptcha-v2',
      'recaptcha-v3': 'recaptcha-v3',
      'recaptcha_v3': 'recaptcha-v3',
      'hcaptcha': 'hcaptcha',
      'turnstile': 'cloudflare-turnstile',
      'cloudflare': 'cloudflare-turnstile',
      'image': 'image',
      'audio': 'audio',
      'text': 'text'
    };

    return typeMap[type.toLowerCase()] || 'unknown';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createStagehandClient(
  config?: Partial<Pick<IBrowserConfig, 'stagehandEndpoint' | 'timeout'>>
): StagehandClient {
  return new StagehandClient(config);
}
