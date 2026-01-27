import {
  IBrowserConfig,
  IPageState,
  IDOMElement,
  IClickResult,
  ICaptchaElement,
  IFormElement,
  ICookie,
  IBrowserSession
} from './types';

const DEFAULT_CONFIG: IBrowserConfig = {
  steelEndpoint: 'http://172.20.0.20:3000',
  skyvernEndpoint: 'http://172.20.0.30:8000',
  stagehandEndpoint: 'http://172.20.0.7:3000',
  timeout: 30000,
  headless: true
};

export class SteelBrowserClient {
  private config: IBrowserConfig;
  private session: IBrowserSession | null = null;
  private pageState: IPageState | null = null;

  constructor(config: Partial<IBrowserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async connect(): Promise<IBrowserSession> {
    const response = await fetch(`${this.config.steelEndpoint}/session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        headless: this.config.headless,
        proxy: this.config.proxy,
        fingerprint: this.config.fingerprint,
        timeout: this.config.timeout
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Steel connection failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { sessionId: string };
    
    this.session = {
      id: data.sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      pageState: {
        url: '',
        title: '',
        html: '',
        elements: [],
        forms: [],
        captchas: [],
        cookies: [],
        timestamp: Date.now()
      },
      cookies: []
    };

    return this.session;
  }

  async navigate(url: string): Promise<IPageState> {
    this.ensureSession();

    const response = await fetch(`${this.config.steelEndpoint}/page/navigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.session!.id,
        url,
        waitUntil: 'networkidle'
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Navigation failed: ${response.status}`);
    }

    const data = await response.json() as {
      url: string;
      title: string;
      html: string;
      elements?: unknown[];
      forms?: unknown[];
      cookies?: ICookie[];
    };
    
    this.pageState = {
      url: data.url,
      title: data.title,
      html: data.html,
      elements: this.parseElements(data.elements || []),
      forms: this.parseForms(data.forms || []),
      captchas: this.detectCaptchas(data.html, data.elements || []),
      cookies: data.cookies || [],
      timestamp: Date.now()
    };

    this.session!.lastActivity = Date.now();
    this.session!.pageState = this.pageState;

    return this.pageState;
  }

  async click(selector: string): Promise<IClickResult> {
    this.ensureSession();
    const startTime = Date.now();

    const response = await fetch(`${this.config.steelEndpoint}/page/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.session!.id,
        selector,
        waitForNavigation: true
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    const completedTime = Date.now();

    if (!response.ok) {
      return {
        success: false,
        element: this.createEmptyElement(selector),
        stateChange: false,
        error: `Click failed: ${response.status}`,
        timing: {
          started: startTime,
          completed: completedTime,
          duration: completedTime - startTime
        }
      };
    }

    const data = await response.json() as { element?: IDOMElement };
    const newPageState = await this.getPageState();

    return {
      success: true,
      element: data.element || this.createEmptyElement(selector),
      stateChange: this.pageState?.url !== newPageState.url,
      newUrl: newPageState.url,
      timing: {
        started: startTime,
        completed: completedTime,
        duration: completedTime - startTime
      }
    };
  }

  async type(selector: string, text: string): Promise<boolean> {
    this.ensureSession();

    const response = await fetch(`${this.config.steelEndpoint}/page/type`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.session!.id,
        selector,
        text,
        delay: 50
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    return response.ok;
  }

  async screenshot(): Promise<Buffer> {
    this.ensureSession();

    const response = await fetch(`${this.config.steelEndpoint}/page/screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.session!.id,
        fullPage: false,
        format: 'png'
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Screenshot failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getPageState(): Promise<IPageState> {
    this.ensureSession();

    const response = await fetch(`${this.config.steelEndpoint}/page/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.session!.id }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Get state failed: ${response.status}`);
    }

    const data = await response.json() as {
      url: string;
      title: string;
      html: string;
      elements?: unknown[];
      forms?: unknown[];
      cookies?: ICookie[];
    };
    
    this.pageState = {
      url: data.url,
      title: data.title,
      html: data.html,
      elements: this.parseElements(data.elements || []),
      forms: this.parseForms(data.forms || []),
      captchas: this.detectCaptchas(data.html, data.elements || []),
      cookies: data.cookies || [],
      timestamp: Date.now()
    };

    return this.pageState;
  }

  async evaluate<T>(script: string): Promise<T> {
    this.ensureSession();

    const response = await fetch(`${this.config.steelEndpoint}/page/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.session!.id,
        script
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Evaluate failed: ${response.status}`);
    }

    const data = await response.json() as { result: T };
    return data.result;
  }

  async waitForSelector(selector: string, timeout?: number): Promise<IDOMElement | null> {
    this.ensureSession();

    const response = await fetch(`${this.config.steelEndpoint}/page/waitForSelector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.session!.id,
        selector,
        timeout: timeout || this.config.timeout
      }),
      signal: AbortSignal.timeout(timeout || this.config.timeout)
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { element?: IDOMElement };
    return data.element || null;
  }

  async close(): Promise<void> {
    if (!this.session) return;

    try {
      await fetch(`${this.config.steelEndpoint}/session/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.session.id }),
        signal: AbortSignal.timeout(5000)
      });
    } catch {
      // Ignore close errors
    }

    this.session = null;
    this.pageState = null;
  }

  getSession(): IBrowserSession | null {
    return this.session;
  }

  getCaptchas(): ICaptchaElement[] {
    return this.pageState?.captchas || [];
  }

  getForms(): IFormElement[] {
    return this.pageState?.forms || [];
  }

  private ensureSession(): void {
    if (!this.session) {
      throw new Error('No active session. Call connect() first.');
    }
  }

  private parseElements(elements: unknown[]): IDOMElement[] {
    return (elements as Record<string, unknown>[]).map(el => ({
      selector: String(el.selector || ''),
      tagName: String(el.tagName || ''),
      id: el.id ? String(el.id) : undefined,
      className: el.className ? String(el.className) : undefined,
      textContent: el.textContent ? String(el.textContent) : undefined,
      attributes: (el.attributes || {}) as Record<string, string>,
      boundingBox: el.boundingBox as { x: number; y: number; width: number; height: number } || { x: 0, y: 0, width: 0, height: 0 },
      isVisible: Boolean(el.isVisible),
      isClickable: Boolean(el.isClickable),
      isCaptcha: this.elementIsCaptcha(el),
      isHoneypot: this.elementIsHoneypot(el)
    }));
  }

  private parseForms(forms: unknown[]): IFormElement[] {
    return (forms as Record<string, unknown>[]).map(form => ({
      selector: String(form.selector || ''),
      action: String(form.action || ''),
      method: String(form.method || 'GET'),
      inputs: (form.inputs as unknown[] || []).map((input: unknown) => {
        const inp = input as Record<string, unknown>;
        return {
          selector: String(inp.selector || ''),
          type: String(inp.type || 'text'),
          name: String(inp.name || ''),
          id: inp.id ? String(inp.id) : undefined,
          placeholder: inp.placeholder ? String(inp.placeholder) : undefined,
          required: Boolean(inp.required),
          isHidden: Boolean(inp.isHidden),
          isHoneypot: this.inputIsHoneypot(inp)
        };
      }),
      hasHoneypot: false,
      hasCaptcha: false
    }));
  }

  private detectCaptchas(html: string, elements: unknown[]): ICaptchaElement[] {
    const captchas: ICaptchaElement[] = [];
    const htmlLower = html.toLowerCase();

    // reCAPTCHA v2/v3
    if (htmlLower.includes('recaptcha') || htmlLower.includes('g-recaptcha')) {
      const siteKeyMatch = html.match(/data-sitekey=["']([^"']+)["']/);
      captchas.push({
        type: htmlLower.includes('recaptcha/api.js?render=') ? 'recaptcha-v3' : 'recaptcha-v2',
        selector: '.g-recaptcha, [data-sitekey]',
        siteKey: siteKeyMatch ? siteKeyMatch[1] : undefined,
        boundingBox: { x: 0, y: 0, width: 300, height: 74 }
      });
    }

    // hCaptcha
    if (htmlLower.includes('hcaptcha') || htmlLower.includes('h-captcha')) {
      const siteKeyMatch = html.match(/data-sitekey=["']([^"']+)["']/);
      captchas.push({
        type: 'hcaptcha',
        selector: '.h-captcha, [data-sitekey]',
        siteKey: siteKeyMatch ? siteKeyMatch[1] : undefined,
        boundingBox: { x: 0, y: 0, width: 300, height: 74 }
      });
    }

    // Cloudflare Turnstile
    if (htmlLower.includes('turnstile') || htmlLower.includes('cf-turnstile')) {
      const siteKeyMatch = html.match(/data-sitekey=["']([^"']+)["']/);
      captchas.push({
        type: 'cloudflare-turnstile',
        selector: '.cf-turnstile, [data-sitekey]',
        siteKey: siteKeyMatch ? siteKeyMatch[1] : undefined,
        boundingBox: { x: 0, y: 0, width: 300, height: 65 }
      });
    }

    // Image CAPTCHA
    const imgCaptchaPatterns = /captcha.*?img|img.*?captcha/gi;
    if (imgCaptchaPatterns.test(html)) {
      const imgMatch = html.match(/<img[^>]+captcha[^>]*src=["']([^"']+)["']/i);
      captchas.push({
        type: 'image',
        selector: 'img[src*="captcha"]',
        imageUrl: imgMatch ? imgMatch[1] : undefined,
        boundingBox: { x: 0, y: 0, width: 200, height: 50 }
      });
    }

    return captchas;
  }

  private elementIsCaptcha(el: Record<string, unknown>): boolean {
    const className = String(el.className || '').toLowerCase();
    const id = String(el.id || '').toLowerCase();
    return className.includes('captcha') || 
           className.includes('recaptcha') ||
           className.includes('hcaptcha') ||
           id.includes('captcha');
  }

  private elementIsHoneypot(el: Record<string, unknown>): boolean {
    const className = String(el.className || '').toLowerCase();
    const style = String(el.style || '').toLowerCase();
    const attrs = el.attributes as Record<string, string> || {};
    
    return className.includes('honeypot') ||
           className.includes('trap') ||
           style.includes('display: none') ||
           style.includes('opacity: 0') ||
           style.includes('position: absolute') && style.includes('left: -9999') ||
           attrs['aria-hidden'] === 'true' ||
           attrs['tabindex'] === '-1';
  }

  private inputIsHoneypot(inp: Record<string, unknown>): boolean {
    const name = String(inp.name || '').toLowerCase();
    const type = String(inp.type || '');
    const style = String(inp.style || '').toLowerCase();

    const honeypotNames = ['honeypot', 'hp', 'trap', 'website', 'url', 'phone2', 'fax'];
    
    return honeypotNames.some(n => name.includes(n)) ||
           type === 'hidden' && !name.includes('csrf') && !name.includes('token') ||
           style.includes('display: none') ||
           style.includes('opacity: 0');
  }

  private createEmptyElement(selector: string): IDOMElement {
    return {
      selector,
      tagName: 'unknown',
      attributes: {},
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      isVisible: false,
      isClickable: false,
      isCaptcha: false,
      isHoneypot: false
    };
  }
}

export function createSteelClient(config?: Partial<IBrowserConfig>): SteelBrowserClient {
  return new SteelBrowserClient(config);
}
