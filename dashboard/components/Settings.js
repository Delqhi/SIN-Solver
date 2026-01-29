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
  CheckCircle,
  AlertCircle,
  Cpu,
  Settings as SettingsIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    notifications: true,
    autoRefresh: true,
    refreshInterval: 5,
    healthCheckTimeout: 5000,
    showIcons: true,
    compactView: false
  });
  const [saved, setSaved] = useState(false);
  const [dockerStatus, setDockerStatus] = useState('checking');

  useEffect(() => {
    const savedSettings = localStorage.getItem('dashboard-settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      delete parsed.demoMode;
      delete parsed.theme;
      setSettings(parsed);
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
      notifications: true,
      autoRefresh: true,
      refreshInterval: 5,
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
    { id: 'advanced', name: 'Advanced', icon: Cpu },
    { id: 'system', name: 'System Status', icon: Database },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-10">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">System Configuration</h1>
          <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest mt-1">Global Preferences // Node-01</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white border border-white/10 shadow-lg shadow-white/5'
                  : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : 'text-slate-600 group-hover:text-slate-400'} />
              <span className="text-sm font-medium">{tab.name}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-slate-900/30 backdrop-blur-xl border border-white/5 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
            <SettingsIcon size={200} />
          </div>

          {activeTab === 'general' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">General Settings</h2>
                <p className="text-xs text-slate-500 font-mono uppercase tracking-tighter">Core interface behavior</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-slate-200">Theme Engine</p>
                    <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Dark Mode Enforced</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/5 text-[10px] font-mono text-slate-400 flex items-center gap-2">
                    <Moon size={12} />
                    ELITE DARK
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-slate-200">Visual Identifiers</p>
                    <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Show service icons</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, showIcons: !settings.showIcons })}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      settings.showIcons ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${
                      settings.showIcons ? 'left-6' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-slate-200">Density Control</p>
                    <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Compact grid view</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, compactView: !settings.compactView })}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      settings.compactView ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${
                      settings.compactView ? 'left-6' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Telemetry Alarms</h2>
                <p className="text-xs text-slate-500 font-mono uppercase tracking-tighter">System event notifications</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-slate-200">Global Alerts</p>
                    <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Notify on service failure</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      settings.notifications ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${
                      settings.notifications ? 'left-6' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-slate-200">Auto-Sync</p>
                    <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Real-time status polling</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, autoRefresh: !settings.autoRefresh })}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      settings.autoRefresh ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${
                      settings.autoRefresh ? 'left-6' : 'left-1'
                    }`} />
                  </button>
                </div>

                {settings.autoRefresh && (
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-200">Polling Frequency</p>
                        <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Update interval in seconds</p>
                      </div>
                      <span className="text-emerald-400 font-mono text-sm">{settings.refreshInterval}s</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={settings.refreshInterval}
                      onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'advanced' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Advanced Protocols</h2>
                <p className="text-xs text-slate-500 font-mono uppercase tracking-tighter">Low-level system parameters</p>
              </div>
              
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-200">Handshake Timeout</p>
                    <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Max wait for Docker response</p>
                  </div>
                  <span className="text-emerald-400 font-mono text-sm">{settings.healthCheckTimeout}ms</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="500"
                  value={settings.healthCheckTimeout}
                  onChange={(e) => setSettings({ ...settings, healthCheckTimeout: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'system' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Infrastructure Health</h2>
                <p className="text-xs text-slate-500 font-mono uppercase tracking-tighter">Real-time node telemetry</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/40 rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      dockerStatus === 'healthy' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {dockerStatus === 'healthy' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <span className="text-sm font-bold text-slate-200 uppercase tracking-tight">Docker Engine</span>
                  </div>
                  <p className="text-3xl font-mono font-bold text-white uppercase tracking-tighter">{dockerStatus}</p>
                  <p className="text-[10px] text-slate-500 font-mono uppercase mt-2">
                    {dockerStatus === 'healthy' ? 'All systems operational' : 'Connection failure detected'}
                  </p>
                </div>

                <div className="bg-black/40 rounded-2xl p-5 border border-white/5">
                  <div className="flex items-center gap-3 mb-4 text-blue-500">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Server size={20} />
                    </div>
                    <span className="text-sm font-bold text-slate-200 uppercase tracking-tight">Active Nodes</span>
                  </div>
                  <p className="text-3xl font-mono font-bold text-white tracking-tighter">26</p>
                  <p className="text-[10px] text-slate-500 font-mono uppercase mt-2">Distributed Fortress Rooms</p>
                </div>
              </div>

              <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Room Distribution</h3>
                <div className="space-y-3">
                  {[
                    { name: 'AI Agents', count: 4, color: 'bg-purple-500' },
                    { name: 'Infrastructure', count: 7, color: 'bg-blue-500' },
                    { name: 'Task Solvers', count: 2, color: 'bg-emerald-500' },
                    { name: 'Communication', count: 4, color: 'bg-orange-500' },
                    { name: 'Database Cluster', count: 9, color: 'bg-pink-500' }
                  ].map(cat => (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                        <span className="text-slate-500">{cat.name}</span>
                        <span className="text-white">{cat.count}</span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", cat.color)} style={{ width: `${(cat.count / 26) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex gap-3 mt-10 pt-8 border-t border-white/5">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-900/20"
            >
              <Save size={16} />
              {saved ? 'Synchronized' : 'Commit Changes'}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl transition-all font-bold text-xs uppercase tracking-widest border border-white/5"
            >
              <RefreshCw size={16} />
              Reset Protocol
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
