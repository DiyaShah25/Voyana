import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Car,
  Compass,
  Globe2,
  MapPin,
  Menu,
  Moon,
  Pause,
  Plane,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Wallet,
  X,
} from 'lucide-react';
import VoyanaGlobe from '@/components/Globe/VoyanaGlobe';
import type { GlobeLocation, VoyanaGlobeHandle } from '@/components/Globe/globe.types';
import { resolveLocation, suggestDestinations } from '@/services/locationService';
import AuthLayout from '@/pages/AuthLayout';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import AlertsPanel from '@/components/Alerts/AlertsPanel';
import FlightBookingModal from '@/components/Booking/FlightBookingModal';
import HotelBookingModal from '@/components/Booking/HotelBookingModal';
import ChatAssistantModal from '@/components/Chat/ChatAssistantModal';
import BudgetPlannerModal from '@/components/Budget/BudgetPlannerModal';
import PackingChecklistModal from '@/components/Packing/PackingChecklistModal';
import TransportBookingModal from '@/components/Booking/TransportBookingModal';
import MyBookingsModal from '@/components/Booking/MyBookingsModal';

type Route = 'home' | 'login' | 'signup' | 'forgot-password';

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash === 'login' || hash === 'signup' || hash === 'forgot-password') return hash;
  return 'home';
}

function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const onHashChange = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return route;
}

interface DestinationContent {
  city: string;
  country: string;
  place: string;
  description: string;
  heroImage: string;
  secondary: { name: string; image: string }[];
}

