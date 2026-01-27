/**
 * Audio CAPTCHA Solver - Based on Buster Captcha Solver research
 * 
 * Supports multiple Speech-to-Text APIs:
 * - Wit.ai (FREE)
 * - Google Cloud Speech-to-Text
 * - IBM Watson Speech-to-Text
 * - Microsoft Azure Speech
 * - OpenAI Whisper (self-hosted)
 */

export interface AudioSolverConfig {
  primaryApi: 'witai' | 'google' | 'ibm' | 'azure' | 'whisper';
  fallbackApis: Array<'witai' | 'google' | 'ibm' | 'azure' | 'whisper'>;
  witaiApiKey?: string;
  googleApiKey?: string;
  ibmApiKey?: string;
  ibmServiceUrl?: string;
  azureApiKey?: string;
  azureRegion?: string;
  whisperEndpoint?: string;
  language: string;
  maxRetries: number;
  timeout: number;
}

export interface AudioSolveResult {
  success: boolean;
  transcription?: string;
  confidence: number;
  apiUsed: string;
  duration: number;
  error?: string;
}

interface SpeechApiClient {
  transcribe(audioBuffer: Buffer, language: string): Promise<{ text: string; confidence: number }>;
}

const DEFAULT_CONFIG: Omit<AudioSolverConfig, 'witaiApiKey'> = {
  primaryApi: 'witai',
  fallbackApis: ['whisper'],
  language: 'en',
  maxRetries: 3,
  timeout: 30000,
};

export class AudioCaptchaSolver {
  private config: AudioSolverConfig;
  private clients: Map<string, SpeechApiClient> = new Map();

