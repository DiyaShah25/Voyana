import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Users,
  Compass,
  Briefcase,
  Layers,
  Activity,
  Search,
  CheckCircle2,
  Calendar,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAllUsers, switchUserRole } from '@/services/authService';
import type { UserProfile, UserRole } from '@/types/auth.types';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [notification, setNotification] = useState<string | null>(null);

  const refreshUsers = () => {
    const list = getAllUsers();
    setUsersList(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Protect admin console: if not admin, show warning
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 text-center space-y-4 shadow-xl border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <Lock size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Restricted Access</h2>
          <p className="text-sm text-slate-600">
            This module is reserved for users with the <strong>Admin</strong> role. Your current role is{' '}
            <span className="capitalize font-bold text-emerald-700">{user?.role || 'traveler'}</span>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
          >
            Return to Voyana
          </button>
        </div>
      </div>
    );
  }

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    await switchUserRole(targetUserId, newRole);
    refreshUsers();
    setNotification(`User role updated to ${newRole.toUpperCase()}`);
    window.setTimeout(() => setNotification(null), 2500);
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Voyana Ecosystem Administration</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                  ADMIN CONSOLE
                </span>
              </div>
              <p className="text-xs text-slate-500">
                System telemetry, user roles, security moderation, and travel platform management.
              </p>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {notification && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium animate-fade-in">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{notification}</span>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Users size={14} className="text-indigo-600" /> Registered Users
              </span>
              <p className="text-2xl font-black text-slate-900">{usersList.length}</p>
              <span className="text-[11px] text-emerald-600 font-medium">Active accounts</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Briefcase size={14} className="text-emerald-600" /> Active Expeditions
              </span>
              <p className="text-2xl font-black text-slate-900">14</p>
              <span className="text-[11px] text-slate-500 font-medium">Curated & User Trips</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Layers size={14} className="text-sky-600" /> Bookings Processed
              </span>
              <p className="text-2xl font-black text-slate-900">128</p>
              <span className="text-[11px] text-emerald-600 font-medium">99.2% confirmation</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Activity size={14} className="text-amber-600" /> System Uptime
              </span>
              <p className="text-2xl font-black text-emerald-700">99.98%</p>
              <span className="text-[11px] text-slate-500 font-medium">All APIs Operational</span>
            </div>
          </div>

          {/* User Management Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">User Identity & Access Management</h3>
                <p className="text-xs text-slate-500">Manage account roles (Traveler, Organizer, Admin) and view profile telemetry.</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search user or email…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
                >
                  <option value="all">All Roles</option>
                  <option value="traveler">Traveler</option>
                  <option value="organizer">Organizer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* User Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Traveler</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Currency / Airport</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3 text-right">Role Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">{u.name}</span>
                            <span className="text-[11px] text-slate-500">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : u.role === 'organizer'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {u.role === 'admin' ? <Shield size={10} /> : u.role === 'organizer' ? <Users size={10} /> : <Compass size={10} />}
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{u.preferences?.preferredCurrency || 'USD'}</span>
                        <span className="text-slate-400"> • </span>
                        <span>{u.preferences?.homeAirport || 'JFK'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                          {(['traveler', 'organizer', 'admin'] as UserRole[]).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => handleRoleChange(u.id, r)}
                              className={`px-2 py-1 text-[11px] font-semibold transition-colors ${
                                u.role === r
                                  ? 'bg-emerald-700 text-white font-bold'
                                  : 'bg-white hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              {r.charAt(0).toUpperCase() + r.slice(1, 3)}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No travelers match the search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Voyana Engine v2.4 • Node/TypeScript • REST & Supabase Architecture</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardModal;
