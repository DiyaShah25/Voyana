import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Compass,
  Wallet,
  Plane,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/auth.types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥) - Japanese Yen' },
  { code: 'INR', symbol: '₹', label: 'INR (₹) - Indian Rupee' },
];

const TRAVEL_STYLES = [
  'Cultural & Historic',
  'Adventure & Nature',
  'Luxury & Wellness',
  'Eco & Sustainable',
  'Solo Explorer',
  'Gastronomy & Wine',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, switchRole } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [travelStyle, setTravelStyle] = useState('Cultural & Historic');
  const [homeAirport, setHomeAirport] = useState('');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || AVATAR_OPTIONS[0]);
      setCurrency(user.preferences?.preferredCurrency || 'USD');
      setTravelStyle(user.preferences?.travelStyle || 'Cultural & Historic');
      setHomeAirport(user.preferences?.homeAirport || 'JFK');
      setEmailAlerts(user.preferences?.emailNotifications ?? true);
      setSmsAlerts(user.preferences?.smsAlerts ?? false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSavedSuccess(false);

    if (!name.trim()) {
      setErrorMsg('Full name cannot be empty.');
      return;
    }

    setSaving(true);
    const ok = await updateProfile({
      name: name.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
      avatarUrl,
      preferences: {
        preferredCurrency: currency,
        travelStyle,
        homeAirport: homeAirport.trim().toUpperCase(),
        emailNotifications: emailAlerts,
        smsAlerts,
      },
    });
    setSaving(false);

    if (ok) {
      setSavedSuccess(true);
      window.setTimeout(() => setSavedSuccess(false), 2500);
    } else {
      setErrorMsg('Failed to update profile. Please try again.');
    }
  };

  const handleRoleChange = async (newRole: UserRole) => {
    await switchRole(newRole);
    setSavedSuccess(true);
    window.setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <User size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Traveler Profile & Preferences</h2>
              <p className="text-xs text-slate-500">Manage your identity, settings, and collaborative travel role.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {savedSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium animate-fade-in">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Profile updated successfully! All changes are saved to your session.</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium animate-fade-in">
              <AlertCircle size={16} className="text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Avatar & Role Card */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <img
              src={avatarUrl}
              alt={user.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-emerald-600 shadow-sm"
            />
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-base font-bold text-slate-900">{name || user.name}</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    user.role === 'admin'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : user.role === 'organizer'
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {user.role === 'admin' ? <Shield size={11} /> : user.role === 'organizer' ? <Users size={11} /> : <Compass size={11} />}
                  {user.role.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500">{user.email}</p>

              {/* Avatar Selector */}
              <div className="pt-1">
                <span className="text-xs text-slate-500 block mb-1.5 font-medium">Choose an avatar:</span>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  {AVATAR_OPTIONS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-transform ${
                        avatarUrl === url ? 'border-emerald-600 scale-110 shadow' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Role Switcher (for immediate testing) */}
            <div className="sm:border-l sm:border-slate-200 sm:pl-4 space-y-1.5 text-center sm:text-left">
              <span className="text-xs font-semibold text-slate-700 block">Switch Active Role:</span>
              <div className="flex flex-row sm:flex-col gap-1.5">
                {(['traveler', 'organizer', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors text-left flex items-center gap-1.5 ${
                      user.role === r
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Basic Info Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Home Airport Code</label>
              <div className="relative">
                <Plane size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={homeAirport}
                  onChange={(e) => setHomeAirport(e.target.value)}
                  placeholder="e.g. JFK, CDG, LHR, HND"
                  maxLength={4}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg uppercase focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Traveler Bio</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell fellow group travelers about your travel passions and interests..."
              className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Preferences Section */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <Compass size={16} className="text-emerald-700" />
              Travel Preferences & Financial Currency
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Currency</label>
                <div className="relative">
                  <Wallet size={15} className="absolute left-3 top-3 text-slate-400" />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Travel Style</label>
                <select
                  value={travelStyle}
                  onChange={(e) => setTravelStyle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                >
                  {TRAVEL_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="mt-4 flex flex-wrap gap-6 text-xs text-slate-700">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Email flight delay and booking updates</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>SMS notifications for urgent schedule changes</span>
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Account created {new Date(user.createdAt).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 shadow-sm transition-all"
            >
              <Save size={14} />
              <span>{saving ? 'Saving…' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
