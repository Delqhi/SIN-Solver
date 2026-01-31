import * as fs from 'fs';

export interface DetectionResult {
  type: string;
  confidence: number;
  features: string[];
}

export interface ImageAnalysis {
  width: number;
  height: number;
  aspectRatio: number;
  hasText: boolean;
  hasGridPattern: boolean;
  colorDistribution: Record<string, number>;
  edgeDensity: number;
}

export interface DOMElement {
  tagName: string;
  className?: string;
  id?: string;
  attributes?: Record<string, string>;
  children?: DOMElement[];
  textContent?: string;
}

export class CaptchaTypeDetector {
  private lastConfidence = 0;
  private detectedFeatures: string[] = [];

  /**
   * Analyzes image data to determine CAPTCHA type
   * @param imageData - Buffer containing image data
   * @returns Promise resolving to detected CAPTCHA type
   */
  async analyzeImage(imageData: Buffer): Promise<string> {
    this.detectedFeatures = [];
    
    try {
      const analysis = await this.performImageAnalysis(imageData);
      
      const scores = this.calculateTypeScores(analysis);
      
      const bestMatch = this.findBestMatch(scores);
      
      this.lastConfidence = bestMatch.confidence;
      this.detectedFeatures = bestMatch.features;
      
      return bestMatch.type;
    } catch (error) {
      console.error('Image analysis failed:', error);
      this.lastConfidence = 0;
      return 'unknown';
    }
  }

  /**
   * Analyzes DOM elements to determine CAPTCHA type
   * @param elements - Array of DOM elements to analyze
   * @returns Promise resolving to detected CAPTCHA type
   */
  async analyzeDOM(elements: DOMElement[]): Promise<string> {
    this.detectedFeatures = [];
    
    try {
      const domFeatures = this.extractDOMFeatures(elements);
      
      const scores = this.calculateDOMTypeScores(domFeatures);
      
      const bestMatch = this.findBestMatch(scores);
      
      this.lastConfidence = bestMatch.confidence;
      this.detectedFeatures = [...this.detectedFeatures, ...bestMatch.features];
      
      return bestMatch.type;
    } catch (error) {
      console.error('DOM analysis failed:', error);
      this.lastConfidence = 0;
      return 'unknown';
    }
  }

  /**
   * Gets the confidence score from the last detection
   * @returns Confidence score between 0 and 1
   */
  getConfidence(): number {
    return this.lastConfidence;
  }

  /**
   * Gets the features detected in the last analysis
   * @returns Array of detected feature names
   */
  getDetectedFeatures(): string[] {
    return [...this.detectedFeatures];
  }

  private async performImageAnalysis(imageData: Buffer): Promise<ImageAnalysis> {
    const width = 300;
    const height = 150;
    
    const analysis: ImageAnalysis = {
      width,
      height,
      aspectRatio: width / height,
      hasText: this.detectTextPatterns(imageData),
      hasGridPattern: this.detectGridPattern(imageData),
      colorDistribution: this.analyzeColorDistribution(imageData),
      edgeDensity: this.calculateEdgeDensity(imageData),
    };
    
    return analysis;
  }

  private detectTextPatterns(imageData: Buffer): boolean {
    const sampleSize = Math.min(imageData.length, 1000);
    let textLikePatterns = 0;
    
    for (let i = 0; i < sampleSize - 1; i++) {
      const diff = Math.abs(imageData[i] - imageData[i + 1]);
      if (diff > 20 && diff < 100) {
        textLikePatterns++;
      }
    }
    
    const ratio = textLikePatterns / sampleSize;
    return ratio > 0.1 && ratio < 0.5;
  }

  private detectGridPattern(imageData: Buffer): boolean {
    const sampleInterval = 100;
    let gridLikePatterns = 0;
    
    for (let i = 0; i < imageData.length - sampleInterval; i += sampleInterval) {
      const row1 = imageData[i];
      const row2 = imageData[i + sampleInterval];
      
      if (Math.abs(row1 - row2) < 30) {
        gridLikePatterns++;
      }
    }
    
    const ratio = gridLikePatterns / (imageData.length / sampleInterval);
    return ratio > 0.7;
  }

