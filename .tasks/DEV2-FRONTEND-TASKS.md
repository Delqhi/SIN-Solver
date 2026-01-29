# 👨‍💻 DEVELOPER 2 (PARALLEL) - FRONTEND TASKS

**Assigned:** Developer 2
**Focus:** Dashboard, UI Components, Platform Selectors
**Start:** 2026-01-27

---

## 🎯 QUICK START GUIDE

### 1. Setup Environment
```bash
cd /Users/jeremy/dev/Delqhi-Platform

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Start infrastructure
docker-compose up -d zimmer-speicher-redis zimmer-archiv-postgres zimmer-05-steel-tarnkappe

# Start dashboard dev server
cd services/zimmer-11-dashboard
npm install
npm run dev
```

### 2. Key Files
```
services/zimmer-11-dashboard/
├── src/
│   ├── components/     # YOUR WORK HERE
│   ├── pages/
│   ├── hooks/
│   └── api/
├── package.json
└── Dockerfile
```

### 3. API Endpoints (Zimmer-18 Survey Worker)
```
Base URL: http://localhost:8018 (dev) or http://zimmer-18-survey-worker:8018 (docker)

GET  /health                    - Health check
GET  /platforms                 - List all platforms
GET  /platforms/:id/status      - Platform status
POST /platforms/:id/start       - Start worker
POST /platforms/:id/stop        - Stop worker
POST /platforms/:id/config      - Update config
GET  /cookies/:platformId       - Cookie status
POST /cookies/:platformId/import - Import cookies
GET  /proxies                   - Proxy list
POST /proxies                   - Add proxy
POST /chat                      - AI chat
GET  /stats                     - Global stats
GET  /earnings                  - Earnings report
```

---

## 🔴 PHASE 1: CRITICAL (DO NOW)

### ✅ TASK C1: Survey Worker Control Panel
**Status:** COMPLETED (2026-01-27)
**File:** `services/zimmer-11-dashboard/src/components/SurveyWorkerPanel.jsx`
**Effort:** 2 hours

**Component Structure:**
```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_SURVEY_API || 'http://localhost:8018';

const SurveyWorkerPanel = () => {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlatforms();
    const interval = setInterval(fetchPlatforms, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchPlatforms = async () => {
    try {
      const response = await axios.get(`${API_URL}/platforms`);
      setPlatforms(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const startWorker = async (platformId) => {
    try {
      await axios.post(`${API_URL}/platforms/${platformId}/start`);
      fetchPlatforms();
    } catch (err) {
      alert(`Failed to start: ${err.response?.data?.error || err.message}`);
    }
  };

  const stopWorker = async (platformId) => {
    try {
      await axios.post(`${API_URL}/platforms/${platformId}/stop`);
      fetchPlatforms();
    } catch (err) {
      alert(`Failed to stop: ${err.response?.data?.error || err.message}`);
    }
  };

  const togglePlatform = async (platformId, enabled) => {
    try {
      await axios.post(`${API_URL}/platforms/${platformId}/config`, { enabled });
      fetchPlatforms();
    } catch (err) {
      alert(`Failed to toggle: ${err.message}`);
    }
  };

  if (loading) return <div className="loading">Loading platforms...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="survey-worker-panel">
      <h2>🤖 Survey Worker Control</h2>
      
      <div className="stats-bar">
        <StatCard title="Active Workers" value={platforms.filter(p => p.status === 'running').length} />
        <StatCard title="Today's Earnings" value="€0.00" />
        <StatCard title="Surveys Completed" value="0" />
      </div>

      <div className="platform-grid">
        {platforms.map(platform => (
          <PlatformCard 
            key={platform.id}
            platform={platform}
            onStart={() => startWorker(platform.id)}
            onStop={() => stopWorker(platform.id)}
            onToggle={(enabled) => togglePlatform(platform.id, enabled)}
          />
        ))}
      </div>
    </div>
  );
};

const PlatformCard = ({ platform, onStart, onStop, onToggle }) => {
  const statusColors = {
    running: 'bg-green-500',
    stopped: 'bg-gray-400',
    error: 'bg-red-500',
    cooldown: 'bg-yellow-500'
  };

  return (
    <div className={`platform-card ${platform.enabled ? '' : 'opacity-50'}`}>
      <div className="card-header">
        <h3>{platform.name}</h3>
        <span className={`status-badge ${statusColors[platform.status] || 'bg-gray-400'}`}>
          {platform.status || 'stopped'}
        </span>
      </div>
      
      <div className="card-body">
        <div className="info-row">
          <span>Currency:</span>
          <span>{platform.currency}</span>
        </div>
        <div className="info-row">
          <span>Risk Level:</span>
          <span className={`risk-${platform.riskLevel}`}>{platform.riskLevel}</span>
        </div>
        <div className="info-row">
          <span>Cookies:</span>
          <span>{platform.hasCredentials ? '✅ Configured' : '❌ Missing'}</span>
        </div>
        <div className="info-row">
          <span>Proxy:</span>
          <span>{platform.proxy || 'Direct'}</span>
        </div>
      </div>

      <div className="card-actions">
        <label className="toggle">
          <input 
            type="checkbox" 
            checked={platform.enabled} 
            onChange={(e) => onToggle(e.target.checked)}
          />
          <span>Enabled</span>
        </label>
        
        {platform.status === 'running' ? (
          <button className="btn-stop" onClick={onStop}>Stop</button>
        ) : (
          <button 
            className="btn-start" 
            onClick={onStart}
            disabled={!platform.enabled || !platform.hasCredentials}
          >
            Start
          </button>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className="stat-card">
    <div className="stat-value">{value}</div>
    <div className="stat-title">{title}</div>
  </div>
);

export default SurveyWorkerPanel;
```

