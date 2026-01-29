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
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const sidebarVariants = {
  expanded: { 
    width: 280,
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 35,
      staggerChildren: 0.03,
      delayChildren: 0.05
    }
  },
  collapsed: { 
    width: 72,
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 35 
    }
  }
};

const navItemVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  }
};

const glowVariants = {
  idle: { 
    boxShadow: "0 0 0px rgba(249, 115, 22, 0)" 
  },
  hover: { 
    boxShadow: "0 0 30px rgba(249, 115, 22, 0.3)",
    transition: { duration: 0.3 }
  }
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

  return (
    <motion.aside 
      initial={false}
      animate={isOpen ? "expanded" : "collapsed"}
      variants={sidebarVariants}
      className={cn(
        "flex flex-col relative z-30 h-full",
        "bg-slate-900/60 backdrop-blur-2xl",
        "border-r border-white/10",
        "fixed md:relative",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Header */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 shrink-0 bg-slate-900/40">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3"
            >
              <motion.div 
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Zap size={18} className="text-white" />
              </motion.div>
              <div>
                <span className="font-bold text-sm text-white tracking-tight font-sans">SIN-Cockpit</span>
                <p className="text-[10px] text-slate-500 font-mono tracking-wider">v2.0.26</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30 mx-auto"
            >
              <Zap size={18} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button
          whileHover={{ scale: 1.1, rotate: isOpen ? 90 : 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors hover:text-white"
          aria-label={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isOpen ? <X size={18} /> : <LayoutGrid size={18} />}
        </motion.button>
      </div>

      {/* Navigation */}
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
              whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.05)" }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all whitespace-nowrap group relative overflow-hidden",
                activeRoomId === item.id
                  ? "bg-gradient-to-r from-orange-500/20 to-orange-500/5 text-orange-400 border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {activeRoomId === item.id && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-orange-400 to-amber-500 rounded-r-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              <item.icon 
                size={18} 
                className={cn(
                  "transition-all duration-300",
                  activeRoomId === item.id ? 'text-orange-400 scale-110' : 'text-slate-500 group-hover:text-slate-300'
                )} 
              />
              
              {isOpen && (
                <div className="flex-1 text-left">
                  <span className="font-medium tracking-tight block font-sans">{item.name}</span>
                  <span className="text-[10px] text-slate-600 block font-mono">{item.description}</span>
                </div>
              )}
              
              {isOpen && activeRoomId === item.id && (
                <ChevronRight size={14} className="text-orange-400/60" />
              )}
            </motion.button>
          ))}
        </motion.div>

        {/* Services by Category */}
        <AnimatePresence>
          {Object.entries(groupedServices).map(([category, items], catIndex) => (
            <motion.div 
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.1 }}
              className="space-y-2"
            >
              {isOpen && (
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-mono">
                    {category}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono bg-slate-900/50 px-2 py-0.5 rounded-full border border-white/5">
                    {items.filter(i => i.status === 'healthy').length}/{items.length}
                  </span>
                </div>
              )}
              
              <div className="space-y-1">
                {items.map((service, idx) => (
                  <motion.button
                    key={service.id || service.containerId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.08)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveRoomId(service.containerId)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all whitespace-nowrap group relative",
                      activeRoomId === service.containerId
                        ? "bg-gradient-to-r from-white/15 to-white/5 text-white border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {activeRoomId === service.containerId && (
                      <motion.div
                        layoutId="serviceIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-emerald-400 to-cyan-500 rounded-r-full"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0 transition-all duration-300",
                      service.status === 'healthy' 
                        ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                        : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    )} />
                    
                    <span className="text-lg filter grayscale group-hover:grayscale-0 transition-all duration-300 shrink-0 group-hover:scale-110">
                      {service.icon || '📦'}
                    </span>
                    
                    {isOpen && (
                      <div className="flex-1 flex flex-col items-start overflow-hidden min-w-0">
                        <span className="font-medium tracking-tight truncate w-full font-sans">{service.name}</span>
                        <span className="text-[9px] text-slate-600 font-mono uppercase tracking-wider">
                          {service.port ? `:${service.port}` : 'internal'}
                        </span>
                      </div>
                    )}
                    
                    {isOpen && service.publicUrl && (
                      <ExternalLink size={12} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-all shrink-0 group-hover:text-emerald-400" />
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
            onClick={() => setActiveRoomId('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all whitespace-nowrap",
              activeRoomId === 'settings'
                ? "bg-white/10 text-white border border-white/10"
                : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
            )}
          >
            <Settings size={18} />
            {isOpen && (
              <div className="flex-1 text-left">
                <span className="font-medium tracking-tight block">Settings</span>
                <span className="text-[10px] text-slate-600 block">Configuration</span>
              </div>
            )}
          </motion.button>
        </div>
      </nav>

      {/* Footer Stats */}
      <div className="p-4 border-t border-white/10 shrink-0 space-y-4 bg-slate-900/40">
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 border border-white/10 backdrop-blur-sm shadow-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20">
                  <Activity size={12} className="text-emerald-400" />
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Nodes</span>
              </div>
              <div className="text-xl font-mono font-bold text-white font-mono-data">
                {healthyCount}<span className="text-slate-600 text-sm">/{totalCount}</span>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 border border-white/10 backdrop-blur-sm shadow-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-blue-500/20">
                  <Shield size={12} className="text-blue-400" />
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Health</span>
              </div>
              <div className="text-xl font-mono font-bold text-emerald-400 font-mono-data">
                {totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0}%
              </div>
            </motion.div>
          </motion.div>
        )}
        
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: isAutoWorkActive ? "0 0 30px rgba(16,185,129,0.3)" : "0 0 20px rgba(255,255,255,0.05)" }}
          whileTap={{ scale: 0.98 }}
          onClick={toggleAutoWork}
          className={cn(
            "w-full h-12 rounded-xl font-bold text-[10px] transition-all flex items-center justify-center gap-2 uppercase tracking-widest font-sans",
            isAutoWorkActive
              ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-500/30"
              : "bg-gradient-to-r from-slate-800 to-slate-700 text-slate-300 border border-white/10 hover:border-white/20"
          )}
        >
          {isAutoWorkActive ? <Pause size={14} /> : <Play size={14} />}
          {isOpen && (isAutoWorkActive ? 'Pause Fleet' : 'Start Fleet')}
          {!isOpen && (isAutoWorkActive ? 'On' : 'Off')}
        </motion.button>
        
        {isOpen && (
          <div className="flex items-center justify-center gap-2 text-[9px] text-slate-600 font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>System Operational</span>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
