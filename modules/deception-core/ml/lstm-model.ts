import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-layers';

/**
 * LSTMModel: Long Short-Term Memory network for sequence analysis
 * 
 * Analyzes interaction sequences to detect deception patterns:
 * - Rapid-click patterns
 * - Unusual interaction timing
 * - State change anomalies
 */
export class LSTMModel {
  private model: tf.LayersModel | null = null;

  async initializeModel(sequenceLength: number = 100, featureDim: number = 4): Promise<tf.LayersModel> {
    const input = tf.input({ shape: [sequenceLength, featureDim] });

    // Use simpler initialization for faster test execution
    const lstm1 = tf.layers.lstm({
      units: 32,  // Reduced from 64
      returnSequences: true,
      activation: 'relu',
      kernelInitializer: 'glorotUniform',  // Faster than orthogonal
      recurrentInitializer: 'orthogonal'
    }).apply(input) as tf.SymbolicTensor;

    const dropout1 = tf.layers.dropout({ rate: 0.2 }).apply(lstm1) as tf.SymbolicTensor;

    const lstm2 = tf.layers.lstm({
      units: 16,  // Reduced from 32
      returnSequences: false,
      activation: 'relu',
      kernelInitializer: 'glorotUniform',
      recurrentInitializer: 'orthogonal'
    }).apply(dropout1) as tf.SymbolicTensor;

    const dropout2 = tf.layers.dropout({ rate: 0.2 }).apply(lstm2) as tf.SymbolicTensor;

    const dense = tf.layers.dense({
      units: 8,  // Reduced from 16
      activation: 'relu'
    }).apply(dropout2) as tf.SymbolicTensor;

    const output = tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }).apply(dense) as tf.SymbolicTensor;

    this.model = tf.model({ inputs: input, outputs: output });
    
    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return this.model;
  }

  async predict(input: tf.Tensor2D): Promise<number> {
    if (!this.model) throw new Error('Model not initialized');

    return tf.tidy(() => {
      const batch = input.expandDims(0);
      const pred = this.model!.predict(batch) as tf.Tensor;
      const value = pred.dataSync()[0];
      pred.dispose();
      return value;
    });
  }

  async train(xTrain: tf.Tensor3D, yTrain: tf.Tensor2D, options: any = {}): Promise<tf.History> {
    if (!this.model) throw new Error('Model not initialized');
    return this.model.fit(xTrain, yTrain, { epochs: 10, batchSize: 32, ...options });
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

export async function createLSTMModel(sequenceLength: number = 100, featureDim: number = 4): Promise<LSTMModel> {
  const model = new LSTMModel();
  await model.initializeModel(sequenceLength, featureDim);
  return model;
}