**CSS (add to styles):**
```css
.survey-worker-panel {
  padding: 20px;
}

.stats-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
}

.platform-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.platform-card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f7f7f7;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  color: white;
  font-size: 0.8rem;
}

.card-body {
  padding: 15px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}

.card-actions {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  background: #f7f7f7;
}

.btn-start {
  background: #10b981;
  color: white;
  padding: 8px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.btn-stop {
  background: #ef4444;
  color: white;
  padding: 8px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.btn-start:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

**Acceptance Criteria:**
- [ ] Shows all 8 platforms
- [ ] Enable/disable toggle works
- [ ] Start/Stop buttons work
- [ ] Status updates in real-time (polling)
- [ ] Shows cookie/proxy status
- [ ] Responsive grid layout

---

## 🟠 PHASE 2: HIGH PRIORITY

### ✅ TASK C2: Cookie Import Modal
**Status:** COMPLETED (2026-01-27)
**File:** `services/zimmer-11-dashboard/src/components/CookieImportModal.jsx`
**Effort:** 1 hour

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_SURVEY_API || 'http://localhost:8018';

const CookieImportModal = ({ platformId, platformName, onClose, onSuccess }) => {
  const [cookieText, setCookieText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('paste'); // 'paste' or 'upload'

  const handlePasteImport = async () => {
    setLoading(true);
    setError(null);

    try {
      // Parse cookies (supports JSON array or Netscape format)
      let cookies;
      try {
        cookies = JSON.parse(cookieText);
      } catch {
        // Try Netscape format
        cookies = parseNetscapeCookies(cookieText);
      }

      if (!Array.isArray(cookies) || cookies.length === 0) {
        throw new Error('No valid cookies found');
      }

      const response = await axios.post(`${API_URL}/cookies/${platformId}/import`, {
        cookies
      });

      if (response.data.success) {
        onSuccess(response.data.imported);
        onClose();
      } else {
        throw new Error(response.data.error);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    setCookieText(text);
  };

  const parseNetscapeCookies = (text) => {
    const lines = text.split('\n').filter(l => l && !l.startsWith('#'));
    return lines.map(line => {
      const [domain, , path, secure, expires, name, value] = line.split('\t');
      return { domain, path, secure: secure === 'TRUE', name, value, expires: parseInt(expires) };
    }).filter(c => c.name && c.value);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🍪 Import Cookies for {platformName}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="mode-tabs">
            <button 
              className={mode === 'paste' ? 'active' : ''} 
              onClick={() => setMode('paste')}
            >
              Paste Cookies
            </button>
            <button 
              className={mode === 'upload' ? 'active' : ''} 
              onClick={() => setMode('upload')}
            >
              Upload File
            </button>
          </div>

          {mode === 'paste' && (
            <textarea
              value={cookieText}
              onChange={(e) => setCookieText(e.target.value)}
              placeholder="Paste cookies here (JSON array or Netscape format)..."
              rows={10}
            />
          )}

          {mode === 'upload' && (
            <div className="file-upload">
              <input 
                type="file" 
                accept=".txt,.json" 
                onChange={handleFileUpload}
              />
              <p>Upload cookies.txt or cookies.json</p>
            </div>
          )}

          <div className="help-text">
            <h4>How to export cookies:</h4>
            <ol>
              <li>Install "Cookie-Editor" browser extension</li>
              <li>Login to {platformName} in your browser</li>
              <li>Click Cookie-Editor → Export → JSON</li>
              <li>Paste here or save as file</li>
            </ol>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button 
            className="btn-import" 
            onClick={handlePasteImport}
            disabled={loading || !cookieText.trim()}
          >
            {loading ? 'Importing...' : 'Import Cookies'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieImportModal;
```

