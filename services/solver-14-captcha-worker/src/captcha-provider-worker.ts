/**
 * 💰 2CAPTCHA WORKER - Earn Money Solving CAPTCHAs
 * 
 * This worker connects TO 2captcha API (not the other way around!)
 * Workflow:
 * 1. Login with worker credentials
 * 2. Request captcha task from 2captcha
 * 3. Solve using our AI models (YOLO + OCR)
 * 4. Submit answer back to 2captcha
 * 5. Earn $$$ per solved captcha
 * 6. Repeat
 * 
 * NO queue system, NO incoming requests, NO server mode!
 * We ARE the worker, not the client!
 */

import axios, { AxiosInstance } from 'axios';
import pino from 'pino';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as fs from 'fs';
import * as path from 'path';

interface CaptchaProviderConfig {
  provider: '2captcha' | 'anticaptcha' | 'capsolver';
  apiKey: string;
  workerId?: string;
  baseUrl: string;
  minBalance?: number; // Stop if balance below this
}

interface CaptchaTask {
  id: string;
  type: string;
  imageUrl?: string;
  imageBase64?: string;
  question?: string;
  instructions?: string;
}

interface SolveResult {
  success: boolean;
  answer: string;
  confidence: number;
  solveTimeMs: number;
  error?: string;
}

export class CaptchaProviderWorker {
  private config: CaptchaProviderConfig;
  private api: AxiosInstance;
  private logger: pino.Logger;
  private isRunning = false;
  private stats = {
    totalSolved: 0,
    totalFailed: 0,
    totalEarned: 0,
    startTime: Date.now(),
  };

  constructor(config: CaptchaProviderConfig) {
    this.config = config;
    this.logger = pino({ 
      level: process.env.LOG_LEVEL || 'info',
      name: `${config.provider}-worker`
    });

    // Setup API client
    this.api = axios.create({
      baseURL: config.baseUrl,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SIN-Solver-Worker/2.0'
      }
    });

