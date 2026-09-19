import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass, Plus, Calendar, MapPin, Users, Sparkles,
  ArrowRight, X, Copy, Check, Search, Filter, ShieldCheck,
  TrendingUp, Clock, Globe2, Trash2, Eye, Lock
} from 'lucide-react';
import {
  getUserTrips,
  getTripTemplates,
  createTrip,
  cloneTripTemplate,
  deleteTrip,
  type Trip,
  type CreateTripInput,
} from '@/services/tripService';

export interface TripDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onOpenWorkspace: (trip: Trip) => void;
}

export default function TripDashboardModal({
  isOpen,
  onClose,
  userId = 'usr-demo-01',
  onOpenWorkspace,
}: TripDashboardModalProps) {
  // State
  const [activeTab, setActiveTab] = useState<'my_trips' | 'templates'>('my_trips');
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [templates, setTemplates] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Trip Modal Wizard
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newStartDate, setNewStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [newEndDate, setNewEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 20);
    return d.toISOString().split('T')[0];
  });
  const [newDescription, setNewDescription] = useState('');
  const [newBudget, setNewBudget] = useState(2500);
  const [newVisibility, setNewVisibility] = useState<'shared' | 'private' | 'public'>('shared');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tripsData, templatesData] = await Promise.all([
        getUserTrips(userId),
        getTripTemplates(),
      ]);
      setUserTrips(tripsData);
      setTemplates(templatesData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  // Handle Create Trip
  const handleCreateTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDestination.trim()) return;

    setIsSubmitting(true);
    const input: CreateTripInput = {
      title: newTitle,
      destination: newDestination,
      country: newCountry || 'Global Destination',
      startDate: newStartDate,
      endDate: newEndDate,
      description: newDescription,
      budgetTarget: newBudget,
      visibility: newVisibility,
      tags: ['Custom Plan', 'Group Trip'],
    };

    const res = await createTrip(input, userId);
    setIsSubmitting(false);
    if (res.success && res.trip) {
      setIsCreating(false);
      loadData();
      onOpenWorkspace(res.trip);
    }
  };

  // Handle Clone Template
  const handleClone = async (templateId: string) => {
    setIsLoading(true);
    const res = await cloneTripTemplate(templateId, userId);
    setIsLoading(false);
    if (res.success && res.trip) {
      loadData();
      onOpenWorkspace(res.trip);
    }
  };

  // Handle Delete
  const handleDelete = async (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this trip workspace?')) {
      await deleteTrip(tripId);
      loadData();
    }
  };

  // Filtered lists
  const filteredUserTrips = userTrips.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q);
  });

  const filteredTemplates = templates.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q);
  });

  const calculateDaysToGo = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Past Trip';
    if (days === 0) return 'Starts Today!';
    return `in ${days} days`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Compass size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Trip Planning & Workspace</h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  VPM-4 / VPM-8
                </span>
              </div>
              <p className="text-xs text-slate-400">Collaborative itineraries, shared calendar, group chat & voting</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition-all"
            >
              <Plus size={14} />
              <span>New Trip</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Toolbar */}
        <div className="p-6 border-b border-white/10 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('my_trips')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'my_trips'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/5'
              }`}
            >
              <span>✈️ Active Trips ({userTrips.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'templates'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/5'
              }`}
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>Curated Templates ({templates.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destination or trip name..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 1. MY TRIPS TAB */}
          {activeTab === 'my_trips' && (
            <div>
              {filteredUserTrips.length === 0 ? (
                <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                  <Compass size={40} className="mx-auto text-slate-600 mb-3" />
                  <h3 className="text-base font-bold text-white">No active trip workspaces</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-6 max-w-sm mx-auto">
                    Create your own custom group trip or clone one of our curated itineraries with 1-click.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setIsCreating(true)}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25"
                    >
                      + Create Custom Trip
                    </button>
                    <button
                      onClick={() => setActiveTab('templates')}
                      className="px-5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold border border-white/10"
                    >
                      Explore Templates
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredUserTrips.map((trip) => (
                    <div
                      key={trip.id}
                      onClick={() => onOpenWorkspace(trip)}
                      className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-indigo-400/40 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between relative"
                    >
                      {/* Cover Photo */}
                      <div className="relative h-44 w-full overflow-hidden">
                        <img
                          src={trip.coverImage}
                          alt={trip.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                        {/* Top Chips */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-[11px] font-semibold text-white flex items-center gap-1">
                            <MapPin size={11} className="text-emerald-400" />
                            <span>{trip.destination}</span>
                          </span>
                          <span className="bg-indigo-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-indigo-400/30 text-[11px] font-semibold text-indigo-300">
                            {calculateDaysToGo(trip.startDate)}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleDelete(trip.id, e)}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600/80 text-slate-400 hover:text-white transition-colors"
                          title="Delete trip"
                        >
                          <Trash2 size={14} />
                        </button>

                        {/* Title over scrim */}
                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                            {trip.title}
                          </h3>
                          <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                            <Calendar size={12} className="text-amber-400" />
                            <span>{trip.startDate} – {trip.endDate}</span>
                          </p>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3">
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {trip.description || 'Collaborative itinerary planning with group members.'}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          {/* Members Avatars */}
                          <div className="flex items-center -space-x-2">
                            {trip.members && trip.members.slice(0, 4).map((m, idx) => (
                              <div
                                key={m.id || idx}
                                className="w-7 h-7 rounded-full bg-indigo-600 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white"
                                title={`${m.name} (${m.role})`}
                              >
                                {m.name.substring(0, 2).toUpperCase()}
                              </div>
                            ))}
                            {trip.members && trip.members.length > 4 && (
                              <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-300">
                                +{trip.members.length - 4}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-300">
                              ${trip.budgetTarget} Budget
                            </span>
                            <span className="p-1 rounded-lg bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              <ArrowRight size={14} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. CURATED TEMPLATES TAB */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {filteredTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-white/[0.03] border border-white/10 hover:border-indigo-400/40 rounded-2xl overflow-hidden flex flex-col justify-between transition-all group"
                >
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src={tpl.coverImage}
                      alt={tpl.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                      <Sparkles size={11} className="fill-amber-400" />
                      <span>Curated Template</span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">{tpl.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-3">{tpl.description}</p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs font-bold text-white">${tpl.budgetTarget} Est.</span>
                      <button
                        onClick={() => handleClone(tpl.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold shadow-md transition-all"
                      >
                        <Copy size={12} />
                        <span>Use Template</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── CREATE CUSTOM TRIP MODAL ─────────────────────────────────────── */}
      {isCreating && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl shadow-2xl p-6 overflow-hidden my-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New Trip Workspace</h3>
                  <p className="text-xs text-slate-400">Set destination, dates, and invite friends</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTripSubmit} className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Trip Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Summer in Tokyo with Friends"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Primary Destination *</label>
                  <input
                    type="text"
                    required
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    placeholder="e.g. Tokyo"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Country</label>
                  <input
                    type="text"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    placeholder="e.g. Japan"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Estimated Budget Target (USD)</label>
                <input
                  type="number"
                  min={0}
                  value={newBudget}
                  onChange={(e) => setNewBudget(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Trip Overview / Notes</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What is the vision for this trip?"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 flex items-center gap-2"
                >
                  {isSubmitting ? 'Creating Workspace...' : 'Create & Open Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
