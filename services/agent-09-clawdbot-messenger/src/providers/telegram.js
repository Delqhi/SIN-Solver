/**
 * SIN-Solver Clawdbot - Telegram Provider
 * Full-featured Telegram bot with CEO authentication and inline keyboards
 * 
 * @version 2.0.0
 * @author SIN-Solver Empire
 */

const { BaseMessenger } = require('./index');

class TelegramMessenger extends BaseMessenger {
  constructor(config = {}) {
    super('telegram', config);
    
    this.token = config.token || process.env.TELEGRAM_BOT_TOKEN;
    this.ceoPassword = config.ceoPassword || process.env.CEO_PASSWORD || 'ceo2026';
    this.ceoChatId = config.ceoChatId || process.env.TELEGRAM_CHAT_ID;
    
    this.bot = null;
    this.TelegramBot = null;
    this.pendingConversations = new Map();
    
    // API endpoints for integration
    this.apiCoordinator = process.env.API_COORDINATOR_URL || 'http://zimmer-13-api-koordinator:8000';
    this.opencodeUrl = process.env.OPENCODE_URL || 'http://zimmer-04-opencode-sekretaer:9000';
    this.steelUrl = process.env.STEEL_URL || 'http://zimmer-05-steel-tarnkappe:3000';
    
    // Database pool (injected)
    this.pool = config.pool || null;
  }
  
  /**
   * Set database pool (for dependency injection)
   */
  setPool(pool) {
    this.pool = pool;
  }
  
  /**
   * Initialize Telegram bot with all handlers
   */
  async initialize() {
    if (!this.token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set, skipping initialization');
      return;
    }
    
    this.TelegramBot = require('node-telegram-bot-api');
    this.bot = new this.TelegramBot(this.token, { polling: true });
    
    // Register all command handlers
    this.registerCommands();
    this.registerCallbackHandlers();
    this.registerMessageHandler();
    
    this.connected = true;
    this.logger.info('Telegram bot initialized');
  }
  
