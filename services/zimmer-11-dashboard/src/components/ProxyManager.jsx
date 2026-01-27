import React, { useState, useEffect } from 'react';
import { surveyApi } from '../api/surveyApi';

const PLATFORMS = [
  { id: 'swagbucks', name: 'Swagbucks' },
  { id: 'prolific', name: 'Prolific' },
  { id: 'mturk', name: 'Amazon MTurk' },
  { id: 'clickworker', name: 'Clickworker' },
  { id: 'appen', name: 'Appen' },
  { id: 'toluna', name: 'Toluna' },
  { id: 'lifepoints', name: 'LifePoints' },
  { id: 'yougov', name: 'YouGov' }
];

function ProxyManager() {
  const [proxies, setProxies] = useState([]);
  const [newProxy, setNewProxy] = useState('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProxies();
  }, []);

  const fetchProxies = async () => {
    try {
      const data = await surveyApi.getProxies();
      setProxies(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setProxies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProxy = async () => {
    if (!newProxy.trim()) return;

    try {
      await surveyApi.addProxy(newProxy);
      setNewProxy('');
      fetchProxies();
    } catch (err) {
      alert(`Failed to add proxy: ${err.message}`);
    }
  };

  const handleRemoveProxy = async (proxyId) => {
    if (!confirm('Remove this proxy?')) return;

    try {
      await surveyApi.removeProxy(proxyId);
      fetchProxies();
    } catch (err) {
      alert(`Failed to remove proxy: ${err.message}`);
    }
  };

  const handleTestProxy = async (proxyId) => {
    setTesting(proxyId);
    try {
      const result = await surveyApi.testProxy(proxyId);
      alert(`Proxy test: ${result.success ? '✅ Working' : '❌ Failed'} (${result.latency || 0}ms)`);
    } catch (err) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setTesting(null);
    }
  };

  const handleAssignProxy = async (proxyId, platformId) => {
    if (!platformId) return;

    try {
      await surveyApi.assignProxy(proxyId, platformId);
      fetchProxies();
    } catch (err) {
      alert(`Failed to assign: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading proxies...</div>;
  }

  return (
    <div className="proxy-manager">
      <div className="page-header">
        <h2>🌐 Proxy Management</h2>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '24px',
        background: 'var(--bg-secondary)',
        padding: '20px',
        borderRadius: '12px'
      }}>
        <input
          type="text"
          value={newProxy}
          onChange={(e) => setNewProxy(e.target.value)}
          placeholder="http://user:pass@host:port"
          onKeyPress={(e) => e.key === 'Enter' && handleAddProxy()}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={handleAddProxy}>
          Add Proxy
        </button>
      </div>

      <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
        {proxies.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            background: 'var(--bg-secondary)', 
            borderRadius: '12px',
            color: 'var(--text-secondary)'
          }}>
            No proxies configured. Add one above!
          </div>
        ) : (
          proxies.map((proxy) => (
            <div 
              key={proxy.id} 
              style={{ 
                background: 'var(--bg-secondary)', 
                padding: '16px', 
                borderRadius: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '16px',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontFamily: 'monospace', marginBottom: '8px' }}>
                  {proxy.url}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <span>Status: <span className={`status-badge ${proxy.status || 'stopped'}`}>{proxy.status || 'unknown'}</span></span>
                  <span>Assigned: {proxy.assignedTo || 'None'}</span>
                  <span>Requests: {proxy.requestCount || 0}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleTestProxy(proxy.id)}
                  disabled={testing === proxy.id}
                >
                  {testing === proxy.id ? 'Testing...' : 'Test'}
                </button>

                <select
                  onChange={(e) => handleAssignProxy(proxy.id, e.target.value)}
                  value=""
                  style={{ padding: '8px 12px' }}
                >
                  <option value="">Assign to...</option>
                  {PLATFORMS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <button
                  className="btn btn-danger"
                  onClick={() => handleRemoveProxy(proxy.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ 
        background: 'var(--bg-secondary)', 
        padding: '20px', 
        borderRadius: '12px' 
      }}>
        <h3 style={{ marginBottom: '16px' }}>💡 Free Proxy Options</h3>
        <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li style={{ marginBottom: '8px' }}>
            🆓 <a href="https://www.webshare.io/" target="_blank" rel="noopener noreferrer">Webshare.io</a> - 10 free static proxies
          </li>
          <li style={{ marginBottom: '8px' }}>
            🆓 <a href="https://proxyscrape.com/" target="_blank" rel="noopener noreferrer">ProxyScrape</a> - 1000 scraped proxies/day
          </li>
          <li style={{ marginBottom: '8px' }}>
            💰 Hetzner VPS - €3.50/month per IP (recommended for reliability)
          </li>
        </ul>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Tip: Use different proxies for each platform to avoid detection.
        </p>
      </div>
    </div>
  );
}

export default ProxyManager;
