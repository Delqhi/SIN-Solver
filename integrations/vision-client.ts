import {
  IVisionAnalysisRequest,
  IVisionAnalysisResult,
  ICaptchaElement
} from './types';

interface VisionConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  maxTokens: number;
  timeout: number;
}

const DEFAULT_CONFIG: Omit<VisionConfig, 'apiKey'> = {
  endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
  model: 'Qwen/Qwen2.5-VL-72B-Instruct',
  maxTokens: 2048,
  timeout: 60000
};

interface CaptchaSolveAttempt {
  captchaType: ICaptchaElement['type'];
  solution: string | null;
  confidence: number;
  reasoning: string;
  timing: { started: number; completed: number; duration: number };
}

export class VisionClient {
  private config: VisionConfig;

  constructor(apiKeyOrConfig: string | Partial<VisionConfig>) {
    if (typeof apiKeyOrConfig === 'string') {
      this.config = { ...DEFAULT_CONFIG, apiKey: apiKeyOrConfig };
    } else {
      if (!apiKeyOrConfig.apiKey) {
        throw new Error('VisionClient requires apiKey');
      }
      this.config = { ...DEFAULT_CONFIG, ...apiKeyOrConfig } as VisionConfig;
    }
  }

  async analyze(request: IVisionAnalysisRequest): Promise<IVisionAnalysisResult> {
    const imageBase64 = this.toBase64(request.image);

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`
                }
              },
              {
                type: 'text',
                text: request.prompt
              }
            ]
          }
        ],
        max_tokens: request.maxTokens || this.config.maxTokens
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vision API failed: ${response.status} - ${error}`);
    }

    interface VisionAPIResponse {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    }

    const data = await response.json() as VisionAPIResponse;
    const content = data.choices?.[0]?.message?.content || '';

    return {
      text: content,
      confidence: this.calculateConfidence(content),
      captchaSolution: this.extractCaptchaSolution(content)
    };
  }

  async solveCaptcha(
    image: Buffer | string,
    captchaType: ICaptchaElement['type']
  ): Promise<CaptchaSolveAttempt> {
    const startTime = Date.now();
    const prompt = this.getCaptchaPrompt(captchaType);

    try {
      const result = await this.analyze({ image, prompt });
      const completed = Date.now();

      return {
        captchaType,
        solution: result.captchaSolution || null,
        confidence: result.confidence,
        reasoning: result.text,
        timing: {
          started: startTime,
          completed,
          duration: completed - startTime
        }
      };
    } catch (error) {
      const completed = Date.now();
      return {
        captchaType,
        solution: null,
        confidence: 0,
        reasoning: error instanceof Error ? error.message : 'Unknown error',
        timing: {
          started: startTime,
          completed,
          duration: completed - startTime
        }
      };
    }
  }

  async solveImageCaptcha(image: Buffer | string): Promise<string | null> {
    const result = await this.solveCaptcha(image, 'image');
    return result.solution;
  }

  async solveTextFromImage(image: Buffer | string): Promise<string> {
    const result = await this.analyze({
      image,
      prompt: 'Extract and return ONLY the text visible in this image. Return the exact characters you see, with no additional explanation.'
    });

    return result.text.trim();
  }

  async identifyCaptchaType(screenshot: Buffer | string): Promise<ICaptchaElement['type']> {
    const result = await this.analyze({
      image: screenshot,
      prompt: `Analyze this screenshot and identify if there is a CAPTCHA present. If found, classify it as one of these types:
- recaptcha-v2: Google reCAPTCHA with checkbox "I'm not a robot"
- recaptcha-v3: Invisible Google reCAPTCHA (look for badge in corner)
- hcaptcha: hCaptcha with checkbox or image selection
- cloudflare-turnstile: Cloudflare verification widget
- image: Traditional image-based CAPTCHA with distorted text
- audio: Audio-based CAPTCHA
- text: Text-based question CAPTCHA
- unknown: Cannot determine or no CAPTCHA present

Respond with ONLY the type name, nothing else.`
    });

    return this.mapCaptchaType(result.text.trim().toLowerCase());
  }

  async describeClickTargets(screenshot: Buffer | string): Promise<Array<{
    description: string;
    location: { x: number; y: number };
    action: string;
  }>> {
    const result = await this.analyze({
      image: screenshot,
      prompt: `Analyze this screenshot and identify all clickable elements. For each element, provide:
1. A brief description of what the element is
2. Its approximate location as x,y coordinates (as percentage of image width/height)
3. What action clicking it would perform

Format your response as JSON array:
[{"description": "Submit button", "location": {"x": 50, "y": 80}, "action": "submits the form"}]`
    });

    try {
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
    }

    return [];
  }

  async selectCorrectImages(
    screenshot: Buffer | string,
    instruction: string
  ): Promise<number[]> {
    const result = await this.analyze({
      image: screenshot,
      prompt: `This is a CAPTCHA image selection challenge. The instruction is: "${instruction}"

Analyze the grid of images and identify which image(s) match the instruction.
Number the images from 1-9 (or 1-16) starting from top-left, going right then down.

Respond with ONLY a comma-separated list of image numbers that match.
Example: 1,3,5,7`
    });

    const numbers = result.text.match(/\d+/g);
    return numbers ? numbers.map(n => parseInt(n, 10)) : [];
  }

  async analyzeRecaptchaChallenge(screenshot: Buffer | string): Promise<{
    challengeType: 'checkbox' | 'image' | 'audio' | 'unknown';
    instruction: string | null;
    gridSize: { rows: number; cols: number } | null;
    clickTargets: number[];
  }> {
    const result = await this.analyze({
      image: screenshot,
      prompt: `Analyze this reCAPTCHA challenge screenshot and provide:
1. Challenge type: "checkbox" (simple I'm not a robot), "image" (image selection), "audio" (audio challenge), or "unknown"
2. The instruction text if it's an image challenge (e.g., "Select all images with traffic lights")
3. The grid size if it's an image grid (e.g., 3x3 or 4x4)
4. If image challenge: which images should be selected (numbered 1-9 or 1-16 from top-left)

Format as JSON:
{"challengeType": "image", "instruction": "Select all traffic lights", "gridSize": {"rows": 3, "cols": 3}, "clickTargets": [1, 4, 7]}`
    });

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          challengeType: parsed.challengeType || 'unknown',
          instruction: parsed.instruction || null,
          gridSize: parsed.gridSize || null,
          clickTargets: parsed.clickTargets || []
        };
      }
    } catch {
    }

    return {
      challengeType: 'unknown',
      instruction: null,
      gridSize: null,
      clickTargets: []
    };
  }

  async checkChallengeCompletion(screenshot: Buffer | string): Promise<{
    completed: boolean;
    success: boolean;
    message: string;
  }> {
    const result = await this.analyze({
      image: screenshot,
      prompt: `Analyze this screenshot and determine if a CAPTCHA challenge has been completed.
Look for:
- Green checkmark indicating success
- Error message indicating failure
- New challenge indicating retry needed
- Verification in progress spinner

Respond as JSON:
{"completed": true/false, "success": true/false, "message": "brief description"}`
    });

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          completed: Boolean(parsed.completed),
          success: Boolean(parsed.success),
          message: parsed.message || ''
        };
      }
    } catch {
    }

    return {
      completed: false,
      success: false,
      message: 'Unable to determine status'
    };
  }

  private getCaptchaPrompt(captchaType: ICaptchaElement['type']): string {
    const prompts: Record<ICaptchaElement['type'], string> = {
      'image': 'This is a text-based CAPTCHA image. Extract the characters/text shown in the distorted image. Return ONLY the characters you see, with no spaces or additional text.',
      'text': 'This is a text-based challenge. Read the question and provide the answer. Return ONLY the answer.',
      'recaptcha-v2': 'Analyze this reCAPTCHA v2 challenge. If it shows images to select, identify which images match the instruction and return their positions (1-9, numbered left to right, top to bottom).',
      'recaptcha-v3': 'This appears to be a reCAPTCHA v3 verification. Describe what you see on the page.',
      'hcaptcha': 'Analyze this hCaptcha challenge. If it shows images to select, identify which images match the instruction and return their positions.',
      'cloudflare-turnstile': 'Analyze this Cloudflare Turnstile challenge. Describe what action is needed to complete it.',
      'audio': 'This is an audio CAPTCHA. I cannot process audio. Please switch to image CAPTCHA.',
      'unknown': 'Analyze this image and identify if there is a CAPTCHA. If so, attempt to solve it and return the solution.'
    };

    return prompts[captchaType];
  }

  private toBase64(input: Buffer | string): string {
    if (typeof input === 'string') {
      if (input.startsWith('data:')) {
        return input.split(',')[1] || input;
      }
      return input;
    }
    return input.toString('base64');
  }

  private calculateConfidence(response: string): number {
    const responseLower = response.toLowerCase();

    const lowConfidenceIndicators = [
      'i cannot', 'unable to', 'not sure', 'unclear',
      'difficult to', 'hard to read', 'blurry', 'obscured'
    ];

    const highConfidenceIndicators = [
      'clearly', 'definitely', 'the text is', 'i can see',
      'the answer is', 'the solution is'
    ];

    let confidence = 0.7;

    for (const indicator of lowConfidenceIndicators) {
      if (responseLower.includes(indicator)) {
        confidence -= 0.15;
      }
    }

    for (const indicator of highConfidenceIndicators) {
      if (responseLower.includes(indicator)) {
        confidence += 0.1;
      }
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private extractCaptchaSolution(response: string): string | undefined {
    const cleanedResponse = response.trim();

    if (/^[A-Za-z0-9]{4,8}$/.test(cleanedResponse)) {
      return cleanedResponse;
    }

    const patterns = [
      /(?:solution|answer|text|characters?)(?:\s*(?:is|are|:))?\s*["']?([A-Za-z0-9]{4,8})["']?/i,
      /["']([A-Za-z0-9]{4,8})["']/,
      /`([A-Za-z0-9]{4,8})`/,
      /\*\*([A-Za-z0-9]{4,8})\*\*/
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    const words = cleanedResponse.split(/\s+/);
    if (words.length === 1 && /^[A-Za-z0-9]+$/.test(words[0])) {
      return words[0];
    }

    return undefined;
  }

  private mapCaptchaType(type: string): ICaptchaElement['type'] {
    const typeMap: Record<string, ICaptchaElement['type']> = {
      'recaptcha-v2': 'recaptcha-v2',
      'recaptcha_v2': 'recaptcha-v2',
      'recaptcha v2': 'recaptcha-v2',
      'recaptcha-v3': 'recaptcha-v3',
      'recaptcha_v3': 'recaptcha-v3',
      'recaptcha v3': 'recaptcha-v3',
      'hcaptcha': 'hcaptcha',
      'h-captcha': 'hcaptcha',
      'turnstile': 'cloudflare-turnstile',
      'cloudflare': 'cloudflare-turnstile',
      'cloudflare-turnstile': 'cloudflare-turnstile',
      'image': 'image',
      'audio': 'audio',
      'text': 'text'
    };

    return typeMap[type] || 'unknown';
  }
}

export function createVisionClient(apiKeyOrConfig: string | Partial<VisionConfig>): VisionClient {
  return new VisionClient(apiKeyOrConfig);
}
