import { IDeceptionHunterPattern, IDeceptionHunterResult, IClickVerification } from '../types';
import { StateMachine } from '../state-machine';
import { MLPreprocessor } from './preprocessor';
import { CNNModel, createCNNModel } from './cnn-model';
import { LSTMModel, createLSTMModel } from './lstm-model';
import { EnsembleModel, createEnsembleModel } from './ensemble';
import * as tf from '@tensorflow/tfjs';

/**
 * MLDeceptionHunter: Hybrid Regex + ML-based deception detection
 * 
 * Combines:
 * - Original regex patterns (40% weight)
 * - CNN for visual pattern detection (60% weight via ML)
 * - LSTM for sequence analysis (included in ML score)
 * - Ensemble voting for final verdict
 */
export class MLDeceptionHunter {
  private baseHunterPatterns: IDeceptionHunterPattern[] = [];
  private state_machine: StateMachine;
  private preprocessor: MLPreprocessor;
  private cnnModel: CNNModel | null = null;
  private lstmModel: LSTMModel | null = null;
  private ensemble: EnsembleModel | null = null;
  private mlEnabled: boolean = false;

  constructor(stateMachine: StateMachine) {
    this.state_machine = stateMachine;
    this.preprocessor = new MLPreprocessor(1000, 100);
    this.initializePredefinedPatterns();
  }

  private initializePredefinedPatterns(): void {
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
   * Initialize ML models (one-time setup)
   */
  async initializeML(): Promise<void> {
    if (this.mlEnabled) return;

    this.cnnModel = await createCNNModel(1000);
    this.lstmModel = await createLSTMModel(100, 4);
    this.ensemble = await createEnsembleModel(
      this.cnnModel as CNNModel,
      this.lstmModel as LSTMModel
    );

    this.mlEnabled = true;
    console.log('✅ ML Models initialized successfully');
  }

  /**
   * Analyze with ML support
   */
  async analyzeWithML(
    page_content: string,
    interaction_history: Array<{
      action: string;
      timestamp: number;
      x?: number;
      y?: number;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<{
    regex_score: number;
    ml_score: number;
    final_score: number;
    confidence: number;
    verdict: 'SAFE' | 'LOW_RISK' | 'MEDIUM' | 'HIGH_THREAT';
    matched_patterns: IDeceptionHunterPattern[];
    cnn_score?: number;
    lstm_score?: number;
  }> {
    if (!this.mlEnabled) {
      throw new Error('ML not initialized. Call initializeML() first.');
    }

    const regexScore = this.analyzeRegex(page_content);
    const matchedPatterns = this.analyze(page_content);

    let cnnScore = 0;
    let lstmScore = 0;
    let mlScore = 0;

    if (this.cnnModel && this.lstmModel && this.ensemble) {
      const contentVector = this.preprocessor.preprocessContent(page_content);
      cnnScore = await (this.cnnModel as CNNModel).predict(contentVector);
      contentVector.dispose();

      if (interaction_history.length > 0) {
        const sequenceTensor = this.preprocessor.sequenceFromInteractions(interaction_history);
        lstmScore = await (this.lstmModel as LSTMModel).predict(sequenceTensor);
        sequenceTensor.dispose();
      }

      mlScore = await (this.ensemble as EnsembleModel).predict(cnnScore, lstmScore, regexScore);
    }

    const finalScore = (regexScore * 0.40) + (mlScore * 100 * 0.60);
    const confidence = Math.min(1.0, finalScore / 100);
    const verdict = (this.ensemble as EnsembleModel).getVerdict(confidence);

    return {
      regex_score: regexScore,
      ml_score: mlScore * 100,
      final_score: finalScore,
      confidence,
      verdict,
      matched_patterns: matchedPatterns,
      cnn_score: cnnScore * 100,
      lstm_score: lstmScore * 100
    };
  }

  /**
   * Original regex-based analysis (backward compatible)
   */
  analyze(page_content: string): IDeceptionHunterPattern[] {
    const matched: IDeceptionHunterPattern[] = [];

    for (const pattern of this.baseHunterPatterns) {
      try {
        const regexStr = pattern.regex.toString();
        const regexMatch = regexStr.match(/^\/(.+)\/([gimuy]*)$/);

        if (regexMatch) {
          const [, source, flags] = regexMatch;
          const regex = new RegExp(source, flags);

          if (regex.test(page_content)) {
            matched.push(pattern);
          }
        }
      } catch (error) {
        console.error(`Error testing pattern ${pattern.type}:`, error);
      }
    }

    return matched;
  }

  /**
   * Calculate pure regex score
   */
  private analyzeRegex(page_content: string): number {
    const matched = this.analyze(page_content);
    if (matched.length === 0) return 0;

    let score = 0;
    for (const pattern of matched) {
      switch (pattern.severity) {
        case 'high':
          score += 30;
          break;
        case 'medium':
          score += 20;
          break;
        case 'low':
          score += 10;
          break;
      }
    }

    return Math.min(100, score);
  }

  addPattern(pattern: IDeceptionHunterPattern): void {
    this.baseHunterPatterns.push(pattern);
  }

  /**
   * Cleanup ML resources
   */
  dispose(): void {
    if (this.cnnModel) (this.cnnModel as CNNModel).dispose();
    if (this.lstmModel) (this.lstmModel as LSTMModel).dispose();
    if (this.ensemble) (this.ensemble as EnsembleModel).dispose();
    this.mlEnabled = false;
  }
}

export async function createMLDeceptionHunter(
  stateMachine: StateMachine,
  initializeML: boolean = false
): Promise<MLDeceptionHunter> {
  const hunter = new MLDeceptionHunter(stateMachine);
  if (initializeML) {
    await hunter.initializeML();
  }
  return hunter;
}