  private analyzeColorDistribution(imageData: Buffer): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (let i = 0; i < imageData.length; i += 3) {
      const r = imageData[i] || 0;
      const g = imageData[i + 1] || 0;
      const b = imageData[i + 2] || 0;
      
      const brightness = Math.round((r + g + b) / 3 / 51) * 51;
      const key = `brightness_${brightness}`;
      
      distribution[key] = (distribution[key] || 0) + 1;
    }
    
    return distribution;
  }

  private calculateEdgeDensity(imageData: Buffer): number {
    let edges = 0;
    const threshold = 50;
    
    for (let i = 0; i < imageData.length - 1; i++) {
      if (Math.abs(imageData[i] - imageData[i + 1]) > threshold) {
        edges++;
      }
    }
    
    return edges / imageData.length;
  }

  private calculateTypeScores(analysis: ImageAnalysis): Record<string, { score: number; features: string[] }> {
    const scores: Record<string, { score: number; features: string[] }> = {
      text: { score: 0, features: [] },
      'image-grid': { score: 0, features: [] },
      slider: { score: 0, features: [] },
      click: { score: 0, features: [] },
      audio: { score: 0, features: [] },
    };

    if (analysis.hasText && analysis.edgeDensity > 0.1 && analysis.edgeDensity < 0.4) {
      scores.text.score += 0.4;
      scores.text.features.push('text_patterns');
    }

    if (analysis.aspectRatio > 2 && analysis.aspectRatio < 4) {
      scores.text.score += 0.2;
      scores.text.features.push('typical_text_captcha_aspect_ratio');
    }

    if (analysis.hasGridPattern) {
      scores['image-grid'].score += 0.5;
      scores['image-grid'].features.push('grid_pattern');
    }

    if (analysis.width >= 300 && analysis.height >= 300) {
      scores['image-grid'].score += 0.2;
      scores['image-grid'].features.push('large_square_dimensions');
    }

    if (analysis.aspectRatio > 3 && analysis.edgeDensity < 0.2) {
      scores.slider.score += 0.4;
      scores.slider.features.push('wide_low_edge_density');
    }

    const colorKeys = Object.keys(analysis.colorDistribution);
    if (colorKeys.length > 5) {
      scores.click.score += 0.2;
      scores.click.features.push('multiple_colors');
    }

    if (analysis.edgeDensity > 0.3) {
      scores.click.score += 0.2;
      scores.click.features.push('high_edge_complexity');
    }

    return scores;
  }

  private extractDOMFeatures(elements: DOMElement[]): {
    hasAudioElement: boolean;
    hasSliderElement: boolean;
    hasGridContainer: boolean;
    hasClickableElements: boolean;
    hasCanvas: boolean;
    hasReCaptcha: boolean;
    hasHCaptcha: boolean;
    instructionText: string;
  } {
    const features = {
      hasAudioElement: false,
      hasSliderElement: false,
      hasGridContainer: false,
      hasClickableElements: false,
      hasCanvas: false,
      hasReCaptcha: false,
      hasHCaptcha: false,
      instructionText: '',
    };

    const traverseElements = (elems: DOMElement[]) => {
      for (const elem of elems) {
        this.analyzeElement(elem, features);
        
        if (elem.children) {
          traverseElements(elem.children);
        }
      }
    };

    traverseElements(elements);
    
    return features;
  }

  private analyzeElement(
    element: DOMElement,
    features: {
      hasAudioElement: boolean;
      hasSliderElement: boolean;
      hasGridContainer: boolean;
      hasClickableElements: boolean;
      hasCanvas: boolean;
      hasReCaptcha: boolean;
      hasHCaptcha: boolean;
      instructionText: string;
    }
  ): void {
    const tag = element.tagName?.toLowerCase();
    const className = element.className?.toLowerCase() || '';
    const id = element.id?.toLowerCase() || '';
    const text = element.textContent?.toLowerCase() || '';

    if (tag === 'audio' || className.includes('audio') || id.includes('audio')) {
      features.hasAudioElement = true;
    }

    if (
      className.includes('slider') ||
      id.includes('slider') ||
      className.includes('puzzle') ||
      id.includes('puzzle')
    ) {
      features.hasSliderElement = true;
    }

    if (
      className.includes('grid') ||
      id.includes('grid') ||
      className.includes('tile') ||
      id.includes('tile')
    ) {
      features.hasGridContainer = true;
    }

    if (tag === 'canvas') {
      features.hasCanvas = true;
    }

    if (className.includes('g-recaptcha') || id.includes('recaptcha')) {
      features.hasReCaptcha = true;
    }

    if (className.includes('h-captcha') || id.includes('hcaptcha')) {
      features.hasHCaptcha = true;
    }

    if (
      text.includes('click') ||
      text.includes('select') ||
      text.includes('verify')
    ) {
      features.instructionText = text;
    }

    if (
      tag === 'button' ||
      tag === 'a' ||
      element.attributes?.onclick ||
      className.includes('clickable')
    ) {
      features.hasClickableElements = true;
    }
  }

  private calculateDOMTypeScores(domFeatures: {
    hasAudioElement: boolean;
    hasSliderElement: boolean;
    hasGridContainer: boolean;
    hasClickableElements: boolean;
    hasCanvas: boolean;
    hasReCaptcha: boolean;
    hasHCaptcha: boolean;
    instructionText: string;
  }): Record<string, { score: number; features: string[] }> {
    const scores: Record<string, { score: number; features: string[] }> = {
      text: { score: 0, features: [] },
      'image-grid': { score: 0, features: [] },
      slider: { score: 0, features: [] },
      click: { score: 0, features: [] },
      audio: { score: 0, features: [] },
    };

    if (domFeatures.hasAudioElement) {
      scores.audio.score += 0.6;
      scores.audio.features.push('audio_element_present');
    }

    if (domFeatures.hasSliderElement) {
      scores.slider.score += 0.5;
      scores.slider.features.push('slider_element_present');
    }

    if (domFeatures.hasGridContainer) {
      scores['image-grid'].score += 0.4;
      scores['image-grid'].features.push('grid_container_present');
    }

    if (domFeatures.hasCanvas && domFeatures.hasClickableElements) {
      scores.click.score += 0.3;
      scores.click.features.push('canvas_with_clickable_elements');
    }

    if (domFeatures.hasReCaptcha) {
      scores['image-grid'].score += 0.3;
      scores['image-grid'].features.push('recaptcha_detected');
    }

    if (domFeatures.hasHCaptcha) {
      scores['image-grid'].score += 0.3;
      scores['image-grid'].features.push('hcaptcha_detected');
    }

    const instruction = domFeatures.instructionText;
    if (instruction.includes('car') || instruction.includes('traffic') || instruction.includes('bridge')) {
      scores['image-grid'].score += 0.3;
      scores['image-grid'].features.push('image_selection_instruction');
    }

    if (instruction.includes('click') || instruction.includes('order')) {
      scores.click.score += 0.3;
      scores.click.features.push('click_instruction');
    }

    if (instruction.includes('drag') || instruction.includes('slide')) {
      scores.slider.score += 0.3;
      scores.slider.features.push('drag_instruction');
    }

    if (domFeatures.hasCanvas && !domFeatures.hasGridContainer) {
      scores.text.score += 0.2;
      scores.text.features.push('canvas_without_grid');
    }

    return scores;
  }

  private findBestMatch(
    scores: Record<string, { score: number; features: string[] }>
  ): { type: string; confidence: number; features: string[] } {
    let bestType = 'unknown';
    let bestScore = 0;
    let bestFeatures: string[] = [];

    for (const [type, data] of Object.entries(scores)) {
      if (data.score > bestScore) {
        bestScore = data.score;
        bestType = type;
        bestFeatures = data.features;
      }
    }

    const confidence = Math.min(bestScore, 0.95);
    
    if (confidence < 0.2) {
      return { type: 'unknown', confidence: 0, features: [] };
    }

    return { type: bestType, confidence, features: bestFeatures };
  }
}

export default CaptchaTypeDetector;
