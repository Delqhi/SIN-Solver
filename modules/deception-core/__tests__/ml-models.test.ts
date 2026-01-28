import { MLPreprocessor } from '../ml/preprocessor';
import { createCNNModel } from '../ml/cnn-model';
import { createLSTMModel } from '../ml/lstm-model';
import { createEnsembleModel } from '../ml/ensemble';
import { createMLDeceptionHunter } from '../ml/ml-deception-hunter';
import { StateMachine } from '../state-machine';
import * as tf from '@tensorflow/tfjs';

describe('ML Components', () => {
  let stateMachine: StateMachine;

  beforeAll(() => {
    stateMachine = new StateMachine({
      initialState: 'IDLE',
      states: ['IDLE', 'PENDING', 'VERIFIED', 'FAILED'],
      transitions: {
        'IDLE': ['PENDING'],
        'PENDING': ['VERIFIED', 'FAILED']
      }
    });
  });

  describe('MLPreprocessor', () => {
    it('should preprocess HTML content to vector', () => {
      const preprocessor = new MLPreprocessor(1000, 100);
      const html = '<button id="captcha">Verify</button>';
      const vector = preprocessor.preprocessContent(html);

      expect(vector).toBeDefined();
      expect(vector.shape).toEqual([1000]);
      vector.dispose();
    });

    it('should convert interaction history to sequence tensor', () => {
      const preprocessor = new MLPreprocessor(1000, 100);
      const interactions = [
        { action: 'CLICK', timestamp: Date.now(), x: 100, y: 200 },
        { action: 'HOVER', timestamp: Date.now() + 100, x: 120, y: 210 }
      ];

      const sequence = preprocessor.sequenceFromInteractions(interactions);
      expect(sequence.shape).toEqual([100, 4]);
      sequence.dispose();
    });

    it('should handle empty vocab gracefully', () => {
      const preprocessor = new MLPreprocessor(100, 50);
      const html = '<div>unknown content</div>';
      const vector = preprocessor.preprocessContent(html);

      expect(vector).toBeDefined();
      vector.dispose();
    });
  });

  describe('CNNModel', () => {
    it('should initialize CNN model', async () => {
      const cnnModel = await createCNNModel(1000);
      expect(cnnModel).toBeDefined();
      cnnModel.dispose();
    });

    it('should make predictions', async () => {
      const cnnModel = await createCNNModel(1000);
      const input = tf.randomNormal([1000]) as tf.Tensor1D;

      const prediction = await cnnModel.predict(input);

      expect(prediction).toBeGreaterThanOrEqual(0);
      expect(prediction).toBeLessThanOrEqual(1);

      input.dispose();
      cnnModel.dispose();
    });

    it('should handle batch predictions', async () => {
      const cnnModel = await createCNNModel(1000);
      const batch = tf.randomNormal([5, 1000]) as tf.Tensor2D;

      const predictions = await cnnModel.predictBatch(batch);

      expect(predictions.length).toBe(5);
      predictions.forEach(pred => {
        expect(pred).toBeGreaterThanOrEqual(0);
        expect(pred).toBeLessThanOrEqual(1);
      });

      batch.dispose();
      cnnModel.dispose();
    });
  });

  describe('LSTMModel', () => {
    it('should initialize LSTM model', async () => {
      const lstmModel = await createLSTMModel(100, 4);
      expect(lstmModel).toBeDefined();
      lstmModel.dispose();
    });

    it('should make sequence predictions', async () => {
      const lstmModel = await createLSTMModel(100, 4);
      const sequence = tf.randomNormal([100, 4]) as tf.Tensor2D;

      const prediction = await lstmModel.predict(sequence);

      expect(prediction).toBeGreaterThanOrEqual(0);
      expect(prediction).toBeLessThanOrEqual(1);

      sequence.dispose();
      lstmModel.dispose();
    });
  });

  describe('EnsembleModel', () => {
    it('should initialize ensemble', async () => {
      const cnnModel = await createCNNModel(1000);
      const lstmModel = await createLSTMModel(100, 4);
      const ensemble = await createEnsembleModel(cnnModel, lstmModel);

      expect(ensemble).toBeDefined();

      ensemble.dispose();
      cnnModel.dispose();
      lstmModel.dispose();
    });

    it('should calculate hybrid scores correctly', async () => {
      const cnnModel = await createCNNModel(1000);
      const lstmModel = await createLSTMModel(100, 4);
      const ensemble = await createEnsembleModel(cnnModel, lstmModel);

      const regexScore = 75;
      const mlScore = 85;
      const hybrid = ensemble.calculateHybridScore(regexScore, mlScore);

      const expected = (regexScore * 0.40) + (mlScore * 0.60);
      expect(hybrid).toBeCloseTo(expected, 0);

      ensemble.dispose();
      cnnModel.dispose();
      lstmModel.dispose();
    });

    it('should assign correct verdicts based on score', async () => {
      const cnnModel = await createCNNModel(1000);
      const lstmModel = await createLSTMModel(100, 4);
      const ensemble = await createEnsembleModel(cnnModel, lstmModel);

      expect(ensemble.getVerdict(0.15)).toBe('SAFE');
      expect(ensemble.getVerdict(0.3)).toBe('LOW_RISK');
      expect(ensemble.getVerdict(0.55)).toBe('MEDIUM');
      expect(ensemble.getVerdict(0.85)).toBe('HIGH_THREAT');

      ensemble.dispose();
      cnnModel.dispose();
      lstmModel.dispose();
    });
  });

  describe('MLDeceptionHunter', () => {
    it('should initialize ML deception hunter', async () => {
      const hunter = await createMLDeceptionHunter(stateMachine, true);
      expect(hunter).toBeDefined();
      hunter.dispose();
    });

    it('should analyze with ML support', async () => {
      const hunter = await createMLDeceptionHunter(stateMachine, true);
      const html = '<button id="captcha">Verify Human</button>';
      const interactions = [
        { action: 'CLICK', timestamp: Date.now(), x: 100, y: 100 }
      ];

      const result = await hunter.analyzeWithML(html, interactions);

      expect(result).toBeDefined();
      expect(result.regex_score).toBeGreaterThanOrEqual(0);
      expect(result.ml_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(['SAFE', 'LOW_RISK', 'MEDIUM', 'HIGH_THREAT']).toContain(result.verdict);

      hunter.dispose();
    });

    it('should detect CAPTCHA patterns with regex', async () => {
      const hunter = await createMLDeceptionHunter(stateMachine, false);
      const html = '<div id="recaptcha">reCAPTCHA Challenge</div>';
      const patterns = hunter.analyze(html);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.type === 'CAPTCHA')).toBe(true);

      hunter.dispose();
    });

    it('should handle backward compatibility', async () => {
      const hunter = await createMLDeceptionHunter(stateMachine, false);
      const html = '<form><input type="hidden"></form>';
      const patterns = hunter.analyze(html);

      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);

      hunter.dispose();
    });
  });

  describe('Hybrid Mode Integration', () => {
    it('should combine regex and ML scores correctly', async () => {
      const hunter = await createMLDeceptionHunter(stateMachine, true);
      const html = '<button id="captcha-verify">Verify</button>';
      const interactions = [
        { action: 'HOVER', timestamp: Date.now() - 100, x: 100, y: 100 },
        { action: 'CLICK', timestamp: Date.now(), x: 100, y: 100 }
      ];

      const result = await hunter.analyzeWithML(html, interactions);

      expect(result.final_score).toBeDefined();
      expect(result.final_score).toBeGreaterThanOrEqual(0);
      expect(result.final_score).toBeLessThanOrEqual(100);

      const expectedFinal = (result.regex_score * 0.40) + (result.ml_score * 0.60);
      expect(result.final_score).toBeCloseTo(expectedFinal, 0);

      hunter.dispose();
    });
  });
});
