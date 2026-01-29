import { useState, useEffect } from 'react';
import { 
  Shield, 
  Cpu, 
  Brain, 
  Play, 
  Workflow, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function CaptchaWorkerStatusCard({ onTestClick, onWorkflowClick }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/captcha/status');
      if (!response.ok) {
        throw new Error('Failed to fetch captcha status');
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setStatus({
        worker: {
          status: 'unknown',
          container: 'solver-1.1-captcha-worker',
          uptime: '0h 0m'
        },
        yolo: {
          trained: false,
          model: 'best.pt',
          version: 'v8.4.7',
          classes: 12
        },
        ocr: {
          engine: 'ddddocr',
          status: 'ready',
          languages: ['en', 'de']
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getWorkerStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'running':
        return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'stopped':
      case 'error':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      default:
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'running':
        return <CheckCircle className="w-4 h-4" />;
      case 'stopped':
      case 'error':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading && !status) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 px-6 py-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Captcha Worker</h3>
              <p className="text-xs text-slate-400">solver-1.1-captcha-worker</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getWorkerStatusColor(status?.worker?.status)}`}>
            {getStatusIcon(status?.worker?.status)}
            <span className="text-sm font-medium capitalize">{status?.worker?.status || 'Unknown'}</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">YOLO Model</p>
              <p className="text-xs text-slate-400">{status?.yolo?.version || 'v8.4.7'} • {status?.yolo?.classes || 12} classes</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
            status?.yolo?.trained 
              ? 'bg-green-400/10 text-green-400 border border-green-400/30' 
              : 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30'
          }`}>
            {status?.yolo?.trained ? (
              <><CheckCircle className="w-3 h-3" /> Trained</>
            ) : (
              <><AlertCircle className="w-3 h-3" /> Not Trained</>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">OCR Engine</p>
              <p className="text-xs text-slate-400">{status?.ocr?.engine || 'ddddocr'} • {status?.ocr?.languages?.join(', ') || 'en, de'}</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
            status?.ocr?.status === 'ready'
              ? 'bg-green-400/10 text-green-400 border border-green-400/30'
              : 'bg-red-400/10 text-red-400 border border-red-400/30'
          }`}>
            {status?.ocr?.status === 'ready' ? (
              <><CheckCircle className="w-3 h-3" /> Ready</>
            ) : (
              <><XCircle className="w-3 h-3" /> Error</>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <div className="w-5 h-5 flex items-center justify-center text-orange-400 text-xs font-bold">⏱</div>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Uptime</p>
              <p className="text-xs text-slate-400">Container running time</p>
            </div>
          </div>
          <span className="text-sm font-mono text-slate-300">{status?.worker?.uptime || '0h 0m'}</span>
        </div>
      </div>

      <div className="px-6 pb-6 grid grid-cols-2 gap-3">
        <button
          onClick={onTestClick}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
        >
          <Play className="w-4 h-4" />
          Test Captcha
        </button>
        <button
          onClick={onWorkflowClick}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
        >
          <Workflow className="w-4 h-4" />
          Create Workflow
        </button>
      </div>

      {error && (
        <div className="px-6 pb-4">
          <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
            <p className="text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
