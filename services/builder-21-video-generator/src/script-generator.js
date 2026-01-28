/**
 * Zimmer-21: Script Generator
 * AI-powered video script generation using OpenCode Zen (FREE)
 */

const axios = require('axios');
const config = require('./config');
const logger = require('./logger');

/**
 * Script templates for different content types
 */
const SCRIPT_TEMPLATES = {
  educational: {
    system: `Du bist ein professioneller Video-Scriptwriter für kurze, packende Erklärvideos (30-60 Sekunden).
Schreibe Scripts die:
- Sofort mit einem Hook beginnen
- Klare, einfache Sprache verwenden
- Einen starken Call-to-Action haben
- Für TikTok/YouTube Shorts/Instagram Reels optimiert sind

Format:
[HOOK] - Die ersten 3 Sekunden (Aufmerksamkeit gewinnen)
[CONTENT] - Der Hauptinhalt (20-40 Sekunden)
[CTA] - Call to Action (letzte 5-10 Sekunden)`,
    
    userPrompt: (topic) => `Erstelle ein kurzes Video-Script zum Thema: "${topic}"
Das Video soll maximal 60 Sekunden lang sein.
Schreibe nur den gesprochenen Text, keine Regieanweisungen.`
  },

  promotional: {
    system: `Du bist ein Marketing-Experte für Social Media Videos.
Erstelle überzeugende Werbe-Scripts die:
- Das Problem des Zuschauers ansprechen
- Die Lösung präsentieren
- Dringlichkeit erzeugen
- Zum Handeln auffordern

Format:
[PROBLEM] - Pain Point ansprechen
[SOLUTION] - Dein Produkt/Service vorstellen
[PROOF] - Beweis/Testimonial
[CTA] - Klarer Handlungsaufruf`,

    userPrompt: (topic) => `Erstelle ein Werbe-Script für: "${topic}"
Maximal 45 Sekunden. Nur gesprochener Text.`
  },

  story: {
    system: `Du bist ein Storyteller für virale Social Media Videos.
Erzähle fesselnde Geschichten die:
- Mit einer überraschenden Aussage starten
- Spannung aufbauen
- Einen Plot-Twist haben
- Emotional berühren

Der Zuschauer soll bis zum Ende bleiben wollen.`,

    userPrompt: (topic) => `Erzähle eine kurze Geschichte zum Thema: "${topic}"
Maximal 60 Sekunden. Nur der gesprochene Text.`
  },

  tips: {
    system: `Du bist ein Experte für schnelle, wertvolle Tipps-Videos.
Erstelle Scripts die:
- Sofort den Nutzen kommunizieren
- 3-5 konkrete Tipps geben
- Leicht zu merken sind
- Zum Teilen animieren`,

    userPrompt: (topic) => `Gib 3-5 schnelle Tipps zum Thema: "${topic}"
Maximal 45 Sekunden. Nur gesprochener Text.`
  }
};

/**
 * Generate video script using OpenCode Zen API
 * @param {string} topic - The topic for the video
 * @param {string} contentType - Type of content (educational, promotional, story, tips)
 * @param {object} options - Additional options
 * @returns {Promise<object>} Generated script with metadata
 */
async function generateScript(topic, contentType = 'educational', options = {}) {
  const startTime = Date.now();
  
  const template = SCRIPT_TEMPLATES[contentType] || SCRIPT_TEMPLATES.educational;
  
  const requestBody = {
    model: options.model || config.opencode.model,
    messages: [
      {
        role: 'system',
        content: template.system
      },
      {
        role: 'user',
        content: template.userPrompt(topic)
      }
    ],
    max_tokens: options.maxTokens || config.opencode.maxTokens,
    temperature: options.temperature || 0.8,
    top_p: 0.95
  };

  try {
    logger.info('Generating script', { topic, contentType, model: requestBody.model });

    const response = await axios.post(config.opencode.apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${config.opencode.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 second timeout
    });

    const generatedText = response.data.choices[0]?.message?.content || '';
    const wordCount = generatedText.split(/\s+/).length;
    const estimatedDuration = Math.ceil(wordCount / 2.5); // ~150 words per minute

    const result = {
      success: true,
      script: generatedText,
      metadata: {
        topic,
        contentType,
        wordCount,
        estimatedDurationSeconds: estimatedDuration,
        model: requestBody.model,
        generationTimeMs: Date.now() - startTime,
        tokens: {
          prompt: response.data.usage?.prompt_tokens || 0,
          completion: response.data.usage?.completion_tokens || 0,
          total: response.data.usage?.total_tokens || 0
        }
      }
    };

    logger.info('Script generated successfully', result.metadata);
    return result;

  } catch (error) {
    logger.error('Script generation failed', {
      topic,
      contentType,
      error: error.message,
      status: error.response?.status
    });

    // Fallback to alternative model if primary fails
    if (!options._isRetry && error.response?.status !== 401) {
      logger.info('Retrying with fallback model...');
      return generateScript(topic, contentType, {
        ...options,
        model: 'zen/big-pickle',
        _isRetry: true
      });
    }

    return {
      success: false,
      error: error.message,
      script: null,
      metadata: {
        topic,
        contentType,
        generationTimeMs: Date.now() - startTime
      }
    };
  }
}

/**
 * Generate multiple script variations for A/B testing
 * @param {string} topic - The topic
 * @param {number} variations - Number of variations to generate
 * @returns {Promise<object[]>} Array of generated scripts
 */
async function generateVariations(topic, variations = 3) {
  const contentTypes = ['educational', 'story', 'tips'];
  const results = [];

  for (let i = 0; i < Math.min(variations, contentTypes.length); i++) {
    const result = await generateScript(topic, contentTypes[i]);
    results.push(result);
  }

  return results;
}

/**
 * Optimize script for specific platform
 * @param {string} script - The original script
 * @param {string} platform - Target platform (tiktok, youtube, instagram)
 * @returns {Promise<object>} Optimized script
 */
async function optimizeForPlatform(script, platform) {
  const platformSpecs = {
    tiktok: { maxDuration: 60, style: 'schnell und energetisch' },
    youtube: { maxDuration: 60, style: 'informativ und fesselnd' },
    instagram: { maxDuration: 90, style: 'visuell ansprechend und trendy' }
  };

  const spec = platformSpecs[platform] || platformSpecs.tiktok;

  const requestBody = {
    model: config.opencode.model,
    messages: [
      {
        role: 'system',
        content: `Optimiere das folgende Script für ${platform}. 
Maximal ${spec.maxDuration} Sekunden. 
Stil: ${spec.style}.
Behalte die Kernbotschaft, passe aber Länge und Ton an.`
      },
      {
        role: 'user',
        content: script
      }
    ],
    max_tokens: 1024,
    temperature: 0.7
  };

  try {
    const response = await axios.post(config.opencode.apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${config.opencode.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return {
      success: true,
      platform,
      originalScript: script,
      optimizedScript: response.data.choices[0]?.message?.content || script
    };
  } catch (error) {
    logger.error('Platform optimization failed', { platform, error: error.message });
    return {
      success: false,
      platform,
      originalScript: script,
      optimizedScript: script // Return original as fallback
    };
  }
}

module.exports = {
  generateScript,
  generateVariations,
  optimizeForPlatform,
  SCRIPT_TEMPLATES
};
