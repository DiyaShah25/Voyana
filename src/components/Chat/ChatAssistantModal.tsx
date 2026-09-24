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
  ChevronDown,
  ArrowRight,
  RotateCcw,
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
  initialPrompt?: string;
  onOpenBudget?: () => void;
  onOpenPacking?: () => void;
}

export const ChatAssistantModal: React.FC<ChatAssistantModalProps> = ({
  isOpen,
  onClose,
  destination = 'Paris',
  initialPrompt,
  onOpenBudget,
  onOpenPacking,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I'm **Voyana AI**, your collaborative travel concierge for **${destination}**.\n\nAsk me anything about creating custom itineraries, curated destination recommendations, group budget optimization, or smart packing gear checklists!`,
      timestamp: 'Just now',
      aiGenerated: true,
      citedContext: {
        categories: [`${destination} Guide`, 'Curated Expeditions'],
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
  const sentInitialPromptRef = useRef<string | null>(null);

  const quickPrompts = [
    `Suggest a 3-day sightseeing itinerary for ${destination}`,
    `Recommend top hidden gems & local dining in ${destination}`,
    `Analyze our current travel budget`,
    `What specialized gear should I pack for ${destination}?`,
    `Current seasonal weather & best time to explore ${destination}`,
  ];

  const recommendedList: RecommendedDestination[] = getRecommendedDestinations({
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
  }, [isOpen, messages, showExploreDestinations]);

  // Handle incoming initial prompt if passed
  useEffect(() => {
    if (isOpen && initialPrompt && initialPrompt !== sentInitialPromptRef.current) {
      sentInitialPromptRef.current = initialPrompt;
      void handleSend(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

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
    } catch {
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

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Chat session refreshed. How can I assist with your journey to **${destination}** today?`,
        timestamp: 'Just now',
        aiGenerated: true,
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper to render markdown-like bold and bullet lists with high-contrast editorial styling
  const renderFormattedContent = (content: string, isUser: boolean) => {
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
            {parseBoldText(itemText, isUser)}
          </li>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} style={{ height: '6px' }} />;
      }
      return (
        <p key={idx} className="chat-paragraph">
          {parseBoldText(line, isUser)}
        </p>
      );
    });
  };

  const parseBoldText = (text: string, isUser: boolean) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong
            key={i}
            className={isUser ? 'chat-strong-user' : 'chat-strong-assistant'}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={`chat-assistant-container ${isMinimized ? 'minimized' : ''}`}
      role="dialog"
      aria-label="Voyana AI Travel Concierge"
    >
      {/* 1. Header Bar */}
      <div className="chat-header">
        <div className="chat-header-brand">
          <div className="chat-avatar-glow">
            <Sparkles size={18} className="chat-sparkle-icon" />
          </div>
          <div className="chat-brand-meta">
            <div className="chat-title-row">
              <span className="chat-title">Voyana AI Concierge</span>
              <span className="chat-status-badge">
                <span className="status-pulse-dot" /> Online
              </span>
            </div>
            <span className="chat-subtitle">Plan · Discover · {destination}</span>
          </div>
        </div>

        <div className="chat-header-actions">
          <button
            type="button"
            className={`chat-ctrl-btn ${showExploreDestinations ? 'active' : ''}`}
            onClick={() => setShowExploreDestinations(!showExploreDestinations)}
            title="Explore Destination Recommendations"
            aria-label="Explore Destination Recommendations"
          >
            <Compass size={15} />
          </button>
          <button
            type="button"
            className="chat-ctrl-btn"
            onClick={handleResetChat}
            title="Refresh Conversation"
            aria-label="Refresh Conversation"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            className="chat-ctrl-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
            aria-label={isMinimized ? 'Expand assistant' : 'Minimize assistant'}
          >
            <ChevronDown size={15} style={{ transform: isMinimized ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          <button
            type="button"
            className="chat-ctrl-btn chat-close-btn"
            onClick={onClose}
            title="Close Assistant"
            aria-label="Close Assistant"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Main Chat Flow (Hidden when minimized) */}
      {!isMinimized && (
        <>
          {/* Explore Destinations Drawer View */}
          {showExploreDestinations ? (
            <div className="chat-explore-panel">
              <div className="chat-explore-header">
                <div className="flex items-center gap-2">
                  <Compass size={16} className="text-emerald-700" />
                  <h4 className="chat-explore-title">Curated Destination Recommendations</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExploreDestinations(false)}
                  className="chat-explore-back-btn"
                >
                  ← Back to Chat
                </button>
              </div>

              {/* Filter Controls */}
              <div className="chat-filters-row">
                <select
                  value={selectedVibe}
                  onChange={(e) => setSelectedVibe(e.target.value)}
                  className="chat-filter-select"
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
                  className="chat-filter-select"
                >
                  <option value="all">All Budgets</option>
                  <option value="$">Budget ($)</option>
                  <option value="$$">Moderate ($$)</option>
                  <option value="$$$">Luxury ($$$)</option>
                </select>
              </div>

              {/* Recommended Cards List */}
              <div className="chat-recommend-cards-list">
                {recommendedList.map((dest) => (
                  <div key={dest.id} className="chat-recommend-card">
                    <div className="chat-recommend-top">
                      <div>
                        <div className="chat-dest-title-row">
                          <h5 className="chat-dest-name">{dest.name}</h5>
                          <span className="chat-dest-country">· {dest.country}</span>
                        </div>
                        <p className="chat-dest-tagline">{dest.tagline}</p>
                      </div>
                      <span className="chat-match-badge">
                        {dest.matchScore}% Match
                      </span>
                    </div>

                    <p className="chat-dest-desc">{dest.description}</p>

                    <div className="chat-recommend-footer">
                      <div className="chat-dest-meta-tags">
                        <span>~${dest.estimatedDailyCostUsd}/day</span>
                        <span>·</span>
                        <span>{dest.recommendedDays} Days</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowExploreDestinations(false);
                          handleSend(`Can you create a custom ${dest.recommendedDays}-day travel itinerary for ${dest.name}, ${dest.country}?`);
                        }}
                        className="chat-plan-btn"
                      >
                        Plan Itinerary <ArrowRight size={11} />
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
                    <div className="chat-msg-avatar assistant-avatar">
                      <Bot size={15} />
                    </div>
                  )}

                  <div className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                    {msg.aiGenerated && (
                      <div className="ai-attribution-tag">
                        <Sparkles size={11} />
                        <span>Curated by Voyana AI</span>
                      </div>
                    )}

                    <div className="chat-bubble-content">
                      {renderFormattedContent(msg.content, msg.role === 'user')}
                    </div>

                    {/* Context Citation Chips */}
                    {msg.citedContext && (
                      <div className="citation-chips-wrap">
                        <span className="citation-label">Verified Sources:</span>
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
                            <div className="proposed-action-info">
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                              <span className="proposed-action-title">{change.title}</span>
                            </div>
                            {change.type === 'add_packing_item' && onOpenPacking && (
                              <button
                                type="button"
                                className="action-link-btn"
                                onClick={() => {
                                  onOpenPacking();
                                  onClose();
                                }}
                              >
                                <Briefcase size={12} /> Packing List
                              </button>
                            )}
                            {change.type === 'update_budget' && onOpenBudget && (
                              <button
                                type="button"
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
                                type="button"
                                className="action-link-btn"
                                onClick={() => setShowExploreDestinations(true)}
                              >
                                <Compass size={12} /> Explore Recommendations
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
                      <User size={14} />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="chat-message-row assistant-row">
                  <div className="chat-msg-avatar assistant-avatar">
                    <Bot size={15} />
                  </div>
                  <div className="chat-bubble assistant-bubble loading-bubble">
                    <div className="typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="typing-label">Voyana AI is preparing your travel insights…</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* 3. Quick Prompt Suggestion Pills */}
          <div className="quick-prompts-bar">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                type="button"
                className="quick-prompt-pill"
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
              >
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* 4. Composer & Action Toolbar */}
          <div className="chat-composer-wrap">
            <textarea
              ref={inputRef}
              className="chat-textarea"
              placeholder={`Ask Voyana AI about flights, stays, itineraries, packing, or budget for ${destination}...`}
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
                {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatAssistantModal;
