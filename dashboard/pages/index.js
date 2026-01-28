import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Plus, Search, PanelLeft, Home as HomeIcon, MessageSquare, X, Terminal, Box, Activity, RefreshCw, Play, Pause, Eye, Shield, Settings as SettingsIcon } from 'lucide-react';
import FooterTerminal from '../components/FooterTerminal';
import AIChat from '../components/AIChat';
import Documentation from './docs';
import WorkerMissionControl from '../components/WorkerMissionControl';
import WorkflowBuilder from '../components/WorkflowBuilder';
import LiveMissionView from '../components/LiveMissionView';
import Settings from '../components/Settings';

// Backend API URL - uses codeserver-api health endpoint as fallback for development
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_CODESERVER_API_URL || 'http://localhost:8041';

// Demo mode - DISABLED by default per MANDATE 0.1 (NO MOCKS IN PRODUCTION)
// Only enable for local development when backend is unavailable
const DEMO_MODE_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Fallback service configuration - only used when DEMO_MODE_ENABLED is true
const FALLBACK_SERVICES = [
    // AI Agents (4)
    { id: '01', name: 'n8n Orchestrator', status: 'UP', ip: 'localhost:5678', icon: '⚙️', category: 'AI Agents' },
    { id: '02', name: 'Agent Zero', status: 'UP', ip: 'localhost:8050', icon: '🤖', category: 'AI Agents' },
    { id: '03', name: 'Steel Browser', status: 'UP', ip: 'localhost:3005', icon: '🌐', category: 'AI Agents' },
    { id: '04', name: 'Skyvern Solver', status: 'UP', ip: 'localhost:8030', icon: '👁️', category: 'AI Agents' },
    // Infrastructure (7)
    { id: '05', name: 'PostgreSQL', status: 'UP', ip: 'localhost:5432', icon: '🐘', category: 'Infrastructure' },
    { id: '06', name: 'Redis Cache', status: 'UP', ip: 'localhost:6379', icon: '⚡', category: 'Infrastructure' },
    { id: '07', name: 'Vault', status: 'UP', ip: 'localhost:8200', icon: '🔐', category: 'Infrastructure' },
    { id: '08', name: 'NocoDB', status: 'UP', ip: 'localhost:8090', icon: '📊', category: 'Infrastructure' },
    { id: '09', name: 'Video Gen', status: 'UP', ip: 'localhost:8205', icon: '🎬', category: 'Infrastructure' },
    { id: '10', name: 'MCP Plugins', status: 'UP', ip: 'localhost:8040', icon: '🔌', category: 'Infrastructure' },
    { id: '11', name: 'Supabase', status: 'UP', ip: 'localhost:54323', icon: '📦', category: 'Infrastructure' },
    // Task Solvers (2)
    { id: '12', name: 'Captcha Worker', status: 'UP', ip: 'localhost:8019', icon: '🧩', category: 'Task Solvers' },
    { id: '13', name: 'Survey Worker', status: 'UP', ip: 'localhost:8018', icon: '📝', category: 'Task Solvers' },
    // Communication (4)
    { id: '14', name: 'RocketChat', status: 'UP', ip: 'localhost:3009', icon: '💬', category: 'Communication' },
    { id: '15', name: 'MongoDB', status: 'UP', ip: 'localhost:27017', icon: '🍃', category: 'Communication' },
    { id: '16', name: 'Chat MCP', status: 'UP', ip: 'localhost:8119', icon: '🤖', category: 'Communication' },
    { id: '17', name: 'Hoppscotch', status: 'UP', ip: 'localhost:3024', icon: '🧪', category: 'Communication' },
    // Delqhi Database (6)
    { id: '18', name: 'Delqhi DB', status: 'UP', ip: 'localhost:5412', icon: '🗄️', category: 'Delqhi DB' },
    { id: '19', name: 'Auth API', status: 'UP', ip: 'localhost:9999', icon: '🔑', category: 'Delqhi DB' },
    { id: '20', name: 'REST API', status: 'UP', ip: 'localhost:3112', icon: '🔌', category: 'Delqhi DB' },
    { id: '21', name: 'Realtime', status: 'UP', ip: 'localhost:4012', icon: '⚡', category: 'Delqhi DB' },
    { id: '22', name: 'Storage', status: 'UP', ip: 'localhost:5012', icon: '📁', category: 'Delqhi DB' },
    { id: '23', name: 'Studio', status: 'UP', ip: 'localhost:3012', icon: '🎨', category: 'Delqhi DB' },
    // Delqhi Network (4)
    { id: '24', name: 'Delqhi API', status: 'UP', ip: 'localhost:8130', icon: '🔌', category: 'Delqhi Net' },
    { id: '25', name: 'Delqhi Web', status: 'UP', ip: 'localhost:3130', icon: '🌐', category: 'Delqhi Net' },
    { id: '26', name: 'Delqhi MCP', status: 'UP', ip: 'localhost:8213', icon: '🤖', category: 'Delqhi Net' },
    { id: '27', name: 'Meilisearch', status: 'UP', ip: 'localhost:7700', icon: '🔍', category: 'Delqhi Net' },
    // Dashboard
    { id: '28', name: 'Dashboard', status: 'UP', ip: 'localhost:3011', icon: '📊', category: 'Dashboard' }
];

