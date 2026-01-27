const express = require('express');
const crypto = require('crypto');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
});

const OAUTH_CONFIGS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    apiKeyUrl: 'https://generativelanguage.googleapis.com/v1/apiKeys',
    scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/generative-language'],
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },
  mistral: {
    authUrl: 'https://console.mistral.ai/oauth/authorize',
    tokenUrl: 'https://console.mistral.ai/oauth/token',
    userInfoUrl: 'https://api.mistral.ai/v1/user',
    apiKeyUrl: 'https://api.mistral.ai/v1/api-keys',
    scopes: ['read', 'write', 'api-keys:create'],
    clientId: process.env.MISTRAL_CLIENT_ID,
    clientSecret: process.env.MISTRAL_CLIENT_SECRET
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET
  },
  discord: {
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
    scopes: ['identify', 'email', 'guilds'],
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET
  },
  huggingface: {
    authUrl: 'https://huggingface.co/oauth/authorize',
    tokenUrl: 'https://huggingface.co/oauth/token',
    userInfoUrl: 'https://huggingface.co/api/whoami-v2',
    apiKeyUrl: 'https://huggingface.co/api/tokens',
    scopes: ['read-repos', 'inference-api', 'manage-tokens'],
    clientId: process.env.HUGGINGFACE_CLIENT_ID,
    clientSecret: process.env.HUGGINGFACE_CLIENT_SECRET
  }
};

class OAuthHandler {
  constructor(config = {}) {
    this.pool = config.pool || null;
    this.router = express.Router();
    this.pendingAuth = new Map();
    this.connectedAccounts = new Map();
    this.apiKeys = new Map();
    
    this.setupRoutes();
  }
  
  setPool(pool) {
    this.pool = pool;
  }
  
  setupRoutes() {
    this.router.get('/api/oauth/accounts', this.getAccounts.bind(this));
    this.router.post('/api/oauth/init/:provider', this.initiateOAuth.bind(this));
    this.router.get('/api/oauth/callback/:provider', this.handleCallback.bind(this));
    this.router.post('/api/oauth/disconnect/:provider', this.disconnectAccount.bind(this));
    this.router.post('/api/oauth/switch/:provider', this.switchAccount.bind(this));
    this.router.get('/api/oauth/api-keys', this.getApiKeys.bind(this));
    this.router.post('/api/oauth/refresh/:provider', this.refreshToken.bind(this));
  }
  
  getAccounts(req, res) {
    const accounts = {};
    const multiAccounts = {};
    
    for (const [provider, accountList] of this.connectedAccounts) {
      if (accountList.length > 0) {
        accounts[provider] = accountList.find(a => a.active) || accountList[0];
        accounts[provider].apiKeyActive = this.apiKeys.has(`${provider}:${accounts[provider].id}`);
        multiAccounts[provider] = accountList;
      }
    }
    
    res.json({ accounts, multiAccounts });
  }
  
