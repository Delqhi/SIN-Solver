import React, { useState, useCallback } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, Play, Loader2, Zap, AlertTriangle, Layout, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const initialNodes = [
  { 
    id: '1', 
    position: { x: 250, y: 50 }, 
    data: { label: 'Start Mission' }, 
    type: 'input', 
    style: { 
      background: 'rgba(16, 185, 129, 0.1)', 
      color: '#10b981', 
      border: '1px solid rgba(16, 185, 129, 0.2)', 
      borderRadius: '12px',
      fontSize: '10px',
      fontWeight: '700',
      fontFamily: 'JetBrains Mono',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      padding: '10px'
    } 
  },
  { 
    id: '2', 
    position: { x: 250, y: 150 }, 
    data: { label: 'Navigate to URL' }, 
    style: { 
      background: 'rgba(15, 23, 42, 0.6)', 
      color: '#fff', 
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      fontSize: '10px',
      fontFamily: 'JetBrains Mono',
      padding: '10px'
    } 
  },
  { 
    id: '3', 
    position: { x: 250, y: 250 }, 
    data: { label: 'Detect Captcha' }, 
    style: { 
      background: 'rgba(15, 23, 42, 0.6)', 
      color: '#fff', 
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      fontSize: '10px',
      fontFamily: 'JetBrains Mono',
      padding: '10px'
    } 
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#334155' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#334155' } },
];

import { API_URL } from '../lib/config';

export default function WorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/system/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
      });
      if (res.ok) {
        showNotification('Workflow synchronized to Zimmer-16', 'success');
      } else {
        showNotification('Failed to save workflow', 'error');
      }
    } catch (e) {
      console.error(e);
      showNotification('Error connecting to Orchestrator', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestRun = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${API_URL}/api/system/workflow/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
      });
      if (res.ok) {
        showNotification('Test run initiated on active worker unit', 'success');
      } else {
        showNotification('Failed to start test run', 'error');
      }
    } catch (e) {
      console.error(e);
      showNotification('Error connecting to Orchestrator', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden">
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

      <header className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/20 backdrop-blur-md z-10">
         <div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <Layout className="text-blue-500" size={24} />
              Workflow Architect
            </h2>
            <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.2em] mt-1">Visual Logic Designer // v1.0</p>
         </div>
         <div className="flex gap-3">
            <button 
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border",
                saving 
                  ? "bg-slate-800 border-white/5 text-slate-500 cursor-not-allowed" 
                  : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              )}
            >
               {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
               {saving ? 'Syncing...' : 'Save Logic'}
            </button>
            <button 
              onClick={handleTestRun}
              disabled={testing}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg",
                testing 
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
              )}
            >
               {testing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} 
               {testing ? 'Executing...' : 'Test Run'}
            </button>
         </div>
      </header>

      <div className="flex-1 relative bg-black">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls 
            className="bg-slate-900/80 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md" 
            showInteractive={false}
          />
          <MiniMap 
            className="bg-slate-900/80 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md"
            nodeColor={() => '#334155'}
            maskColor="rgba(0,0,0,0.5)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
