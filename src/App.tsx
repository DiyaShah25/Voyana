import { useState, useRef, useEffect } from 'react';
import type { GlobeLocation, GlobeRoute, VoyanaGlobeHandle } from '@/components/Globe/globe.types';
import VoyanaGlobe from '@/components/Globe/VoyanaGlobe';
import { Header } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TravelSearch from '@/components/Search/TravelSearch';
import DestinationRail from '@/components/Destinations/DestinationRail';
import DestinationGrid from '@/components/Destinations/DestinationGrid';
import TravelSuiteHub from '@/components/Services/TravelSuiteHub';
import FeaturedJourneys from '@/components/Journeys/FeaturedJourneys';

// Auth & Modals
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AuthLayout from '@/pages/AuthLayout';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ProfileModal from '@/pages/ProfileModal';
import AdminDashboardModal from '@/pages/AdminDashboardModal';

// Travel Services Modals
import FlightBookingModal from '@/components/Booking/FlightBookingModal';
import HotelBookingModal from '@/components/Booking/HotelBookingModal';
import TransportBookingModal from '@/components/Booking/TransportBookingModal';
import MyBookingsModal from '@/components/Booking/MyBookingsModal';
import UnifiedBundleBookingModal from '@/components/Booking/UnifiedBundleBookingModal';
import ChatAssistantModal from '@/components/Chat/ChatAssistantModal';
import BudgetPlannerModal from '@/components/Budget/BudgetPlannerModal';
import PackingChecklistModal from '@/components/Packing/PackingChecklistModal';
import TripDashboardModal from '@/components/Trips/TripDashboardModal';
import TripWorkspaceModal from '@/components/Trips/TripWorkspaceModal';
import TravelReviewsModal from '@/components/Reviews/TravelReviewsModal';
import TravelMemoriesModal from '@/components/Memories/TravelMemoriesModal';
import type { Trip } from '@/services/tripService';

type Route = 'home' | 'login' | 'signup' | 'forgot-password' | 'profile' | 'admin' | 'trips' | 'bookings';

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (
    hash === 'login' ||
    hash === 'signup' ||
    hash === 'forgot-password' ||
    hash === 'profile' ||
    hash === 'admin' ||
    hash === 'trips' ||
    hash === 'bookings'
  ) {
    return hash as Route;
  }
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

function MainAppContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const route = useHashRoute();

  // Global Destination State driving the 3D Earth and UI
  const [selectedDestination, setSelectedDestination] = useState<GlobeLocation>({
    name: 'Paris',
    city: 'Paris',
    country: 'France',
    latitude: 48.8566,
    longitude: 2.3522,
    type: 'city',
  });

  const [activeRoutes, setActiveRoutes] = useState<GlobeRoute[]>([]);

  // Modals state
  const [flightModalOpen, setFlightModalOpen] = useState(false);
  const [flightModalDestination, setFlightModalDestination] = useState<string | undefined>(undefined);

  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [hotelModalDestination, setHotelModalDestination] = useState<string | undefined>(undefined);

  const [transportModalOpen, setTransportModalOpen] = useState(false);
  const [transportModalDestination, setTransportModalDestination] = useState<string | undefined>(undefined);

  const [bundleBookingModalOpen, setBundleBookingModalOpen] = useState(false);
  const [myBookingsOpen, setMyBookingsOpen] = useState(false);

  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [packingModalOpen, setPackingModalOpen] = useState(false);

  const [tripDashboardOpen, setTripDashboardOpen] = useState(false);
  const [activeWorkspaceTrip, setActiveWorkspaceTrip] = useState<Trip | null>(null);

  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [reviewsDestination, setReviewsDestination] = useState<string | undefined>(undefined);

  const [memoriesModalOpen, setMemoriesModalOpen] = useState(false);

  // New Profile & Admin Modals
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  const globeRef = useRef<VoyanaGlobeHandle>(null);

  // Handle protected and action routes
  useEffect(() => {
    if (loading) return;

    if (route === 'profile') {
      if (!isAuthenticated) {
        window.location.hash = '/login';
      } else {
        setProfileModalOpen(true);
      }
    } else if (route === 'admin') {
      setAdminModalOpen(true);
    } else if (route === 'trips') {
      setTripDashboardOpen(true);
    } else if (route === 'bookings') {
      setMyBookingsOpen(true);
    }
  }, [route, isAuthenticated, loading]);

  // Geographic Selection Handler (Shared State: UI <-> 3D Earth)
  const handleSelectLocation = (location: GlobeLocation) => {
    setSelectedDestination(location);
    globeRef.current?.focusOnLocation(location.latitude, location.longitude, location.type);
    globeRef.current?.setMarker(location);
  };

  const handleSelectRoute = (routes: GlobeRoute[], startLocation: GlobeLocation) => {
    setActiveRoutes(routes);
    handleSelectLocation(startLocation);
  };

  // Auth pages view
  if (route === 'login' || route === 'signup' || route === 'forgot-password') {
    return (
      <main className="voyana-editorial-shell">
        <AuthLayout route={route}>
          {route === 'login' && <LoginPage />}
          {route === 'signup' && <SignupPage />}
          {route === 'forgot-password' && <ForgotPasswordPage />}
        </AuthLayout>
      </main>
    );
  }

  // Active Current User representation passed to all modules
  const activeUserContext = user
    ? { id: user.id, name: user.name, email: user.email }
    : { id: 'usr-traveler-03', name: 'Alex Morgan', email: 'traveler@voyana.com' };

  return (
    <div className="voyana-editorial-shell">
      {/* 1. TOP EDITORIAL NAVIGATION BAR */}
      <Header
        onOpenTrips={() => setTripDashboardOpen(true)}
        onOpenMyBookings={() => setMyBookingsOpen(true)}
        onOpenChat={() => setChatModalOpen(true)}
        onOpenFlight={() => { setFlightModalDestination(selectedDestination.city || selectedDestination.name); setFlightModalOpen(true); }}
        onOpenHotel={() => { setHotelModalDestination(selectedDestination.city || selectedDestination.name); setHotelModalOpen(true); }}
        onOpenTransport={() => { setTransportModalDestination(selectedDestination.city || selectedDestination.name); setTransportModalOpen(true); }}
        onOpenBundle={() => setBundleBookingModalOpen(true)}
        onOpenPacking={() => setPackingModalOpen(true)}
        onOpenBudget={() => setBudgetModalOpen(true)}
        onOpenReviews={() => { setReviewsDestination(selectedDestination.name); setReviewsModalOpen(true); }}
        onOpenMemories={() => setMemoriesModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenAdmin={() => setAdminModalOpen(true)}
      />

      {/* 2. HERO SECTION — LARGE 3D EARTH + EDITORIAL DISCOVERY */}
      <section className="editorial-hero" id="top">
        <div className="hero-container">
          {/* Left Column (45-50%): Editorial Headline, Search & Fast Explore */}
          <div className="hero-copy-column">
            <span className="editorial-eyebrow">EXPLORE THE WORLD</span>

            <h1 className="hero-editorial-headline">
              The world is<br />
              <span className="serif-highlight">yours to explore.</span>
            </h1>

            <p className="hero-editorial-lede">
              Voyana connects travelers with authentic geographic discovery. Select any destination to navigate coordinates, curate collaborative journeys, and explore global culture.
            </p>

            {/* Primary Exploration Control */}
            <TravelSearch
              onLocationSelect={handleSelectLocation}
            />

            {/* Quick Context & Fast Explore Switcher (1-Click Earth Rotation) */}
            <div className="hero-quick-switch">
              <span className="quick-switch-label">POPULAR DESTINATIONS</span>
              <div className="quick-switch-chips">
                {[
                  { name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, style: 'Art & Architecture' },
                  { name: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, style: 'Modern & Traditional' },
                  { name: 'Bali', country: 'Indonesia', latitude: -8.4095, longitude: 115.1889, style: 'Island Sanctuaries' },
                  { name: 'Rome', country: 'Italy', latitude: 41.9028, longitude: 12.4964, style: 'Antiquity & Cuisine' },
                  { name: 'Kyoto', country: 'Japan', latitude: 35.0116, longitude: 135.7681, style: 'Zen Gardens & Shrines' },
                  { name: 'Reykjavik', country: 'Iceland', latitude: 64.1466, longitude: -21.9426, style: 'Glaciers & Aurora' },
                ].map((city) => {
                  const isActive = selectedDestination.name.toLowerCase() === city.name.toLowerCase();
                  return (
                    <button
                      key={city.name}
                      type="button"
                      className={`hero-chip-btn ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectLocation({
                        name: city.name,
                        city: city.name,
                        country: city.country,
                        latitude: city.latitude,
                        longitude: city.longitude,
                        type: 'city',
                      })}
                    >
                      {city.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minimalist Destination Information Telemetry */}
            <div className="hero-destination-telemetry">
              <div className="telemetry-header">
                <span className="telemetry-pulse-dot" />
                <span className="telemetry-city">{selectedDestination.name.toUpperCase()}</span>
                <span className="telemetry-country">{selectedDestination.country || 'Global'}</span>
              </div>
              <div className="telemetry-coords">
                {Math.abs(selectedDestination.latitude).toFixed(4)}° {selectedDestination.latitude >= 0 ? 'N' : 'S'} · {Math.abs(selectedDestination.longitude).toFixed(4)}° {selectedDestination.longitude >= 0 ? 'E' : 'W'}
              </div>
              <div className="telemetry-style">
                {selectedDestination.style || 'Culture · Architecture · Discovery'}
              </div>
            </div>
          </div>

          {/* Right Column: Massive 3D Earth Globe Visual Anchored to Right Wall */}
          <div className="hero-globe-column" aria-label="3D Earth Hemisphere">
            <div className="hero-globe-stage">
              <VoyanaGlobe
                ref={globeRef}
                selectedLocation={selectedDestination}
                routes={activeRoutes}
                autoRotate={true}
                onLocationSelect={handleSelectLocation}
                metadata={{
                  temperature: selectedDestination.temperature || '21°C',
                  style: selectedDestination.style || 'Culture & Discovery',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. DESTINATION DISCOVERY SECTION (Connecting Content to Earth) */}
      <DestinationRail
        selectedLocationName={selectedDestination.name}
        onSelect={(loc) => {
          handleSelectLocation(loc);
          document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 4. EXPEDITIONS & MULTI-STOP FLIGHT ARCS */}
      <FeaturedJourneys
        onSelectRoute={handleSelectRoute}
      />

      {/* 5. EDITORIAL DESTINATIONS GRID */}
      <DestinationGrid
        onSelectDestination={handleSelectLocation}
        onOpenFlight={(dest) => { setFlightModalDestination(dest); setFlightModalOpen(true); }}
        onOpenHotel={(dest) => { setHotelModalDestination(dest); setHotelModalOpen(true); }}
        onOpenReviews={(dest) => { setReviewsDestination(dest); setReviewsModalOpen(true); }}
      />

      {/* 6. INTELLIGENT TRAVEL SUITE (Workspace, AI, Packing, Budget, Reviews, Memories) */}
      <TravelSuiteHub
        onOpenTrips={() => setTripDashboardOpen(true)}
        onOpenChat={() => setChatModalOpen(true)}
        onOpenPacking={() => setPackingModalOpen(true)}
        onOpenBudget={() => setBudgetModalOpen(true)}
        onOpenReviews={() => { setReviewsDestination(selectedDestination.name); setReviewsModalOpen(true); }}
        onOpenMemories={() => setMemoriesModalOpen(true)}
      />

      {/* 7. SOPHISTICATED EDITORIAL FOOTER */}
      <Footer />

      {/* ==========================================================================
         TRAVEL APPLICATION MODALS (100% Functionality Preserved & Connected)
         ========================================================================== */}
      <ChatAssistantModal
        isOpen={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        destination={selectedDestination.city || selectedDestination.name}
        onOpenBudget={() => setBudgetModalOpen(true)}
        onOpenPacking={() => setPackingModalOpen(true)}
      />

      <FlightBookingModal
        isOpen={flightModalOpen}
        onClose={() => setFlightModalOpen(false)}
        initialDestination={flightModalDestination || selectedDestination.city || selectedDestination.name}
      />

      <HotelBookingModal
        isOpen={hotelModalOpen}
        onClose={() => setHotelModalOpen(false)}
        initialDestination={hotelModalDestination || selectedDestination.city || selectedDestination.name}
      />

      <TransportBookingModal
        isOpen={transportModalOpen}
        onClose={() => setTransportModalOpen(false)}
        defaultDestination={transportModalDestination || selectedDestination.city || selectedDestination.name}
      />

      <UnifiedBundleBookingModal
        isOpen={bundleBookingModalOpen}
        onClose={() => setBundleBookingModalOpen(false)}
        currentUser={activeUserContext}
      />

      <MyBookingsModal
        isOpen={myBookingsOpen}
        onClose={() => setMyBookingsOpen(false)}
        onOpenFlightModal={() => setFlightModalOpen(true)}
        onOpenHotelModal={() => setHotelModalOpen(true)}
        onOpenTransportModal={() => setTransportModalOpen(true)}
      />

      <PackingChecklistModal
        isOpen={packingModalOpen}
        onClose={() => setPackingModalOpen(false)}
        destination={selectedDestination.city || selectedDestination.name}
        onOpenChatWithPrompt={(prompt) => {
          setChatInitialPrompt(prompt);
          setChatModalOpen(true);
        }}
      />

      <BudgetPlannerModal
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        destination={selectedDestination.city || selectedDestination.name}
        onOpenChatWithPrompt={(prompt) => {
          setChatInitialPrompt(prompt);
          setChatModalOpen(true);
        }}
      />

      {/* AI Travel Assistant & Concierge Modal */}
      <ChatAssistantModal
        isOpen={chatModalOpen}
        onClose={() => {
          setChatModalOpen(false);
          setChatInitialPrompt(undefined);
        }}
        destination={selectedDestination.city || selectedDestination.name}
        initialPrompt={chatInitialPrompt}
        onOpenBudget={() => setBudgetModalOpen(true)}
        onOpenPacking={() => setPackingModalOpen(true)}
      />

      <TripDashboardModal
        isOpen={tripDashboardOpen}
        onClose={() => setTripDashboardOpen(false)}
        onOpenWorkspace={(trip) => {
          setTripDashboardOpen(false);
          setActiveWorkspaceTrip(trip);
        }}
      />

      <TripWorkspaceModal
        isOpen={!!activeWorkspaceTrip}
        onClose={() => setActiveWorkspaceTrip(null)}
        trip={activeWorkspaceTrip}
        currentUser={activeUserContext}
      />

      <TravelReviewsModal
        isOpen={reviewsModalOpen}
        onClose={() => setReviewsModalOpen(false)}
        initialTargetId={(reviewsDestination || selectedDestination.name).toLowerCase()}
        initialTargetTitle={reviewsDestination || selectedDestination.name}
        currentUser={activeUserContext}
      />

      <TravelMemoriesModal
        isOpen={memoriesModalOpen}
        onClose={() => setMemoriesModalOpen(false)}
        currentUser={activeUserContext}
      />

      {/* User Profile & Preferences Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => {
          setProfileModalOpen(false);
          if (route === 'profile') window.location.hash = '/';
        }}
      />

      {/* Admin Ecosystem Oversight Modal */}
      <AdminDashboardModal
        isOpen={adminModalOpen}
        onClose={() => {
          setAdminModalOpen(false);
          if (route === 'admin') window.location.hash = '/';
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;
