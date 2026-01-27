/**
 * Zimmer-22 Forum Bot Configuration
 * 100% FREE - No paid services
 */

module.exports = {
  // Server
  port: parseInt(process.env.PORT || '8022'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    connectionString: process.env.DATABASE_URL || 
      'postgresql://ceo_admin:secure_ceo_password_2026@zimmer-archiv-postgres:5432/sin_solver_production'
  },
  
  // AI Providers (ALL FREE)
  ai: {
    opencode: {
      apiKey: process.env.OPENCODE_API_KEY || 'sk-opencode-free',
      baseUrl: 'https://api.opencode.ai/v1',
      model: 'zen/kaitchup-qwen-coder'
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.0-flash-exp'
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile'
    }
  },
  
  // Internal Services
  services: {
    clawdbot: process.env.CLAWDBOT_URL || 'http://zimmer-09-clawdbot:8080',
    steel: process.env.STEEL_URL || 'http://zimmer-05-steel:3000'
  },
  
  // Proxy settings
  proxy: {
    enabled: process.env.PROXY_ENABLED === 'true',
    url: process.env.PROXY_URL,
    rotationInterval: parseInt(process.env.PROXY_ROTATION_INTERVAL || '300000') // 5 minutes
  },
  
  // Rate limits (per account, per platform)
  rateLimits: {
    reddit: {
      postsPerHour: 2,
      repliesPerHour: 10,
      minDelayMs: 60000
    },
    quora: {
      postsPerHour: 3,
      repliesPerHour: 15,
      minDelayMs: 45000
    },
    discord: {
      messagesPerMinute: 5,
      minDelayMs: 12000
    },
    facebook: {
      postsPerHour: 1,
      commentsPerHour: 10,
      minDelayMs: 120000
    }
  },
  
  // Content settings
  content: {
    maxVariations: 5,
    minWordCount: 50,
    maxWordCount: 500
  },
  
  // Session persistence
  session: {
    cookieDir: process.env.COOKIE_DIR || '/app/data/cookies',
    sessionDir: process.env.SESSION_DIR || '/app/data/sessions'
  }
};
