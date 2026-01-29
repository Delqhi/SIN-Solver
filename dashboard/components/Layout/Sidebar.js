import React from 'react';
import { 
  Home, 
  Plus, 
  Settings, 
  Box, 
  Play, 
  Pause, 
  ExternalLink, 
  LayoutGrid, 
  FileText, 
  X,
  ChevronRight,
  Activity,
  Shield,
  Zap,
  Terminal,
  Cpu,
  Database,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ============================================
// 2026 MOTION SYSTEM - Best Practices Januar
// ============================================
// - Tactile Maximalism: "Squishy" Effekte bei Hover/Tap
// - Micro-interactions: 200-300ms für UI Feedback
// - Spring Physics: stiffness 500, damping 25-30
// - Reduced Motion Support für Accessibility

const sidebarVariants = {
  expanded: { 
    width: 280,
    transition: { 
      type: "spring", 
      stiffness: 500, 
      damping: 30,
      staggerChildren: 0.03,
      delayChildren: 0.05
    }
  },
  collapsed: { 
    width: 72,
    transition: { 
      type: "spring", 
      stiffness: 500, 
      damping: 30 
    }
  }
};

const navItemVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.9 },
  visible: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 500,
      damping: 25,
      duration: 0.25
    }
  }
};

// Tactile Hover Variants - "Squishy" Effect 2026
const tactileHoverVariants = {
  rest: { 
    scale: 1,
    y: 0,
  },
  hover: { 
    scale: 1.02,
    y: -2,
    transition: { 
      type: "spring",
      stiffness: 600,
      damping: 20,
      duration: 0.2
    }
  },
  tap: {
    scale: 0.96,
    y: 1,
    transition: { 
      type: "spring",
      stiffness: 800,
      damping: 15,
      duration: 0.1
    }
  }
};

// Glow Animation für Active States
const glowVariants = {
  idle: { 
    boxShadow: "0 0 0px rgba(249, 115, 22, 0)",
    scale: 1
  },
  hover: { 
    boxShadow: "0 0 40px rgba(249, 115, 22, 0.4)",
    scale: 1.05,
    transition: { 
      type: "spring",
      stiffness: 400,
      damping: 25,
      duration: 0.25
    }
  }
};

// Kinetic Typography Variants
const textRevealVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  })
};

