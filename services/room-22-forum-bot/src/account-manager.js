/**
 * Zimmer-22 Forum Bot - Account Manager
 * Multi-account management with session persistence
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const config = require('./config');

class AccountManager {
  constructor() {
    this.pool = new Pool({
      connectionString: config.database.connectionString
    });
    this.accounts = new Map();
    this.rateLimiters = new Map();
  }

  async initialize() {
    try {
      // Create accounts table if not exists
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS forum_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          platform VARCHAR(50) NOT NULL,
          username VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          password_encrypted TEXT,
          cookies JSONB,
          session_data JSONB,
          proxy_config JSONB,
          status VARCHAR(50) DEFAULT 'active',
          last_used TIMESTAMPTZ,
          posts_today INTEGER DEFAULT 0,
          replies_today INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(platform, username)
        )
      `);

      // Load accounts into memory
      await this.loadAccounts();
      logger.info({ count: this.accounts.size }, 'Account manager initialized');
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to initialize account manager');
      throw error;
    }
  }

  async loadAccounts() {
    const result = await this.pool.query(
      'SELECT * FROM forum_accounts WHERE status = $1',
      ['active']
    );
    
    for (const row of result.rows) {
      this.accounts.set(row.id, {
        ...row,
        rateLimiter: this.createRateLimiter(row.platform)
      });
    }
  }

  createRateLimiter(platform) {
    const limits = config.rateLimits[platform] || {
      postsPerHour: 2,
      repliesPerHour: 10,
      minDelayMs: 60000
    };

    return {
      limits,
      postCount: 0,
      replyCount: 0,
      lastPost: null,
      lastReply: null,
      resetHour: new Date().getHours()
    };
  }

  async addAccount(accountData) {
    const { platform, username, email, password, proxyConfig } = accountData;
    
    try {
      const result = await this.pool.query(`
        INSERT INTO forum_accounts (platform, username, email, password_encrypted, proxy_config)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [platform, username, email, password, JSON.stringify(proxyConfig || {})]);
      
      const account = result.rows[0];
      this.accounts.set(account.id, {
        ...account,
        rateLimiter: this.createRateLimiter(platform)
      });
      
      logger.info({ platform, username }, 'Account added');
      return account;
    } catch (error) {
      if (error.code === '23505') {
        throw new Error(`Account ${username} already exists for ${platform}`);
      }
      throw error;
    }
  }

  async removeAccount(accountId) {
    await this.pool.query(
      'UPDATE forum_accounts SET status = $1 WHERE id = $2',
      ['removed', accountId]
    );
    this.accounts.delete(accountId);
    logger.info({ accountId }, 'Account removed');
  }

  async getAccount(platform, preferredId = null) {
    // If specific account requested
    if (preferredId && this.accounts.has(preferredId)) {
      const account = this.accounts.get(preferredId);
      if (account.platform === platform && this.canUseAccount(account)) {
        return account;
      }
    }

    // Find available account for platform
    for (const [id, account] of this.accounts) {
      if (account.platform === platform && this.canUseAccount(account)) {
        return account;
      }
    }

    return null;
  }

  canUseAccount(account) {
    const limiter = account.rateLimiter;
    const currentHour = new Date().getHours();
    
    // Reset counters if hour changed
    if (currentHour !== limiter.resetHour) {
      limiter.postCount = 0;
      limiter.replyCount = 0;
      limiter.resetHour = currentHour;
    }

    // Check rate limits
    if (limiter.postCount >= limiter.limits.postsPerHour) {
      return false;
    }

    // Check minimum delay
    if (limiter.lastPost) {
      const elapsed = Date.now() - limiter.lastPost;
      if (elapsed < limiter.limits.minDelayMs) {
        return false;
      }
    }

    return account.status === 'active';
  }

  async recordActivity(accountId, type) {
    const account = this.accounts.get(accountId);
    if (!account) return;

    const now = Date.now();
    if (type === 'post') {
      account.rateLimiter.postCount++;
      account.rateLimiter.lastPost = now;
    } else if (type === 'reply') {
      account.rateLimiter.replyCount++;
      account.rateLimiter.lastReply = now;
    }

    // Update database
    await this.pool.query(`
      UPDATE forum_accounts 
      SET last_used = NOW(),
          posts_today = posts_today + $1,
          replies_today = replies_today + $2,
          updated_at = NOW()
      WHERE id = $3
    `, [
      type === 'post' ? 1 : 0,
      type === 'reply' ? 1 : 0,
      accountId
    ]);
  }

  async saveCookies(accountId, cookies) {
    await this.pool.query(
      'UPDATE forum_accounts SET cookies = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(cookies), accountId]
    );
    
    const account = this.accounts.get(accountId);
    if (account) {
      account.cookies = cookies;
    }
  }

  async saveSession(accountId, sessionData) {
    await this.pool.query(
      'UPDATE forum_accounts SET session_data = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(sessionData), accountId]
    );
    
    const account = this.accounts.get(accountId);
    if (account) {
      account.session_data = sessionData;
    }
  }

  getAccountsList() {
    return Array.from(this.accounts.values()).map(acc => ({
      id: acc.id,
      platform: acc.platform,
      username: acc.username,
      status: acc.status,
      lastUsed: acc.last_used,
      postsToday: acc.posts_today,
      repliesToday: acc.replies_today,
      canPost: this.canUseAccount(acc)
    }));
  }

  async markAccountBanned(accountId, reason) {
    await this.pool.query(
      'UPDATE forum_accounts SET status = $1, updated_at = NOW() WHERE id = $2',
      ['banned', accountId]
    );
    
    const account = this.accounts.get(accountId);
    if (account) {
      account.status = 'banned';
    }
    
    logger.warn({ accountId, reason }, 'Account marked as banned');
  }

  async shutdown() {
    await this.pool.end();
  }
}

module.exports = AccountManager;
