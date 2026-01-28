import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Settings, Terminal, Code, GitBranch, FileText, Cpu, Activity, Database, Save, MessageSquare } from 'lucide-react';

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

const CODESERVER_API_URL = process.env.NEXT_PUBLIC_CODESERVER_API_URL || 'http://localhost:8041';

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
      const response = await fetch(`${apiUrl}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: 'ai',
          content: data.content,
          timestamp: Date.now(),
          status: 'success'
        }]);
      } else {
        throw new Error('API Error');
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: '❌ Connection lost. Retrying...',
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
        <pre className="bg-slate-950 p-3 rounded border border-slate-800 overflow-x-auto font-mono text-xs text-emerald-400">
          <code>{msg.content}</code>
        </pre>
      );
    }
    return msg.content;
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed right-0 top-0 w-96 h-screen bg-gradient-to-b from-slate-950 to-black border-l border-slate-700 flex flex-col shadow-2xl" style={{zIndex: 150}}>
      {/* Header */}
      <div className="h-14 border-b border-slate-700 flex items-center justify-between px-5 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-bold text-slate-100">AI COMMAND CHAT</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAgents(!showAgents)}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200"
            title="View Agents"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Agent Panel */}
      {showAgents && (
        <div className="h-40 border-b border-slate-700 bg-slate-900/30 overflow-y-auto p-3 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase">Available Agents</div>
          {[
            { name: 'Skyvern', icon: '👁️' },
            { name: 'Steel', icon: '🔧' },
            { name: 'Stagehand', icon: '🎭' },
            { name: 'ClawdBot', icon: '🐱' },
            { name: 'Agent Zero', icon: '🤖' },
            { name: 'OpenCode', icon: '⚡' },
            { name: 'n8n Manager', icon: '🔄' }
          ].map(agent => (
            <button
              key={agent.name}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm"
              onClick={() => {
                setMessages(prev => [...prev, {
                  role: 'ai',
                  content: `🔗 Connecting to ${agent.name}...`,
                  timestamp: Date.now()
                }]);
                setShowAgents(false);
              }}
            >
              {agent.icon} {agent.name}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-black/20 to-transparent">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`animate-in fade-in slide-in-from-bottom-2 ${
              msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'
            }`}
          >
            <div
              className={`max-w-sm rounded-lg px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white'
                  : msg.status === 'error'
                  ? 'bg-red-900/30 border border-red-500/30 text-red-100'
                  : 'bg-slate-800/60 border border-slate-700 text-slate-100'
              } ${msg.isCode ? 'w-full' : ''}`}
            >
              {renderMessageContent(msg)}
              {msg.status === 'pending' && (
                <span className="block text-xs mt-2 text-slate-400">⏳ Processing...</span>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showCommands && (
        <div className="absolute bottom-20 left-4 right-4 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
          <div className="p-2 border-b border-slate-800 bg-slate-950 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Available Commands
          </div>
          {COMMANDS.filter(c => c.command.startsWith(input)).map(c => (
            <button
              key={c.command}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-800 text-left transition-colors group"
              onClick={() => {
                setInput(c.command + ' ');
                setShowCommands(false);
              }}
            >
              <span className="text-slate-500 group-hover:text-emerald-400 transition-colors">
                {c.icon}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-mono text-slate-200">{c.command}</span>
                <span className="text-[10px] text-slate-500">{c.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-700 bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Ask AI or use /command..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg p-2 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">💡 AI has access to all 17 rooms and Docker orchestration</p>
      </div>
    </aside>
  );
};

export default AIChat;
