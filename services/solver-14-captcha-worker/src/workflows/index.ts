/**
 * SIN-Solver Captcha Worker - Workflow Exports
 * 
 * This module exports all provider-specific CAPTCHA solving workflows.
 * Each workflow is tailored to a specific CAPTCHA work platform.
 * 
 * IMPORTANT: We are the WORKER, not the service provider!
 * These workflows automate logging into captcha work sites and solving
 * captchas on their platform to earn money.
 * 
 * @module workflows
 */

// Import for use in factory function
import { TwoCaptchaWorker } from './2captcha-worker';

// 2captcha.com - Most popular CAPTCHA work platform
export { TwoCaptchaWorker } from './2captcha-worker';

// Future workflows (to be implemented):
// export { KolotibabloWorker } from './kolotibablo-worker';
// export { AntiCaptchaWorker } from './anti-captcha-worker';
// export { CaptchaGuruWorker } from './captcha-guru-worker';
// export { RuCaptchaWorker } from './rucaptcha-worker';

/**
 * Available workflow providers
 */
export const AVAILABLE_PROVIDERS = [
  '2captcha',
  // 'kolotibablo',  // Coming soon
  // 'anti-captcha', // Coming soon
  // 'captcha-guru', // Coming soon
  // 'rucaptcha',    // Coming soon
] as const;

export type ProviderName = typeof AVAILABLE_PROVIDERS[number];

/**
 * Factory function to get a worker instance by provider name
 * 
 * @param provider - The CAPTCHA work platform name
 * @returns Worker class for the specified provider
 */
export function getWorkerClass(provider: ProviderName) {
  switch (provider) {
    case '2captcha':
      return TwoCaptchaWorker;
    // case 'kolotibablo':
    //   return KolotibabloWorker;
    // case 'anti-captcha':
    //   return AntiCaptchaWorker;
    default:
      throw new Error(`Unknown provider: ${provider}. Available: ${AVAILABLE_PROVIDERS.join(', ')}`);
  }
}
