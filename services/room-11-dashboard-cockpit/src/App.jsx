import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import SurveyWorkerPanel from './components/SurveyWorkerPanel';
import EarningsDashboard from './components/EarningsDashboard';
import AIChatPanel from './components/AIChatPanel';
import ProxyManager from './components/ProxyManager';
import MessengerSettings from './components/MessengerSettings';
import OAuthLoginPanel from './components/OAuthLoginPanel';
import './App.css';

function App() {
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    checkApiHealth();
    const interval = setInterval(checkApiHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkApiHealth = async () => {
    try {
      const res = await fetch('http://localhost:8018/health');
      setApiStatus(res.ok ? 'online' : 'offline');
    } catch {
      setApiStatus('offline');
    }
  };

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>SIN-Solver</h1>
          <span className={`api-status ${apiStatus}`}>
            {apiStatus === 'online' ? 'API Online' : apiStatus === 'offline' ? 'API Offline' : 'Checking...'}
          </span>
        </div>
        
        <ul className="nav-links">
          <li>
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">🤖</span>
              Survey Workers
            </NavLink>
          </li>
          <li>
            <NavLink to="/earnings" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">💰</span>
              Earnings
            </NavLink>
          </li>
          <li>
            <NavLink to="/proxies" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">🌐</span>
              Proxies
            </NavLink>
          </li>
          <li>
            <NavLink to="/chat" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">💬</span>
              AI Assistant
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">⚙️</span>
              Settings
            </NavLink>
          </li>
          <li>
            <NavLink to="/oauth" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">🔑</span>
              API Keys
            </NavLink>
          </li>
        </ul>

        <div className="sidebar-footer">
          <p>100% FREE</p>
          <p className="version">v2.1.0</p>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<SurveyWorkerPanel />} />
          <Route path="/earnings" element={<EarningsDashboard />} />
          <Route path="/proxies" element={<ProxyManager />} />
          <Route path="/chat" element={<AIChatPanel />} />
          <Route path="/settings" element={<MessengerSettings />} />
          <Route path="/oauth" element={<OAuthLoginPanel />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
