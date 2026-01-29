import React, { useState } from 'react';
import { 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle,
  Maximize2,
  Shield,
  Activity,
  Globe,
  Lock,
  ChevronRight,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function IframeView({ service }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const url = service.publicUrl || (service.port ? `https://${service.subdomain}.delqhi.com` : null);

  if (!url) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center h-full bg-black p-6"
      >
        <div className="text-center space-y-6 max-w-md">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="p-6 rounded-3xl glass-card-strong inline-block"
          >
            <AlertTriangle size={48} className="text-amber-500" />
          </motion.div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">No Interface Available</h2>
            <p className="text-sm text-slate-400">
              This container does not expose a public web interface.
            </p>
          </div>

          <div className="glass-card p-4 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Container</span>
              <span className="text-slate-300 font-mono">{service.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Status</span>
              <span className={cn(
                "font-mono",
                service.status === 'healthy' ? "text-emerald-400" : "text-red-400"
              )}>
                {service.status.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Type</span>
              <span className="text-slate-300">{service.category || 'Service'}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex flex-col h-full w-full bg-black relative",
        isFullscreen && "fixed inset-0 z-50"
      )}
    >
      {/* Toolbar */}
      <div className="h-14 glass-card-strong border-b border-white/10 flex items-center justify-between px-4 shrink-0 bg-slate-900/60">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              service.status === 'healthy' 
                ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
            )} />
            
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-tight">{service.name}</span>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                <Globe size={10} />
                <span className="truncate max-w-[200px]">{url}</span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <div className={cn(
              "px-2 py-1 rounded-md text-[10px] font-mono font-bold border",
              service.status === 'healthy'
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            )}>
              {service.status === 'healthy' ? 'ONLINE' : 'OFFLINE'}
            </div>
            
            <div className="px-2 py-1 rounded-md text-[10px] font-mono text-slate-400 bg-slate-900/50 border border-white/5">
              Port {service.port}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setLoading(true); setError(false); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
            Reload
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Maximize2 size={14} />
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </motion.button>

          <div className="h-6 w-px bg-white/10 mx-1" />

          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600/80 hover:bg-blue-600 transition-colors"
          >
            <ExternalLink size={14} />
            Open
          </motion.a>

          {isFullscreen && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setIsFullscreen(false)}
              className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <AnimatePresence mode="wait">
          {loading && !error && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black z-10"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 border-3 border-slate-800 rounded-full" />
                  <div className="absolute inset-0 w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="text-center space-y-1">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-[0.2em]">
                    Establishing Connection
                  </span>
                  <div className="flex gap-1 justify-center">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-blue-500"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 flex items-center justify-center bg-black z-20 p-6"
            >
              <div className="glass-card-strong max-w-lg w-full p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Connection Refused</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    The application at <code className="text-blue-400 bg-slate-900/50 px-1.5 py-0.5 rounded">{url}</code> prevented embedding 
                    (X-Frame-Options) or is currently unreachable.
                  </p>
                </div>

                <div className="glass-card p-4 text-left space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Shield size={12} />
                    <span>Possible causes:</span>
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1 ml-4">
                    <li>X-Frame-Options header blocking embeds</li>
                    <li>Container is not running</li>
                    <li>Network connectivity issues</li>
                    <li>Port not exposed correctly</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setLoading(true); setError(false); }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Try Again
                  </motion.button>
                  
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={14} />
                    Open in New Tab
                  </motion.a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <iframe
          src={url}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
          allow="fullscreen; clipboard-write; autoplay"
        />
      </div>

      {/* Status Bar */}
      <div className="h-8 glass-card border-t border-white/5 flex items-center justify-between px-4 text-[10px] font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity size={10} className="text-emerald-500" />
            <span className="text-slate-500">Status:</span>
            <span className={cn(
              service.status === 'healthy' ? "text-emerald-400" : "text-red-400"
            )}>
              {service.status.toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Lock size={10} className="text-slate-600" />
            <span className="text-slate-500">Security:</span>
            <span className="text-slate-400">{url.startsWith('https') ? 'HTTPS' : 'HTTP'}</span>
          </div>
        </div>

        <div className="text-slate-600">
          SIN-Cockpit Iframe Viewer
        </div>
      </div>
    </motion.div>
  );
}
