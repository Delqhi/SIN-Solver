/**
 * 2captcha Worker - Custom Error Classes & Handlers
 * 
 * Provides structured error handling for:
 * - CAPTCHA detection failures
 * - Solving process errors
 * - Submission errors
 * - Timeout and cancellation
 * - Job queue management
 * 
 * All errors include error codes, HTTP status mapping, and recovery strategies.
 */

/**
 * Base error class for all 2captcha worker errors
 */
export class TwoCaptchaError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly recoverable: boolean;
  readonly retryable: boolean;
  readonly context: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    httpStatus: number = 500,
    options: {
      recoverable?: boolean;
      retryable?: boolean;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.recoverable = options.recoverable ?? false;
    this.retryable = options.retryable ?? false;
    this.context = options.context ?? {};

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, TwoCaptchaError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      httpStatus: this.httpStatus,
      recoverable: this.recoverable,
      retryable: this.retryable,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * CAPTCHA Detection Errors
 */
export class CaptchaDetectionError extends TwoCaptchaError {
  constructor(
    message: string,
    options: {
      recoverable?: boolean;
      retryable?: boolean;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, 'CAPTCHA_DETECTION_ERROR', 400, {
      recoverable: options.recoverable ?? true,
      retryable: options.retryable ?? true,
      context: options.context,
    });
    Object.setPrototypeOf(this, CaptchaDetectionError.prototype);
  }
}

export class CaptchaNotDetectedError extends CaptchaDetectionError {
  constructor(
    message: string = 'No CAPTCHA detected on page',
    context: Record<string, unknown> = {}
  ) {
    super(message, {
      recoverable: true,
      retryable: true,
      context: { ...context, type: 'no_captcha_detected' },
    });
    Object.defineProperty(this, 'code', {
      value: 'NO_CAPTCHA_DETECTED',
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.setPrototypeOf(this, CaptchaNotDetectedError.prototype);
  }
}

export class InvalidCaptchaTypeError extends CaptchaDetectionError {
  constructor(
    detectedType: string,
    supportedTypes: string[],
    context: Record<string, unknown> = {}
  ) {
    super(
      `CAPTCHA type "${detectedType}" is not supported. Supported types: ${supportedTypes.join(', ')}`,
      {
        recoverable: false,
        retryable: false,
        context: { ...context, detectedType, supportedTypes },
      }
    );
    Object.defineProperty(this, 'code', {
      value: 'INVALID_CAPTCHA_TYPE',
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.setPrototypeOf(this, InvalidCaptchaTypeError.prototype);
  }
}

export class ElementNotFoundError extends CaptchaDetectionError {
  constructor(
    elementType: 'image' | 'input' | 'submit' | 'container',
    selectors: string[],
    context: Record<string, unknown> = {}
  ) {
    super(
      `Could not locate ${elementType} element using selectors: ${selectors.join(', ')}`,
      {
        recoverable: true,
        retryable: true,
        context: { ...context, elementType, selectors },
      }
    );
    Object.defineProperty(this, 'code', {
      value: 'ELEMENT_NOT_FOUND',
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.setPrototypeOf(this, ElementNotFoundError.prototype);
  }
}

/**
 * CAPTCHA Solving Errors
 */
export class CaptchaSolvingError extends TwoCaptchaError {
  constructor(
    message: string,
    options: {
      recoverable?: boolean;
      retryable?: boolean;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, 'CAPTCHA_SOLVING_ERROR', 502, {
      recoverable: options.recoverable ?? true,
      retryable: options.retryable ?? true,
      context: options.context,
    });
    Object.setPrototypeOf(this, CaptchaSolvingError.prototype);
  }
}

export class SolverUnavailableError extends CaptchaSolvingError {
  constructor(
    solverType: string,
    reason: string,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Solver for type "${solverType}" is unavailable: ${reason}`,
      {
        recoverable: true,
        retryable: true,
        context: { ...context, solverType, reason },
      }
    );
    Object.defineProperty(this, 'code', {
      value: 'SOLVER_UNAVAILABLE',
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.setPrototypeOf(this, SolverUnavailableError.prototype);
  }
}

export class SolverTimeoutError extends CaptchaSolvingError {
  constructor(
    solverType: string,
    timeoutMs: number,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Solver for type "${solverType}" timed out after ${timeoutMs}ms`,
      {
        recoverable: true,
        retryable: true,
        context: { ...context, solverType, timeoutMs },
      }
    );
    Object.defineProperty(this, 'code', {
      value: 'SOLVER_TIMEOUT',
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.setPrototypeOf(this, SolverTimeoutError.prototype);
  }
}

export class InvalidSolutionError extends CaptchaSolvingError {
  constructor(
    reason: string,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Solution is invalid: ${reason}`,
      {
        recoverable: true,
        retryable: true,
        context: { ...context, reason },
      }
    );
    Object.defineProperty(this, 'code', {
      value: 'INVALID_SOLUTION',
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.setPrototypeOf(this, InvalidSolutionError.prototype);
  }
}

/**
 * CAPTCHA Submission Errors
 */
export class CaptchaSubmissionError extends TwoCaptchaError {
  constructor(
    message: string,
    options: {
      recoverable?: boolean;
      retryable?: boolean;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, 'CAPTCHA_SUBMISSION_ERROR', 400, {
      recoverable: options.recoverable ?? true,
      retryable: options.retryable ?? true,
      context: options.context,
    });
    Object.setPrototypeOf(this, CaptchaSubmissionError.prototype);
  }
}

export class SubmitButtonNotFoundError extends CaptchaSubmissionError {
  constructor(
    selectors: string[],
    context: Record<string, unknown> = {}
  ) {
    super(
      `Could not locate submit button using selectors: ${selectors.join(', ')}`,
      {
        recoverable: true,
        retryable: true,
        context: { ...context, selectors },
      }
    );
    Object.defineProperty(this, 'code', {
      value: 'SUBMIT_BUTTON_NOT_FOUND',
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.setPrototypeOf(this, SubmitButtonNotFoundError.prototype);
  }
}

export class SubmissionFailedError extends CaptchaSubmissionError {
  constructor(
    reason: string,
    context: Record<string, unknown> = {}
  ) {
    super(
      `CAPTCHA submission failed: ${reason}`,
      {
        recoverable: true,
        retryable: true,
        context: { ...context, reason },
      }
    );
    Object.defineProperty(this, 'code', {
      value: 'SUBMISSION_FAILED',
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.setPrototypeOf(this, SubmissionFailedError.prototype);
  }
}

/**
 * Timeout & Cancellation Errors
 */
export class TimeoutError extends TwoCaptchaError {
  readonly timeoutMs: number;
  readonly elapsedMs: number;

  constructor(
    message: string,
    timeoutMs: number,
    elapsedMs: number,
    context: Record<string, unknown> = {}
  ) {
    super(
      message,
      'TIMEOUT_ERROR',
      408,
      {
        recoverable: false,
        retryable: true,
        context: { ...context, timeoutMs, elapsedMs },
      }
    );
    this.timeoutMs = timeoutMs;
    this.elapsedMs = elapsedMs;
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class OperationTimeoutError extends TimeoutError {
  constructor(
    operation: string,
    timeoutMs: number,
    elapsedMs: number,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Operation "${operation}" exceeded timeout of ${timeoutMs}ms (elapsed: ${elapsedMs}ms)`,
      timeoutMs,
      elapsedMs,
      { ...context, operation }
    );
    Object.defineProperty(this, 'code', {
      value: 'OPERATION_TIMEOUT',
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.setPrototypeOf(this, OperationTimeoutError.prototype);
  }
}

export class JobTimeoutError extends TimeoutError {
  constructor(
    jobId: string,
    timeoutMs: number,
    elapsedMs: number,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Job "${jobId}" exceeded timeout of ${timeoutMs}ms (elapsed: ${elapsedMs}ms)`,
      timeoutMs,
      elapsedMs,
      { ...context, jobId }
    );
    Object.defineProperty(this, 'code', {
      value: 'JOB_TIMEOUT',
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.setPrototypeOf(this, JobTimeoutError.prototype);
  }
}

export class CancellationError extends TwoCaptchaError {
  constructor(
    jobId: string,
    reason: string = 'Job was cancelled',
    context: Record<string, unknown> = {}
  ) {
    super(
      `Job "${jobId}" was cancelled: ${reason}`,
      'CANCELLATION_ERROR',
      409,
      {
        recoverable: false,
        retryable: false,
        context: { ...context, jobId, reason },
      }
    );
    Object.setPrototypeOf(this, CancellationError.prototype);
  }
}

/**
 * Job Queue Errors
 */
export class JobQueueError extends TwoCaptchaError {
  constructor(
    message: string,
    options: {
      recoverable?: boolean;
      retryable?: boolean;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, 'JOB_QUEUE_ERROR', 503, {
      recoverable: options.recoverable ?? true,
      retryable: options.retryable ?? true,
      context: options.context,
    });
    Object.setPrototypeOf(this, JobQueueError.prototype);
  }
}

export class JobNotFoundError extends JobQueueError {
  constructor(
    jobId: string,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Job "${jobId}" not found`,
      {
        recoverable: false,
        retryable: false,
        context: { ...context, jobId },
      }
    );
    Object.defineProperty(this, 'code', {
      value: 'JOB_NOT_FOUND',
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.defineProperty(this, 'httpStatus', {
      value: 404,
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.setPrototypeOf(this, JobNotFoundError.prototype);
  }
}

export class InvalidJobStateError extends JobQueueError {
  constructor(
    jobId: string,
    currentState: string,
    expectedState: string | string[],
    context: Record<string, unknown> = {}
  ) {
    const expected = Array.isArray(expectedState) ? expectedState.join(', ') : expectedState;
    super(
      `Job "${jobId}" is in state "${currentState}", expected: ${expected}`,
      {
        recoverable: false,
        retryable: false,
        context: { ...context, jobId, currentState, expectedState },
      }
    );
    Object.defineProperty(this, 'code', {
      value: 'INVALID_JOB_STATE',
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.defineProperty(this, 'httpStatus', {
      value: 409,
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.setPrototypeOf(this, InvalidJobStateError.prototype);
  }
}

export class WorkerPoolExhaustedError extends JobQueueError {
  constructor(
    maxWorkers: number,
    queueLength: number,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Worker pool exhausted. Max workers: ${maxWorkers}, Queue length: ${queueLength}`,
      {
        recoverable: true,
        retryable: true,
        context: { ...context, maxWorkers, queueLength },
      }
    );
    Object.defineProperty(this, 'code', {
      value: 'WORKER_POOL_EXHAUSTED',
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.defineProperty(this, 'httpStatus', {
      value: 503,
      writable: false,
      enumerable: true,
      configurable: false
    });
    Object.setPrototypeOf(this, WorkerPoolExhaustedError.prototype);
  }
}

/**
 * Configuration & Initialization Errors
 */
export class ConfigurationError extends TwoCaptchaError {
  constructor(
    message: string,
    context: Record<string, unknown> = {}
  ) {
    super(
      message,
      'CONFIGURATION_ERROR',
      400,
      {
        recoverable: false,
        retryable: false,
        context,
      }
    );
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

export class BrowserInitializationError extends TwoCaptchaError {
  constructor(
    reason: string,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Failed to initialize browser: ${reason}`,
      'BROWSER_INITIALIZATION_ERROR',
      500,
      {
        recoverable: true,
        retryable: true,
        context,
      }
    );
    Object.setPrototypeOf(this, BrowserInitializationError.prototype);
  }
}

/**
 * Error Handler Utility
 */
export class ErrorHandler {
  /**
   * Determine if an error is retryable
   */
  static isRetryable(error: unknown): boolean {
    if (error instanceof TwoCaptchaError) {
      return error.retryable;
    }
    // Unknown errors are retryable by default
    return true;
  }

  /**
   * Determine if an error is recoverable
   */
  static isRecoverable(error: unknown): boolean {
    if (error instanceof TwoCaptchaError) {
      return error.recoverable;
    }
    // Unknown errors might be recoverable
    return true;
  }

  /**
   * Get HTTP status code for an error
   */
  static getHttpStatus(error: unknown): number {
    if (error instanceof TwoCaptchaError) {
      return error.httpStatus;
    }
    return 500;
  }

  /**
   * Get error code/type
   */
  static getErrorCode(error: unknown): string {
    if (error instanceof TwoCaptchaError) {
      return error.code;
    }
    if (error instanceof Error) {
      return error.name;
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Format error for API response
   */
  static formatErrorResponse(error: unknown): {
    code: string;
    message: string;
    context?: Record<string, unknown>;
    retryable: boolean;
  } {
    if (error instanceof TwoCaptchaError) {
      return {
        code: error.code,
        message: error.message,
        context: Object.keys(error.context).length > 0 ? error.context : undefined,
        retryable: error.retryable,
      };
    }
    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        retryable: true,
      };
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      retryable: true,
    };
  }

  /**
   * Calculate backoff delay for retry
   */
  static getBackoffDelay(
    attempt: number,
    baseDelayMs: number = 1000,
    maxDelayMs: number = 60000
  ): number {
    // Exponential backoff with jitter: baseDelay * (2 ^ attempt) + random(0, baseDelay)
    const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * baseDelayMs;
    return Math.min(exponentialDelay + jitter, maxDelayMs);
  }

  /**
   * Log error with structured context
   */
  static logError(
    error: unknown,
    context: Record<string, unknown> = {},
    logger?: { error: (message: string, meta: unknown) => void }
  ): void {
    const errorCode = this.getErrorCode(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRetryable = this.isRetryable(error);
    const isRecoverable = this.isRecoverable(error);

    const logEntry = {
      errorCode,
      errorMessage,
      isRetryable,
      isRecoverable,
      context,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined,
    };

    if (logger) {
      logger.error(`[${errorCode}] ${errorMessage}`, logEntry);
    } else {
      console.error(`[${errorCode}] ${errorMessage}`, logEntry);
    }
  }
}

export default ErrorHandler;
