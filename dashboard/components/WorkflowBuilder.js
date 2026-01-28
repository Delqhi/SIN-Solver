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
import { Save, Play } from 'lucide-react';

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

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_URL}/api/system/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
      });
      if (res.ok) alert('Workflow saved to Zimmer-16 (Supabase).');
      else alert('Failed to save workflow.');
    } catch (e) {
      console.error(e);
      alert('Error connecting to Orchestrator.');
    }
  };

  const handleTestRun = async () => {
    try {
      const res = await fetch(`${API_URL}/api/system/workflow/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
      });
      if (res.ok) alert('Test run initiated on active worker unit.');
      else alert('Failed to start test run.');
    } catch (e) {
      console.error(e);
      alert('Error connecting to Orchestrator.');
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a' }}>
         <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Workflow Architect</h2>
            <p style={{ fontSize: '12px', color: '#666' }}>Design agent behavior logic visually.</p>
         </div>
         <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleSave}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}
            >
               <Save size={14} /> Save
            </button>
            <button 
              onClick={handleTestRun}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#38bdf8', border: 'none', color: '#000', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
               <Play size={14} /> Test Run
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
