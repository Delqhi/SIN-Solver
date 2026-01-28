import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-layers';

/**
 * MLPreprocessor: Converts HTML/Text content to ML-ready vectors
 * 
 * Features:
 * - HTML parsing and cleaning
 * - Text tokenization
 * - Vector representation (TF-IDF inspired)
 * - Feature extraction for CNN/LSTM models
 */
export class MLPreprocessor {
  private vocab: Map<string, number> = new Map();
  private vocabSize: number = 1000;
  private sequenceLength: number = 100;

  constructor(vocabSize: number = 1000, sequenceLength: number = 100) {
    this.vocabSize = vocabSize;
    this.sequenceLength = sequenceLength;
    this.initializeDefaultVocab();
  }

  /**
   * Initialize a default vocabulary for common web elements
   */
  private initializeDefaultVocab(): void {
    const commonTokens = [
      'captcha', 'recaptcha', 'challenge', 'verification', 'verify',
      'honeypot', 'trap', 'decoy', 'fake', 'hidden', 'invisible',
      'phishing', 'spoof', 'clone', 'login', 'submit', 'click',
      'button', 'form', 'input', 'password', 'username', 'email',
      'suspicious', 'warning', 'danger', 'alert', 'error',
      'script', 'redirect', 'popup', 'overlay', 'modal'
    ];

    commonTokens.forEach((token, index) => {
      this.vocab.set(token.toLowerCase(), index + 1);
    });
  }

  /**
   * Preprocess HTML content to vector representation
   * @param htmlContent HTML string
   * @returns tf.Tensor1D (vector of size vocabSize)
   */
  preprocessContent(htmlContent: string): tf.Tensor1D {
    // Extract text from HTML
    const cleanText = this.extractTextFromHTML(htmlContent);
    
    // Tokenize
    const tokens = this.tokenize(cleanText);
    
    // Convert tokens to indices
    const indices = tokens.map(token => 
      this.vocab.get(token.toLowerCase()) || 0
    );

    // Pad or truncate to vocabSize
    const vector = new Array(this.vocabSize).fill(0);
    indices.slice(0, this.vocabSize).forEach((idx, i) => {
      vector[i] = idx;
    });

    return tf.tensor1d(vector, 'float32');
  }

  /**
   * Convert interaction history to sequence tensor for LSTM
   * @param interactions Array of interaction records
   * @returns tf.Tensor2D (shape: [sequenceLength, featureDim])
   */
  sequenceFromInteractions(interactions: Array<{
    action: string;
    timestamp: number;
    x?: number;
    y?: number;
    metadata?: Record<string, unknown>;
  }>): tf.Tensor2D {
    const features = interactions.slice(0, this.sequenceLength).map(interaction => {
      const features = [
        this.actionToFeature(interaction.action),
        (interaction.x || 0) / 1000,  // Normalize coordinates
        (interaction.y || 0) / 1000,
        (interaction.metadata?.confidence as number) || 0
      ];
      return features;
    });

    // Pad with zeros if needed
    while (features.length < this.sequenceLength) {
      features.push([0, 0, 0, 0]);
    }

    return tf.tensor2d(features, [this.sequenceLength, 4], 'float32');
  }

  /**
   * Extract text content from HTML
   */
  private extractTextFromHTML(html: string): string {
    // Remove script and style tags
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ');  // Remove remaining tags

    // Decode entities
    text = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    return text.toLowerCase();
  }

  /**
   * Simple tokenization (split by whitespace and punctuation)
   */
  private tokenize(text: string): string[] {
    return text
      .split(/[\s\W]+/)
      .filter(token => token.length > 0);
  }

  /**
   * Convert action string to numeric feature
   */
  private actionToFeature(action: string): number {
    const actionMap: Record<string, number> = {
      'CLICK': 1.0,
      'HOVER': 0.5,
      'SCROLL': 0.3,
      'INPUT': 0.7,
      'SUBMIT': 1.0,
      'UNKNOWN': 0.1
    };
    return actionMap[action] || 0.1;
  }

  /**
   * Add custom tokens to vocabulary
   */
  addTokens(tokens: string[]): void {
    tokens.forEach(token => {
      const idx = this.vocab.size + 1;
      if (idx <= this.vocabSize && !this.vocab.has(token.toLowerCase())) {
        this.vocab.set(token.toLowerCase(), idx);
      }
    });
  }

  /**
   * Get current vocabulary
   */
  getVocab(): Map<string, number> {
    return new Map(this.vocab);
  }
}

/**
 * Export preprocessor instance
 */
export const defaultPreprocessor = new MLPreprocessor(1000, 100);
