import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  CheckCircle2,
  RefreshCw,
  Compass,
  DollarSign,
  Briefcase,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { sendChatMessage, type ChatMessage } from '@/services/aiChatService';

interface ChatAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination?: string;
  onOpenBudget?: () => void;
  onOpenPacking?: () => void;
}

export const ChatAssistantModal: React.FC<ChatAssistantModalProps> = ({
  isOpen,
  onClose,
  destination = 'Paris',
  onOpenBudget,
  onOpenPacking,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I'm **Voyana AI**, your collaborative travel assistant for **${destination}**.\n\nAsk me anything about creating custom itineraries, optimizing group budgets, or generating tailored packing lists!`,
      timestamp: 'Just now',
      aiGenerated: true,
      citedContext: {
        categories: [`${destination} Guide`, 'Collaborative Travel'],
      },
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const quickPrompts = [
    `What should we pack for ${destination}?`,
    `Analyze our current trip budget`,
    `Suggest a 3-day sightseeing plan`,
    `How do we split group expenses?`,
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleSend = async (customMessage?: string) => {
    const textToSend = customMessage || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const assistantResponse = await sendChatMessage({
        message: textToSend,
        destination,
        history: messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      });
      setMessages((prev) => [...prev, assistantResponse]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "I'm having trouble connecting to the travel intelligence service right now. Please try again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          aiGenerated: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper to render markdown-like bold and bullet lists
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Heading level 3
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="chat-heading-3">
            {line.replace('### ', '')}
          </h4>
        );
      }
      // Bullet items
      if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
        const itemText = line.substring(2);
        return (
          <li key={idx} className="chat-bullet-item">
            {parseBoldText(itemText)}
          </li>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} style={{ height: '6px' }} />;
      }
      return (
        <p key={idx} className="chat-paragraph">
          {parseBoldText(line)}
        </p>
      );
    });
  };

  const parseBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-indigo-200 font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div
      className={`chat-assistant-container ${isMinimized ? 'minimized' : ''}`}
      role="dialog"
      aria-label="Voyana AI Travel Assistant"
    >
      {/* Assistant Header */}
      <div className="chat-header">
        <div className="chat-header-brand">
          <div className="chat-avatar-glow">
            <Sparkles size={18} className="chat-sparkle-icon" />
          </div>
          <div>
            <div className="chat-title-row">
              <span className="chat-title">Voyana AI</span>
              <span className="chat-status-badge">
                <span className="status-pulse-dot" /> Online
              </span>
            </div>
            <span className="chat-subtitle">Trip Assistant • {destination}</span>
          </div>
        </div>

        <div className="chat-header-actions">
          <button
            className="chat-ctrl-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
            aria-label={isMinimized ? 'Expand assistant' : 'Minimize assistant'}
          >
            <ChevronDown size={17} style={{ transform: isMinimized ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          <button
            className="chat-ctrl-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close assistant"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Main Chat Flow (hidden if minimized) */}
      {!isMinimized && (
        <>
          <div className="chat-messages-scroll">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message-row ${msg.role === 'user' ? 'user-row' : 'assistant-row'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="chat-msg-avatar">
                    <Bot size={16} />
                  </div>
                )}

                <div className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                  {msg.aiGenerated && (
                    <div className="ai-attribution-tag">
                      <Sparkles size={11} />
                      <span>Generated by Voyana AI</span>
                    </div>
                  )}

                  <div className="chat-bubble-content">
                    {renderFormattedContent(msg.content)}
                  </div>

                  {/* Context Citation Chips (VPM-44 spec) */}
                  {msg.citedContext && (
                    <div className="citation-chips-wrap">
                      <span className="citation-label">Citations:</span>
                      {msg.citedContext.days?.map((day) => (
                        <span key={`day-${day}`} className="citation-chip">
                          Day {day}
                        </span>
                      ))}
                      {msg.citedContext.categories?.map((cat) => (
                        <span key={`cat-${cat}`} className="citation-chip">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Smart Contextual Action Buttons */}
                  {msg.proposedChanges && msg.proposedChanges.length > 0 && (
                    <div className="proposed-actions-wrap">
                      {msg.proposedChanges.map((change, idx) => (
                        <div key={idx} className="proposed-action-card">
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          <span>{change.title}</span>
                          {change.type === 'add_packing_item' && onOpenPacking && (
                            <button
                              className="action-link-btn"
                              onClick={() => {
                                onOpenPacking();
                                onClose();
                              }}
                            >
                              <Briefcase size={12} /> View Packing List
                            </button>
                          )}
                          {change.type === 'update_budget' && onOpenBudget && (
                            <button
                              className="action-link-btn"
                              onClick={() => {
                                onOpenBudget();
                                onClose();
                              }}
                            >
                              <DollarSign size={12} /> View Budget
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="chat-timestamp">{msg.timestamp}</span>
                </div>

                {msg.role === 'user' && (
                  <div className="chat-msg-avatar user-avatar">
                    <User size={15} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="chat-message-row assistant-row">
                <div className="chat-msg-avatar">
                  <Bot size={16} />
                </div>
                <div className="chat-bubble assistant-bubble loading-bubble">
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="typing-label">Voyana AI is thinking…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestion Pills */}
          <div className="quick-prompts-bar">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                className="quick-prompt-pill"
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Composer & Action Toolbar */}
          <div className="chat-composer-wrap">
            <textarea
              ref={inputRef}
              className="chat-textarea"
              placeholder={`Ask Voyana AI about packing, budget, or day plans for ${destination}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={isLoading}
            />
            <div className="chat-composer-footer">
              <div className="composer-shortcuts">
                {onOpenBudget && (
                  <button
                    type="button"
                    className="composer-shortcut-btn"
                    onClick={() => {
                      onOpenBudget();
                      onClose();
                    }}
                    title="Open Budget Planner"
                  >
                    <DollarSign size={13} /> Budget
                  </button>
                )}
                {onOpenPacking && (
                  <button
                    type="button"
                    className="composer-shortcut-btn"
                    onClick={() => {
                      onOpenPacking();
                      onClose();
                    }}
                    title="Open Packing Checklist"
                  >
                    <Briefcase size={13} /> Packing
                  </button>
                )}
              </div>
              <button
                type="button"
                className="chat-send-btn"
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
                aria-label="Send message"
              >
                {isLoading ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatAssistantModal;
