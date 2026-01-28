import { StateMachine } from '../state-machine';
import { DeceptionHunter } from '../deception-hunter';
import { Honeypot } from '../honeypot';
import { InteractionAPI } from '../interaction-api';
import { AuditLogger } from '../audit';

describe('SIN-Solver Test Suite', () => {
  // 1. StateMachine Tests
  describe('StateMachine', () => {
    it('should initialize with initial state', () => {
      const sm = new StateMachine({
        initialState: 'IDLE',
        states: ['IDLE', 'PROCESSING', 'COMPLETE'],
        transitions: { 'IDLE': ['PROCESSING'], 'PROCESSING': ['COMPLETE'] }
      });
      expect(sm.getState().name).toBe('IDLE');
    });

    it('should transition between states', async () => {
      const sm = new StateMachine({
        initialState: 'IDLE',
        states: ['IDLE', 'PROCESSING'],
        transitions: { 'IDLE': ['PROCESSING'] }
      });
      await sm.transition('PROCESSING');
      expect(sm.getState().name).toBe('PROCESSING');
    });

    it('should reject invalid transitions', async () => {
      const sm = new StateMachine({
        initialState: 'IDLE',
        states: ['IDLE', 'PROCESSING'],
        transitions: { 'IDLE': ['PROCESSING'] }
      });
      await expect(sm.transition('INVALID')).rejects.toThrow();
    });
  });

  // 2. DeceptionHunter Tests
  describe('DeceptionHunter', () => {
    it('should detect CAPTCHA patterns', () => {
      const sm = new StateMachine({
        initialState: 'IDLE',
        states: ['IDLE'],
        transitions: {}
      });
      const dh = new DeceptionHunter(sm);
      const result = dh.analyze('<div class="captcha">Verify</div>');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('CAPTCHA');
    });
  });

  // 3. Honeypot Tests
  describe('Honeypot', () => {
    it('should add zones correctly', () => {
      const hp = new Honeypot();
      hp.addZone({ id: 'zone-1', x: 10, y: 10, width: 50, height: 50, type: 'SAFE' });
      const report = hp.getSpatialReport();
      expect(report.safe_zones.length).toBe(1);
    });

    it('should block false clicks', () => {
      const hp = new Honeypot();
      hp.addZone({ id: 'zone-1', x: 10, y: 10, width: 50, height: 50, type: 'DANGER' });
      const blocked = hp.blockFalseClick(20, 20);
      expect(blocked).toBe(true);
    });
  });

  // 4. InteractionAPI Tests
  describe('InteractionAPI', () => {
    it('should execute full click cycle', async () => {
      const sm = new StateMachine({
        initialState: 'IDLE',
        states: ['IDLE', 'PENDING', 'VERIFIED', 'FAILED'],
        transitions: { 
          'IDLE': ['PENDING'], 
          'PENDING': ['VERIFIED', 'FAILED'] 
        }
      });
      const dh = new DeceptionHunter(sm);
      const hp = new Honeypot();
      const api = new InteractionAPI({ sm, dh, hp });
      
      const result = await api.click('test-btn', 100, 100);
      expect(result).toBeDefined();
      // The test passes if the result is a valid IInteractionResult
      // Success depends on DeceptionHunter detecting a state change
      expect(result.audit_log).toBeDefined();
      expect(result.audit_log.length).toBeGreaterThan(0);
    });
  });

  // 5. AuditLogger Tests
  describe('AuditLogger', () => {
    it('should log entries with timestamp', () => {
      const logger = new AuditLogger();
      logger.log({ action: 'TEST_ACTION', state: 'SUCCESS', confidence: 1.0, metadata: {} });
      const entries = logger.getEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('TEST_ACTION');
    });

    it('should export JSON format', () => {
      const logger = new AuditLogger();
      logger.log({ action: 'TEST', state: 'SUCCESS', confidence: 1.0, metadata: {} });
      const json = logger.export();
      expect(json).toContain('TEST');
    });
  });
});
