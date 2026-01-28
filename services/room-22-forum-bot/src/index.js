/**
 * Zimmer-22 Forum Bot - Main Server
 * AI-powered forum and community automation
 * 
 * Port: 8022 | IP: 172.20.0.83
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const config = require('./config');
const logger = require('./logger');
const AccountManager = require('./account-manager');
const RuleAnalyzer = require('./rule-analyzer');
const ContentGenerator = require('./content-generator');
const ForumPoster = require('./forum-poster');

// Initialize services
const accountManager = new AccountManager();
const ruleAnalyzer = new RuleAnalyzer();
const contentGenerator = new ContentGenerator(ruleAnalyzer);
const forumPoster = new ForumPoster(accountManager, ruleAnalyzer, contentGenerator);

// Express app
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Request');
  next();
});

// ==================== HEALTH ====================

app.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    service: 'zimmer-22-forum-bot',
    version: '1.0.0',
    accounts: accountManager.getAccountsList().length,
    rulesCache: ruleAnalyzer.rulesCache?.size || 0,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ==================== ACCOUNTS ====================

app.get('/api/accounts', (req, res) => {
  try {
    const accounts = accountManager.getAccountsList();
    res.json({ accounts });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get accounts');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/accounts', async (req, res) => {
  try {
    const { platform, username, email, password, proxyConfig } = req.body;
    
    if (!platform || !username) {
      return res.status(400).json({ error: 'platform and username required' });
    }

    const account = await accountManager.addAccount({
      platform,
      username,
      email,
      password,
      proxyConfig
    });

    res.json({ 
      success: true, 
      account: {
        id: account.id,
        platform: account.platform,
        username: account.username
      }
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to add account');
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    await accountManager.removeAccount(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to remove account');
    res.status(500).json({ error: error.message });
  }
});

// ==================== RULES ====================

app.get('/api/rules/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { community } = req.query;
    
    if (!community) {
      return res.status(400).json({ error: 'community query param required' });
    }

    const rules = await ruleAnalyzer.getRules(platform, community);
    
    if (!rules) {
      return res.status(404).json({ error: 'Rules not found' });
    }

    res.json({ rules });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get rules');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rules/analyze', async (req, res) => {
  try {
    const { platform, community, rulesUrl } = req.body;
    
    if (!platform || !community || !rulesUrl) {
      return res.status(400).json({ error: 'platform, community, and rulesUrl required' });
    }

    const parsedRules = await ruleAnalyzer.analyzeRulesFromUrl(platform, community, rulesUrl);
    res.json({ success: true, rules: parsedRules });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to analyze rules');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rules/check', async (req, res) => {
  try {
    const { platform, community, content } = req.body;
    
    if (!platform || !community || !content) {
      return res.status(400).json({ error: 'platform, community, and content required' });
    }

    const compliance = await ruleAnalyzer.checkCompliance(platform, community, content);
    res.json({ compliance });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to check compliance');
    res.status(500).json({ error: error.message });
  }
});

// ==================== CONTENT GENERATION ====================

app.post('/api/generate/post', async (req, res) => {
  try {
    const { platform, community, topic, style, includeLinks, targetLength } = req.body;
    
    if (!platform || !community || !topic) {
      return res.status(400).json({ error: 'platform, community, and topic required' });
    }

    const result = await contentGenerator.generatePost({
      platform,
      community,
      topic,
      style,
      includeLinks,
      targetLength
    });

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to generate post');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate/reply', async (req, res) => {
  try {
    const { platform, community, originalPost, style, tone } = req.body;
    
    if (!platform || !community || !originalPost) {
      return res.status(400).json({ error: 'platform, community, and originalPost required' });
    }

    const result = await contentGenerator.generateReply({
      platform,
      community,
      originalPost,
      style,
      tone
    });

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to generate reply');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate/variations', async (req, res) => {
  try {
    const { content, count } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'content required' });
    }

    const variations = await contentGenerator.generateVariations(content, count || 3);
    res.json({ success: true, variations });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to generate variations');
    res.status(500).json({ error: error.message });
  }
});

// ==================== POSTING ====================

app.post('/api/post', async (req, res) => {
  try {
    const { platform, community, content, url, accountId, generateContent, topic } = req.body;
    
    if (!platform || !community) {
      return res.status(400).json({ error: 'platform and community required' });
    }

    let postContent = content;
    
    // Optionally generate content
    if (generateContent && topic) {
      const generated = await contentGenerator.generatePost({
        platform,
        community,
        topic,
        style: req.body.style,
        targetLength: req.body.targetLength
      });
      postContent = generated.content;
    }

    if (!postContent) {
      return res.status(400).json({ error: 'content or (generateContent + topic) required' });
    }

    const result = await forumPoster.post({
      platform,
      community,
      content: postContent,
      url,
      accountId
    });

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to post');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reply', async (req, res) => {
  try {
    const { platform, community, threadUrl, content, accountId, generateContent, originalPost } = req.body;
    
    if (!platform || !threadUrl) {
      return res.status(400).json({ error: 'platform and threadUrl required' });
    }

    let replyContent = content;
    
    // Optionally generate content
    if (generateContent && originalPost) {
      const generated = await contentGenerator.generateReply({
        platform,
        community,
        originalPost,
        style: req.body.style,
        tone: req.body.tone
      });
      replyContent = generated.content;
    }

    if (!replyContent) {
      return res.status(400).json({ error: 'content or (generateContent + originalPost) required' });
    }

    const result = await forumPoster.reply({
      platform,
      community,
      threadUrl,
      content: replyContent,
      accountId
    });

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to reply');
    res.status(500).json({ error: error.message });
  }
});

// ==================== HISTORY ====================

app.get('/api/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const platform = req.query.platform;
    
    let history = forumPoster.getHistory(limit);
    
    if (platform) {
      history = history.filter(h => h.platform === platform);
    }

    res.json({ history });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get history');
    res.status(500).json({ error: error.message });
  }
});

// ==================== SCHEDULED POSTS ====================

const scheduledPosts = [];

app.get('/api/scheduled', (req, res) => {
  res.json({ 
    scheduled: scheduledPosts.filter(p => new Date(p.scheduledAt) > new Date())
  });
});

app.post('/api/schedule', async (req, res) => {
  try {
    const { platform, community, content, scheduledAt, topic, generateContent } = req.body;
    
    if (!platform || !community || !scheduledAt) {
      return res.status(400).json({ error: 'platform, community, and scheduledAt required' });
    }

    const scheduleTime = new Date(scheduledAt);
    if (scheduleTime <= new Date()) {
      return res.status(400).json({ error: 'scheduledAt must be in the future' });
    }

    const job = {
      id: uuidv4(),
      platform,
      community,
      content: content || null,
      topic: topic || null,
      generateContent: generateContent || false,
      scheduledAt,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    scheduledPosts.push(job);
    
    // Schedule the job
    const delay = scheduleTime.getTime() - Date.now();
    setTimeout(async () => {
      try {
        let postContent = job.content;
        
        if (job.generateContent && job.topic) {
          const generated = await contentGenerator.generatePost({
            platform: job.platform,
            community: job.community,
            topic: job.topic
          });
          postContent = generated.content;
        }

        await forumPoster.post({
          platform: job.platform,
          community: job.community,
          content: postContent
        });

        job.status = 'completed';
        job.completedAt = new Date().toISOString();
      } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        logger.error({ error: error.message, jobId: job.id }, 'Scheduled post failed');
      }
    }, delay);

    res.json({ success: true, job });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to schedule post');
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/schedule/:id', (req, res) => {
  const index = scheduledPosts.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Scheduled post not found' });
  }
  
  scheduledPosts[index].status = 'cancelled';
  res.json({ success: true });
});

// ==================== STARTUP ====================

async function start() {
  try {
    // Initialize all services
    await accountManager.initialize();
    await ruleAnalyzer.initialize();
    await forumPoster.initialize();
    
    app.listen(config.port, '0.0.0.0', () => {
      logger.info({ port: config.port }, 'Zimmer-22 Forum Bot started');
      logger.info('Platforms: Reddit, Quora, Discord, Facebook');
      logger.info('AI: OpenCode Zen + Gemini + Groq (ALL FREE)');
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Startup failed');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await forumPoster.shutdown();
  await accountManager.shutdown();
  await ruleAnalyzer.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await forumPoster.shutdown();
  await accountManager.shutdown();
  await ruleAnalyzer.shutdown();
  process.exit(0);
});

start();
