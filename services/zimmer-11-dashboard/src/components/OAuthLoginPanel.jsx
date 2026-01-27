import React, { useState, useEffect } from 'react';

const CLAWDBOT_URL = import.meta.env.VITE_CLAWDBOT_URL || 'http://localhost:8080';
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3000';

const OAUTH_PROVIDERS = {
  google: {
    name: 'Google / Gemini',
    icon: '🔷',
    color: '#4285f4',
    scopes: ['openid', 'email', 'profile'],
    apiKeyAuto: true,
    free: true,
    description: 'Ein Klick → Login → Gemini API Key automatisch!'
  },
  mistral: {
    name: 'Mistral AI',
    icon: '🌀',
    color: '#ff6b35',
    scopes: ['read', 'write'],
    apiKeyAuto: true,
    free: true,
    description: 'Kostenlose AI mit OAuth Login'
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    color: '#24292e',
    scopes: ['read:user', 'user:email'],
    apiKeyAuto: false,
    free: true,
    description: 'Für Code-Integration & Copilot'
  },
  discord: {
    name: 'Discord',
    icon: '🎮',
    color: '#5865f2',
    scopes: ['identify', 'guilds'],
    apiKeyAuto: false,
    free: true,
    description: 'Bot-Verbindung & Notifications'
  },
  huggingface: {
    name: 'HuggingFace',
    icon: '🤗',
    color: '#ffcc00',
    scopes: ['read-repos', 'inference-api'],
    apiKeyAuto: true,
    free: true,
    description: 'Open Source AI Models'
  }
};

