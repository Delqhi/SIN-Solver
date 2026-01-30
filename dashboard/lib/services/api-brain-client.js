/**
 * API Brain Client
 * Handles complex fix strategies including selector fixes, element detection, and form handling
 * Location: http://localhost:8000
 * 
 * Services provided:
 * - Selector/XPath optimization
 * - Element detection and alternatives
 * - Form interaction fixes
 * - Page reload orchestration
 * - Complex multi-step fixes
 */

const axios = require('axios');

class ApiBrainClient {
  constructor(baseUrl = 'http://localhost:8000', timeout = 30000) {
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
      console.log(`[ApiBrainClient] ${config.method.toUpperCase()} ${config.url}`);
      return config;
    });

    this.client.interceptors.response.use(
      response => {
        console.log(`[ApiBrainClient] Response ${response.status}`, {
          method: response.config.method,
          url: response.config.url
        });
        return response;
      },
      error => {
        console.error(`[ApiBrainClient] Error`, {
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
   * Suggest a better selector/XPath for an element
   * @param {Object} errorContext - Context of the selection error
   * @returns {Promise<Object>} Suggestion with new selector and confidence
   */
  async suggestSelectorFix(errorContext) {
    try {
      const { failedSelector, pageContent, elementDescription, currentXPath } = errorContext;

      const response = await this.client.post('/api/v1/selector-fix', {
        failedSelector,
        pageContent,
        elementDescription,
        currentXPath,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: true,
        suggestion: data.suggestion || null,
        xpath: data.xpath || null,
        cssSelector: data.cssSelector || null,
        confidence: data.confidence || 0,
        reasoning: data.reasoning || '',
        alternatives: data.alternatives || [],
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[ApiBrainClient] suggestSelectorFix error:', error.message);
      return {
        success: false,
        error: error.message,
        suggestion: null,
        confidence: 0,
        alternatives: []
      };
    }
  }

  /**
   * Apply a selector fix and test it on the page
   * @param {string} jobId - Job ID for tracking
   * @param {string} selector - CSS selector or XPath to apply
   * @param {Object} pageContext - Current page state
   * @returns {Promise<Object>} Result of applying the fix
   */
  async applySelectorFix(jobId, selector, pageContext) {
    try {
      const response = await this.client.post('/api/v1/selector-fix/apply', {
        jobId,
        selector,
        pageContext,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: data.success === true,
        selector: data.appliedSelector,
        isValid: data.isValid || false,
        elementFound: data.elementFound || false,
        elementCount: data.elementCount || 0,
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[ApiBrainClient] applySelectorFix error:', error.message);
      return {
        success: false,
        error: error.message,
        selector: null,
        isValid: false,
        elementFound: false
      };
    }
  }

  /**
   * Detect various issues with elements on the page
   * @param {Object} pageContext - Page DOM and state
   * @returns {Promise<Object>} Detected issues and recommendations
   */
  async detectElementIssues(pageContext) {
    try {
      const { pageContent, screenshot, elementSelectors } = pageContext;

      const response = await this.client.post('/api/v1/element-detection/issues', {
        pageContent,
        screenshot,
        elementSelectors,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: true,
        issues: data.issues || [],
        recommendations: data.recommendations || [],
        severity: data.overallSeverity || 'LOW', // LOW, MEDIUM, HIGH
        duration: data.processingTime || 0,
        detectedProblems: {
          invisible: data.invisibleElements || [],
          disabled: data.disabledElements || [],
          hidden: data.hiddenElements || [],
          outOfViewport: data.outOfViewportElements || [],
          blocked: data.blockedByElements || []
        }
      };
    } catch (error) {
      console.error('[ApiBrainClient] detectElementIssues error:', error.message);
      return {
        success: false,
        error: error.message,
        issues: [],
        recommendations: [],
        detectedProblems: {}
      };
    }
  }

  /**
   * Find alternative selectors for an element
   * @param {string} originalSelector - CSS selector or XPath that failed
   * @param {Object} context - Page context for finding alternatives
   * @returns {Promise<Object>} Alternative selectors with confidence scores
   */
  async findAlternativeElements(originalSelector, context = {}) {
    try {
      const response = await this.client.post('/api/v1/element-detection/alternatives', {
        originalSelector,
        pageContext: context,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: true,
        originalSelector,
        alternatives: (data.alternatives || []).map(alt => ({
          selector: alt.selector,
          type: alt.type, // css, xpath, attribute-based, etc.
          confidence: alt.confidence,
          specificity: alt.specificity,
          likelihood: alt.likelihood
        })),
        recommendedSelector: data.recommended || null,
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[ApiBrainClient] findAlternativeElements error:', error.message);
      return {
        success: false,
        error: error.message,
        originalSelector,
        alternatives: [],
        recommendedSelector: null
      };
    }
  }

  /**
   * Suggest a fix for form interaction issues
   * @param {Object} formData - Form state and submission context
   * @param {string} errorMessage - Error that occurred
   * @returns {Promise<Object>} Suggested fix strategy
   */
  async suggestFormFix(formData, errorMessage) {
    try {
      const response = await this.client.post('/api/v1/form-fix/suggest', {
        formData,
        errorMessage,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: true,
        strategy: data.strategy || null, // e.g., 'press_enter', 'click_submit', 'tab_and_enter'
        steps: data.steps || [],
        reasoning: data.reasoning || '',
        expectedOutcome: data.expectedOutcome || '',
        confidence: data.confidence || 0,
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[ApiBrainClient] suggestFormFix error:', error.message);
      return {
        success: false,
        error: error.message,
        strategy: null,
        steps: [],
        confidence: 0
      };
    }
  }

  /**
   * Submit a form using an alternative method
   * @param {Object} formData - Form data to submit
   * @param {string} strategy - Strategy to use (press_enter, click_submit, etc.)
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Result of form submission
   */
  async submitFormAlternatively(formData, strategy, context = {}) {
    try {
      const response = await this.client.post('/api/v1/form-fix/submit', {
        formData,
        strategy,
        context,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: data.success === true,
        strategy,
        submitted: data.submitted || false,
        responseStatus: data.responseStatus || null,
        responseMessage: data.responseMessage || '',
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[ApiBrainClient] submitFormAlternatively error:', error.message);
      return {
        success: false,
        error: error.message,
        strategy,
        submitted: false
      };
    }
  }

  /**
   * Trigger a page reload or refresh with specific strategy
   * @param {string} jobId - Job ID for tracking
   * @param {Object} context - Page context
   * @returns {Promise<Object>} Result of page reload
   */
  async triggerPageReload(jobId, context = {}) {
    try {
      const response = await this.client.post('/api/v1/page-control/reload', {
        jobId,
        context,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: data.success === true,
        reloadMethod: data.method || 'standard', // standard, hard, soft
        waitTime: data.waitTime || 0,
        pageStateAfterReload: data.pageState || null,
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[ApiBrainClient] triggerPageReload error:', error.message);
      return {
        success: false,
        error: error.message,
        reloadMethod: null
      };
    }
  }

  /**
   * Orchestrate a complex multi-step fix
   * @param {string} jobId - Job ID for tracking
   * @param {string} errorType - Type of error
   * @param {Object} context - Full error and page context
   * @returns {Promise<Object>} Orchestration plan and execution result
   */
  async orchestrateComplexFix(jobId, errorType, context) {
    try {
      const response = await this.client.post('/api/v1/orchestration/complex-fix', {
        jobId,
        errorType,
        context,
        timestamp: new Date().toISOString()
      });

      const { data } = response;

      return {
        success: data.success === true,
        plan: data.executionPlan || [],
        steps: (data.steps || []).map(step => ({
          stepNumber: step.stepNumber,
          action: step.action,
          expected: step.expectedOutcome,
          completed: step.completed || false,
          result: step.result || null
        })),
        overallSuccess: data.overallSuccess || false,
        failurePoint: data.failureAtStep || null,
        reasoning: data.reasoning || '',
        duration: data.processingTime || 0
      };
    } catch (error) {
      console.error('[ApiBrainClient] orchestrateComplexFix error:', error.message);
      return {
        success: false,
        error: error.message,
        plan: [],
        steps: [],
        overallSuccess: false
      };
    }
  }

  /**
   * Verify API Brain service is healthy and accessible
   * @returns {Promise<boolean>} True if service is healthy
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000
      });

      const isHealthy = response.status === 200;
      console.log(`[ApiBrainClient] Health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      return isHealthy;
    } catch (error) {
      console.error('[ApiBrainClient] Health check failed:', error.message);
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
      console.error('[ApiBrainClient] getServiceInfo error:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    // axios doesn't need explicit disconnect, but we can log it
    console.log('[ApiBrainClient] Disconnected');
  }
}

module.exports = { ApiBrainClient };
