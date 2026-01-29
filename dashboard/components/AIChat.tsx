import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Settings, Terminal, Code, GitBranch, FileText, Cpu, Activity, Database, Save, MessageSquare, Zap, Shield, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp?: number;
  status?: 'pending' | 'success' | 'error';
  isCode?: boolean;
}

interface CommandSuggestion {
  command: string;
  description: string;
  icon: React.ReactNode;
}

const COMMANDS: CommandSuggestion[] = [
  { command: '/code', description: 'Execute coding task', icon: <Code size={14} /> },
  { command: '/code-status', description: 'Check task status', icon: <Activity size={14} /> },
  { command: '/code-cancel', description: 'Cancel task', icon: <X size={14} /> },
  { command: '/tasks', description: 'List all tasks', icon: <Terminal size={14} /> },
  { command: '/conversations', description: 'List conversations', icon: <MessageSquare size={14} /> },
  { command: '/conversation', description: 'Show conversation', icon: <MessageSquare size={14} /> },
  { command: '/conversation-new', description: 'Create new conversation', icon: <MessageSquare size={14} /> },
  { command: '/conversation-delete', description: 'Delete conversation', icon: <X size={14} /> },
  { command: '/files', description: 'List files', icon: <FileText size={14} /> },
  { command: '/file-read', description: 'Read file', icon: <FileText size={14} /> },
  { command: '/file-write', description: 'Write file', icon: <FileText size={14} /> },
  { command: '/git-status', description: 'Show git status', icon: <GitBranch size={14} /> },
  { command: '/git-commit', description: 'Create commit', icon: <GitBranch size={14} /> },
  { command: '/git-diff', description: 'Show diff', icon: <GitBranch size={14} /> },
  { command: '/git-log', description: 'Show log', icon: <GitBranch size={14} /> },
  { command: '/workspaces', description: 'List workspaces', icon: <Database size={14} /> },
  { command: '/workspace', description: 'Current workspace', icon: <Database size={14} /> },
  { command: '/workspace-switch', description: 'Switch workspace', icon: <Database size={14} /> },
  { command: '/models', description: 'List models', icon: <Cpu size={14} /> },
  { command: '/model', description: 'Current model', icon: <Cpu size={14} /> },
  { command: '/model-switch', description: 'Switch model', icon: <Cpu size={14} /> },
  { command: '/config', description: 'Show config', icon: <Settings size={14} /> },
  { command: '/agents', description: 'List agents', icon: <Settings size={14} /> },
  { command: '/agent', description: 'Switch agent', icon: <Settings size={14} /> },
  { command: '/sessions', description: 'List sessions', icon: <Save size={14} /> },
  { command: '/session-save', description: 'Save session', icon: <Save size={14} /> },
  { command: '/session-restore', description: 'Restore session', icon: <Save size={14} /> },
  { command: '/logs', description: 'Show logs', icon: <Terminal size={14} /> },
  { command: '/metrics', description: 'Show metrics', icon: <Activity size={14} /> },
];

const CODESERVER_API_URL = process.env.NEXT_PUBLIC_CODESERVER_API_URL || 'https://codeserver.delqhi.com';

