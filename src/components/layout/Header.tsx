import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Plane,
  Building2,
  Car,
  Layers,
  Briefcase,
  Wallet,
  Star,
  Camera,
  ChevronDown,
  Menu,
  X,
  BookmarkCheck,
  User,
  Shield,
  LogOut,
  Compass,
} from 'lucide-react';
import AlertsPanel from '@/components/Alerts/AlertsPanel';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  onOpenTrips: () => void;
  onOpenMyBookings: () => void;
  onOpenChat: () => void;
  onOpenFlight: () => void;
  onOpenHotel: () => void;
  onOpenTransport: () => void;
  onOpenBundle: () => void;
  onOpenPacking: () => void;
  onOpenBudget: () => void;
  onOpenReviews: () => void;
  onOpenMemories: () => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTrips,
  onOpenMyBookings,
  onOpenChat,
  onOpenFlight,
  onOpenHotel,
  onOpenTransport,
  onOpenBundle,
  onOpenPacking,
  onOpenBudget,
  onOpenReviews,
  onOpenMemories,
  onOpenProfile,
  onOpenAdmin,
}) => {
  const { user, isAuthenticated, isAdmin, signOut } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const bookingsRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (bookingsRef.current && !bookingsRef.current.contains(e.target as Node)) {
        setBookingsOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="architectural-header" id="architectural-header">
      {/* Main Architectural Navigation Bar (Flush Edge-to-Edge) */}
      <div className="architectural-navbar-main">
        <div className="architectural-navbar-container">
          {/* Left: Bespoke Celestial Astrolabe Brand Lockup */}
          <a href="#top" className="arch-brand-lockup" aria-label="Voyana Home">
            <div className="arch-brand-emblem">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="astrolabe-svg">
                <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" opacity="0.9" />
                <ellipse cx="12" cy="12" rx="4.8" ry="9.5" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
                <line x1="2.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
                <circle cx="12" cy="12" r="2" fill="#0b7a3b" />
              </svg>
            </div>
            <div className="arch-brand-titles">
              <span className="arch-brand-wordmark">VOYANA</span>
              <span className="arch-brand-tagline">Trip Pe Aana!</span>
            </div>
          </a>

          {/* Center: Curated Navigation Links */}
          <nav className="arch-navbar-center" aria-label="Main Navigation">
            <a href="#top" className="arch-nav-item active">
              <span className="arch-nav-label">Explore</span>
            </a>
            <a href="#destinations" className="arch-nav-item">
              <span className="arch-nav-label">Destinations</span>
            </a>
            <button
              type="button"
              className="arch-nav-item"
              onClick={onOpenTrips}
            >
              <span className="arch-nav-label">Workspaces</span>
            </button>

            {/* Bookings Dropdown */}
            <div className="nav-dropdown-wrap" ref={bookingsRef}>
              <button
                type="button"
                className={`arch-nav-item dropdown-trigger ${bookingsOpen ? 'active' : ''}`}
                onClick={() => {
                  setBookingsOpen(!bookingsOpen);
                  setToolsOpen(false);
                  setUserMenuOpen(false);
                }}
                aria-expanded={bookingsOpen}
              >
                <span className="arch-nav-label">Bookings</span>
                <ChevronDown size={11} className={`dropdown-chevron ${bookingsOpen ? 'open' : ''}`} />
              </button>

              {bookingsOpen && (
                <div className="nav-dropdown-popover animate-fade-down" role="menu">
                  <button
                    type="button"
                    className="dropdown-menu-row"
                    onClick={() => { setBookingsOpen(false); onOpenFlight(); }}
                  >
                    <Plane size={15} className="dropdown-row-icon" />
                    <div className="dropdown-row-meta">
                      <span className="dropdown-row-title">Flights</span>
                      <span className="dropdown-row-desc">Global airfare & routes</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="dropdown-menu-row"
                    onClick={() => { setBookingsOpen(false); onOpenHotel(); }}
                  >
                    <Building2 size={15} className="dropdown-row-icon" />
                    <div className="dropdown-row-meta">
                      <span className="dropdown-row-title">Hotels & Stays</span>
                      <span className="dropdown-row-desc">Curated boutique stays</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="dropdown-menu-row"
                    onClick={() => { setBookingsOpen(false); onOpenTransport(); }}
                  >
                    <Car size={15} className="dropdown-row-icon" />
                    <div className="dropdown-row-meta">
                      <span className="dropdown-row-title">Ground Transport</span>
                      <span className="dropdown-row-desc">Transfers & rentals</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="dropdown-menu-row"
                    onClick={() => { setBookingsOpen(false); onOpenBundle(); }}
                  >
                    <Layers size={15} className="dropdown-row-icon" />
                    <div className="dropdown-row-meta">
                      <span className="dropdown-row-title">Unified Bundles</span>
                      <span className="dropdown-row-desc">Flight + Stay + Car packages</span>
                    </div>
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-menu-row"
                    onClick={() => { setBookingsOpen(false); onOpenMyBookings(); }}
                  >
                    <BookmarkCheck size={15} className="dropdown-row-icon" />
                    <div className="dropdown-row-meta">
                      <span className="dropdown-row-title">My Bookings</span>
                      <span className="dropdown-row-desc">Active itineraries & vouchers</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Travel Suite Dropdown */}
            <div className="nav-dropdown-wrap" ref={toolsRef}>
              <button
                type="button"
                className={`arch-nav-item dropdown-trigger ${toolsOpen ? 'active' : ''}`}
                onClick={() => {
                  setToolsOpen(!toolsOpen);
                  setBookingsOpen(false);
                  setUserMenuOpen(false);
                }}
                aria-expanded={toolsOpen}
              >
                <span className="arch-nav-label">Travel Suite</span>
                <ChevronDown size={11} className={`dropdown-chevron ${toolsOpen ? 'open' : ''}`} />
              </button>

              {toolsOpen && (
                <div className="nav-dropdown-popover animate-fade-down" role="menu">
                  <button
                    type="button"
                    className="dropdown-menu-row"
                    onClick={() => { setToolsOpen(false); onOpenPacking(); }}
                  >
                    <Briefcase size={15} className="dropdown-row-icon" />
                    <div className="dropdown-row-meta">
                      <span className="dropdown-row-title">Smart Packing List</span>
                      <span className="dropdown-row-desc">Automated gear checklists</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="dropdown-menu-row"
                    onClick={() => { setToolsOpen(false); onOpenBudget(); }}
                  >
                    <Wallet size={15} className="dropdown-row-icon" />
                    <div className="dropdown-row-meta">
                      <span className="dropdown-row-title">Budget Planner</span>
                      <span className="dropdown-row-desc">Multi-currency split & expenses</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="dropdown-menu-row"
                    onClick={() => { setToolsOpen(false); onOpenReviews(); }}
                  >
                    <Star size={15} className="dropdown-row-icon" />
                    <div className="dropdown-row-meta">
                      <span className="dropdown-row-title">Travel Reviews</span>
                      <span className="dropdown-row-desc">Verified community feedback</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="dropdown-menu-row"
                    onClick={() => { setToolsOpen(false); onOpenMemories(); }}
                  >
                    <Camera size={15} className="dropdown-row-icon" />
                    <div className="dropdown-row-meta">
                      <span className="dropdown-row-title">Memories Journal</span>
                      <span className="dropdown-row-desc">Geo-tagged photo memories</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Right: Travel Assistant, Alerts, Profile / Sign In */}
          <div className="arch-navbar-right">
            {/* Architectural AI Assistant Trigger */}
            <button
              type="button"
              className="arch-assistant-pill"
              onClick={onOpenChat}
              aria-label="Open AI Travel Assistant"
            >
              <Sparkles size={13} className="text-emerald-700" />
              <span>AI Concierge</span>
            </button>

            {/* Notifications Panel */}
            <AlertsPanel />

            {/* Hierarchical Profile Control */}
            {isAuthenticated && user ? (
              <div className="nav-dropdown-wrap" ref={userMenuRef}>
                <button
                  type="button"
                  className={`arch-profile-control ${userMenuOpen ? 'active' : ''}`}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-expanded={userMenuOpen}
                >
                  <img
                    src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                    alt={user.name}
                    className="arch-avatar-img"
                  />
                  <div className="arch-profile-identity">
                    <span className="arch-profile-name">{user.name.split(' ')[0]}</span>
                    <span className="arch-profile-badge">{user.role}</span>
                  </div>
                  <ChevronDown size={11} className={`profile-chevron ${userMenuOpen ? 'open' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="nav-dropdown-popover profile-popover animate-fade-down" role="menu">
                    <div className="profile-popover-header">
                      <span className="popover-user-name">{user.name}</span>
                      <span className="popover-user-email">{user.email}</span>
                    </div>
                    <div className="dropdown-divider" />

                    <button
                      type="button"
                      className="dropdown-menu-row"
                      onClick={() => { setUserMenuOpen(false); onOpenProfile(); }}
                    >
                      <User size={15} className="dropdown-row-icon" />
                      <div className="dropdown-row-meta">
                        <span className="dropdown-row-title">Profile & Preferences</span>
                        <span className="dropdown-row-desc">Style, currency & details</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="dropdown-menu-row"
                      onClick={() => { setUserMenuOpen(false); onOpenTrips(); }}
                    >
                      <Briefcase size={15} className="dropdown-row-icon" />
                      <div className="dropdown-row-meta">
                        <span className="dropdown-row-title">My Workspaces</span>
                        <span className="dropdown-row-desc">Shared trips & plans</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="dropdown-menu-row"
                      onClick={() => { setUserMenuOpen(false); onOpenMyBookings(); }}
                    >
                      <BookmarkCheck size={15} className="dropdown-row-icon" />
                      <div className="dropdown-row-meta">
                        <span className="dropdown-row-title">My Bookings</span>
                        <span className="dropdown-row-desc">Flights, stays & cars</span>
                      </div>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        className="dropdown-menu-row admin-row"
                        onClick={() => { setUserMenuOpen(false); onOpenAdmin(); }}
                      >
                        <Shield size={15} className="dropdown-row-icon text-amber-600" />
                        <div className="dropdown-row-meta">
                          <span className="dropdown-row-title">Admin Console</span>
                          <span className="dropdown-row-desc">Platform telemetry & users</span>
                        </div>
                      </button>
                    )}

                    <div className="dropdown-divider" />
                    <button
                      type="button"
                      className="dropdown-menu-row logout-row"
                      onClick={() => { setUserMenuOpen(false); signOut(); }}
                    >
                      <LogOut size={15} className="dropdown-row-icon text-rose-500" />
                      <div className="dropdown-row-meta">
                        <span className="dropdown-row-title text-rose-600">Sign Out</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="arch-auth-actions">
                <button
                  type="button"
                  className="arch-btn-ghost"
                  onClick={() => { window.location.hash = '/login'; }}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  className="arch-btn-primary"
                  onClick={() => { window.location.hash = '/signup'; }}
                >
                  <span>Start Exploring</span>
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              className="arch-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Architectural Drawer */}
      {mobileMenuOpen && (
        <div className="arch-mobile-drawer animate-fade-down">
          <div className="arch-mobile-links">
            <a href="#top" className="arch-mobile-item" onClick={() => setMobileMenuOpen(false)}>
              <span>Explore</span>
            </a>
            <a href="#destinations" className="arch-mobile-item" onClick={() => setMobileMenuOpen(false)}>
              <span>Destinations</span>
            </a>
            <button type="button" className="arch-mobile-item" onClick={() => { setMobileMenuOpen(false); onOpenTrips(); }}>
              <span>Workspaces & Trips</span>
            </button>
            <button type="button" className="arch-mobile-item" onClick={() => { setMobileMenuOpen(false); onOpenFlight(); }}>
              <span>Book Flights</span>
            </button>
            <button type="button" className="arch-mobile-item" onClick={() => { setMobileMenuOpen(false); onOpenHotel(); }}>
              <span>Book Hotels</span>
            </button>
            <button type="button" className="arch-mobile-item" onClick={() => { setMobileMenuOpen(false); onOpenTransport(); }}>
              <span>Ground Transport</span>
            </button>
            <button type="button" className="arch-mobile-item" onClick={() => { setMobileMenuOpen(false); onOpenMyBookings(); }}>
              <span>My Bookings</span>
            </button>
            <button type="button" className="arch-mobile-item" onClick={() => { setMobileMenuOpen(false); onOpenChat(); }}>
              <span>AI Concierge</span>
            </button>
            <button type="button" className="arch-mobile-item" onClick={() => { setMobileMenuOpen(false); onOpenPacking(); }}>
              <span>Smart Packing List</span>
            </button>
            <button type="button" className="arch-mobile-item" onClick={() => { setMobileMenuOpen(false); onOpenBudget(); }}>
              <span>Budget Planner</span>
            </button>
          </div>

          {isAuthenticated && user ? (
            <div className="arch-mobile-auth">
              <button
                type="button"
                className="arch-mobile-profile-row"
                onClick={() => { setMobileMenuOpen(false); onOpenProfile(); }}
              >
                <User size={16} className="text-emerald-700" />
                <span>{user.name} ({user.role})</span>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="arch-mobile-profile-row text-amber-700"
                  onClick={() => { setMobileMenuOpen(false); onOpenAdmin(); }}
                >
                  <Shield size={16} className="text-amber-600" />
                  <span>Admin Console</span>
                </button>
              )}
              <button
                type="button"
                className="arch-mobile-signout-btn"
                onClick={() => { setMobileMenuOpen(false); signOut(); }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="arch-mobile-auth-guest">
              <button
                type="button"
                className="arch-btn-ghost"
                onClick={() => { setMobileMenuOpen(false); window.location.hash = '/login'; }}
              >
                Sign In
              </button>
              <button
                type="button"
                className="arch-btn-primary"
                onClick={() => { setMobileMenuOpen(false); window.location.hash = '/signup'; }}
              >
                Start Exploring
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
