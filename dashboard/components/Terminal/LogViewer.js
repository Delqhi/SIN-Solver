import { useEffect, useRef, useState } from 'react';

export default function LogViewer({ containerId, containerName, onClose }) {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!containerId) return;

    setLogs([]);
    setConnected(false);
    setError(null);

    const eventSource = new EventSource(`/api/docker/logs?containerId=${containerId}`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.log) {
        setLogs((prev) => [...prev, data.log].slice(-500));
      } else if (data.error) {
        setError(data.error);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setError('Connection lost. Reconnecting...');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [containerId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-5xl h-[80vh] rounded-xl border border-slate-700 flex flex-col shadow-2xl overflow-hidden">
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <h3 className="font-mono text-sm font-bold text-slate-300">
              logs: {containerName || containerId}
              {connected && <span className="ml-2 text-green-500 animate-pulse">● LIVE</span>}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex-1 p-4 font-mono text-xs overflow-y-auto bg-black text-green-400 selection:bg-green-900 selection:text-white"
        >
          {logs.length === 0 && !error && (
            <div className="text-slate-600 italic">Waiting for logs...</div>
          )}
          {error && (
            <div className="text-red-500 mb-2">Error: {error}</div>
          )}
          {logs.map((log, i) => (
            <div key={i} className="whitespace-pre-wrap break-all mb-0.5">
              {log}
            </div>
          ))}
        </div>

        <div className="bg-slate-800 p-2 border-t border-slate-700 text-[10px] text-slate-500 flex justify-between">
          <span>Container ID: {containerId}</span>
          <span>Lines: {logs.length}</span>
        </div>
      </div>
    </div>
  );
}
