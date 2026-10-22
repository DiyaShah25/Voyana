/**
 * Trip Dashboard Modal
 * Overview dashboard for all user trips showing active, upcoming,
 * and past trips with quick-action cards and trip creation.
 */

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
  const [newCurrency, setNewCurrency] = useState('USD');
  const [newTravelStyle, setNewTravelStyle] = useState('Friends Getaway');
  const [newInvitedEmails, setNewInvitedEmails] = useState('');
  const [newCoverImage, setNewCoverImage] = useState('');
  const [newAutoSchedule, setNewAutoSchedule] = useState(true);
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
    const invitedList = newInvitedEmails
      .split(',')
      .map((em) => em.trim())
      .filter((em) => em.includes('@'));

    const input: CreateTripInput = {
      title: newTitle,
      destination: newDestination,
      country: newCountry || 'Global Destination',
      startDate: newStartDate,
      endDate: newEndDate,
      description: newDescription,
      budgetTarget: newBudget,
      currency: newCurrency,
      visibility: newVisibility,
      travelStyle: newTravelStyle,
      invitedEmails: invitedList,
      coverImage: newCoverImage || undefined,
      autoGenerateSchedule: newAutoSchedule,
      tags: ['Custom Plan', newTravelStyle],
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
              <Compass size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Trip Planning & Workspace</h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Workspace Hub
                </span>
              </div>
              <p className="text-xs text-slate-500">Collaborative itineraries, shared calendar, group chat & voting</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={14} />
              <span>New Trip</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Toolbar */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('my_trips')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'my_trips'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>✈️ Active Trips ({userTrips.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'templates'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Curated Templates ({templates.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destination or trip name..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 1. MY TRIPS TAB */}
          {activeTab === 'my_trips' && (
            <div>
              {filteredUserTrips.length === 0 ? (
                <div className="text-center py-16 bg-slate-50/70 border border-dashed border-slate-200 rounded-3xl p-8">
                  <Compass size={40} className="mx-auto text-slate-400 mb-3" />
                  <h3 className="text-base font-bold text-slate-900">No active trip workspaces</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-6 max-w-sm mx-auto">
                    Create your own custom group trip or clone one of our curated itineraries with 1-click.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setIsCreating(true)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95"
                    >
                      + Create Custom Trip
                    </button>
                    <button
                      onClick={() => setActiveTab('templates')}
                      className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
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
                      className="group bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-emerald-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 shadow-sm hover:shadow-lg flex flex-col justify-between relative"
                    >
                      {/* Cover Photo */}
                      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                        <img
                          src={trip.coverImage}
                          alt={trip.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />

                        {/* Top Chips */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-800 flex items-center gap-1 shadow-sm">
                            <MapPin size={11} className="text-emerald-600" />
                            <span>{trip.destination}</span>
                          </span>
                          <span className="bg-emerald-800/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-white shadow-sm">
                            {calculateDaysToGo(trip.startDate)}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleDelete(trip.id, e)}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors shadow-sm"
                          title="Delete trip"
                        >
                          <Trash2 size={14} />
                        </button>

                        {/* Title over scrim */}
                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-base font-bold text-white group-hover:text-emerald-200 transition-colors drop-shadow-sm">
                            {trip.title}
                          </h3>
                          <p className="text-xs text-slate-200 flex items-center gap-1.5 mt-0.5 drop-shadow-sm">
                            <Calendar size={12} className="text-amber-400" />
                            <span>{trip.startDate} – {trip.endDate}</span>
                          </p>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3">
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {trip.description || 'Collaborative itinerary planning with group members.'}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          {/* Members Avatars */}
                          <div className="flex items-center -space-x-2">
                            {trip.members && trip.members.slice(0, 4).map((m, idx) => (
                              <div
                                key={m.id || idx}
                                className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm"
                                title={`${m.name} (${m.role})`}
                              >
                                {m.name.substring(0, 2).toUpperCase()}
                              </div>
                            ))}
                            {trip.members && trip.members.length > 4 && (
                              <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-600 font-semibold shadow-sm">
                                +{trip.members.length - 4}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700">
                              ${trip.budgetTarget} Budget
                            </span>
                            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
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
                  className="bg-white border border-slate-200 hover:border-emerald-500/50 rounded-2xl overflow-hidden flex flex-col justify-between transition-all group shadow-sm hover:shadow-lg"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                    <img
                      src={tpl.coverImage}
                      alt={tpl.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-200 text-[11px] font-semibold text-amber-700 flex items-center gap-1 shadow-sm">
                      <Sparkles size={11} className="fill-amber-500 text-amber-500" />
                      <span>Curated Template</span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1">{tpl.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{tpl.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">${tpl.budgetTarget} Est.</span>
                      <button
                        onClick={() => handleClone(tpl.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95"
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 overflow-hidden my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
                  <Compass size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Create Trip Workspace</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      New Expedition
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Set destination, travel style, budget, and invite friends</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTripSubmit} className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trip Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Cherry Blossoms & Neon Nights in Tokyo"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Destination *</label>
                  <input
                    type="text"
                    required
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    placeholder="e.g. Tokyo"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    placeholder="e.g. Japan"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                  />
                </div>
              </div>

              {/* Travel Style Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Travel Style & Vibe</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    'Friends Getaway',
                    'Romantic Couple',
                    'Solo Exploration',
                    'Family Adventure',
                    'Luxury & Wellness',
                    'Budget Backpacker',
                  ].map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setNewTravelStyle(style)}
                      className={`p-2 rounded-xl border text-[11px] font-semibold transition-all text-center ${
                        newTravelStyle === style
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                </div>
              </div>

              {/* Budget & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Budget Allocation Target</label>
                  <input
                    type="number"
                    min={0}
                    value={newBudget}
                    onChange={(e) => setNewBudget(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="AED">AED (AED)</option>
                  </select>
                </div>
              </div>

              {/* Collaborators Invitation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invite Collaborator Emails</label>
                <input
                  type="text"
                  value={newInvitedEmails}
                  onChange={(e) => setNewInvitedEmails(e.target.value)}
                  placeholder="diya@voyana.com, bhavika@voyana.com, jagrat@voyana.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Separate multiple emails with commas. They will receive Editor access.</span>
              </div>

              {/* Cover Photo Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trip Cover Image</label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { label: 'Paris', url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80' },
                    { label: 'Tokyo', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80' },
                    { label: 'Dubai', url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop&q=80' },
                    { label: 'Bali', url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80' },
                    { label: 'Rome', url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop&q=80' },
                    { label: 'Alps', url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=800&auto=format&fit=crop&q=80' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setNewCoverImage(p.url)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap ${
                        newCoverImage === p.url
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-schedule checkbox */}
              <label className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 cursor-pointer shadow-sm">
                <input
                  type="checkbox"
                  checked={newAutoSchedule}
                  onChange={(e) => setNewAutoSchedule(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-600 bg-white"
                />
                <span className="font-medium">Auto-generate initial recommended day-by-day sightseeing activities</span>
              </label>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Workspace...' : 'Launch Trip Workspace Hub'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
