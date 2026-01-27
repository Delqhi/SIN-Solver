/**
 * Zimmer-22 Forum Bot - Content Generator
 * AI-powered content generation using FREE APIs
 */

const fetch = require('node-fetch');
const logger = require('./logger');
const config = require('./config');

class ContentGenerator {
  constructor(ruleAnalyzer) {
    this.ruleAnalyzer = ruleAnalyzer;
  }

  async generatePost(options) {
    const { platform, community, topic, style, includeLinks, targetLength } = options;

    // Get community rules for compliance
    const rules = await this.ruleAnalyzer.getRules(platform, community);
    
    const prompt = this.buildPostPrompt({
      platform,
      community,
      topic,
      style: style || 'helpful',
      includeLinks: includeLinks || false,
      targetLength: targetLength || 'medium',
      rules
    });

    const content = await this.callAI(prompt);
    
    // Check compliance before returning
    const compliance = await this.ruleAnalyzer.checkCompliance(platform, community, content);
    
    return {
      content,
      compliance,
      metadata: {
        platform,
        community,
        topic,
        generatedAt: new Date().toISOString()
      }
    };
  }

  async generateReply(options) {
    const { platform, community, originalPost, style, tone } = options;

    const rules = await this.ruleAnalyzer.getRules(platform, community);
    
    const prompt = this.buildReplyPrompt({
      platform,
      community,
      originalPost,
      style: style || 'helpful',
      tone: tone || 'friendly',
      rules
    });

    const content = await this.callAI(prompt);
    const compliance = await this.ruleAnalyzer.checkCompliance(platform, community, content);
    
    return {
      content,
      compliance,
      metadata: {
        platform,
        community,
        inReplyTo: originalPost?.substring(0, 100),
        generatedAt: new Date().toISOString()
      }
    };
  }

  async generateVariations(content, count = 3) {
    const prompt = `Create ${count} unique variations of this content. Each should convey the same message but with different wording and structure.

ORIGINAL:
${content}

Return as JSON array: ["variation1", "variation2", ...]`;

    const result = await this.callAI(prompt);
    
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.warn({ error: error.message }, 'Failed to parse variations');
    }
    
    return [content]; // Return original if parsing fails
  }

  buildPostPrompt(options) {
    const { platform, community, topic, style, includeLinks, targetLength, rules } = options;
    
    let lengthGuide = '';
    switch (targetLength) {
      case 'short': lengthGuide = '50-100 words'; break;
      case 'medium': lengthGuide = '100-200 words'; break;
      case 'long': lengthGuide = '200-400 words'; break;
      default: lengthGuide = '100-200 words';
    }

    let rulesContext = '';
    if (rules?.parsed_rules) {
      const parsed = rules.parsed_rules;
      rulesContext = `
COMMUNITY RULES TO FOLLOW:
- DO: ${(parsed.doList || []).slice(0, 3).join(', ')}
- DON'T: ${(parsed.dontList || []).slice(0, 3).join(', ')}
- Self-promo policy: ${parsed.selfPromoPolicy || 'Standard'}
- Link policy: ${parsed.linkPolicy || 'Allowed with context'}`;
    }

    return `Write a ${style} ${platform} post for the "${community}" community about: ${topic}

TARGET LENGTH: ${lengthGuide}
INCLUDE LINKS: ${includeLinks ? 'Yes, include relevant links' : 'No external links'}
${rulesContext}

REQUIREMENTS:
- Sound natural and human
- Match ${platform} writing style
- Add value to the community
- No obvious self-promotion
- No salesy language
- No hashtags unless appropriate for ${platform}

Write ONLY the post content, nothing else.`;
  }

  buildReplyPrompt(options) {
    const { platform, community, originalPost, style, tone, rules } = options;

    let rulesContext = '';
    if (rules?.parsed_rules) {
      const parsed = rules.parsed_rules;
      rulesContext = `
COMMUNITY RULES:
- Be respectful
- ${(parsed.doList || []).slice(0, 2).join(', ')}`;
    }

    return `Write a ${tone} ${style} reply to this ${platform} post in "${community}":

ORIGINAL POST:
${originalPost}
${rulesContext}

REQUIREMENTS:
- Be genuinely helpful
- Sound natural and human
- 50-150 words
- No links unless asked
- Add value to the conversation
- Match the tone of the community

Write ONLY the reply content, nothing else.`;
  }

  async callAI(prompt) {
    // Try OpenCode first (FREE)
    try {
      const response = await fetch(`${config.ai.opencode.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.opencode.apiKey}`
        },
        body: JSON.stringify({
          model: config.ai.opencode.model,
          messages: [
            { role: 'system', content: 'You are a helpful content writer who creates natural, engaging social media posts and replies.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content.trim();
      }
    } catch (error) {
      logger.warn({ error: error.message }, 'OpenCode failed, trying Groq');
    }

    // Fallback to Groq (FREE)
    if (config.ai.groq.apiKey) {
      try {
        const response = await fetch(`${config.ai.groq.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.ai.groq.apiKey}`
          },
          body: JSON.stringify({
            model: config.ai.groq.model,
            messages: [
              { role: 'system', content: 'You are a helpful content writer.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        if (response.ok) {
          const data = await response.json();
          return data.choices[0].message.content.trim();
        }
      } catch (error) {
        logger.warn({ error: error.message }, 'Groq failed, trying Gemini');
      }
    }

    // Final fallback to Gemini (FREE)
    if (config.ai.gemini.apiKey) {
      try {
        const response = await fetch(
          `${config.ai.gemini.baseUrl}/models/${config.ai.gemini.model}:generateContent?key=${config.ai.gemini.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          return data.candidates[0].content.parts[0].text.trim();
        }
      } catch (error) {
        logger.error({ error: error.message }, 'All AI providers failed');
      }
    }

    throw new Error('All AI providers failed');
  }
}

module.exports = ContentGenerator;
