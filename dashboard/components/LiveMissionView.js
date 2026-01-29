import React, { useState, useEffect, useRef } from 'react';
import { Eye, ExternalLink, X, Maximize, MonitorPlay, RefreshCw, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

import { API_URL } from '../lib/config';

export default function LiveMissionView({ isOpen, onClose }) {
  const HOST = API_URL.split(':').slice(0, 2).join(':');

  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/steel/sessions`);
      if (res.ok) {
          const sessionsData = await res.json();
          const processed = sessionsData.map(s => ({
              ...s,
              sessionViewerUrl: s.sessionViewerUrl || `${HOST}:3000/v1/sessions/${s.id}/viewer`
          }));
          setSessions(processed);
          if (processed.length > 0 && !activeSession) {
              setActiveSession(processed[0]);
          }
      }
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
      const interval = setInterval(fetchSessions, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[2000] flex flex-col overflow-hidden"
    >
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-slate-900/20">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-500">
            <MonitorPlay size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Live Mission View</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Real-time Neural Feed</p>
          </div>
          {activeSession && (
            <div className="ml-4 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-tighter">
              Link: {activeSession.id.substring(0, 12)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={fetchSessions}
                className="text-[10px] font-mono font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2"
            >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Sync
            </button>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/5 rounded-xl text-white transition-all"
            >
                <X size={24} />
            </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 border-r border-white/5 bg-black/40 p-4 overflow-y-auto space-y-4 scrollbar-none">
            <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] px-2">Active Sessions</h3>
            <div className="space-y-2">
              {sessions.map((s, idx) => (
                  <motion.div 
                      key={s.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setActiveSession(s)}
                      className={cn(
                        "p-4 rounded-2xl cursor-pointer transition-all border group",
                        activeSession?.id === s.id 
                          ? "bg-white/10 border-white/10 shadow-lg shadow-white/5" 
                          : "bg-white/5 border-transparent hover:border-white/5"
                      )}
                  >
                      <div className="flex justify-between items-center mb-3">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                            activeSession?.id === s.id ? "bg-emerald-400 animate-pulse" : "bg-emerald-600"
                          )} />
                          <span className="text-[9px] font-mono text-slate-500">{new Date(s.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">Worker Unit</div>
                      <div className="text-[9px] font-mono text-slate-600 uppercase tracking-tighter mt-1">ID: {s.id.substring(0, 12)}...</div>
                  </motion.div>
              ))}
            </div>
            {sessions.length === 0 && (
                <div className="py-10 text-center space-y-4">
                    <div className="p-4 rounded-full bg-slate-900/50 border border-white/5 inline-block">
                      <Target size={24} className="text-slate-700" />
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 leading-relaxed">
                      No active missions detected.<br/>Initiate worker to establish link.
                    </p>
                </div>
            )}
        </aside>

        <main className="flex-1 bg-black relative flex items-center justify-center">
            {activeSession ? (
                <iframe 
                    src={activeSession.sessionViewerUrl}
                    className="w-full h-full border-0 opacity-90"
                    title="Live Session"
                />
            ) : (
                <div className="text-center space-y-6">
                    <div className="p-8 rounded-full bg-slate-900/30 border border-white/5 inline-block animate-pulse">
                      <Eye size={64} className="text-slate-800" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white tracking-tight">Awaiting Visual Link</p>
                      <p className="text-xs font-mono uppercase tracking-[0.3em] text-slate-600 mt-2">Select a session to begin monitoring</p>
                    </div>
                </div>
            )}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%]" />
        </main>
      </div>
    </motion.div>
  );
}
