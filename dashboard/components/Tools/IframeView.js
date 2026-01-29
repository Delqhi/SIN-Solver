import React, { useState } from 'react';
import { ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function IframeView({ service }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const url = service.publicUrl || (service.port ? `http://localhost:${service.port}` : null);

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 bg-black">
        <div className="text-center space-y-4">
          <div className="p-4 rounded-full bg-slate-900/50 border border-white/5 inline-block">
            <AlertTriangle size={32} className="text-slate-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-white tracking-tight">No Interface Available</p>
            <p className="text-xs font-mono uppercase tracking-widest text-slate-600 mt-1">Container exposes no public port</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-black relative">
      <div className="h-10 bg-slate-900/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 text-[10px] font-mono">
         <div className="flex items-center gap-3 text-slate-400">
           <div className={`w-1.5 h-1.5 rounded-full ${service.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
           <span className="tracking-tighter">{url}</span>
         </div>
         <div className="flex items-center gap-4">
           <button 
             onClick={() => { setLoading(true); setError(false); }}
             className="hover:text-white transition-colors flex items-center gap-1.5 uppercase tracking-tighter"
           >
             <RefreshCw size={10} className={loading ? 'animate-spin' : ''} /> Reload
           </button>
           <a 
             href={url} 
             target="_blank" 
             rel="noopener noreferrer"
             className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 uppercase tracking-tighter"
           >
             External <ExternalLink size={10} />
           </a>
         </div>
      </div>

      <div className="flex-1 relative bg-black">
        {loading && (
           <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
             <div className="flex flex-col items-center gap-3">
               <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
               <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Establishing Link...</span>
             </div>
           </div>
        )}
        
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
             <div className="text-center max-w-md p-8 bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl">
               <AlertTriangle size={40} className="text-orange-500 mx-auto mb-4" />
               <h3 className="text-white font-bold text-lg mb-2">Connection Refused</h3>
               <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                 The application at <code className="text-blue-400">{url}</code> prevented embedding (X-Frame-Options) or is currently unreachable.
               </p>
               <a 
                 href={url} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-900/20"
               >
                 Open in New Tab <ExternalLink size={14} />
               </a>
             </div>
          </div>
        ) : (
          <iframe 
            src={url}
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            onError={() => setError(true)}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
          />
        )}
      </div>
    </div>
  );
}
