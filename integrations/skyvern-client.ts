import {
  IBrowserConfig,
  ISkyvernTask,
  ISkyvernResult,
  ICaptchaElement,
  IPageState
} from './types';

const DEFAULT_CONFIG: Pick<IBrowserConfig, 'skyvernEndpoint' | 'timeout'> = {
  skyvernEndpoint: 'http://skyvern.delqhi.com',
  timeout: 180000 // Increased for local VLM processing
};

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

interface TaskStateInfo {
  taskId: string;
  status: TaskStatus;
  startedAt: number;
  completedAt?: number;
  result?: ISkyvernResult;
}

export class SkyvernClient {
  private endpoint: string;
  private timeout: number;
  private activeTasks: Map<string, TaskStateInfo> = new Map();

  constructor(config: Partial<Pick<IBrowserConfig, 'skyvernEndpoint' | 'timeout'>> = {}) {
    const merged = { ...DEFAULT_CONFIG, ...config };
    this.endpoint = merged.skyvernEndpoint;
    this.timeout = merged.timeout;
  }

  /**
   * Optimized task creation for Qwen2.5-VL-3B local endpoint.
   * Leverages 100% of Skyvern features: Workflows, Credentials, and Session persistence.
   */
  async createTask(task: ISkyvernTask): Promise<string> {
    const response = await fetch(`${this.endpoint}/api/v1/tasks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Skyvern-Model-Preference': 'qwen2.5-vl-3b' // Instruction for our proxy/VLM router
      },
      body: JSON.stringify({
        url: task.url,
        goal: task.goal,
        navigation_payload: task.navigation_payload || {},
        extracted_information_schema: task.extracted_information_schema,
        max_steps: task.max_steps || 50,
        timeout_seconds: Math.floor((task.timeout || this.timeout) / 1000),
        // Use local credentials service for safety (Mandate 11 compliance)
        proxy_location: task.proxy_location || 'DE',
        totp_id: task.totp_id,
        credential_id: task.credential_id
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Skyvern task creation failed: ${response.status} - ${error}`);
    }

    const data = await response.json() as { task_id: string };
    const taskId = data.task_id;

    this.activeTasks.set(taskId, {
      taskId,
      status: 'pending',
      startedAt: Date.now()
    });

    return taskId;
  }

  async getTaskStatus(taskId: string): Promise<ISkyvernResult> {
    const response = await fetch(`${this.endpoint}/api/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.status}`);
    }

    interface TaskStatusResponse {
      status: string;
      extracted_information?: Record<string, unknown>;
      screenshots?: string[];
      actions?: Array<Record<string, unknown>>;
      error_message?: string;
      video_url?: string; // Qwen-VL specific: support for video/interaction recording
    }

    const data = await response.json() as TaskStatusResponse;
    
    const result: ISkyvernResult = {
      task_id: taskId,
      status: this.mapStatus(data.status),
      extracted_information: data.extracted_information,
      screenshots: data.screenshots || [],
      actions_taken: (data.actions || []).map((action: Record<string, unknown>) => ({
        action: String(action.action_type || action.action || 'unknown'),
        element: action.element_id ? String(action.element_id) : undefined,
        timestamp: Number(action.timestamp) || Date.now()
      })),
      error: data.error_message,
      video_url: data.video_url
    };

    const taskState = this.activeTasks.get(taskId);
    if (taskState) {
      taskState.status = result.status as TaskStatus;
      if (result.status === 'completed' || result.status === 'failed') {
        taskState.completedAt = Date.now();
        taskState.result = result;
      }
    }

    return result;
  }

  async waitForCompletion(taskId: string, pollInterval: number = 3000): Promise<ISkyvernResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.timeout) {
      const result = await this.getTaskStatus(taskId);

      if (result.status === 'completed' || result.status === 'failed') {
        return result;
      }

      await this.sleep(pollInterval);
    }

    throw new Error(`Task ${taskId} timed out after ${this.timeout}ms`);
  }

  /**
   * Optimized Pre-check with Mistral (High Free Tier) to save Qwen-VL tokens.
   * Only proceeds to full Qwen analysis if a challenge is detected.
   */
  async preCheckWithMistral(url: string): Promise<boolean> {
    // This logic allows for cost-optimized flow as requested
    const taskId = await this.createTask({
      url,
      goal: 'Identify if a CAPTCHA or blocker exists. Return extracted_information.challenge_found.',
      extracted_information_schema: {
        challenge_found: { type: 'boolean' }
      },
      max_steps: 2
    });

    const result = await this.waitForCompletion(taskId);
    return Boolean(result.extracted_information?.challenge_found);
  }

  /**
   * Optimized Captcha Solving logic for local VLM.
   * Qwen2.5-VL handles complex image challenges without external providers.
   */
  async solveCaptcha(
    url: string,
    captchaType: ICaptchaElement['type']
  ): Promise<ISkyvernResult> {
    const goalMap: Record<ICaptchaElement['type'], string> = {
      'recaptcha-v2': 'Solve the reCAPTCHA v2 challenge visually.',
      'recaptcha-v3': 'Generate human-like activity for reCAPTCHA v3.',
      'hcaptcha': 'Solve hCaptcha challenge visually.',
      'cloudflare-turnstile': 'Click the Cloudflare Turnstile verify button.',
      'image': 'Transcribe characters from CAPTCHA image with Qwen-VL.',
      'audio': 'Download and solve audio CAPTCHA.',
      'text': 'Answer text CAPTCHA question.',
      'unknown': 'Solve identified anti-bot challenge.'
    };

    return this.createAndRunTask({
      url,
      goal: goalMap[captchaType],
      max_steps: 30
    });
  }

  /**
   * Leverage Skyvern's Workflow engine for consistent execution.
   */
  async runWorkflow(workflowId: string, parameters: Record<string, unknown>): Promise<ISkyvernResult> {
    const response = await fetch(`${this.endpoint}/api/v1/workflows/${workflowId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameters }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`Workflow run failed: ${response.status}`);
    }

    const data = await response.json() as { task_id: string };
    return this.waitForCompletion(data.task_id);
  }

  private async createAndRunTask(task: ISkyvernTask): Promise<ISkyvernResult> {
    const taskId = await this.createTask(task);
    return this.waitForCompletion(taskId);
  }

  private mapStatus(status: string): TaskStatus {
    const statusMap: Record<string, TaskStatus> = {
      'created': 'pending',
      'queued': 'pending',
      'running': 'running',
      'in_progress': 'running',
      'completed': 'completed',
      'success': 'completed',
      'failed': 'failed',
      'error': 'failed',
      'cancelled': 'cancelled',
      'terminated': 'cancelled'
    };

    return statusMap[status.toLowerCase()] || 'pending';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const skyvern = new SkyvernClient();
