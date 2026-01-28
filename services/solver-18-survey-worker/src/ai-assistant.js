const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const AI_PROVIDERS = {
  // 🥇 PRIMARY for TEXT tasks - saves Gemini quota for vision!
  opencode_zen: {
    name: 'OpenCode Zen (grok-code)',
    endpoint: 'https://api.opencode.ai/v1/chat/completions',
    model: 'grok-code',
    free: true,
    rateLimit: 'UNLIMITED*',
    context: '200K tokens',
    output: '128K tokens',
    capabilities: ['text', 'function_calling', 'coding'],
    priority: 1,
    useFor: 'text'
  },
  // 🥈 PRIMARY for VISION tasks
  gemini: {
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    free: true,
    rateLimit: '60 req/min, 1500/day',
    capabilities: ['text', 'vision', 'multimodal'],
    priority: 2,
    useFor: 'vision'
  },
  // 🥉 FALLBACK for both
  mistral: {
    name: 'Mistral AI',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest',
    free: true,
    rateLimit: '1M tokens/month',
    capabilities: ['text'],
    priority: 3,
    useFor: 'fallback'
  },
  groq: {
    name: 'Groq (llama-3.2-90b-vision)',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.2-90b-vision-preview',
    free: true,
    rateLimit: '14,400 req/day',
    capabilities: ['text', 'vision'],
    priority: 4,
    useFor: 'vision_fallback'
  },
  huggingface: {
    name: 'HuggingFace Inference',
    endpoint: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
    free: true,
    rateLimit: 'Rate limited',
    capabilities: ['text'],
    priority: 5,
    useFor: 'emergency_fallback'
  }
};

class AIAssistant {
  constructor() {
    this.opencodeZenKey = process.env.OPENCODE_ZEN_API_KEY || 'sk-wsoDvbl0JOfbSk5lmYJ5JZEx3fzChVBAn9xdb5NkOKuaDCdjudzFyU2UJ975ozdT';
    this.opencodeZenModel = process.env.OPENCODE_ZEN_MODEL || 'grok-code';
    
    this.geminiKey = process.env.GEMINI_API_KEY;
    this.groqKey = process.env.GROQ_API_KEY;
    
    this.mistralKey = process.env.MISTRAL_API_KEY;
    this.huggingfaceKey = process.env.HUGGINGFACE_API_KEY;
    
    this.conversationHistory = [];
    
    this.rateLimits = {
      opencode_zen: { used: 0, limit: Infinity, resetAt: null },
      gemini: { used: 0, limit: 1500, resetAt: this.getEndOfDay() },
      groq: { used: 0, limit: 14400, resetAt: this.getEndOfDay() },
      mistral: { used: 0, limit: 1000000, resetAt: this.getEndOfMonth() },
      huggingface: { used: 0, limit: 1000, resetAt: this.getEndOfHour() }
    };
  }

