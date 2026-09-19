import React, { useState } from 'react';
import {
  Share2, Copy, Check, QrCode, Globe2, Lock,
  Users, Shield, Eye, X, Send, Sparkles, MapPin, Calendar
} from 'lucide-react';
import {
  generateShareLink,
  updateTripVisibility,
  addTripMember,
  type Trip,
  type TripMemberRole,
  type TripVisibility,
} from '@/services/tripService';

export interface TripShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onTripUpdated?: (updated: Trip) => void;
}

export default function TripShareModal({
  isOpen,
  onClose,
  trip,
  onTripUpdated,
}: TripShareModalProps) {
  const [selectedRole, setSelectedRole] = useState<TripMemberRole>('editor');
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showPublicPreview, setShowPublicPreview] = useState(false);
  const [visibility, setVisibility] = useState<TripVisibility>(trip.visibility || 'shared');

  if (!isOpen) return null;

  const shareLink = generateShareLink(trip.id, selectedRole);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleVisibilityChange = async (newVis: TripVisibility) => {
    setVisibility(newVis);
    const res = await updateTripVisibility(trip.id, newVis);
    if (res.success && res.trip && onTripUpdated) {
      onTripUpdated(res.trip);
    }
  };

  const handleDirectInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSending(true);
    const res = await addTripMember(trip.id, inviteEmail, selectedRole);
    setIsSending(false);
    if (res.success) {
      setInviteEmail('');
      alert(`Invitation sent to ${inviteEmail} with ${selectedRole} permissions!`);
      if (onTripUpdated) {
        onTripUpdated(trip);
      }
    } else {
      alert(res.error || 'Failed to send invite');
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl shadow-2xl p-6 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Share & Invite Collaborators</h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-[280px]">{trip.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Visibility Setting */}
        <div className="py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Trip Access Level</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'shared', label: 'Shared Link', icon: Users, desc: 'Anyone with link' },
                { id: 'public', label: 'Public', icon: Globe2, desc: 'Visible on Explore' },
                { id: 'private', label: 'Private', icon: Lock, desc: 'Only invited members' },
              ].map((v) => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.id}
                    onClick={() => handleVisibilityChange(v.id as TripVisibility)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      visibility === v.id
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-slate-400'
                    }`}
                  >
                    <Icon size={14} className={visibility === v.id ? 'text-indigo-400' : 'text-slate-500'} />
                    <p className="text-xs font-bold mt-1">{v.label}</p>
                    <p className="text-[10px] opacity-75">{v.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role Permission Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Invite Link Permission</label>
            <div className="flex gap-2">
              {[
                { id: 'editor', label: 'Editor (Plan & Edit)', icon: '✏️' },
                { id: 'viewer', label: 'Viewer (View Only)', icon: '👁️' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r.id as TripMemberRole)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    selectedRole === r.id
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
                  }`}
                >
                  <span>{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Copy Shareable Link Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">Shareable Invite URL</label>
            <div className="flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl p-1.5 pl-3">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="bg-transparent text-xs text-slate-300 flex-1 focus:outline-none font-mono truncate"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition-all"
              >
                {copied ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Email Invite Row */}
          <form onSubmit={handleDirectInvite} className="space-y-1.5 pt-2 border-t border-white/5">
            <label className="block text-xs font-medium text-slate-400">Or Send Direct Email Invitation</label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
              />
              <button
                type="submit"
                disabled={isSending}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white border border-white/10 flex items-center gap-1.5"
              >
                <Send size={13} />
                <span>{isSending ? 'Sending...' : 'Invite'}</span>
              </button>
            </div>
          </form>

          {/* Public Preview Button */}
          <div className="pt-2 flex items-center justify-between border-t border-white/5">
            <button
              onClick={() => setShowPublicPreview(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-semibold"
            >
              <Eye size={14} />
              <span>Preview Public Itinerary View</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* ─── PUBLIC ITINERARY PREVIEW SUB-MODAL ────────────────────────────── */}
      {showPublicPreview && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Globe2 size={16} className="text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Public Itinerary Preview</h4>
              </div>
              <button onClick={() => setShowPublicPreview(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="relative h-48 rounded-2xl overflow-hidden mb-4">
              <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h3 className="text-lg font-bold text-white">{trip.title}</h3>
                <p className="text-xs text-slate-300 flex items-center gap-2">
                  <MapPin size={12} className="text-emerald-400" /> {trip.destination} ·
                  <Calendar size={12} className="text-amber-400" /> {trip.startDate} to {trip.endDate}
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scheduled Activities</h5>
              {trip.activities && trip.activities.length > 0 ? (
                trip.activities.map((a) => (
                  <div key={a.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-indigo-400 font-bold">Day {a.dayNumber} · {a.timeSlot}</span>
                      <h6 className="text-xs font-semibold text-white">{a.title}</h6>
                    </div>
                    {a.cost ? <span className="text-xs font-bold text-white">${a.cost}</span> : null}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No scheduled activities yet.</p>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowPublicPreview(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
