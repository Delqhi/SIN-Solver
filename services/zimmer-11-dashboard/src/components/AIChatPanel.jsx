import React, { useState, useRef, useEffect } from 'react';
import { surveyApi } from '../api/surveyApi';

const QUICK_ACTIONS = [
  { label: '🔧 Troubleshoot', prompt: 'Help me troubleshoot my survey workers' },
  { label: '📈 Optimize', prompt: 'How can I optimize my earnings?' },
  { label: '🍪 Cookie Help', prompt: 'How do I import cookies for a platform?' },
  { label: '🔒 Ban Prevention', prompt: 'How do I avoid bans on survey platforms?' }
];

function AIChatPanel() {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hello! I\'m the SIN-Survey AI Assistant. I use 100% FREE AI providers (OpenCode Zen, Gemini, Mistral). How can I help you today?', 
      provider: 'system' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText) => {
    const text = messageText || input;
    if (!text.trim() || loading) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await surveyApi.chat(text, {});

      const assistantMessage = {
        role: 'assistant',
        content: response.response || response.message || 'Sorry, I couldn\'t process that request.',
        provider: response.provider || 'unknown'
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}. Make sure the API is running on port 8018.`,
        provider: 'error'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (prompt) => {
    sendMessage(prompt);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
      <div className="page-header">
        <h2>💬 AI Survey Assistant</h2>
        <span style={{ 
          background: 'rgba(16, 185, 129, 0.2)', 
          color: 'var(--accent-green)', 
          padding: '4px 12px', 
          borderRadius: '20px',
          fontSize: '0.875rem'
        }}>
          100% FREE AI
        </span>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        background: 'var(--bg-secondary)', 
        borderRadius: '12px', 
        padding: '20px',
        marginBottom: '16px'
      }}>
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            style={{ 
              display: 'flex', 
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '16px'
            }}
          >
            <div style={{ 
              maxWidth: '70%',
              background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-card)',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              {msg.provider && msg.role === 'assistant' && msg.provider !== 'system' && (
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)', 
                  marginTop: '8px',
                  fontStyle: 'italic'
                }}>
                  via {msg.provider}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '12px 20px', 
              borderRadius: '16px 16px 16px 4px' 
            }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <span className="typing-dot" style={{ 
                  width: '8px', 
                  height: '8px', 
                  background: 'var(--text-secondary)', 
                  borderRadius: '50%',
                  animation: 'typing 1s infinite'
                }}></span>
                <span className="typing-dot" style={{ 
                  width: '8px', 
                  height: '8px', 
                  background: 'var(--text-secondary)', 
                  borderRadius: '50%',
                  animation: 'typing 1s infinite 0.2s'
                }}></span>
                <span className="typing-dot" style={{ 
                  width: '8px', 
                  height: '8px', 
                  background: 'var(--text-secondary)', 
                  borderRadius: '50%',
                  animation: 'typing 1s infinite 0.4s'
                }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        flexWrap: 'wrap', 
        marginBottom: '16px' 
      }}>
        {QUICK_ACTIONS.map((action, idx) => (
          <button
            key={idx}
            className="btn btn-secondary"
            onClick={() => handleQuickAction(action.prompt)}
            disabled={loading}
          >
            {action.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask the AI Assistant..."
          disabled={loading}
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-primary"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>

      <style>{`
        @keyframes typing {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

export default AIChatPanel;
