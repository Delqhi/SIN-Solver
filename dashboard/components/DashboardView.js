import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Server, ShieldCheck, Zap, Cpu, HardDrive, Network, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function DashboardView({ services = [], isDemoMode, dockerStatus }) {
  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const totalCount = services.length;
  const systemHealth = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0;

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-300 to-slate-500 bg-clip-text text-transparent"
          >
            Empire Control
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 mt-2 font-mono text-sm tracking-widest uppercase"
          >
            Mission Control Center // v2.0.26
          </motion.p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/40 border border-slate-800 backdrop-blur-md"
        >
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            dockerStatus === 'Healthy' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
          )} />
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-tighter">
            Docker Engine: {dockerStatus}
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-tighter">
            {isDemoMode ? 'Simulation Mode' : 'Live Operations'}
          </span>
        </motion.div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <motion.div variants={item} className="md:col-span-2 bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Activity size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-bold tracking-widest mb-4">
              <Zap size={14} className="text-yellow-500" />
              System Integrity
            </div>
            <div className="flex items-end gap-4">
              <div className="text-6xl font-mono font-bold text-white tracking-tighter">
                {systemHealth}<span className="text-2xl text-slate-500">%</span>
              </div>
              <div className="mb-2 flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${systemHealth}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    systemHealth > 80 ? "bg-emerald-500" : systemHealth > 50 ? "bg-yellow-500" : "bg-red-500"
                  )}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl group">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-bold tracking-widest mb-4">
            <Server size={14} className="text-blue-500" />
            Swarm Nodes
          </div>
          <div className="text-4xl font-mono font-bold text-white tracking-tighter">
            {healthyCount}<span className="text-xl text-slate-500 mx-1">/</span>{totalCount}
          </div>
          <p className="text-xs text-slate-500 mt-2 font-mono uppercase">Active Containers</p>
        </motion.div>

        <motion.div variants={item} className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl group">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-bold tracking-widest mb-4">
            <ShieldCheck size={14} className="text-emerald-500" />
            Security
          </div>
          <div className="text-4xl font-mono font-bold text-emerald-400 tracking-tighter">
            Optimal
          </div>
          <p className="text-xs text-slate-500 mt-2 font-mono uppercase">Vault Sealed</p>
        </motion.div>
      </motion.div>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Service Inventory</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent" />
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {services.map((s, idx) => (
            <motion.div 
              key={s.id || s.containerId || idx}
              variants={item}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative bg-slate-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-5 hover:bg-slate-800/40 hover:border-white/10 transition-all overflow-hidden"
            >
              <div className={cn(
                "absolute -top-10 -right-10 w-20 h-20 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity",
                s.status === 'healthy' ? "bg-emerald-500" : "bg-red-500"
              )} />

              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-2xl shadow-inner">
                  {s.icon || '🔹'}
                </div>
                <div className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-mono font-bold border tracking-tighter",
                  s.status === 'healthy' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                )}>
                  {s.status === 'healthy' ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h3 className="font-bold text-slate-100 group-hover:text-white transition-colors truncate">{s.name}</h3>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{s.category}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/40 rounded-lg p-2 border border-white/5">
                    <div className="text-[8px] text-slate-500 font-mono uppercase mb-1">Port</div>
                    <div className="text-xs font-mono text-blue-400">{s.port || '---'}</div>
                  </div>
                  <div className="bg-black/40 rounded-lg p-2 border border-white/5">
                    <div className="text-[8px] text-slate-500 font-mono uppercase mb-1">Node</div>
                    <div className="text-xs font-mono text-slate-300 truncate" title={s.image}>
                      {s.image?.split('/')[s.image?.split('/').length - 1]?.split(':')[0] || 'local'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 h-1 mt-2">
                  {[...Array(12)].map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex-1 rounded-full",
                        s.status === 'healthy' 
                          ? (i < 8 ? "bg-emerald-500/40" : "bg-slate-800") 
                          : "bg-slate-800"
                      )} 
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
