import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Settings } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp?: number;
  status?: 'pending' | 'success' | 'error';
}

interface OperationStep {
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  details?: string;
}

const AIChat: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
}> = ({ isOpen, onClose, apiUrl }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: '🚀 Empire Control Online. Awaiting CEO directives.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAgents, setShowAgents] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

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
              }`}
            >
              {msg.content}
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
