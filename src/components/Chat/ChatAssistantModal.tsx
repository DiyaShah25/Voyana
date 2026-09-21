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
  MapPin,
  Star,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { sendChatMessage, type ChatMessage } from '@/services/aiChatService';
import {
  getRecommendedDestinations,
  type RecommendedDestination,
} from '@/services/recommendationService';

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
      content: `Hello! I'm **Voyana AI**, your collaborative travel assistant for **${destination}**.\n\nAsk me anything about creating custom itineraries, exploring destination recommendations, optimizing group budgets, or generating tailored packing lists!`,
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
  const [showExploreDestinations, setShowExploreDestinations] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState('all');
  const [selectedBudget, setSelectedBudget] = useState('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const quickPrompts = [
    `Recommend top travel destinations for me`,
    `Suggest a 3-day sightseeing plan for ${destination}`,
    `Analyze our current trip budget`,
    `What should we pack for ${destination}?`,
  ];

  const recommendedList = getRecommendedDestinations({
    vibe: selectedVibe,
    budgetTier: selectedBudget,
  });

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

        <div className="chat-header-actions flex items-center gap-1.5">
          <button
            className={`chat-ctrl-btn ${showExploreDestinations ? 'bg-indigo-600/40 text-indigo-300' : ''}`}
            onClick={() => setShowExploreDestinations(!showExploreDestinations)}
            title="Explore Destination Recommendations (VPM-40)"
          >
            <Compass size={16} />
          </button>
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
          {/* Explore Destinations Drawer (VPM-40) */}
          {showExploreDestinations ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/90">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Compass size={16} className="text-pink-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    AI Destination Recommender (VPM-40)
                  </h4>
                </div>
                <button
                  onClick={() => setShowExploreDestinations(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Back to Chat
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 text-xs">
                <select
                  value={selectedVibe}
                  onChange={(e) => setSelectedVibe(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-slate-300 text-xs outline-none"
                >
                  <option value="all">All Vibes</option>
                  <option value="Romantic">Romantic</option>
                  <option value="Culture">Culture</option>
                  <option value="Culinary">Culinary</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Luxury">Luxury</option>
                  <option value="Nature">Nature</option>
                  <option value="Budget Friendly">Budget Friendly</option>
                </select>

                <select
                  value={selectedBudget}
                  onChange={(e) => setSelectedBudget(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-slate-300 text-xs outline-none"
                >
                  <option value="all">All Budgets</option>
                  <option value="$">Budget ($)</option>
                  <option value="$$">Moderate ($$)</option>
                  <option value="$$$">Luxury ($$$)</option>
                </select>
              </div>

              {/* Recommendations Cards */}
              <div className="space-y-3">
                {recommendedList.map((dest) => (
                  <div
                    key={dest.id}
                    className="bg-slate-900/90 border border-white/10 rounded-xl overflow-hidden hover:border-indigo-500/40 transition-all p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h5 className="text-sm font-bold text-white">{dest.name}</h5>
                          <span className="text-xs text-slate-400">· {dest.country}</span>
                        </div>
                        <p className="text-[11px] text-pink-300 font-medium">{dest.tagline}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
                        {dest.matchScore}% Match
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{dest.description}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>💰 ~${dest.estimatedDailyCostUsd}/day</span>
                        <span>·</span>
                        <span>🗓️ {dest.recommendedDays} Days</span>
                      </div>
                      <button
                        onClick={() => {
                          setShowExploreDestinations(false);
                          handleSend(`Can you create a custom ${dest.recommendedDays}-day travel itinerary for ${dest.name}, ${dest.country}?`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1 text-[10px] transition-all"
                      >
                        Plan Itinerary <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
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
                            {change.type === 'recommendation' && (
                              <button
                                className="action-link-btn"
                                onClick={() => setShowExploreDestinations(true)}
                              >
                                <Compass size={12} /> Explore All Recommendations
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
          )}

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
              placeholder={`Ask Voyana AI about destinations, itineraries, budget, or packing for ${destination}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={isLoading}
            />
            <div className="chat-composer-footer">
              <div className="composer-shortcuts">
                <button
                  type="button"
                  className="composer-shortcut-btn"
                  onClick={() => setShowExploreDestinations(!showExploreDestinations)}
                  title="Explore Destination Recommendations"
                >
                  <Compass size={13} /> Discover
                </button>
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
