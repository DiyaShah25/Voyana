import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Sparkles,
  Filter,
  Users,
  SunMedium,
  CheckSquare,
  Square,
  X,
  ArrowRight,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import {
  getPackingList,
  toggleItemPacked,
  addPackingItem,
  deletePackingItem,
  markAllItems,
  generateAiChecklist,
  type PackingListState,
  type PackingItem,
  type PackingCategory,
  type PackingPriority,
} from '@/services/packingService';

interface PackingChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination?: string;
  onOpenChatWithPrompt?: (prompt: string) => void;
}

const CATEGORIES: PackingCategory[] = [
  'Clothing',
  'Electronics',
  'Documents & Money',
  'Toiletries & Health',
  'Destination Essentials',
  'Accessories',
];

const TRAVELERS = ['Everyone', 'Diya Shah', 'Nigam Sanghvi', 'Tirth Gandhi', 'Jagrat Kumar', 'Shared'];

export const PackingChecklistModal: React.FC<PackingChecklistModalProps> = ({
  isOpen,
  onClose,
  destination = 'Paris',
  onOpenChatWithPrompt,
}) => {
  const [packingState, setPackingState] = useState<PackingListState>(getPackingList);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTraveler, setSelectedTraveler] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'packed' | 'unpacked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Item Modal State
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<PackingCategory>('Clothing');
  const [itemPriority, setItemPriority] = useState<PackingPriority>('essential');
  const [itemAssignedTo, setItemAssignedTo] = useState<string>('Everyone');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState('');
  const [itemWeatherTag, setItemWeatherTag] = useState('');

  // AI Generator Loading State
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPackingState(getPackingList());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalItems = packingState.items.length;
  const packedItems = packingState.items.filter((i) => i.isPacked).length;
  const progressPercent = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

  const handleToggle = (id: string) => {
    const updated = toggleItemPacked(id);
    setPackingState(updated);
  };

  const handleDelete = (id: string) => {
    const updated = deletePackingItem(id);
    setPackingState(updated);
  };

  const handleMarkAll = (packed: boolean) => {
    const updated = markAllItems(packed);
    setPackingState(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const updated = addPackingItem({
      name: itemName.trim(),
      category: itemCategory,
      priority: itemPriority,
      assignedTo: itemAssignedTo,
      quantity: itemQuantity,
      isPacked: false,
      notes: itemNotes.trim() || undefined,
      weatherTag: itemWeatherTag.trim() || undefined,
    });

    setPackingState(updated);
    setItemName('');
    setItemNotes('');
    setItemWeatherTag('');
    setIsAddItemOpen(false);
  };

  const handleGenerateAiList = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      const updated = generateAiChecklist(destination, packingState.tripDurationDays || 5);
      setPackingState(updated);
      setIsGeneratingAi(false);
    }, 800);
  };

  const filteredItems = packingState.items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesTraveler = selectedTraveler === 'all' || item.assignedTo === selectedTraveler;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'packed' && item.isPacked) ||
      (filterStatus === 'unpacked' && !item.isPacked);
    return matchesSearch && matchesCat && matchesTraveler && matchesStatus;
  });

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="packing-modal-title">
      <div className="modal-container packing-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="modal-icon-badge" style={{ background: 'rgba(0,212,178,0.2)', color: '#00d4b2' }}>
              <Briefcase size={20} />
            </div>
            <div>
              <h2 id="packing-modal-title" className="modal-title">Smart Packing Checklist</h2>
              <p className="modal-subtitle">
                {destination} • {packingState.tripDurationDays} Days Trip • {packingState.seasonOrWeather}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Progress & AI Banner */}
        <div className="packing-progress-banner">
          <div className="progress-metrics-row">
            <div>
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Packing Progress</span>
              <div className="text-xl font-bold text-slate-100 mt-0.5">
                {packedItems} of {totalItems} items packed <span className="text-teal-400">({progressPercent}%)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="ai-gen-checklist-btn"
                onClick={handleGenerateAiList}
                disabled={isGeneratingAi}
                title="Generate smart packing list for this destination"
              >
                <Sparkles size={14} className={isGeneratingAi ? 'animate-spin' : ''} />
                {isGeneratingAi ? 'Generating…' : 'AI Generate Checklist'}
              </button>
            </div>
          </div>

          <div className="packing-progress-track">
            <div
              className="packing-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="packing-controls-bar">
          <div className="packing-search-wrap">
            <Filter size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="packing-search-input"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
            className="packing-filter-select"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedTraveler}
            onChange={(e) => setSelectedTraveler(e.target.value)}
            aria-label="Filter by traveler"
            className="packing-filter-select"
          >
            <option value="all">All Travelers</option>
            {TRAVELERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="packing-status-segmented">
            <button
              className={`segmented-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button
              className={`segmented-btn ${filterStatus === 'unpacked' ? 'active' : ''}`}
              onClick={() => setFilterStatus('unpacked')}
            >
              Unpacked
            </button>
            <button
              className={`segmented-btn ${filterStatus === 'packed' ? 'active' : ''}`}
              onClick={() => setFilterStatus('packed')}
            >
              Packed
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              className="quick-pack-toggle-btn"
              onClick={() => handleMarkAll(progressPercent < 100)}
              title={progressPercent < 100 ? 'Mark all as packed' : 'Unpack all'}
            >
              {progressPercent < 100 ? <CheckSquare size={14} /> : <Square size={14} />}
              <span>{progressPercent < 100 ? 'Pack All' : 'Reset All'}</span>
            </button>

            <button
              className="add-item-trigger-btn"
              onClick={() => setIsAddItemOpen(true)}
            >
              <Plus size={15} /> Add Item
            </button>
          </div>
        </div>

        {/* Checklist Scrollable View */}
        <div className="modal-body-scroll">
          {filteredItems.length === 0 ? (
            <div className="empty-state-box">
              <Briefcase size={36} className="text-slate-500 mb-2" />
              <p className="text-slate-300 font-medium">No items match your filter</p>
              <p className="text-slate-500 text-sm">Add custom items or click "AI Generate Checklist"</p>
            </div>
          ) : (
            <div className="packing-items-grid">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`packing-item-card ${item.isPacked ? 'is-packed' : ''}`}
                  onClick={() => handleToggle(item.id)}
                >
                  <button
                    type="button"
                    className="packing-checkbox-btn"
                    aria-label={`Mark ${item.name} as ${item.isPacked ? 'unpacked' : 'packed'}`}
                  >
                    {item.isPacked ? (
                      <CheckCircle2 size={19} className="text-teal-400" />
                    ) : (
                      <Circle size={19} className="text-slate-400 hover:text-slate-200" />
                    )}
                  </button>

                  <div className="packing-item-details">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`packing-item-name ${item.isPacked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {item.name}
                      </span>
                      {item.quantity > 1 && (
                        <span className="qty-tag">×{item.quantity}</span>
                      )}
                      {item.priority === 'essential' && (
                        <span className="priority-tag essential">Essential</span>
                      )}
                      {item.priority === 'optional' && (
                        <span className="priority-tag optional">Optional</span>
                      )}
                    </div>

                    <div className="packing-item-meta">
                      <span className="category-meta-tag">{item.category}</span>
                      <span className="traveler-meta-tag">
                        <Users size={11} className="inline mr-1 opacity-70" />
                        {item.assignedTo}
                      </span>
                      {item.weatherTag && (
                        <span className="weather-meta-tag">
                          <SunMedium size={11} className="inline mr-1 opacity-70" />
                          {item.weatherTag}
                        </span>
                      )}
                      {item.notes && <span className="notes-meta-tag">{item.notes}</span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="delete-item-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    title="Delete item"
                    aria-label={`Delete item ${item.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {onOpenChatWithPrompt && (
            <div className="packing-ai-footer-prompt">
              <Sparkles size={16} className="text-teal-400" />
              <span>Need custom weather advice or gear suggestions for {destination}?</span>
              <button
                className="packing-ask-ai-link"
                onClick={() => {
                  onOpenChatWithPrompt(`What specialized items or clothing should I pack for visiting ${destination} this season?`);
                  onClose();
                }}
              >
                Ask Voyana AI <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Add Item Modal */}
        {isAddItemOpen && (
          <div className="sub-modal-overlay">
            <div className="sub-modal-card">
              <div className="sub-modal-header">
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  <Plus size={16} className="text-teal-400" /> Add Packing Item
                </h3>
                <button onClick={() => setIsAddItemOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="sub-modal-form">
                <div>
                  <label className="sub-label">Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Travel adapter, hiking shoes, sunscreen"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="sub-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="sub-label">Category *</label>
                    <select
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value as PackingCategory)}
                      className="sub-select"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="sub-label">Priority *</label>
                    <select
                      value={itemPriority}
                      onChange={(e) => setItemPriority(e.target.value as PackingPriority)}
                      className="sub-select"
                    >
                      <option value="essential">Essential (Must Have)</option>
                      <option value="recommended">Recommended</option>
                      <option value="optional">Optional</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="sub-label">Assigned Traveler *</label>
                    <select
                      value={itemAssignedTo}
                      onChange={(e) => setItemAssignedTo(e.target.value)}
                      className="sub-select"
                    >
                      {TRAVELERS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="sub-label">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                      className="sub-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="sub-label">Weather / Climate Tag (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Rain protection, Cold evenings"
                    value={itemWeatherTag}
                    onChange={(e) => setItemWeatherTag(e.target.value)}
                    className="sub-input"
                  />
                </div>

                <div>
                  <label className="sub-label">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Carry in daypack, buy before flight"
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    className="sub-input"
                  />
                </div>

                <div className="sub-modal-footer">
                  <button
                    type="button"
                    onClick={() => setIsAddItemOpen(false)}
                    className="sub-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="sub-submit-btn" style={{ background: '#00d4b2', color: '#091520' }}>
                    Add to Checklist
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackingChecklistModal;
