import { IDeceptionHunterPattern, IDeceptionHunterResult, IClickVerification } from './types';
import { StateMachine } from './state-machine';

export class DeceptionHunter {
  private patterns: IDeceptionHunterPattern[] = [];
  private state_machine: StateMachine;

  constructor(stateMachine: StateMachine) {
    this.state_machine = stateMachine;

    // Initialize predefined patterns
    this.addPattern({
      type: 'CAPTCHA',
      regex: '/captcha|recaptcha|challenge|verification/i',
      severity: 'high'
    });
    this.addPattern({
      type: 'HONEYPOT',
      regex: '/honeypot|trap|decoy|fake/i',
      severity: 'medium'
    });
    this.addPattern({
      type: 'PHISHING',
      regex: '/phishing|spoof|clone|fake_login/i',
      severity: 'high'
    });
    this.addPattern({
      type: 'FAKE_ELEMENT',
      regex: '/hidden|invisible|opacity-0|pointer-events-none/i',
      severity: 'medium'
    });
  }

  /**
   * Analyzes page content for deception patterns.
   * @param page_content The content to analyze
   * @returns Array of matched patterns
   */
  analyze(page_content: string): IDeceptionHunterPattern[] {
    const matched: IDeceptionHunterPattern[] = [];
    
    for (const pattern of this.patterns) {
      // Extract regex and flags from string format "/regex/flags"
      const match = pattern.regex.match(/^\/(.*)\/([gimsuy]*)$/);
      if (match) {
        const re = new RegExp(match[1], match[2]);
        if (re.test(page_content)) {
          matched.push(pattern);
        }
      }
    }
    
    return matched;
  }

  /**
   * Verifies if a click resulted in a meaningful state change.
   * @param before State before click
   * @param after State after click
   * @returns Verification result
   */
  verifyClick(before: Record<string, unknown>, after: Record<string, unknown>): IClickVerification {
    const logs: string[] = [];
    let verified = false;

    // Compare URL if present
    if (before.url !== after.url) {
      verified = true;
      logs.push(`URL changed from ${before.url} to ${after.url}`);
    }

    // Compare DOM structure/content (simplified check for this implementation)
    const beforeStr = JSON.stringify(before);
    const afterStr = JSON.stringify(after);
    
    if (beforeStr !== afterStr && !verified) {
      verified = true;
      logs.push('DOM state or metadata changed after click');
    }

    if (!verified) {
      logs.push('No significant state change detected after click');
    }

    return {
      before_state: before,
      after_state: after,
      verified,
      confidence: verified ? 1.0 : 0.0
    };
  }

  /**
   * Calculates confidence score based on patterns and verification.
   * @param matchedPatterns Patterns found in content
   * @param clickVerification Result of click verification
   * @returns Confidence score 0-100
   */
  getConfidence(matchedPatterns: IDeceptionHunterPattern[], clickVerification: IClickVerification): number {
    if (!clickVerification.verified) {
      return 0;
    }

    let score = 100;

    for (const pattern of matchedPatterns) {
      switch (pattern.severity) {
        case 'low':
          score -= 10;
          break;
        case 'medium':
          score -= 30;
          break;
        case 'high':
          score -= 50;
          break;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Adds a new pattern to the hunter.
   */
  addPattern(pattern: IDeceptionHunterPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Full analysis flow returning a structured result.
   */
  runFullAnalysis(page_content: string, before: Record<string, unknown>, after: Record<string, unknown>): IDeceptionHunterResult {
    const logs: string[] = [];
    logs.push('Starting Deception Hunter analysis...');

    const matchedPatterns = this.analyze(page_content);
    if (matchedPatterns.length > 0) {
      logs.push(`Matched ${matchedPatterns.length} patterns: ${matchedPatterns.map(p => p.type).join(', ')}`);
    } else {
      logs.push('No deception patterns matched in page content.');
    }

    const clickVerification = this.verifyClick(before, after);
    logs.push(clickVerification.verified ? 'Click verification successful.' : 'Click verification failed: No state change.');

    const confidence = this.getConfidence(matchedPatterns, clickVerification);
    logs.push(`Final confidence score: ${confidence}`);

    return {
      verified: clickVerification.verified && confidence > 50,
      confidence,
      matched_patterns: matchedPatterns.map(p => p.type),
      logs
    };
  }
}