const destinationContent: Record<string, DestinationContent> = {
  Paris: {
    city: 'Paris',
    country: 'France',
    place: 'Eiffel Tower',
    description: 'An iconic symbol of France, offering breathtaking views over the city of lights.',
    heroImage: 'https://images.pexels.com/photos/14681748/pexels-photo-14681748.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    secondary: [
      { name: 'Louvre Museum', image: 'https://images.pexels.com/photos/16785486/pexels-photo-16785486.png?auto=compress&cs=tinysrgb&h=650&w=940' },
      { name: 'Notre-Dame', image: 'https://images.pexels.com/photos/31052960/pexels-photo-31052960.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
      { name: 'Arc de Triomphe', image: 'https://images.pexels.com/photos/15995558/pexels-photo-15995558.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    ],
  },
  Tokyo: {
    city: 'Tokyo',
    country: 'Japan',
    place: 'Shibuya Crossing',
    description: 'A city of neon nights, quiet temples, and a rhythm all its own.',
    heroImage: 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    secondary: [{ name: 'Senso-ji Temple', image: 'https://images.pexels.com/photos/402028/pexels-photo-402028.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' }],
  },
  Dubai: {
    city: 'Dubai',
    country: 'United Arab Emirates',
    place: 'Burj Khalifa',
    description: 'A skyline shaped by ambition, framed by desert horizons and warm sea air.',
    heroImage: 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    secondary: [{ name: 'Desert Dunes', image: 'https://images.pexels.com/photos/1001435/pexels-photo-1001435.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' }],
  },
  'New York': {
    city: 'New York',
    country: 'United States',
    place: 'Brooklyn Bridge',
    description: 'Big city energy, skyline walks, and stories waiting on every avenue.',
    heroImage: 'https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    secondary: [{ name: 'Central Park', image: 'https://images.pexels.com/photos/290386/pexels-photo-290386.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' }],
  },
  Ahmedabad: {
    city: 'Ahmedabad',
    country: 'India',
    place: 'Sabarmati Ashram',
    description: 'A city of living history, vibrant craft, and thoughtful quiet moments.',
    heroImage: 'https://images.pexels.com/photos/3881104/pexels-photo-3881104.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    secondary: [{ name: 'Adalaj Stepwell', image: 'https://images.pexels.com/photos/789750/pexels-photo-789750.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' }],
  },
};

const fallbackContent: DestinationContent = {
  city: 'World',
  country: 'Earth',
  place: 'Your next destination',
  description: 'Search any city or country to begin exploring amazing places around the world.',
  heroImage: 'https://images.pexels.com/photos/14681748/pexels-photo-14681748.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  secondary: [],
};

const quickChips = ['Paris', 'Tokyo', 'Dubai', 'New York', 'Ahmedabad'];

function App() {
  const route = useHashRoute();
  const [isLight, setIsLight] = useState(false);
  const [query, setQuery] = useState('Paris');
  const [selected, setSelected] = useState<GlobeLocation | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<GlobeLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flightModalOpen, setFlightModalOpen] = useState(false);
  const [flightModalDestination, setFlightModalDestination] = useState<string | undefined>(undefined);
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [hotelModalDestination, setHotelModalDestination] = useState<string | undefined>(undefined);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [packingModalOpen, setPackingModalOpen] = useState(false);
  const [transportModalOpen, setTransportModalOpen] = useState(false);
  const [transportModalDestination, setTransportModalDestination] = useState<string | undefined>(undefined);
  const [myBookingsOpen, setMyBookingsOpen] = useState(false);
  const globeRef = useRef<VoyanaGlobeHandle>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      if (query.trim().length > 0) {
        try {
          const results = await suggestDestinations(query, controller.signal);
          setSuggestions(results);
        } catch (e) {
          if ((e as Error).name !== 'AbortError') console.error(e);
        }
      } else {
        setSuggestions([]);
      }
    };
    const timer = setTimeout(fetchSuggestions, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const content = selected && destinationContent[selected.name] ? destinationContent[selected.name] : fallbackContent;

  const selectLocation = (location: GlobeLocation) => {
    setSelected(location);
    setQuery(location.name);
    setError(null);
    setSuggestions([]);
    globeRef.current?.pauseRotation();
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const location = await resolveLocation(query);
      if (location) {
        selectLocation(location);
      } else {
        setError('Destination not found. Try another city or country.');
      }
    } catch (e) {
      console.error(e);
      setError('Unable to locate destination. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (route !== 'home') {
    return (
      <main className="app">
        <div className="star-field" aria-hidden="true" />
        <div className="ambient ambient-one" aria-hidden="true" />
        <div className="ambient ambient-two" aria-hidden="true" />
        <AuthLayout route={route}>
          {route === 'login' && <LoginPage />}
          {route === 'signup' && <SignupPage />}
          {route === 'forgot-password' && <ForgotPasswordPage />}
        </AuthLayout>
      </main>
    );
  }

  return (
    <main className={isLight ? 'app light' : 'app'}>
      <div className="star-field" aria-hidden="true" />
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="Voyana home">
          <span className="brand-mark"><Plane size={17} strokeWidth={2.2} /></span>
          <span>VOYANA</span>
        </a>
        <nav className={mobileOpen ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
          <a href="#explore">Explore</a>
          <button
            onClick={() => setChatModalOpen(true)}
            style={{ background: 'rgba(99,91,255,0.2)', border: '1px solid rgba(99,91,255,0.45)', borderRadius: '9px', padding: '6px 14px', fontSize: '14px', fontWeight: 600, color: '#c4c0ff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            aria-label="Open AI Travel Assistant"
          >
            <Sparkles size={14} className="text-indigo-400" /> AI Assistant
          </button>
          <button
            onClick={() => setBudgetModalOpen(true)}
            style={{ background: 'rgba(99,91,255,0.12)', border: '1px solid rgba(99,91,255,0.3)', borderRadius: '9px', padding: '6px 14px', fontSize: '14px', fontWeight: 600, color: '#cbd5e1', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            aria-label="Open Budget Planner"
          >
            <Wallet size={14} className="text-amber-400" /> Budget Planner
          </button>
          <button
            onClick={() => setPackingModalOpen(true)}
            style={{ background: 'rgba(0,212,178,0.12)', border: '1px solid rgba(0,212,178,0.3)', borderRadius: '9px', padding: '6px 14px', fontSize: '14px', fontWeight: 600, color: '#cbd5e1', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            aria-label="Open Packing Checklist"
          >
            <Briefcase size={14} className="text-teal-400" /> Packing List
          </button>
          <button
            onClick={() => { setFlightModalDestination(undefined); setFlightModalOpen(true); }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '9px', padding: '6px 14px', fontSize: '14px', fontWeight: 600, color: '#e2e8f0', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            aria-label="Book a flight"
          >
            <Plane size={14} /> Flights
          </button>
          <button
            onClick={() => { setHotelModalDestination(undefined); setHotelModalOpen(true); }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '9px', padding: '6px 14px', fontSize: '14px', fontWeight: 600, color: '#e2e8f0', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            aria-label="Search and book hotels"
          >
            <Building2 size={14} /> Hotels
          </button>
          <button
            onClick={() => { setTransportModalDestination(undefined); setTransportModalOpen(true); }}
            style={{ background: 'rgba(99,91,255,0.15)', border: '1px solid rgba(99,91,255,0.35)', borderRadius: '9px', padding: '6px 14px', fontSize: '14px', fontWeight: 600, color: '#a5a0ff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            aria-label="Search and book ground transport"
          >
            <Car size={14} /> Transport
          </button>
          <button
            onClick={() => setMyBookingsOpen(true)}
            style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)', borderRadius: '9px', padding: '6px 14px', fontSize: '14px', fontWeight: 600, color: '#d8b4fe', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            aria-label="View and manage my travel bookings"
          >
            <Briefcase size={14} /> My Bookings
          </button>
        </nav>
        <div className="account-actions">
          <AlertsPanel />
          <button className="login-button" onClick={() => { window.location.hash = '/login'; }}>Sign In</button>
          <button className="signup-button" onClick={() => { window.location.hash = '/signup'; }}>Sign Up</button>
          <button className="menu-button" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle navigation">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="globe-column">
          <div className="globe-stage">
            <div className="orbit orbit-one" aria-hidden="true" />
            <div className="orbit orbit-two" aria-hidden="true" />
            <div className="globe-halo" aria-hidden="true" />
            <VoyanaGlobe
              ref={globeRef}
              selectedLocation={selected ?? undefined}
              autoRotate={autoRotate}
              onLocationSelect={selectLocation}
            />
            <div className="route-line route-one" aria-hidden="true"><Plane size={18} /></div>
            <div className="route-line route-two" aria-hidden="true"><Plane size={16} /></div>
            <div className="globe-controls">
              <button onClick={() => globeRef.current?.zoomIn()} aria-label="Zoom in">+</button>
              <button onClick={() => globeRef.current?.zoomOut()} aria-label="Zoom out">−</button>
              <button onClick={() => globeRef.current?.reset()} aria-label="Reset globe"><Compass size={15} /></button>
            </div>
          </div>
          <div className="globe-caption">
            <span>DRAG TO EXPLORE</span>
            <span className="caption-line" />
            <span>SCROLL TO ZOOM</span>
          </div>
          <div className="stats-bar">
            <div><Globe2 size={19} /><span><b>250+</b><small>Countries</small></span></div>
            <div><MapPin size={19} /><span><b>10K+</b><small>Cities</small></span></div>
            <div><span><b>1M+</b><small>Travelers</small></span></div>
            <div><span><b>5K+</b><small>Destinations</small></span></div>
          </div>
        </div>

        <div className="content-column">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> Your journey begins here <ArrowRight size={14} />
          </div>
          <h1>Where will your<br />next <em>adventure</em> be?</h1>
          <p className="lede">Search any city or country to explore amazing places</p>

          <div className={`search-wrap ${suggestions.length ? 'has-suggestions' : ''}`}>
            <Search size={21} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') handleSearch(); }}
              aria-label="Search destinations"
              placeholder="Search a city or country…"
            />
            <button onClick={handleSearch} aria-label="Search"><ArrowRight size={20} /></button>
            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((location) => (
                  <button key={`${location.name}-${location.latitude}`} onClick={() => selectLocation(location)}>
                    <MapPin size={15} />
                    <span>{location.name}<small>{[location.state, location.country].filter(Boolean).join(', ')}</small></span>
                    <ArrowRight size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>
          {isLoading && <p style={{ fontSize: '0.85rem', color: '#9bc7df', marginTop: '0.5rem', marginBottom: '-1rem' }}>Finding your destination...</p>}
          {error && <p style={{ fontSize: '0.85rem', color: '#ff7b72', marginTop: '0.5rem', marginBottom: '-1rem' }}>{error}</p>}

          <div className="try-searching" style={ (isLoading || error) ? { marginTop: '1.5rem' } : {} }>
            <span>Try searching:</span>
            {quickChips.map((chip) => (
              <button key={chip} onClick={async () => {
                setIsLoading(true);
                setError(null);
                setSuggestions([]);
                try {
                  const location = await resolveLocation(chip);
                  if (location) selectLocation(location);
                } catch(e) {
                  console.error(e);
                } finally {
                  setIsLoading(false);
                }
              }}>{chip}</button>
            ))}
          </div>

          <div className="destination-grid">
            <article className="featured-card">
              <img src={content.heroImage} alt={`${content.place} in ${content.city}`} />
              <div className="image-scrim" />
              <div className="featured-copy">
                <span className="popular-tag"><Sparkles size={12} /> Popular destination</span>
                <h2>{content.place}</h2>
                <p>{content.city}, {content.country}</p>
                <span className="description">{content.description}</span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="explore-button">Explore <ArrowRight size={17} /></button>
                  <button
                    onClick={() => { setFlightModalDestination(content.city); setFlightModalOpen(true); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '12px', background: 'rgba(99,91,255,0.2)', border: '1px solid rgba(99,91,255,0.4)', color: '#c4c0ff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                    aria-label={`Book flight to ${content.city}`}
                  >
                    <Plane size={15} /> Book Flight
                  </button>
                  <button
                    onClick={() => { setHotelModalDestination(content.city); setHotelModalOpen(true); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '12px', background: 'rgba(99,91,255,0.2)', border: '1px solid rgba(99,91,255,0.4)', color: '#c4c0ff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                    aria-label={`Book hotel in ${content.city}`}
                  >
                    <Building2 size={15} /> Book Hotel
                  </button>
                  <button
                    onClick={() => { setTransportModalDestination(content.city); setTransportModalOpen(true); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '12px', background: 'rgba(99,91,255,0.2)', border: '1px solid rgba(99,91,255,0.4)', color: '#c4c0ff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                    aria-label={`Book local transport in ${content.city}`}
                  >
                    <Car size={15} /> Book Transport
                  </button>
                </div>
              </div>
            </article>
            <div className="secondary-list">
              {content.secondary.map((place) => (
                <button className="secondary-card" key={place.name}>
                  <img src={place.image} alt={place.name} />
                  <span>{place.name}</span>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="bottom-bar">
        <span className="scroll-copy">Scroll to explore <span className="mouse-icon"><i /></span></span>
        <div className="bottom-actions">
          <button aria-label="Settings"><Settings2 size={17} /></button>
          <button onClick={() => setAutoRotate((value) => !value)} aria-label={autoRotate ? 'Pause rotation' : 'Resume rotation'}>
            {autoRotate ? <Pause size={17} /> : <ArrowRight size={17} />}
          </button>
          <button onClick={() => setIsLight((value) => !value)} aria-label="Toggle light and dark mode">
            {isLight ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>
      </footer>
      <FlightBookingModal
        isOpen={flightModalOpen}
        onClose={() => setFlightModalOpen(false)}
        initialDestination={flightModalDestination}
      />
      <HotelBookingModal
        isOpen={hotelModalOpen}
        onClose={() => setHotelModalOpen(false)}
        initialDestination={hotelModalDestination}
      />
      <TransportBookingModal
        isOpen={transportModalOpen}
        onClose={() => setTransportModalOpen(false)}
        defaultDestination={transportModalDestination}
      />

      {/* Floating AI Assistant Trigger */}
      {!chatModalOpen && (
        <button
          className="floating-ai-trigger"
          onClick={() => setChatModalOpen(true)}
          aria-label="Open Voyana AI Assistant"
        >
          <Sparkles size={17} />
          <span>Voyana AI</span>
        </button>
      )}

      {/* Voyana AI Chatbot (Mockup 5.4 / VPM-44 & VPM-38) */}
      <ChatAssistantModal
        isOpen={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        destination={selected?.name || query || 'Paris'}
        onOpenBudget={() => setBudgetModalOpen(true)}
        onOpenPacking={() => setPackingModalOpen(true)}
      />

      {/* Budget Planner & Transaction History (VPM-41, VPM-56, VPM-67, VPM-70) */}
      <BudgetPlannerModal
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        destination={selected?.name || query || 'Paris'}
        onOpenChatWithPrompt={(prompt) => {
          setChatModalOpen(true);
        }}
      />

      {/* Smart Packing Checklist & Task Assignment (VPM-42, VPM-60, VPM-191) */}
      <PackingChecklistModal
        isOpen={packingModalOpen}
        onClose={() => setPackingModalOpen(false)}
        destination={selected?.name || query || 'Paris'}
        onOpenChatWithPrompt={(prompt) => {
          setChatModalOpen(true);
        }}
      />

      {/* Unified Bookings & Modification Management (VPM-215 / Manage Bookings) */}
      <MyBookingsModal
        isOpen={myBookingsOpen}
        onClose={() => setMyBookingsOpen(false)}
        onOpenFlightModal={() => setFlightModalOpen(true)}
        onOpenHotelModal={() => setHotelModalOpen(true)}
        onOpenTransportModal={() => setTransportModalOpen(true)}
      />
    </main>
  );
}

export default App;
