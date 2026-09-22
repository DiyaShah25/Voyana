import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Plane,
  Building2,
  Car,
  Briefcase,
  Sparkles,
  Wallet,
  Star,
  Camera,
  ChevronDown,
  Menu,
  X,
  Layers,
  Globe2,
} from 'lucide-react';
import AlertsPanel from '@/components/Alerts/AlertsPanel';

interface HeaderProps {
  onOpenTrips: () => void;
  onOpenFlight: () => void;
  onOpenHotel: () => void;
  onOpenTransport: () => void;
  onOpenBundle: () => void;
  onOpenMyBookings: () => void;
  onOpenChat: () => void;
  onOpenBudget: () => void;
  onOpenPacking: () => void;
  onOpenReviews: () => void;
  onOpenMemories: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTrips,
  onOpenFlight,
  onOpenHotel,
  onOpenTransport,
  onOpenBundle,
  onOpenMyBookings,
  onOpenChat,
  onOpenBudget,
  onOpenPacking,
  onOpenReviews,
  onOpenMemories,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingsDropdownOpen, setBookingsDropdownOpen] = useState(false);
  const [suiteDropdownOpen, setSuiteDropdownOpen] = useState(false);

  const bookingsRef = useRef<HTMLDivElement>(null);
  const suiteRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bookingsRef.current && !bookingsRef.current.contains(event.target as Node)) {
        setBookingsDropdownOpen(false);
      }
      if (suiteRef.current && !suiteRef.current.contains(event.target as Node)) {
        setSuiteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="voyana-header">
      <div className="header-inner">
        {/* Brand Logo */}
        <a href="#top" className="brand-link" aria-label="Voyana Home">
          <div className="brand-logo-mark">
            <Compass size={18} strokeWidth={2.4} />
          </div>
          <div className="brand-text-wrap">
            <span className="brand-name">VOYANA</span>
            <span className="brand-tagline">TRAVEL DISCOVERY</span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#top" className="nav-link active">Explore</a>
          <a href="#destinations" className="nav-link">Destinations</a>
          
          <button
            type="button"
            className="nav-link btn-nav"
            onClick={onOpenTrips}
            aria-label="Open Trips and Collaborative Workspace"
          >
            <Compass size={14} className="nav-icon" />
            <span>Trips & Workspace</span>
          </button>

          {/* Bookings Dropdown */}
          <div className="dropdown-container" ref={bookingsRef}>
            <button
              type="button"
              className={`nav-link btn-nav dropdown-trigger ${bookingsDropdownOpen ? 'active' : ''}`}
              onClick={() => {
                setBookingsDropdownOpen(!bookingsDropdownOpen);
                setSuiteDropdownOpen(false);
              }}
              aria-expanded={bookingsDropdownOpen}
              aria-haspopup="true"
            >
              <span>Bookings</span>
              <ChevronDown size={14} className={`dropdown-chevron ${bookingsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {bookingsDropdownOpen && (
              <div className="dropdown-menu animate-fade-down" role="menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setBookingsDropdownOpen(false); onOpenFlight(); }}
                  role="menuitem"
                >
                  <Plane size={16} className="text-emerald-700" />
                  <div>
                    <span className="dropdown-item-title">Flights</span>
                    <span className="dropdown-item-desc">Global flight routes & fares</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setBookingsDropdownOpen(false); onOpenHotel(); }}
                  role="menuitem"
                >
                  <Building2 size={16} className="text-emerald-700" />
                  <div>
                    <span className="dropdown-item-title">Hotels & Stays</span>
                    <span className="dropdown-item-desc">Curated accommodations</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setBookingsDropdownOpen(false); onOpenTransport(); }}
                  role="menuitem"
                >
                  <Car size={16} className="text-emerald-700" />
                  <div>
                    <span className="dropdown-item-title">Ground Transport</span>
                    <span className="dropdown-item-desc">Transfers, trains & car rentals</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setBookingsDropdownOpen(false); onOpenBundle(); }}
                  role="menuitem"
                >
                  <Layers size={16} className="text-teal-700" />
                  <div>
                    <span className="dropdown-item-title">Unified Bundles</span>
                    <span className="dropdown-item-desc">Multi-service package bookings</span>
                  </div>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item highlight"
                  onClick={() => { setBookingsDropdownOpen(false); onOpenMyBookings(); }}
                  role="menuitem"
                >
                  <Briefcase size={16} className="text-emerald-800" />
                  <div>
                    <span className="dropdown-item-title">My Bookings</span>
                    <span className="dropdown-item-desc">Manage upcoming reservations</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Travel Suite Dropdown */}
          <div className="dropdown-container" ref={suiteRef}>
            <button
              type="button"
              className={`nav-link btn-nav dropdown-trigger ${suiteDropdownOpen ? 'active' : ''}`}
              onClick={() => {
                setSuiteDropdownOpen(!suiteDropdownOpen);
                setBookingsDropdownOpen(false);
              }}
              aria-expanded={suiteDropdownOpen}
              aria-haspopup="true"
            >
              <span>Travel Tools</span>
              <ChevronDown size={14} className={`dropdown-chevron ${suiteDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {suiteDropdownOpen && (
              <div className="dropdown-menu animate-fade-down" role="menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setSuiteDropdownOpen(false); onOpenChat(); }}
                  role="menuitem"
                >
                  <Sparkles size={16} className="text-emerald-700" />
                  <div>
                    <span className="dropdown-item-title">AI Travel Assistant</span>
                    <span className="dropdown-item-desc">Weather & itinerary engine</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setSuiteDropdownOpen(false); onOpenPacking(); }}
                  role="menuitem"
                >
                  <Briefcase size={16} className="text-emerald-700" />
                  <div>
                    <span className="dropdown-item-title">Smart Packing List</span>
                    <span className="dropdown-item-desc">Checklists & member gear sync</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setSuiteDropdownOpen(false); onOpenBudget(); }}
                  role="menuitem"
                >
                  <Wallet size={16} className="text-emerald-700" />
                  <div>
                    <span className="dropdown-item-title">Budget Planner</span>
                    <span className="dropdown-item-desc">Multi-currency split & tracking</span>
                  </div>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setSuiteDropdownOpen(false); onOpenReviews(); }}
                  role="menuitem"
                >
                  <Star size={16} className="text-amber-600" />
                  <div>
                    <span className="dropdown-item-title">Travel Reviews</span>
                    <span className="dropdown-item-desc">Verified traveler ratings</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setSuiteDropdownOpen(false); onOpenMemories(); }}
                  role="menuitem"
                >
                  <Camera size={16} className="text-teal-700" />
                  <div>
                    <span className="dropdown-item-title">Memories Journal</span>
                    <span className="dropdown-item-desc">Geo-tagged photo memories</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Right Actions */}
        <div className="header-actions">
          {/* AI Assistant Quick Pill */}
          <button
            type="button"
            className="ai-pill-button"
            onClick={onOpenChat}
            aria-label="Launch Voyana AI Travel Assistant"
          >
            <Sparkles size={14} />
            <span>Travel Assistant</span>
          </button>

          {/* Alerts Bell */}
          <AlertsPanel />

          {/* Auth CTA */}
          <div className="auth-buttons">
            <button
              type="button"
              className="btn-ghost-header"
              onClick={() => { window.location.hash = '/login'; }}
            >
              Sign In
            </button>
            <button
              type="button"
              className="btn-primary-header"
              onClick={() => { window.location.hash = '/signup'; }}
            >
              Get Started
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-drawer animate-fade-down">
          <div className="mobile-section-label">Navigation</div>
          <a href="#top" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
            <Globe2 size={16} /> Explore World
          </a>
          <a href="#destinations" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
            <Compass size={16} /> Destinations
          </a>
          <button
            type="button"
            className="mobile-nav-item"
            onClick={() => { setMobileMenuOpen(false); onOpenTrips(); }}
          >
            <Compass size={16} /> Trips & Workspace
          </button>

          <div className="mobile-section-label">Bookings</div>
          <button type="button" className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); onOpenFlight(); }}>
            <Plane size={16} /> Book Flights
          </button>
          <button type="button" className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); onOpenHotel(); }}>
            <Building2 size={16} /> Book Hotels
          </button>
          <button type="button" className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); onOpenTransport(); }}>
            <Car size={16} /> Ground Transport
          </button>
          <button type="button" className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); onOpenMyBookings(); }}>
            <Briefcase size={16} /> My Bookings
          </button>

          <div className="mobile-section-label">Travel Tools</div>
          <button type="button" className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); onOpenChat(); }}>
            <Sparkles size={16} /> AI Travel Assistant
          </button>
          <button type="button" className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); onOpenPacking(); }}>
            <Briefcase size={16} /> Smart Packing List
          </button>
          <button type="button" className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); onOpenBudget(); }}>
            <Wallet size={16} /> Budget Planner
          </button>
          <button type="button" className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); onOpenReviews(); }}>
            <Star size={16} /> Reviews & Ratings
          </button>
          <button type="button" className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); onOpenMemories(); }}>
            <Camera size={16} /> Memories Journal
          </button>

          <div className="mobile-auth-actions">
            <button
              type="button"
              className="btn-secondary-full"
              onClick={() => { setMobileMenuOpen(false); window.location.hash = '/login'; }}
            >
              Sign In
            </button>
            <button
              type="button"
              className="btn-primary-full"
              onClick={() => { setMobileMenuOpen(false); window.location.hash = '/signup'; }}
            >
              Create Account
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
