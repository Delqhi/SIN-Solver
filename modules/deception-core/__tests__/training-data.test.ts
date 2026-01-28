import { TrainingDataGenerator, ModelPersistence, createTrainingDataset } from '../ml/training-data';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-layers';

describe('Phase 5: Training Data & Model Persistence', () => {
  afterEach(() => {
    tf.disposeVariables();
  });

  describe('TrainingDataGenerator', () => {
    let generator: TrainingDataGenerator;

    beforeEach(() => {
      generator = new TrainingDataGenerator();
    });

    it('should generate CAPTCHA examples with rapid interactions', () => {
      const example = generator.generateCAPTCHAExample();

      expect(example.label).toBe('captcha');
      expect(example.htmlContent).toContain('recaptcha');
      expect(example.interactions.length).toBeGreaterThan(0);
      expect(example.interactions[0].type).toBe('click');
    });

    it('should generate honeypot examples with hidden elements', () => {
      const example = generator.generateHoneypotExample();

      expect(example.label).toBe('honeypot');
      expect(example.htmlContent).toMatch(/hidden|display:none|opacity:0|aria-hidden/);
      expect(example.interactions[0].x).toBe(-9999);
      expect(example.interactions[0].y).toBe(-9999);
    });

    it('should generate phishing examples with suspicious patterns', () => {
      const example = generator.generatePhishingExample();

      expect(example.label).toBe('phishing');
      expect(example.htmlContent.toLowerCase()).toMatch(/password|verify|confirm|compromised/);
      expect(example.interactions.length).toBeGreaterThanOrEqual(3);
    });

    it('should generate legitimate examples with normal interactions', () => {
      const example = generator.generateLegitimateExample();

      expect(example.label).toBe('safe');
      expect(example.htmlContent).toContain('login');
      expect(example.interactions.length).toEqual(3);
      expect(example.interactions[1].timestamp).toBeGreaterThan(example.interactions[0].timestamp);
    });

    it('should generate balanced dataset with equal class representation', () => {
      const dataset = generator.generateBalancedDataset(10);

      expect(dataset.length).toBe(40); // 10 per class * 4 classes
      const stats = generator.getStats();
      expect(stats.byLabel.safe).toBe(10);
      expect(stats.byLabel.captcha).toBe(10);
      expect(stats.byLabel.honeypot).toBe(10);
      expect(stats.byLabel.phishing).toBe(10);
    });

    it('should convert examples to CNN tensors', async () => {
      const examples = [
        generator.generateLegitimateExample(),
        generator.generateCAPTCHAExample()
      ];

      const { x, y } = await generator.examplesToCNNTensors(examples, 100);

      expect(x.shape).toEqual([2, 100]);
      expect(y.shape).toEqual([2]);
      expect(y.dataSync()[0]).toBe(0); // First is safe
      expect(y.dataSync()[1]).toBe(1); // Second is deceptive

      x.dispose();
      y.dispose();
    });

    it('should convert examples to LSTM tensors', async () => {
      const examples = [
        generator.generateLegitimateExample(),
        generator.generateCAPTCHAExample()
      ];

      const { x, y } = await generator.exampleToLSTMTensors(examples, 50);

      expect(x.shape).toEqual([2, 50, 4]); // batch, sequence, features
      expect(y.shape).toEqual([2]);

      x.dispose();
      y.dispose();
    });

    it('should return correct statistics', () => {
      generator.generateBalancedDataset(5);
      const stats = generator.getStats();

      expect(stats.totalExamples).toBe(20);
      expect(stats.byLabel.safe).toBe(5);
      expect(stats.byLabel.captcha).toBe(5);
      expect(stats.byLabel.honeypot).toBe(5);
      expect(stats.byLabel.phishing).toBe(5);
    });
  });

  describe('ModelPersistence', () => {
    let persistence: ModelPersistence;
    let testModel: tf.LayersModel;

    beforeEach(async () => {
      persistence = new ModelPersistence();

      const input = tf.input({ shape: [10] });
      const dense = tf.layers.dense({ units: 5, activation: 'relu' }).apply(input) as tf.SymbolicTensor;
      const output = tf.layers.dense({ units: 1, activation: 'sigmoid' }).apply(dense) as tf.SymbolicTensor;
      testModel = tf.model({ inputs: input, outputs: output });
    });

    afterEach(() => {
      if (testModel) testModel.dispose();
    });

    it('should create pre-trained model', async () => {
      const model = await persistence.createPretrainedModel();

      expect(model).toBeDefined();
      expect(model.summary).toBeDefined();

      model.dispose();
    });

    it('should export model weights as JSON', async () => {
      const weights = await persistence.exportWeights(testModel);

      expect(Object.keys(weights).length).toBeGreaterThan(0);
      expect(weights['weight_0']).toBeDefined();
      expect(Array.isArray(weights['weight_0'])).toBe(true);
    });

    it('should save model to storage', async () => {
      await expect(persistence.saveModel(testModel, 'test-model')).resolves.not.toThrow();
    });

    it('should handle load failures gracefully', async () => {
      const model = await persistence.loadModel('non-existent-model');
      expect(model).toBeNull();
    });
  });

  describe('createTrainingDataset', () => {
    let generator: TrainingDataGenerator;

    beforeEach(() => {
      generator = new TrainingDataGenerator();
    });

    it('should create CNN dataset with batching', async () => {
      const examples = generator.generateBalancedDataset(5);
      const dataset = await createTrainingDataset(examples, 'cnn', 4);

      expect(dataset).toBeDefined();
      expect(dataset.shuffle).toBeDefined();
      expect(dataset.map).toBeDefined();
    });

    it('should create LSTM dataset with batching', async () => {
      const examples = generator.generateBalancedDataset(5);
      const dataset = await createTrainingDataset(examples, 'lstm', 4);

      expect(dataset).toBeDefined();
    });
  });

  describe('Training Integration', () => {
    it('should train CNN model on generated data', async () => {
      const generator = new TrainingDataGenerator();
      const examples = generator.generateBalancedDataset(3);

      const { x, y } = await generator.examplesToCNNTensors(examples, 100);

      const input = tf.input({ shape: [100] });
      const dense = tf.layers.dense({ units: 16, activation: 'relu' }).apply(input) as tf.SymbolicTensor;
      const output = tf.layers.dense({ units: 1, activation: 'sigmoid' }).apply(dense) as tf.SymbolicTensor;
      const model = tf.model({ inputs: input, outputs: output });

      model.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      const history = await model.fit(x, y, { epochs: 2, verbose: 0 });

      expect(history.history.loss).toBeDefined();
      expect(history.history.loss.length).toBe(2);

      model.dispose();
      x.dispose();
      y.dispose();
    });

    it('should train LSTM model on generated data', async () => {
      const generator = new TrainingDataGenerator();
      const examples = generator.generateBalancedDataset(2);

      const { x, y } = await generator.exampleToLSTMTensors(examples, 20);

      const input = tf.input({ shape: [20, 4] });
      const lstm = tf.layers.lstm({
        units: 8,
        returnSequences: false,
        kernelInitializer: 'glorotUniform'
      }).apply(input) as tf.SymbolicTensor;
      const output = tf.layers.dense({ units: 1, activation: 'sigmoid' }).apply(lstm) as tf.SymbolicTensor;
      const model = tf.model({ inputs: input, outputs: output });

      model.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      const history = await model.fit(x, y, { epochs: 1, verbose: 0 });

      expect(history.history.loss).toBeDefined();

      model.dispose();
      x.dispose();
      y.dispose();
    });
  });
});
