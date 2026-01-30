/**
 * Humanizer Module
 * 
 * Simulates human-like behavior patterns to avoid bot detection:
 * - Variable response times (Gaussian normal distribution)
 * - Typo simulation with backspace correction
 * - Mouse trajectories with natural variation
 * - Random delays between actions
 * 
 * All timing uses Gaussian (normal) distribution for realistic variation
 */

import { EventEmitter } from 'events';

/**
 * Humanizer configuration
 */
export interface HumanizerConfig {
  // Gaussian delay parameters (in milliseconds)
  // Mean = average delay, StdDev = variation
  actionDelayMean: number;
  actionDelayStdDev: number;
  minActionDelay: number;
  maxActionDelay: number;
  
  // Typing parameters
  typingDelayMean: number;
  typingDelayStdDev: number;
  minTypingDelay: number;
  maxTypingDelay: number;
  typoRate: number; // 0-1 probability of making a typo
  typoCorrectionDelayMean: number;
  
  // Mouse movement parameters
  mouseSpeedMean: number; // pixels per millisecond
  mouseSpeedStdDev: number;
  mouseOvershootProbability: number; // Chance to overshoot target
  mouseWobbleAmplitude: number; // Pixels of natural hand tremor
  
  // Thinking pauses
  thinkingPauseProbability: number;
  thinkingPauseMean: number;
  thinkingPauseStdDev: number;
  
  // Scroll behavior
  scrollSpeedMean: number; // pixels per scroll event
  scrollSpeedStdDev: number;
  scrollPauseProbability: number;
}

/**
 * Mouse position
 */
export interface MousePosition {
  x: number;
  y: number;
}

/**
 * Element bounding box
 */
export interface ElementBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Typo simulation result
 */
export interface TypoSimulation {
  original: string;
  withTypos: string;
  typoPositions: number[];
  backspaceCount: number;
}

/**
 * Default humanizer configuration
 * Based on human behavior studies and UX research
 */
export const DEFAULT_HUMANIZER_CONFIG: HumanizerConfig = {
  // Action delays: mean 2.5s, stdDev 800ms (most between 1-4 seconds)
  actionDelayMean: 2500,
  actionDelayStdDev: 800,
  minActionDelay: 800,
  maxActionDelay: 8000,
  
  // Typing: mean 120ms per char, stdDev 40ms
  typingDelayMean: 120,
  typingDelayStdDev: 40,
  minTypingDelay: 50,
  maxTypingDelay: 400,
  typoRate: 0.03, // 3% typo rate
  typoCorrectionDelayMean: 300,
  
  // Mouse: mean 1.5 px/ms, stdDev 0.5
  mouseSpeedMean: 1.5,
  mouseSpeedStdDev: 0.5,
  mouseOvershootProbability: 0.15,
  mouseWobbleAmplitude: 2,
  
  // Thinking pauses: 10% chance, mean 800ms
  thinkingPauseProbability: 0.1,
  thinkingPauseMean: 800,
  thinkingPauseStdDev: 300,
  
  // Scroll: mean 100px, stdDev 30px
  scrollSpeedMean: 100,
  scrollSpeedStdDev: 30,
  scrollPauseProbability: 0.2,
};

/**
 * Humanizer class
 * Generates human-like delays, movements, and behaviors
 */
export class Humanizer extends EventEmitter {
  private config: HumanizerConfig;
  private lastActionTime: number = 0;
  private actionHistory: Array<{ action: string; delay: number; timestamp: number }> = [];