  /**
   * Register all slash commands
   */
  registerCommands() {
    // /start - Initial authentication
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      if (!this.authorizedUsers.has(chatId)) {
        this.bot.sendMessage(chatId, 
          `🔐 *SIN-Solver CEO Bot*\n\nBitte authentifizieren:\n\`/auth <passwort>\``,
          { parse_mode: 'Markdown' }
        );
        return;
      }
      this.sendMainMenu(chatId);
    });
    
    // /auth - CEO authentication
    this.bot.onText(/\/auth (.+)/, (msg, match) => {
      const chatId = msg.chat.id;
      const password = match[1].trim();
      
      if (password === this.ceoPassword) {
        this.authorizedUsers.add(chatId);
        this.logger.info({ chatId }, 'User authorized via Telegram');
        this.bot.sendMessage(chatId, 
          `✅ *Authentifiziert!*\n\nWillkommen, CEO.\n\nSende /menu für das Hauptmenü.`,
          { parse_mode: 'Markdown' }
        );
        this.sendMainMenu(chatId);
      } else {
        this.bot.sendMessage(chatId, `❌ Falsches Passwort`);
      }
    });
    
    // /menu - Main menu
    this.bot.onText(/\/menu/, (msg) => {
      if (!this.checkAuth(msg)) return;
      this.sendMainMenu(msg.chat.id);
    });
    
    // /status - System status
    this.bot.onText(/\/status/, async (msg) => {
      if (!this.checkAuth(msg)) return;
      await this.sendSystemStatus(msg.chat.id);
    });
    
    // /services - All services status
    this.bot.onText(/\/services/, async (msg) => {
      if (!this.checkAuth(msg)) return;
      await this.sendServicesStatus(msg.chat.id);
    });
    
    // /tasks - Task overview
    this.bot.onText(/\/tasks/, async (msg) => {
      if (!this.checkAuth(msg)) return;
      await this.sendTasksOverview(msg.chat.id);
    });
    
    // /workers - Worker status
    this.bot.onText(/\/workers/, async (msg) => {
      if (!this.checkAuth(msg)) return;
      await this.sendWorkersStatus(msg.chat.id);
    });
    
    // /surveys - Survey Worker status (NEW)
    this.bot.onText(/\/surveys/, async (msg) => {
      if (!this.checkAuth(msg)) return;
      await this.sendSurveyStatus(msg.chat.id);
    });
    
    // /newtask - Create new task
    this.bot.onText(/\/newtask (.+)/, async (msg, match) => {
      if (!this.checkAuth(msg)) return;
      await this.createNewTask(msg.chat.id, match[1]);
    });
    
    // /browse - Browser task
    this.bot.onText(/\/browse (.+)/, async (msg, match) => {
      if (!this.checkAuth(msg)) return;
      await this.startBrowserTask(msg.chat.id, match[1]);
    });
    
    // /ask - AI question
    this.bot.onText(/\/ask (.+)/, async (msg, match) => {
      if (!this.checkAuth(msg)) return;
      await this.askAI(msg.chat.id, match[1]);
    });
    
    // /metrics - System metrics
    this.bot.onText(/\/metrics/, async (msg) => {
      if (!this.checkAuth(msg)) return;
      await this.sendMetrics(msg.chat.id);
    });
    
    // /logs - Service logs
    this.bot.onText(/\/logs (.+)/, async (msg, match) => {
      if (!this.checkAuth(msg)) return;
      await this.sendServiceLogs(msg.chat.id, match[1]);
    });
    
    // /restart - Restart service
    this.bot.onText(/\/restart (.+)/, async (msg, match) => {
      if (!this.checkAuth(msg)) return;
      await this.restartService(msg.chat.id, match[1]);
    });
    
    // /help - Help message
    this.bot.onText(/\/help/, (msg) => {
      if (!this.checkAuth(msg)) return;
      this.sendHelpMessage(msg.chat.id);
    });
  }
  
  /**
   * Register callback query handlers (inline buttons)
   */
  registerCallbackHandlers() {
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      if (!this.authorizedUsers.has(chatId)) {
        this.bot.answerCallbackQuery(query.id, { text: '🔐 Nicht autorisiert' });
        return;
      }
      
      const data = query.data;
      this.bot.answerCallbackQuery(query.id);
      
      // Route callback to appropriate handler
      if (data === 'menu_status') await this.sendSystemStatus(chatId);
      else if (data === 'menu_services') await this.sendServicesStatus(chatId);
      else if (data === 'menu_tasks') await this.sendTasksOverview(chatId);
      else if (data === 'menu_workers') await this.sendWorkersStatus(chatId);
      else if (data === 'menu_surveys') await this.sendSurveyStatus(chatId);
      else if (data === 'menu_metrics') await this.sendMetrics(chatId);
      else if (data === 'menu_ai') await this.askAIPrompt(chatId);
      else if (data === 'menu_browser') await this.browserPrompt(chatId);
      else if (data === 'menu_newtask') await this.newTaskPrompt(chatId);
      else if (data === 'menu_help') this.sendHelpMessage(chatId);
      else if (data === 'back_menu') this.sendMainMenu(chatId);
      else if (data.startsWith('task_')) await this.handleTaskAction(chatId, data);
      else if (data.startsWith('service_')) await this.handleServiceAction(chatId, data);
      else if (data.startsWith('survey_')) await this.handleSurveyAction(chatId, data);
    });
  }
  
  /**
   * Register message handler for conversations
   */
  registerMessageHandler() {
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      if (!this.authorizedUsers.has(chatId)) return;
      if (msg.text && msg.text.startsWith('/')) return;
      
      const pending = this.pendingConversations.get(chatId);
      if (pending) {
        this.pendingConversations.delete(chatId);
        
        if (pending.type === 'ai_question') {
          await this.askAI(chatId, msg.text);
        } else if (pending.type === 'browser_url') {
          await this.startBrowserTask(chatId, msg.text);
        } else if (pending.type === 'new_task') {
          await this.createNewTask(chatId, msg.text);
        }
      }
    });
  }
  
  /**
   * Check if user is authorized
   */
  checkAuth(msg) {
    if (!this.authorizedUsers.has(msg.chat.id)) {
      this.bot.sendMessage(msg.chat.id, '🔐 Bitte erst authentifizieren: `/auth <passwort>`', 
        { parse_mode: 'Markdown' });
      return false;
    }
    return true;
  }
  
  /**
   * Send main menu with inline keyboard
   */
  sendMainMenu(chatId) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 System Status', callback_data: 'menu_status' },
          { text: '🖥️ Services', callback_data: 'menu_services' }
        ],
        [
          { text: '📋 Tasks', callback_data: 'menu_tasks' },
          { text: '👷 Workers', callback_data: 'menu_workers' }
        ],
        [
          { text: '📊 Surveys', callback_data: 'menu_surveys' },
          { text: '📈 Metrics', callback_data: 'menu_metrics' }
        ],
        [
          { text: '🤖 AI Fragen', callback_data: 'menu_ai' },
          { text: '🌐 Browser Task', callback_data: 'menu_browser' }
        ],
        [
          { text: '➕ Neuer Task', callback_data: 'menu_newtask' },
          { text: '❓ Hilfe', callback_data: 'menu_help' }
        ]
      ]
    };
    
    this.bot.sendMessage(chatId,
      `🏠 *CEO Command Center*\n\n` +
      `18-Zimmer Empire Status bereit.\n` +
      `Wähle eine Option:`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  }
  
  /**
   * Send system status
   */
  async sendSystemStatus(chatId) {
    try {
      const services = [
        { name: 'API', url: `${this.apiCoordinator}/health` },
        { name: 'OpenCode', url: `${this.opencodeUrl}/health` },
        { name: 'Steel', url: `${this.steelUrl}/health` },
        { name: 'Survey Worker', url: 'http://zimmer-18-survey-worker:8018/health' },
      ];
      
      let statusText = `📊 *System Status*\n\n`;
      
      for (const svc of services) {
        try {
          const res = await fetch(svc.url, { signal: AbortSignal.timeout(5000) });
          statusText += res.ok ? `🟢 ${svc.name}\n` : `🟡 ${svc.name} (${res.status})\n`;
        } catch {
          statusText += `🔴 ${svc.name}\n`;
        }
      }
      
      if (this.pool) {
        try {
          const result = await this.pool.query('SELECT COUNT(*) FROM workers WHERE status = $1', ['active']);
          statusText += `\n👷 Active Workers: ${result.rows[0].count}\n`;
        } catch {
          statusText += `\n⚠️ DB nicht erreichbar\n`;
        }
      }
      
      statusText += `\n⏰ ${new Date().toLocaleString('de-DE')}`;
      
      this.bot.sendMessage(chatId, statusText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '← Zurück', callback_data: 'back_menu' }]] }
      });
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ Fehler: ${error.message}`);
    }
  }
  
  /**
   * Send services status
   */
  async sendServicesStatus(chatId) {
    const services = [
      { name: 'Redis', port: 6379, host: 'zimmer-archiv-redis' },
      { name: 'PostgreSQL', port: 5432, host: 'zimmer-archiv-postgres' },
      { name: 'N8N', port: 5678, host: 'zimmer-01-n8n' },
      { name: 'Chronos', port: 3001, host: 'zimmer-02-chronos' },
      { name: 'Steel Browser', port: 3000, host: 'zimmer-05-steel' },
      { name: 'QA', port: 8080, host: 'zimmer-08-qa' },
      { name: 'ClawdBot', port: 8080, host: 'zimmer-09-clawdbot' },
      { name: 'Dashboard', port: 3000, host: 'zimmer-11-dashboard' },
      { name: 'API Brain', port: 8000, host: 'zimmer-13-api' },
      { name: 'Survey Worker', port: 8018, host: 'zimmer-18-survey-worker' },
    ];
    
    let text = `🖥️ *Services (${services.length})*\n\n`;
    
    for (const svc of services) {
      try {
        const url = `http://${svc.host}:${svc.port}/health`;
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
        text += `🟢 ${svc.name} (:${svc.port})\n`;
      } catch {
        text += `🔴 ${svc.name} (:${svc.port})\n`;
      }
    }
    
    this.bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '← Zurück', callback_data: 'back_menu' }]]
      }
    });
  }
  
  /**
   * Send tasks overview
   */
  async sendTasksOverview(chatId) {
    if (!this.pool) {
      this.bot.sendMessage(chatId, '⚠️ Database nicht konfiguriert');
      return;
    }
    
    try {
      const result = await this.pool.query(`
        SELECT status, COUNT(*) as count 
        FROM tasks 
        GROUP BY status
      `);
      
      const stats = result.rows.reduce((acc, r) => {
        acc[r.status] = parseInt(r.count);
        return acc;
      }, {});
      
      const recent = await this.pool.query(`
        SELECT id, type, status, priority, created_at 
        FROM tasks 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      let text = `📋 *Tasks Overview*\n\n`;
      text += `⏳ Pending: ${stats.pending || 0}\n`;
      text += `🔄 Running: ${stats.running || 0}\n`;
      text += `✅ Completed: ${stats.completed || 0}\n`;
      text += `❌ Failed: ${stats.failed || 0}\n\n`;
      text += `*Letzte Tasks:*\n`;
      
      for (const task of recent.rows) {
        const icon = task.status === 'completed' ? '✅' : 
                     task.status === 'running' ? '🔄' : 
                     task.status === 'failed' ? '❌' : '⏳';
        text += `${icon} ${task.type} (${task.id.slice(0, 8)})\n`;
      }
      
      this.bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Neuer Task', callback_data: 'menu_newtask' }],
            [{ text: '← Zurück', callback_data: 'back_menu' }]
          ]
        }
      });
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ DB Fehler: ${error.message}`);
    }
  }
  
  /**
   * Send workers status
   */
  async sendWorkersStatus(chatId) {
    if (!this.pool) {
      this.bot.sendMessage(chatId, '⚠️ Database nicht konfiguriert');
      return;
    }
    
    try {
      const result = await this.pool.query(`
        SELECT id, name, status, capabilities, last_heartbeat 
        FROM workers 
        ORDER BY last_heartbeat DESC 
        LIMIT 10
      `);
      
      if (result.rows.length === 0) {
        this.bot.sendMessage(chatId, '👷 Keine Worker registriert', {
          reply_markup: { inline_keyboard: [[{ text: '← Zurück', callback_data: 'back_menu' }]] }
        });
        return;
      }
      
      let text = `👷 *Workers (${result.rows.length})*\n\n`;
      
      for (const w of result.rows) {
        const icon = w.status === 'active' ? '🟢' : '🔴';
        const lastSeen = w.last_heartbeat 
          ? new Date(w.last_heartbeat).toLocaleTimeString('de-DE')
          : 'nie';
        text += `${icon} *${w.name}*\n`;
        text += `   ID: \`${w.id.slice(0, 8)}\`\n`;
        text += `   Zuletzt: ${lastSeen}\n\n`;
      }
      
      this.bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '← Zurück', callback_data: 'back_menu' }]]
        }
      });
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ DB Fehler: ${error.message}`);
    }
  }
  
  /**
   * Send survey worker status (NEW)
   */
  async sendSurveyStatus(chatId) {
    try {
      const response = await fetch('http://zimmer-18-survey-worker:8018/api/status', {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      let text = `📊 *Survey Worker Status*\n\n`;
      text += `🟢 Status: ${data.status || 'active'}\n`;
      text += `📈 Completed: ${data.completedSurveys || 0}\n`;
      text += `💰 Earnings: $${(data.totalEarnings || 0).toFixed(2)}\n`;
      text += `🔄 Active: ${data.activeSurveys || 0}\n\n`;
      
      if (data.platforms) {
        text += `*Platforms:*\n`;
        for (const [platform, stats] of Object.entries(data.platforms)) {
          text += `  ${platform}: ${stats.completed || 0} done\n`;
        }
      }
      
      text += `\n⏰ ${new Date().toLocaleString('de-DE')}`;
      
      this.bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '▶️ Start Survey', callback_data: 'survey_start' },
              { text: '⏹️ Stop', callback_data: 'survey_stop' }
            ],
            [{ text: '← Zurück', callback_data: 'back_menu' }]
          ]
        }
      });
    } catch (error) {
      this.bot.sendMessage(chatId, 
        `📊 *Survey Worker*\n\n🔴 Nicht erreichbar\n\nFehler: ${error.message}`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '← Zurück', callback_data: 'back_menu' }]] }
        }
      );
    }
  }
  
  /**
   * Handle survey actions
   */
  async handleSurveyAction(chatId, data) {
    const action = data.replace('survey_', '');
    
    try {
      if (action === 'start') {
        await fetch('http://zimmer-18-survey-worker:8018/api/start', { method: 'POST' });
        this.bot.sendMessage(chatId, '▶️ Survey Worker gestartet');
      } else if (action === 'stop') {
        await fetch('http://zimmer-18-survey-worker:8018/api/stop', { method: 'POST' });
        this.bot.sendMessage(chatId, '⏹️ Survey Worker gestoppt');
      }
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ Fehler: ${error.message}`);
    }
  }
  
  /**
   * Send metrics
   */
  async sendMetrics(chatId) {
    try {
      const metrics = await fetch('http://zimmer-12-evolution-optimizer:8080/api/metrics', {
        signal: AbortSignal.timeout(5000)
      });
      const data = await metrics.json();
      
      let text = `📈 *Metrics*\n\n`;
      text += `📊 Tasks/Stunde: ${data.tasksPerHour || 'N/A'}\n`;
      text += `⚡ Avg Dauer: ${data.avgDuration || 'N/A'}s\n`;
      text += `✅ Erfolgsrate: ${data.successRate || 'N/A'}%\n`;
      text += `🔄 Uptime: ${data.uptime || 'N/A'}h\n`;
      
      this.bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '← Zurück', callback_data: 'back_menu' }]]
        }
      });
    } catch {
      this.bot.sendMessage(chatId, '❌ Metrics nicht verfügbar', {
        reply_markup: { inline_keyboard: [[{ text: '← Zurück', callback_data: 'back_menu' }]] }
      });
    }
  }
  
  /**
   * Prompt for AI question
   */
  async askAIPrompt(chatId) {
    this.pendingConversations.set(chatId, { type: 'ai_question' });
    this.bot.sendMessage(chatId, 
      '🤖 *AI Assistant*\n\nStelle deine Frage:',
      { parse_mode: 'Markdown' }
    );
  }
  
  /**
   * Ask AI a question
   */
  async askAI(chatId, question) {
    try {
      this.bot.sendMessage(chatId, '🤔 Denke nach...');
      
      const response = await fetch(`${this.opencodeUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: question,
          provider: 'opencode'
        }),
        signal: AbortSignal.timeout(30000)
      });
      
      const data = await response.json();
      const answer = data.response || data.message || 'Keine Antwort erhalten';
      
      this.bot.sendMessage(chatId, 
        `🤖 *AI Antwort:*\n\n${answer.slice(0, 4000)}`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '← Zurück', callback_data: 'back_menu' }]]
          }
        }
      );
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ AI Fehler: ${error.message}`);
    }
  }
  
  /**
   * Prompt for browser URL
   */
  async browserPrompt(chatId) {
    this.pendingConversations.set(chatId, { type: 'browser_url' });
    this.bot.sendMessage(chatId, 
      '🌐 *Browser Task*\n\nGib die URL ein die besucht werden soll:',
      { parse_mode: 'Markdown' }
    );
  }
  
  /**
   * Start browser task
   */
  async startBrowserTask(chatId, url) {
    try {
      if (!url.startsWith('http')) url = 'https://' + url;
      
      this.bot.sendMessage(chatId, `🌐 Starte Browser für: ${url}`);
      
      const response = await fetch(`${this.apiCoordinator}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'browser_navigation',
          priority: 7,
          payload: { url, action: 'screenshot' }
        }),
        signal: AbortSignal.timeout(10000)
      });
      
      const data = await response.json();
      
      this.bot.sendMessage(chatId, 
        `✅ *Browser Task erstellt*\n\n` +
        `🆔 Task ID: \`${data.id || 'N/A'}\`\n` +
        `🌐 URL: ${url}\n` +
        `📋 Status: pending`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '← Zurück', callback_data: 'back_menu' }]]
          }
        }
      );
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ Fehler: ${error.message}`);
    }
  }
  
  /**
   * Prompt for new task
   */
  async newTaskPrompt(chatId) {
    this.pendingConversations.set(chatId, { type: 'new_task' });
    this.bot.sendMessage(chatId, 
      '➕ *Neuer Task*\n\nBeschreibe den Task (z.B. "scrape website example.com"):',
      { parse_mode: 'Markdown' }
    );
  }
  
  /**
   * Create new task
   */
  async createNewTask(chatId, description) {
    try {
      const response = await fetch(`${this.apiCoordinator}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          priority: 5,
          payload: { description }
        }),
        signal: AbortSignal.timeout(10000)
      });
      
      const data = await response.json();
      
      this.bot.sendMessage(chatId, 
        `✅ *Task erstellt*\n\n` +
        `🆔 ID: \`${data.id || 'N/A'}\`\n` +
        `📋 Beschreibung: ${description.slice(0, 100)}`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '← Zurück', callback_data: 'back_menu' }]]
          }
        }
      );
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ Fehler: ${error.message}`);
    }
  }
  
  /**
   * Handle task action
   */
  async handleTaskAction(chatId, data) {
    this.bot.sendMessage(chatId, `⚙️ Task Action: ${data}`);
  }
  
  /**
   * Handle service action
   */
  async handleServiceAction(chatId, data) {
    const serviceName = data.replace('service_restart_', '');
    this.bot.sendMessage(chatId, `🔄 Restart ${serviceName}...`);
  }
  
  /**
   * Send service logs
   */
  async sendServiceLogs(chatId, service) {
    this.bot.sendMessage(chatId, `📜 Logs für ${service} - Feature in Entwicklung`);
  }
  
  /**
   * Restart service
   */
  async restartService(chatId, service) {
    this.bot.sendMessage(chatId, `🔄 Restart ${service} - Feature erfordert Docker-Zugriff`);
  }
  
  /**
   * Send help message
   */
  sendHelpMessage(chatId) {
    this.bot.sendMessage(chatId,
      `❓ *CEO Bot Hilfe*\n\n` +
      `*Befehle:*\n` +
      `/menu - Hauptmenü\n` +
      `/status - System Status\n` +
      `/services - Alle Services\n` +
      `/tasks - Task Übersicht\n` +
      `/workers - Worker Status\n` +
      `/surveys - Survey Worker Status\n` +
      `/metrics - Metriken\n` +
      `/ask <frage> - AI fragen\n` +
      `/browse <url> - Browser Task\n` +
      `/newtask <desc> - Task erstellen\n` +
      `/help - Diese Hilfe\n\n` +
      `*Multi-Messenger:*\n` +
      `Telegram ✅ | WhatsApp ✅ | Discord ✅\n\n` +
      `_SIN-Solver CEO Bot v3.0_`,
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '← Zurück', callback_data: 'back_menu' }]]
        }
      }
    );
  }
  
  /**
   * Send message to specific chat
   */
  async sendMessage(chatId, message, options = {}) {
    if (!this.bot) {
      throw new Error('Telegram bot not initialized');
    }
    
    return this.bot.sendMessage(chatId, message, {
      parse_mode: options.parseMode || 'Markdown',
      reply_markup: options.replyMarkup
    });
  }
  
  /**
   * Broadcast message to all authorized users or CEO chat
   */
  async broadcast(message, type = 'info', options = {}) {
    if (!this.bot) {
      this.logger.warn('Telegram bot not initialized, cannot broadcast');
      return;
    }
    
    // Send to CEO chat ID if set
    if (this.ceoChatId) {
      await this.bot.sendMessage(this.ceoChatId, message, { parse_mode: 'Markdown' });
    }
    
    // Also send to all authorized users
    for (const chatId of this.authorizedUsers) {
      if (chatId.toString() !== this.ceoChatId) {
        try {
          await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
          this.logger.error({ chatId, error: error.message }, 'Failed to send to user');
        }
      }
    }
  }
  
  /**
   * Shutdown bot
   */
  async shutdown() {
    if (this.bot) {
      this.bot.stopPolling();
      this.bot = null;
    }
    this.connected = false;
    this.logger.info('Telegram bot shut down');
  }
}

module.exports = TelegramMessenger;
