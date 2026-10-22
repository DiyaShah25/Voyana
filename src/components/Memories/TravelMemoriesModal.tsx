/**
 * Travel Memories Modal
 * Photo journal and travel memories gallery with upload,
 * location tagging, captions, likes, and memory deletion.
 * Fully connected to MongoDB Atlas 'memories' collection.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera, X, Heart, MapPin, Calendar, Tag, Search,
  ZoomIn, Download, Trash2, Plus, Clock, Grid3X3,
  Image as ImageIcon, Filter, Sparkles, ChevronDown,
  Upload, CheckCircle2, Database,
} from 'lucide-react';
import {
  getAllMemories,
  getTripMemories,
  uploadTripMemory,
  likeTripMemory,
  deleteTripMemory,
  updateTripMemory,
  generateAiJournalStory,
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
type SortMode = 'newest' | 'likes' | 'oldest';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters & Sorting
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
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

  // Load all memories directly from MongoDB Atlas
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [trips, mems] = await Promise.all([
        getUserTrips(),
        getAllMemories(),
      ]);
      setUserTrips(trips);

      if (mems && mems.length > 0) {
        setAllMemories(mems);
      } else {
        const defaultMems = await getTripMemories('trip-user-01');
        setAllMemories(defaultMems);
      }
    } catch (err) {
      console.error('[TravelMemoriesModal] Error loading memories from Atlas:', err);
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

  // Apply Sort
  const sortedMemories = [...filteredMemories].sort((a, b) => {
    if (sortMode === 'likes') return (b.likes?.length || 0) - (a.likes?.length || 0);
    if (sortMode === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Group by date for timeline view
  const groupedByDate: Record<string, TripMemory[]> = {};
  sortedMemories.forEach((mem) => {
    const dateKey = mem.date || 'Unknown Date';
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(mem);
  });
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const totalLikes = allMemories.reduce((sum, m) => sum + (m.likes?.length || 0), 0);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleLike = async (mem: TripMemory) => {
    // Optimistic UI toggle
    const isLiked = mem.likes?.includes(currentUser.name);
    const updatedLikes = isLiked
      ? (mem.likes || []).filter((u) => u !== currentUser.name)
      : [...(mem.likes || []), currentUser.name];

    setAllMemories((prev) =>
      prev.map((m) => (m.id === mem.id ? { ...m, likes: updatedLikes } : m))
    );

    if (lightboxMemory && lightboxMemory.id === mem.id) {
      setLightboxMemory({ ...lightboxMemory, likes: updatedLikes });
    }

    // Persist to MongoDB Atlas
    const res = await likeTripMemory(mem.tripId, mem.id, currentUser.name);
    if (res.success && res.likes) {
      setAllMemories((prev) =>
        prev.map((m) => (m.id === mem.id ? { ...m, likes: res.likes } : m))
      );
      if (lightboxMemory && lightboxMemory.id === mem.id) {
        setLightboxMemory({ ...lightboxMemory, likes: res.likes });
      }
    }
  };

  const handleDelete = async (mem: TripMemory) => {
    if (!window.confirm(`Delete "${mem.title}" from your travel memories journal?`)) {
      return;
    }
    // Optimistic delete
    setAllMemories((prev) => prev.filter((m) => m.id !== mem.id));
    if (lightboxMemory?.id === mem.id) setLightboxMemory(null);
    // Delete in MongoDB Atlas
    await deleteTripMemory(mem.tripId, mem.id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setUploadImageUrl(reader.result);
        if (!uploadTitle.trim()) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          setUploadTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadImageUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const parsedTags = uploadTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter((t) => t.length > 0);

      const saved = await uploadTripMemory(uploadTripTarget, {
        uploadedBy: currentUser.name,
        title: uploadTitle.trim(),
        caption: uploadCaption.trim() || undefined,
        locationName: uploadLocation.trim() || undefined,
        imageUrl: uploadImageUrl.trim(),
        date: new Date().toISOString().split('T')[0],
        tags: parsedTags.length > 0 ? parsedTags : ['Travel', 'Moments'],
      });

      setAllMemories((prev) => [saved, ...prev.filter((m) => m.id !== saved.id)]);
      setShowUploadForm(false);
      setUploadTitle('');
      setUploadCaption('');
      setUploadLocation('');
      setUploadImageUrl('');
      setUploadTags('Travel, Moments');
      await loadAllData();
    } catch (err) {
      console.error('[TravelMemoriesModal] Failed to upload memory:', err);
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-emerald-500/50 hover:shadow-lg transition-all duration-300 flex flex-col shadow-sm">
        {/* Image */}
        <div
          onClick={() => setLightboxMemory(mem)}
          className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden cursor-pointer"
        >
          <img
            src={mem.imageUrl}
            alt={mem.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 opacity-60 group-hover:opacity-80 transition-opacity" />

          {/* Location Pill */}
          {mem.locationName && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 max-w-[200px] shadow-sm">
              <MapPin size={11} className="text-rose-500 flex-shrink-0" />
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
            <p className="text-[10px] text-slate-200 flex items-center gap-2 mt-0.5">
              <span>by {mem.uploadedBy}</span>
              <span>·</span>
              <span>{mem.date}</span>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
          {mem.caption && (
            <p className="text-xs text-slate-600 italic leading-relaxed line-clamp-2">
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
                  className="cursor-pointer text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => handleLike(mem)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                isLikedByMe
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 scale-105'
                  : 'bg-slate-100 text-slate-600 hover:text-rose-600 hover:bg-slate-200/70'
              }`}
            >
              <Heart size={13} className={isLikedByMe ? 'fill-rose-500 text-rose-500' : ''} />
              <span>{mem.likes.length}</span>
            </button>
            <button
              onClick={() => handleDelete(mem)}
              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="memories-modal-title">
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[94vh]">
        {/* ── HEADER ────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
              <Camera size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="memories-modal-title" className="text-lg font-bold text-slate-900">
                  Travel Memories & Photo Journal
                </h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5"
                  title="Directly connected to MongoDB Atlas 'memories' collection"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  MongoDB Atlas ({allMemories.length})
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Capture, relive & share your unforgettable travel moments — backed by shared cloud database
              </p>
            </div>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors" onClick={onClose} aria-label="Close memories modal">
            <X size={20} />
          </button>
        </div>

        {/* ── STATS BAR ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-3.5 border-b border-slate-200 bg-slate-50/70">
          {[
            { label: 'Total Memories', value: allMemories.length, icon: Camera, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { label: 'Total Likes', value: totalLikes, icon: Heart, color: 'text-rose-600 bg-rose-50 border-rose-200' },
            { label: 'Trips Covered', value: new Set(allMemories.map((m) => m.tripId)).size, icon: MapPin, color: 'text-amber-700 bg-amber-50 border-amber-200' },
            { label: 'Unique Tags', value: allTags.length, icon: Tag, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm"
              >
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <div className="text-base font-extrabold text-slate-900 leading-tight">{stat.value}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── TOOLBAR: Search / Filters / View Toggle / Upload ──────── */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-slate-200 bg-white">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories, locations, people..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
            />
          </div>

          {/* Trip Filter */}
          <div className="relative">
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 pr-8 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 shadow-sm cursor-pointer appearance-none"
            >
              <option value="all">All Trips</option>
              {userTrips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title} — {trip.destination}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 pr-8 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 shadow-sm cursor-pointer appearance-none"
            >
              <option value="newest">Newest First</option>
              <option value="likes">Most Liked</option>
              <option value="oldest">Oldest First</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 rounded-xl border border-slate-200 p-0.5 overflow-hidden">
            {[
              { id: 'gallery' as ViewMode, icon: Grid3X3, label: 'Gallery' },
              { id: 'timeline' as ViewMode, icon: Clock, label: 'Timeline' },
            ].map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    viewMode === mode.id
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
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
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={14} />
            <span>Post Memory</span>
          </button>
        </div>

        {/* ── TAG CLOUD ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-6 py-2.5 overflow-x-auto border-b border-slate-100 bg-slate-50/50">
          <Tag size={12} className="text-slate-400 flex-shrink-0" />
          <button
            onClick={() => setSelectedTag('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedTag === 'all'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Tags
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTag === tag
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* ── MAIN CONTENT AREA ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3 text-emerald-700 animate-pulse">
                <Camera size={24} />
              </div>
              <p className="text-xs font-semibold text-slate-500">Loading your travel memories...</p>
            </div>
          ) : sortedMemories.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/70 border border-dashed border-slate-200 rounded-3xl">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3 text-emerald-700">
                <ImageIcon size={28} />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">
                {searchQuery || selectedTag !== 'all' || selectedTripId !== 'all'
                  ? 'No memories match your filters'
                  : 'No Travel Memories Yet'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
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
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95"
              >
                {searchQuery || selectedTag !== 'all' || selectedTripId !== 'all' ? 'Clear Filters' : 'Upload First Photo'}
              </button>
            </div>
          ) : viewMode === 'gallery' ? (
            /* ── Gallery Grid View ──────────────────────────────────── */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedMemories.map((mem) => (
                <MemoryCard key={mem.id} mem={mem} />
              ))}
            </div>
          ) : (
            /* ── Timeline View ──────────────────────────────────────── */
            <div className="relative pl-8">
              {/* Timeline line */}
              <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-emerald-200 rounded" />

              {sortedDates.map((dateKey) => (
                <div key={dateKey} className="mb-7">
                  {/* Date Marker */}
                  <div className="flex items-center gap-3 mb-3.5 relative">
                    <div className="absolute -left-8 w-5 h-5 rounded-full bg-emerald-700 border-2 border-white flex items-center justify-center z-10 shadow-sm text-white">
                      <Calendar size={10} />
                    </div>
                    <span className="text-xs font-bold text-slate-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1">
                      {formatDate(dateKey)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {groupedByDate[dateKey].length} {groupedByDate[dateKey].length === 1 ? 'memory' : 'memories'}
                    </span>
                  </div>

                  {/* Memories for this date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
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
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Lightbox Image */}
            <div className="relative w-full aspect-[16/10] bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src={lightboxMemory.imageUrl}
                alt={lightboxMemory.title}
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setLightboxMemory(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Lightbox Info */}
            <div className="p-6 flex flex-col gap-3 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {lightboxMemory.title}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <MapPin size={12} className="text-rose-500" />
                    <span>{lightboxMemory.locationName || 'Unknown Location'}</span>
                    <span>·</span>
                    <span>by {lightboxMemory.uploadedBy}</span>
                    <span>·</span>
                    <span>{formatDate(lightboxMemory.date)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLike(lightboxMemory)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      lightboxMemory.likes.includes(currentUser.name)
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Heart
                      size={15}
                      className={lightboxMemory.likes.includes(currentUser.name) ? 'fill-rose-500 text-rose-500' : ''}
                    />
                    <span>{lightboxMemory.likes.length} {lightboxMemory.likes.length === 1 ? 'Like' : 'Likes'}</span>
                  </button>

                  <a
                    href={lightboxMemory.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    title="Open full resolution"
                  >
                    <Download size={16} />
                  </a>
                </div>
              </div>

              {lightboxMemory.caption && (
                <p className="text-xs text-slate-600 italic bg-slate-50 border border-slate-200 p-3 rounded-2xl leading-relaxed">
                  "{lightboxMemory.caption}"
                </p>
              )}

              {lightboxMemory.tags && lightboxMemory.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {lightboxMemory.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Liked by list */}
              {lightboxMemory.likes.length > 0 && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-100">
                  <Heart size={11} className="text-rose-500 fill-rose-500" />
                  <span>Liked by {lightboxMemory.likes.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── UPLOAD MEMORY FORM MODAL ───────────────────────────────────── */}
      {showUploadForm && (
        <div className="fixed inset-0 z-65 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Camera size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Post a Travel Memory</h3>
              </div>
              <button onClick={() => setShowUploadForm(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3.5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Memory Title *
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Golden Hour at Eiffel Tower"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                />
              </div>

              {/* Image Input (Device Upload + URL + Presets) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Photo Image *
                  </label>
                  <label
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 cursor-pointer text-[10px] font-bold hover:bg-emerald-100 transition-colors shadow-sm"
                    title="Select a photo directly from your device"
                  >
                    <Upload size={11} className="text-emerald-700" />
                    <span>Upload from Device</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <input
                  type="text"
                  required
                  value={uploadImageUrl}
                  onChange={(e) => setUploadImageUrl(e.target.value)}
                  placeholder="Paste image URL (https://...) or choose file from device above"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono shadow-sm"
                />

                {/* Quick Presets */}
                <div className="flex gap-1.5 mt-2 flex-wrap items-center">
                  <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Presets:</span>
                  {[
                    { label: '🌅 Sunset', url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1000&auto=format&fit=crop&q=80' },
                    { label: '🍽️ Food', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80' },
                    { label: '🏛️ Architecture', url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1000&auto=format&fit=crop&q=80' },
                    { label: '🗼 Tokyo', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1000&auto=format&fit=crop&q=80' },
                    { label: '🏖️ Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop&q=80' },
                    { label: '🏔️ Alps', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1000&auto=format&fit=crop&q=80' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setUploadImageUrl(p.url);
                        if (!uploadTitle) setUploadTitle(`${p.label.substring(2)} Highlight`);
                      }}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Live Preview Thumbnail */}
                {uploadImageUrl && (
                  <div className="mt-2.5 flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <img
                      src={uploadImageUrl}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0 border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.3';
                      }}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Photo preview loaded
                      </span>
                      <div className="text-[10px] text-slate-500 truncate">
                        Ready to store permanently in MongoDB Atlas
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Location & Tags */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={uploadLocation}
                    onChange={(e) => setUploadLocation(e.target.value)}
                    placeholder="e.g. Pont Neuf, Paris"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="Sunset, Sightseeing"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                </div>
              </div>

              {/* Trip Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Add to Trip
                </label>
                <select
                  value={uploadTripTarget}
                  onChange={(e) => setUploadTripTarget(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm cursor-pointer"
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Caption / Story Note
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const story = generateAiJournalStory({
                        title: uploadTitle,
                        location: uploadLocation,
                        destination: getTripNameById(uploadTripTarget),
                      });
                      setUploadCaption(story.caption);
                      if (uploadTags === 'Travel, Moments' || !uploadTags.trim()) {
                        setUploadTags(story.tags.join(', '));
                      }
                    }}
                    className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2 py-0.5 text-[10px] font-bold hover:bg-emerald-100 transition-colors shadow-sm"
                    title="Generate AI Travel Journal reflection (VPM-63)"
                  >
                    <Sparkles size={11} />
                    <span>AI Generate Story</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Share a story or memory about this moment..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 resize-none shadow-sm"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting && <Sparkles size={13} className="animate-spin" />}
                  <span>{isSubmitting ? 'Saving to Atlas DB...' : 'Publish Memory'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
