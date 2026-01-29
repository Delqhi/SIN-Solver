import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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

// ============================================
// 2026 VISUAL ENGINEERING SYSTEM
// ============================================
// Tactile Maximalism | Bento Grid 2.0 | Kinetic Typography
// Micro-interactions: 200-300ms | Spring Physics
// Accessibility: Reduced Motion Support

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
      duration: 0.25
    }
  }
};

// Tactile Card Variants - "Squishy" 2026 Effect
const tactileCardVariants = {
  rest: { 
    y: 0, 
    scale: 1,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
  },
  hover: { 
    y: -8, 
    scale: 1.02,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    transition: { 
      type: "spring", 
      stiffness: 500, 
      damping: 25,
      duration: 0.2
    }
  },
  tap: {
    scale: 0.98,
    y: -4,
    transition: { 
      type: "spring", 
      stiffness: 800, 
      damping: 20 
    }
  }
};

// Kinetic Typography Variants
const kineticTextVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
      duration: 0.4
    }
  }
};

// Stagger Container für Text
const textContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

// Pulse Animation für Live Indicators
const pulseVariants = {
  pulse: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export default function DashboardView({ 
  services = [], 
  isDemoMode = false, 
  dockerStatus = 'Unknown' 
}) {
  const shouldReduceMotion = useReducedMotion();
  
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

  // Motion Props basierend auf Reduced Motion Preference
  const cardMotionProps = shouldReduceMotion 
    ? {}
    : { 
        variants: tactileCardVariants,
        initial: "rest",
        whileHover: "hover",
        whileTap: "tap"
      };

  return (
    <div className="p-6 lg:p-10 max-w-[1800px] mx-auto space-y-8">
      {/* Header Section - Kinetic Typography 2026 */}
      <motion.div 
        className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6"
        variants={textContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="space-y-2">
          <motion.div
            variants={kineticTextVariants}
            className="flex items-center gap-3"
          >
            <motion.div 
              className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.6)]"
              animate={!shouldReduceMotion ? {
                scale: [1, 1.3, 1],
                boxShadow: [
                  "0 0 16px rgba(249,115,22,0.6)",
                  "0 0 24px rgba(249,115,22,0.8)",
                  "0 0 16px rgba(249,115,22,0.6)"
                ]
              } : {}}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Empire Control
            </h1>
          </motion.div>
          
          <motion.p 
            variants={kineticTextVariants}
            className="text-slate-400 font-mono text-sm tracking-widest uppercase flex items-center gap-2"
          >
            <span className="text-orange-500">//</span>
            Mission Control Center
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">v2.0.26</span>
          </motion.p>
        </div>
        
        <motion.div 
          variants={kineticTextVariants}
          className="flex items-center gap-4 px-5 py-3 rounded-3xl bg-slate-950/60 backdrop-blur-3xl border border-white/10 shadow-2xl"
        >
          <motion.div 
            className={cn(
              "w-2.5 h-2.5 rounded-full",
              dockerStatus === 'Healthy' 
                ? "bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.6)]" 
                : "bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.6)]"
            )}
            animate={dockerStatus === 'Healthy' && !shouldReduceMotion ? {
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1]
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
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
      </motion.div>

      {/* Bento Grid - 2026 Enhanced */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {/* System Health - Large Card */}
        <motion.div
          variants={itemVariants}
          {...cardMotionProps}
          className="md:col-span-2 group relative overflow-hidden rounded-3xl bg-slate-950/60 backdrop-blur-3xl border border-white/10 p-6 shadow-2xl cursor-pointer"
        >
          {/* Animated Gradient Background */}
          <motion.div 
            className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl",
              getHealthGradient(systemHealth)
            )}
          />
          
          {/* Glow Effect */}
          <motion.div
            className={cn(
              "absolute -top-20 -right-20 w-40 h-40 blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-full",
              systemHealth >= 80 ? "bg-emerald-500" : systemHealth >= 50 ? "bg-amber-500" : "bg-red-500"
            )}
          />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="p-2.5 rounded-2xl bg-slate-900/80 border border-white/10"
                  whileHover={!shouldReduceMotion ? { scale: 1.1, rotate: 5 } : {}}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                >
                  <Activity size={20} className="text-orange-500" />
                </motion.div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    System Integrity
                  </span>
                  <p className="text-[10px] text-slate-600 font-mono">Real-time monitoring</p>
                </div>
              </div>
              
              <motion.div 
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-mono font-bold border",
                  systemHealth >= 80 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : systemHealth >= 50 
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                )}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.15 }}
              >
                {systemHealth >= 80 ? 'OPTIMAL' : systemHealth >= 50 ? 'DEGRADED' : 'CRITICAL'}
              </motion.div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-end gap-6 mb-6">
                <motion.div 
                  className="text-7xl lg:text-8xl font-mono font-bold text-white tracking-tighter"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  {systemHealth}
                  <span className="text-3xl text-slate-600">%</span>
                </motion.div>
                
                <motion.div 
                  className="mb-4 space-y-1"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <span className="text-xs text-emerald-400 font-mono">+2.4%</span>
                  </div>
                  <p className="text-[10px] text-slate-600">Last 24h</p>
                </motion.div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider">
                  <span className="text-slate-500">Health Score</span>
                  <span className={cn(
                    "font-bold",
                    systemHealth >= 80 ? "text-emerald-400" : systemHealth >= 50 ? "text-amber-400" : "text-red-400"
                  )}>
                    {healthyCount}/{totalCount} Nodes
                  </span>
                </div>                  
                <div className="h-4 bg-slate-900/80 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${systemHealth}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full relative",
                      getHealthColor(systemHealth)
                    )}
                  >
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={!shouldReduceMotion ? {
                        x: ["-100%", "100%"]
                      } : {}}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Swarm Nodes */}
        <motion.div 
          variants={itemVariants}
          {...cardMotionProps}
          className="group relative rounded-3xl bg-slate-950/60 backdrop-blur-3xl border border-white/10 p-5 shadow-2xl cursor-pointer overflow-hidden"
        >
          <motion.div
            className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <motion.div 
                className="p-2 rounded-2xl bg-slate-900/80 border border-white/10"
                whileHover={!shouldReduceMotion ? { scale: 1.1 } : {}}
              >
                <Server size={18} className="text-blue-500" />
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1, x: 2 }}
                transition={{ duration: 0.15 }}
              >
                <ArrowUpRight size={16} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            </div>
            
            <div className="flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Swarm Nodes</span>
              
              <div className="mt-2 flex items-baseline gap-1">
                <motion.span 
                  className="text-4xl font-mono font-bold text-white"
                  key={healthyCount}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  {healthyCount}
                </motion.span>
                <span className="text-lg text-slate-600">/</span>
                <span className="text-lg font-mono text-slate-500">{totalCount}</span>
              </div>
              
              <p className="text-[10px] text-slate-600 mt-1">Active containers</p>
            </div>
            
            {/* Animated Bars */}
            <div className="mt-4 flex gap-1">
              {[...Array(5)].map((_, i) => (
                <motion.div 
                  key={i}
                  className={cn(
                    "flex-1 h-1.5 rounded-full",
                    i < Math.ceil((healthyCount / Math.max(totalCount, 1)) * 5) 
                      ? "bg-blue-500/60" 
                      : "bg-slate-800"
                  )}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  style={{ originY: 1 }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Security Status */}
        <motion.div 
          variants={itemVariants}
          {...cardMotionProps}
          className="group relative rounded-3xl bg-slate-950/60 backdrop-blur-3xl border border-white/10 p-5 shadow-2xl cursor-pointer overflow-hidden"
        >
          <motion.div
            className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <motion.div 
                className="p-2 rounded-2xl bg-slate-900/80 border border-white/10"
                whileHover={!shouldReduceMotion ? { scale: 1.1 } : {}}
              >
                <ShieldCheck size={18} className="text-emerald-500" />
              </motion.div>
              <motion.div 
                className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                animate={!shouldReduceMotion ? {
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.7, 1]
                } : {}}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
            
            <div className="flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Security</span>
              
              <motion.div 
                className="mt-2 text-3xl font-mono font-bold text-emerald-400"
                whileHover={!shouldReduceMotion ? { scale: 1.05 } : {}}
              >
                Optimal
              </motion.div>
              
              <p className="text-[10px] text-slate-600 mt-1">Vault sealed</p>
            </div>
            
            <motion.div 
              className="mt-4 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span className="text-[10px] text-slate-500">All systems secure</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Category Breakdown - Wide Card */}
        <motion.div 
          variants={itemVariants}
          {...cardMotionProps}
          className="md:col-span-2 group relative rounded-3xl bg-slate-950/60 backdrop-blur-3xl border border-white/10 p-5 shadow-2xl cursor-pointer overflow-hidden"
        >
          <motion.div
            className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />
          <div className="relative z-10 h-full">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="p-2 rounded-2xl bg-slate-900/80 border border-white/10"
                  whileHover={!shouldReduceMotion ? { scale: 1.1, rotate: 5 } : {}}
                >
                  <Layers size={18} className="text-violet-500" />
                </motion.div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Infrastructure</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {[
                { count: agentsCount, label: 'Agents', sub: 'AI Workers', color: 'blue' },
                { count: roomsCount, label: 'Rooms', sub: 'Infrastructure', color: 'purple' },
                { count: solversCount, label: 'Solvers', sub: 'Task Workers', color: 'orange' }
              ].map((item, idx) => (
                <motion.div 
                  key={item.label}
                  className="text-center p-4 rounded-2xl bg-slate-900/50 border border-white/5"
                  whileHover={!shouldReduceMotion ? { 
                    scale: 1.03, 
                    y: -2,
                    borderColor: "rgba(255,255,255,0.1)"
                  } : {}}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div 
                    className="text-2xl font-mono font-bold text-white mb-1"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.1, type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {item.count}
                  </motion.div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</div>
                  <div className="mt-1 text-[10px] text-slate-600">{item.sub}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Quick Stats Row - Tactile Cards */}
        {[
          { icon: Cpu, label: 'CPU Load', value: '24%', color: 'amber', bar: 'w-1/4' },
          { icon: HardDrive, label: 'Storage', value: '62%', color: 'cyan', bar: 'w-[62%]' },
          { icon: Network, label: 'Network', value: '12ms', color: 'purple', status: 'Low latency' },
          { icon: Clock, label: 'Uptime', value: '99.9%', color: 'pink', sub: 'Last 30 days' }
        ].map((stat, idx) => (
          <motion.div 
            key={stat.label}
            variants={itemVariants}
            {...cardMotionProps}
            className="group relative rounded-3xl bg-slate-950/60 backdrop-blur-3xl border border-white/10 p-5 shadow-2xl cursor-pointer overflow-hidden"
          >
            <motion.div
              className={`absolute -top-10 -right-10 w-20 h-20 bg-${stat.color}-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  whileHover={!shouldReduceMotion ? { scale: 1.1, rotate: 10 } : {}}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                >
                  <stat.icon size={16} className={`text-${stat.color}-500`} />
                </motion.div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
              </div>          
              <motion.div 
                className="text-2xl font-mono font-bold text-white"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 + 0.2 }}
              >
                {stat.value}
              </motion.div>
              
              {stat.bar ? (
                <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full bg-${stat.color}-500 rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: stat.bar.replace('w-', '').replace('[', '').replace(']', '') }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  />
                </div>
              ) : stat.status ? (
                <div className="mt-2 flex items-center gap-1">
                  <motion.div 
                    className="w-2 h-2 rounded-full bg-emerald-500"
                    animate={!shouldReduceMotion ? {
                      scale: [1, 1.2, 1]
                    } : {}}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity
                    }}
                  />
                  <span className="text-[10px] text-slate-500">{stat.status}</span>
                </div>
              ) : (
                <div className="mt-2 text-[10px] text-slate-600">{stat.sub}</div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Services Section - 2026 Enhanced */}
      <div className="space-y-6">
        <motion.div 
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-white tracking-tight">Service Inventory</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{healthyCount} Online</span>
            <span className="text-slate-700">|</span>
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{totalCount - healthyCount} Offline</span>
          </div>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {services.map((service, idx) => (
            <motion.div 
              key={service.id || service.containerId || idx}
              variants={itemVariants}
              whileHover={!shouldReduceMotion ? { 
                y: -6, 
                scale: 1.02,
                transition: { type: "spring", stiffness: 500, damping: 25 }
              } : {}}
              whileTap={{ scale: 0.98 }}
              className="group relative rounded-3xl bg-slate-950/60 backdrop-blur-3xl border border-white/10 p-5 shadow-2xl cursor-pointer overflow-hidden"
            >
              {/* Glow Effect */}
              <motion.div
                className={cn(
                  "absolute -top-20 -right-20 w-40 h-40 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-full",
                  service.status === 'healthy' ? "bg-emerald-500" : "bg-red-500"
                )}
              />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <motion.div 
                    className="p-2.5 rounded-2xl bg-slate-900/80 border border-white/10 text-2xl shadow-inner"
                    whileHover={!shouldReduceMotion ? { scale: 1.1, rotate: 5 } : {}}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  >
                    {service.icon || '🔹'}
                  </motion.div>
                  
                  <motion.div 
                    className={cn(
                      "px-2 py-1 rounded-full text-[9px] font-mono font-bold uppercase border",
                      service.status === 'healthy' 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}
                    whileHover={{ scale: 1.05 }}
                  >
                    {service.status === 'healthy' ? 'ONLINE' : 'OFFLINE'}
                  </motion.div>
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
                    <div className="bg-slate-900/50 rounded-xl p-2.5 border border-white/5">
                      <div className="text-[9px] text-slate-500 font-mono uppercase mb-1">Port</div>
                      <div className="text-xs font-mono text-blue-400">{service.port || '---'}</div>
                    </div>
                    
                    <div className="bg-slate-900/50 rounded-xl p-2.5 border border-white/5">
                      <div className="text-[9px] text-slate-500 font-mono uppercase mb-1">Node</div>
                      <div className="text-xs font-mono text-slate-300 truncate" title={service.image}>
                        {service.image?.split('/')[service.image?.split('/').length - 1]?.split(':')[0] || 'local'}
                      </div>
                    </div>
                  </div>

                  {/* Activity Bars - Animated */}
                  <div className="flex gap-0.5 h-1 mt-3">
                    {[...Array(12)].map((_, i) => (
                      <motion.div 
                        key={i}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: i * 0.02 + idx * 0.05, duration: 0.2 }}
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

      {/* Status Footer - 2026 Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-3xl bg-slate-950/60 backdrop-blur-3xl border border-white/10 p-6 shadow-2xl"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={!shouldReduceMotion ? { rotate: 10 } : {}}
              transition={{ duration: 0.2 }}
            >
              <Terminal size={16} className="text-orange-500" />
            </motion.div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Status</span>
          </div>
          
          <div className="text-[10px] font-mono text-slate-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { 
              icon: 'dot', 
              label: 'Docker Engine', 
              value: dockerStatus,
              color: dockerStatus === 'Healthy' ? 'emerald' : 'red'
            },
            { 
              icon: Server, 
              label: 'Total Services', 
              value: `${totalCount} containers`,
              color: 'blue'
            },
            { 
              icon: Activity, 
              label: 'Health Rate', 
              value: `${systemHealth}%`,
              color: 'emerald'
            },
            { 
              icon: Zap, 
              label: 'System Mode', 
              value: isDemoMode ? 'Simulation' : 'Production',
              color: isDemoMode ? 'amber' : 'emerald',
              valueClass: isDemoMode ? 'text-amber-400' : 'text-emerald-400'
            }
          ].map((item, idx) => (
            <motion.div 
              key={item.label}
              className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/50 border border-white/5"
              whileHover={!shouldReduceMotion ? { 
                scale: 1.02, 
                borderColor: "rgba(255,255,255,0.1)"
              } : {}}
              transition={{ duration: 0.15 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + idx * 0.05 }}
            >
              {item.icon === 'dot' ? (
                <motion.div 
                  className={cn(
                    "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.4)]",
                    item.color === 'emerald' && "bg-emerald-500 shadow-emerald-500/40",
                    item.color === 'red' && "bg-red-500 shadow-red-500/40"
                  )}
                  animate={item.color === 'emerald' && !shouldReduceMotion ? {
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.8, 1]
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              ) : (
                <item.icon size={14} className={`text-${item.color}-500`} />
              )}
              <div>
                <div className="text-[10px] text-slate-500 font-mono uppercase">{item.label}</div>
                <div className={cn(
                  "text-xs font-mono font-semibold text-slate-300",
                  item.valueClass
                )}>
                  {item.value}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-5 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] font-mono text-slate-600">
          <span>SIN-COCKPIT v2.0.26 | Visual Engineering 2026</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Built with Next.js + Tailwind + Framer Motion
          </span>
        </div>
      </motion.div>
    </div>
  );
}
