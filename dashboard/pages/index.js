import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Plus, Search, PanelLeft, Home as HomeIcon, MessageSquare, X, Terminal, Box, Activity, RefreshCw, Play, Pause, Eye } from 'lucide-react';
import FooterTerminal from '../components/FooterTerminal';
import AIChat from '../components/AIChat';
import Documentation from './docs';
import WorkerMissionControl from '../components/WorkerMissionControl';
import WorkflowBuilder from '../components/WorkflowBuilder';
import LiveMissionView from '../components/LiveMissionView';

// Backend API URL - uses codeserver-api health endpoint as fallback for development
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_CODESERVER_API_URL || 'http://localhost:8041';

const ROOMS_CONFIG = [
  { id: 'overview', name: 'Overview', icon: HomeIcon },
  { id: 'mission-control', name: 'Worker Missions', icon: Plus },
  { id: 'workflow-builder', name: 'Workflow Architect', icon: Plus },
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

  const fetchStatus = async () => {
    try {
      const resHealth = await fetch(`${API_URL}/health`);
      if (resHealth.ok) {
        const healthData = await resHealth.json();
        if (healthData.status === 'healthy') {
          setDockerStatus('Healthy');
          setRoomStatus([{
            id: '04.1',
            name: healthData.service || 'CodeServer API',
            status: 'UP',
            ip: API_URL
          }]);
        }
      }
    } catch (e) {
      console.error('Status fetch failed', e);
      setDockerStatus('Offline');
    }
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
            <div className="p-8 max-w-6xl">
              <h1 className="text-3xl font-bold mb-8">Empire State.</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roomStatus.map(s => (
                  <div key={s.id} className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-500">NODE {s.id}</span>
                      <div className={`w-2 h-2 rounded-full ${s.status === 'UP' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-red-500'}`}></div>
                    </div>
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="text-sm text-orange-500 mt-2">{s.ip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeRoomId === 'mission-control' && <WorkerMissionControl isAutoWorkActive={isAutoWorkActive} />}
          {activeRoomId === 'workflow-builder' && <WorkflowBuilder />}
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
            <Box size={12} color={dockerStatus === 'Healthy' ? '#10b981' : '#ef4444'} />
            Fleet: {dockerStatus}
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
