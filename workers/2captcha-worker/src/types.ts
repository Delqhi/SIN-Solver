/**
 * @file types.ts - TypeScript interfaces and types for 2Captcha Worker
 * @description Central type definitions for the worker system
 */

// ============================================================================
// CAPTCHA DETECTION & SOLVING TYPES
// ============================================================================

/**
 * Supported CAPTCHA types
 */
export enum CaptchaType {
  IMAGE = 'image',
  TEXT = 'text',
  RECAPTCHA_V2 = 'recaptcha_v2',
  RECAPTCHA_V3 = 'recaptcha_v3',
  HCAPTCHA = 'hcaptcha',
  SLIDER = 'slider',
  CLICK = 'click',
  ROTATE = 'rotate',
}

/**
 * Detection result from TwoCaptchaDetector
 */
export interface DetectionResult {
  detectedType: CaptchaType;
  screenshot: Buffer | string; // Base64 or Buffer
  elements: DetectedElements;
  metadata: DetectionMetadata;
  confidence: number; // 0-1 confidence score
  error?: string;
}

/**
 * Detected CAPTCHA elements
 */
export interface DetectedElements {
  imageElement?: {
    src?: string;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
  };
  inputElement?: {
    selector: string;
    placeholder?: string;
    type?: string;
  };
  submitButton?: {
    selector: string;
    text?: string;
  };
  cannotSolveButton?: {
    selector: string;
    text?: string;
  };
  container?: {
    selector: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

/**
 * Detection metadata
 */
export interface DetectionMetadata {
  detectionType: 'selector-based' | 'text-pattern' | 'visual-analysis';
  elementCount: number;
  elapsedTimeMs: number;
  remainingTimeMs: number;
  detectionAttempts: number;
  timestamp: string;
}

/**
 * Solving result
 */
export interface SolvingResult {
  success: boolean;
  captchaType: CaptchaType;
  solution?: string | Record<string, string>; // Text or coordinates
  confidence: number;
  solvedByService?: string; // 'ddddocr' | 'gemini' | 'manual'
  elapsedTimeMs: number;
  error?: string;
}

/**
 * Submit result
 */
export interface SubmitResult {
  success: boolean;
  submittedAt: string;
  responseCode?: string;
  responseText?: string;
  elapsedTimeMs: number;
  error?: string;
}

// ============================================================================
// WORKER QUEUE & JOB TYPES
// ============================================================================

/**
 * CAPTCHA job in the queue
 */
export interface CaptchaJob {
  id: string;
  type: 'detect' | 'solve' | 'detect-and-solve';
  url?: string;
  priority: 1 | 2 | 3 | 4 | 5; // 1 = highest
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: JobResult;
  error?: JobError;
  timeout?: number; // milliseconds
  retries: {
    attempted: number;
    max: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Job status
 */
export type JobStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'cancelled';

/**
 * Job result
 */
export interface JobResult {
  detection?: DetectionResult;
  solving?: SolvingResult;
  submit?: SubmitResult;
  durationMs: number;
}

/**
 * Job error
 */
export interface JobError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * API request to detect CAPTCHA
 */
export interface DetectRequest {
  url?: string;
  timeout?: number;
  screenshot?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * API response for detection
 */
export interface DetectResponse {
  jobId: string;
  status: JobStatus;
  result?: DetectionResult;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

/**
 * API request to solve CAPTCHA
 */
export interface SolveRequest {
  jobId?: string;
  detectionResult: DetectionResult;
  timeout?: number;
  service?: 'gemini' | 'ddddocr' | 'auto';
  metadata?: Record<string, unknown>;
}

/**
 * API response for solving
 */
export interface SolveResponse {
  jobId: string;
  status: JobStatus;
  result?: SolvingResult;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

/**
 * API request for detect + solve workflow
 */
export interface DetectAndSolveRequest {
  url?: string;
  detectionTimeout?: number;
  solvingTimeout?: number;
  solveService?: 'gemini' | 'ddddocr' | 'auto';
  metadata?: Record<string, unknown>;
}

/**
 * API response for detect + solve
 */
export interface DetectAndSolveResponse {
  jobId: string;
  status: JobStatus;
  detection?: DetectionResult;
  solving?: SolvingResult;
  totalDurationMs: number;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

/**
 * Worker job request sent to worker service
 * The worker service adds jobId, priority, createdAt, etc.
 * See api.ts routes for usage examples
 */
export interface WorkerJobRequest {
  type: 'detect' | 'solve' | 'detect-and-solve';
  url: string;
  timeoutMs?: number;
  captchaType?: string;  // Only used for 'solve' type
}

/**
 * Worker job response
 */
export interface WorkerJobResponse {
  jobId: string;
  status: JobStatus;
  result?: JobResult;
  error?: JobError;
  completedAt?: string;
  durationMs: number;
}

/**
 * Worker statistics (aggregated metrics)
 */
export interface WorkerStats {
  total: number;
  successful: number;
  accuracy: number;
  earnings: number;
  averageEarnings: number;
  totalTime: number;
  averageTime: number;
  uptime: number;
  lastUpdated: string;
}

/**
 * Job status query response
 */
export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress: number; // 0-100
  result?: JobResult;
  error?: JobError;
  estimatedTimeRemainingMs?: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number; // seconds
  browser?: {
    status: 'running' | 'stopped';
    processId?: number;
  };
  queue?: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  memory?: {
    heapUsed: number;
    heapTotal: number;
  };
  timestamp: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

// ============================================================================
// SERVICE & CONFIGURATION TYPES
// ============================================================================

/**
 * Worker service configuration
 */
export interface WorkerServiceConfig {
  port: number;
  host: string;
  environment: 'development' | 'production';
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
  };
  queue: {
    maxConcurrent: number;
    maxRetries: number;
    defaultTimeout: number;
  };
  browser: {
    headless: boolean;
    stealth: boolean;
    timeout: number;
  };
  metrics: {
    enabled: boolean;
    port?: number;
  };
}

/**
 * Browser session configuration
 */
export interface BrowserSessionConfig {
  headless?: boolean;
  stealth?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  proxy?: {
    url: string;
    username?: string;
    password?: string;
  };
  timeout?: number;
}

/**
 * Detector configuration options
 */
export interface DetectorConfig {
  timeout: number;
  maxAttempts: number;
  pollInterval: number;
  captchaSelectors: CaptchaSelectors;
  screenshot: boolean;
  metadata: boolean;
}

/**
 * CAPTCHA element selectors
 */
export interface CaptchaSelectors {
  image: string[];
  input: string[];
  submitButton: string[];
  cannotSolveButton?: string[];
  container?: string[];
}

// ============================================================================
// METRICS & MONITORING TYPES
// ============================================================================

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  detectionTimeMs: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  };
  solvingTimeMs: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  };
  successRate: {
    detection: number; // percentage
    solving: number; // percentage
    overall: number; // percentage
  };
  totalJobsProcessed: number;
  totalJobsFailed: number;
  totalJobsTimeout: number;
}

/**
 * Job statistics
 */
export interface JobStats {
  totalCreated: number;
  totalCompleted: number;
  totalFailed: number;
  totalTimeout: number;
  averageDurationMs: number;
  lastCreatedAt: string;
  lastCompletedAt: string;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  averageWaitTimeMs: number;
}

// ============================================================================
// LOGGER TYPES
// ============================================================================

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error | Record<string, unknown>): void;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Worker event types
 */
export enum WorkerEvent {
  JOB_CREATED = 'job:created',
  JOB_STARTED = 'job:started',
  JOB_COMPLETED = 'job:completed',
  JOB_FAILED = 'job:failed',
  JOB_TIMEOUT = 'job:timeout',
  DETECTION_SUCCESS = 'detection:success',
  DETECTION_FAILED = 'detection:failed',
  SOLVING_SUCCESS = 'solving:success',
  SOLVING_FAILED = 'solving:failed',
  SUBMIT_SUCCESS = 'submit:success',
  SUBMIT_FAILED = 'submit:failed',
  WORKER_STARTED = 'worker:started',
  WORKER_STOPPED = 'worker:stopped',
  WORKER_ERROR = 'worker:error',
}

/**
 * Event payload
 */
export interface WorkerEventPayload {
  event: WorkerEvent;
  jobId?: string;
  timestamp: string;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Generic response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  requestId?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Async operation result
 */
export type AsyncResult<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };
