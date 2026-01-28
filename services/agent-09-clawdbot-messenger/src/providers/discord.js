const { BaseMessenger } = require('./index');
const { Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class DiscordMessenger extends BaseMessenger {
  constructor(config = {}) {
    super('discord', config);
    
    this.token = config.token || process.env.DISCORD_BOT_TOKEN;
    this.ceoPassword = config.ceoPassword || process.env.CEO_PASSWORD || 'ceo2026';
    this.guildId = config.guildId || process.env.DISCORD_GUILD_ID;
    this.notificationChannelId = config.notificationChannelId || process.env.DISCORD_NOTIFICATION_CHANNEL;
    
    this.client = null;
    this.pendingAuth = new Map();
  }
  
  async initialize() {
    if (!this.token) {
      this.logger.warn('DISCORD_BOT_TOKEN not set, skipping initialization');
      return;
    }
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers
      ]
    });
    
    this.client.once(Events.ClientReady, () => {
      this.connected = true;
      this.logger.info({ user: this.client.user.tag }, 'Discord bot connected');
    });
    
    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;
      await this.handleMessage(message);
    });
    
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isButton()) {
        await this.handleButtonInteraction(interaction);
      }
    });
    
    await this.client.login(this.token);
    this.logger.info('Discord provider initialized');
  }
  
  async handleMessage(message) {
    const userId = message.author.id;
    const content = message.content.trim();
    const isDM = !message.guild;
    
    if (content.startsWith('!auth ')) {
      const password = content.slice(6).trim();
      if (password === this.ceoPassword) {
        this.authorizedUsers.add(userId);
        this.logger.info({ userId, username: message.author.username }, 'Discord user authorized');
        
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Authentifiziert!')
          .setDescription('Willkommen im SIN-Solver CEO Bot.')
          .addFields({ name: 'Hilfe', value: '`!help` für Befehle' })
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
      } else {
        await message.reply('❌ Falsches Passwort');
      }
      return;
    }
    
    if (!this.authorizedUsers.has(userId)) {
      if (content.startsWith('!')) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🔐 Authentifizierung erforderlich')
          .setDescription('Bitte erst authentifizieren:\n`!auth <passwort>`');
        
        await message.reply({ embeds: [embed] });
      }
      return;
    }
    
    const command = content.toLowerCase();
    
    if (command === '!status') {
      await this.sendSystemStatus(message);
    } else if (command === '!surveys') {
      await this.sendSurveyStatus(message);
    } else if (command === '!services') {
      await this.sendServicesStatus(message);
    } else if (command === '!help') {
      await this.sendHelpMessage(message);
    } else if (command === '!menu') {
      await this.sendMainMenu(message);
    } else if (command.startsWith('!ask ')) {
      await this.askAI(message, content.slice(5));
    }
  }
  
  async handleButtonInteraction(interaction) {
    const userId = interaction.user.id;
    
    if (!this.authorizedUsers.has(userId)) {
      await interaction.reply({ content: '🔐 Nicht autorisiert', ephemeral: true });
      return;
    }
    
    await interaction.deferReply();
    
    const action = interaction.customId;
    
    if (action === 'btn_status') {
      await this.sendSystemStatusEmbed(interaction);
    } else if (action === 'btn_surveys') {
      await this.sendSurveyStatusEmbed(interaction);
    } else if (action === 'btn_services') {
      await this.sendServicesStatusEmbed(interaction);
    } else if (action === 'survey_start') {
      await this.handleSurveyAction(interaction, 'start');
    } else if (action === 'survey_stop') {
      await this.handleSurveyAction(interaction, 'stop');
    }
  }
  
  async sendMainMenu(message) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🏠 CEO Command Center')
      .setDescription('18-Zimmer Empire Status bereit.')
      .setTimestamp();
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('btn_status')
          .setLabel('📊 Status')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('btn_surveys')
          .setLabel('📈 Surveys')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('btn_services')
          .setLabel('🖥️ Services')
          .setStyle(ButtonStyle.Secondary)
      );
    
    await message.reply({ embeds: [embed], components: [row] });
  }
  
  async sendSystemStatus(message) {
    const embed = await this.buildSystemStatusEmbed();
    await message.reply({ embeds: [embed] });
  }
  
  async sendSystemStatusEmbed(interaction) {
    const embed = await this.buildSystemStatusEmbed();
    await interaction.editReply({ embeds: [embed] });
  }
  
  async buildSystemStatusEmbed() {
    const services = [
      { name: 'Survey Worker', url: 'http://zimmer-18-survey-worker:8018/health' },
      { name: 'API Brain', url: 'http://zimmer-13-api-koordinator:8000/health' },
      { name: 'Dashboard', url: 'http://zimmer-11-dashboard:3000/health' },
      { name: 'Steel Browser', url: 'http://zimmer-05-steel-tarnkappe:3000/health' },
    ];
    
    const fields = [];
    
    for (const svc of services) {
      try {
        const res = await fetch(svc.url, { signal: AbortSignal.timeout(3000) });
        fields.push({ name: svc.name, value: res.ok ? '🟢 Online' : '🟡 Degraded', inline: true });
      } catch {
        fields.push({ name: svc.name, value: '🔴 Offline', inline: true });
      }
    }
    
    return new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('📊 System Status')
      .addFields(fields)
      .setTimestamp();
  }
  
  async sendSurveyStatus(message) {
    const embed = await this.buildSurveyStatusEmbed();
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('survey_start')
          .setLabel('▶️ Start')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('survey_stop')
          .setLabel('⏹️ Stop')
          .setStyle(ButtonStyle.Danger)
      );
    
    await message.reply({ embeds: [embed], components: [row] });
  }
  
  async sendSurveyStatusEmbed(interaction) {
    const embed = await this.buildSurveyStatusEmbed();
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('survey_start')
          .setLabel('▶️ Start')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('survey_stop')
          .setLabel('⏹️ Stop')
          .setStyle(ButtonStyle.Danger)
      );
    
    await interaction.editReply({ embeds: [embed], components: [row] });
  }
  
  async buildSurveyStatusEmbed() {
    try {
      const response = await fetch('http://zimmer-18-survey-worker:8018/api/status', {
        signal: AbortSignal.timeout(5000)
      });
      const data = await response.json();
      
      return new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('📊 Survey Worker Status')
        .addFields(
          { name: 'Status', value: data.status || 'active', inline: true },
          { name: 'Completed', value: String(data.completedSurveys || 0), inline: true },
          { name: 'Earnings', value: `$${(data.totalEarnings || 0).toFixed(2)}`, inline: true }
        )
        .setTimestamp();
    } catch {
      return new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('📊 Survey Worker')
        .setDescription('🔴 Nicht erreichbar')
        .setTimestamp();
    }
  }
  
  async sendServicesStatus(message) {
    const embed = await this.buildServicesStatusEmbed();
    await message.reply({ embeds: [embed] });
  }
  
  async sendServicesStatusEmbed(interaction) {
    const embed = await this.buildServicesStatusEmbed();
    await interaction.editReply({ embeds: [embed] });
  }
  
  async buildServicesStatusEmbed() {
    const services = [
      { name: 'N8N', port: 5678, host: 'zimmer-01-n8n' },
      { name: 'Chronos', port: 3001, host: 'zimmer-02-chronos' },
      { name: 'OpenCode', port: 9000, host: 'zimmer-04-opencode' },
      { name: 'Steel', port: 3000, host: 'zimmer-05-steel' },
      { name: 'QA', port: 8080, host: 'zimmer-08-qa' },
      { name: 'Dashboard', port: 3000, host: 'zimmer-11-dashboard' },
      { name: 'API Brain', port: 8000, host: 'zimmer-13-api' },
      { name: 'Survey Worker', port: 8018, host: 'zimmer-18-survey-worker' },
    ];
    
    const fields = [];
    
    for (const svc of services) {
      try {
        const url = `http://${svc.host}:${svc.port}/health`;
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
        fields.push({ name: svc.name, value: `🟢 :${svc.port}`, inline: true });
      } catch {
        fields.push({ name: svc.name, value: `🔴 :${svc.port}`, inline: true });
      }
    }
    
    return new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🖥️ Services Status')
      .addFields(fields)
      .setTimestamp();
  }
  
  async handleSurveyAction(interaction, action) {
    try {
      const endpoint = action === 'start' ? '/api/start' : '/api/stop';
      await fetch(`http://zimmer-18-survey-worker:8018${endpoint}`, { method: 'POST' });
      
      const emoji = action === 'start' ? '▶️' : '⏹️';
      const text = action === 'start' ? 'gestartet' : 'gestoppt';
      
      await interaction.editReply({ content: `${emoji} Survey Worker ${text}` });
    } catch (error) {
      await interaction.editReply({ content: `❌ Fehler: ${error.message}` });
    }
  }
  
  async askAI(message, question) {
    try {
      await message.reply('🤔 Denke nach...');
      
      const response = await fetch('http://zimmer-04-opencode-sekretaer:9000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, provider: 'opencode' }),
        signal: AbortSignal.timeout(30000)
      });
      
      const data = await response.json();
      const answer = data.response || data.message || 'Keine Antwort';
      
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🤖 AI Antwort')
        .setDescription(answer.slice(0, 4000))
        .setTimestamp();
      
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      await message.reply(`❌ AI Fehler: ${error.message}`);
    }
  }
  
  async sendHelpMessage(message) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('❓ Discord CEO Bot Hilfe')
      .addFields(
        { name: 'Befehle', value: '`!status` - System Status\n`!surveys` - Survey Worker\n`!services` - Alle Services\n`!ask <frage>` - AI fragen\n`!menu` - Hauptmenü\n`!help` - Diese Hilfe' },
        { name: 'Multi-Messenger', value: 'Telegram ✅ | WhatsApp ✅ | Discord ✅' }
      )
      .setFooter({ text: 'SIN-Solver CEO Bot v3.0' })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
  
  async sendMessage(channelId, message, options = {}) {
    if (!this.client || !this.connected) {
      throw new Error('Discord client not connected');
    }
    
    const channel = await this.client.channels.fetch(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
    
    if (options.embed) {
      return channel.send({ embeds: [options.embed] });
    }
    
    return channel.send(message);
  }
  
  async broadcast(message, type = 'info', options = {}) {
    if (!this.notificationChannelId) {
      this.logger.warn('No notification channel configured');
      return {};
    }
    
    const colors = {
      info: 0x5865F2,
      success: 0x00FF00,
      warning: 0xFFFF00,
      error: 0xFF0000,
      alert: 0xFF0000,
      survey: 0x00FF00,
      earnings: 0xFFD700
    };
    
    const embed = new EmbedBuilder()
      .setColor(colors[type] || colors.info)
      .setTitle(`${type.toUpperCase()}`)
      .setDescription(message.replace(/\*/g, '**'))
      .setTimestamp();
    
    try {
      await this.sendMessage(this.notificationChannelId, '', { embed });
      return { [this.notificationChannelId]: { success: true } };
    } catch (error) {
      return { [this.notificationChannelId]: { success: false, error: error.message } };
    }
  }
  
  getStatus() {
    return {
      connected: this.connected,
      username: this.client?.user?.tag || null,
      guilds: this.client?.guilds?.cache?.size || 0,
      authorizedUsers: this.authorizedUsers.size
    };
  }
  
  async shutdown() {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
    }
    this.connected = false;
    this.logger.info('Discord provider shut down');
  }
}

module.exports = DiscordMessenger;
