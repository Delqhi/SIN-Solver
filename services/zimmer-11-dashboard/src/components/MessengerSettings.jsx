import React, { useState, useEffect, useCallback } from 'react';

const CLAWDBOT_URL = 'http://localhost:8080';

function MessengerSettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [whatsappQR, setWhatsappQR] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    gemini: '',
    mistral: '',
    groq: '',
    huggingface: '',
    opencode_zen: ''
  });
  const [savedKeys, setSavedKeys] = useState({});
  const [showKeys, setShowKeys] = useState({});

  useEffect(() => {
    fetchConfig();
    fetchApiKeys();
    const interval = setInterval(fetchConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${CLAWDBOT_URL}/api/config`);
      const data = await res.json();
      setConfig(data);
      
      if (data.whatsapp?.needsQR) {
        fetchWhatsAppQR();
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsAppQR = async () => {
    try {
      const res = await fetch(`${CLAWDBOT_URL}/api/whatsapp/qr`);
      const data = await res.json();
      setWhatsappQR(data);
    } catch (error) {
      console.error('Failed to fetch WhatsApp QR:', error);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/settings/api-keys');
      if (res.ok) {
        const data = await res.json();
        setSavedKeys(data.keys || {});
        setApiKeys(prev => ({
          ...prev,
          ...Object.keys(data.keys || {}).reduce((acc, key) => {
            acc[key] = data.keys[key] ? '••••••••' : '';
            return acc;
          }, {})
        }));
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  };

  const testMessenger = async (provider) => {
    setTestResults(prev => ({ ...prev, [provider]: 'testing' }));
    try {
      const res = await fetch(`${CLAWDBOT_URL}/api/config/test/${provider}`, {
        method: 'POST'
      });
      const data = await res.json();
      setTestResults(prev => ({ 
        ...prev, 
        [provider]: data.success ? 'success' : 'failed' 
      }));
      setTimeout(() => {
        setTestResults(prev => ({ ...prev, [provider]: null }));
      }, 3000);
    } catch {
      setTestResults(prev => ({ ...prev, [provider]: 'failed' }));
    }
  };

  const logoutWhatsApp = async () => {
    if (!confirm('WhatsApp wirklich abmelden? Du musst den QR-Code erneut scannen.')) return;
    
    try {
      await fetch(`${CLAWDBOT_URL}/api/whatsapp/logout`, { method: 'POST' });
      fetchConfig();
      fetchWhatsAppQR();
    } catch (error) {
      console.error('Failed to logout WhatsApp:', error);
    }
  };

  const saveApiKey = async (provider) => {
    const value = apiKeys[provider];
    if (!value || value === '••••••••') return;
    
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: value })
      });
      
      if (res.ok) {
        setSavedKeys(prev => ({ ...prev, [provider]: true }));
        setApiKeys(prev => ({ ...prev, [provider]: '••••••••' }));
        alert(`${provider.toUpperCase()} API Key gespeichert!`);
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      alert('Fehler beim Speichern');
    }
  };

  const deleteApiKey = async (provider) => {
    if (!confirm(`${provider.toUpperCase()} API Key wirklich löschen?`)) return;
    
    try {
      await fetch(`/api/settings/api-keys/${provider}`, { method: 'DELETE' });
      setSavedKeys(prev => ({ ...prev, [provider]: false }));
      setApiKeys(prev => ({ ...prev, [provider]: '' }));
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const toggleShowKey = (provider) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  if (loading) {
    return <div className="loading">Lade Einstellungen...</div>;
  }

  return (
    <div className="messenger-settings">
      <h2>⚙️ Einstellungen</h2>
      
      <section className="settings-section">
        <h3>📱 Messenger Verbindungen</h3>
        <p className="section-desc">Verbinde Telegram, WhatsApp und Discord für CEO-Benachrichtigungen</p>
        
        <div className="messenger-cards">
          <div className={`messenger-card ${config?.telegram?.enabled ? 'enabled' : 'disabled'}`}>
            <div className="card-header">
              <span className="icon">📨</span>
              <h4>Telegram</h4>
              <span className={`status ${config?.telegram?.enabled ? 'online' : 'offline'}`}>
                {config?.telegram?.enabled ? '✅ Verbunden' : '❌ Nicht konfiguriert'}
              </span>
            </div>
            <div className="card-body">
              {config?.telegram?.enabled ? (
                <>
                  <p>Bot ist aktiv und empfängt Nachrichten.</p>
                  <button 
                    onClick={() => testMessenger('telegram')}
                    disabled={testResults.telegram === 'testing'}
                    className={testResults.telegram === 'success' ? 'success' : testResults.telegram === 'failed' ? 'error' : ''}
                  >
                    {testResults.telegram === 'testing' ? '⏳ Teste...' : 
                     testResults.telegram === 'success' ? '✅ Gesendet!' :
                     testResults.telegram === 'failed' ? '❌ Fehler' : '🧪 Test senden'}
                  </button>
                </>
              ) : (
                <>
                  <p>Setze <code>TELEGRAM_BOT_TOKEN</code> in den Umgebungsvariablen.</p>
                  <a href="https://t.me/BotFather" target="_blank" rel="noopener">→ Bot erstellen</a>
                </>
              )}
            </div>
          </div>

          <div className={`messenger-card ${config?.whatsapp?.enabled ? 'enabled' : 'disabled'}`}>
            <div className="card-header">
              <span className="icon">📲</span>
              <h4>WhatsApp</h4>
              <span className={`status ${config?.whatsapp?.configured ? 'online' : 'offline'}`}>
                {config?.whatsapp?.configured ? '✅ Verbunden' : 
                 config?.whatsapp?.needsQR ? '📱 QR scannen' : '❌ Nicht konfiguriert'}
              </span>
            </div>
            <div className="card-body">
              {config?.whatsapp?.needsQR && whatsappQR?.qr ? (
                <div className="qr-section">
                  <p><strong>Scanne diesen QR-Code mit WhatsApp:</strong></p>
                  <div className="qr-code">
                    <pre>{whatsappQR.qr}</pre>
                  </div>
                  <p className="hint">WhatsApp → Einstellungen → Verknüpfte Geräte → Gerät hinzufügen</p>
                  <button onClick={fetchWhatsAppQR}>🔄 QR aktualisieren</button>
                </div>
              ) : config?.whatsapp?.configured ? (
                <>
                  <p>WhatsApp ist verbunden und empfängt Nachrichten.</p>
                  <div className="button-group">
                    <button 
                      onClick={() => testMessenger('whatsapp')}
                      disabled={testResults.whatsapp === 'testing'}
                    >
                      🧪 Test senden
                    </button>
                    <button onClick={logoutWhatsApp} className="danger">
                      🚪 Abmelden
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>Setze <code>WHATSAPP_ENABLED=true</code> um WhatsApp zu aktivieren.</p>
                  <p>Danach erscheint hier ein QR-Code zum Scannen.</p>
                </>
              )}
            </div>
          </div>

          <div className={`messenger-card ${config?.discord?.enabled ? 'enabled' : 'disabled'}`}>
            <div className="card-header">
              <span className="icon">🎮</span>
              <h4>Discord</h4>
              <span className={`status ${config?.discord?.enabled ? 'online' : 'offline'}`}>
                {config?.discord?.enabled ? '✅ Verbunden' : '❌ Nicht konfiguriert'}
              </span>
            </div>
            <div className="card-body">
              {config?.discord?.enabled ? (
                <>
                  <p>Discord Bot ist aktiv.</p>
                  <button 
                    onClick={() => testMessenger('discord')}
                    disabled={testResults.discord === 'testing'}
                  >
                    🧪 Test senden
                  </button>
                </>
              ) : (
                <>
                  <p>Setze <code>DISCORD_BOT_TOKEN</code> in den Umgebungsvariablen.</p>
                  <a href="https://discord.com/developers/applications" target="_blank" rel="noopener">→ Bot erstellen</a>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3>🔑 API Keys</h3>
        <p className="section-desc">
          Verwalte deine LLM API-Keys. Diese werden sicher gespeichert und für AI-Features verwendet.
          <br/><strong>Hinweis:</strong> OpenCode Zen ist 100% kostenlos und bereits konfiguriert!
        </p>
        
        <div className="api-keys-grid">
          {Object.entries({
            opencode_zen: { name: 'OpenCode Zen', desc: '100% FREE - Bereits aktiv!', free: true },
            gemini: { name: 'Google Gemini', desc: 'Free Tier verfügbar', free: true },
            mistral: { name: 'Mistral AI', desc: 'Free Tier verfügbar', free: true },
            groq: { name: 'Groq', desc: 'Sehr schnell, Free Tier', free: true },
            huggingface: { name: 'HuggingFace', desc: 'Open Source Models', free: true },
            openai: { name: 'OpenAI', desc: 'GPT-4, kostenpflichtig', free: false },
            anthropic: { name: 'Anthropic', desc: 'Claude, kostenpflichtig', free: false }
          }).map(([key, info]) => (
            <div key={key} className={`api-key-card ${info.free ? 'free' : 'paid'}`}>
              <div className="key-header">
                <h4>{info.name}</h4>
                <span className={`badge ${info.free ? 'free' : 'paid'}`}>
                  {info.free ? '✨ FREE' : '💳 Paid'}
                </span>
              </div>
              <p className="key-desc">{info.desc}</p>
              
              {key === 'opencode_zen' ? (
                <div className="key-active">
                  <span>✅ Automatisch aktiv - kein API Key nötig!</span>
                </div>
              ) : (
                <div className="key-input-group">
                  <input
                    type={showKeys[key] ? 'text' : 'password'}
                    placeholder={savedKeys[key] ? '••••••••' : `${info.name} API Key`}
                    value={apiKeys[key] || ''}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                  <button 
                    className="toggle-visibility"
                    onClick={() => toggleShowKey(key)}
                  >
                    {showKeys[key] ? '🙈' : '👁️'}
                  </button>
                  {savedKeys[key] ? (
                    <button className="delete" onClick={() => deleteApiKey(key)}>🗑️</button>
                  ) : (
                    <button 
                      className="save" 
                      onClick={() => saveApiKey(key)}
                      disabled={!apiKeys[key] || apiKeys[key] === '••••••••'}
                    >
                      💾
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h3>🔗 Service Status</h3>
        <div className="service-status">
          <div className={`status-item ${config?.redis?.connected ? 'online' : 'offline'}`}>
            <span>Redis Events</span>
            <span>{config?.redis?.connected ? '🟢 Verbunden' : '🔴 Offline'}</span>
          </div>
        </div>
      </section>

      <style jsx>{`
        .messenger-settings {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        h2 {
          margin-bottom: 30px;
          color: #fff;
        }
        
        .settings-section {
          background: #1a1a2e;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }
        
        .settings-section h3 {
          margin: 0 0 8px 0;
          color: #fff;
        }
        
        .section-desc {
          color: #888;
          margin-bottom: 20px;
        }
        
        .messenger-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }
        
        .messenger-card {
          background: #0f0f1a;
          border-radius: 8px;
          padding: 20px;
          border: 1px solid #333;
        }
        
        .messenger-card.enabled {
          border-color: #4ade80;
        }
        
        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .card-header .icon {
          font-size: 24px;
        }
        
        .card-header h4 {
          flex: 1;
          margin: 0;
          color: #fff;
        }
        
        .status {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
        }
        
        .status.online {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
        }
        
        .status.offline {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        
        .card-body {
          color: #aaa;
        }
        
        .card-body code {
          background: #333;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .qr-section {
          text-align: center;
        }
        
        .qr-code {
          background: #fff;
          padding: 10px;
          border-radius: 8px;
          margin: 16px 0;
          overflow: auto;
        }
        
        .qr-code pre {
          font-size: 8px;
          line-height: 1;
          color: #000;
          margin: 0;
        }
        
        .hint {
          font-size: 12px;
          color: #666;
        }
        
        button {
          background: #3b82f6;
          color: #fff;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          margin-top: 12px;
          transition: all 0.2s;
        }
        
        button:hover {
          background: #2563eb;
        }
        
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        button.success {
          background: #4ade80;
        }
        
        button.error {
          background: #ef4444;
        }
        
        button.danger {
          background: #ef4444;
        }
        
        .button-group {
          display: flex;
          gap: 10px;
        }
        
        .api-keys-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        
        .api-key-card {
          background: #0f0f1a;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid #333;
        }
        
        .api-key-card.free {
          border-color: #4ade80;
        }
        
        .key-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .key-header h4 {
          margin: 0;
          color: #fff;
        }
        
        .badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;
        }
        
        .badge.free {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
        }
        
        .badge.paid {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }
        
        .key-desc {
          color: #666;
          font-size: 13px;
          margin-bottom: 12px;
        }
        
        .key-active {
          background: rgba(74, 222, 128, 0.1);
          padding: 12px;
          border-radius: 6px;
          text-align: center;
          color: #4ade80;
        }
        
        .key-input-group {
          display: flex;
          gap: 8px;
        }
        
        .key-input-group input {
          flex: 1;
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 10px;
          color: #fff;
        }
        
        .key-input-group button {
          margin: 0;
          padding: 10px 12px;
        }
        
        .key-input-group .toggle-visibility {
          background: transparent;
          border: 1px solid #333;
        }
        
        .key-input-group .save {
          background: #4ade80;
        }
        
        .key-input-group .delete {
          background: #ef4444;
        }
        
        .service-status {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .status-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          background: #0f0f1a;
          border-radius: 6px;
          min-width: 200px;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #888;
        }
      `}</style>
    </div>
  );
}

export default MessengerSettings;
