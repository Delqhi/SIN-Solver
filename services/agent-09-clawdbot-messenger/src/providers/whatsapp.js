const { BaseMessenger } = require('./index');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

class WhatsAppMessenger extends BaseMessenger {
  constructor(config = {}) {
    super('whatsapp', config);
    
    this.authDir = config.authDir || process.env.WHATSAPP_AUTH_DIR || './auth_info_baileys';
    this.ceoPassword = config.ceoPassword || process.env.CEO_PASSWORD || 'ceo2026';
    this.ceoNumbers = new Set((config.ceoNumbers || process.env.WHATSAPP_CEO_NUMBERS || '').split(',').filter(Boolean));
    
    this.sock = null;
    this.qrCode = null;
    this.qrCodeCallback = null;
    this.connectionState = 'disconnected';
    this.messageQueue = [];
    this.retryCount = 0;
    this.maxRetries = 5;
    
    this.pendingAuth = new Map();
  }
  
  async initialize() {
    try {
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }
      
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      const { version } = await fetchLatestBaileysVersion();
      
      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['SIN-Solver CEO Bot', 'Chrome', '120.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        markOnlineOnConnect: true,
        syncFullHistory: false
      });
      
      this.sock.ev.on('creds.update', saveCreds);
      
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          this.qrCode = qr;
          this.connectionState = 'awaiting_scan';
          this.logger.info('QR Code generated - scan with WhatsApp');
          
