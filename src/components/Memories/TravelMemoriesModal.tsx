import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera, X, Heart, MapPin, Calendar, Tag, Search,
  ZoomIn, Download, Trash2, Plus, Clock, Grid3X3,
  Image as ImageIcon, Filter, Sparkles, ChevronDown,
} from 'lucide-react';
import {
  getTripMemories,
  uploadTripMemory,
  likeTripMemory,
  deleteTripMemory,
  type TripMemory,
} from '@/services/collaborationService';
import { getUserTrips, type Trip } from '@/services/tripService';

export interface TravelMemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { name: string; email: string };
  initialTripId?: string;
}

type ViewMode = 'gallery' | 'timeline';

export default function TravelMemoriesModal({
  isOpen,
  onClose,
  currentUser = { name: 'Diya Shah', email: 'diya@voyana.com' },
  initialTripId,
}: TravelMemoriesModalProps) {
  // Data
  const [allMemories, setAllMemories] = useState<TripMemory[]>([]);
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [selectedTripId, setSelectedTripId] = useState<string>(initialTripId || 'all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Lightbox
  const [lightboxMemory, setLightboxMemory] = useState<TripMemory | null>(null);

  // Upload Form
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadLocation, setUploadLocation] = useState('');
  const [uploadImageUrl, setUploadImageUrl] = useState('');
  const [uploadTags, setUploadTags] = useState('Travel, Moments');
  const [uploadTripTarget, setUploadTripTarget] = useState('trip-user-01');

  // Load all memories across all user trips
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const trips = await getUserTrips();
      setUserTrips(trips);

      const allMems: TripMemory[] = [];
      for (const trip of trips) {
        const tripMems = await getTripMemories(trip.id);
        allMems.push(...tripMems);
      }

      // Also load default trip memories if none found
      if (allMems.length === 0) {
        const defaultMems = await getTripMemories('trip-user-01');
        allMems.push(...defaultMems);
      }

      // Sort by date descending
      allMems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllMemories(allMems);
    } catch (err) {
      console.error('[TravelMemoriesModal] Error loading memories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen, loadAllData]);

  if (!isOpen) return null;

  // ── Derived Data ──────────────────────────────────────────────────────
  const allTags = Array.from(new Set(allMemories.flatMap((m) => m.tags || [])));

  const filteredMemories = allMemories.filter((mem) => {
    const matchesTripFilter = selectedTripId === 'all' || mem.tripId === selectedTripId;
    const matchesTagFilter = selectedTag === 'all' || (mem.tags && mem.tags.includes(selectedTag));
    const matchesSearch =
      !searchQuery.trim() ||
      mem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mem.caption || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mem.locationName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      mem.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTripFilter && matchesTagFilter && matchesSearch;
  });

  // Group by date for timeline view
  const groupedByDate: Record<string, TripMemory[]> = {};
  filteredMemories.forEach((mem) => {
    const dateKey = mem.date || 'Unknown Date';
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(mem);
  });
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const totalLikes = allMemories.reduce((sum, m) => sum + m.likes.length, 0);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleLike = async (mem: TripMemory) => {
    await likeTripMemory(mem.tripId, mem.id, currentUser.name);
    await loadAllData();
    // Update lightbox if open
    if (lightboxMemory && lightboxMemory.id === mem.id) {
      const updatedMems = await getTripMemories(mem.tripId);
      const updated = updatedMems.find((m) => m.id === mem.id);
      if (updated) setLightboxMemory(updated);
    }
  };

  const handleDelete = async (mem: TripMemory) => {
    await deleteTripMemory(mem.tripId, mem.id);
    if (lightboxMemory?.id === mem.id) setLightboxMemory(null);
    await loadAllData();
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadImageUrl.trim()) return;

    const parsedTags = uploadTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    await uploadTripMemory(uploadTripTarget, {
      uploadedBy: currentUser.name,
      title: uploadTitle,
      caption: uploadCaption || undefined,
      locationName: uploadLocation || undefined,
      imageUrl: uploadImageUrl,
      date: new Date().toISOString().split('T')[0],
      tags: parsedTags.length > 0 ? parsedTags : ['Travel', 'Moments'],
    });

    setShowUploadForm(false);
    setUploadTitle('');
    setUploadCaption('');
    setUploadLocation('');
    setUploadImageUrl('');
    setUploadTags('Travel, Moments');
    await loadAllData();
  };

  const getTripNameById = (tripId: string) => {
    const trip = userTrips.find((t) => t.id === tripId);
    return trip ? `${trip.title} — ${trip.destination}` : tripId;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // ── Photo Card Component ──────────────────────────────────────────────
  const MemoryCard = ({ mem }: { mem: TripMemory }) => {
    const isLikedByMe = mem.likes.includes(currentUser.name);
    return (
      <div className="group bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col">
        {/* Image */}
        <div
          onClick={() => setLightboxMemory(mem)}
          className="relative aspect-4/3 w-full bg-slate-950 overflow-hidden cursor-pointer"
        >
          <img
            src={mem.imageUrl}
            alt={mem.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 opacity-60 group-hover:opacity-80 transition-opacity" />

          {/* Location Pill */}
          {mem.locationName && (
            <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-white/10 text-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 max-w-[200px]">
              <MapPin size={11} className="text-rose-400 flex-shrink-0" />
              <span className="truncate">{mem.locationName}</span>
            </div>
          )}

          {/* Zoom hint */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/60 text-white">
            <ZoomIn size={14} />
          </div>

          {/* Title at bottom */}
          <div className="absolute bottom-3 left-3 right-3">
            <h4 className="text-sm font-bold text-white drop-shadow-md truncate">{mem.title}</h4>
            <p className="text-[10px] text-slate-300 flex items-center gap-2 mt-0.5">
              <span>by {mem.uploadedBy}</span>
              <span>·</span>
              <span>{mem.date}</span>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
          {mem.caption && (
            <p className="text-xs text-slate-300 italic leading-relaxed line-clamp-2">
              "{mem.caption}"
            </p>
          )}

          {/* Tags */}
          {mem.tags && mem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {mem.tags.map((t) => (
                <span
                  key={t}
                  onClick={() => setSelectedTag(t)}
                  className="cursor-pointer text-[10px] font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-500/20 px-2 py-0.5 rounded-md hover:border-indigo-400 transition-colors"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={() => handleLike(mem)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                isLikedByMe
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30 scale-105'
                  : 'bg-white/5 text-slate-400 hover:text-pink-300 hover:bg-white/10'
              }`}
            >
              <Heart size={13} className={isLikedByMe ? 'fill-pink-500 text-pink-500' : ''} />
              <span>{mem.likes.length}</span>
            </button>
            <button
              onClick={() => handleDelete(mem)}
              className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition-colors"
              title="Delete memory"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="memories-modal-title">
      <div className="modal-container" style={{ maxWidth: '1080px', maxHeight: '93vh' }}>
        {/* ── HEADER ────────────────────────────────────────────────── */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="modal-icon-badge"
              style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(99,91,255,0.25))', color: '#f472b6' }}
            >
              <Camera size={22} />
            </div>
            <div>
              <h2 id="memories-modal-title" className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Travel Memories & Photo Journal
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(236,72,153,0.2)',
                    color: '#f9a8d4',
                    border: '1px solid rgba(236,72,153,0.3)',
                  }}
                >
                  VPM-106
                </span>
              </h2>
              <p className="modal-subtitle">
                Capture, relive & share your unforgettable travel highlights
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close memories modal">
            <X size={18} />
          </button>
        </div>

        {/* ── STATS BAR ─────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            padding: '14px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(15,23,42,0.6)',
          }}
        >
          {[
            { label: 'Total Memories', value: allMemories.length, icon: Camera, color: '#f472b6' },
            { label: 'Total Likes', value: totalLikes, icon: Heart, color: '#fb7185' },
            { label: 'Trips Covered', value: new Set(allMemories.map((m) => m.tripId)).size, icon: MapPin, color: '#a78bfa' },
            { label: 'Unique Tags', value: allTags.length, icon: Tag, color: '#38bdf8' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: `${stat.color}18`,
                    display: 'grid',
                    placeItems: 'center',
                    color: stat.color,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>{stat.value}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── TOOLBAR: Search / Filters / View Toggle / Upload ──────── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(15,23,42,0.4)',
          }}
        >
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: '1 1 200px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '7px 12px',
            }}
          >
            <Search size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories, locations, people..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e2e8f0',
                fontSize: '12px',
                width: '100%',
              }}
            />
          </div>

          {/* Trip Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '7px 28px 7px 10px',
                color: '#e2e8f0',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                appearance: 'none',
                outline: 'none',
              }}
            >
              <option value="all">All Trips</option>
              {userTrips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title} — {trip.destination}
                </option>
              ))}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>

          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            {[
              { id: 'gallery' as ViewMode, icon: Grid3X3, label: 'Gallery' },
              { id: 'timeline' as ViewMode, icon: Clock, label: 'Timeline' },
            ].map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: viewMode === mode.id ? '#fff' : '#94a3b8',
                    background: viewMode === mode.id ? 'rgba(99,91,255,0.3)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={13} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Upload Button */}
          <button
            onClick={() => setShowUploadForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ec4899, #6366f1)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(236,72,153,0.25)',
              transition: 'all 0.2s',
            }}
          >
            <Plus size={14} />
            <span>Post Memory</span>
          </button>
        </div>

        {/* ── TAG CLOUD ─────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            overflowX: 'auto',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <Tag size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <button
            onClick={() => setSelectedTag('all')}
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: selectedTag === 'all' ? '#fff' : '#94a3b8',
              background: selectedTag === 'all' ? 'rgba(99,91,255,0.3)' : 'rgba(255,255,255,0.04)',
            }}
          >
            All Tags
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: selectedTag === tag ? '#fff' : '#c4b5fd',
                background: selectedTag === tag ? 'rgba(99,91,255,0.35)' : 'rgba(99,91,255,0.08)',
              }}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* ── MAIN CONTENT AREA ─────────────────────────────────────── */}
        <div className="modal-body-scroll" style={{ padding: '20px 24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'rgba(236,72,153,0.15)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 12px',
                  color: '#f472b6',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              >
                <Camera size={24} />
              </div>
              <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Loading your travel memories...</p>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(236,72,153,0.12)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 14px',
                  color: '#f472b6',
                }}
              >
                <ImageIcon size={28} />
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                {searchQuery || selectedTag !== 'all' || selectedTripId !== 'all'
                  ? 'No memories match your filters'
                  : 'No Travel Memories Yet'}
              </h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '360px', margin: '0 auto 16px', lineHeight: '1.6' }}>
                {searchQuery || selectedTag !== 'all' || selectedTripId !== 'all'
                  ? 'Try adjusting your search or filter criteria to find memories.'
                  : 'Capture your first travel highlight! Upload photos from your trips, tag them with locations and hashtags, and build a shared photo journal with your travel companions.'}
              </p>
              <button
                onClick={() => {
                  if (searchQuery || selectedTag !== 'all' || selectedTripId !== 'all') {
                    setSearchQuery('');
                    setSelectedTag('all');
                    setSelectedTripId('all');
                  } else {
                    setShowUploadForm(true);
                  }
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ec4899, #6366f1)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {searchQuery || selectedTag !== 'all' || selectedTripId !== 'all' ? 'Clear Filters' : 'Upload First Photo'}
              </button>
            </div>
          ) : viewMode === 'gallery' ? (
            /* ── Gallery Grid View ──────────────────────────────────── */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '18px',
              }}
            >
              {filteredMemories.map((mem) => (
                <MemoryCard key={mem.id} mem={mem} />
              ))}
            </div>
          ) : (
            /* ── Timeline View ──────────────────────────────────────── */
            <div style={{ position: 'relative', paddingLeft: '32px' }}>
              {/* Timeline line */}
              <div
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '0',
                  bottom: '0',
                  width: '2px',
                  background: 'linear-gradient(180deg, rgba(99,91,255,0.4), rgba(236,72,153,0.4), rgba(99,91,255,0.1))',
                  borderRadius: '2px',
                }}
              />

              {sortedDates.map((dateKey) => (
                <div key={dateKey} style={{ marginBottom: '28px' }}>
                  {/* Date Marker */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '14px',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: '-32px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '999px',
                        background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                        display: 'grid',
                        placeItems: 'center',
                        zIndex: 2,
                        boxShadow: '0 0 12px rgba(99,91,255,0.4)',
                      }}
                    >
                      <Calendar size={10} style={{ color: '#fff' }} />
                    </div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#e2e8f0',
                        background: 'rgba(99,91,255,0.1)',
                        border: '1px solid rgba(99,91,255,0.2)',
                        borderRadius: '10px',
                        padding: '4px 14px',
                      }}
                    >
                      {formatDate(dateKey)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                      {groupedByDate[dateKey].length} {groupedByDate[dateKey].length === 1 ? 'memory' : 'memories'}
                    </span>
                  </div>

                  {/* Memories for this date */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                      gap: '14px',
                    }}
                  >
                    {groupedByDate[dateKey].map((mem) => (
                      <MemoryCard key={mem.id} mem={mem} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── PHOTO LIGHTBOX ─────────────────────────────────────────────── */}
      {lightboxMemory && (
        <div
          onClick={() => setLightboxMemory(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.95)',
            backdropFilter: 'blur(30px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '900px',
              width: '100%',
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
          >
            {/* Lightbox Image */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/10',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={lightboxMemory.imageUrl}
                alt={lightboxMemory.title}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <button
                onClick={() => setLightboxMemory(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  padding: '10px',
                  borderRadius: '999px',
                  background: 'rgba(0,0,0,0.7)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Lightbox Info */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {lightboxMemory.title}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <MapPin size={12} style={{ color: '#f43f5e' }} />
                    <span>{lightboxMemory.locationName || 'Unknown Location'}</span>
                    <span>·</span>
                    <span>by {lightboxMemory.uploadedBy}</span>
                    <span>·</span>
                    <span>{formatDate(lightboxMemory.date)}</span>
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleLike(lightboxMemory)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      color: lightboxMemory.likes.includes(currentUser.name) ? '#fff' : '#e2e8f0',
                      background: lightboxMemory.likes.includes(currentUser.name)
                        ? 'linear-gradient(135deg, #ec4899, #f43f5e)'
                        : 'rgba(255,255,255,0.08)',
                      boxShadow: lightboxMemory.likes.includes(currentUser.name)
                        ? '0 4px 15px rgba(236,72,153,0.3)'
                        : 'none',
                    }}
                  >
                    <Heart
                      size={15}
                      style={{
                        fill: lightboxMemory.likes.includes(currentUser.name) ? '#fff' : 'none',
                      }}
                    />
                    <span>{lightboxMemory.likes.length} {lightboxMemory.likes.length === 1 ? 'Like' : 'Likes'}</span>
                  </button>

                  <a
                    href={lightboxMemory.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    style={{
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.08)',
                      border: 'none',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                    title="Open full resolution"
                  >
                    <Download size={15} />
                  </a>
                </div>
              </div>

              {lightboxMemory.caption && (
                <p
                  style={{
                    fontSize: '13px',
                    color: '#cbd5e1',
                    fontStyle: 'italic',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    lineHeight: '1.6',
                    margin: 0,
                  }}
                >
                  "{lightboxMemory.caption}"
                </p>
              )}

              {lightboxMemory.tags && lightboxMemory.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {lightboxMemory.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#a5b4fc',
                        background: 'rgba(99,91,255,0.12)',
                        border: '1px solid rgba(99,91,255,0.25)',
                        padding: '4px 12px',
                        borderRadius: '10px',
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Liked by list */}
              {lightboxMemory.likes.length > 0 && (
                <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Heart size={11} style={{ color: '#f472b6' }} />
                  <span>Liked by {lightboxMemory.likes.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── UPLOAD MEMORY FORM MODAL ───────────────────────────────────── */}
      {showUploadForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 65,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(20px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '480px',
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: '#fff',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Camera size={18} style={{ color: '#f472b6' }} />
              <span>Post a Travel Memory</span>
            </h3>

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                  Memory Title *
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Golden Hour at Eiffel Tower"
                  style={{
                    width: '100%',
                    background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#e2e8f0',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Image URL */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                  Photo URL *
                </label>
                <input
                  type="url"
                  required
                  value={uploadImageUrl}
                  onChange={(e) => setUploadImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  style={{
                    width: '100%',
                    background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: '#e2e8f0',
                    outline: 'none',
                    fontFamily: 'monospace',
                  }}
                />

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginRight: '2px', lineHeight: '24px' }}>Presets:</span>
                  {[
                    { label: '🌅 Sunset', url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1000&auto=format&fit=crop&q=80' },
                    { label: '🍽️ Food', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80' },
                    { label: '🏛️ Architecture', url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1000&auto=format&fit=crop&q=80' },
                    { label: '🗼 Tokyo', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1000&auto=format&fit=crop&q=80' },
                    { label: '🏖️ Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop&q=80' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setUploadImageUrl(p.url);
                        if (!uploadTitle) setUploadTitle(`${p.label.substring(2)} Highlight`);
                      }}
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#c4b5fd',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location & Tags */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={uploadLocation}
                    onChange={(e) => setUploadLocation(e.target.value)}
                    placeholder="e.g. Pont Neuf, Paris"
                    style={{
                      width: '100%',
                      background: 'rgba(15,23,42,0.8)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      fontSize: '12px',
                      color: '#e2e8f0',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="Sunset, Sightseeing"
                    style={{
                      width: '100%',
                      background: 'rgba(15,23,42,0.8)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      fontSize: '12px',
                      color: '#e2e8f0',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Trip Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                  Add to Trip
                </label>
                <select
                  value={uploadTripTarget}
                  onChange={(e) => setUploadTripTarget(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: '#e2e8f0',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {userTrips.length > 0 ? (
                    userTrips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title} — {trip.destination}
                      </option>
                    ))
                  ) : (
                    <option value="trip-user-01">Default Trip</option>
                  )}
                </select>
              </div>

              {/* Caption */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                  Caption / Story
                </label>
                <textarea
                  rows={2}
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Share a story or memory about this moment..."
                  style={{
                    width: '100%',
                    background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: '#e2e8f0',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Actions */}
              <div
                style={{
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  style={{
                    padding: '9px 18px',
                    fontSize: '12px',
                    color: '#94a3b8',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #ec4899, #6366f1)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(236,72,153,0.25)',
                  }}
                >
                  Publish Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
