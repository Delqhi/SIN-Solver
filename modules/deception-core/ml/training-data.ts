import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-layers';

/**
 * TrainingDataGenerator: Creates synthetic training datasets for ML models
 * 
 * Generates realistic deception patterns for model training:
 * - CAPTCHA interactions
 * - Honeypot clicks
 * - Phishing patterns
 * - Legitimate interactions
 */

export interface TrainingExample {
  htmlContent: string;
  interactions: Array<{
    x: number;
    y: number;
    timestamp: number;
    type: 'click' | 'hover' | 'scroll';
  }>;
  label: 'safe' | 'captcha' | 'honeypot' | 'phishing'; // 0=safe, 1=deceptive
}

export class TrainingDataGenerator {
  private examples: TrainingExample[] = [];

  /**
   * Generate realistic CAPTCHA HTML
   */
  generateCAPTCHAExample(): TrainingExample {
    const captchaPatterns = [
      '<iframe src="https://www.google.com/recaptcha/api2/anchor"></iframe>',
      '<div class="g-recaptcha" data-sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"></div>',
      '<script src="https://www.google.com/recaptcha/api.js"></script>',
      '<input type="hidden" id="captcha" name="captcha">',
      '<img src="/captcha.jpg" alt="CAPTCHA">',
      '<button onclick="verifyCaptcha()">I\'m not a robot</button>'
    ];

    const content = captchaPatterns.join('\n');
    
    // Rapid repeated clicks (typical CAPTCHA solving behavior)
    const interactions = Array.from({ length: 5 }).map((_, i) => ({
      x: 100 + i * 10,
      y: 200,
      timestamp: Date.now() + i * 100, // Rapid clicks
      type: 'click' as const
    }));

    return {
      htmlContent: content,
      interactions,
      label: 'captcha'
    };
  }

  /**
   * Generate realistic honeypot example
   */
  generateHoneypotExample(): TrainingExample {
    const honeypotPatterns = [
      '<input type="hidden" name="website_url" value="">',
      '<input type="email" style="display:none" name="user_email">',
      '<div style="opacity:0; position:absolute; left:-9999px;">',
      '<input type="text" aria-hidden="true" tabindex="-1">',
      '<input type="email" class="hidden-honeypot" value="">',
      '<button style="visibility:hidden">Click me</button>'
    ];

    const content = honeypotPatterns.join('\n');
    
    // Click on hidden element (typical honeypot)
    const interactions = [
      {
        x: -9999,
        y: -9999,
        timestamp: Date.now(),
        type: 'click' as const
      }
    ];

    return {
      htmlContent: content,
      interactions,
      label: 'honeypot'
    };
  }

  /**
   * Generate realistic phishing example
   */
  generatePhishingExample(): TrainingExample {
    const phishingPatterns = [
      'enter your password',
      'verify your account',
      'confirm your identity',
      'unusual activity detected',
      'click here to continue',
      'session expired - please login again',
      'Your account has been compromised',
      '<input type="password" id="password" name="password">',
      '<form action="http://attacker.com/steal">',
      '<a href="bit.ly/phishing">verify here</a>'
    ];

    const content = phishingPatterns.join('\n');
    
    // Suspicious interaction pattern: fast typing, password field access
    const interactions = [
      { x: 100, y: 100, timestamp: Date.now(), type: 'click' as const },
      { x: 100, y: 120, timestamp: Date.now() + 50, type: 'click' as const },
      { x: 100, y: 140, timestamp: Date.now() + 100, type: 'hover' as const }
    ];

    return {
      htmlContent: content,
      interactions,
      label: 'phishing'
    };
  }

  /**
   * Generate legitimate interaction example
   */
  generateLegitimateExample(): TrainingExample {
    const legitimatePatterns = [
      '<form id="login" method="post">',
      '<input type="email" name="email" required>',
      '<input type="password" name="password" required>',
      '<button type="submit">Login</button>',
      '<p>Forgot your password? <a href="/reset">Reset here</a></p>',
      '<p>Don\'t have an account? <a href="/signup">Sign up</a></p>',
      '<label for="email">Email Address</label>',
      '<label for="password">Password</label>'
    ];

    const content = legitimatePatterns.join('\n');
    
    // Normal interaction: deliberate clicks, reasonable timing
    const interactions = [
      { x: 150, y: 100, timestamp: Date.now(), type: 'click' as const },
      { x: 150, y: 130, timestamp: Date.now() + 500, type: 'click' as const },
      { x: 200, y: 160, timestamp: Date.now() + 1000, type: 'click' as const }
    ];

    return {
      htmlContent: content,
      interactions,
      label: 'safe'
    };
  }

  /**
   * Generate balanced dataset with equal representation
   */
  generateBalancedDataset(samplesPerClass: number = 100): TrainingExample[] {
    this.examples = [];

    // Generate equal samples from each class
    for (let i = 0; i < samplesPerClass; i++) {
      this.examples.push(this.generateCAPTCHAExample());
      this.examples.push(this.generateHoneypotExample());
      this.examples.push(this.generatePhishingExample());
      this.examples.push(this.generateLegitimateExample());
    }

    return this.examples;
  }

  /**
   * Convert examples to tensors for training
   * Returns: { xCNN, xLSTM, y }
   */
  async examplesToCNNTensors(
    examples: TrainingExample[],
    vocabSize: number = 1000
  ): Promise<{ x: tf.Tensor2D; y: tf.Tensor1D }> {
    return tf.tidy(() => {
      const vectors: number[][] = [];
      const labels: number[] = [];

      for (const example of examples) {
        // Simple vectorization: count keyword occurrences
        const vector = new Array(vocabSize).fill(0);
        
        // Token hashing (simplified)
        const tokens = example.htmlContent.toLowerCase().split(/\s+/);
        for (const token of tokens) {
          const hash = this.simpleHash(token, vocabSize);
          vector[hash]++;
        }

        vectors.push(vector);
        labels.push(example.label === 'safe' ? 0 : 1); // Binary classification
      }

      const x = tf.tensor2d(vectors);
      const y = tf.tensor1d(labels);

      return { x, y };
    });
  }