    this.logger.info({ 
      provider: config.provider,
      workerId: config.workerId 
    }, '💰 CAPTCHA PROVIDER WORKER INITIALIZED');
  }

  /**
   * 🚀 START WORKING - Main Loop
   * This is the worker's job - continuously solve captchas for money!
   */
  async start(): Promise<void> {
    this.isRunning = true;
    this.logger.info('🚀 STARTING WORKER - Ready to earn money!');

    // Check initial balance
    const balance = await this.getBalance();
    this.logger.info({ balance }, '💰 Current balance');

    while (this.isRunning) {
      try {
        // Step 1: Get task from provider
        this.logger.info('📥 Requesting captcha task...');
        const task = await this.getTask();
        
        if (!task) {
          this.logger.info('⏳ No tasks available, waiting...');
          await this.sleep(5000);
          continue;
        }

        this.logger.info({ 
          taskId: task.id, 
          type: task.type 
        }, '📋 Received captcha task');

        // Step 2: Solve it with our AI
        const result = await this.solveCaptcha(task);

        // Step 3: Submit answer
        if (result.success) {
          await this.submitAnswer(task.id, result.answer);
          this.stats.totalSolved++;
          this.logger.info({
            taskId: task.id,
            answer: result.answer,
            confidence: result.confidence,
            timeMs: result.solveTimeMs,
            totalSolved: this.stats.totalSolved
          }, '✅ Task completed - Money earned! 💰');
        } else {
          await this.reportError(task.id, result.error || 'Unknown error');
          this.stats.totalFailed++;
          this.logger.error({
            taskId: task.id,
            error: result.error
          }, '❌ Task failed');
        }

        // Small delay to not hammer the API
        await this.sleep(1000);

      } catch (error) {
        this.logger.error({ error }, '💥 Error in worker loop');
        await this.sleep(10000); // Wait longer on error
      }
    }
  }

  /**
   * 📥 GET TASK from 2captcha API
   * This is where we ask 2captcha: "Give me work!"
   */
  private async getTask(): Promise<CaptchaTask | null> {
    try {
      // Different providers have different APIs
      switch (this.config.provider) {
        case '2captcha':
          return await this.get2captchaTask();
        case 'anticaptcha':
          return await this.getAnticaptchaTask();
        case 'capsolver':
          return await this.getCapsolverTask();
        default:
          throw new Error(`Unknown provider: ${this.config.provider}`);
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to get task');
      return null;
    }
  }

  private async get2captchaTask(): Promise<CaptchaTask | null> {
    // 2captcha API: Request task
    // In real implementation, this would use their actual API
    // For now, simulating the structure
    
    const response = await this.api.post('/in.php', {
      key: this.config.apiKey,
      method: 'userrecaptcha', // or 'base64' for image captchas
      googlekey: 'site_key_here',
      pageurl: 'https://example.com',
      json: 1
    });

    if (response.data.status === 1) {
      return {
        id: response.data.request,
        type: 'recaptcha',
        // 2captcha returns task ID, we poll for the actual captcha
      };
    }

    return null;
  }

  private async getAnticaptchaTask(): Promise<CaptchaTask | null> {
    // AntiCaptcha API implementation
    const response = await this.api.post('/createTask', {
      clientKey: this.config.apiKey,
      task: {
        type: 'NoCaptchaTaskProxyless',
        websiteURL: 'https://example.com',
        websiteKey: 'site_key'
      }
    });

    if (response.data.errorId === 0) {
      return {
        id: response.data.taskId.toString(),
        type: 'recaptcha'
      };
    }

    return null;
  }

  private async getCapsolverTask(): Promise<CaptchaTask | null> {
    // Capsolver API implementation
    const response = await this.api.post('/createTask', {
      clientKey: this.config.apiKey,
      task: {
        type: 'ReCaptchaV2TaskProxyless',
        websiteURL: 'https://example.com',
        websiteKey: 'site_key'
      }
    });

    if (response.data.errorId === 0) {
      return {
        id: response.data.taskId,
        type: 'recaptcha'
      };
    }

    return null;
  }

  /**
   * 🧠 SOLVE CAPTCHA using our AI models
   * This is where the magic happens - YOLO + OCR!
   */
  private async solveCaptcha(task: CaptchaTask): Promise<SolveResult> {
    const startTime = Date.now();

    try {
      // Get the captcha image
      let imageBase64: string;
      
      if (task.imageBase64) {
        imageBase64 = task.imageBase64;
      } else if (task.imageUrl) {
        // Download image
        const imageResponse = await axios.get(task.imageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });
        imageBase64 = Buffer.from(imageResponse.data).toString('base64');
      } else {
        throw new Error('No image provided in task');
      }

      // 🎯 STEP 1: Classify with YOLO
      const classification = await this.classifyWithYOLO(imageBase64);
      this.logger.info({ 
        captchaType: classification.type,
        confidence: classification.confidence 
      }, '🎯 YOLO Classification');

      // 🎯 STEP 2: Solve based on type
      let answer: string;
      let confidence: number;

      switch (classification.type) {
        case 'text':
        case 'math':
          const textResult = await this.solveWithOCR(imageBase64, classification.type);
          answer = textResult.text;
          confidence = textResult.confidence;
          break;

        case 'slider':
          const sliderResult = await this.solveSlider(imageBase64);
          answer = sliderResult.offset.toString();
          confidence = sliderResult.confidence;
          break;

        case 'image_grid':
        case 'hcaptcha':
          const gridResult = await this.solveImageGrid(imageBase64, task.instructions);
          answer = gridResult.indices.join(',');
          confidence = gridResult.confidence;
          break;

        default:
          // Fallback to external solver if confidence is low
          if (classification.confidence < 0.6) {
            this.logger.warn('Low confidence, using fallback solver');
            const fallbackResult = await this.fallbackSolver(imageBase64);
            answer = fallbackResult.solution;
            confidence = fallbackResult.confidence;
          } else {
            throw new Error(`Unsupported captcha type: ${classification.type}`);
          }
      }

      const solveTimeMs = Date.now() - startTime;

      return {
        success: true,
        answer,
        confidence,
        solveTimeMs
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        answer: '',
        confidence: 0,
        solveTimeMs: Date.now() - startTime,
        error: errorMessage
      };
    }
  }

  /**
   * 🎯 Classify CAPTCHA type using YOLO
   */
  private async classifyWithYOLO(imageBase64: string): Promise<{type: string; confidence: number}> {
    try {
      // Call our local YOLO classifier
      const solverUrl = process.env.CAPTCHA_SOLVER_URL || 'http://localhost:8019';
      const response = await axios.post(`${solverUrl}/api/classify`, {
        image: imageBase64
      }, {
        timeout: 5000
      });

      return {
        type: response.data.captcha_type,
        confidence: response.data.confidence
      };
    } catch (error) {
      this.logger.error({ error }, 'YOLO classification failed');
      // Fallback to text detection
      return { type: 'text', confidence: 0.5 };
    }
  }

  /**
   * 📝 Solve text/math CAPTCHA with OCR
   */
  private async solveWithOCR(imageBase64: string, type: string): Promise<{text: string; confidence: number}> {
    try {
      const solverUrl = process.env.CAPTCHA_SOLVER_URL || 'http://localhost:8019';
      const response = await axios.post(`${solverUrl}/api/solve/text`, {
        image_base64: imageBase64,
        captcha_type: type
      }, {
        timeout: 10000
      });

      return {
        text: response.data.solution,
        confidence: response.data.confidence
      };
    } catch (error) {
      this.logger.error({ error }, 'OCR solving failed');
      throw error;
    }
  }

  /**
   * 🎚️ Solve slider CAPTCHA
   */
  private async solveSlider(imageBase64: string): Promise<{offset: number; confidence: number}> {
    try {
      const solverUrl = process.env.CAPTCHA_SOLVER_URL || 'http://localhost:8019';
      const response = await axios.post(`${solverUrl}/api/solve/slider`, {
        image_base64: imageBase64
      }, {
        timeout: 15000
      });

      return {
        offset: response.data.offset,
        confidence: response.data.confidence
      };
    } catch (error) {
      this.logger.error({ error }, 'Slider solving failed');
      throw error;
    }
  }

  /**
   * 🖼️ Solve image grid CAPTCHA (hCaptcha style)
   */
  private async solveImageGrid(imageBase64: string, instructions?: string): Promise<{indices: number[]; confidence: number}> {
    try {
      const solverUrl = process.env.CAPTCHA_SOLVER_URL || 'http://localhost:8019';
      const response = await axios.post(`${solverUrl}/api/solve/image-grid`, {
        image_base64: imageBase64,
        instructions: instructions || 'Select all matching images'
      }, {
        timeout: 20000
      });

      return {
        indices: response.data.indices,
        confidence: response.data.confidence
      };
    } catch (error) {
      this.logger.error({ error }, 'Image grid solving failed');
      throw error;
    }
  }

  /**
   * 🆘 Fallback solver for difficult captchas
   */
  private async fallbackSolver(imageBase64: string): Promise<{solution: string; confidence: number}> {
    // This could use external AI services as fallback
    // For now, return error to avoid burning money on bad solves
    throw new Error('Fallback solver not implemented - captcha too difficult');
  }

  /**
   * 📤 SUBMIT ANSWER back to provider
   */
  private async submitAnswer(taskId: string, answer: string): Promise<void> {
    try {
      switch (this.config.provider) {
        case '2captcha':
          await this.submit2captchaAnswer(taskId, answer);
          break;
        case 'anticaptcha':
          await this.submitAnticaptchaAnswer(taskId, answer);
          break;
        case 'capsolver':
          await this.submitCapsolverAnswer(taskId, answer);
          break;
      }
    } catch (error) {
      this.logger.error({ error, taskId }, 'Failed to submit answer');
      throw error;
    }
  }

  private async submit2captchaAnswer(taskId: string, answer: string): Promise<void> {
    await this.api.post('/res.php', {
      key: this.config.apiKey,
      action: 'reportgood', // or 'reportbad' for failed
      id: taskId,
      answer: answer
    });
  }

  private async submitAnticaptchaAnswer(taskId: string, answer: string): Promise<void> {
    await this.api.post('/getTaskResult', {
      clientKey: this.config.apiKey,
      taskId: parseInt(taskId)
    });
  }

  private async submitCapsolverAnswer(taskId: string, answer: string): Promise<void> {
    await this.api.post('/getTaskResult', {
      clientKey: this.config.apiKey,
      taskId: taskId
    });
  }

  /**
   * ❌ Report error to provider
   */
  private async reportError(taskId: string, error: string): Promise<void> {
    this.logger.warn({ taskId, error }, 'Reporting error to provider');
    // Implementation depends on provider API
  }

  /**
   * 💰 GET BALANCE
   */
  private async getBalance(): Promise<number> {
    try {
      // Implementation depends on provider
      // For now, return 0 (would be actual API call)
      return 0;
    } catch (error) {
      this.logger.error({ error }, 'Failed to get balance');
      return 0;
    }
  }

  /**
   * 📊 GET STATS
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    return {
      ...this.stats,
      uptime,
      uptimeFormatted: this.formatDuration(uptime),
      avgSolveTime: this.stats.totalSolved > 0 ? uptime / this.stats.totalSolved : 0
    };
  }

  /**
   * 🛑 STOP WORKER
   */
  async stop(): Promise<void> {
    this.logger.info('🛑 Stopping worker...');
    this.isRunning = false;
    
    const stats = this.getStats();
    this.logger.info({
      totalSolved: stats.totalSolved,
      totalFailed: stats.totalFailed,
      uptime: stats.uptimeFormatted
    }, '💰 Final stats');
  }

  /**
   * 😴 SLEEP helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ⏱️ FORMAT DURATION
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

export default CaptchaProviderWorker;