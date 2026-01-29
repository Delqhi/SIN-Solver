/**
 * ChatMessage.js
 * Individual message component with support for all message types
 * User (blue, right), AI (gray, left), System (yellow), Action (with buttons)
 */

import React, { useState } from 'react';
import { Bot, User, AlertTriangle, Wrench, CheckCircle, Clock } from 'lucide-react';

// Message type configurations
const MESSAGE_CONFIG = {
  user: {
    containerClass: 'flex justify-end',
    bubbleClass: 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm',
    icon: User,
    iconColor: 'text-blue-400',
    showTimestamp: true,
  },
  ai: {
    containerClass: 'flex justify-start',
    bubbleClass: 'bg-slate-800/80 border border-white/10 text-slate-200 rounded-2xl rounded-tl-sm',
    icon: Bot,
    iconColor: 'text-emerald-400',
    showTimestamp: true,
  },
  system: {
    containerClass: 'flex justify-center',
    bubbleClass: 'bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-xl',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    showTimestamp: false,
  },
  action: {
    containerClass: 'flex justify-start',
    bubbleClass: 'bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 text-slate-200 rounded-2xl',
    icon: Wrench,
    iconColor: 'text-orange-400',
    showTimestamp: true,
  },
};

// Format timestamp
const formatTime = (date) => {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Render markdown-like content
const renderContent = (content) => {
  if (!content) return null;

  // Split by newlines
  const lines = content.split('\n');
  
  return lines.map((line, index) => {
    // Headers
    if (line.startsWith('**') && line.endsWith(':**')) {
      return (
        <h4 key={index} className="text-sm font-semibold text-white mt-3 mb-2 first:mt-0">
          {line.replace(/\*\*/g, '')}
        </h4>
      );
    }
    
    // Bold text
    if (line.includes('**')) {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={index} className="text-sm leading-relaxed">
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      );
    }
    
    // Bullet points
    if (line.startsWith('•') || line.startsWith('-')) {
      return (
        <li key={index} className="text-sm text-slate-300 ml-4 leading-relaxed">
          {line.slice(1).trim()}
        </li>
      );
    }
    
    // Empty line
    if (line.trim() === '') {
      return <div key={index} className="h-2" />;
    }
    
    // Status indicators
    if (line.startsWith('🟢') || line.startsWith('🟡') || line.startsWith('🔴')) {
      return (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span>{line.slice(0, 2)}</span>
          <span className="text-slate-300">{line.slice(2).trim()}</span>
        </div>
      );
    }
    
    // Default text
    return (
      <p key={index} className="text-sm text-slate-300 leading-relaxed">
        {line}
      </p>
    );
  });
};

export default function ChatMessage({ message, onAction }) {
  const [isHovered, setIsHovered] = useState(false);
  const { type, content, timestamp, actions, status } = message;
  
  const config = MESSAGE_CONFIG[type] || MESSAGE_CONFIG.ai;
  const IconComponent = config.icon;

  return (
    <div
      className={`${config.containerClass} group animate-slideIn`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex gap-3 max-w-[85%] ${type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
          ${type === 'user' 
            ? 'bg-blue-500/20' 
            : type === 'system' 
              ? 'bg-amber-500/20' 
              : type === 'action'
                ? 'bg-orange-500/20'
                : 'bg-emerald-500/20'
          }
        `}>
          <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
        </div>

        {/* Message Content */}
        <div className="flex flex-col gap-1">
          {/* Bubble */}
          <div className={`
            ${config.bubbleClass}
            px-4 py-3 shadow-lg backdrop-blur-sm
            transition-all duration-200
            hover:shadow-xl
          `}>
            {/* Status Badge */}
            {status && (
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                {status === 'correcting' && (
                  <>
                    <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                    <span className="text-xs text-orange-300 font-medium">Korrigiere...</span>
                  </>
                )}
                {status === 'completed' && (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-300 font-medium">Korrigiert</span>
                  </>
                )}
              </div>
            )}

            {/* Content */}
            <div className="space-y-1">
              {renderContent(content)}
            </div>

            {/* Action Buttons */}
            {actions && actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => onAction?.(action.action, message.id, action.data)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium
                      transition-all duration-200
                      ${action.variant === 'primary'
                        ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                      }
                      active:scale-95
                    `}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timestamp */}
          {config.showTimestamp && (
            <div className={`
              flex items-center gap-1 text-[10px] text-slate-500
              transition-opacity duration-200
              ${isHovered ? 'opacity-100' : 'opacity-0'}
              ${type === 'user' ? 'justify-end' : 'justify-start'}
            `}>
              <Clock className="w-3 h-3" />
              <span>{formatTime(timestamp)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Typing indicator component
export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-3 max-w-[85%]">
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="bg-slate-800/80 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
