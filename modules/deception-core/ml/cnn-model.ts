import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-layers';

/**
 * CNNModel: Convolutional Neural Network for visual pattern detection
 * 
 * Architecture:
 * - Input: 1D vector of HTML features (vocabSize)
 * - Conv1D layers for spatial pattern detection
 * - MaxPooling for dimensionality reduction
 * - Dense layers for classification
 * - Output: Probability (0-1)
 */
export class CNNModel {
  private model: tf.LayersModel | null = null;
  private isCompiled: boolean = false;

  /**
   * Create and initialize CNN architecture
   */
  async initializeModel(inputSize: number = 1000): Promise<tf.LayersModel> {
    const input = tf.input({ shape: [inputSize] });

    // Reshape input for Conv1D (Conv1D requires 3D input)
    const reshaped = tf.layers.reshape({ targetShape: [inputSize, 1] }).apply(input) as tf.SymbolicTensor;

    // First convolutional block
    const conv1 = tf.layers.conv1d({
      filters: 128,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu'
    }).apply(reshaped) as tf.SymbolicTensor;

    const pool1 = tf.layers.maxPooling1d({
      poolSize: 2,
      padding: 'same'
    }).apply(conv1) as tf.SymbolicTensor;

    // Second convolutional block
    const conv2 = tf.layers.conv1d({
      filters: 64,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu'
    }).apply(pool1) as tf.SymbolicTensor;

    const pool2 = tf.layers.maxPooling1d({
      poolSize: 2,
      padding: 'same'
    }).apply(conv2) as tf.SymbolicTensor;

    // Global average pooling
    const globalAvg = tf.layers.globalAveragePooling1d().apply(pool2) as tf.SymbolicTensor;

    // Dense layers
    const dense1 = tf.layers.dense({
      units: 32,
      activation: 'relu'
    }).apply(globalAvg) as tf.SymbolicTensor;

    const dropout = tf.layers.dropout({ rate: 0.3 }).apply(dense1) as tf.SymbolicTensor;

    const output = tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }).apply(dropout) as tf.SymbolicTensor;

    this.model = tf.model({ inputs: input, outputs: output });
    
    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    this.isCompiled = true;
    return this.model;
  }

  /**
   * Make prediction on input tensor
   * @param input tf.Tensor1D with shape [inputSize]
   * @returns Promise<number> - confidence score 0-1
   */
  async predict(input: tf.Tensor1D): Promise<number> {
    if (!this.model) {
      throw new Error('Model not initialized. Call initializeModel() first.');
    }

    return tf.tidy(() => {
      const batch = input.expandDims(0);  // Add batch dimension
      const prediction = this.model!.predict(batch) as tf.Tensor;
      const value = prediction.dataSync()[0];
      prediction.dispose();
      return value;
    });
  }

  /**
   * Make batch predictions
   * @param inputs tf.Tensor2D with shape [batchSize, inputSize]
   * @returns Promise<Float32Array> - confidence scores for each input
   */
  async predictBatch(inputs: tf.Tensor2D): Promise<Float32Array> {
    if (!this.model) {
      throw new Error('Model not initialized. Call initializeModel() first.');
    }

    return tf.tidy(() => {
      const predictions = this.model!.predict(inputs) as tf.Tensor;
      const values = predictions.dataSync();
      predictions.dispose();
      return new Float32Array(values);
    });
  }

  /**
   * Train the model on data
   */
  async train(
    xTrain: tf.Tensor2D,
    yTrain: tf.Tensor2D,
    options: {
      epochs?: number;
      batchSize?: number;
      validationSplit?: number;
    } = {}
  ): Promise<tf.History> {
    if (!this.model) {
      throw new Error('Model not initialized. Call initializeModel() first.');
    }

    const { epochs = 10, batchSize = 32, validationSplit = 0.2 } = options;

    return this.model.fit(xTrain, yTrain, {
      epochs,
      batchSize,
      validationSplit,
      verbose: 1
    });
  }

  /**
   * Evaluate model on test data
   */
  async evaluate(xTest: tf.Tensor2D, yTest: tf.Tensor2D): Promise<number[]> {
    if (!this.model) {
      throw new Error('Model not initialized. Call initializeModel() first.');
    }

    return tf.tidy(() => {
      const result = this.model!.evaluate(xTest, yTest) as tf.Tensor[];
      const values = result.map(t => (t as tf.Tensor).dataSync()[0]);
      result.forEach(t => (t as tf.Tensor).dispose());
      return values;
    });
  }

  /**
   * Save model to JSON
   */
  async save(path: string): Promise<void> {
    if (!this.model) {
      throw new Error('Model not initialized.');
    }
    await this.model.save(`file://${path}`);
  }

  /**
   * Load model from JSON
   */
  async load(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}/model.json`);
  }

  /**
   * Get model summary
   */
  summary(): void {
    if (this.model) {
      this.model.summary();
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

/**
 * Factory function to create and initialize CNN model
 */
export async function createCNNModel(inputSize: number = 1000): Promise<CNNModel> {
  const model = new CNNModel();
  await model.initializeModel(inputSize);
  return model;
}
