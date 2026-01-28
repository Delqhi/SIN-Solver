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
import { Save, Play, Loader2 } from 'lucide-react';

const initialNodes = [
  { id: '1', position: { x: 250, y: 50 }, data: { label: 'Start Mission' }, type: 'input', style: { background: '#10b981', color: '#000', border: 'none', fontWeight: '700' } },
  { id: '2', position: { x: 250, y: 150 }, data: { label: 'Navigate to URL' }, style: { background: '#111', color: '#fff', border: '1px solid #333' } },
  { id: '3', position: { x: 250, y: 250 }, data: { label: 'Detect Captcha' }, style: { background: '#111', color: '#fff', border: '1px solid #333' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#555' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#555' } },
];

export default function WorkflowBuilder() {
   const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_CODESERVER_API_URL || 'http://localhost:8080';
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
        showNotification('Workflow saved to Zimmer-16 (Supabase)', 'success');
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          borderRadius: '8px',
          background: notification.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff',
          fontWeight: '600',
          fontSize: '13px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {notification.message}
        </div>
      )}
      <header style={{ padding: '20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a' }}>
         <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Workflow Architect</h2>
            <p style={{ fontSize: '12px', color: '#666' }}>Design agent behavior logic visually.</p>
         </div>
         <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: saving ? '#333' : '#222', border: '1px solid #333', color: '#fff', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer' }}
            >
               {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />} {saving ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={handleTestRun}
              disabled={testing}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: testing ? '#2a8ac4' : '#38bdf8', border: 'none', color: '#000', borderRadius: '6px', cursor: testing ? 'not-allowed' : 'pointer', fontWeight: '600' }}
            >
               {testing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />} {testing ? 'Running...' : 'Test Run'}
            </button>
         </div>
      </header>
      <div style={{ flex: 1, background: '#000' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background color="#222" gap={16} />
          <Controls style={{ fill: '#fff', backgroundColor: '#111', borderColor: '#333' }} />
          <MiniMap style={{ backgroundColor: '#111' }} nodeColor={() => '#333'} />
        </ReactFlow>
      </div>
    </div>
  );
}
