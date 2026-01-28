/**
 * Zimmer-22 Forum Bot - Forum Poster
 * Playwright-based forum automation
 */

const { chromium } = require('playwright');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const config = require('./config');

class ForumPoster {
  constructor(accountManager, ruleAnalyzer, contentGenerator) {
    this.accountManager = accountManager;
    this.ruleAnalyzer = ruleAnalyzer;
    this.contentGenerator = contentGenerator;
    this.browser = null;
    this.postHistory = [];
  }

  async initialize() {
    // Launch browser with stealth settings
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    logger.info('Forum poster initialized');
  }

  async createContext(account) {
    const contextOptions = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York'
    };

    // Add proxy if configured
    if (config.proxy.enabled && account.proxy_config?.url) {
      contextOptions.proxy = {
        server: account.proxy_config.url
      };
    }

    const context = await this.browser.newContext(contextOptions);
    
    // Restore cookies if available
    if (account.cookies) {
      await context.addCookies(account.cookies);
    }

    return context;
  }

  async post(options) {
    const { platform, community, content, url, accountId } = options;

    // Get available account
    const account = await this.accountManager.getAccount(platform, accountId);
    if (!account) {
      throw new Error(`No available account for ${platform}`);
    }

    // Check compliance
    const compliance = await this.ruleAnalyzer.checkCompliance(platform, community, content);
    if (!compliance.compliant) {
      logger.warn({ warnings: compliance.warnings }, 'Content not compliant');
      if (compliance.riskLevel === 'high') {
        throw new Error(`Content not compliant: ${compliance.warnings.join(', ')}`);
      }
    }

    // Create browser context
    const context = await this.createContext(account);
    const page = await context.newPage();

    try {
      // Route based on platform
      let result;
      switch (platform) {
        case 'reddit':
          result = await this.postToReddit(page, { community, content, url });
          break;
        case 'quora':
          result = await this.postToQuora(page, { community, content });
          break;
        case 'discord':
          result = await this.postToDiscord(page, { community, content, url });
          break;
        case 'facebook':
          result = await this.postToFacebook(page, { community, content });
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Save cookies after successful post
      const cookies = await context.cookies();
      await this.accountManager.saveCookies(account.id, cookies);
      
      // Record activity
      await this.accountManager.recordActivity(account.id, 'post');
      
      // Add to history
      this.addToHistory({
        platform,
        community,
        content: content.substring(0, 200),
        accountId: account.id,
        result,
        timestamp: new Date().toISOString()
      });

      // Notify ClawdBot
      await this.notifyClawdBot('post_success', {
        platform,
        community,
        preview: content.substring(0, 100)
      });

      return result;
    } catch (error) {
      logger.error({ error: error.message, platform, community }, 'Post failed');
      
      // Check if banned
      if (error.message.includes('banned') || error.message.includes('suspended')) {
        await this.accountManager.markAccountBanned(account.id, error.message);
      }

      await this.notifyClawdBot('post_failed', {
        platform,
        community,
        error: error.message
      });

      throw error;
    } finally {
      await context.close();
    }
  }

  async reply(options) {
    const { platform, community, threadUrl, content, accountId } = options;

    const account = await this.accountManager.getAccount(platform, accountId);
    if (!account) {
      throw new Error(`No available account for ${platform}`);
    }

    const context = await this.createContext(account);
    const page = await context.newPage();

    try {
      let result;
      switch (platform) {
        case 'reddit':
          result = await this.replyOnReddit(page, { threadUrl, content });
          break;
        case 'quora':
          result = await this.replyOnQuora(page, { threadUrl, content });
          break;
        default:
          throw new Error(`Reply not supported for: ${platform}`);
      }

      const cookies = await context.cookies();
      await this.accountManager.saveCookies(account.id, cookies);
      await this.accountManager.recordActivity(account.id, 'reply');
      
      this.addToHistory({
        platform,
        community,
        type: 'reply',
        threadUrl,
        content: content.substring(0, 200),
        accountId: account.id,
        result,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      logger.error({ error: error.message, platform, threadUrl }, 'Reply failed');
      throw error;
    } finally {
      await context.close();
    }
  }

  // Platform-specific implementations

  async postToReddit(page, { community, content, url }) {
    await page.goto(`https://www.reddit.com/r/${community}/submit`);
    await page.waitForLoadState('networkidle');

    // Check if logged in
    const loginButton = await page.$('a[href*="login"]');
    if (loginButton) {
      throw new Error('Not logged in to Reddit');
    }

    // Wait for submit form
    await page.waitForSelector('[data-test-id="post-title-input"]', { timeout: 10000 });
    
    // Fill title
    const title = content.split('\n')[0].substring(0, 300);
    await page.fill('[data-test-id="post-title-input"]', title);
    
    // Fill body
    const body = content.split('\n').slice(1).join('\n');
    const textArea = await page.$('[data-test-id="post-body-input"]');
    if (textArea) {
      await textArea.fill(body);
    }

    // Submit
    await page.click('[data-test-id="post-submit-button"]');
    await page.waitForURL(/\/comments\//, { timeout: 30000 });
    
    return {
      success: true,
      url: page.url(),
      platform: 'reddit',
      community
    };
  }

  async replyOnReddit(page, { threadUrl, content }) {
    await page.goto(threadUrl);
    await page.waitForLoadState('networkidle');

    // Find comment box
    const commentBox = await page.$('[data-test-id="comment-text-area"]');
    if (!commentBox) {
      throw new Error('Comment box not found');
    }

    await commentBox.fill(content);
    await page.click('[data-test-id="comment-submit-button"]');
    await page.waitForTimeout(3000);

    return {
      success: true,
      threadUrl,
      platform: 'reddit'
    };
  }

  async postToQuora(page, { community, content }) {
    await page.goto('https://www.quora.com/');
    await page.waitForLoadState('networkidle');

    // Click "Add Question" or find relevant question
    const addQuestion = await page.$('[data-test-id="add-question-button"]');
    if (addQuestion) {
      await addQuestion.click();
      await page.waitForSelector('[data-test-id="question-input"]');
      await page.fill('[data-test-id="question-input"]', content);
      await page.click('[data-test-id="submit-question-button"]');
    }

    await page.waitForTimeout(3000);
    
    return {
      success: true,
      url: page.url(),
      platform: 'quora'
    };
  }

  async replyOnQuora(page, { threadUrl, content }) {
    await page.goto(threadUrl);
    await page.waitForLoadState('networkidle');

    const answerButton = await page.$('[data-test-id="answer-button"]');
    if (answerButton) {
      await answerButton.click();
      await page.waitForSelector('[data-test-id="answer-editor"]');
      await page.fill('[data-test-id="answer-editor"]', content);
      await page.click('[data-test-id="submit-answer-button"]');
    }

    await page.waitForTimeout(3000);
    
    return {
      success: true,
      threadUrl,
      platform: 'quora'
    };
  }

  async postToDiscord(page, { community, content, url }) {
    // Discord posting via webhook is more reliable
    if (url && url.includes('discord.com/api/webhooks')) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error(`Discord webhook failed: ${response.status}`);
      }

      return {
        success: true,
        platform: 'discord',
        community
      };
    }

    // Browser-based Discord posting
    await page.goto(`https://discord.com/channels/${community}`);
    await page.waitForLoadState('networkidle');

    const messageInput = await page.$('[class*="slateTextArea"]');
    if (messageInput) {
      await messageInput.fill(content);
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(2000);
    
    return {
      success: true,
      platform: 'discord',
      community
    };
  }

  async postToFacebook(page, { community, content }) {
    await page.goto(`https://www.facebook.com/groups/${community}`);
    await page.waitForLoadState('networkidle');

    // Find "Write something" box
    const writeBox = await page.$('[data-testid="group-composer-box"]');
    if (writeBox) {
      await writeBox.click();
      await page.waitForSelector('[data-testid="post-input"]');
      await page.fill('[data-testid="post-input"]', content);
      await page.click('[data-testid="post-submit-button"]');
    }

    await page.waitForTimeout(5000);
    
    return {
      success: true,
      platform: 'facebook',
      community
    };
  }

  addToHistory(entry) {
    this.postHistory.unshift(entry);
    if (this.postHistory.length > 100) {
      this.postHistory.pop();
    }
  }

  getHistory(limit = 50) {
    return this.postHistory.slice(0, limit);
  }

  async notifyClawdBot(event, data) {
    try {
      await fetch(`${config.services.clawdbot}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `📢 Forum Bot: ${event}\n${JSON.stringify(data, null, 2)}`,
          type: event.includes('success') ? 'info' : 'warning'
        })
      });
    } catch (error) {
      logger.warn({ error: error.message }, 'Failed to notify ClawdBot');
    }
  }

  async shutdown() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = ForumPoster;
