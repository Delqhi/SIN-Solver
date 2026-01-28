import React, { useState, useEffect } from 'react';
import { 
  Save, 
  RefreshCw, 
  Bell, 
  Shield, 
  Database, 
  Server, 
  Globe, 
  Moon,
  Sun,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    theme: 'dark',
    notifications: true,
    autoRefresh: true,
    refreshInterval: 5,
    demoMode: true,
    healthCheckTimeout: 5000,
    showIcons: true,
    compactView: false
  });
  const [saved, setSaved] = useState(false);
  const [dockerStatus, setDockerStatus] = useState('checking');

  useEffect(() => {
    const savedSettings = localStorage.getItem('dashboard-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    checkDockerStatus();
  }, []);

  const checkDockerStatus = async () => {
    try {
      const res = await fetch('/api/services');
      if (res.ok) {
        setDockerStatus('healthy');
      } else {
        setDockerStatus('unhealthy');
      }
    } catch (e) {
      setDockerStatus('offline');
    }
  };

  const handleSave = () => {
    localStorage.setItem('dashboard-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaults = {
      theme: 'dark',
      notifications: true,
      autoRefresh: true,
      refreshInterval: 5,
      demoMode: true,
      healthCheckTimeout: 5000,
      showIcons: true,
      compactView: false
    };
    setSettings(defaults);
    localStorage.setItem('dashboard-settings', JSON.stringify(defaults));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Globe },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'advanced', name: 'Advanced', icon: Server },
    { id: 'system', name: 'System Status', icon: Database },
  ];

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-slate-400">Configure your dashboard preferences and system options</p>
      </div>

      <div className="flex gap-6">
        <div className="w-64 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <tab.icon size={18} />
              <span className="font-medium">{tab.name}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">General Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <div>
                    <p className="font-medium">Theme</p>
                    <p className="text-sm text-slate-500">Choose your preferred color scheme</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSettings({ ...settings, theme: 'dark' })}
                      className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                        settings.theme === 'dark' 
                          ? 'bg-slate-700 text-white' 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <Moon size={16} />
                      Dark
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, theme: 'light' })}
                      className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                        settings.theme === 'light' 
                          ? 'bg-slate-700 text-white' 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <Sun size={16} />
                      Light
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <div>
                    <p className="font-medium">Show Service Icons</p>
                    <p className="text-sm text-slate-500">Display emoji icons for each service</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, showIcons: !settings.showIcons })}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      settings.showIcons ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      settings.showIcons ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <div>
                    <p className="font-medium">Compact View</p>
                    <p className="text-sm text-slate-500">Show more services per row</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, compactView: !settings.compactView })}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      settings.compactView ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      settings.compactView ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <div>
                    <p className="font-medium">Enable Notifications</p>
                    <p className="text-sm text-slate-500">Get alerts when services go down</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      settings.notifications ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      settings.notifications ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <div>
                    <p className="font-medium">Auto-Refresh</p>
                    <p className="text-sm text-slate-500">Automatically refresh service status</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, autoRefresh: !settings.autoRefresh })}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      settings.autoRefresh ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      settings.autoRefresh ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                {settings.autoRefresh && (
                  <div className="py-3 border-b border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">Refresh Interval</p>
                      <span className="text-emerald-400 font-mono">{settings.refreshInterval}s</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={settings.refreshInterval}
                      onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <p className="text-sm text-slate-500 mt-1">How often to check service status</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Advanced Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <div>
                    <p className="font-medium">Demo Mode</p>
                    <p className="text-sm text-slate-500">Show demo data when API is unavailable</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, demoMode: !settings.demoMode })}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      settings.demoMode ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      settings.demoMode ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div className="py-3 border-b border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">Health Check Timeout</p>
                      <p className="text-sm text-slate-500">Maximum wait time for service response</p>
                    </div>
                    <span className="text-emerald-400 font-mono">{settings.healthCheckTimeout}ms</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="10000"
                    step="500"
                    value={settings.healthCheckTimeout}
                    onChange={(e) => setSettings({ ...settings, healthCheckTimeout: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">System Status</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    {dockerStatus === 'healthy' ? (
                      <CheckCircle size={20} className="text-emerald-400" />
                    ) : dockerStatus === 'checking' ? (
                      <RefreshCw size={20} className="text-amber-400 animate-spin" />
                    ) : (
                      <AlertCircle size={20} className="text-red-400" />
                    )}
                    <span className="font-medium">Docker Status</span>
                  </div>
                  <p className="text-2xl font-bold capitalize">{dockerStatus}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {dockerStatus === 'healthy' 
                      ? 'All systems operational' 
                      : dockerStatus === 'checking'
                      ? 'Checking service health...'
                      : 'Services may be unavailable'}
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Server size={20} className="text-blue-400" />
                    <span className="font-medium">Total Services</span>
                  </div>
                  <p className="text-2xl font-bold">28</p>
                  <p className="text-sm text-slate-500 mt-1">Across 6 categories</p>
                </div>
              </div>

              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                <h3 className="font-medium mb-3">Service Categories</h3>
                <div className="space-y-2">
                  {[
                    { name: 'AI Agents', count: 4 },
                    { name: 'Infrastructure', count: 7 },
                    { name: 'Task Solvers', count: 2 },
                    { name: 'Communication', count: 4 },
                    { name: 'Delqhi DB', count: 6 },
                    { name: 'Delqhi Net', count: 4 },
                    { name: 'Dashboard', count: 1 }
                  ].map(cat => (
                    <div key={cat.name} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                      <span className="text-slate-400">{cat.name}</span>
                      <span className="text-emerald-400 font-mono">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-8 pt-6 border-t border-slate-800">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all font-medium"
            >
              <Save size={18} />
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all font-medium"
            >
              <RefreshCw size={18} />
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}