/**
 * Travel Memories Modal
 * Photo & video journal with drag-and-drop upload, multi-file batch,
 * Albums/Folders view, gallery grid, timeline, lightbox, likes, tags.
 * Fully connected to MongoDB Atlas 'memories' collection.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Camera, X, Heart, MapPin, Calendar, Tag, Search, ZoomIn, Download,
  Trash2, Plus, Clock, Grid3X3, Image as ImageIcon, Sparkles, ChevronDown,
  Upload, CheckCircle2, Video, FolderOpen, Play, Film, Filter,
} from 'lucide-react';
import { getAllMemories, uploadTripMemory, likeTripMemory, deleteTripMemory, generateAiJournalStory, type TripMemory } from '@/services/collaborationService';
import { getUserTrips, type Trip } from '@/services/tripService';

export interface TravelMemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { name: string; email: string };
  initialTripId?: string;
}

type ViewMode = 'gallery' | 'timeline' | 'albums';
type SortMode = 'newest' | 'likes' | 'oldest';
type MediaType = 'photo' | 'video';

export default function TravelMemoriesModal({
  isOpen,
  onClose,
  currentUser = { name: 'Diya Shah', email: 'diya@voyana.com' },
  initialTripId,
}: TravelMemoriesModalProps) {
  // ── Data ──────────────────────────────────────────────────────────────
  const [allMemories, setAllMemories] = useState<TripMemory[]>([]);
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Filters & Sorting ─────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedTripId, setSelectedTripId] = useState<string>(initialTripId || 'all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>('all');

  // ── Albums ────────────────────────────────────────────────────────────
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  // ── Lightbox ──────────────────────────────────────────────────────────
  const [lightboxMemory, setLightboxMemory] = useState<TripMemory | null>(null);

  // ── Upload Form ───────────────────────────────────────────────────────
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadLocation, setUploadLocation] = useState('');
  const [uploadImageUrl, setUploadImageUrl] = useState('');
  const [uploadTags, setUploadTags] = useState('Travel, Moments');
  const [uploadTripTarget, setUploadTripTarget] = useState(initialTripId || 'trip-user-01');
  const [uploadMediaType, setUploadMediaType] = useState<MediaType>('photo');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<{ file: File; dataUrl: string; mediaType: MediaType }[]>([]);
  const [uploadQueueIndex, setUploadQueueIndex] = useState(0);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ── Load Data ─────────────────────────────────────────────────────────
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [trips, mems] = await Promise.all([
        getUserTrips(),
        getAllMemories({ tripId: initialTripId }),
      ]);
      const activeTrips = initialTripId ? trips.filter(trip => trip.id === initialTripId) : trips;
      const defaultTripsList: Trip[] = activeTrips.length > 0 ? activeTrips : [
        { id: 'trip-user-01', title: 'Autumn in Paris & Provence', destination: 'Paris, France' } as any,
        { id: 'trip-user-02', title: 'Tokyo Cyberpunk & Ancient Temples', destination: 'Tokyo, Japan' } as any,
        { id: 'trip-user-03', title: 'Swiss Alps & Scenic Lakes', destination: 'Zermatt, Switzerland' } as any,
      ];
      setUserTrips(defaultTripsList);
      setUploadTripTarget(initialTripId || defaultTripsList[0]?.id || 'trip-user-01');
      setSelectedTripId(initialTripId || 'all');
      setAllMemories(mems);
    } catch (err) {
      console.error('[TravelMemoriesModal] Error loading memories from Atlas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [initialTripId]);

  useEffect(() => {
    if (isOpen) loadAllData();
  }, [isOpen, loadAllData]);

  if (!isOpen) return null;

  // ── Derived Data ──────────────────────────────────────────────────────
  const allTags = Array.from(new Set(allMemories.flatMap(m => m.tags || [])));

  const filteredMemories = allMemories.filter(mem => {
    const matchesTripFilter = selectedTripId === 'all' || mem.tripId === selectedTripId;
    const matchesTagFilter = selectedTag === 'all' || (mem.tags && mem.tags.includes(selectedTag));
    const matchesSearch =
      !searchQuery.trim() ||
      mem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mem.caption || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mem.locationName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      mem.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMedia =
      mediaFilter === 'all' ||
      (mediaFilter === 'video' && (mem as any).mediaType === 'video') ||
      (mediaFilter === 'photo' && (mem as any).mediaType !== 'video');
    return matchesTripFilter && matchesTagFilter && matchesSearch && matchesMedia;
  });

  const sortedMemories = [...filteredMemories].sort((a, b) => {
    if (sortMode === 'likes') return (b.likes?.length || 0) - (a.likes?.length || 0);
    if (sortMode === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const groupedByDate: Record<string, TripMemory[]> = {};
  sortedMemories.forEach(mem => {
    const dateKey = mem.date || 'Unknown Date';
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(mem);
  });
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const totalLikes = allMemories.reduce((sum, m) => sum + (m.likes?.length || 0), 0);
  const videoCount = allMemories.filter(m => (m as any).mediaType === 'video').length;
  const albumCount = new Set(allMemories.map(m => m.tripId)).size;

  // ── Helpers ───────────────────────────────────────────────────────────
  const getTripNameById = (tripId: string) => {
    const trip = userTrips.find(t => t.id === tripId);
    if (trip) return `${trip.title} — ${trip.destination}`;
    if (tripId === 'trip-user-01') return 'Autumn in Paris & Provence';
    if (tripId === 'trip-user-02') return 'Tokyo Cyberpunk & Ancient Temples';
    if (tripId === 'trip-user-03') return 'Swiss Alps & Scenic Lakes';
    return tripId;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return dateStr; }
  };

  const isVideoUrl = (url: string, mediaType?: string) =>
    mediaType === 'video' || url?.startsWith('data:video');

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleLike = async (mem: TripMemory) => {
    const isLiked = mem.likes?.includes(currentUser.name);
    const updatedLikes = isLiked
      ? (mem.likes || []).filter(u => u !== currentUser.name)
      : [...(mem.likes || []), currentUser.name];

    setAllMemories(prev => prev.map(m => m.id === mem.id ? { ...m, likes: updatedLikes } : m));
    if (lightboxMemory?.id === mem.id) setLightboxMemory({ ...lightboxMemory, likes: updatedLikes });

    const res = await likeTripMemory(mem.tripId, mem.id, currentUser.name);
    if (res.success && res.likes) {
      setAllMemories(prev => prev.map(m => m.id === mem.id ? { ...m, likes: res.likes } : m));
      if (lightboxMemory?.id === mem.id) setLightboxMemory({ ...lightboxMemory, likes: res.likes });
    }
  };

  const handleDelete = async (mem: TripMemory) => {
    if (!window.confirm(`Delete "${mem.title}" from your travel memories?`)) return;
    setAllMemories(prev => prev.filter(m => m.id !== mem.id));
    if (lightboxMemory?.id === mem.id) setLightboxMemory(null);
    await deleteTripMemory(mem.tripId, mem.id);
  };

  // Load a queued file into the form
  const loadQueueItem = (idx: number, queue?: typeof uploadQueue) => {
    const q = queue || uploadQueue;
    if (idx >= q.length) return;
    const item = q[idx];
    setUploadQueueIndex(idx);
    setUploadImageUrl(item.dataUrl);
    setUploadMediaType(item.mediaType);
    const cleanName = item.file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setUploadTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    setUploadCaption('');
    setUploadLocation('');
    setUploadTags('Travel, Moments');
  };

  const processFiles = (files: File[]) => {
    if (!files.length) return;
    const queue: typeof uploadQueue = [];
    let processed = 0;
    files.forEach(file => {
      const isVid = file.type.startsWith('video/');
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          queue.push({ file, dataUrl: reader.result, mediaType: isVid ? 'video' : 'photo' });
          processed++;
          if (processed === files.length) {
            setUploadQueue(queue);
            loadQueueItem(0, queue);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    processFiles(files);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadImageUrl.trim()) return;
    setIsSubmitting(true);
    try {
      const parsedTags = uploadTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t.length > 0);
      const saved = await uploadTripMemory(uploadTripTarget, {
        uploadedBy: currentUser.name,
        title: uploadTitle.trim(),
        caption: uploadCaption.trim() || undefined,
        locationName: uploadLocation.trim() || undefined,
        imageUrl: uploadImageUrl.trim(),
        date: new Date().toISOString().split('T')[0],
        tags: parsedTags.length > 0 ? parsedTags : ['Travel', 'Moments'],
        mediaType: uploadMediaType,
      } as any);

      setAllMemories(prev => [saved, ...prev.filter(m => m.id !== saved.id)]);

      const nextIdx = uploadQueueIndex + 1;
      if (nextIdx < uploadQueue.length) {
        loadQueueItem(nextIdx);
      } else {
        setShowUploadForm(false);
        setUploadTitle(''); setUploadCaption(''); setUploadLocation('');
        setUploadImageUrl(''); setUploadTags('Travel, Moments');
        setUploadQueue([]); setUploadQueueIndex(0); setUploadMediaType('photo');
        await loadAllData();
      }
    } catch (err) {
      console.error('[TravelMemoriesModal] Failed to upload memory:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeUploadForm = () => {
    setShowUploadForm(false);
    setUploadQueue([]); setUploadQueueIndex(0);
    setUploadTitle(''); setUploadCaption(''); setUploadLocation('');
    setUploadImageUrl(''); setUploadTags('Travel, Moments'); setUploadMediaType('photo');
  };

  // ── Memory Card ───────────────────────────────────────────────────────
  const MemoryCard = ({ mem }: { mem: TripMemory }) => {
    const isLikedByMe = mem.likes.includes(currentUser.name);
    const isVid = isVideoUrl(mem.imageUrl, (mem as any).mediaType);
    return (
      <div className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-emerald-500/60 hover:shadow-xl transition-all duration-300 flex flex-col shadow-sm">
        {/* Media */}
        <div onClick={() => setLightboxMemory(mem)} className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden cursor-pointer">
          {isVid ? (
            <video
              src={mem.imageUrl}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              muted loop playsInline
              onMouseEnter={e => (e.target as HTMLVideoElement).play().catch(() => {})}
              onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
            />
          ) : (
            <img src={mem.imageUrl} alt={mem.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/10 opacity-70 group-hover:opacity-85 transition-opacity" />

          {/* Video badge */}
          {isVid && (
            <div className="absolute top-3 left-3 bg-violet-700/90 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow backdrop-blur-sm">
              <Play size={9} className="fill-white" /> VIDEO
            </div>
          )}

          {/* Location Pill */}
          {mem.locationName && !isVid && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 max-w-[160px] shadow-sm">
              <MapPin size={10} className="text-rose-500 flex-shrink-0" />
              <span className="truncate">{mem.locationName}</span>
            </div>
          )}

          {/* Zoom hint */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/60 text-white">
            {isVid ? <Play size={13} /> : <ZoomIn size={13} />}
          </div>

          {/* Title at bottom */}
          <div className="absolute bottom-3 left-3 right-3">
            <h4 className="text-sm font-bold text-white drop-shadow-md truncate">{mem.title}</h4>
            <p className="text-[10px] text-slate-200 flex items-center gap-1.5 mt-0.5">
              <span>by {mem.uploadedBy}</span><span>·</span><span>{mem.date}</span>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
          {mem.caption && <p className="text-xs text-slate-600 italic leading-relaxed line-clamp-2">"{mem.caption}"</p>}

          {mem.tags && mem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {mem.tags.slice(0, 4).map(t => (
                <span key={t} onClick={() => setSelectedTag(t)}
                  className="cursor-pointer text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button onClick={() => handleLike(mem)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${isLikedByMe ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600 hover:text-rose-600'}`}>
              <Heart size={12} className={isLikedByMe ? 'fill-rose-500 text-rose-500' : ''} />
              <span>{mem.likes.length}</span>
            </button>
            <button onClick={() => handleDelete(mem)} className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors" title="Delete memory">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-900/65 backdrop-blur-md animate-fade-in overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="memories-modal-title">
      <div className="relative w-full max-w-5xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl shadow-slate-950/20 overflow-hidden my-auto flex flex-col max-h-[88vh]">

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/90 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
              <Camera size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="memories-modal-title" className="text-lg font-bold text-slate-900">Travel Memories</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5" title="Directly connected to MongoDB Atlas">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live · {allMemories.length} memories
                </span>
              </div>
              <p className="text-xs text-slate-500">Capture, relive & share your beautiful travel moments 📸</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95"
            >
              <Upload size={14} />
              <span>Add Memory</span>
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── STATS BAR ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-3.5 border-b border-slate-200 bg-slate-50/70">
          {[
            { label: 'Photos', value: allMemories.length - videoCount, icon: ImageIcon, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { label: 'Videos', value: videoCount, icon: Film, color: 'text-violet-700 bg-violet-50 border-violet-200' },
            { label: 'Total Likes', value: totalLikes, icon: Heart, color: 'text-rose-600 bg-rose-50 border-rose-200' },
            { label: 'Albums', value: albumCount, icon: FolderOpen, color: 'text-amber-700 bg-amber-50 border-amber-200' },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
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

        {/* ── TOOLBAR ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-slate-200 bg-white">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search memories, locations, people..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm" />
          </div>

          {/* Media filter */}
          <div className="flex bg-slate-100 rounded-xl border border-slate-200 p-0.5">
            {(['all', 'photo', 'video'] as const).map(f => (
              <button key={f} onClick={() => setMediaFilter(f)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all capitalize ${mediaFilter === f ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                {f === 'video' ? '🎬' : f === 'photo' ? '📷' : '🎞️'} {f}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}
              className="bg-white border border-slate-200 rounded-xl px-3 pr-7 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 shadow-sm cursor-pointer appearance-none">
              <option value="newest">Newest First</option>
              <option value="likes">Most Liked</option>
              <option value="oldest">Oldest First</option>
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* View Mode */}
          <div className="flex bg-slate-100 rounded-xl border border-slate-200 p-0.5">
            {[
              { id: 'gallery' as ViewMode, icon: Grid3X3, label: 'Gallery' },
              { id: 'albums' as ViewMode, icon: FolderOpen, label: 'Albums' },
              { id: 'timeline' as ViewMode, icon: Clock, label: 'Timeline' },
            ].map(mode => {
              const Icon = mode.icon;
              return (
                <button key={mode.id} onClick={() => { setViewMode(mode.id); setSelectedAlbum(null); }}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${viewMode === mode.id ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                  <Icon size={12} /><span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAG CLOUD ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-6 py-2 overflow-x-auto border-b border-slate-100 bg-slate-50/50">
          <Tag size={11} className="text-slate-400 flex-shrink-0" />
          <button onClick={() => setSelectedTag('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedTag === 'all' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
            All Tags
          </button>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedTag === tag ? 'bg-emerald-700 text-white shadow-sm' : 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'}`}>
              #{tag}
            </button>
          ))}
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3 text-emerald-700 animate-pulse">
                <Camera size={24} />
              </div>
              <p className="text-xs font-semibold text-slate-500">Loading your travel memories...</p>
            </div>
          ) : viewMode === 'albums' ? (
            /* ── Albums View ──────────────────────────────────────── */
            selectedAlbum ? (
              <div>
                <button onClick={() => setSelectedAlbum(null)}
                  className="mb-5 flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl transition">
                  ← Back to Albums
                </button>
                {allMemories.filter(m => m.tripId === selectedAlbum).length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <FolderOpen size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">This album is empty</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allMemories.filter(m => m.tripId === selectedAlbum).map(mem => (
                      <MemoryCard key={mem.id} mem={mem} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FolderOpen size={16} className="text-amber-600" />
                  Trip Albums ({albumCount})
                </h3>
                {albumCount === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl">
                    <FolderOpen size={36} className="mx-auto mb-3 opacity-30 text-slate-400" />
                    <p className="text-sm font-medium text-slate-500">No albums yet — upload your first memory!</p>
                    <button onClick={() => setShowUploadForm(true)} className="mt-4 px-5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow">Upload Memory</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {Array.from(new Set(allMemories.map(m => m.tripId))).map(tripId => {
                      const albumMems = allMemories.filter(m => m.tripId === tripId);
                      const vids = albumMems.filter(m => (m as any).mediaType === 'video').length;
                      const photos = albumMems.length - vids;
                      const trip = userTrips.find(t => t.id === tripId);
                      const tripName = trip?.title || (
                        tripId === 'trip-user-01' ? 'Autumn in Paris & Provence' :
                        tripId === 'trip-user-02' ? 'Tokyo Cyberpunk & Ancient Temples' :
                        tripId === 'trip-user-03' ? 'Swiss Alps & Scenic Lakes' : tripId
                      );
                      const tripDest = trip?.destination || (
                        tripId === 'trip-user-01' ? 'Paris, France' :
                        tripId === 'trip-user-02' ? 'Tokyo, Japan' :
                        tripId === 'trip-user-03' ? 'Zermatt, Switzerland' : ''
                      );
                      return (
                        <button key={tripId} onClick={() => setSelectedAlbum(tripId)}
                          className="group relative rounded-3xl overflow-hidden border-2 border-slate-200 hover:border-emerald-500 shadow-md hover:shadow-2xl transition-all duration-300 text-left bg-white">
                          {/* Cover mosaic */}
                          <div className="relative h-52 bg-slate-100 overflow-hidden">
                            <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
                              {[...albumMems.slice(0, 3), null].map((mem, idx) => (
                                <div key={idx} className={`overflow-hidden relative ${idx === 0 ? 'row-span-2' : ''}`}>
                                  {mem ? (
                                    isVideoUrl(mem.imageUrl, (mem as any).mediaType) ? (
                                      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                        <Film size={20} className="text-white/50" />
                                      </div>
                                    ) : (
                                      <img src={mem.imageUrl} alt={mem.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    )
                                  ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                      <Plus size={16} className="text-slate-300" />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-transparent" />
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/60 shadow">
                              {albumMems.length} items
                            </div>
                          </div>
                          {/* Info */}
                          <div className="p-4">
                            <h3 className="text-sm font-bold text-slate-900 truncate">{tripName}</h3>
                            {tripDest && (
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                <MapPin size={10} className="text-rose-400" />{tripDest}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold">
                              {photos > 0 && <span className="flex items-center gap-1 text-emerald-700"><ImageIcon size={10} />{photos} photos</span>}
                              {vids > 0 && <span className="flex items-center gap-1 text-violet-600"><Video size={10} />{vids} videos</span>}
                            </div>
                          </div>
                          <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-bold text-emerald-700">Open →</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          ) : sortedMemories.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/70 border border-dashed border-slate-200 rounded-3xl">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3 text-emerald-700">
                <ImageIcon size={28} />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">
                {searchQuery || selectedTag !== 'all' || selectedTripId !== 'all' ? 'No memories match your filters' : 'No Travel Memories Yet'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
                {searchQuery || selectedTag !== 'all' || selectedTripId !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Upload photos & videos from your trips, tag them, and build a beautiful shared photo journal.'}
              </p>
              <button
                onClick={() => {
                  if (searchQuery || selectedTag !== 'all' || selectedTripId !== 'all') {
                    setSearchQuery(''); setSelectedTag('all'); setSelectedTripId('all');
                  } else {
                    setShowUploadForm(true);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md transition-all hover:scale-105"
              >
                {searchQuery || selectedTag !== 'all' || selectedTripId !== 'all' ? 'Clear Filters' : '📸 Upload First Memory'}
              </button>
            </div>
          ) : viewMode === 'gallery' ? (
            /* ── Gallery Grid ────────────────────────────────────── */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedMemories.map(mem => <MemoryCard key={mem.id} mem={mem} />)}
            </div>
          ) : (
            /* ── Timeline View ───────────────────────────────────── */
            <div className="relative pl-8">
              <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 to-emerald-100 rounded" />
              {sortedDates.map(dateKey => (
                <div key={dateKey} className="mb-8">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {groupedByDate[dateKey].map(mem => <MemoryCard key={mem.id} mem={mem} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── LIGHTBOX ────────────────────────────────────────────────────── */}
      {lightboxMemory && (
        <div onClick={() => setLightboxMemory(null)} className="fixed inset-0 z-[1350] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div onClick={e => e.stopPropagation()} className="relative max-w-4xl w-full bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-auto">
            {/* Media */}
            <div className="relative w-full aspect-[16/9] bg-slate-950 flex items-center justify-center overflow-hidden">
              {isVideoUrl(lightboxMemory.imageUrl, (lightboxMemory as any).mediaType) ? (
                <video src={lightboxMemory.imageUrl} className="w-full h-full object-contain" controls autoPlay muted />
              ) : (
                <img src={lightboxMemory.imageUrl} alt={lightboxMemory.title} className="w-full h-full object-contain" />
              )}
              <button onClick={() => setLightboxMemory(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-lg transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Info */}
            <div className="p-6 flex flex-col gap-3 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{lightboxMemory.title}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <MapPin size={11} className="text-rose-500" />
                    <span>{lightboxMemory.locationName || 'Unknown Location'}</span>
                    <span>·</span><span>by {lightboxMemory.uploadedBy}</span>
                    <span>·</span><span>{formatDate(lightboxMemory.date)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleLike(lightboxMemory)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${lightboxMemory.likes.includes(currentUser.name) ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    <Heart size={14} className={lightboxMemory.likes.includes(currentUser.name) ? 'fill-rose-500 text-rose-500' : ''} />
                    <span>{lightboxMemory.likes.length} {lightboxMemory.likes.length === 1 ? 'Like' : 'Likes'}</span>
                  </button>
                  <a href={lightboxMemory.imageUrl} target="_blank" rel="noreferrer" download
                    className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors" title="Download">
                    <Download size={15} />
                  </a>
                </div>
              </div>

              {lightboxMemory.caption && (
                <p className="text-xs text-slate-600 italic bg-slate-50 border border-slate-200 p-3 rounded-2xl leading-relaxed">"{lightboxMemory.caption}"</p>
              )}

              {lightboxMemory.tags && lightboxMemory.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {lightboxMemory.tags.map(t => (
                    <span key={t} className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">#{t}</span>
                  ))}
                </div>
              )}

              {lightboxMemory.likes.length > 0 && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-100">
                  <Heart size={10} className="text-rose-500 fill-rose-500" />
                  <span>Liked by {lightboxMemory.likes.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD FORM ──────────────────────────────────────────────────── */}
      {showUploadForm && (
        <div className="fixed inset-0 z-[1250] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow">
                  <Upload size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Travel Memory</h3>
                  {uploadQueue.length > 1 && (
                    <p className="text-[10px] text-emerald-700 font-semibold">File {uploadQueueIndex + 1} of {uploadQueue.length}</p>
                  )}
                </div>
              </div>
              <button onClick={closeUploadForm} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">

              {/* ── Drag & Drop Zone ── */}
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 ${
                  isDragOver ? 'border-emerald-500 bg-emerald-50 scale-[1.01]' :
                  uploadImageUrl ? 'border-emerald-400 bg-emerald-50/30' :
                  'border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-slate-50'
                }`}
              >
                {uploadImageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden">
                    {uploadMediaType === 'video' ? (
                      <video src={uploadImageUrl} className="w-full h-44 object-cover rounded-2xl" controls muted />
                    ) : (
                      <img src={uploadImageUrl} alt="Preview" className="w-full h-44 object-cover rounded-2xl"
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                    )}
                    <div className="absolute top-2 left-2 bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow">
                      <CheckCircle2 size={10} /> {uploadMediaType === 'video' ? '🎬 Video ready' : '📷 Photo ready'}
                    </div>
                    <button type="button" onClick={() => { setUploadImageUrl(''); setUploadMediaType('photo'); }}
                      className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2.5 py-8 cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition">
                      <Upload size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700">Drag & drop photos or videos</p>
                      <p className="text-xs text-slate-400 mt-0.5">or <span className="text-emerald-600 font-semibold underline underline-offset-2">click to browse files</span></p>
                      <p className="text-[10px] text-slate-400 mt-1">Multi-select supported · JPG, PNG, MP4, MOV & more</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-full"><ImageIcon size={9} /> Photos</span>
                      <span className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-full"><Video size={9} /> Videos</span>
                    </div>
                    <input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>

              {/* Queue thumbnails */}
              {uploadQueue.length > 1 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 mb-1.5">Batch queue — click to edit each:</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {uploadQueue.map((item, idx) => (
                      <button key={idx} type="button" onClick={() => loadQueueItem(idx)}
                        className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${idx === uploadQueueIndex ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200 opacity-50 hover:opacity-100'}`}>
                        {item.mediaType === 'video' ? (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center"><Play size={14} className="text-white fill-white" /></div>
                        ) : (
                          <img src={item.dataUrl} alt={`q-${idx}`} className="w-full h-full object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* OR URL input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Or paste an image/video URL</label>
                <input type="text"
                  value={uploadImageUrl.startsWith('data:') ? '' : uploadImageUrl}
                  onChange={e => { setUploadImageUrl(e.target.value); setUploadMediaType('photo'); }}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-mono shadow-sm" />
              </div>

              {/* Quick presets */}
              <div className="flex gap-1.5 flex-wrap items-center">
                <span className="text-[10px] text-slate-400 font-semibold">Quick presets:</span>
                {[
                  { label: '🌅 Sunset', url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1000&auto=format&fit=crop&q=80' },
                  { label: '🍽️ Food', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80' },
                  { label: '🏛️ City', url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1000&auto=format&fit=crop&q=80' },
                  { label: '🏖️ Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop&q=80' },
                  { label: '🏔️ Alps', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1000&auto=format&fit=crop&q=80' },
                ].map(p => (
                  <button key={p.label} type="button" onClick={() => { setUploadImageUrl(p.url); setUploadMediaType('photo'); if (!uploadTitle) setUploadTitle(`${p.label.substring(2)} Highlight`); }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition whitespace-nowrap">
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Memory Title *</label>
                <input type="text" required value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Golden Hour at Eiffel Tower"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm" />
              </div>

              {/* Location & Tags */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                  <input type="text" value={uploadLocation} onChange={e => setUploadLocation(e.target.value)}
                    placeholder="e.g. Santorini, Greece"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (comma-separated)</label>
                  <input type="text" value={uploadTags} onChange={e => setUploadTags(e.target.value)}
                    placeholder="Sunset, Sightseeing"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm" />
                </div>
              </div>

              {/* Trip selector */}
              {userTrips.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Add to Trip</label>
                  <select value={uploadTripTarget} onChange={e => setUploadTripTarget(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm cursor-pointer">
                    {userTrips.map(trip => (
                      <option key={trip.id} value={trip.id}>{trip.title} — {trip.destination}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Caption with AI */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Caption / Story</label>
                  <button type="button" onClick={() => {
                    const story = generateAiJournalStory({ title: uploadTitle, location: uploadLocation, destination: getTripNameById(uploadTripTarget) });
                    setUploadCaption(story.caption);
                    if (uploadTags === 'Travel, Moments' || !uploadTags.trim()) setUploadTags(story.tags.join(', '));
                  }} className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2 py-0.5 text-[10px] font-bold hover:bg-emerald-100 transition shadow-sm">
                    <Sparkles size={10} /><span>AI Generate</span>
                  </button>
                </div>
                <textarea rows={2} value={uploadCaption} onChange={e => setUploadCaption(e.target.value)}
                  placeholder="Share a story or memory about this moment..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 resize-none shadow-sm" />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button type="button" onClick={closeUploadForm} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition">Cancel</button>
                <button type="submit" disabled={isSubmitting || !uploadImageUrl.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
                  {isSubmitting && <Sparkles size={12} className="animate-spin" />}
                  <span>
                    {isSubmitting ? 'Saving...' :
                     uploadQueue.length > 1 && uploadQueueIndex < uploadQueue.length - 1
                       ? `Save & Next (${uploadQueue.length - uploadQueueIndex - 1} remaining)`
                       : '✨ Publish Memory'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
