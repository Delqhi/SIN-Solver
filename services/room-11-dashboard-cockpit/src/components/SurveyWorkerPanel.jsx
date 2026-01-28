import React, { useState, useEffect } from 'react';
import { surveyApi } from '../api/surveyApi';
import CookieImportModal from './CookieImportModal';

const PLATFORMS = [
  { id: 'swagbucks', name: 'Swagbucks', currency: 'SB', riskLevel: 'medium' },
  { id: 'prolific', name: 'Prolific', currency: 'GBP', riskLevel: 'low' },
  { id: 'mturk', name: 'Amazon MTurk', currency: 'USD', riskLevel: 'medium' },
  { id: 'clickworker', name: 'Clickworker', currency: 'EUR', riskLevel: 'low' },
  { id: 'appen', name: 'Appen', currency: 'USD', riskLevel: 'low' },
  { id: 'toluna', name: 'Toluna', currency: 'Points', riskLevel: 'medium' },
  { id: 'lifepoints', name: 'LifePoints', currency: 'Points', riskLevel: 'medium' },
  { id: 'yougov', name: 'YouGov', currency: 'Points', riskLevel: 'low' }
];

function SurveyWorkerPanel() {
  const [platforms, setPlatforms] = useState(
    PLATFORMS.map(p => ({ ...p, status: 'stopped', enabled: false, hasCredentials: false, proxy: null }))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ activeWorkers: 0, todayEarnings: 0, surveysCompleted: 0 });
  const [cookieModal, setCookieModal] = useState(null);

  useEffect(() => {
    fetchPlatforms();
    const interval = setInterval(fetchPlatforms, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlatforms = async () => {
    try {
      const data = await surveyApi.getPlatforms();
      if (Array.isArray(data)) {
        setPlatforms(prev => prev.map(p => {
          const remote = data.find(d => d.id === p.id);
          return remote ? { ...p, ...remote } : p;
        }));
      }
      
      const statsData = await surveyApi.getStats().catch(() => null);
      if (statsData) {
        setStats({
          activeWorkers: statsData.activeWorkers || 0,
          todayEarnings: statsData.todayEarnings || 0,
          surveysCompleted: statsData.surveysCompleted || 0
        });
      }
      
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleStart = async (platformId) => {
    try {
      await surveyApi.startPlatform(platformId);
      fetchPlatforms();
    } catch (err) {
      alert(`Failed to start: ${err.message}`);
    }
  };

  const handleStop = async (platformId) => {
    try {
      await surveyApi.stopPlatform(platformId);
      fetchPlatforms();
    } catch (err) {
      alert(`Failed to stop: ${err.message}`);
    }
  };

  const handleToggle = async (platformId, enabled) => {
    try {
      await surveyApi.updatePlatformConfig(platformId, { enabled });
      fetchPlatforms();
    } catch (err) {
      alert(`Failed to toggle: ${err.message}`);
    }
  };

  const handleCookieSuccess = (count) => {
    alert(`Successfully imported ${count} cookies!`);
    setCookieModal(null);
    fetchPlatforms();
  };

  if (loading) {
    return <div className="loading">Loading platforms...</div>;
  }

  return (
    <div className="survey-worker-panel">
      <div className="page-header">
        <h2>🤖 Survey Workers</h2>
        {error && <span className="error-message">{error}</span>}
      </div>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{stats.activeWorkers}</div>
          <div className="stat-label">Active Workers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">€{stats.todayEarnings.toFixed(2)}</div>
          <div className="stat-label">Today's Earnings</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.surveysCompleted}</div>
          <div className="stat-label">Surveys Completed</div>
        </div>
      </div>

      <div className="platform-grid">
        {platforms.map(platform => (
          <div key={platform.id} className={`platform-card ${!platform.enabled ? 'disabled' : ''}`}>
            <div className="card-header">
              <h3>{platform.name}</h3>
              <span className={`status-badge ${platform.status}`}>
                {platform.status}
              </span>
            </div>

            <div className="card-body">
              <div className="info-row">
                <span className="label">Currency</span>
                <span>{platform.currency}</span>
              </div>
              <div className="info-row">
                <span className="label">Risk Level</span>
                <span className={`risk-${platform.riskLevel}`}>{platform.riskLevel}</span>
              </div>
              <div className="info-row">
                <span className="label">Cookies</span>
                <span>
                  {platform.hasCredentials ? (
                    <span style={{ color: 'var(--accent-green)' }}>✓ Configured</span>
                  ) : (
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => setCookieModal(platform)}
                    >
                      Import
                    </button>
                  )}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Proxy</span>
                <span>{platform.proxy || 'Direct'}</span>
              </div>
            </div>

            <div className="card-actions">
              <label className="toggle-container">
                <div className="toggle">
                  <input
                    type="checkbox"
                    checked={platform.enabled}
                    onChange={(e) => handleToggle(platform.id, e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </div>
                <span style={{ fontSize: '0.875rem' }}>Enabled</span>
              </label>

              {platform.status === 'running' ? (
                <button className="btn btn-danger" onClick={() => handleStop(platform.id)}>
                  Stop
                </button>
              ) : (
                <button
                  className="btn btn-success"
                  onClick={() => handleStart(platform.id)}
                  disabled={!platform.enabled || !platform.hasCredentials}
                >
                  Start
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {cookieModal && (
        <CookieImportModal
          platformId={cookieModal.id}
          platformName={cookieModal.name}
          onClose={() => setCookieModal(null)}
          onSuccess={handleCookieSuccess}
        />
      )}
    </div>
  );
}

export default SurveyWorkerPanel;