**Acceptance Criteria:**
- [ ] Paste cookies (JSON format)
- [ ] Upload cookies.txt file
- [ ] Netscape format parsing
- [ ] Validation before import
- [ ] Success/Error feedback
- [ ] Instructions for users

---

### ✅ TASK C3: Earnings Dashboard
**Status:** COMPLETED (2026-01-27)
**File:** `services/zimmer-11-dashboard/src/components/EarningsDashboard.jsx`
**Effort:** 1.5 hours

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const API_URL = process.env.REACT_APP_SURVEY_API || 'http://localhost:8018';

const EarningsDashboard = () => {
  const [earnings, setEarnings] = useState(null);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, [period]);

  const fetchEarnings = async () => {
    try {
      const response = await axios.get(`${API_URL}/earnings?period=${period}`);
      setEarnings(response.data);
    } catch (err) {
      console.error('Failed to fetch earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c43'];

  if (loading) return <div>Loading earnings...</div>;

  return (
    <div className="earnings-dashboard">
      <div className="dashboard-header">
        <h2>💰 Earnings Dashboard</h2>
        <div className="period-selector">
          <button className={period === 'day' ? 'active' : ''} onClick={() => setPeriod('day')}>Today</button>
          <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>This Week</button>
          <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>This Month</button>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card total">
          <div className="card-icon">💵</div>
          <div className="card-content">
            <div className="card-value">€{earnings?.total?.toFixed(2) || '0.00'}</div>
            <div className="card-label">Total Earnings</div>
          </div>
        </div>
        <div className="summary-card surveys">
          <div className="card-icon">📋</div>
          <div className="card-content">
            <div className="card-value">{earnings?.surveysCompleted || 0}</div>
            <div className="card-label">Surveys Completed</div>
          </div>
        </div>
        <div className="summary-card average">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-value">
              €{earnings?.surveysCompleted > 0 
                ? (earnings.total / earnings.surveysCompleted).toFixed(2) 
                : '0.00'}
            </div>
            <div className="card-label">Avg per Survey</div>
          </div>
        </div>
        <div className="summary-card projected">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <div className="card-value">€{((earnings?.total || 0) * 30).toFixed(2)}</div>
            <div className="card-label">Projected Monthly</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Earnings Over Time</h3>
          <LineChart width={500} height={300} data={earnings?.timeline || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="earnings" stroke="#8884d8" />
          </LineChart>
        </div>

        <div className="chart-container">
          <h3>Earnings by Platform</h3>
          <PieChart width={400} height={300}>
            <Pie
              data={earnings?.perPlatform || []}
              cx={200}
              cy={150}
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              dataKey="earnings"
              nameKey="platform"
              label
            >
              {(earnings?.perPlatform || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      </div>

      <div className="platform-breakdown">
        <h3>Platform Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Platform</th>
              <th>Surveys</th>
              <th>Earnings</th>
              <th>Avg/Survey</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(earnings?.perPlatform || []).map(p => (
              <tr key={p.platform}>
                <td>{p.platform}</td>
                <td>{p.surveys || 0}</td>
                <td>€{p.earnings?.toFixed(2) || '0.00'}</td>
                <td>€{p.surveys > 0 ? (p.earnings / p.surveys).toFixed(2) : '0.00'}</td>
                <td><span className={`status ${p.status}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="export-btn" onClick={() => exportToCSV(earnings)}>
        📥 Export to CSV
      </button>
    </div>
  );
};

const exportToCSV = (earnings) => {
  const rows = [
    ['Platform', 'Surveys', 'Earnings', 'Status'],
    ...(earnings?.perPlatform || []).map(p => [
      p.platform, p.surveys, p.earnings, p.status
    ])
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `earnings-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
};

export default EarningsDashboard;
```

**Dependencies to install:**
```bash
npm install recharts
```

**Acceptance Criteria:**
- [ ] Total earnings display
- [ ] Per-platform breakdown
- [ ] Line chart for time series
- [ ] Pie chart for distribution
- [ ] Daily/Weekly/Monthly toggle
- [ ] Export to CSV

---

### ✅ TASK C4: AI Chat Interface
**Status:** COMPLETED (2026-01-27)
**File:** `services/zimmer-11-dashboard/src/components/AIChatPanel.jsx`
**Effort:** 1 hour

```jsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_SURVEY_API || 'http://localhost:8018';

const AIChatPanel = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hallo! Ich bin der SIN-Survey Assistant. Wie kann ich dir helfen?', provider: 'system' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: input,
        context: {
          // Could include active platforms, current earnings, etc.
        }
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        provider: response.data.provider
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Fehler: ${err.message}`,
        provider: 'error'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: '🔧 Troubleshoot', prompt: 'Hilf mir bei einem Problem mit meinen Survey-Workern' },
    { label: '📈 Optimize', prompt: 'Wie kann ich meine Earnings optimieren?' },
    { label: '🍪 Cookie Help', prompt: 'Wie importiere ich Cookies für eine Plattform?' },
    { label: '🔒 Ban Prevention', prompt: 'Wie vermeide ich Bans auf Survey-Plattformen?' }
  ];

  return (
    <div className="ai-chat-panel">
      <div className="chat-header">
        <h3>🤖 AI Survey Assistant</h3>
        <span className="provider-badge">FREE AI Only</span>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
            {msg.provider && msg.role === 'assistant' && (
              <div className="message-provider">via {msg.provider}</div>
            )}
          </div>
        ))}
        {loading && (
          <div className="message assistant loading">
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="quick-actions">
        {quickActions.map((action, idx) => (
          <button 
            key={idx} 
            onClick={() => { setInput(action.prompt); sendMessage(); }}
            disabled={loading}
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Frage den AI Assistant..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          Senden
        </button>
      </div>
    </div>
  );
};

export default AIChatPanel;
```

**Acceptance Criteria:**
- [ ] Chat interface with message history
- [ ] Shows which FREE provider answered
- [ ] Quick action buttons
- [ ] Loading indicator
- [ ] German language support

---

## 🟡 PHASE 3: PLATFORM SELECTORS

### ⬜ TASK D1-D8: Platform Selector Files
**Status:** TODO
**Directory:** `services/zimmer-18-survey-worker/src/platform-handlers/`
**Effort:** 30-45 min each

Developer 2 can help with these if time permits. See DEV1-BACKEND-TASKS.md for the pattern.

**Platforms to implement:**
- D1: swagbucks.js (45 min)
- D2: prolific.js (45 min)
- D3: mturk.js (45 min)
- D4: clickworker.js (30 min)
- D5: appen.js (30 min)
- D6: toluna.js (30 min)
- D7: lifepoints.js (30 min)
- D8: yougov.js (30 min)

---

## 🟢 PHASE 4: POLISH

### ✅ TASK E1: Proxy Management Panel
**Status:** COMPLETED (2026-01-27)
**File:** `services/zimmer-11-dashboard/src/components/ProxyManager.jsx`
**Effort:** 1.5 hours

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_SURVEY_API || 'http://localhost:8018';

const ProxyManager = () => {
  const [proxies, setProxies] = useState([]);
  const [newProxy, setNewProxy] = useState('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);

  useEffect(() => {
    fetchProxies();
  }, []);

  const fetchProxies = async () => {
    try {
      const response = await axios.get(`${API_URL}/proxies`);
      setProxies(response.data);
    } catch (err) {
      console.error('Failed to fetch proxies:', err);
    } finally {
      setLoading(false);
    }
  };

  const addProxy = async () => {
    if (!newProxy.trim()) return;
    
    try {
      await axios.post(`${API_URL}/proxies`, { url: newProxy });
      setNewProxy('');
      fetchProxies();
    } catch (err) {
      alert(`Failed to add proxy: ${err.message}`);
    }
  };

  const removeProxy = async (proxyId) => {
    try {
      await axios.delete(`${API_URL}/proxies/${proxyId}`);
      fetchProxies();
    } catch (err) {
      alert(`Failed to remove proxy: ${err.message}`);
    }
  };

  const testProxy = async (proxyId) => {
    setTesting(proxyId);
    try {
      const response = await axios.post(`${API_URL}/proxies/${proxyId}/test`);
      alert(`Proxy test: ${response.data.success ? '✅ Working' : '❌ Failed'} (${response.data.latency}ms)`);
    } catch (err) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setTesting(null);
    }
  };

  const assignToPlatform = async (proxyId, platformId) => {
    try {
      await axios.post(`${API_URL}/proxies/${proxyId}/assign`, { platformId });
      fetchProxies();
    } catch (err) {
      alert(`Failed to assign: ${err.message}`);
    }
  };

  return (
    <div className="proxy-manager">
      <h2>🌐 Proxy Management</h2>

      <div className="add-proxy">
        <input
          type="text"
          value={newProxy}
          onChange={(e) => setNewProxy(e.target.value)}
          placeholder="http://user:pass@host:port"
        />
        <button onClick={addProxy}>Add Proxy</button>
      </div>

      <div className="proxy-list">
        {proxies.map(proxy => (
          <div key={proxy.id} className={`proxy-card ${proxy.status}`}>
            <div className="proxy-url">{proxy.url}</div>
            <div className="proxy-info">
              <span>Status: {proxy.status}</span>
              <span>Assigned: {proxy.assignedTo || 'None'}</span>
              <span>Requests: {proxy.requestCount}</span>
            </div>
            <div className="proxy-actions">
              <button onClick={() => testProxy(proxy.id)} disabled={testing === proxy.id}>
                {testing === proxy.id ? 'Testing...' : 'Test'}
              </button>
              <select onChange={(e) => assignToPlatform(proxy.id, e.target.value)}>
                <option value="">Assign to...</option>
                <option value="swagbucks">Swagbucks</option>
                <option value="prolific">Prolific</option>
                <option value="mturk">MTurk</option>
                <option value="clickworker">Clickworker</option>
                <option value="appen">Appen</option>
                <option value="toluna">Toluna</option>
                <option value="lifepoints">LifePoints</option>
                <option value="yougov">YouGov</option>
              </select>
              <button className="btn-remove" onClick={() => removeProxy(proxy.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      <div className="proxy-help">
        <h4>Free Proxy Options:</h4>
        <ul>
          <li>🆓 <a href="https://www.webshare.io/" target="_blank" rel="noopener noreferrer">Webshare.io</a> - 10 free static proxies</li>
          <li>🆓 <a href="https://proxyscrape.com/" target="_blank" rel="noopener noreferrer">ProxyScrape</a> - 1000 scraped proxies/day</li>
          <li>💰 Hetzner VPS - €3.50/month per IP (recommended)</li>
        </ul>
      </div>
    </div>
  );
};

export default ProxyManager;
```

**Acceptance Criteria:**
- [ ] Add/Remove proxies
- [ ] Test proxy health
- [ ] Assign to platform
- [ ] Status indicators
- [ ] Usage stats

---

## 📊 PROGRESS TRACKING

| Task | Status | Started | Completed |
|------|--------|---------|-----------|
| C1 | ✅ DONE | 2026-01-27 | 2026-01-27 |
| C2 | ✅ DONE | 2026-01-27 | 2026-01-27 |
| C3 | ✅ DONE | 2026-01-27 | 2026-01-27 |
| C4 | ✅ DONE | 2026-01-27 | 2026-01-27 |
| D1-D8 | ✅ DONE (DEV1) | 2026-01-27 | 2026-01-27 |
| E1 | ✅ DONE | 2026-01-27 | 2026-01-27 |

---

## 📁 COMPLETED FILE STRUCTURE

```
services/zimmer-11-dashboard/
├── package.json              # React + Vite + axios + recharts + react-router-dom
├── vite.config.js            # Vite config with proxy to :8018
├── index.html                # Entry HTML
├── dist/                     # Built assets (vite build)
├── node_modules/             # Installed dependencies
└── src/
    ├── main.jsx              # React entry point
    ├── App.jsx               # Main app with routing
    ├── App.css               # Global styles (dark theme)
    ├── index.css             # Base styles
    ├── components/
    │   ├── SurveyWorkerPanel.jsx    # C1: Platform control cards
    │   ├── CookieImportModal.jsx    # C2: Cookie import modal
    │   ├── EarningsDashboard.jsx    # C3: Earnings charts (Recharts)
    │   ├── AIChatPanel.jsx          # C4: AI chat interface
    │   └── ProxyManager.jsx         # E1: Proxy management
    └── api/
        └── surveyApi.js             # API client for :8018
```

## 🚀 TESTING COMMANDS

```bash
cd /Users/jeremy/dev/Delqhi-Platform/services/zimmer-11-dashboard

# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

---

## 📞 SYNC WITH DEV1

**Coordinate on:**
1. API endpoint schemas (ensure frontend matches backend)
2. WebSocket for real-time updates (optional Phase 2)
3. Error handling patterns
4. Authentication (if needed)

**Communication:**
- Update this file when tasks complete
- If blocked, check DEV1-BACKEND-TASKS.md for dependencies
- Test against running backend: `docker-compose up zimmer-18-survey-worker`
