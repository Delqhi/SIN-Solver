import { IInteractionResult, IInteractionOptions, IAuditEntry } from './types';
import { StateMachine } from './state-machine';
import { DeceptionHunter } from './deception-hunter';
import { Honeypot } from './honeypot';

/**
 * InteractionAPI
 * 
 * Orchestrates user interactions with the system, ensuring security via Honeypot
 * and integrity via DeceptionHunter.
 * 
 * Flow Diagram:
 * [Start] -> [Capture State Before] -> [Honeypot Check]
 *    |             |                      |
 *    |             v                      v
 *    |      (Snapshot Before)      [Blocked?] --Yes--> [Return Failure]
 *    |                                    |
 *    |                                   No
 *    |                                    v
 *    |                          [Execute Click (Simulated)]
 *    |                                    v
 *    |                          [StateMachine: PENDING]
 *    |                                    v
 *    |                          [Capture State After]
 *    |                                    v
 *    |                          [DeceptionHunter: Analyze & Verify]
 *    |                                    |
 *    |                          [Confidence > 80?] --Yes--> [StateMachine: VERIFIED]
 *    |                                    |                 |
 *    |                                   No                 v
 *    |                                    |          [Log Audit Entry]
 *    |                                    v                 |
 *    |                          [StateMachine: FAILED] <----/
 *    |                                    |
 *    [End] <------------------------------/
 */
export class InteractionAPI {
  private state_machine: StateMachine;
  private deception_hunter: DeceptionHunter;
  private honeypot: Honeypot;
  private audit_log: IAuditEntry[] = [];

  /**
   * Initializes the InteractionAPI with required security and state modules.
   * @param config Configuration object containing SM, DH, and HP instances.
   */
  constructor(config: { sm: StateMachine; dh: DeceptionHunter; hp: Honeypot }) {
    this.state_machine = config.sm;
    this.deception_hunter = config.dh;
    this.honeypot = config.hp;
  }

  /**
   * Performs a simulated click interaction.
   * 
   * @param target The target element identifier.
   * @param x The X coordinate of the click.
   * @param y The Y coordinate of the click.
   * @param options Optional interaction settings.
   * @returns A promise resolving to the interaction result.
   */
  async click(
    target: string,
    x: number,
    y: number,
    options?: IInteractionOptions
  ): Promise<IInteractionResult> {
    const state_before = await this.captureState();
    
    try {
      // 1. Honeypot Check
      const isBlocked = this.honeypot.blockFalseClick(x, y);
      if (isBlocked) {
        const failureEntry: IAuditEntry = {
          timestamp: Date.now(),
          action: 'CLICK_BLOCKED',
          state: 'BLOCKED',
          confidence: 0,
          error: `Honeypot blocked click at (${x}, ${y})`,
          metadata: { target, x, y }
        };
        this.audit_log.push(failureEntry);
        
        return {
          success: false,
          state_before,
          state_after: state_before,
          confidence: 0,
          audit_log: [failureEntry]
        };
      }

      // 2. Execute Click (Simulated)
      await this.state_machine.transition('PENDING');
      
      // Simulation: In a real scenario, this would interact with a browser driver.
      const clickActionEntry: IAuditEntry = {
        timestamp: Date.now(),
        action: 'CLICK_EXECUTE',
        state: 'PENDING',
        confidence: 0.5,
        error: null,
        metadata: { target, x, y, options }
      };
      this.audit_log.push(clickActionEntry);

      // 3. Capture State After
      const state_after = await this.captureState();

       // 4. DeceptionHunter Analysis
       const analysisResult = this.deception_hunter.runFullAnalysis('', state_before, state_after);

      // 5. Calculate Confidence & Update State
      const finalConfidence = analysisResult.confidence;
      const success = finalConfidence > 80 && analysisResult.verified;

      if (success) {
        await this.state_machine.transition('VERIFIED');
      } else {
        // Note: transition might fail if FAILED is not a valid next state from PENDING
        // but requirements specify to transition to FAILED on error/failure.
        try {
          await this.state_machine.transition('FAILED');
        } catch (e) {
          // Fallback if transition is illegal
          await this.state_machine.setState('FAILED');
        }
      }

      const finalEntry: IAuditEntry = {
        timestamp: Date.now(),
        action: 'CLICK_VERIFY',
        state: success ? 'VERIFIED' : 'FAILED',
        confidence: finalConfidence,
        error: success ? null : 'Verification failed or confidence too low',
        metadata: { 
          matched_patterns: analysisResult.matched_patterns,
          verified: analysisResult.verified
        }
      };
      this.audit_log.push(finalEntry);

      return {
        success,
        state_before,
        state_after,
        confidence: finalConfidence,
        audit_log: this.audit_log.slice(-3) // Return the entries for this specific click
      };

    } catch (error) {
      try {
        await this.state_machine.transition('FAILED');
      } catch (e) {
        await this.state_machine.setState('FAILED');
      }
      
      const errorEntry: IAuditEntry = {
        timestamp: Date.now(),
        action: 'CLICK_ERROR',
        state: 'FAILED',
        confidence: 0,
        error: error instanceof Error ? error.message : String(error),
        metadata: { target, x, y }
      };
      this.audit_log.push(errorEntry);

      return {
        success: false,
        state_before,
        state_after: state_before,
        confidence: 0,
        audit_log: [errorEntry]
      };
    }
  }

  /**
   * Verifies the current system integrity.
   */
  async verify(): Promise<boolean> {
    return this.state_machine.getState().name === 'VERIFIED';
  }

  /**
   * Captures a snapshot of the current system state.
   */
   private async captureState(): Promise<Record<string, unknown>> {
     const currentState = this.state_machine.getState();
     return {
       state_name: currentState.name,
       timestamp: Date.now()
     };
   }

  /**
   * Returns the full audit trail.
   */
  getAuditLog(): IAuditEntry[] {
    return [...this.audit_log];
  }

  /**
   * Exports the audit trail as a JSON string.
   */
  exportAuditLog(): string {
    return JSON.stringify(this.audit_log, null, 2);
  }
}
