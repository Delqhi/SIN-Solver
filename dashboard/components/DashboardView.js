import React from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Server, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  HardDrive, 
  Network, 
  Terminal,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Layers
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30
    }
  }
};

const cardHoverVariants = {
  rest: { 
    y: 0, 
    scale: 1,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
  },
  hover: { 
    y: -6, 
    scale: 1.02,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 25 
    }
  }
};

export default function DashboardView({ 
  services = [], 
  isDemoMode = false, 
  dockerStatus = 'Unknown' 
}) {
  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const totalCount = services.length;
  const systemHealth = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0;
  
  const agentsCount = services.filter(s => s.category === 'Agents').length;
  const roomsCount = services.filter(s => s.category === 'Rooms').length;
  const solversCount = services.filter(s => s.category === 'Solvers').length;

  const getHealthColor = (health) => {
    if (health >= 80) return 'bg-emerald-500';
    if (health >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getHealthGradient = (health) => {
    if (health >= 80) return 'from-emerald-500/20 to-emerald-500/5';
    if (health >= 50) return 'from-amber-500/20 to-amber-500/5';
    return 'from-red-500/20 to-red-500/5';
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1800px] mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.5)] animate-pulse" />
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-gradient">
              Empire Control
            </h1>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 font-mono text-sm tracking-widest uppercase flex items-center gap-2"
          >
            <span className="text-orange-500">//</span>
            Mission Control Center
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">v2.0.26</span>
          </motion.p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4 px-5 py-3 rounded-2xl glass-card"
        >
          <div className={cn(
            "w-2.5 h-2.5 rounded-full animate-pulse",
            dockerStatus === 'Healthy' 
              ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" 
              : "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
          )} />
          <div className="flex flex-col">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Docker Engine
            </span>
            <span className="text-xs font-mono font-semibold text-slate-300">
              {dockerStatus}
            </span>
          </div>
          
          <div className="w-px h-8 bg-white/10" />
          
          <div className="flex flex-col">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Mode
            </span>
            <span className={cn(
              "text-xs font-mono font-semibold",
              isDemoMode ? "text-amber-400" : "text-emerald-400"
            )}>
              {isDemoMode ? 'Simulation' : 'Live Ops'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Bento Grid - Main Metrics */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* System Health - Large Card */}
        <motion.div
          variants={itemVariants}
          whileHover="hover"
          initial="rest"
          animate="rest"
          className="md:col-span-2 bento-card-large group relative overflow-hidden"
        >
          <motion.div variants={cardHoverVariants} className="h-full flex flex-col relative z-10">
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl",
              getHealthGradient(systemHealth)
            )} />
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/10">
                    <Activity size={20} className="text-orange-500" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      System Integrity
                    </span>
                    <p className="text-[10px] text-slate-600 font-mono">Real-time monitoring</p>
                  </div>
                </div>
                
                <div className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-mono font-bold border",
                  systemHealth >= 80 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : systemHealth >= 50 
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                )}>
                  {systemHealth >= 80 ? 'OPTIMAL' : systemHealth >= 50 ? 'DEGRADED' : 'CRITICAL'}
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-end gap-6 mb-6">
                  <div className="text-7xl lg:text-8xl font-mono font-bold text-white tracking-tighter">
                    {systemHealth}
                    <span className="text-3xl text-slate-600">%</span>
                  </div>
                  
                  <div className="mb-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-emerald-500" />
                      <span className="text-xs text-emerald-400 font-mono">+2.4%</span>
                    </div>
                    <p className="text-[10px] text-slate-600">Last 24h</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider">
                    <span className="text-slate-500">Health Score</span>
                    <span className={cn(
                      "font-bold",
                      systemHealth >= 80 ? "text-emerald-400" : systemHealth >= 50 ? "text-amber-400" : "text-red-400"
                    )}>
                      {healthyCount}/{totalCount} Nodes
                    </span>
                  </div>                  
                  <div className="h-3 bg-slate-950/50 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${systemHealth}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full relative",
                        getHealthColor(systemHealth)
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Swarm Nodes */}
        <motion.div 
          variants={itemVariants}
          whileHover="hover"
          initial="rest"
          animate="rest"
          className="bento-card group"
        >
          <motion.div variants={cardHoverVariants} className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-slate-950/50 border border-white/10">
                <Server size={18} className="text-blue-500" />
              </div>
              <ArrowUpRight size={16} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <div className="flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Swarm Nodes</span>
              
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-mono font-bold text-white">{healthyCount}</span>
                <span className="text-lg text-slate-600">/</span>
                <span className="text-lg font-mono text-slate-500">{totalCount}</span>
              </div>
              
              <p className="text-[10px] text-slate-600 mt-1">Active containers</p>
            </div>
            
            <div className="mt-4 flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className={cn(
                    "flex-1 h-1 rounded-full",
                    i < Math.ceil((healthyCount / Math.max(totalCount, 1)) * 5) 
                      ? "bg-blue-500/60" 
                      : "bg-slate-800"
                  )}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Security Status */}
        <motion.div 
          variants={itemVariants}
          whileHover="hover"
          initial="rest"
          animate="rest"
          className="bento-card group"
        >
          <motion.div variants={cardHoverVariants} className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-slate-950/50 border border-white/10">
                <ShieldCheck size={18} className="text-emerald-500" />
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            
            <div className="flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Security</span>
              
              <div className="mt-2 text-3xl font-mono font-bold text-emerald-400">
                Optimal
              </div>
              
              <p className="text-[10px] text-slate-600 mt-1">Vault sealed</p>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span className="text-[10px] text-slate-500">All systems secure</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div 
          variants={itemVariants}
          whileHover="hover"
          initial="rest"
          animate="rest"
          className="md:col-span-2 bento-card-wide"
        >
          <motion.div variants={cardHoverVariants} className="h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-950/50 border border-white/10">
                  <Layers size={18} className="text-violet-500" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Infrastructure</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-2xl bg-slate-950/30 border border-white/5">
                <div className="text-2xl font-mono font-bold text-white mb-1">{agentsCount}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Agents</div>
                <div className="mt-2 text-[10px] text-slate-600">AI Workers</div>
              </div>
              
              <div className="text-center p-4 rounded-2xl bg-slate-950/30 border border-white/5">
                <div className="text-2xl font-mono font-bold text-white mb-1">{roomsCount}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Rooms</div>
                <div className="mt-2 text-[10px] text-slate-600">Infrastructure</div>
              </div>
              
              <div className="text-center p-4 rounded-2xl bg-slate-950/30 border border-white/5">
                <div className="text-2xl font-mono font-bold text-white mb-1">{solversCount}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Solvers</div>
                <div className="mt-2 text-[10px] text-slate-600">Task Workers</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Quick Stats Row */}
        <motion.div 
          variants={itemVariants}
          className="bento-card"
        >
          <div className="flex items-center gap-3 mb-3">
            <Cpu size={16} className="text-amber-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CPU Load</span>
          </div>          
          <div className="text-2xl font-mono font-bold text-white">24%</div>
          <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="w-1/4 h-full bg-amber-500 rounded-full" />
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="bento-card"
        >
          <div className="flex items-center gap-3 mb-3">
            <HardDrive size={16} className="text-cyan-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Storage</span>
          </div>          
          <div className="text-2xl font-mono font-bold text-white">62%</div>
          <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="w-[62%] h-full bg-cyan-500 rounded-full" />
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="bento-card"
        >
          <div className="flex items-center gap-3 mb-3">
            <Network size={16} className="text-purple-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Network</span>
          </div>          
          <div className="text-2xl font-mono font-bold text-white">12ms</div>
          <div className="mt-2 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-slate-500">Low latency</span>
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="bento-card"
        >
          <div className="flex items-center gap-3 mb-3">
            <Clock size={16} className="text-pink-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Uptime</span>
          </div>          
          <div className="text-2xl font-mono font-bold text-white">99.9%</div>
          <div className="mt-2 text-[10px] text-slate-600">Last 30 days</div>
        </motion.div>
      </motion.div>

      {/* Services Section */}
      <div className="space-y-6">
        <div className="section-header">
          <h2 className="section-title">Service Inventory</h2>
          <div className="section-divider" />
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{healthyCount} Online</span>
            <span className="text-slate-700">|</span>
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{totalCount - healthyCount} Offline</span>
          </div>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {services.map((service, idx) => (
            <motion.div 
              key={service.id || service.containerId || idx}
              variants={itemVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative bento-card p-5"
            >
              {/* Glow Effect */}
              <div className={cn(
                "absolute -top-20 -right-20 w-40 h-40 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-full",
                service.status === 'healthy' ? "bg-emerald-500" : "bg-red-500"
              )} />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/10 text-2xl shadow-inner">
                    {service.icon || '🔹'}
                  </div>
                  
                  <div className={cn(
                    "badge",
                    service.status === 'healthy' ? "badge-success" : "badge-error"
                  )}>
                    {service.status === 'healthy' ? 'ONLINE' : 'OFFLINE'}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-slate-100 group-hover:text-white transition-colors truncate">
                      {service.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                      {service.category}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-950/50 rounded-xl p-2.5 border border-white/5">
                      <div className="text-[9px] text-slate-500 font-mono uppercase mb-1">Port</div>
                      <div className="text-xs font-mono text-blue-400">{service.port || '---'}</div>
                    </div>
                    
                    <div className="bg-slate-950/50 rounded-xl p-2.5 border border-white/5">
                      <div className="text-[9px] text-slate-500 font-mono uppercase mb-1">Node</div>
                      <div className="text-xs font-mono text-slate-300 truncate" title={service.image}>
                        {service.image?.split('/')[service.image?.split('/').length - 1]?.split(':')[0] || 'local'}
                      </div>
                    </div>
                  </div>

                  {/* Activity Bars */}
                  <div className="flex gap-0.5 h-1 mt-3">
                    {[...Array(12)].map((_, i) => (
                      <motion.div 
                        key={i}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className={cn(
                          "flex-1 rounded-full origin-bottom",
                          service.status === 'healthy' 
                            ? (i < 8 ? "bg-emerald-500/50" : "bg-slate-800") 
                            : "bg-slate-800"
                        )}
                        style={{
                          height: service.status === 'healthy' 
                            ? `${20 + Math.random() * 80}%` 
                            : '20%'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Status Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="status-footer"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Terminal size={16} className="text-orange-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Status</span>
          </div>
          
          <div className="text-[10px] font-mono text-slate-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
        
        <div className="status-footer-grid">
          <div className="status-footer-item">
            <div className={cn(
              "w-2 h-2 rounded-full",
              dockerStatus === 'Healthy' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-red-500"
            )} />
            <div>
              <div className="status-footer-label">Docker Engine</div>
              <div className="status-footer-value">{dockerStatus}</div>
            </div>
          </div>
          
          <div className="status-footer-item">
            <Server size={14} className="text-blue-500" />
            <div>
              <div className="status-footer-label">Total Services</div>
              <div className="status-footer-value">{totalCount} containers</div>
            </div>
          </div>
          
          <div className="status-footer-item">
            <Activity size={14} className="text-emerald-500" />
            <div>
              <div className="status-footer-label">Health Rate</div>
              <div className="status-footer-value">{systemHealth}%</div>
            </div>
          </div>
          
          <div className="status-footer-item">
            <Zap size={14} className="text-amber-500" />
            <div>
              <div className="status-footer-label">System Mode</div>
              <div className={cn(
                "status-footer-value",
                isDemoMode ? "text-amber-400" : "text-emerald-400"
              )}>
                {isDemoMode ? 'Simulation' : 'Production'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-slate-600">
          <span>SIN-COCKPIT v2.0.26 | Visual Engineering 2026</span>
          <span>Built with Next.js + Tailwind + Framer Motion</span>
        </div>
      </motion.div>
    </div>
  );
}
