import React, { useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, X, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TERMINAL_URL = process.env.NEXT_PUBLIC_TERMINAL_URL || 'http://localhost:7681';

export default function FooterTerminal({ isOpen, onToggle }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (isOpen && iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {!isOpen ? (
        <motion.div 
          initial={{ y: 32 }}
          animate={{ y: 0 }}
          onClick={onToggle}
          className="fixed bottom-0 left-0 right-0 h-8 bg-black border-t border-white/5 cursor-pointer z-[100] flex items-center justify-between px-4 hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <TerminalIcon size={12} className="text-slate-500 group-hover:text-orange-500 transition-colors" />
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300 uppercase tracking-[0.2em]">
              System Terminal
            </span>
          </div>
          <ChevronUp size={12} className="text-slate-600 group-hover:text-white transition-all" />
        </motion.div>
      ) : (
        <motion.div 
          initial={{ y: 400 }}
          animate={{ y: 0 }}
          exit={{ y: 400 }}
          className="fixed bottom-0 left-0 right-0 h-[400px] bg-black border-t border-white/10 z-[100] flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
        >
          <div className="h-10 bg-slate-900/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <TerminalIcon size={14} className="text-emerald-500" />
              <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-tighter">
                root@sin-solver-empire:~
              </span>
              <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-mono font-bold border border-emerald-500/20 uppercase tracking-widest">
                Active Link
              </div>
            </div>
            <div className="flex items-center gap-4">
               <button 
                 onClick={onToggle} 
                 className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white transition-all"
               >
                 <ChevronDown size={18} />
               </button>
            </div>
          </div>

          <div className="flex-1 relative bg-black overflow-hidden">
            <iframe 
              ref={iframeRef}
              src={TERMINAL_URL} 
              className="w-full h-full border-0 opacity-90"
              title="Terminal"
            />
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%]" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
