import React from 'react';
import Head from 'next/head';
import Sidebar from './Sidebar';
import { 
  Eye, 
  Terminal, 
  MessageSquare,
  Zap,
  Activity,
  Cpu,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AIChat from '../AIChat';
import FooterTerminal from '../FooterTerminal';
import LiveMissionView from '../LiveMissionView';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function DashboardLayout({ 
  children,
  activeRoomId,
  setActiveRoomId,
  services,
  isAutoWorkActive = false,
  toggleAutoWork,
  dockerStatus = 'Unknown',
  isDemoMode = false
}) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = React.useState(false);
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [isLiveMissionOpen, setIsLiveMissionOpen] = React.useState(false);

  const activeService = services.find(s => s.containerId === activeRoomId);
  const title = activeService 
    ? activeService.name 
    : (activeRoomId === 'overview' ? 'Empire State' : activeRoomId);

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const totalCount = services.length;

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      <Head>
        <title>SIN-COCKPIT | {title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
      </Head>

      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        activeRoomId={activeRoomId}
        setActiveRoomId={setActiveRoomId}
        services={services}
        isAutoWorkActive={isAutoWorkActive}
        toggleAutoWork={toggleAutoWork}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Glassmorphism Header */}
        <header className="h-14 glass-card-strong border-b border-white/5 flex items-center justify-between px-4 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-orange-500" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                room-01
              </span>
              <span className="text-slate-700">//</span>
              <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider">
                {activeRoomId}
              </span>
            </div>

            <div className="h-4 w-px bg-white/10" />

            <div className="flex items-center gap-2 text-[10px] font-mono">
              <Cpu size={12} className="text-slate-600" />
              <span className="text-slate-500">{healthyCount}/{totalCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                dockerStatus === 'Healthy' 
                  ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                  : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
              )} />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider hidden sm:block">
                {dockerStatus}
              </span>
            </div>

            <div className="h-4 w-px bg-white/10" />

            <div className="flex items-center gap-2 text-[10px] font-mono">
              <Clock size={12} className="text-slate-600" />
              <span className="text-slate-500 hidden sm:block">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative bg-black">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRoomId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full overflow-auto scrollbar-hide"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Glassmorphism Footer */}
        <div className="h-10 glass-card border-t border-white/5 flex items-center justify-between px-4 text-[10px] font-mono z-20 shrink-0">
          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsLiveMissionOpen(!isLiveMissionOpen)} 
              className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-400 transition-colors uppercase tracking-tighter"
            >
              <Eye size={12} />
              <span className="hidden sm:inline">Live Missions</span>
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsTerminalOpen(!isTerminalOpen)} 
              className="flex items-center gap-1.5 text-slate-500 hover:text-orange-400 transition-colors uppercase tracking-tighter"
            >
              <Terminal size={12} />
              <span className="hidden sm:inline">Terminal</span>
            </motion.button>

            <div className="h-4 w-px bg-white/10" />

            <div className="flex items-center gap-1.5 text-slate-600">
              <Activity size={10} />
              <span>{isDemoMode ? 'SIMULATION' : 'ONLINE'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-600 uppercase tracking-tighter hidden sm:inline">
              SIN-COCKPIT V2.0.26
            </span>
            
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-500">2026</span>
            </div>
          </div>
        </div>
      </main>

      <AIChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8041'} 
      />
      
      <FooterTerminal 
        isOpen={isTerminalOpen} 
        onToggle={() => setIsTerminalOpen(!isTerminalOpen)} 
      />
      
      <LiveMissionView 
        isOpen={isLiveMissionOpen} 
        onClose={() => setIsLiveMissionOpen(false)} 
      />

      <AnimatePresence>
        {!isChatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-14 right-6 bg-gradient-to-br from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white rounded-full p-3 shadow-lg shadow-orange-900/30 z-50 backdrop-blur-md border border-white/10"
          >
            <MessageSquare size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