          if (this.qrCodeCallback) {
            this.qrCodeCallback(qr);
          }
        }
        
        if (connection === 'close') {
          const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
          
          if (reason === DisconnectReason.loggedOut) {
            this.logger.warn('WhatsApp logged out - clearing session');
            this.connectionState = 'logged_out';
            this.connected = false;
            await this.clearSession();
          } else if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.logger.info({ attempt: this.retryCount }, 'Reconnecting WhatsApp...');
            this.connectionState = 'reconnecting';
            setTimeout(() => this.initialize(), 5000 * this.retryCount);
          } else {
            this.logger.error('Max reconnection attempts reached');
            this.connectionState = 'failed';
            this.connected = false;
          }
        } else if (connection === 'open') {
          this.connected = true;
          this.connectionState = 'connected';
          this.retryCount = 0;
          this.qrCode = null;
          this.logger.info('WhatsApp connected successfully');
          
          await this.processMessageQueue();
        }
      });
      
      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        for (const msg of messages) {
          if (msg.key.fromMe) continue;
          await this.handleIncomingMessage(msg);
        }
      });
      
      this.logger.info('WhatsApp provider initialized');
    } catch (error) {
      this.logger.error({ error: error.message }, 'WhatsApp initialization failed');
      this.connectionState = 'error';
      throw error;
    }
  }
  
  async handleIncomingMessage(msg) {
    const jid = msg.key.remoteJid;
    const phoneNumber = jid.split('@')[0];
    const text = msg.message?.conversation || 
                 msg.message?.extendedTextMessage?.text || 
                 '';
    
    if (!text) return;
    
    const command = text.trim().toLowerCase();
    
    if (command.startsWith('/auth ')) {
      const password = text.slice(6).trim();
      if (password === this.ceoPassword) {
        this.authorizedUsers.add(jid);
        this.ceoNumbers.add(phoneNumber);
        this.logger.info({ phoneNumber }, 'WhatsApp user authorized');
        await this.sendMessage(jid, '✅ *Authentifiziert!*\n\nWillkommen im SIN-Solver CEO Bot.\n\nSende /help für verfügbare Befehle.');
      } else {
        await this.sendMessage(jid, '❌ Falsches Passwort');
      }
      return;
    }
    
    if (!this.authorizedUsers.has(jid)) {
      await this.sendMessage(jid, '🔐 *SIN-Solver CEO Bot*\n\nBitte authentifizieren:\n`/auth <passwort>`');
      return;
    }
    
    if (command === '/status') {
      await this.sendSystemStatus(jid);
    } else if (command === '/surveys') {
      await this.sendSurveyStatus(jid);
    } else if (command === '/help') {
      await this.sendHelpMessage(jid);
    } else if (command === '/menu') {
      await this.sendMainMenu(jid);
    } else if (command.startsWith('/ask ')) {
      await this.askAI(jid, text.slice(5));
    }
  }
  
  async sendMainMenu(jid) {
    const menu = `🏠 *CEO Command Center - WhatsApp*

📊 /status - System Status
📈 /surveys - Survey Worker Status  
🤖 /ask <frage> - AI fragen
❓ /help - Hilfe

_SIN-Solver CEO Bot v3.0_`;
    
    await this.sendMessage(jid, menu);
  }
  
  async sendSystemStatus(jid) {
    try {
      const services = [
        { name: 'Survey Worker', url: 'http://zimmer-18-survey-worker:8018/health' },
        { name: 'API Brain', url: 'http://zimmer-13-api-koordinator:8000/health' },
        { name: 'Dashboard', url: 'http://zimmer-11-dashboard:3000/health' },
      ];
      
      let statusText = `📊 *System Status*\n\n`;
      
      for (const svc of services) {
        try {
          const res = await fetch(svc.url, { signal: AbortSignal.timeout(3000) });
          statusText += res.ok ? `🟢 ${svc.name}\n` : `🟡 ${svc.name}\n`;
        } catch {
          statusText += `🔴 ${svc.name}\n`;
        }
      }
      
      statusText += `\n⏰ ${new Date().toLocaleString('de-DE')}`;
      await this.sendMessage(jid, statusText);
    } catch (error) {
      await this.sendMessage(jid, `❌ Fehler: ${error.message}`);
    }
  }
  
  async sendSurveyStatus(jid) {
    try {
      const response = await fetch('http://zimmer-18-survey-worker:8018/api/status', {
        signal: AbortSignal.timeout(5000)
      });
      const data = await response.json();
      
      let text = `📊 *Survey Worker Status*\n\n`;
      text += `🟢 Status: ${data.status || 'active'}\n`;
      text += `📈 Completed: ${data.completedSurveys || 0}\n`;
      text += `💰 Earnings: $${(data.totalEarnings || 0).toFixed(2)}\n`;
      
      await this.sendMessage(jid, text);
    } catch (error) {
      await this.sendMessage(jid, `📊 Survey Worker\n🔴 Nicht erreichbar`);
    }
  }
  
  async askAI(jid, question) {
    try {
      await this.sendMessage(jid, '🤔 Denke nach...');
      
      const response = await fetch('http://zimmer-04-opencode-sekretaer:9000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, provider: 'opencode' }),
        signal: AbortSignal.timeout(30000)
      });
      
      const data = await response.json();
      const answer = data.response || data.message || 'Keine Antwort';
      
      await this.sendMessage(jid, `🤖 *AI:*\n\n${answer.slice(0, 4000)}`);
    } catch (error) {
      await this.sendMessage(jid, `❌ AI Fehler: ${error.message}`);
    }
  }
  
  async sendHelpMessage(jid) {
    const help = `❓ *WhatsApp CEO Bot Hilfe*

*Befehle:*
/status - System Status
/surveys - Survey Worker Status
/ask <frage> - AI fragen
/menu - Hauptmenü
/help - Diese Hilfe

*Multi-Messenger:*
Telegram ✅ | WhatsApp ✅ | Discord ✅

_SIN-Solver CEO Bot v3.0_`;
    
    await this.sendMessage(jid, help);
  }
  
  async sendMessage(jid, message, options = {}) {
    if (!this.connected || !this.sock) {
      this.messageQueue.push({ jid, message, options });
      this.logger.debug('Message queued (not connected)');
      return { queued: true };
    }
    
    try {
      await this.sock.sendMessage(jid, { text: message });
      return { success: true };
    } catch (error) {
      this.logger.error({ jid, error: error.message }, 'Failed to send WhatsApp message');
      throw error;
    }
  }
  
  async broadcast(message, type = 'info', options = {}) {
    const results = {};
    
    for (const jid of this.authorizedUsers) {
      try {
        await this.sendMessage(jid, message);
        results[jid] = { success: true };
      } catch (error) {
        results[jid] = { success: false, error: error.message };
      }
    }
    
    for (const number of this.ceoNumbers) {
      const jid = `${number}@s.whatsapp.net`;
      if (!this.authorizedUsers.has(jid)) {
        try {
          await this.sendMessage(jid, message);
          results[jid] = { success: true };
        } catch (error) {
          results[jid] = { success: false, error: error.message };
        }
      }
    }
    
    return results;
  }
  
  async processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { jid, message, options } = this.messageQueue.shift();
      try {
        await this.sendMessage(jid, message, options);
      } catch (error) {
        this.logger.error({ error: error.message }, 'Failed to process queued message');
      }
    }
  }
  
  async clearSession() {
    try {
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
      }
      this.logger.info('WhatsApp session cleared');
    } catch (error) {
      this.logger.error({ error: error.message }, 'Failed to clear session');
    }
  }
  
  getQRCode() {
    return this.qrCode;
  }
  
  onQRCode(callback) {
    this.qrCodeCallback = callback;
  }
  
  getConnectionState() {
    return this.connectionState;
  }
  
  getStatus() {
    return {
      connected: this.connected,
      connectionState: this.connectionState,
      authorizedUsers: this.authorizedUsers.size,
      ceoNumbers: this.ceoNumbers.size,
      queueSize: this.messageQueue.length,
      hasQR: !!this.qrCode
    };
  }
  
  async logout() {
    if (this.sock) {
      await this.sock.logout();
    }
    await this.clearSession();
    this.connected = false;
    this.connectionState = 'logged_out';
  }
  
  async shutdown() {
    if (this.sock) {
      this.sock.end();
      this.sock = null;
    }
    this.connected = false;
    this.connectionState = 'disconnected';
    this.logger.info('WhatsApp provider shut down');
  }
}

module.exports = WhatsAppMessenger;
