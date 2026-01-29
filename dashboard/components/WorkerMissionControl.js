import React, { useState, useEffect } from 'react';
import { Play, Pause, Activity, TrendingUp, AlertTriangle, Loader2, Zap, DollarSign, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

import { API_URL } from '../lib/config';

export default function WorkerMissionControl({ isAutoWorkActive }) {
   const [stats, setStats] = useState(null);

   const showNotification = (message, type = 'success') => {
     setNotification({ message, type });
     setTimeout(() => setNotification(null), 4000);
   };

   const handleScaleFleet = async () => {
     setScaling(true);
     try {
       const res = await fetch(`${API_URL_LOCAL}/api/workers/scale`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ action: 'scale_up', count: 1 })
       });
       if (res.ok) {
         const data = await res.json();
         showNotification(`Fleet scaled: ${data.message || 'Worker added successfully'}`, 'success');
         fetchTelemetry();
       } else {
         const error = await res.json().catch(() => ({ error: 'Scale operation failed' }));
         showNotification(error.error || 'Failed to scale fleet', 'error');
       }
     } catch (e) {
       console.error('Scale fleet error:', e);
       showNotification('Error connecting to Orchestrator', 'error');
     } finally {
       setScaling(false);
     }
   };

   const fetchTelemetry = async () => {
     try {
      const [resStats, resWorkers] = await Promise.all([
          fetch(`${API_URL_LOCAL}/api/analytics/dashboard`),
          fetch(`${API_URL_LOCAL}/api/workers/`)
      ]);
      
      if (resStats.ok) setStats(await resStats.json());
      if (resWorkers.ok) setWorkers(await resWorkers.json());
    } catch (e) {
      console.error("Telemetry fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const itv = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(itv);
  }, []);

  const overview = stats?.overview || { total_solves: 0, total_revenue: 0 };
  const chartData = stats?.history || [];

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto space-y-10 bg-black min-h-full relative overflow-y-auto">
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "fixed top-6 right-6 px-6 py-3 rounded-2xl border backdrop-blur-xl z-[100] shadow-2xl flex items-center gap-3",
              notification.type === 'success' 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-red-500/10 border-red-500/20 text-red-400"
            )}
          >
            {notification.type === 'success' ? <Zap size={16} /> : <AlertTriangle size={16} />}
            <span className="text-xs font-bold uppercase tracking-widest">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-300 to-slate-500 bg-clip-text text-transparent">
            Mission Control
          </h1>
          <p className="text-slate-500 mt-2 font-mono text-[10px] uppercase tracking-[0.3em]">
            Real-time Telemetry // Active Worker Fleet
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 px-6 py-3 rounded-2xl text-center min-w-[140px]">
            <div className="text-2xl font-mono font-bold text-emerald-400 tracking-tighter">
              {overview.total_solves.toLocaleString()}
            </div>
            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1 flex items-center justify-center gap-1">
              <Target size={10} /> Total Solved
            </div>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 px-6 py-3 rounded-2xl text-center min-w-[140px]">
            <div className="text-2xl font-mono font-bold text-yellow-500 tracking-tighter">
              ${overview.total_revenue.toFixed(2)}
            </div>
            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1 flex items-center justify-center gap-1">
              <DollarSign size={10} /> Earnings
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/30 backdrop-blur-xl border border-white/5 p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
            <TrendingUp size={200} />
          </div>
          
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-500" />
              Performance Metrics
            </h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-mono text-slate-500 uppercase">Solved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] font-mono text-slate-500 uppercase">Failed</span>
              </div>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartData.length > 0 ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    fontFamily="JetBrains Mono"
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    fontFamily="JetBrains Mono"
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(12px)',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono'
                    }} 
                  />
                  <Bar dataKey="solved" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="w-12 h-12 border-2 border-slate-800 border-t-slate-600 rounded-full animate-spin" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-600">Awaiting data flow...</span>
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/30 backdrop-blur-xl border border-white/5 p-8 rounded-3xl flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={14} className="text-emerald-500" />
              Live Fleet Status
            </h3>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-mono font-bold border border-emerald-500/20">
              {workers.length} ACTIVE
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
            {workers.map((w, idx) => (
              <motion.div 
                key={w.id} 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex justify-between items-center p-4 bg-black/40 border border-white/5 rounded-2xl hover:bg-white/5 transition-colors group"
              >
                <div className="space-y-1">
                  <div className="font-bold text-xs text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">
                    {w.name.split('-').pop()}
                  </div>
                  <div className="text-[9px] font-mono text-slate-600 uppercase tracking-tighter">ID: {w.id.substring(0, 12)}...</div>
                </div>
                <div className="text-right space-y-1">
                  <div className={cn(
                    "text-[10px] font-mono font-bold tracking-tighter",
                    w.status === 'RUNNING' ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {w.status}
                  </div>
                  <div className="text-[8px] font-mono text-slate-700 truncate max-w-[100px]">{w.image}</div>
                </div>
              </motion.div>
            ))}
            {workers.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center space-y-4">
                <div className="p-4 rounded-full bg-slate-900/50 border border-white/5">
                  <Activity size={24} className="text-slate-700" />
                </div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600">No workers detected</p>
              </div>
            )}
          </div>

          <button 
            onClick={handleScaleFleet}
            disabled={scaling}
            className={cn(
              "w-full mt-8 h-12 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border shadow-lg",
              scaling 
                ? "bg-slate-800 border-white/5 text-slate-500 cursor-not-allowed" 
                : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 shadow-white/5"
            )}
          >
             {scaling ? (
               <Loader2 size={14} className="animate-spin" />
             ) : (
               <Zap size={14} className="text-yellow-500" />
             )}
             {scaling ? 'Scaling Fleet...' : 'Scale Worker Fleet'}
          </button>
        </div>
      </div>
    </div>
  );
}