  constructor(config: Partial<AudioSolverConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config } as AudioSolverConfig;
    this.initializeClients();
  }

  private initializeClients(): void {
    if (this.config.witaiApiKey) {
      this.clients.set('witai', new WitAiClient(this.config.witaiApiKey));
    }
    if (this.config.googleApiKey) {
      this.clients.set('google', new GoogleSpeechClient(this.config.googleApiKey));
    }
    if (this.config.ibmApiKey && this.config.ibmServiceUrl) {
      this.clients.set('ibm', new IbmWatsonClient(this.config.ibmApiKey, this.config.ibmServiceUrl));
    }
    if (this.config.azureApiKey && this.config.azureRegion) {
      this.clients.set('azure', new AzureSpeechClient(this.config.azureApiKey, this.config.azureRegion));
    }
    if (this.config.whisperEndpoint) {
      this.clients.set('whisper', new WhisperClient(this.config.whisperEndpoint));
    }
  }

  async solve(audioUrl: string): Promise<AudioSolveResult> {
    const startTime = Date.now();

    try {
      const audioBuffer = await this.downloadAudio(audioUrl);
      const processedAudio = await this.preprocessAudio(audioBuffer);
      
      const apisToTry = [this.config.primaryApi, ...this.config.fallbackApis];
      
      for (const api of apisToTry) {
        const client = this.clients.get(api);
        if (!client) continue;

        for (let retry = 0; retry < this.config.maxRetries; retry++) {
          try {
            const result = await client.transcribe(processedAudio, this.config.language);
            
            if (result.text && result.text.length > 0) {
              const cleanedText = this.cleanTranscription(result.text);
              
              return {
                success: true,
                transcription: cleanedText,
                confidence: result.confidence,
                apiUsed: api,
                duration: Date.now() - startTime,
              };
            }
          } catch (error) {
            if (retry === this.config.maxRetries - 1) {
              console.error(`API ${api} failed after ${this.config.maxRetries} retries:`, error);
            }
            await this.sleep(1000 * (retry + 1));
          }
        }
      }

      return {
        success: false,
        confidence: 0,
        apiUsed: 'none',
        duration: Date.now() - startTime,
        error: 'All speech APIs failed',
      };

    } catch (error) {
      return {
        success: false,
        confidence: 0,
        apiUsed: 'none',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async solveFromBuffer(audioBuffer: Buffer): Promise<AudioSolveResult> {
    const startTime = Date.now();

    try {
      const processedAudio = await this.preprocessAudio(audioBuffer);
      
      const apisToTry = [this.config.primaryApi, ...this.config.fallbackApis];
      
      for (const api of apisToTry) {
        const client = this.clients.get(api);
        if (!client) continue;

        try {
          const result = await client.transcribe(processedAudio, this.config.language);
          
          if (result.text && result.text.length > 0) {
            return {
              success: true,
              transcription: this.cleanTranscription(result.text),
              confidence: result.confidence,
              apiUsed: api,
              duration: Date.now() - startTime,
            };
          }
        } catch (error) {
          console.error(`API ${api} failed:`, error);
        }
      }

      return {
        success: false,
        confidence: 0,
        apiUsed: 'none',
        duration: Date.now() - startTime,
        error: 'All speech APIs failed',
      };

    } catch (error) {
      return {
        success: false,
        confidence: 0,
        apiUsed: 'none',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async downloadAudio(url: string): Promise<Buffer> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async preprocessAudio(audioBuffer: Buffer): Promise<Buffer> {
    return audioBuffer;
  }

  private cleanTranscription(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class WitAiClient implements SpeechApiClient {
  private apiKey: string;
  private languageEndpoints: Record<string, string> = {
    en: 'https://api.wit.ai/speech',
    de: 'https://api.wit.ai/speech',
    fr: 'https://api.wit.ai/speech',
    es: 'https://api.wit.ai/speech',
  };

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(audioBuffer: Buffer, language: string): Promise<{ text: string; confidence: number }> {
    const endpoint = this.languageEndpoints[language] || this.languageEndpoints['en'];
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'audio/mpeg3',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      throw new Error(`Wit.ai API error: ${response.status}`);
    }

    const data = await response.json() as { text?: string; _text?: string };
    const text = data.text || data._text || '';
    
    return {
      text,
      confidence: text.length > 0 ? 0.85 : 0,
    };
  }
}

class GoogleSpeechClient implements SpeechApiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(audioBuffer: Buffer, language: string): Promise<{ text: string; confidence: number }> {
    const endpoint = `https://speech.googleapis.com/v1/speech:recognize?key=${this.apiKey}`;
    
    const requestBody = {
      config: {
        encoding: 'MP3',
        sampleRateHertz: 16000,
        languageCode: language,
        model: 'default',
      },
      audio: {
        content: audioBuffer.toString('base64'),
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Google Speech API error: ${response.status}`);
    }

    const data = await response.json() as {
      results?: Array<{
        alternatives?: Array<{ transcript?: string; confidence?: number }>;
      }>;
    };
    
    const result = data.results?.[0]?.alternatives?.[0];
    
    return {
      text: result?.transcript || '',
      confidence: result?.confidence || 0,
    };
  }
}

class IbmWatsonClient implements SpeechApiClient {
  private apiKey: string;
  private serviceUrl: string;

  constructor(apiKey: string, serviceUrl: string) {
    this.apiKey = apiKey;
    this.serviceUrl = serviceUrl;
  }

  async transcribe(audioBuffer: Buffer, language: string): Promise<{ text: string; confidence: number }> {
    const modelMap: Record<string, string> = {
      en: 'en-US_BroadbandModel',
      de: 'de-DE_BroadbandModel',
      fr: 'fr-FR_BroadbandModel',
      es: 'es-ES_BroadbandModel',
    };

    const model = modelMap[language] || modelMap['en'];
    const endpoint = `${this.serviceUrl}/v1/recognize?model=${model}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`apikey:${this.apiKey}`).toString('base64')}`,
        'Content-Type': 'audio/mp3',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      throw new Error(`IBM Watson API error: ${response.status}`);
    }

    const data = await response.json() as {
      results?: Array<{
        alternatives?: Array<{ transcript?: string; confidence?: number }>;
      }>;
    };
    
    const result = data.results?.[0]?.alternatives?.[0];
    
    return {
      text: result?.transcript || '',
      confidence: result?.confidence || 0,
    };
  }
}

class AzureSpeechClient implements SpeechApiClient {
  private apiKey: string;
  private region: string;

  constructor(apiKey: string, region: string) {
    this.apiKey = apiKey;
    this.region = region;
  }

  async transcribe(audioBuffer: Buffer, language: string): Promise<{ text: string; confidence: number }> {
    const endpoint = `https://${this.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language}-${language.toUpperCase()}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Content-Type': 'audio/wav',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      throw new Error(`Azure Speech API error: ${response.status}`);
    }

    const data = await response.json() as {
      DisplayText?: string;
      RecognitionStatus?: string;
    };
    
    return {
      text: data.DisplayText || '',
      confidence: data.RecognitionStatus === 'Success' ? 0.9 : 0,
    };
  }
}

class WhisperClient implements SpeechApiClient {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async transcribe(audioBuffer: Buffer, language: string): Promise<{ text: string; confidence: number }> {
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer]), 'audio.mp3');
    formData.append('language', language);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status}`);
    }

    const data = await response.json() as { text?: string };
    
    return {
      text: data.text || '',
      confidence: 0.9,
    };
  }
}

export function createAudioCaptchaSolver(config: Partial<AudioSolverConfig>): AudioCaptchaSolver {
  return new AudioCaptchaSolver(config);
}
