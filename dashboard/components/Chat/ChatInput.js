/**
 * ChatInput.js
 * Input component with command support and autocomplete
 * Supports /workflow, /status, /help commands
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Command, X, ChevronRight } from 'lucide-react';
import { COMMANDS } from './useChat';

// Command suggestions
const COMMAND_SUGGESTIONS = Object.entries(COMMANDS).map(([key, cmd]) => ({
  prefix: cmd.prefix,
  description: cmd.description,
  key,
}));

export default function ChatInput({ onSend, isLoading, inputRef: externalInputRef }) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const internalInputRef = useRef(null);
  const inputRef = externalInputRef || internalInputRef;

  // Filter suggestions based on input
  const filteredSuggestions = input.startsWith('/')
    ? COMMAND_SUGGESTIONS.filter((cmd) =>
        cmd.prefix.toLowerCase().startsWith(input.toLowerCase())
      )
    : [];

  // Show suggestions when typing /
  useEffect(() => {
    if (input.startsWith('/')) {
      setShowSuggestions(true);
      setSelectedSuggestion(0);
    } else {
      setShowSuggestions(false);
    }
  }, [input]);

  // Handle input change
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Handle send
  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    
    onSend(input);
    setInput('');
    setShowSuggestions(false);
  };

  // Handle key press
  const handleKeyDown = (e) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestion((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Tab':
        case 'Enter':
          e.preventDefault();
          const suggestion = filteredSuggestions[selectedSuggestion];
          if (suggestion) {
            setInput(suggestion.prefix + ' ');
            setShowSuggestions(false);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion.prefix + ' ');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Clear input
  const handleClear = () => {
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Command Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn z-50">
          <div className="px-3 py-2 border-b border-white/5">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              Verfügbare Befehle
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion.key}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`
                  w-full px-3 py-2.5 flex items-center gap-3 text-left
                  transition-colors duration-150
                  ${index === selectedSuggestion 
                    ? 'bg-white/10' 
                    : 'hover:bg-white/5'
                  }
                `}
              >
                <Command className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200">
                    {suggestion.prefix}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {suggestion.description}
                  </div>
                </div>
                {index === selectedSuggestion && (
                  <ChevronRight className="w-4 h-4 text-orange-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Container */}
      <div
        className={`
          relative flex items-end gap-2 
          bg-slate-900/80 backdrop-blur-xl 
          border rounded-2xl p-2
          transition-all duration-200
          ${isFocused 
            ? 'border-orange-500/50 shadow-lg shadow-orange-500/10' 
            : 'border-white/10'
          }
        `}
      >
        {/* Text Area */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Nachricht schreiben... (Tippe / für Befehle)"
          disabled={isLoading}
          rows={1}
          className="
            flex-1 bg-transparent text-sm text-slate-200 
            placeholder:text-slate-500 resize-none
            outline-none min-h-[40px] max-h-[120px]
            py-2.5 px-2
          "
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.1) transparent',
          }}
        />

        {/* Clear Button */}
        {input && (
          <button
            onClick={handleClear}
            className="
              p-2 rounded-xl text-slate-500 hover:text-slate-300
              hover:bg-white/5 transition-all duration-150
              flex-shrink-0
            "
            title="Eingabe löschen"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className={`
            p-2.5 rounded-xl flex-shrink-0
            transition-all duration-200
            ${input.trim() && !isLoading
              ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }
            active:scale-95
          `}
          title="Senden"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Hint */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">/</kbd>
            für Befehle
          </span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="hidden sm:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">↵</kbd>
            zum Senden
          </span>
        </div>
        
        {/* Character count */}
        {input.length > 0 && (
          <span className={`text-[10px] ${input.length > 1000 ? 'text-red-400' : 'text-slate-600'}`}>
            {input.length}/2000
          </span>
        )}
      </div>
    </div>
  );
}
