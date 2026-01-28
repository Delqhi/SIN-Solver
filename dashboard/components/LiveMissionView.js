import React, { useState, useEffect, useRef } from 'react';
import { Eye, ExternalLink, X, Maximize, MonitorPlay } from 'lucide-react';

export default function LiveMissionView({ isOpen, onClose }) {
   const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_CODESERVER_API_URL || 'http://localhost:8080';
  const HOST = API_URL.split(':').slice(0, 2).join(':');

  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/steel/sessions`);
      if (res.ok) {
          const sessionsData = await res.json();
          // Adjust URLs for external dashboard access
          const processed = sessionsData.map(s => ({
              ...s,
              sessionViewerUrl: s.sessionViewerUrl || `${HOST}:3000/v1/sessions/${s.id}/viewer`
          }));
          setSessions(processed);
          if (processed.length > 0 && !activeSession) {
              setActiveSession(processed[0]);
          }
      }
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
      const interval = setInterval(fetchSessions, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      backdropFilter: 'blur(5px)'
    }}>
      {/* Header */}
      <div style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid #333',
        backgroundColor: '#0a0a0a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MonitorPlay size={24} color="#f472b6" />
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Live Mission View</h2>
          {activeSession && (
              <span style={{ fontSize: '12px', background: '#222', padding: '4px 8px', borderRadius: '4px', color: '#4ade80' }}>
                  SESSION: {activeSession.id.substring(0, 8)}
              </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
            <button 
                onClick={fetchSessions}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px' }}
            >
                REFRESH
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={24} />
            </button>
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Session List */}
        <div style={{ width: '250px', borderRight: '1px solid #333', backgroundColor: '#111', padding: '16px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#666', marginBottom: '12px' }}>ACTIVE SESSIONS</h3>
            {sessions.map(s => (
                <div 
                    key={s.id}
                    onClick={() => setActiveSession(s)}
                    style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: activeSession?.id === s.id ? '#222' : 'transparent',
                        border: activeSession?.id === s.id ? '1px solid #444' : '1px solid transparent',
                        cursor: 'pointer',
                        marginBottom: '8px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
                        <span style={{ fontSize: '10px', color: '#666' }}>{new Date(s.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#eee', marginBottom: '4px' }}>Worker Unit</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>ID: {s.id.substring(0, 8)}</div>
                </div>
            ))}
            {sessions.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                    No active missions.
                    <br/><br/>
                    Start a worker to see live feed.
                </div>
            )}
        </div>

        {/* Viewer */}
        <div style={{ flex: 1, backgroundColor: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {activeSession ? (
                <iframe 
                    src={activeSession.sessionViewerUrl}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Live Session"
                />
            ) : (
                <div style={{ textAlign: 'center' }}>
                    <Eye size={48} color="#333" style={{ marginBottom: '16px' }} />
                    <p style={{ color: '#666' }}>Select a session to view live feed.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