const AIChat: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
}> = ({ isOpen, onClose, apiUrl }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: '🚀 Empire Control Online. Awaiting CEO directives. Type / for commands.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAgents, setShowAgents] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (input.startsWith('/')) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }
  }, [input]);

  const executeCommand = async (commandStr: string) => {
    const parts = commandStr.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1).join(' ');

    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (cmd) {
      case '/code':
        endpoint = '/code';
        method = 'POST';
        body = { prompt: args };
        break;
      case '/code-status':
        endpoint = `/code/status/${args}`;
        break;
      case '/code-cancel':
        endpoint = `/code/cancel/${args}`;
        method = 'POST';
        break;
      case '/tasks':
        endpoint = '/tasks';
        break;
      case '/conversations':
        endpoint = '/conversations';
        break;
      case '/conversation':
        endpoint = `/conversations/${args}`;
        break;
      case '/conversation-new':
        endpoint = '/conversations';
        method = 'POST';
        break;
      case '/conversation-delete':
        endpoint = `/conversations/${args}`;
        method = 'DELETE';
        break;
      case '/files':
        endpoint = `/files?path=${encodeURIComponent(args || '.')}`;
        break;
      case '/file-read':
        endpoint = `/files/${encodeURIComponent(args)}`;
        break;
      case '/file-write':
        const [filePath, ...contentParts] = args.split(' ');
        endpoint = `/files/${encodeURIComponent(filePath)}`;
        method = 'POST';
        body = { content: contentParts.join(' ') };
        break;
      case '/git-status':
        endpoint = '/git/status';
        break;
      case '/git-commit':
        endpoint = '/git/commit';
        method = 'POST';
        body = { message: args };
        break;
      case '/git-diff':
        endpoint = '/git/diff';
        break;
      case '/git-log':
        endpoint = '/git/log';
        break;
      case '/workspaces':
        endpoint = '/workspaces';
        break;
      case '/workspace':
        endpoint = '/workspace';
        break;
      case '/workspace-switch':
        endpoint = `/workspace/switch/${args}`;
        method = 'POST';
        break;
      case '/models':
        endpoint = '/models';
        break;
      case '/model':
        endpoint = '/model';
        break;
      case '/model-switch':
        endpoint = `/model/switch/${args}`;
        method = 'POST';
        break;
      case '/config':
        endpoint = '/config';
        break;
      case '/agents':
        endpoint = '/agents';
        break;
      case '/agent':
        endpoint = `/agents/switch/${args}`;
        method = 'POST';
        break;
      case '/sessions':
        endpoint = '/sessions';
        break;
      case '/session-save':
        endpoint = '/sessions/save';
        method = 'POST';
        break;
      case '/session-restore':
        endpoint = `/sessions/restore/${args}`;
        method = 'POST';
        break;
      case '/logs':
        endpoint = `/logs${args ? `/${args}` : ''}`;
        break;
      case '/metrics':
        endpoint = '/metrics';
        break;
      default:
        return { error: 'Unknown command' };
    }

    try {
      const apiEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api${endpoint}`;
      const response = await fetch(`${CODESERVER_API_URL}${apiEndpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return await response.json();
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setShowCommands(false);

    if (currentInput.startsWith('/')) {
      const result = await executeCommand(currentInput);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        timestamp: Date.now(),
        status: result.error ? 'error' : 'success',
        isCode: true
      }]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${CODESERVER_API_URL}/api/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentInput,
          context: messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.task_id) {
          setMessages(prev => [...prev, {
            role: 'ai',
            content: `🚀 Task queued!\n\n📋 Task ID: ${data.task_id}\n\n💡 Use \`/code-status ${data.task_id}\` to check progress.\n\n⏳ Processing your request...`,
            timestamp: Date.now(),
            status: 'success',
            isCode: true
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'ai',
            content: data.content || data.message || JSON.stringify(data, null, 2),
            timestamp: Date.now(),
            status: 'success'
          }]);
        }
      } else {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `❌ Error: ${error.message}\n\n💡 Try using a slash command like \`/code <your request>\` for coding tasks.`,
        timestamp: Date.now(),
        status: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (msg: ChatMessage) => {
    if (msg.isCode) {
      return (
        <pre className="bg-black/60 p-4 rounded-xl border border-white/5 overflow-x-auto font-mono text-[10px] text-emerald-400 leading-relaxed">
          <code>{msg.content}</code>
        </pre>
      );
    }
    return msg.content;
  };

  if (!isOpen) return null;

  return (
    <motion.aside 
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      className="fixed right-0 top-0 w-[400px] h-screen bg-black/80 backdrop-blur-2xl border-l border-white/5 flex flex-col shadow-2xl z-[150]"
    >
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-5 bg-slate-900/20">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-bold text-slate-100 uppercase tracking-[0.2em]">AI Command Interface</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAgents(!showAgents)}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-slate-500 hover:text-white"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-slate-500 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {showAgents && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="border-b border-white/5 bg-slate-900/10 overflow-hidden p-4 space-y-3"
        >
          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Active Intelligence Units</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'Skyvern', icon: '👁️' },
              { name: 'Steel', icon: '🔧' },
              { name: 'Stagehand', icon: '🎭' },
              { name: 'ClawdBot', icon: '🐱' },
              { name: 'Agent Zero', icon: '🤖' },
              { name: 'OpenCode', icon: '⚡' }
            ].map(agent => (
              <button
                key={agent.name}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-xs border border-white/5"
                onClick={() => {
                  setMessages(prev => [...prev, {
                    role: 'ai',
                    content: `🔗 Establishing neural link to ${agent.name}...`,
                    timestamp: Date.now()
                  }]);
                  setShowAgents(false);
                }}
              >
                <span className="text-sm">{agent.icon}</span>
                <span className="font-medium">{agent.name}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex",
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed border",
                msg.role === 'user'
                  ? "bg-emerald-600/10 border-emerald-500/20 text-emerald-100"
                  : msg.status === 'error'
                  ? "bg-red-900/20 border-red-500/20 text-red-200"
                  : "bg-white/5 border-white/5 text-slate-200",
                msg.isCode && "w-full max-w-full"
              )}
            >
              {renderMessageContent(msg)}
              {msg.status === 'pending' && (
                <div className="flex items-center gap-2 mt-3 text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
                  <RefreshCw size={10} className="animate-spin" /> Processing Shard...
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <AnimatePresence>
        {showCommands && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-24 left-4 right-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto"
          >
            <div className="p-3 border-b border-white/5 bg-black/40 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              System Commands
            </div>
            {COMMANDS.filter(c => c.command.startsWith(input)).map(c => (
              <button
                key={c.command}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 text-left transition-all group"
                onClick={() => {
                  setInput(c.command + ' ');
                  setShowCommands(false);
                }}
              >
                <span className="text-slate-500 group-hover:text-emerald-400 transition-colors">
                  {c.icon}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-bold text-slate-200">{c.command}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{c.description}</span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 border-t border-white/5 bg-slate-900/10 backdrop-blur-md">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Issue directive..."
            className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/10 transition-all"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-emerald-600/90 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl p-3 transition-all shadow-lg shadow-emerald-900/20"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-4 text-[9px] text-slate-600 font-mono uppercase tracking-widest">
          <Shield size={10} /> Secure Neural Link Active
        </div>
      </div>
    </motion.aside>
  );
};

export default AIChat;