export default function Sidebar({ 
  isOpen, 
  setIsOpen, 
  activeRoomId, 
  setActiveRoomId, 
  services = [],
  isAutoWorkActive = false,
  toggleAutoWork 
}) {
  const shouldReduceMotion = useReducedMotion();
  
  const STATIC_ITEMS = [
    { 
      id: 'overview', 
      name: 'Empire State', 
      icon: Home, 
      category: 'Main',
      description: 'System Overview'
    },
    { 
      id: 'mission-control', 
      name: 'Mission Control', 
      icon: Box, 
      category: 'Main',
      description: 'Active Operations'
    },
    { 
      id: 'workflow-builder', 
      name: 'Workflow Architect', 
      icon: Plus, 
      category: 'Main',
      description: 'Build Automations'
    },
    { 
      id: 'docs', 
      name: 'Knowledge Base', 
      icon: FileText, 
      category: 'Main',
      description: 'Documentation'
    },
  ];

  const groupedServices = services.reduce((acc, service) => {
    const cat = service.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const totalCount = services.length;

  // Reduced Motion Wrapper
  const motionProps = shouldReduceMotion 
    ? { animate: "visible" }
    : { whileHover: "hover", whileTap: "tap" };

  return (
    <motion.aside 
      initial={false}
      animate={isOpen ? "expanded" : "collapsed"}
      variants={sidebarVariants}
      className={cn(
        "flex flex-col relative z-30 h-full",
        "bg-slate-950/70 backdrop-blur-3xl", // Enhanced glassmorphism 2026
        "border-r border-white/10",
        "fixed md:relative",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Header - Enhanced Glassmorphism 2026 */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 shrink-0 bg-slate-950/50">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <motion.div 
                className="w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30"
                whileHover={!shouldReduceMotion ? { scale: 1.08, rotate: 5 } : {}}
                whileTap={!shouldReduceMotion ? { scale: 0.92 } : {}}
                transition={{ type: "spring", stiffness: 600, damping: 20 }}
              >
                <Zap size={18} className="text-white" />
              </motion.div>
              <div>
                <motion.span 
                  className="font-bold text-sm text-white tracking-tight font-sans block"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  SIN-Cockpit
                </motion.span>
                <motion.p 
                  className="text-[10px] text-slate-500 font-mono tracking-wider"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  v2.0.26
                </motion.p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30 mx-auto"
            >
              <Zap size={18} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button
          whileHover={!shouldReduceMotion ? { scale: 1.1, rotate: isOpen ? 90 : 0 } : {}}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors hover:text-white active:bg-white/20"
          aria-label={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isOpen ? <X size={18} /> : <LayoutGrid size={18} />}
        </motion.button>
      </div>

      {/* Navigation - 2026 Micro-interactions */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-6 scrollbar-hide">
        {/* Main Navigation */}
        <motion.div 
          initial="hidden"
          animate="visible"
          className="space-y-1"
        >
          {isOpen && (
            <motion.div 
              variants={navItemVariants}
              className="px-3 py-2"
            >
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-mono">Navigation</span>
            </motion.div>
          )}
          
          {STATIC_ITEMS.map((item, index) => (
            <motion.button
              key={item.id}
              variants={navItemVariants}
              custom={index}
              onClick={() => setActiveRoomId(item.id)}
              whileHover={!shouldReduceMotion ? { x: 4, backgroundColor: "rgba(255,255,255,0.05)" } : {}}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs transition-all whitespace-nowrap group relative overflow-hidden",
                "duration-200 ease-out", // 2026: Schnellere Transitions
                activeRoomId === item.id
                  ? "bg-gradient-to-r from-orange-500/20 to-orange-500/5 text-orange-400 border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.15)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
              )}
            >
              {activeRoomId === item.id && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-orange-400 to-amber-500 rounded-r-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                  transition={{ type: "spring", stiffness: 600, damping: 25 }}
                />
              )}
              
              <motion.div
                whileHover={!shouldReduceMotion ? { scale: 1.1, rotate: 5 } : {}}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <item.icon 
                  size={18} 
                  className={cn(
                    "transition-all duration-200",
                    activeRoomId === item.id ? 'text-orange-400' : 'text-slate-500 group-hover:text-slate-300'
                  )} 
                />
              </motion.div>
              
              {isOpen && (
                <div className="flex-1 text-left">
                  <motion.span 
                    className="font-medium tracking-tight block font-sans"
                    initial={false}
                    animate={{ x: activeRoomId === item.id ? 2 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {item.name}
                  </motion.span>
                  <span className="text-[10px] text-slate-600 block font-mono">{item.description}</span>
                </div>
              )}
              
              {isOpen && activeRoomId === item.id && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight size={14} className="text-orange-400/60" />
                </motion.div>
              )}
            </motion.button>
          ))}
        </motion.div>

        {/* Services by Category - 2026 Enhanced */}
        <AnimatePresence>
          {Object.entries(groupedServices).map(([category, items], catIndex) => (
            <motion.div 
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.08, duration: 0.25 }}
              className="space-y-2"
            >
              {isOpen && (
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-mono">
                    {category}
                  </span>
                  <motion.span 
                    className="text-[10px] text-slate-600 font-mono bg-slate-950/50 px-2 py-0.5 rounded-full border border-white/5"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.15 }}
                  >
                    {items.filter(i => i.status === 'healthy').length}/{items.length}
                  </motion.span>
                </div>
              )}
              
              <div className="space-y-1">
                {items.map((service, idx) => (
                  <motion.button
                    key={service.id || service.containerId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.2 }}
                    whileHover={!shouldReduceMotion ? { x: 4, backgroundColor: "rgba(255,255,255,0.08)" } : {}}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveRoomId(service.containerId)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs transition-all whitespace-nowrap group relative",
                      "duration-200",
                      activeRoomId === service.containerId
                        ? "bg-gradient-to-r from-white/15 to-white/5 text-white border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {activeRoomId === service.containerId && (
                      <motion.div
                        layoutId="serviceIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-emerald-400 to-cyan-500 rounded-r-full"
                        transition={{ type: "spring", stiffness: 600, damping: 25 }}
                      />
                    )}
                    
                    {/* Status Indicator mit Animation */}
                    <motion.div 
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0 transition-all duration-300",
                        service.status === 'healthy' 
                          ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" 
                          : "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                      )}
                      animate={service.status === 'healthy' && !shouldReduceMotion ? {
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.8, 1]
                      } : {}}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    
                    <motion.span 
                      className="text-lg filter grayscale group-hover:grayscale-0 transition-all duration-300 shrink-0"
                      whileHover={!shouldReduceMotion ? { scale: 1.15, rotate: 5 } : {}}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    >
                      {service.icon || '📦'}
                    </motion.span>
                    
                    {isOpen && (
                      <div className="flex-1 flex flex-col items-start overflow-hidden min-w-0">
                        <span className="font-medium tracking-tight truncate w-full font-sans">{service.name}</span>
                        <span className="text-[9px] text-slate-600 font-mono uppercase tracking-wider">
                          {service.port ? `:${service.port}` : 'internal'}
                        </span>
                      </div>
                    )}
                    
                    {isOpen && service.publicUrl && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1, scale: 1.1 }}
                        transition={{ duration: 0.15 }}
                      >
                        <ExternalLink size={12} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-all shrink-0 group-hover:text-emerald-400" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Settings */}
        <div className="space-y-1 mt-4 border-t border-white/5 pt-4">
          {isOpen && (
            <div className="px-3 py-2">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">System</span>
            </div>
          )}
          
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={!shouldReduceMotion ? { x: 2, backgroundColor: "rgba(255,255,255,0.05)" } : {}}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveRoomId('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs transition-all whitespace-nowrap duration-200",
              activeRoomId === 'settings'
                ? "bg-white/10 text-white border border-white/10"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <motion.div
              whileHover={!shouldReduceMotion ? { rotate: 90 } : {}}
              transition={{ duration: 0.2 }}
            >
              <Settings size={18} />
            </motion.div>
            {isOpen && (
              <div className="flex-1 text-left">
                <span className="font-medium tracking-tight block">Settings</span>
                <span className="text-[10px] text-slate-600 block">Configuration</span>
              </div>
            )}
          </motion.button>
        </div>
      </nav>

      {/* Footer Stats - 2026 Bento Grid 2.0 Style */}
      <div className="p-4 border-t border-white/10 shrink-0 space-y-4 bg-slate-950/50">
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 gap-3"
          >
            {/* Node Card - Tactile Hover */}
            <motion.div 
              variants={tactileHoverVariants}
              initial="rest"
              whileHover={!shouldReduceMotion ? "hover" : {}}
              whileTap="tap"
              className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 rounded-3xl p-4 border border-white/10 backdrop-blur-xl shadow-xl cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-3">
                <motion.div 
                  className="p-1.5 rounded-xl bg-emerald-500/20"
                  whileHover={!shouldReduceMotion ? { scale: 1.1, rotate: 10 } : {}}
                >
                  <Activity size={12} className="text-emerald-400" />
                </motion.div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Nodes</span>
              </div>
              <div className="text-2xl font-mono font-bold text-white font-mono-data">
                {healthyCount}<span className="text-slate-600 text-sm">/{totalCount}</span>
              </div>
            </motion.div>
            
            {/* Health Card - Tactile Hover */}
            <motion.div 
              variants={tactileHoverVariants}
              initial="rest"
              whileHover={!shouldReduceMotion ? "hover" : {}}
              whileTap="tap"
              className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 rounded-3xl p-4 border border-white/10 backdrop-blur-xl shadow-xl cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-3">
                <motion.div 
                  className="p-1.5 rounded-xl bg-blue-500/20"
                  whileHover={!shouldReduceMotion ? { scale: 1.1, rotate: -10 } : {}}
                >
                  <Shield size={12} className="text-blue-400" />
                </motion.div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Health</span>
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-400 font-mono-data">
                {totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0}%
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {/* Auto Work Toggle - 2026 Enhanced */}
        <motion.button
          variants={tactileHoverVariants}
          initial="rest"
          whileHover={!shouldReduceMotion ? "hover" : {}}
          whileTap="tap"
          onClick={toggleAutoWork}
          className={cn(
            "w-full h-12 rounded-2xl font-bold text-[10px] transition-all flex items-center justify-center gap-2 uppercase tracking-widest font-sans",
            "shadow-lg",
            isAutoWorkActive
              ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-emerald-500/25 border border-emerald-500/30"
              : "bg-gradient-to-r from-slate-800 to-slate-700 text-slate-300 border border-white/10 hover:border-white/20"
          )}
        >
          <motion.div
            animate={isAutoWorkActive && !shouldReduceMotion ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 0.5 }}
          >
            {isAutoWorkActive ? <Pause size={14} /> : <Play size={14} />}
          </motion.div>
          {isOpen && (isAutoWorkActive ? 'Pause Fleet' : 'Start Fleet')}
          {!isOpen && (isAutoWorkActive ? 'On' : 'Off')}
        </motion.button>
        
        {isOpen && (
          <motion.div 
            className="flex items-center justify-center gap-2 text-[9px] text-slate-600 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div 
              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
              animate={!shouldReduceMotion ? {
                scale: [1, 1.3, 1],
                opacity: [1, 0.7, 1]
              } : {}}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <span>System Operational</span>
          </motion.div>
        )}
      </div>
    </motion.aside>
  );
}