  constructor(config: Partial<HumanizerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_HUMANIZER_CONFIG, ...config };
  }

  /**
   * Generate a random number from Gaussian (normal) distribution
   * Uses Box-Muller transform
   * @param mean - The mean (average) value
   * @param stdDev - The standard deviation (spread)
   * @returns A random number following normal distribution
   */
  gaussianRandom(mean: number, stdDev: number): number {
    // Box-Muller transform
    let u = 0;
    let v = 0;
    
    // Ensure u and v are not zero
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
  }

  /**
   * Generate a random integer from Gaussian distribution within bounds
   */
  gaussianRandomInt(mean: number, stdDev: number, min: number, max: number): number {
    let value = this.gaussianRandom(mean, stdDev);
    value = Math.max(min, Math.min(max, value));
    return Math.round(value);
  }

  /**
   * Generate a human-like delay between actions
   * Uses Gaussian distribution for realistic variation
   * @returns Delay in milliseconds
   */
  generateActionDelay(): number {
    const delay = this.gaussianRandomInt(
      this.config.actionDelayMean,
      this.config.actionDelayStdDev,
      this.config.minActionDelay,
      this.config.maxActionDelay
    );
    
    this.emit('delay-generated', { 
      type: 'action', 
      delay,
      mean: this.config.actionDelayMean,
      stdDev: this.config.actionDelayStdDev,
    });
    
    return delay;
  }

  /**
   * Wait for a human-like delay
   */
  async humanDelay(): Promise<number> {
    const delay = this.generateActionDelay();
    
    this.emit('delay-start', { delay, type: 'action' });
    await this.sleep(delay);
    this.emit('delay-end', { delay, type: 'action' });
    
    this.recordAction('delay', delay);
    return delay;
  }

  /**
   * Generate typing delay for a single character
   */
  generateTypingDelay(): number {
    return this.gaussianRandomInt(
      this.config.typingDelayMean,
      this.config.typingDelayStdDev,
      this.config.minTypingDelay,
      this.config.maxTypingDelay
    );
  }

  /**
   * Simulate human-like typing with variable delays
   * @param text - The text to type
   * @returns Array of delays for each character
   */
  generateTypingPattern(text: string): number[] {
    const delays: number[] = [];
    
    for (let i = 0; i < text.length; i++) {
      let delay = this.generateTypingDelay();
      
      // Add thinking pause occasionally (after words or punctuation)
      const char = text[i];
      const prevChar = i > 0 ? text[i - 1] : '';
      
      // Higher chance of pause after space or punctuation
      if (prevChar === ' ' || prevChar === '.' || prevChar === ',') {
        if (Math.random() < this.config.thinkingPauseProbability * 2) {
          delay += this.gaussianRandomInt(
            this.config.thinkingPauseMean,
            this.config.thinkingPauseStdDev,
            200,
            3000
          );
        }
      }
      
      delays.push(delay);
    }
    
    this.emit('typing-pattern-generated', { text: text.substring(0, 20), delays });
    return delays;
  }

  /**
   * Simulate typos in text
   * @param text - Original text
   * @returns Typo simulation result
   */
  simulateTypos(text: string): TypoSimulation {
    const chars = text.split('');
    const typoPositions: number[] = [];
    
    for (let i = 0; i < chars.length; i++) {
      if (Math.random() < this.config.typoRate) {
        // Generate a typo
        const typoType = Math.random();
        
        if (typoType < 0.4) {
          // Swap adjacent characters
          if (i < chars.length - 1) {
            [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
            typoPositions.push(i);
            i++; // Skip next char as it's now part of the swap
          }
        } else if (typoType < 0.7) {
          // Double character
          chars[i] = chars[i] + chars[i];
          typoPositions.push(i);
        } else {
          // Wrong adjacent key (simplified)
          const adjacentKeys: Record<string, string> = {
            'a': 's', 's': 'a', 'd': 's', 'f': 'd', 'g': 'f',
            'h': 'g', 'j': 'h', 'k': 'j', 'l': 'k',
            'q': 'w', 'w': 'q', 'e': 'w', 'r': 'e', 't': 'r',
            'y': 't', 'u': 'y', 'i': 'u', 'o': 'i', 'p': 'o',
          };
          const wrongChar = adjacentKeys[chars[i].toLowerCase()];
          if (wrongChar) {
            chars[i] = wrongChar;
            typoPositions.push(i);
          }
        }
      }
    }
    
    const result: TypoSimulation = {
      original: text,
      withTypos: chars.join(''),
      typoPositions,
      backspaceCount: typoPositions.length,
    };
    
    this.emit('typos-simulated', result);
    return result;
  }

  /**
   * Generate a natural mouse trajectory from start to end position
   * Uses Bezier curves with human-like variation
   * @param start - Starting position
   * @param end - Target position
   * @param elementBox - Optional element box for randomization
   * @returns Array of mouse positions forming the trajectory
   */
  generateMouseTrajectory(
    start: MousePosition,
    end: MousePosition,
    elementBox?: ElementBox
  ): MousePosition[] {
    // If element box provided, randomize target within the box
    let targetX = end.x;
    let targetY = end.y;
    
    if (elementBox) {
      // Target somewhere within the element, not exactly centered
      // Use Gaussian distribution biased toward center but with spread
      const centerX = elementBox.x + elementBox.width / 2;
      const centerY = elementBox.y + elementBox.height / 2;
      const spreadX = elementBox.width * 0.3; // 30% of width
      const spreadY = elementBox.height * 0.3; // 30% of height
      
      targetX = centerX + this.gaussianRandom(0, spreadX);
      targetY = centerY + this.gaussianRandom(0, spreadY);
      
      // Clamp to element bounds
      targetX = Math.max(elementBox.x, Math.min(elementBox.x + elementBox.width, targetX));
      targetY = Math.max(elementBox.y, Math.min(elementBox.y + elementBox.height, targetY));
    }

    // Calculate distance
    const dx = targetX - start.x;
    const dy = targetY - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate number of steps based on speed
    const speed = this.gaussianRandom(
      this.config.mouseSpeedMean,
      this.config.mouseSpeedStdDev
    );
    const duration = distance / Math.max(0.5, speed);
    const steps = Math.max(10, Math.min(100, Math.floor(duration / 10)));
    
    const trajectory: MousePosition[] = [];
    
    // Generate control points for Bezier curve
    // Add some randomness to create natural curves
    const midX = (start.x + targetX) / 2;
    const midY = (start.y + targetY) / 2;
    
    // Control point offset (creates the curve)
    const curveOffset = distance * 0.2;
    const controlX = midX + this.gaussianRandom(0, curveOffset);
    const controlY = midY + this.gaussianRandom(0, curveOffset);
    
    // Generate trajectory points
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Quadratic Bezier curve
      const x = Math.pow(1 - t, 2) * start.x + 
                2 * (1 - t) * t * controlX + 
                Math.pow(t, 2) * targetX;
      const y = Math.pow(1 - t, 2) * start.y + 
                2 * (1 - t) * t * controlY + 
                Math.pow(t, 2) * targetY;
      
      // Add hand tremor (wobble)
      const wobbleX = this.gaussianRandom(0, this.config.mouseWobbleAmplitude);
      const wobbleY = this.gaussianRandom(0, this.config.mouseWobbleAmplitude);
      
      trajectory.push({
        x: Math.round(x + wobbleX),
        y: Math.round(y + wobbleY),
      });
    }
    
    // Simulate overshoot if probability hits
    if (Math.random() < this.config.mouseOvershootProbability) {
      const overshootX = targetX + dx * 0.1; // 10% overshoot
      const overshootY = targetY + dy * 0.1;
      trajectory.push({ x: Math.round(overshootX), y: Math.round(overshootY) });
      
      // Return to target
      trajectory.push({ x: Math.round(targetX), y: Math.round(targetY) });
    }
    
    this.emit('trajectory-generated', {
      start,
      end: { x: targetX, y: targetY },
      steps: trajectory.length,
      distance,
    });
    
    return trajectory;
  }

  /**
   * Generate scroll amount with human-like variation
   */
  generateScrollAmount(): number {
    const amount = this.gaussianRandom(
      this.config.scrollSpeedMean,
      this.config.scrollSpeedStdDev
    );
    return Math.round(amount);
  }

  /**
   * Decide if a thinking pause should occur
   */
  shouldPauseForThinking(): boolean {
    return Math.random() < this.config.thinkingPauseProbability;
  }

  /**
   * Generate thinking pause duration
   */
  generateThinkingPause(): number {
    return this.gaussianRandomInt(
      this.config.thinkingPauseMean,
      this.config.thinkingPauseStdDev,
      200,
      5000
    );
  }

  /**
   * Execute a human-like typing sequence with optional typos
   * @param typeFn - Function to type a character
   * @param backspaceFn - Function to press backspace
   * @param text - Text to type
   * @param includeTypos - Whether to simulate typos
   */
  async typeHumanLike(
    typeFn: (char: string) => Promise<void>,
    backspaceFn: () => Promise<void>,
    text: string,
    includeTypos: boolean = true
  ): Promise<void> {
    let textToType = text;
    const typoSimulation = includeTypos ? this.simulateTypos(text) : null;
    
    if (typoSimulation && typoSimulation.typoPositions.length > 0) {
      // Type with typos, then correct
      let typedIndex = 0;
      
      for (let i = 0; i < typoSimulation.withTypos.length; i++) {
        const char = typoSimulation.withTypos[i];
        
        if (char.length === 2) {
          // This is a doubled character (typo)
          await typeFn(char[0]);
          await this.sleep(this.generateTypingDelay());
          await typeFn(char[1]);
          await this.sleep(this.generateTypingDelay());
          
          // Correct by backspacing
          await backspaceFn();
          await this.sleep(this.gaussianRandomInt(
            this.config.typoCorrectionDelayMean,
            100,
            150,
            800
          ));
          
          typedIndex++;
        } else {
          await typeFn(char);
          await this.sleep(this.generateTypingDelay());
          typedIndex++;
        }
      }
    } else {
      // Type normally with variable delays
      const delays = this.generateTypingPattern(text);
      
      for (let i = 0; i < text.length; i++) {
        await typeFn(text[i]);
        
        // Add thinking pause occasionally
        if (this.shouldPauseForThinking()) {
          const pause = this.generateThinkingPause();
          this.emit('thinking-pause', { pause, position: i });
          await this.sleep(pause);
        } else {
          await this.sleep(delays[i]);
        }
      }
    }
    
    this.recordAction('type', text.length);
  }

  /**
   * Execute mouse movement along a trajectory
   * @param moveFn - Function to move mouse to position
   * @param trajectory - Array of positions
   */
  async moveMouseAlongTrajectory(
    moveFn: (pos: MousePosition) => Promise<void>,
    trajectory: MousePosition[]
  ): Promise<void> {
    for (const position of trajectory) {
      await moveFn(position);
      // Small delay between movements
      await this.sleep(this.gaussianRandomInt(5, 2, 1, 20));
    }
    
    this.recordAction('mouse-move', trajectory.length);
  }

  /**
   * Record an action for history
   */
  private recordAction(action: string, delay: number): void {
    this.actionHistory.push({
      action,
      delay,
      timestamp: Date.now(),
    });
    
    // Keep history manageable
    if (this.actionHistory.length > 1000) {
      this.actionHistory = this.actionHistory.slice(-500);
    }
    
    this.lastActionTime = Date.now();
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get action history
   */
  getActionHistory(): Array<{ action: string; delay: number; timestamp: number }> {
    return [...this.actionHistory];
  }

  /**
   * Get statistics about humanization
   */
  getStats(): {
    totalActions: number;
    averageDelay: number;
    averageTypingDelay: number;
    lastActionTime: number;
  } {
    const totalDelay = this.actionHistory.reduce((sum, a) => sum + a.delay, 0);
    const typingActions = this.actionHistory.filter(a => a.action === 'type');
    const typingDelay = typingActions.reduce((sum, a) => sum + a.delay, 0);
    
    return {
      totalActions: this.actionHistory.length,
      averageDelay: this.actionHistory.length > 0 ? totalDelay / this.actionHistory.length : 0,
      averageTypingDelay: typingActions.length > 0 ? typingDelay / typingActions.length : 0,
      lastActionTime: this.lastActionTime,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HumanizerConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config-updated', this.config);
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.removeAllListeners();
    this.actionHistory = [];
  }
}

export default Humanizer;
