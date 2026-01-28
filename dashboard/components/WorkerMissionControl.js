import React, { useState, useEffect } from 'react';
import { Play, Pause, Activity, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function WorkerMissionControl({ isAutoWorkActive }) {
   const [stats, setStats] = useState(null);
   const [workers, setWorkers] = useState([]);
   const [loading, setLoading] = useState(true);
   const [scaling, setScaling] = useState(false);
   const [notification, setNotification] = useState(null);
   const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_CODESERVER_API_URL || 'http://localhost:8080';

   const showNotification = (message, type = 'success') => {
     setNotification({ message, type });
     setTimeout(() => setNotification(null), 4000);
   };

   const handleScaleFleet = async () => {
     setScaling(true);
     try {
       const res = await fetch(`${API_URL}/api/workers/scale`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ action: 'scale_up', count: 1 })
       });
       if (res.ok) {
         const data = await res.json();
         showNotification(`Fleet scaled: ${data.message || 'Worker added successfully'}`, 'success');
         fetchTelemetry(); // Refresh worker list
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
          fetch(`${API_URL}/api/analytics/dashboard`),
          fetch(`${API_URL}/api/workers/`)
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
  const chartData = stats?.history || []; // We might need to map history to chart format

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', height: '100%', overflowY: 'auto', position: 'relative' }}>
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
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Mission Control</h1>
          <p style={{ color: '#666' }}>Real-time telemetry of the active worker fleet.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
           <div style={{ background: '#111', padding: '12px 24px', borderRadius: '8px', border: '1px solid #222', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{overview.total_solves.toLocaleString()}</div>
              <div style={{ fontSize: '11px', color: '#666', fontWeight: '600' }}>TOTAL SOLVED</div>
           </div>
           <div style={{ background: '#111', padding: '12px 24px', borderRadius: '8px', border: '1px solid #222', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#facc15' }}>${overview.total_revenue.toFixed(2)}</div>
              <div style={{ fontSize: '11px', color: '#666', fontWeight: '600' }}>EARNINGS</div>
           </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '40px' }}>
         <div style={{ background: '#111', padding: '24px', borderRadius: '12px', border: '1px solid #222', height: '300px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <TrendingUp size={16} /> Performance Metrics
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              {chartData.length > 0 ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="name" stroke="#444" fontSize={12} />
                  <YAxis stroke="#444" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                  <Legend />
                  <Bar dataKey="solved" fill="#10b981" name="Solved" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#444' }}>
                  Awaiting real-time data flow...
                </div>
              )}
            </ResponsiveContainer>
         </div>

         <div style={{ background: '#111', padding: '24px', borderRadius: '12px', border: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Activity size={16} /> Live Fleet Status
            </h3>
            <div style={{ flex: 1, overflowY: 'auto' }}>
               {workers.map(w => (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '12px', background: '#1a1a1a', borderRadius: '8px' }}>
                     <div>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{w.name.split('-').pop()}</div>
                        <div style={{ fontSize: '11px', color: '#666' }}>ID: {w.id}</div>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                        <div style={{ color: w.status === 'RUNNING' ? '#10b981' : '#ef4444', fontSize: '12px', fontWeight: '600' }}>
                           {w.status}
                        </div>
                        <div style={{ fontSize: '10px', color: '#444' }}>{w.image}</div>
                     </div>
                  </div>
               ))}
               {workers.length === 0 && <p style={{ textAlign: 'center', color: '#444', fontSize: '12px' }}>No workers detected in fleet.</p>}
            </div>
            <button 
              onClick={handleScaleFleet}
              disabled={scaling}
              style={{ width: '100%', marginTop: '16px', padding: '10px', background: scaling ? '#333' : '#222', border: '1px solid #333', color: '#fff', borderRadius: '6px', cursor: scaling ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
               {scaling ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Scaling...</> : '+ Scale Worker Fleet'}
             </button>
         </div>
      </div>
    </div>
  );
}
