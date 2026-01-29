/**
 * useChat.js
 * Custom hook for chat logic and state management
 * Handles messages, commands, auto-scroll, and polling simulation
 */

import { useState, useRef, useEffect, useCallback } from 'react';

// Message types
export const MESSAGE_TYPES = {
  USER: 'user',
  AI: 'ai',
  SYSTEM: 'system',
  ACTION: 'action',
};

// Available commands
export const COMMANDS = {
  WORKFLOW: {
    prefix: '/workflow',
    description: 'Zeigt aktive Workflows',
    handler: () => ({
      type: MESSAGE_TYPES.AI,
      content: '**Aktive Workflows:**\n\n🟢 **Workflow-001** - Daten-Import\n   Status: Running (12m 34s)\n   Letzter Erfolg: 98.5%\n\n🟡 **Workflow-002** - Email-Verarbeitung\n   Status: Warning (Rate Limit)\n   Letzter Erfolg: 87.2%\n\n🔴 **Workflow-003** - API-Sync\n   Status: Error (Connection Timeout)\n   Letzter Erfolg: 45.0%',
    }),
  },
  STATUS: {
    prefix: '/status',
    description: 'Zeigt System-Status',
    handler: () => ({
      type: MESSAGE_TYPES.AI,
      content: '**System Status:**\n\n🖥️ **CPU:** 34% (Normal)\n💾 **RAM:** 6.2GB / 16GB (38%)\n💽 **Disk:** 142GB / 500GB (28%)\n\n🟢 **n8n:** Online\n🟢 **Agent Zero:** Online\n🟢 **Steel Browser:** Online\n🟡 **Skyvern:** Warning (High Load)',
    }),
  },
  HELP: {
    prefix: '/help',
    description: 'Zeigt verfügbare Befehle',
    handler: () => ({
      type: MESSAGE_TYPES.AI,
      content: '**Verfügbare Befehle:**\n\n`/workflow` - Zeigt aktive Workflows\n`/status` - Zeigt System-Status\n`/help` - Zeigt diese Hilfe\n\n**Autonome Korrektur:**\nWenn ein Workflow-Fehler erkannt wird, erscheint automatisch ein "Autonom korrigieren" Button.',
    }),
  },
};

// Mock AI responses for demo
const MOCK_AI_RESPONSES = [
  'Ich habe den Workflow analysiert. Der Fehler scheint in der API-Authentifizierung zu liegen.',
  'Die Datenbank-Verbindung ist stabil. Ich empfehle, den Cache zu leeren.',
  'Workflow-003 zeigt wiederholte Timeouts. Soll ich die Retry-Logik optimieren?',
  'Alle Systeme laufen normal. Keine Aktion erforderlich.',
  'Ich habe eine Anomalie in den Logs entdeckt. Möchtest du Details sehen?',
];

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Add a message
  const addMessage = useCallback((message) => {
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...message,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  }, []);

  // Handle command
  const handleCommand = useCallback((input) => {
    const command = Object.values(COMMANDS).find((cmd) =>
      input.toLowerCase().startsWith(cmd.prefix.toLowerCase())
    );

    if (command) {
      return command.handler();
    }

    return null;
  }, []);

  // Simulate AI response
  const simulateAIResponse = useCallback(async (userMessage) => {
    setIsTyping(true);
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    const response = MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)];
    
    addMessage({
      type: MESSAGE_TYPES.AI,
      content: response,
    });
    
    setIsTyping(false);
  }, [addMessage]);

  // Send message
  const sendMessage = useCallback(async (content) => {
    if (!content.trim()) return;

    // Add user message
    addMessage({
      type: MESSAGE_TYPES.USER,
      content,
    });

    setIsLoading(true);

    // Check for command
    const commandResponse = handleCommand(content);

    if (commandResponse) {
      // Command executed
      setTimeout(() => {
        addMessage(commandResponse);
        setIsLoading(false);
      }, 500);
    } else {
      // Regular message - simulate AI response
      await simulateAIResponse(content);
      setIsLoading(false);
    }
  }, [addMessage, handleCommand, simulateAIResponse]);

  // Handle action button click
  const handleAction = useCallback((actionType, messageId, data) => {
    switch (actionType) {
      case 'FIX_WORKFLOW':
        addMessage({
          type: MESSAGE_TYPES.SYSTEM,
          content: `🔧 KI analysiert Workflow "${data.workflowName}"...`,
        });
        
        // Simulate fix process
        setTimeout(() => {
          addMessage({
            type: MESSAGE_TYPES.AI,
            content: `✅ **Workflow korrigiert!**\n\nProblem: ${data.error}\nLösung: Retry-Logik angepasst, Timeout erhöht\nNeue Version: v${data.version + 1}`,
            actions: [
              { label: 'Deploy', action: 'DEPLOY', variant: 'primary' },
              { label: 'Details', action: 'VIEW_DETAILS', variant: 'secondary' },
            ],
          });
        }, 2000);
        break;

      case 'DEPLOY':
        addMessage({
          type: MESSAGE_TYPES.SYSTEM,
          content: '🚀 Deploye korrigierte Workflow-Version...',
        });
        
        setTimeout(() => {
          addMessage({
            type: MESSAGE_TYPES.AI,
            content: '✅ **Deployment erfolgreich!**\n\nDie korrigierte Version ist jetzt aktiv und wird überwacht.',
          });
        }, 1500);
        break;

      case 'VIEW_DETAILS':
        addMessage({
          type: MESSAGE_TYPES.AI,
          content: '**Korrektur-Details:**\n\n• Retry-Attempts: 3 → 5\n• Timeout: 30s → 60s\n• Exponential Backoff aktiviert\n• Circuit Breaker: 5 Fehler → 10 Fehler',
        });
        break;

      default:
        console.log('Unknown action:', actionType);
    }
  }, [addMessage]);

  // Simulate workflow error detection (for demo)
  const simulateWorkflowError = useCallback(() => {
    const workflows = ['Daten-Import', 'Email-Verarbeitung', 'API-Sync', 'Report-Generator'];
    const errors = ['Connection Timeout', 'Rate Limit Exceeded', 'Authentication Failed', 'Database Lock'];
    
    const workflow = workflows[Math.floor(Math.random() * workflows.length)];
    const error = errors[Math.floor(Math.random() * errors.length)];
    
    addMessage({
      type: MESSAGE_TYPES.ACTION,
      content: `⚠️ **Workflow-Fehler erkannt**\n\nWorkflow: **${workflow}**\nFehler: ${error}\nZeit: ${new Date().toLocaleTimeString()}`,
      actions: [
        { label: 'Autonom korrigieren', action: 'FIX_WORKFLOW', variant: 'primary', data: { workflowName: workflow, error, version: 2 } },
        { label: 'Details', action: 'VIEW_DETAILS', variant: 'secondary' },
      ],
    });
  }, [addMessage]);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Focus input
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return {
    messages,
    isLoading,
    isTyping,
    messagesEndRef,
    inputRef,
    sendMessage,
    handleAction,
    simulateWorkflowError,
    clearMessages,
    focusInput,
    addMessage,
  };
}

export default useChat;
