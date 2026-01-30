/**
 * CAPTCHA Client
 * Handles CAPTCHA detection, solving, and validation
 * Location: http://localhost:8019
 * 
 * Services provided:
 * - CAPTCHA type detection
 * - CAPTCHA solving integration
 * - Solution validation
 * - Manual review fallback
 */

const axios = require('axios');
const fs = require('fs');

class CaptchaClient {
  constructor(baseUrl = 'http://localhost:8019', timeout = 60000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SIN-Solver-AutoCorrector/1.0'
      }
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(config => {
      console.log(`[CaptchaClient] ${config.method.toUpperCase()} ${config.url}`);
      return config;
    });

    this.client.interceptors.response.use(
      response => {
        console.log(`[CaptchaClient] Response ${response.status}`, {
          method: response.config.method,
          url: response.config.url
        });
        return response;
      },
      error => {
        console.error(`[CaptchaClient] Error`, {
          method: error.config?.method,
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        throw error;
      }
    );
  }

  /**
   * Detect CAPTCHA type and characteristics on a page
   * @param {Buffer|string} pageContent - Screenshot as Buffer or base64 string
   * @param {Object} pageContext - DOM context and metadata
   * @returns {Promise<Object>} CAPTCHA detection results
   */
  async detectCaptcha(pageContent, pageContext = {}) {
    try {
      // Convert Buffer to base64 if needed
      let screenshot = pageContent;
      if (Buffer.isBuffer(pageContent)) {
        screenshot = pageContent.toString('base64');
      }

      const response = await this.client.post('/api/v1/captcha/detect', {
        screenshot,
        pageContext,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: true,
        detected: data.detected === true,
        captchaType: data.captchaType || null, // 'recaptcha_v2', 'recaptcha_v3', 'hcaptcha', 'text', 'slider', 'click', etc.
        confidence: data.confidence || 0,
        location: data.location || { x: 0, y: 0, width: 0, height: 0 },
        characteristics: {
          interactive: data.isInteractive || false,
          requiresDelay: data.requiresDelay || false,
          timeout: data.timeout || 120,
          difficulty: data.difficulty || 'MEDIUM', // EASY, MEDIUM, HARD
          hasAudio: data.hasAudio || false,
          hasImages: data.hasImages || false
        },
        metadata: data.metadata || {},
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[CaptchaClient] detectCaptcha error:', error.message);
      return {
        success: false,
        error: error.message,
        detected: false,
        captchaType: null,
        confidence: 0
      };
    }
  }

  /**
   * Solve a detected CAPTCHA
   * @param {string} captchaType - Type of CAPTCHA ('text', 'slider', 'click', 'recaptcha_v2', etc.)
   * @param {Object} pageData - Page context and CAPTCHA element info
   * @returns {Promise<Object>} Solution (token, answer, or coordinates)
   */
  async solveCaptcha(captchaType, pageData) {
    try {
      const response = await this.client.post('/api/v1/captcha/solve', {
        captchaType,
        pageData,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: data.success === true,
        captchaType,
        solution: {
          token: data.token || null, // For reCAPTCHA
          answer: data.answer || null, // For text CAPTCHA
          coordinates: data.coordinates || null, // For click CAPTCHA: [{x, y}, ...]
          sliderValue: data.sliderValue || null, // For slider CAPTCHA
          actions: data.actions || [] // For drag-and-drop: [{action, x, y}, ...]
        },
        confidence: data.confidence || 0,
        solvingMethod: data.method || 'vision_ai', // vision_ai, ocr, audio, etc.
        duration: data.processingTime || 0,
        expiresIn: data.expiresIn || null // seconds until solution expires (for reCAPTCHA)
      };
    } catch (error) {
      console.error('[CaptchaClient] solveCaptcha error:', error.message);
      return {
        success: false,
        error: error.message,
        captchaType,
        solution: {},
        confidence: 0
      };
    }
  }

  /**
   * Send CAPTCHA to worker service for solving
   * @param {string} jobId - Job ID for tracking
   * @param {Object} captchaData - CAPTCHA details and screenshot
   * @returns {Promise<Object>} Worker task ID and status
   */
  async sendToWorker(jobId, captchaData) {
    try {
      const response = await this.client.post('/api/v1/captcha/send-to-worker', {
        jobId,
        captchaData,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: data.success === true,
        taskId: data.taskId || null,
        workerId: data.workerId || null,
        estimatedTime: data.estimatedTime || 30, // seconds
        status: data.status || 'QUEUED', // QUEUED, PROCESSING, COMPLETED
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[CaptchaClient] sendToWorker error:', error.message);
      return {
        success: false,
        error: error.message,
        taskId: null,
        status: 'ERROR'
      };
    }
  }

  /**
   * Check status of a worker task
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Worker task status
   */
  async getWorkerStatus(jobId) {
    try {
      const response = await this.client.get(`/api/v1/captcha/worker-status/${jobId}`);

      const { data } = response;

      return {
        success: true,
        jobId,
        status: data.status || 'UNKNOWN', // QUEUED, PROCESSING, COMPLETED, FAILED
        progress: data.progress || 0, // 0-100
        result: data.result || null,
        error: data.error || null,
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[CaptchaClient] getWorkerStatus error:', error.message);
      return {
        success: false,
        error: error.message,
        jobId,
        status: 'UNKNOWN'
      };
    }
  }

  /**
   * Validate a CAPTCHA solution
   * @param {string} jobId - Job ID
   * @param {Object} solution - Solution object (token, answer, coordinates, etc.)
   * @returns {Promise<Object>} Validation result
   */
  async validateSolution(jobId, solution) {
    try {
      const response = await this.client.post('/api/v1/captcha/validate', {
        jobId,
        solution,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: true,
        isValid: data.isValid === true,
        confidence: data.confidence || 0,
        validationDetails: data.details || '',
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[CaptchaClient] validateSolution error:', error.message);
      return {
        success: false,
        error: error.message,
        isValid: false,
        confidence: 0
      };
    }
  }

  /**
   * Submit a CAPTCHA solution to the target element
   * @param {string} jobId - Job ID
   * @param {Object} solution - Solution to submit
   * @param {Object} targetElement - Target element (selector, type, etc.)
   * @returns {Promise<Object>} Submission result
   */
  async submitSolution(jobId, solution, targetElement) {
    try {
      const response = await this.client.post('/api/v1/captcha/submit', {
        jobId,
        solution,
        targetElement,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: data.success === true,
        submitted: data.submitted === true,
        responseStatus: data.responseStatus || null,
        responseMessage: data.responseMessage || '',
        pageChanged: data.pageChanged || false,
        newPageState: data.newPageState || null,
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[CaptchaClient] submitSolution error:', error.message);
      return {
        success: false,
        error: error.message,
        submitted: false
      };
    }
  }

  /**
   * Request manual review for difficult CAPTCHAs
   * @param {string} jobId - Job ID
   * @param {Buffer|string} screenshotBuffer - Screenshot for manual review
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Review request result
   */
  async requestManualReview(jobId, screenshotBuffer, context = {}) {
    try {
      // Convert Buffer to base64 if needed
      let screenshot = screenshotBuffer;
      if (Buffer.isBuffer(screenshotBuffer)) {
        screenshot = screenshotBuffer.toString('base64');
      }

      const response = await this.client.post('/api/v1/captcha/manual-review', {
        jobId,
        screenshot,
        context,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: data.success === true,
        reviewId: data.reviewId || null,
        estimatedTime: data.estimatedTime || 300, // seconds (5 min default)
        status: data.status || 'SUBMITTED', // SUBMITTED, IN_PROGRESS, COMPLETED
        priority: data.priority || 'NORMAL', // LOW, NORMAL, HIGH
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[CaptchaClient] requestManualReview error:', error.message);
      return {
        success: false,
        error: error.message,
        reviewId: null,
        status: 'FAILED'
      };
    }
  }

  /**
   * Get result of manual review
   * @param {string} reviewId - Review ID from manual review request
   * @returns {Promise<Object>} Manual review result
   */
  async getManualReviewResult(reviewId) {
    try {
      const response = await this.client.get(`/api/v1/captcha/manual-review/${reviewId}`);

      const { data } = response;

      return {
        success: true,
        reviewId,
        status: data.status || 'PENDING', // PENDING, COMPLETED, EXPIRED
        result: data.result || null,
        reviewerNotes: data.notes || '',
        completedAt: data.completedAt || null,
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[CaptchaClient] getManualReviewResult error:', error.message);
      return {
        success: false,
        error: error.message,
        reviewId,
        status: 'UNKNOWN'
      };
    }
  }

  /**
   * Get CAPTCHA solving statistics
   * @returns {Promise<Object>} Statistics on CAPTCHA solving performance
   */
  async getStatistics() {
    try {
      const response = await this.client.get('/api/v1/captcha/statistics');

      const { data } = response;

      return {
        success: true,
        totalSolved: data.totalSolved || 0,
        successRate: data.successRate || 0,
        averageTime: data.averageTime || 0,
        byType: data.byType || {},
        lastUpdated: data.lastUpdated || null,
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[CaptchaClient] getStatistics error:', error.message);
      return {
        success: false,
        error: error.message,
        totalSolved: 0
      };
    }
  }

  /**
   * Verify CAPTCHA Client service is healthy
   * @returns {Promise<boolean>} True if service is healthy
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000
      });

      const isHealthy = response.status === 200;
      console.log(`[CaptchaClient] Health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      return isHealthy;
    } catch (error) {
      console.error('[CaptchaClient] Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get service version and capabilities
   * @returns {Promise<Object>} Service info
   */
  async getServiceInfo() {
    try {
      const response = await this.client.get('/api/v1/info');
      return response.data || {};
    } catch (error) {
      console.error('[CaptchaClient] getServiceInfo error:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    console.log('[CaptchaClient] Disconnected');
  }
}

module.exports = { CaptchaClient };