function OAuthLoginPanel() {
  const [connectedAccounts, setConnectedAccounts] = useState({});
  const [loading, setLoading] = useState({});
  const [multiAccounts, setMultiAccounts] = useState({});
  const [showAddAccount, setShowAddAccount] = useState(null);
  const [provisioningStatus, setProvisioningStatus] = useState({});

  useEffect(() => {
    fetchConnectedAccounts();
    handleOAuthCallback();
  }, []);

  const fetchConnectedAccounts = async () => {
    try {
      const res = await fetch(`${CLAWDBOT_URL}/api/oauth/accounts`);
      if (res.ok) {
        const data = await res.json();
        setConnectedAccounts(data.accounts || {});
        setMultiAccounts(data.multiAccounts || {});
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const handleOAuthCallback = () => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get('oauth_provider');
    const success = params.get('oauth_success');
    const error = params.get('oauth_error');

    if (provider) {
      if (success === 'true') {
        setProvisioningStatus(prev => ({
          ...prev,
          [provider]: { status: 'success', message: 'Verbunden & API Key provisioniert!' }
        }));
        fetchConnectedAccounts();
      } else if (error) {
        setProvisioningStatus(prev => ({
          ...prev,
          [provider]: { status: 'error', message: decodeURIComponent(error) }
        }));
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const initiateOAuth = async (provider) => {
    setLoading(prev => ({ ...prev, [provider]: true }));
    
    try {
      const res = await fetch(`${CLAWDBOT_URL}/api/oauth/init/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          redirectUri: `${DASHBOARD_URL}/settings?oauth_provider=${provider}`,
          addAccount: showAddAccount === provider
        })
      });
      
      const data = await res.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error || 'OAuth init failed');
      }
    } catch (error) {
      console.error(`OAuth ${provider} failed:`, error);
      setProvisioningStatus(prev => ({
        ...prev,
        [provider]: { status: 'error', message: error.message }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [provider]: false }));
    }
  };

  const disconnectAccount = async (provider, accountId = null) => {
    if (!confirm(`${provider} wirklich trennen?`)) return;
    
    try {
      await fetch(`${CLAWDBOT_URL}/api/oauth/disconnect/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });
      fetchConnectedAccounts();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const switchAccount = async (provider, accountId) => {
    try {
      await fetch(`${CLAWDBOT_URL}/api/oauth/switch/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });
      fetchConnectedAccounts();
    } catch (error) {
      console.error('Switch failed:', error);
    }
  };

  const renderAccountCard = (providerId, provider) => {
    const account = connectedAccounts[providerId];
    const accounts = multiAccounts[providerId] || [];
    const isConnected = !!account;
    const status = provisioningStatus[providerId];
    const isLoading = loading[providerId];

    return (
      <div 
        key={providerId} 
        className={`oauth-card ${isConnected ? 'connected' : ''}`}
        style={{ '--accent-color': provider.color }}
      >
        <div className="card-header">
          <span className="provider-icon">{provider.icon}</span>
          <div className="provider-info">
            <h4>{provider.name}</h4>
            <span className="provider-desc">{provider.description}</span>
          </div>
          <div className="badges">
            {provider.free && <span className="badge free">✨ FREE</span>}
            {provider.apiKeyAuto && <span className="badge auto">🔑 Auto-Key</span>}
          </div>
        </div>

        <div className="card-body">
          {status && (
            <div className={`status-message ${status.status}`}>
              {status.status === 'success' ? '✅' : '❌'} {status.message}
            </div>
          )}

          {isConnected ? (
            <div className="connected-account">
              <div className="account-info">
                {account.avatar && <img src={account.avatar} alt="" className="avatar" />}
                <div>
                  <span className="account-name">{account.name || account.email}</span>
                  <span className="account-email">{account.email}</span>
                  {provider.apiKeyAuto && account.apiKeyActive && (
                    <span className="api-key-status">🔑 API Key aktiv</span>
                  )}
                </div>
              </div>

              {accounts.length > 1 && (
                <div className="multi-accounts">
                  <span className="accounts-label">Weitere Accounts ({accounts.length - 1}):</span>
                  <div className="accounts-list">
                    {accounts.filter(a => a.id !== account.id).map(acc => (
                      <button 
                        key={acc.id} 
                        className="account-chip"
                        onClick={() => switchAccount(providerId, acc.id)}
                      >
                        {acc.name || acc.email}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="account-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowAddAccount(showAddAccount === providerId ? null : providerId)}
                >
                  ➕ Account hinzufügen
                </button>
                <button 
                  className="btn-danger"
                  onClick={() => disconnectAccount(providerId, account.id)}
                >
                  🔌 Trennen
                </button>
              </div>

              {showAddAccount === providerId && (
                <div className="add-account-section">
                  <p>Weiteren {provider.name} Account verbinden:</p>
                  <button 
                    className="btn-primary"
                    onClick={() => initiateOAuth(providerId)}
                    disabled={isLoading}
                  >
                    {isLoading ? '⏳ Laden...' : `🔗 Neuen ${provider.name} Account verbinden`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="not-connected">
              <p>Noch nicht verbunden</p>
              <button 
                className="btn-oauth"
                onClick={() => initiateOAuth(providerId)}
                disabled={isLoading}
                style={{ backgroundColor: provider.color }}
              >
                {isLoading ? (
                  '⏳ Verbinde...'
                ) : (
                  <>
                    {provider.icon} Mit {provider.name} verbinden
                    {provider.apiKeyAuto && ' → Auto API Key'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="oauth-panel">
      <div className="panel-header">
        <h2>🔐 One-Click Login & API Keys</h2>
        <p>
          Verbinde deine Accounts mit einem Klick. API Keys werden <strong>automatisch</strong> generiert und eingetragen!
        </p>
      </div>

      <div className="oauth-grid">
        {Object.entries(OAUTH_PROVIDERS).map(([id, provider]) => 
          renderAccountCard(id, provider)
        )}
      </div>

      <div className="panel-info">
        <div className="info-card">
          <h4>🚀 So funktioniert's</h4>
          <ol>
            <li>Klicke auf "Verbinden"</li>
            <li>Logge dich beim Anbieter ein</li>
            <li>API Key wird automatisch erstellt & gespeichert</li>
            <li>Sofort in allen SIN-Solver Features verfügbar!</li>
          </ol>
        </div>
        <div className="info-card">
          <h4>💡 Multi-Account Support</h4>
          <p>
            Verbinde mehrere Accounts pro Anbieter. Perfekt für verschiedene Projekte 
            oder Geschäft/Privat Trennung.
          </p>
        </div>
        <div className="info-card highlight">
          <h4>✨ 100% KOSTENLOS</h4>
          <p>
            Alle unterstützten Anbieter haben kostenlose Tiers. 
            SIN-Solver nutzt nur FREE APIs!
          </p>
        </div>
      </div>

      <style jsx>{`
        .oauth-panel {
          padding: 24px;
        }

        .panel-header {
          margin-bottom: 32px;
        }

        .panel-header h2 {
          margin: 0 0 8px 0;
          color: #fff;
          font-size: 24px;
        }

        .panel-header p {
          color: #888;
          margin: 0;
        }

        .oauth-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .oauth-card {
          background: #1a1a2e;
          border-radius: 12px;
          padding: 20px;
          border: 2px solid #333;
          transition: all 0.3s ease;
        }

        .oauth-card:hover {
          border-color: var(--accent-color);
          box-shadow: 0 0 20px rgba(var(--accent-color), 0.1);
        }

        .oauth-card.connected {
          border-color: #4ade80;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .provider-icon {
          font-size: 32px;
        }

        .provider-info {
          flex: 1;
        }

        .provider-info h4 {
          margin: 0;
          color: #fff;
          font-size: 18px;
        }

        .provider-desc {
          font-size: 12px;
          color: #666;
        }

        .badges {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .badge {
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .badge.free {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
        }

        .badge.auto {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }

        .status-message {
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 12px;
          font-size: 13px;
        }

        .status-message.success {
          background: rgba(74, 222, 128, 0.1);
          color: #4ade80;
          border: 1px solid #4ade80;
        }

        .status-message.error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid #ef4444;
        }

        .connected-account {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .account-info {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #0f0f1a;
          padding: 12px;
          border-radius: 8px;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
        }

        .account-name {
          display: block;
          color: #fff;
          font-weight: 500;
        }

        .account-email {
          display: block;
          color: #666;
          font-size: 12px;
        }

        .api-key-status {
          display: inline-block;
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 4px;
        }

        .multi-accounts {
          background: #0f0f1a;
          padding: 10px;
          border-radius: 6px;
        }

        .accounts-label {
          font-size: 12px;
          color: #666;
          display: block;
          margin-bottom: 8px;
        }

        .accounts-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .account-chip {
          background: #333;
          border: none;
          color: #fff;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          cursor: pointer;
        }

        .account-chip:hover {
          background: var(--accent-color);
        }

        .account-actions {
          display: flex;
          gap: 10px;
        }

        .not-connected {
          text-align: center;
          padding: 20px 0;
        }

        .not-connected p {
          color: #666;
          margin-bottom: 16px;
        }

        .btn-oauth {
          width: 100%;
          padding: 14px 20px;
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-oauth:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .btn-oauth:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-primary {
          background: #3b82f6;
          color: #fff;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
        }

        .btn-secondary {
          background: transparent;
          color: #3b82f6;
          border: 1px solid #3b82f6;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .btn-danger {
          background: transparent;
          color: #ef4444;
          border: 1px solid #ef4444;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .add-account-section {
          background: #0f0f1a;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }

        .add-account-section p {
          color: #888;
          margin-bottom: 12px;
        }

        .panel-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .info-card {
          background: #1a1a2e;
          padding: 20px;
          border-radius: 8px;
        }

        .info-card.highlight {
          background: linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(59, 130, 246, 0.1));
          border: 1px solid #4ade80;
        }

        .info-card h4 {
          margin: 0 0 12px 0;
          color: #fff;
        }

        .info-card ol {
          margin: 0;
          padding-left: 20px;
          color: #888;
        }

        .info-card li {
          margin-bottom: 6px;
        }

        .info-card p {
          margin: 0;
          color: #888;
        }
      `}</style>
    </div>
  );
}

export default OAuthLoginPanel;
