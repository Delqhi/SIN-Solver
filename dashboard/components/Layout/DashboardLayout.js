import React from 'react';
import Head from 'next/head';
import Sidebar from './Sidebar';
import { Eye, Terminal, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AIChat from '../AIChat';
import FooterTerminal from '../FooterTerminal';
import LiveMissionView from '../LiveMissionView';

export default function DashboardLayout({ 
  children,
  activeRoomId,
  setActiveRoomId,
  services,
  isAutoWorkActive,
  toggleAutoWork,
  dockerStatus,
  isDemoMode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = React.useState(false);
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [isLiveMissionOpen, setIsLiveMissionOpen] = React.useState(false);

  const activeService = services.find(s => s.containerId === activeRoomId);
  const title = activeService ? activeService.name : (activeRoomId === 'overview' ? 'Empire State' : activeRoomId);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      <Head>
        <title>SIN-COCKPIT | {title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
        <header className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-slate-900/40 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
             <span className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">room-01 // {activeRoomId}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
             <div className={`w-1.5 h-1.5 rounded-full ${dockerStatus === 'Healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'} animate-pulse`} />
             <span className="text-slate-400 uppercase tracking-wider">{dockerStatus}</span>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative bg-black">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRoomId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full overflow-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="h-8 bg-black border-t border-white/5 flex items-center justify-between px-4 text-[10px] font-mono text-slate-500 z-20 shrink-0">
          <div className="flex items-center gap-4">
             <button onClick={() => setIsLiveMissionOpen(!isLiveMissionOpen)} className="hover:text-emerald-400 flex items-center gap-1 transition-colors uppercase tracking-tighter">
               <Eye size={12} /> Live Missions
             </button>
             <button onClick={() => setIsTerminalOpen(!isTerminalOpen)} className="hover:text-orange-400 flex items-center gap-1 transition-colors uppercase tracking-tighter">
               <Terminal size={12} /> Terminal
             </button>
          </div>
          <div className="uppercase tracking-tighter">SIN-COCKPIT V2.0.26 | SYSTEM: {isDemoMode ? 'SIMULATION' : 'ONLINE'}</div>
        </div>
      </main>

      <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8041'} />
      <FooterTerminal isOpen={isTerminalOpen} onToggle={() => setIsTerminalOpen(!isTerminalOpen)} />
      <LiveMissionView isOpen={isLiveMissionOpen} onClose={() => setIsLiveMissionOpen(false)} />

      <AnimatePresence>
        {!isChatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-12 right-6 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-full p-3 shadow-lg shadow-emerald-900/20 z-50 backdrop-blur-md border border-white/10"
          >
            <MessageSquare size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
