export interface BrowserWorkerConfig {
  provider: '2captcha' | 'kolotibablo' | 'captcha-guru' | 'anti-captcha';
  username: string;
  password: string;
  headless?: boolean;
  steelBrowserUrl?: string;
}

export interface BrowserWorkerStats {
  totalSolved: number;
  totalFailed: number;
  totalEarned: number;
  startTime: number;
  currentStreak: number;
}

export interface CaptchaTask {
  id: string;
  type: string;
  imageData?: string;
  question?: string;
  instructions?: string;
}

export interface SolverResponse {
  confidence: number;
  answer: string;
  solveTime: number;
}

export interface WorkerConfig {
  name: string;
  type: WorkerType;
  capabilities: string[];
  apiBrainUrl: string;
  stagehandUrl: string;
  heartbeatInterval: number;
}

export type WorkerType = 'captcha' | 'scraper' | 'form-filler' | 'ai-sales' | 'general';
export type TaskStatus = 'pending' | 'claimed' | 'running' | 'completed' | 'failed';
export type WorkerStatus = 'online' | 'offline' | 'busy' | 'error';

export interface Worker {
  id: string;
  name: string;
  type: WorkerType;
  status: WorkerStatus;
  capabilities: string[];
  lastHeartbeat: Date;
  tasksCompleted: number;
  tasksFailed: number;
}

export interface Task {
  id: string;
  type: string;
  status: TaskStatus;
  priority: number;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  workerId?: string;
  createdAt: Date;
  claimedAt?: Date;
  completedAt?: Date;
}

export interface TaskResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  duration: number;
}

export interface WebSocketMessage {
  type: string;
  data?: unknown;
  workerId?: string;
}

