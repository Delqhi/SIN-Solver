import React, { useRef, useEffect } from 'react';
import { Terminal, X } from 'lucide-react';

export default function FooterTerminal({ isOpen, onToggle }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (isOpen && iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return (
    <div 
      onClick={onToggle}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '32px',
        backgroundColor: '#0a0a0a',
        borderTop: '1px solid #333',
        cursor: 'pointer',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Terminal size={14} color="#888" />
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#888' }}>
          TERMINAL
        </span>
      </div>
      <span style={{ fontSize: '14px', color: '#888' }}>▲</span>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '350px',
      backgroundColor: '#000',
      borderTop: '1px solid #333',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.5)'
    }}>
      {/* Header */}
      <div 
        style={{
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          backgroundColor: '#111',
          borderBottom: '1px solid #222',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={14} color="#4ade80" />
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#e0e0e0' }}>
            root@sin-solver-empire:/workspace
          </span>
          <span style={{ fontSize: '10px', backgroundColor: '#333', padding: '2px 6px', borderRadius: '4px', color: '#aaa' }}>
            opencode ready
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
           <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
             <X size={16} />
           </button>
        </div>
      </div>

      {/* Terminal Iframe */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe 
          ref={iframeRef}
          src="http://192.168.178.21:7681" 
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Terminal"
        />
      </div>
    </div>
  );
}