  async initiateOAuth(req, res) {
    const { provider } = req.params;
    const { redirectUri, addAccount } = req.body;
    
    const config = OAUTH_CONFIGS[provider];
    if (!config) {
      return res.status(400).json({ error: 'Unknown provider' });
    }
    
    if (!config.clientId) {
      return res.status(400).json({ 
        error: `${provider} OAuth nicht konfiguriert. Setze ${provider.toUpperCase()}_CLIENT_ID und ${provider.toUpperCase()}_CLIENT_SECRET`,
        needsSetup: true
      });
    }
    
    const state = crypto.randomBytes(32).toString('hex');
    this.pendingAuth.set(state, { provider, redirectUri, addAccount, timestamp: Date.now() });
    
    setTimeout(() => this.pendingAuth.delete(state), 10 * 60 * 1000);
    
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${process.env.CLAWDBOT_URL || 'http://localhost:8080'}/api/oauth/callback/${provider}`,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: addAccount ? 'consent select_account' : 'consent'
    });
    
    const authUrl = `${config.authUrl}?${params.toString()}`;
    
    logger.info({ provider }, 'OAuth initiated');
    res.json({ authUrl });
  }
  
  async handleCallback(req, res) {
    const { provider } = req.params;
    const { code, state, error } = req.query;
    
    const pending = this.pendingAuth.get(state);
    if (!pending) {
      return res.redirect(`${pending?.redirectUri || '/settings'}?oauth_error=Invalid+state`);
    }
    
    this.pendingAuth.delete(state);
    
    if (error) {
      return res.redirect(`${pending.redirectUri}?oauth_provider=${provider}&oauth_error=${encodeURIComponent(error)}`);
    }
    
    try {
      const config = OAUTH_CONFIGS[provider];
      
      const tokenRes = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${process.env.CLAWDBOT_URL || 'http://localhost:8080'}/api/oauth/callback/${provider}`
        })
      });
      
      const tokens = await tokenRes.json();
      
      if (tokens.error) {
        throw new Error(tokens.error_description || tokens.error);
      }
      
      const userRes = await fetch(config.userInfoUrl, {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` }
      });
      const user = await userRes.json();
      
      const account = this.normalizeUser(provider, user, tokens);
      
      if (!this.connectedAccounts.has(provider)) {
        this.connectedAccounts.set(provider, []);
      }
      
      const accounts = this.connectedAccounts.get(provider);
      const existingIndex = accounts.findIndex(a => a.id === account.id);
      
      if (existingIndex >= 0) {
        accounts[existingIndex] = { ...accounts[existingIndex], ...account, active: true };
      } else {
        accounts.forEach(a => a.active = false);
        accounts.push({ ...account, active: true });
      }
      
      if (config.apiKeyUrl) {
        await this.provisionApiKey(provider, account.id, tokens.access_token);
      }
      
      await this.saveToDatabase(provider, account, tokens);
      
      logger.info({ provider, userId: account.id }, 'OAuth completed successfully');
      
      res.redirect(`${pending.redirectUri}?oauth_provider=${provider}&oauth_success=true`);
    } catch (error) {
      logger.error({ provider, error: error.message }, 'OAuth callback failed');
      res.redirect(`${pending.redirectUri}?oauth_provider=${provider}&oauth_error=${encodeURIComponent(error.message)}`);
    }
  }
  
  normalizeUser(provider, user, tokens) {
    switch (provider) {
      case 'google':
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.picture,
          tokens
        };
      case 'mistral':
        return {
          id: user.id || user.email,
          email: user.email,
          name: user.name || user.email?.split('@')[0],
          tokens
        };
      case 'github':
        return {
          id: String(user.id),
          email: user.email,
          name: user.name || user.login,
          avatar: user.avatar_url,
          username: user.login,
          tokens
        };
      case 'discord':
        return {
          id: user.id,
          email: user.email,
          name: user.global_name || user.username,
          avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
          username: user.username,
          tokens
        };
      case 'huggingface':
        return {
          id: user.id || user.name,
          email: user.email,
          name: user.fullname || user.name,
          avatar: user.avatarUrl,
          tokens
        };
      default:
        return { id: user.id, email: user.email, name: user.name, tokens };
    }
  }
  
  async provisionApiKey(provider, accountId, accessToken) {
    const config = OAUTH_CONFIGS[provider];
    
    try {
      let apiKey = null;
      
      switch (provider) {
        case 'google':
          apiKey = await this.provisionGoogleApiKey(accessToken);
          break;
        case 'mistral':
          apiKey = await this.provisionMistralApiKey(accessToken);
          break;
        case 'huggingface':
          apiKey = await this.provisionHuggingFaceApiKey(accessToken);
          break;
      }
      
      if (apiKey) {
        this.apiKeys.set(`${provider}:${accountId}`, apiKey);
        logger.info({ provider, accountId }, 'API Key provisioned successfully');
        
        if (this.pool) {
          await this.pool.query(`
            INSERT INTO api_keys (provider, account_id, key_value, created_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (provider, account_id) DO UPDATE SET key_value = $3, updated_at = NOW()
          `, [provider, accountId, this.encryptKey(apiKey)]);
        }
      }
    } catch (error) {
      logger.error({ provider, error: error.message }, 'Failed to provision API key');
    }
  }
  
  async provisionGoogleApiKey(accessToken) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/apiKeys', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'SIN-Solver Auto-Generated Key'
      })
    });
    
    if (!res.ok) {
      const createKeyUrl = 'https://makersuite.google.com/app/apikey';
      logger.warn('Google API Key creation via OAuth not available, user needs to create manually');
      return null;
    }
    
    const data = await res.json();
    return data.value || data.key;
  }
  
  async provisionMistralApiKey(accessToken) {
    const res = await fetch('https://api.mistral.ai/v1/api-keys', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'SIN-Solver Auto-Generated',
        expiresAt: null
      })
    });
    
    if (!res.ok) {
      logger.warn('Mistral API Key creation via OAuth not available');
      return null;
    }
    
    const data = await res.json();
    return data.key || data.value;
  }
  
  async provisionHuggingFaceApiKey(accessToken) {
    const res = await fetch('https://huggingface.co/api/tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'SIN-Solver Auto-Generated',
        canReadGatedRepos: true,
        canWriteRepos: false
      })
    });
    
    if (!res.ok) {
      logger.warn('HuggingFace Token creation via OAuth not available');
      return null;
    }
    
    const data = await res.json();
    return data.token || data.accessToken;
  }
  
  encryptKey(key) {
    const algorithm = 'aes-256-gcm';
    const secret = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secret.slice(0, 32)), iv);
    
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decryptKey(encrypted) {
    const [ivHex, authTagHex, data] = encrypted.split(':');
    const algorithm = 'aes-256-gcm';
    const secret = process.env.ENCRYPTION_KEY || '';
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secret.slice(0, 32)), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  async saveToDatabase(provider, account, tokens) {
    if (!this.pool) return;
    
    try {
      await this.pool.query(`
        INSERT INTO oauth_accounts (provider, account_id, email, name, avatar, tokens, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (provider, account_id) DO UPDATE SET 
          email = $3, name = $4, avatar = $5, tokens = $6, updated_at = NOW()
      `, [
        provider,
        account.id,
        account.email,
        account.name,
        account.avatar,
        JSON.stringify({
          access_token: this.encryptKey(tokens.access_token),
          refresh_token: tokens.refresh_token ? this.encryptKey(tokens.refresh_token) : null,
          expires_at: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null
        })
      ]);
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to save OAuth account to database');
    }
  }
  
  async disconnectAccount(req, res) {
    const { provider } = req.params;
    const { accountId } = req.body;
    
    const accounts = this.connectedAccounts.get(provider) || [];
    const index = accounts.findIndex(a => a.id === accountId);
    
    if (index >= 0) {
      accounts.splice(index, 1);
      this.apiKeys.delete(`${provider}:${accountId}`);
      
      if (accounts.length > 0) {
        accounts[0].active = true;
      }
      
      if (this.pool) {
        await this.pool.query(
          'DELETE FROM oauth_accounts WHERE provider = $1 AND account_id = $2',
          [provider, accountId]
        );
      }
    }
    
    res.json({ success: true });
  }
  
  async switchAccount(req, res) {
    const { provider } = req.params;
    const { accountId } = req.body;
    
    const accounts = this.connectedAccounts.get(provider) || [];
    accounts.forEach(a => a.active = a.id === accountId);
    
    res.json({ success: true });
  }
  
  getApiKeys(req, res) {
    const keys = {};
    for (const [key, value] of this.apiKeys) {
      const [provider] = key.split(':');
      keys[provider] = { active: true, masked: `${value.slice(0, 8)}...${value.slice(-4)}` };
    }
    res.json({ keys });
  }
  
  async refreshToken(req, res) {
    const { provider } = req.params;
    
    const accounts = this.connectedAccounts.get(provider) || [];
    const active = accounts.find(a => a.active);
    
    if (!active || !active.tokens?.refresh_token) {
      return res.status(400).json({ error: 'No refresh token available' });
    }
    
    try {
      const config = OAUTH_CONFIGS[provider];
      
      const tokenRes = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: active.tokens.refresh_token,
          grant_type: 'refresh_token'
        })
      });
      
      const tokens = await tokenRes.json();
      
      if (tokens.error) {
        throw new Error(tokens.error);
      }
      
      active.tokens = { ...active.tokens, ...tokens };
      await this.saveToDatabase(provider, active, active.tokens);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  getRouter() {
    return this.router;
  }
  
  getApiKey(provider, accountId = null) {
    if (accountId) {
      return this.apiKeys.get(`${provider}:${accountId}`);
    }
    
    const accounts = this.connectedAccounts.get(provider) || [];
    const active = accounts.find(a => a.active);
    
    if (active) {
      return this.apiKeys.get(`${provider}:${active.id}`);
    }
    
    return null;
  }
}

module.exports = OAuthHandler;
