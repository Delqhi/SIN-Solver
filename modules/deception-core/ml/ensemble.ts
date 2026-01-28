import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-layers';
import { CNNModel } from './cnn-model';
import { LSTMModel } from './lstm-model';

/**
 * EnsembleModel: Meta-learner that combines CNN, LSTM, and Regex predictions
 * 
 * Weighted voting strategy:
 * - Regex score: 40% weight (fast, deterministic)
 * - ML ensemble: 60% weight (accurate, learned patterns)
 * Final confidence = (regex_score * 0.40) + (ml_score * 0.60)
 */
export class EnsembleModel {
  private cnnModel: CNNModel;
  private lstmModel: LSTMModel;
  private metaLearner: tf.LayersModel | null = null;
  private isInitialized: boolean = false;

  constructor(cnnModel: CNNModel, lstmModel: LSTMModel) {
    this.cnnModel = cnnModel;
    this.lstmModel = lstmModel;
  }

  async initialize(): Promise<void> {
    const cnnOut = tf.input({ shape: [1], name: 'cnn_prediction' });
    const lstmOut = tf.input({ shape: [1], name: 'lstm_prediction' });
    const regexOut = tf.input({ shape: [1], name: 'regex_score' });

    const concat = tf.layers.concatenate().apply([cnnOut, lstmOut, regexOut]) as tf.SymbolicTensor;

    const dense1 = tf.layers.dense({
      units: 16,
      activation: 'relu'
    }).apply(concat) as tf.SymbolicTensor;

    const dropout = tf.layers.dropout({ rate: 0.3 }).apply(dense1) as tf.SymbolicTensor;

    const dense2 = tf.layers.dense({
      units: 8,
      activation: 'relu'
    }).apply(dropout) as tf.SymbolicTensor;

    const output = tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }).apply(dense2) as tf.SymbolicTensor;

    this.metaLearner = tf.model({
      inputs: [cnnOut, lstmOut, regexOut],
      outputs: output
    });

    this.metaLearner.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    this.isInitialized = true;
  }

  async predict(cnnScore: number, lstmScore: number, regexScore: number): Promise<number> {
    if (!this.metaLearner || !this.isInitialized) {
      throw new Error('Ensemble not initialized');
    }

    return tf.tidy(() => {
      const cnn = tf.tensor1d([cnnScore]);
      const lstm = tf.tensor1d([lstmScore]);
      const regex = tf.tensor1d([regexScore / 100]);

      const pred = this.metaLearner!.predict([cnn, lstm, regex]) as tf.Tensor;
      const value = pred.dataSync()[0];

      cnn.dispose();
      lstm.dispose();
      regex.dispose();
      pred.dispose();

      return value;
    });
  }

  calculateHybridScore(regexScore: number, mlScore: number): number {
    return (regexScore * 0.40) + (mlScore * 0.60);
  }

  getVerdict(score: number): 'SAFE' | 'LOW_RISK' | 'MEDIUM' | 'HIGH_THREAT' {
    if (score < 0.2) return 'SAFE';
    if (score < 0.4) return 'LOW_RISK';
    if (score < 0.7) return 'MEDIUM';
    return 'HIGH_THREAT';
  }

  dispose(): void {
    if (this.metaLearner) {
      this.metaLearner.dispose();
      this.metaLearner = null;
    }
  }
}

export async function createEnsembleModel(
  cnnModel: CNNModel,
  lstmModel: LSTMModel
): Promise<EnsembleModel> {
  const ensemble = new EnsembleModel(cnnModel, lstmModel);
  await ensemble.initialize();
  return ensemble;
}
