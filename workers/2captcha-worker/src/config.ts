/**
 * 2CAPTCHA WORKER - CONFIGURATION
 * ================================
 * Configuration and setup for the 2captcha detection worker
 */

export interface DetectorConfig {
  // Timeout configuration
  defaultTimeoutMs: number; // Default timeout (120s for 2captcha)
  minTimeoutMs: number; // Minimum allowed timeout
  maxTimeoutMs: number; // Maximum allowed timeout

  // Detection configuration
  maxDetectionAttempts: number; // Max retries before giving up
  waitBetweenAttemptsMs: number; // Base wait between attempts
  adaptiveWaitEnabled: boolean; // Reduce wait on each iteration

  // Warning thresholds
  timeoutWarningThresholdMs: number; // Warn when this much time remains
  detectionSlowThresholdMs: number; // Warn if detection takes too long

  // Screenshot configuration
  captureScreenshots: boolean; // Enable screenshot capture
  includeBase64: boolean; // Include base64 in response
  screenshotQuality: 'low' | 'medium' | 'high'; // PNG quality

  // Selector overrides
  customSelectors?: Record<string, string[]>; // Custom CSS selectors per CAPTCHA type

  // Logging
  verboseLogging: boolean; // Enable detailed logs
  logToFile?: string; // Optional file path for logs
}

/**
 * Default configuration for 2captcha.com
 */
export const DEFAULT_CONFIG: DetectorConfig = {
  defaultTimeoutMs: 120000, // 2 minutes (2captcha standard)
  minTimeoutMs: 30000, // Minimum 30 seconds
  maxTimeoutMs: 300000, // Maximum 5 minutes

  maxDetectionAttempts: 10,
  waitBetweenAttemptsMs: 500,
  adaptiveWaitEnabled: true,

  timeoutWarningThresholdMs: 10000, // Warn at 10s remaining
  detectionSlowThresholdMs: 5000, // Warn if detection > 5s

  captureScreenshots: true,
  includeBase64: true,
  screenshotQuality: 'high',

  verboseLogging: true,
};

/**
 * Configuration for fast detection (minimal overhead)
 */
export const FAST_CONFIG: DetectorConfig = {
  defaultTimeoutMs: 60000, // 1 minute
  minTimeoutMs: 30000,
  maxTimeoutMs: 120000,

  maxDetectionAttempts: 5,
  waitBetweenAttemptsMs: 200,
  adaptiveWaitEnabled: true,

  timeoutWarningThresholdMs: 5000,
  detectionSlowThresholdMs: 2000,

  captureScreenshots: true,
  includeBase64: false, // Skip base64 for speed
  screenshotQuality: 'low',

  verboseLogging: false,
};

/**
 * Configuration for detailed analysis (maximum information)
 */
export const DETAILED_CONFIG: DetectorConfig = {
  defaultTimeoutMs: 180000, // 3 minutes
  minTimeoutMs: 60000,
  maxTimeoutMs: 600000, // 10 minutes

  maxDetectionAttempts: 20,
  waitBetweenAttemptsMs: 1000,
  adaptiveWaitEnabled: false,

  timeoutWarningThresholdMs: 20000,
  detectionSlowThresholdMs: 10000,

  captureScreenshots: true,
  includeBase64: true,
  screenshotQuality: 'high',

  verboseLogging: true,
  logToFile: '/var/log/2captcha-worker/detector.log',
};

/**
 * Custom selectors for different CAPTCHA variants
 */
export const CUSTOM_SELECTORS = {
  imageCaptchaSelectors: [
    'img[src*="captcha"]',
    '.captcha__image',
    'img.captcha-image',
    '[class*="captcha"] img',
    'img[alt*="captcha" i]',
    'canvas[class*="captcha"]',
  ],

  inputSelectors: [
    'input[name="answer"]',
    'input[name="captcha"]',
    'input[placeholder*="answer" i]',
    'input[placeholder*="code" i]',
    'input[type="text"][class*="captcha"]',
    'textarea[class*="captcha"]',
  ],

  submitButtonSelectors: [
    'button[type="submit"]',
    '.submit-button',
    'button:has-text("Submit")',
    'button:has-text("Verify")',
    'button:has-text("Continue")',
    'button[class*="submit"]',
    'input[type="submit"]',
  ],

  cannotSolveSelectors: [
    'button:has-text("Cannot Solve")',
    'button:has-text("Can\'t Solve")',
    '.cant-solve-button',
  ],

  containerSelectors: [
    '.captcha-container',
    '[class*="captcha"][class*="box"]',
    '[class*="captcha"][class*="wrapper"]',
    'form[class*="captcha"]',
    '[role="dialog"][class*="captcha"]',
  ],
};

/**
 * Environment variables configuration
 */
export interface EnvironmentConfig {
  CAPTCHA_WORKER_PORT?: number;
  CAPTCHA_WORKER_HOST?: string;
  CAPTCHA_TIMEOUT_MS?: number;
  CAPTCHA_CONFIG?: 'default' | 'fast' | 'detailed';
  CAPTCHA_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  PLAYWRIGHT_HEADLESS?: boolean;
}

/**
 * Load configuration from environment
 */
export function loadConfigFromEnv(): Partial<DetectorConfig> {
  const env = process.env as unknown as EnvironmentConfig;

  const configName = env.CAPTCHA_CONFIG || 'default';
  let baseConfig = DEFAULT_CONFIG;

  if (configName === 'fast') {
    baseConfig = FAST_CONFIG;
  } else if (configName === 'detailed') {
    baseConfig = DETAILED_CONFIG;
  }

  return {
    defaultTimeoutMs: env.CAPTCHA_TIMEOUT_MS || baseConfig.defaultTimeoutMs,
    verboseLogging: env.CAPTCHA_LOG_LEVEL === 'debug' || baseConfig.verboseLogging,
  };
}

/**
 * Merge configs (override defaults with custom)
 */
export function mergeConfigs(
  defaultConfig: DetectorConfig,
  overrides?: Partial<DetectorConfig>
): DetectorConfig {
  return {
    ...defaultConfig,
    ...overrides,
  };
}