  getEndOfDay() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  }

  getEndOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  }

  getEndOfHour() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
  }

  checkAndResetRateLimits() {
    const now = new Date();
    for (const [provider, limits] of Object.entries(this.rateLimits)) {
      if (limits.resetAt && now >= limits.resetAt) {
        limits.used = 0;
        if (provider === 'gemini' || provider === 'groq') {
          limits.resetAt = this.getEndOfDay();
        } else if (provider === 'mistral') {
          limits.resetAt = this.getEndOfMonth();
        } else if (provider === 'huggingface') {
          limits.resetAt = this.getEndOfHour();
        }
        logger.info(`🔄 Rate limit reset for ${provider}`);
      }
    }
  }

  trackUsage(provider) {
    this.checkAndResetRateLimits();
    if (this.rateLimits[provider]) {
      this.rateLimits[provider].used++;
    }
  }

  isProviderAvailable(provider) {
    this.checkAndResetRateLimits();
    const limits = this.rateLimits[provider];
    if (!limits) return true;
    return limits.used < limits.limit;
  }

  getRateLimitStatus() {
    this.checkAndResetRateLimits();
    const status = {};
    for (const [provider, limits] of Object.entries(this.rateLimits)) {
      status[provider] = {
        used: limits.used,
        limit: limits.limit === Infinity ? 'UNLIMITED' : limits.limit,
        remaining: limits.limit === Infinity ? 'UNLIMITED' : (limits.limit - limits.used),
        resetAt: limits.resetAt?.toISOString() || null,
        available: this.isProviderAvailable(provider)
      };
    }
    return status;
  }

  async chat(message, context = {}) {
    const systemPrompt = this.buildSystemPrompt(context);
    let provider = 'none';
    
    try {
      let response = await this.callOpenCodeZen(systemPrompt, message);
      if (response) provider = 'opencode_zen';
      
      if (!response) {
        response = await this.callMistral(systemPrompt, message);
        if (response) provider = 'mistral';
      }
      if (!response) {
        response = await this.callHuggingFace(systemPrompt, message);
        if (response) provider = 'huggingface';
      }

      if (response) {
        this.conversationHistory.push({ role: 'user', content: message });
        this.conversationHistory.push({ role: 'assistant', content: response });
        
        if (this.conversationHistory.length > 20) {
          this.conversationHistory = this.conversationHistory.slice(-20);
        }
      }

      return {
        success: !!response,
        response: response || 'Alle AI-Provider sind gerade nicht erreichbar.',
        provider
      };

    } catch (error) {
      logger.error(`❌ AI chat error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  buildSystemPrompt(context) {
    return `Du bist der SIN-Survey-Worker Assistent. Du hilfst beim:
- Konfigurieren von Survey-Plattformen
- Verstehen von Umfrage-Strategien
- Troubleshooting bei Problemen
- Optimieren der Earnings

Aktiver Kontext:
- Aktive Plattformen: ${context.activePlatforms || 'keine'}
- Heutige Earnings: ${context.todayEarnings || '0€'}
- Gelöste CAPTCHAs: ${context.captchasSolved || 0}

Antworte auf Deutsch, kurz und hilfreich.`;
  }

  async callOpenCodeZen(systemPrompt, userMessage) {
    if (!this.opencodeZenKey) return null;
    if (!this.isProviderAvailable('opencode_zen')) {
      logger.warn('⚠️ OpenCode Zen rate limit reached');
      return null;
    }

    try {
      const response = await axios.post(
        AI_PROVIDERS.opencode_zen.endpoint,
        {
          model: this.opencodeZenModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: { 
            'Authorization': `Bearer ${this.opencodeZenKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      this.trackUsage('opencode_zen');
      logger.info('✅ OpenCode Zen response received');
      return response.data.choices?.[0]?.message?.content;

    } catch (error) {
      logger.warn(`⚠️ OpenCode Zen failed: ${error.message}`);
      return null;
    }
  }

  async callGemini(systemPrompt, userMessage) {
    if (!this.geminiKey) return null;
    if (!this.isProviderAvailable('gemini')) {
      logger.warn('⚠️ Gemini daily rate limit reached (1500/day)');
      return null;
    }

    try {
      const response = await axios.post(
        `${AI_PROVIDERS.gemini.endpoint}?key=${this.geminiKey}`,
        {
          contents: [{
            parts: [
              { text: systemPrompt },
              { text: userMessage }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        },
        { timeout: 30000 }
      );

      this.trackUsage('gemini');
      return response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    } catch (error) {
      logger.warn(`⚠️ Gemini failed: ${error.message}`);
      return null;
    }
  }

  async callMistral(systemPrompt, userMessage) {
    if (!this.mistralKey) return null;
    if (!this.isProviderAvailable('mistral')) {
      logger.warn('⚠️ Mistral monthly limit reached');
      return null;
    }

    try {
      const response = await axios.post(
        AI_PROVIDERS.mistral.endpoint,
        {
          model: 'mistral-small-latest',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: { 'Authorization': `Bearer ${this.mistralKey}` },
          timeout: 30000
        }
      );

      this.trackUsage('mistral');
      return response.data.choices?.[0]?.message?.content;

    } catch (error) {
      logger.warn(`⚠️ Mistral failed: ${error.message}`);
      return null;
    }
  }

  async callHuggingFace(systemPrompt, userMessage) {
    if (!this.huggingfaceKey) return null;
    if (!this.isProviderAvailable('huggingface')) {
      logger.warn('⚠️ HuggingFace rate limit reached');
      return null;
    }

    try {
      const response = await axios.post(
        AI_PROVIDERS.huggingface.endpoint,
        {
          inputs: `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            return_full_text: false
          }
        },
        {
          headers: { 'Authorization': `Bearer ${this.huggingfaceKey}` },
          timeout: 60000
        }
      );

      this.trackUsage('huggingface');
      return response.data?.[0]?.generated_text;

    } catch (error) {
      logger.warn(`⚠️ HuggingFace failed: ${error.message}`);
      return null;
    }
  }

  async analyzeSurveyPage(screenshot, pageContent) {
    const prompt = `Analysiere diese Survey-Seite und identifiziere:
1. Fragen und mögliche Antworten
2. CAPTCHA-Elemente
3. Navigation (Weiter, Zurück, Abschließen Buttons)
4. Fortschrittsanzeige
5. Potenzielle Fallen (Attention Checks)

Gib strukturierte JSON-Antwort.`;

    return this.chat(prompt, { type: 'survey_analysis', hasScreenshot: !!screenshot });
  }

  async suggestAnswer(question, options, context) {
    const prompt = `Survey-Frage: "${question}"
Optionen: ${JSON.stringify(options)}
Kontext: ${JSON.stringify(context)}

Welche Antwort ist am wahrscheinlichsten korrekt/passend? Begründe kurz.`;

    return this.chat(prompt, { type: 'answer_suggestion' });
  }

  getProviderStatus() {
    return {
      opencode_zen: { configured: !!this.opencodeZenKey, ...AI_PROVIDERS.opencode_zen },
      gemini: { configured: !!this.geminiKey, ...AI_PROVIDERS.gemini },
      groq: { configured: !!this.groqKey, ...AI_PROVIDERS.groq },
      mistral: { configured: !!this.mistralKey, ...AI_PROVIDERS.mistral },
      huggingface: { configured: !!this.huggingfaceKey, ...AI_PROVIDERS.huggingface }
    };
  }

  async chatVision(message, imageBase64, context = {}) {
    const systemPrompt = this.buildSystemPrompt(context);
    let provider = 'none';
    
    try {
      let response = await this.callGeminiVision(systemPrompt, message, imageBase64);
      if (response) provider = 'gemini';
      
      if (!response) {
        response = await this.callGroqVision(systemPrompt, message, imageBase64);
        if (response) provider = 'groq';
      }

      return {
        success: !!response,
        response: response || 'Vision-Provider nicht erreichbar.',
        provider
      };

    } catch (error) {
      logger.error(`❌ Vision chat error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async callGeminiVision(systemPrompt, userMessage, imageBase64) {
    if (!this.geminiKey) return null;
    if (!this.isProviderAvailable('gemini')) {
      logger.warn('⚠️ Gemini daily limit reached - vision unavailable');
      return null;
    }

    try {
      const response = await axios.post(
        `${AI_PROVIDERS.gemini.endpoint}?key=${this.geminiKey}`,
        {
          contents: [{
            parts: [
              { text: systemPrompt },
              { text: userMessage },
              { inline_data: { mime_type: 'image/png', data: imageBase64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000
          }
        },
        { timeout: 60000 }
      );

      this.trackUsage('gemini');
      logger.info('✅ Gemini Vision response received');
      return response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    } catch (error) {
      logger.warn(`⚠️ Gemini Vision failed: ${error.message}`);
      return null;
    }
  }

  async callGroqVision(systemPrompt, userMessage, imageBase64) {
    if (!this.groqKey) return null;
    if (!this.isProviderAvailable('groq')) {
      logger.warn('⚠️ Groq daily limit reached');
      return null;
    }

    try {
      const response = await axios.post(
        AI_PROVIDERS.groq.endpoint,
        {
          model: AI_PROVIDERS.groq.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: userMessage },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
              ]
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        },
        {
          headers: { 'Authorization': `Bearer ${this.groqKey}` },
          timeout: 60000
        }
      );

      this.trackUsage('groq');
      logger.info('✅ Groq Vision response received');
      return response.data.choices?.[0]?.message?.content;

    } catch (error) {
      logger.warn(`⚠️ Groq Vision failed: ${error.message}`);
      return null;
    }
  }
}

module.exports = { AIAssistant, AI_PROVIDERS };