const ROOMS_CONFIG = [
  { id: 'overview', name: 'Overview', icon: HomeIcon },
  { id: 'mission-control', name: 'Worker Missions', icon: Plus },
  { id: 'workflow-builder', name: 'Workflow Architect', icon: Plus },
  { id: 'vault', name: 'Vault Secrets', icon: Shield, href: '/vault' },
  { id: 'settings', name: 'Settings', icon: SettingsIcon },
];

export default function SINSolverCockpit() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState('overview');
  const [roomStatus, setRoomStatus] = useState([]);
  const [resources, setResources] = useState(null);
  const [isAutoWorkActive, setIsAutoWorkActive] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [dockerStatus, setDockerStatus] = useState('Checking...');
  const [mounted, setMounted] = useState(false);
  const [isLiveMissionOpen, setIsLiveMissionOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fetchStatus = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const resServices = await fetch('/api/services', { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (resServices.ok) {
        const data = await resServices.json();
        setDockerStatus('Healthy');
        setIsDemoMode(false);
        
        const mappedServices = data.services.map((s, idx) => ({
          id: (idx + 1).toString().padStart(2, '0'),
          name: s.name,
          status: s.status === 'healthy' ? 'UP' : 'DOWN',
          ip: `localhost:${s.port}`,
          icon: s.icon,
          category: s.category
        }));
        
        setRoomStatus(mappedServices);
        
        if (data.summary) {
          setResources({
            cpu_usage: Math.round((data.summary.healthy / data.summary.total) * 100),
            memory_usage: data.summary.total,
            estimated_capacity: data.summary.healthy
          });
        }
        return;
      }
      activateDemoMode();
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('Services API unavailable, activating demo mode');
      }
      activateDemoMode();
    }
  };

  const activateDemoMode = () => {
    if (!DEMO_MODE_ENABLED) {
      // MANDATE 0.1: No fake data in production - show real offline state
      setDockerStatus('Offline');
      setRoomStatus([]);
      setResources(null);
      return;
    }
    // Demo mode only active when explicitly enabled via env var
    setIsDemoMode(true);
    setDockerStatus('Demo');
    setRoomStatus(FALLBACK_SERVICES);
    setResources({
      cpu_usage: 0,
      memory_usage: 0,
      estimated_capacity: 0
    });
  };

  const toggleAutoWork = async () => {
    const newState = !isAutoWorkActive;
    try {
      await fetch(`${API_URL}/system/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_work_enabled: newState })
      });
      setIsAutoWorkActive(newState);
    } catch (e) {
      console.error('Failed to toggle auto-work', e);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchStatus();
    const itv = setInterval(fetchStatus, 5000);
    return () => clearInterval(itv);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-inter">
      <Head>
        <title>SIN-SOLVER COCKPIT | EMPIRE STATE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body { margin: 0; background: #000; font-family: Inter, system-ui, sans-serif; }
          * { box-sizing: border-box; }
        `}</style>
      </Head>

      {/* Left Sidebar */}
      <aside className={`bg-slate-950 border-r border-slate-800 transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-60' : 'w-16'}`}>
        {/* Logo */}
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4">
          {isSidebarOpen && <span className="font-bold text-sm text-orange-500">SIN-SOLVER</span>}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 transition-colors"
          >
            <PanelLeft size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {isSidebarOpen && <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">COMMAND ROOMS</div>}
          {ROOMS_CONFIG.map(room => (
            room.href ? (
              <Link
                key={room.id}
                href={room.href}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-slate-400 hover:bg-slate-800/50`}
              >
                {<room.icon size={18} />}
                {isSidebarOpen && <span>{room.name}</span>}
              </Link>
            ) : (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  activeRoomId === room.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                {<room.icon size={18} />}
                {isSidebarOpen && <span>{room.name}</span>}
              </button>
            )
          ))}
        </nav>

        {/* Start Fleet Button */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={toggleAutoWork}
            className={`w-full h-10 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              isAutoWorkActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {isAutoWorkActive ? <Pause size={14} /> : <Play size={14} />}
            {isSidebarOpen && (isAutoWorkActive ? 'PAUSE FLEET' : 'START FLEET')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden pb-10">
        {/* Header */}
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="text-orange-500">⚡</div>
            <h2 className="text-sm font-semibold">{activeRoomId === 'overview' ? 'Empire State' : ROOMS_CONFIG.find(r => r.id === activeRoomId)?.name || activeRoomId}</h2>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {resources && (
              <>
                <span className="text-slate-400">CPU: <b className="text-slate-200">{resources.cpu_usage}%</b></span>
                <span className="text-slate-400">RAM: <b className="text-slate-200">{resources.memory_usage}%</b></span>
                <span className="text-slate-400">CAPACITY: <b className="text-emerald-400">{resources.estimated_capacity} Units</b></span>
              </>
            )}
            <div className="bg-orange-500/10 text-orange-500 px-2 py-1 rounded text-xs font-bold">EMPIRE 10.3</div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-black to-slate-950">
          {activeRoomId === 'overview' && (
            <div className="p-8 max-w-7xl">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Empire State</h1>
                <p className="text-slate-400">
                  {roomStatus.length > 0 ? (
                    <>
                      <span className="text-emerald-400 font-bold">{roomStatus.filter(s => s.status === 'UP').length}</span> of {roomStatus.length} services healthy
                      {isDemoMode && <span className="text-amber-500 ml-2">(Demo Mode)</span>}
                    </>
                  ) : (
                    'Loading services...'
                  )}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {roomStatus.map(s => (
                  <div key={s.id} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-slate-600 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-2xl">{s.icon || '🔹'}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        s.status === 'UP' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {s.status === 'UP' ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm mb-1 truncate">{s.name}</h3>
                    <p className="text-xs text-slate-500 mb-2">{s.category}</p>
                    <p className="text-xs text-orange-500/80 font-mono">{s.ip}</p>
                  </div>
                ))}
              </div>
              
              {roomStatus.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-800">
                  <h2 className="text-lg font-semibold mb-4 text-slate-300">Category Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from(new Set(roomStatus.map(s => s.category))).map(category => {
                      const catServices = roomStatus.filter(s => s.category === category);
                      const healthyCount = catServices.filter(s => s.status === 'UP').length;
                      return (
                        <div key={category} className="bg-slate-900/30 border border-slate-800 rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">{category}</p>
                          <p className="text-lg font-bold">
                            <span className="text-emerald-400">{healthyCount}</span>
                            <span className="text-slate-600">/{catServices.length}</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeRoomId === 'mission-control' && <WorkerMissionControl isAutoWorkActive={isAutoWorkActive} />}
          {activeRoomId === 'workflow-builder' && <WorkflowBuilder />}
          {activeRoomId === 'settings' && <Settings />}
        </div>
      </main>

      {/* AI Chat Sidebar */}
      <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} apiUrl={API_URL} />

      {/* Chat Toggle Button in Header (if chat is not open) */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed top-4 right-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-3 shadow-lg hover:shadow-emerald-500/50 transition-all z-40"
          title="Open AI Chat"
        >
          <MessageSquare size={20} />
        </button>
      )}

       {/* Footer Status Bar */}
       <div className="fixed bottom-0 left-0 right-0 h-10 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between px-6 text-xs text-slate-400 z-30">
         <div className="flex items-center gap-6">
           <button
             onClick={() => setIsLiveMissionOpen(!isLiveMissionOpen)}
             className="flex items-center gap-2 cursor-pointer hover:text-slate-200 transition-colors"
           >
             <Eye size={12} />
             Live Missions
           </button>
           <button
             onClick={() => setIsTerminalOpen(!isTerminalOpen)}
             className="flex items-center gap-2 cursor-pointer hover:text-slate-200 transition-colors"
           >
             <Terminal size={12} />
             Terminal
           </button>
          <div className="flex items-center gap-2">
            <Box size={12} color={dockerStatus === 'Healthy' ? '#10b981' : dockerStatus === 'Demo' ? '#f59e0b' : '#ef4444'} />
            Fleet: {dockerStatus}
            {isDemoMode && <span className="text-amber-500 text-[10px] px-1.5 py-0.5 bg-amber-500/10 rounded ml-1">DEMO</span>}
          </div>
        </div>
        <span>Orchestrator v2.0</span>
      </div>

       {/* Terminal */}
       <FooterTerminal isOpen={isTerminalOpen} onToggle={() => setIsTerminalOpen(!isTerminalOpen)} />
       <LiveMissionView isOpen={isLiveMissionOpen} onClose={() => setIsLiveMissionOpen(false)} />
    </div>
  );
}