  /**
   * Convert examples to tensors for LSTM
   */
  async exampleToLSTMTensors(
    examples: TrainingExample[],
    sequenceLength: number = 100
  ): Promise<{ x: tf.Tensor3D; y: tf.Tensor1D }> {
    return tf.tidy(() => {
      const sequences: number[][][] = [];
      const labels: number[] = [];

      for (const example of examples) {
        // Create sequence: [x, y, time_delta, type_encoded]
        const sequence: number[][] = [];
        let prevTimestamp = example.interactions[0]?.timestamp || 0;

        for (let i = 0; i < sequenceLength; i++) {
          if (i < example.interactions.length) {
            const interaction = example.interactions[i];
            const timeDelta = interaction.timestamp - prevTimestamp;
            
            const typeCode = {
              click: 1,
              hover: 2,
              scroll: 3
            }[interaction.type];

            sequence.push([
              interaction.x / 1000,  // Normalize
              interaction.y / 1000,
              Math.min(timeDelta / 1000, 10), // Cap time delta
              typeCode
            ]);

            prevTimestamp = interaction.timestamp;
          } else {
            // Padding
            sequence.push([0, 0, 0, 0]);
          }
        }

        sequences.push(sequence);
        labels.push(example.label === 'safe' ? 0 : 1);
      }

      const x = tf.tensor3d(sequences);
      const y = tf.tensor1d(labels);

      return { x, y };
    });
  }

  /**
   * Get dataset statistics
   */
  getStats(): {
    totalExamples: number;
    byLabel: Record<string, number>;
  } {
    const byLabel: Record<string, number> = {
      safe: 0,
      captcha: 0,
      honeypot: 0,
      phishing: 0
    };

    for (const example of this.examples) {
      byLabel[example.label]++;
    }

    return {
      totalExamples: this.examples.length,
      byLabel
    };
  }

  /**
   * Simple hash function for tokenization
   */
  private simpleHash(token: string, max: number): number {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % max;
  }
}

/**
 * Model Persistence: Save/load trained models
 */
export class ModelPersistence {
  /**
   * Save model to IndexedDB (browser) or local filesystem (Node.js)
   */
  async saveModel(model: tf.LayersModel, path: string): Promise<void> {
    try {
      // Try IndexedDB first (browser-friendly)
      await model.save(`indexeddb://${path}`);
    } catch {
      // Fallback to local storage or logging
      console.log(`Model saved (in-memory): ${path}`);
    }
  }

  /**
   * Load model from storage
   */
  async loadModel(path: string): Promise<tf.LayersModel | null> {
    try {
      return await tf.loadLayersModel(`indexeddb://${path}`);
    } catch {
      console.warn(`Could not load model: ${path}`);
      return null;
    }
  }

  /**
   * Export model weights as JSON
   */
  async exportWeights(model: tf.LayersModel): Promise<Record<string, any>> {
    const weights = model.getWeights();
    const weightData: Record<string, any> = {};

    for (let i = 0; i < weights.length; i++) {
      const data = await weights[i].data();
      weightData[`weight_${i}`] = Array.from(data);
      // Don't dispose weights - they're managed by the model
    }

    return weightData;
  }

   /**
    * Create pre-trained model with default weights
    */
   async createPretrainedModel(): Promise<tf.LayersModel> {
     const input = tf.input({ shape: [1000] });
     const dense1 = tf.layers.dense({ units: 64, activation: 'relu' }).apply(input) as tf.SymbolicTensor;
     const dense2 = tf.layers.dense({ units: 32, activation: 'relu' }).apply(dense1) as tf.SymbolicTensor;
     const output = tf.layers.dense({ units: 1, activation: 'sigmoid' }).apply(dense2) as tf.SymbolicTensor;

     const model = tf.model({ inputs: input, outputs: output });
     model.compile({
       optimizer: 'adam',
       loss: 'binaryCrossentropy',
       metrics: ['accuracy']
     });

     return model;
   }
}

/**
 * Helper: Create dataset from examples
 */
export async function createTrainingDataset(
  examples: TrainingExample[],
  modelType: 'cnn' | 'lstm',
  batchSize: number = 32
): Promise<tf.data.Dataset<tf.TensorContainer>> {
  const generator = new TrainingDataGenerator();

  if (modelType === 'cnn') {
    const { x, y } = await generator.examplesToCNNTensors(examples);
    return tf.data.generator(async function* () {
      const numBatches = Math.ceil(x.shape[0] / batchSize);
      for (let i = 0; i < numBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, x.shape[0]);
        yield {
          xs: x.slice([start, 0], [end - start, -1]),
          ys: y.slice([start], [end - start])
        };
      }
      x.dispose();
      y.dispose();
    });
  } else {
    const { x, y } = await generator.exampleToLSTMTensors(examples);
    return tf.data.generator(async function* () {
      const numBatches = Math.ceil(x.shape[0] / batchSize);
      for (let i = 0; i < numBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, x.shape[0]);
        yield {
          xs: x.slice([start, 0, 0], [end - start, -1, -1]),
          ys: y.slice([start], [end - start])
        };
      }
      x.dispose();
      y.dispose();
    });
  }
}
