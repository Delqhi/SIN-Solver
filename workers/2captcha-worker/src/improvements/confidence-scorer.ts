/**
 * Confidence Scorer
 * - Evaluates solution confidence
 * - CAPTCHA type auto-detection heuristics
 */

export type CaptchaTypeHint =
  | 'text'
  | 'image'
  | 'recaptcha'
  | 'hcaptcha'
  | 'geetest'
  | 'slider'
  | 'click'
  | 'unknown';

export interface ConfidenceInput {
  rawText?: string;
  providerConfidence?: number;
  decisionConfidence?: number;
  retries?: number;
  expectedLength?: number;
  captchaType?: CaptchaTypeHint;
  pageSource?: string;
  metadata?: Record<string, unknown>;
}

export interface ConfidenceResult {
  score: number;
  detectedType: CaptchaTypeHint;
  reasons: string[];
}

export class ConfidenceScorer {
  score(input: ConfidenceInput): ConfidenceResult {
    const reasons: string[] = [];
    const base = typeof input.providerConfidence === 'number'
      ? input.providerConfidence
      : typeof input.decisionConfidence === 'number'
        ? input.decisionConfidence
        : 0.6;

    let score = base;

    const detectedType = this.detectType(input.pageSource, input.captchaType, input.rawText);
    if (detectedType !== 'unknown') {
      score += 0.05;
      reasons.push(`Detected type: ${detectedType}`);
    }

    if (input.retries && input.retries > 0) {
      const penalty = Math.min(0.15, input.retries * 0.05);
      score -= penalty;
      reasons.push(`Retry penalty applied: -${penalty.toFixed(2)}`);
    }

    if (input.rawText) {
      const normalized = input.rawText.replace(/\s+/g, '').trim();
      if (input.expectedLength && normalized.length !== input.expectedLength) {
        score -= 0.1;
        reasons.push('Length mismatch penalty');
      }
      if (normalized.length > 0 && /[^a-zA-Z0-9]/.test(normalized)) {
        score -= 0.05;
        reasons.push('Non-alphanumeric penalty');
      }
    }

    score = Math.max(0, Math.min(1, score));

    return {
      score,
      detectedType,
      reasons,
    };
  }

  detectType(pageSource?: string, hint?: CaptchaTypeHint, rawText?: string): CaptchaTypeHint {
    if (hint && hint !== 'unknown') {
      return hint;
    }

    if (pageSource) {
      const lower = pageSource.toLowerCase();
      if (lower.includes('recaptcha')) return 'recaptcha';
      if (lower.includes('hcaptcha')) return 'hcaptcha';
      if (lower.includes('geetest')) return 'geetest';
      if (lower.includes('slider')) return 'slider';
      if (lower.includes('click')) return 'click';
    }

    if (rawText && rawText.length <= 8) {
      return 'text';
    }

    return 'unknown';
  }
}

export default ConfidenceScorer;
