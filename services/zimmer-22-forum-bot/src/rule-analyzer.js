/**
 * Zimmer-22 Forum Bot - Rule Analyzer
 * AI-powered community guideline analysis
 */

const fetch = require('node-fetch');
const { Pool } = require('pg');
const logger = require('./logger');
const config = require('./config');

class RuleAnalyzer {
  constructor() {
    this.pool = new Pool({
      connectionString: config.database.connectionString
    });
    this.rulesCache = new Map();
  }

  async initialize() {
    // Create rules table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS forum_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        platform VARCHAR(50) NOT NULL,
        community VARCHAR(255) NOT NULL,
        rules_url TEXT,
        rules_text TEXT,
        parsed_rules JSONB,
        do_list TEXT[],
        dont_list TEXT[],
        keywords_allowed TEXT[],
        keywords_banned TEXT[],
        posting_frequency TEXT,
        self_promo_policy TEXT,
        link_policy TEXT,
        last_analyzed TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(platform, community)
      )
    `);

    // Load cached rules
    const result = await this.pool.query('SELECT * FROM forum_rules');
    for (const row of result.rows) {
      const key = `${row.platform}:${row.community}`;
      this.rulesCache.set(key, row);
    }

    logger.info({ count: this.rulesCache.size }, 'Rule analyzer initialized');
  }

  async analyzeRulesFromUrl(platform, community, rulesUrl) {
    try {
      // Fetch rules page content
      const response = await fetch(rulesUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch rules: ${response.status}`);
      }

      const html = await response.text();
      const rulesText = this.extractTextFromHtml(html);
      
      // Analyze with AI
      const parsedRules = await this.analyzeWithAI(rulesText, platform, community);
      
      // Save to database
      await this.saveRules(platform, community, rulesUrl, rulesText, parsedRules);
      
      return parsedRules;
    } catch (error) {
      logger.error({ error: error.message, platform, community }, 'Failed to analyze rules');
      throw error;
    }
  }

  extractTextFromHtml(html) {
    // Basic HTML to text conversion
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 15000); // Limit context
  }

  async analyzeWithAI(rulesText, platform, community) {
    const prompt = `Analyze these community rules for ${platform} community "${community}".

RULES TEXT:
${rulesText}

Extract and return a JSON object with:
{
  "summary": "Brief 2-3 sentence summary of the rules",
  "doList": ["List of things you SHOULD do"],
  "dontList": ["List of things you should NOT do"],
  "keywordsAllowed": ["Topics/keywords that are encouraged"],
  "keywordsBanned": ["Topics/keywords that are banned"],
  "postingFrequency": "How often can you post?",
  "selfPromoPolicy": "What's the self-promotion policy?",
  "linkPolicy": "Are external links allowed?",
  "accountAge": "Minimum account age requirement?",
  "karmaRequired": "Minimum karma/reputation needed?",
  "riskLevel": "low/medium/high - how strict is moderation?"
}

Return ONLY valid JSON.`;

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
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0].message.content;
        return this.parseJsonResponse(content);
      }
    } catch (error) {
      logger.warn({ error: error.message }, 'OpenCode failed, trying Gemini');
    }

    // Fallback to Gemini (FREE)
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
          const content = data.candidates[0].content.parts[0].text;
          return this.parseJsonResponse(content);
        }
      } catch (error) {
        logger.warn({ error: error.message }, 'Gemini failed, using defaults');
      }
    }

    // Return default rules if all AI fails
    return this.getDefaultRules(platform);
  }

  parseJsonResponse(content) {
    try {
      // Extract JSON from markdown code block if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to parse AI response');
      return null;
    }
  }

  getDefaultRules(platform) {
    const defaults = {
      reddit: {
        summary: 'Standard Reddit rules apply',
        doList: ['Be respectful', 'Stay on topic', 'Use proper flair'],
        dontList: ['No spam', 'No self-promotion', 'No personal attacks'],
        postingFrequency: '1-2 posts per day maximum',
        selfPromoPolicy: '10% rule - only 10% of content can be self-promotional',
        linkPolicy: 'External links allowed with context',
        riskLevel: 'medium'
      },
      quora: {
        summary: 'Standard Quora guidelines',
        doList: ['Answer questions helpfully', 'Cite sources', 'Be respectful'],
        dontList: ['No promotional answers', 'No spam', 'No plagiarism'],
        postingFrequency: 'No strict limit',
        selfPromoPolicy: 'Minimal self-promotion in context',
        linkPolicy: 'Allowed if relevant',
        riskLevel: 'low'
      },
      discord: {
        summary: 'Server-specific rules apply',
        doList: ['Follow server rules', 'Be respectful', 'Stay in proper channels'],
        dontList: ['No spam', 'No NSFW without permission', 'No harassment'],
        postingFrequency: 'Varies by server',
        selfPromoPolicy: 'Usually in designated channels only',
        linkPolicy: 'Usually allowed',
        riskLevel: 'medium'
      },
      facebook: {
        summary: 'Facebook group rules apply',
        doList: ['Follow group rules', 'Contribute value', 'Engage genuinely'],
        dontList: ['No spam', 'No off-topic posts', 'No MLM promotion'],
        postingFrequency: '1-2 posts per day',
        selfPromoPolicy: 'Usually on designated days only',
        linkPolicy: 'Often restricted',
        riskLevel: 'high'
      }
    };

    return defaults[platform] || defaults.reddit;
  }

  async saveRules(platform, community, rulesUrl, rulesText, parsedRules) {
    const result = await this.pool.query(`
      INSERT INTO forum_rules (platform, community, rules_url, rules_text, parsed_rules,
        do_list, dont_list, keywords_allowed, keywords_banned, 
        posting_frequency, self_promo_policy, link_policy)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (platform, community) 
      DO UPDATE SET 
        rules_url = $3,
        rules_text = $4,
        parsed_rules = $5,
        do_list = $6,
        dont_list = $7,
        keywords_allowed = $8,
        keywords_banned = $9,
        posting_frequency = $10,
        self_promo_policy = $11,
        link_policy = $12,
        last_analyzed = NOW()
      RETURNING *
    `, [
      platform,
      community,
      rulesUrl,
      rulesText,
      JSON.stringify(parsedRules),
      parsedRules?.doList || [],
      parsedRules?.dontList || [],
      parsedRules?.keywordsAllowed || [],
      parsedRules?.keywordsBanned || [],
      parsedRules?.postingFrequency,
      parsedRules?.selfPromoPolicy,
      parsedRules?.linkPolicy
    ]);

    const key = `${platform}:${community}`;
    this.rulesCache.set(key, result.rows[0]);
    
    logger.info({ platform, community }, 'Rules saved');
    return result.rows[0];
  }

  async getRules(platform, community) {
    const key = `${platform}:${community}`;
    
    if (this.rulesCache.has(key)) {
      return this.rulesCache.get(key);
    }

    const result = await this.pool.query(
      'SELECT * FROM forum_rules WHERE platform = $1 AND community = $2',
      [platform, community]
    );

    if (result.rows.length > 0) {
      this.rulesCache.set(key, result.rows[0]);
      return result.rows[0];
    }

    return null;
  }

  async checkCompliance(platform, community, content) {
    const rules = await this.getRules(platform, community);
    
    if (!rules || !rules.parsed_rules) {
      return { compliant: true, warnings: [], suggestions: [] };
    }

    const warnings = [];
    const suggestions = [];
    const parsed = rules.parsed_rules;
    const contentLower = content.toLowerCase();

    // Check banned keywords
    if (parsed.keywordsBanned) {
      for (const keyword of parsed.keywordsBanned) {
        if (contentLower.includes(keyword.toLowerCase())) {
          warnings.push(`Contains banned keyword: "${keyword}"`);
        }
      }
    }

    // Check for excessive self-promotion
    const linkCount = (content.match(/https?:\/\//g) || []).length;
    if (linkCount > 2) {
      warnings.push('Too many links - may be flagged as spam');
    }

    // Content length check
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 20) {
      suggestions.push('Consider adding more context for better engagement');
    }

    // Self-promo check
    if (parsed.selfPromoPolicy?.includes('10%')) {
      suggestions.push('Remember the 10% rule for self-promotion');
    }

    return {
      compliant: warnings.length === 0,
      warnings,
      suggestions,
      riskLevel: parsed.riskLevel || 'medium'
    };
  }

  async shutdown() {
    await this.pool.end();
  }
}

module.exports = RuleAnalyzer;
