/**
 * ChatSidebar.js
 * Main sidebar component for AI chat with autonomous workflow correction
 * Features: Collapsible, message history, commands, auto-scroll
 */

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Zap,
  Bot,
  Settings,
  MoreVertical
} from 'lucide-react';
import useChat, { MESSAGE_TYPES } from './useChat';
import ChatMessage, { TypingIndicator } from './ChatMessage';
import ChatInput from './ChatInput';

// Welcome message
const WELCOME_MESSAGE = {
  id: 'welcome',
  type: MESSAGE_TYPES.AI,
  content: '**Willkommen beim SIN-Solver AI Assistant!**\n\nIch kann dir helfen:\n• Workflows zu überwachen und zu korrigieren\n• System-Status zu prüfen\n• Fehler automatisch zu beheben\n\n**Tippe `/help` für alle Befehle.**',
  timestamp: new Date(),
};

// Quick action buttons
const QUICK_ACTIONS = [
  { label: '/workflow', icon: Zap, description: 'Workflows anzeigen' },
  { label: '/status', icon: Bot, description: 'System-Status' },
  { label: '/help', icon: MessageSquare, description: 'Hilfe' },
];

export default function ChatSidebar({ 
  isOpen: controlledIsOpen, 
  onToggle,
  className = '' 
}) {
  // State
  const [isOpen, setIsOpen] = useState(controlledIsOpen ?? true);
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Chat hook
  const {
    messages,
    isLoading,
    isTyping,
    messagesEndRef,
    inputRef,
    sendMessage,
    handleAction,
    simulateWorkflowError,
    clearMessages,
    addMessage,
  } = useChat();

  // Sync with controlled state
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  // Check mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show mobile overlay when opening on mobile
  useEffect(() => {
    if (isMobile && isOpen) {
      setShowMobileOverlay(true);
    } else {
      setShowMobileOverlay(false);
    }
  }, [isMobile, isOpen]);

  // Add welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      addMessage(WELCOME_MESSAGE);
    }
  }, []);

  // Toggle sidebar
  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  };

  // Handle quick action
  const handleQuickAction = (label) => {
    sendMessage(label);
  };

  // Sidebar width
  const sidebarWidth = isOpen ? (isMobile ? '100%' : '360px') : '0px';

  return (
    <>
      {/* Mobile Overlay */}
      {showMobileOverlay && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
          onClick={handleToggle}
        />
      )}

      {/* Toggle Button (when closed) */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className="
            fixed right-4 bottom-4 z-50
            w-14 h-14 rounded-2xl
            bg-gradient-to-br from-orange-500 to-orange-600
            text-white shadow-2xl shadow-orange-500/30
            flex items-center justify-center
            transition-all duration-300 hover:scale-110 hover:shadow-orange-500/50
            active:scale-95
          "
          title="Chat öffnen"
        >
          <MessageSquare className="w-6 h-6" />
          {messages.length > 1 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
              {messages.length - 1}
            </span>
          )}
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`
          ${isMobile ? 'fixed inset-y-0 right-0 z-50' : 'relative'}
          ${className}
          transition-all duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
        style={{ width: isMobile ? '100%' : sidebarWidth }}
      >
        <div className="h-full flex flex-col bg-slate-950/95 backdrop-blur-2xl border-l border-white/10">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-slate-400">Online</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Demo: Trigger workflow error */}
              <button
                onClick={simulateWorkflowError}
                className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200"
                title="Demo: Workflow-Fehler simulieren"
              >
                <Zap className="w-4 h-4" />
              </button>

              {/* Clear chat */}
              <button
                onClick={clearMessages}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                title="Chat löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                onClick={handleToggle}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                title="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onAction={handleAction}
              />
            ))}
            
            {isTyping && <TypingIndicator />}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 2 && (
            <div className="px-4 py-3 border-t border-white/5">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">
                Schnellaktionen
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.label)}
                    className="
                      flex items-center gap-2 px-3 py-1.5
                      bg-white/5 hover:bg-white/10
                      border border-white/10 hover:border-white/20
                      rounded-lg text-xs text-slate-300
                      transition-all duration-200
                    "
                  >
                    <action.icon className="w-3.5 h-3.5 text-orange-400" />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-slate-900/30">
            <ChatInput
              onSend={sendMessage}
              isLoading={isLoading}
              inputRef={inputRef}
            />
          </div>
        </div>
      </div>

      {/* Collapsed State Indicator (Desktop only) */}
      {!isOpen && !isMobile && (
        <button
          onClick={handleToggle}
          className="
            fixed right-0 top-1/2 -translate-y-1/2 z-40
            w-8 h-32
            bg-slate-900/80 backdrop-blur-xl
            border-y border-l border-white/10
            rounded-l-2xl
            flex items-center justify-center
            text-slate-400 hover:text-white
            transition-all duration-200
            hover:bg-slate-800/80
          "
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
    </>
  );
}

// Compact version for integration into existing layouts
export function ChatSidebarCompact({ isOpen, onToggle }) {
  return (
    <ChatSidebar 
      isOpen={isOpen} 
      onToggle={onToggle}
      className="h-screen"
    />
  );
}

// Floating chat button for minimal integration
export function ChatButton({ onClick, unreadCount = 0 }) {
  return (
    <button
      onClick={onClick}
      className="
        fixed right-4 bottom-4 z-50
        w-14 h-14 rounded-2xl
        bg-gradient-to-br from-orange-500 to-orange-600
        text-white shadow-2xl shadow-orange-500/30
        flex items-center justify-center
        transition-all duration-300 hover:scale-110
        active:scale-95
        group
      "
    >
      <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
      
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
