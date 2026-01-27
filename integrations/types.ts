/**
 * SIN-Solver Browser Integration Types
 * 
 * Defines interfaces for browser integration with the 17-Room Empire:
 * - Room 05: Steel Stealth (Browser Engine)
 * - Room 06: Skyvern (AI Navigator)
 * - Room 07: Stagehand (DOM Detective)
 */

/**
 * Browser connection configuration
 */
export interface IBrowserConfig {
  /** Steel browser endpoint (Room 05) */
  steelEndpoint: string;
  /** Skyvern API endpoint (Room 06) */
  skyvernEndpoint: string;
  /** Stagehand endpoint (Room 07) */
  stagehandEndpoint: string;
  /** Connection timeout in milliseconds */
  timeout: number;
  /** Enable headless mode */
  headless: boolean;
  /** Proxy configuration */
  proxy?: IProxyConfig;
  /** Browser fingerprint settings */
  fingerprint?: IFingerprintConfig;
}

/**
 * Proxy configuration for stealth browsing
 */
export interface IProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: 'http' | 'https' | 'socks4' | 'socks5';
}

/**
 * Browser fingerprint configuration
 */
export interface IFingerprintConfig {
  userAgent?: string;
  viewport?: { width: number; height: number };
  locale?: string;
  timezone?: string;
  webgl?: boolean;
  canvas?: boolean;
}

/**
 * DOM element representation
 */
export interface IDOMElement {
  selector: string;
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  attributes: Record<string, string>;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isVisible: boolean;
  isClickable: boolean;
  isCaptcha: boolean;
  isHoneypot: boolean;
}

/**
 * Page state snapshot
 */
export interface IPageState {
  url: string;
  title: string;
  html: string;
  screenshot?: Buffer;
  elements: IDOMElement[];
  forms: IFormElement[];
  captchas: ICaptchaElement[];
  cookies: ICookie[];
  timestamp: number;
}

/**
 * Form element with inputs
 */
export interface IFormElement {
  selector: string;
  action: string;
  method: string;
  inputs: IInputElement[];
  hasHoneypot: boolean;
  hasCaptcha: boolean;
}

/**
 * Input element
 */
export interface IInputElement {
  selector: string;
  type: string;
  name: string;
  id?: string;
  placeholder?: string;
  required: boolean;
  isHidden: boolean;
  isHoneypot: boolean;
}

/**
 * CAPTCHA element detection
 */
export interface ICaptchaElement {
  type: 'recaptcha-v2' | 'recaptcha-v3' | 'hcaptcha' | 'cloudflare-turnstile' | 'image' | 'audio' | 'text' | 'unknown';
  selector: string;
  siteKey?: string;
  iframeUrl?: string;
  imageUrl?: string;
  audioUrl?: string;
  challenge?: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Cookie
 */
export interface ICookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Click action result
 */
export interface IClickResult {
  success: boolean;
  element: IDOMElement;
  stateChange: boolean;
  newUrl?: string;
  error?: string;
  screenshot?: Buffer;
  timing: {
    started: number;
    completed: number;
    duration: number;
  };
}

/**
 * CAPTCHA solve result
 */
export interface ICaptchaSolveResult {
  success: boolean;
  captchaType: ICaptchaElement['type'];
  solution?: string;
  token?: string;
  confidence: number;
  method: 'vision' | 'audio' | 'ml' | 'pattern';
  timing: {
    started: number;
    completed: number;
    duration: number;
  };
  error?: string;
}

/**
 * Skyvern task request
 */
export interface ISkyvernTask {
  url: string;
  goal: string;
  navigation_payload?: Record<string, unknown>;
  extracted_information_schema?: Record<string, unknown>;
  max_steps?: number;
  timeout?: number;
}

/**
 * Skyvern task result
 */
export interface ISkyvernResult {
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  extracted_information?: Record<string, unknown>;
  screenshots?: string[];
  actions_taken: Array<{
    action: string;
    element?: string;
    timestamp: number;
  }>;
  error?: string;
}

/**
 * Stagehand detection request
 */
export interface IStagehandRequest {
  url: string;
  selectors?: string[];
  detectCaptcha: boolean;
  detectHoneypot: boolean;
  detectForms: boolean;
  screenshot: boolean;
}

/**
 * Stagehand detection result
 */
export interface IStagehandResult {
  elements: IDOMElement[];
  forms: IFormElement[];
  captchas: ICaptchaElement[];
  honeypots: IDOMElement[];
  screenshot?: Buffer;
  analysisTime: number;
}

/**
 * Browser session
 */
export interface IBrowserSession {
  id: string;
  createdAt: number;
  lastActivity: number;
  pageState: IPageState;
  cookies: ICookie[];
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
}

/**
 * Vision analysis request (for SiliconFlow Qwen2.5-VL)
 */
export interface IVisionAnalysisRequest {
  image: Buffer | string;
  prompt: string;
  maxTokens?: number;
}

/**
 * Vision analysis result
 */
export interface IVisionAnalysisResult {
  text: string;
  confidence: number;
  captchaSolution?: string;
  elements?: Array<{
    type: string;
    location: { x: number; y: number; width: number; height: number };
    text?: string;
  }>;
}
