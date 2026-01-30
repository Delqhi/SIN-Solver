import { errorHandler } from '../../utils/errorHandler';
import { validateInput } from '../../utils/validators';
import { logger } from '../../utils/logger';
import { AutoCorrector } from '../../../../workers/2captcha-worker/src/auto-correct';
import { TwoCaptchaError } from '../../../../workers/2captcha-worker/src/errors';

// Global AutoCorrector instance (stateful)
let autoCorrector = null;

/**
 * Initialize AutoCorrector instance with chat WebSocket URL
 * Called once on first request
 */
function initializeAutoCorrector() {
  if (!autoCorrector) {
    const chatWebSocketUrl = process.env.CHAT_WEBSOCKET_URL || 
      'ws://localhost:3009/api/chat/notify';
    autoCorrector = new AutoCorrector(chatWebSocketUrl);
    logger.info('WORKFLOW_CORRECT', 'AutoCorrector initialized');
  }
  return autoCorrector;
}

/**
 * POST /api/workflows/[id]/correct
 * 
 * Autonomously corrects errors in workflows without manual intervention.
 * 
 * Request Body:
 * {
 *   "error": {
 *     "message": "string",
 *     "code": "string",
 *     "name": "string",
 *     "stack": "string" (optional)
 *   },
 *   "jobId": "string" (optional),
 *   "context": { ... } (optional)
 * }
 * 
 * Response:
 * {
 *   "status": "FIXED" | "PARTIAL_FIX" | "MANUAL_REQUIRED" | "UNFIXABLE",
 *   "fixStrategy": "string",
 *   "attemptCount": number,
 *   "successMetrics": { ... },
 *   "chatNotification": { ... },
 *   "auditLog": [ ... ],
 *   "nextAction": "string"
 * }
 */
export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // 2. Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 3. Log incoming request
    const { id: workflowId } = req.query;
    logger.info('WORKFLOW_CORRECT', `[${req.method}] Workflow ${workflowId}`);

    // 4. Validate HTTP method
    if (req.method !== 'POST') {
      return res.status(405).json(
        errorHandler.methodNotAllowed(`Method ${req.method} not allowed`)
      );
    }

    // 5. Validate required fields
    const { error: errorObj, jobId, context } = req.body;
    
    if (!errorObj) {
      return res.status(400).json(
        errorHandler.badRequest('Missing required field: error')
      );
    }

    if (!workflowId) {
      return res.status(400).json(
        errorHandler.badRequest('Missing workflow ID in URL')
      );
    }

    // 6. Initialize AutoCorrector
    const corrector = initializeAutoCorrector();

    // 7. Create Error object from request body
    let errorInstance;
    
    if (errorObj instanceof Error) {
      errorInstance = errorObj;
    } else if (errorObj.code && errorObj.message) {
      // Convert to TwoCaptchaError if it has code/message
      errorInstance = new TwoCaptchaError(
        errorObj.message,
        errorObj.code,
        {
          httpStatus: errorObj.httpStatus || 500,
          recoverable: errorObj.recoverable !== false,
          retryable: errorObj.retryable !== false,
          context: context || {}
        }
      );
    } else {
      // Generic error
      errorInstance = new Error(errorObj.message || JSON.stringify(errorObj));
    }

    logger.info('WORKFLOW_CORRECT', `Processing error: ${errorInstance.message}`);

    // 8. Detect and automatically correct the error
    let correctionResult;
    
    try {
      correctionResult = await corrector.detectAndFix(
        workflowId,
        errorInstance,
        jobId
      );
    } catch (correctionError) {
      logger.error('WORKFLOW_CORRECT', `Auto-correction failed: ${correctionError.message}`);
      return res.status(500).json(
        errorHandler.internal('Error correction process failed', {
          error: correctionError.message
        })
      );
    }

    // 9. Format response
    const responseData = {
      status: correctionResult.status,
      fixStrategy: correctionResult.fixStrategy,
      workflowId: correctionResult.workflowId,
      jobId: correctionResult.jobId,
      attemptCount: correctionResult.attemptCount,
      successMetrics: correctionResult.successMetrics,
      chatNotification: {
        sent: correctionResult.chatNotification.sent,
        message: correctionResult.chatNotification.message,
        timestamp: correctionResult.chatNotification.timestamp
      },
      auditLog: correctionResult.auditLog,
      nextAction: correctionResult.nextAction,
      processedAt: new Date().toISOString()
    };

    // 10. Determine HTTP status based on correction result
    let httpStatus = 200; // Default: FIXED
    
    switch (correctionResult.status) {
      case 'FIXED':
        httpStatus = 200;
        logger.info('WORKFLOW_CORRECT', 'Error fixed autonomously');
        break;
      case 'PARTIAL_FIX':
        httpStatus = 206; // Partial Content
        logger.info('WORKFLOW_CORRECT', 'Partial fix applied');
        break;
      case 'MANUAL_REQUIRED':
        httpStatus = 202; // Accepted but not completed
        logger.warn('WORKFLOW_CORRECT', 'Manual intervention required');
        break;
      case 'UNFIXABLE':
        httpStatus = 422; // Unprocessable Entity
        logger.error('WORKFLOW_CORRECT', 'Error cannot be fixed');
        break;
    }

    // 11. Success response
    return res.status(httpStatus).json({
      success: correctionResult.status === 'FIXED',
      data: responseData
    });

  } catch (error) {
    // 12. Unhandled error
    logger.error('WORKFLOW_CORRECT', `Unhandled error: ${error.message}`);
    return res.status(500).json(
      errorHandler.internal('Internal server error', {
        error: error.message
      })
    );
  }
}
