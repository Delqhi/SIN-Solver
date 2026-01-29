import React from 'react';
import { Home, Plus, Settings, Shield, Box, Terminal, MessageSquare, Play, Pause, ExternalLink, LayoutGrid, FileText, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar({ 
  isOpen, 
  setIsOpen, 
  activeRoomId, 
  setActiveRoomId, 
  services = [],
  isAutoWorkActive,
  toggleAutoWork 
}) {
  const STATIC_ITEMS = [
    { id: 'overview', name: 'Empire State', icon: Home, category: 'Main' },
    { id: 'mission-control', name: 'Mission Control', icon: Box, category: 'Main' },
    { id: 'workflow-builder', name: 'Workflow Architect', icon: Plus, category: 'Main' },
    { id: 'docs', name: 'Knowledge Base', icon: FileText, category: 'Main' },
  ];

  const groupedServices = services.reduce((acc, service) => {
    const cat = service.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});

  return (
    <aside className={`
      bg-black border-r border-white/5 transition-all duration-500 flex flex-col relative z-30 
      ${isOpen ? 'w-64' : 'w-16'} 
      md:relative fixed h-full
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 shrink-0 bg-slate-900/20 backdrop-blur-md">
        {isOpen && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-bold text-[10px] text-orange-500 tracking-[0.2em] uppercase"
          >
            Sin-Cockpit
          </motion.span>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-1.5 hover:bg-white/5 rounded-lg text-slate-400 transition-all hover:text-white"
          aria-label="Close Sidebar"
        >
          <X size={18} />
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="hidden md:block p-1.5 hover:bg-white/5 rounded-lg text-slate-400 transition-all hover:text-white"
          aria-label={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <LayoutGrid size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-6 scrollbar-none">
        <div className="space-y-1">
          {STATIC_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveRoomId(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all whitespace-nowrap group ${
                activeRoomId === item.id
                  ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]'
                  : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <item.icon size={18} className={activeRoomId === item.id ? 'text-orange-500' : 'text-slate-500 group-hover:text-slate-300'} />
              {isOpen && <span className="font-medium tracking-tight">{item.name}</span>}
            </button>
          ))}
        </div>

        {Object.entries(groupedServices).map(([category, items]) => (
          <div key={category} className="space-y-2">
            {isOpen && (
              <div className="px-3 py-1 text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em]">
                {category}
              </div>
            )}
            <div className="space-y-1">
              {items.map(service => (
                <button
                  key={service.id || service.containerId}
                  onClick={() => setActiveRoomId(service.containerId)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all whitespace-nowrap group ${
                    activeRoomId === service.containerId
                      ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                      : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                  }`}
                >
                  <span className="text-lg filter grayscale group-hover:grayscale-0 transition-all">{service.icon || '📦'}</span>
                  {isOpen && (
                    <div className="flex-1 flex justify-between items-center overflow-hidden">
                      <span className="truncate mr-2 font-medium tracking-tight">{service.name}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${service.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="space-y-1 mt-4 border-t border-white/5 pt-4">
          <button
            onClick={() => setActiveRoomId('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all whitespace-nowrap ${
              activeRoomId === 'settings'
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
            }`}
          >
            <Settings size={18} />
            {isOpen && <span className="font-medium tracking-tight">Settings</span>}
          </button>
        </div>
      </nav>

      <div className="p-4 border-t border-white/5 shrink-0 bg-slate-900/10 backdrop-blur-md">
        <button
          onClick={toggleAutoWork}
          className={`w-full h-10 rounded-xl font-bold text-[10px] transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${
            isAutoWorkActive
              ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5'
          }`}
        >
          {isAutoWorkActive ? <Pause size={14} /> : <Play size={14} />}
          {isOpen && (isAutoWorkActive ? 'Pause Fleet' : 'Start Fleet')}
        </button>
      </div>
    </aside>
  );
}
