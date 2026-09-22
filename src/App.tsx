import { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Plus,
  Minus,
  RotateCw,
  Pause,
  ArrowRight,
  Globe2,
  MapPin,
  Users,
} from 'lucide-react';
import VoyanaGlobe from '@/components/Globe/VoyanaGlobe';
import type { GlobeLocation, GlobeRoute, VoyanaGlobeHandle } from '@/components/Globe/globe.types';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TravelSearch from '@/components/Search/TravelSearch';
import QuickExploreStrip from '@/components/Destinations/QuickExploreStrip';
import DestinationGrid from '@/components/Destinations/DestinationGrid';
import TravelSuiteHub from '@/components/Services/TravelSuiteHub';
import FeaturedJourneys from '@/components/Journeys/FeaturedJourneys';

// Modals & Sub-experiences
import AuthLayout from '@/pages/AuthLayout';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
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

export function App() {
  const route = useHashRoute();

  // Active globe location
  const [selectedLocation, setSelectedLocation] = useState<GlobeLocation>({
    name: 'Paris',
    city: 'Paris',
    country: 'France',
    latitude: 48.8566,
    longitude: 2.3522,
    type: 'city',
  });

  const [activeRoutes, setActiveRoutes] = useState<GlobeRoute[]>([]);
  const [autoRotate, setAutoRotate] = useState(true);

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
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [packingModalOpen, setPackingModalOpen] = useState(false);

  const [tripDashboardOpen, setTripDashboardOpen] = useState(false);
  const [activeWorkspaceTrip, setActiveWorkspaceTrip] = useState<Trip | null>(null);

  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [reviewsDestination, setReviewsDestination] = useState<string | undefined>(undefined);

  const [memoriesModalOpen, setMemoriesModalOpen] = useState(false);

  const globeRef = useRef<VoyanaGlobeHandle>(null);

  // Geographic selection handler (slerp fly-to globe)
  const handleLocationSelect = (location: GlobeLocation) => {
    setSelectedLocation(location);
    globeRef.current?.focusOnLocation(location.latitude, location.longitude, location.type);
    globeRef.current?.setMarker(location);
  };

  // Route preview handler (draws great circle lines on globe)
  const handleSelectRoute = (routes: GlobeRoute[], startLocation: GlobeLocation) => {
    setActiveRoutes(routes);
    handleLocationSelect(startLocation);
  };

  // Open workspace with customized route
  const handleOpenWorkspaceWithRoute = (title: string, destination: string) => {
    setTripDashboardOpen(true);
  };

  // Auth pages view
  if (route !== 'home') {
    return (
      <main className="voyana-app">
        <AuthLayout route={route}>
          {route === 'login' && <LoginPage />}
          {route === 'signup' && <SignupPage />}
          {route === 'forgot-password' && <ForgotPasswordPage />}
        </AuthLayout>
      </main>
    );
  }

  return (
    <div className="voyana-app">
      {/* 1. STICKY NAVIGATION HEADER */}
      <Header
        onOpenTrips={() => setTripDashboardOpen(true)}
        onOpenFlight={() => { setFlightModalDestination(selectedLocation.city || selectedLocation.name); setFlightModalOpen(true); }}
        onOpenHotel={() => { setHotelModalDestination(selectedLocation.city || selectedLocation.name); setHotelModalOpen(true); }}
        onOpenTransport={() => { setTransportModalDestination(selectedLocation.city || selectedLocation.name); setTransportModalOpen(true); }}
        onOpenBundle={() => setBundleBookingModalOpen(true)}
        onOpenMyBookings={() => setMyBookingsOpen(true)}
        onOpenChat={() => setChatModalOpen(true)}
        onOpenBudget={() => setBudgetModalOpen(true)}
        onOpenPacking={() => setPackingModalOpen(true)}
        onOpenReviews={() => { setReviewsDestination(selectedLocation.name); setReviewsModalOpen(true); }}
        onOpenMemories={() => setMemoriesModalOpen(true)}
      />

      {/* 2. HERO SECTION & 3D EARTH GLOBE */}
      <section className="hero-section" id="top">
        <div className="hero-grid">
          {/* Left Hero Column */}
          <div className="hero-content-col">
            <div className="hero-eyebrow">
              <Compass size={14} className="text-emerald-700" />
              <span>EXPLORE WITHOUT LIMITS</span>
            </div>

            <h1 className="hero-heading">
              Your world, waiting to be <em>discovered</em>.
            </h1>

            <p className="hero-lede">
              The intelligent travel discovery platform. Explore real-time geography on an interactive 3D Earth, collaborate on shared itineraries, and orchestrate verified global journeys.
            </p>

            {/* Structured Multi-field Travel Search */}
            <TravelSearch
              onLocationSelect={handleLocationSelect}
            />

            {/* Global Stats */}
            <div className="hero-stats-row">
              <div className="stat-item">
                <span className="stat-val">250+</span>
                <span className="stat-label">Countries & Territories</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">10K+</span>
                <span className="stat-label">Curated Destinations</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">100%</span>
                <span className="stat-label">Real-time Coordinates</span>
              </div>
            </div>
          </div>

          {/* Right Hero Column: Large 3D Earth Globe */}
          <div className="hero-globe-col">
            <div className="globe-stage-container">
              <VoyanaGlobe
                ref={globeRef}
                selectedLocation={selectedLocation}
                routes={activeRoutes}
                autoRotate={autoRotate}
                onLocationSelect={handleLocationSelect}
              />

              {/* Minimal Floating Globe Controls */}
              <div className="globe-floating-controls">
                <button
                  type="button"
                  className="btn-globe-ctrl"
                  onClick={() => globeRef.current?.zoomIn()}
                  aria-label="Zoom in on Earth"
                  title="Zoom in"
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  className="btn-globe-ctrl"
                  onClick={() => globeRef.current?.zoomOut()}
                  aria-label="Zoom out on Earth"
                  title="Zoom out"
                >
                  <Minus size={16} />
                </button>
                <button
                  type="button"
                  className="btn-globe-ctrl"
                  onClick={() => setAutoRotate(!autoRotate)}
                  aria-label={autoRotate ? 'Pause Earth rotation' : 'Resume Earth rotation'}
                  title={autoRotate ? 'Pause rotation' : 'Resume rotation'}
                >
                  {autoRotate ? <Pause size={15} /> : <RotateCw size={15} />}
                </button>
                <button
                  type="button"
                  className="btn-globe-ctrl"
                  onClick={() => globeRef.current?.reset()}
                  aria-label="Reset Earth view"
                  title="Reset view"
                >
                  <Compass size={15} />
                </button>
              </div>

              {/* Geographic Focus Tag */}
              <div className="globe-focus-chip animate-fade-in">
                <span className="focus-dot" />
                <span>
                  Focused on <b>{selectedLocation.name}</b>
                  {selectedLocation.country ? `, ${selectedLocation.country}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. QUICK EXPLORE STRIP (Instant geographic chips) */}
      <QuickExploreStrip
        selectedLocationName={selectedLocation.name}
        onSelect={handleLocationSelect}
      />

      {/* 4. CURATED DESTINATIONS GRID */}
      <DestinationGrid
        selectedLocationName={selectedLocation.name}
        onSelectOnGlobe={handleLocationSelect}
        onBookFlight={(city) => { setFlightModalDestination(city); setFlightModalOpen(true); }}
        onBookHotel={(city) => { setHotelModalDestination(city); setHotelModalOpen(true); }}
        onViewReviews={(city) => { setReviewsDestination(city); setReviewsModalOpen(true); }}
      />

      {/* 5. MULTI-STOP EXPEDITIONS & ROUTE PREVIEW */}
      <FeaturedJourneys
        onSelectRoute={handleSelectRoute}
        onOpenWorkspaceWithRoute={handleOpenWorkspaceWithRoute}
      />

      {/* 6. INTELLIGENT TRAVEL SUITE (Workspace, AI, Packing, Budget, Reviews, Memories) */}
      <TravelSuiteHub
        onOpenTrips={() => setTripDashboardOpen(true)}
        onOpenChat={() => setChatModalOpen(true)}
        onOpenPacking={() => setPackingModalOpen(true)}
        onOpenBudget={() => setBudgetModalOpen(true)}
        onOpenReviews={() => { setReviewsDestination(selectedLocation.name); setReviewsModalOpen(true); }}
        onOpenMemories={() => setMemoriesModalOpen(true)}
      />

      {/* 7. FOOTER */}
      <Footer />

      {/* ==========================================================================
         TRAVEL EXPERIENCE MODALS (Preserved 100% functionality)
         ========================================================================== */}
      {/* Floating Travel Assistant Trigger (bottom right) */}
      {!chatModalOpen && (
        <button
          type="button"
          className="floating-ai-trigger"
          onClick={() => setChatModalOpen(true)}
          aria-label="Open Voyana AI Travel Assistant"
        >
          <Compass size={17} />
          <span>Travel Assistant</span>
        </button>
      )}

      {/* Voyana AI Travel Assistant Modal */}
      <ChatAssistantModal
        isOpen={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        destination={selectedLocation.city || selectedLocation.name}
        onOpenBudget={() => setBudgetModalOpen(true)}
        onOpenPacking={() => setPackingModalOpen(true)}
      />

      {/* Flight Booking Modal */}
      <FlightBookingModal
        isOpen={flightModalOpen}
        onClose={() => setFlightModalOpen(false)}
        initialDestination={flightModalDestination || selectedLocation.city || selectedLocation.name}
      />

      {/* Hotel Booking Modal */}
      <HotelBookingModal
        isOpen={hotelModalOpen}
        onClose={() => setHotelModalOpen(false)}
        initialDestination={hotelModalDestination || selectedLocation.city || selectedLocation.name}
      />

      {/* Ground Transport Booking Modal */}
      <TransportBookingModal
        isOpen={transportModalOpen}
        onClose={() => setTransportModalOpen(false)}
        defaultDestination={transportModalDestination || selectedLocation.city || selectedLocation.name}
      />

      {/* Unified Bundle Booking Modal */}
      <UnifiedBundleBookingModal
        isOpen={bundleBookingModalOpen}
        onClose={() => setBundleBookingModalOpen(false)}
      />

      {/* My Bookings Modal */}
      <MyBookingsModal
        isOpen={myBookingsOpen}
        onClose={() => setMyBookingsOpen(false)}
        onOpenFlightModal={() => setFlightModalOpen(true)}
        onOpenHotelModal={() => setHotelModalOpen(true)}
        onOpenTransportModal={() => setTransportModalOpen(true)}
      />

      {/* Smart Packing Checklist Modal */}
      <PackingChecklistModal
        isOpen={packingModalOpen}
        onClose={() => setPackingModalOpen(false)}
        destination={selectedLocation.city || selectedLocation.name}
        onOpenChatWithPrompt={() => setChatModalOpen(true)}
      />

      {/* Budget Planner Modal */}
      <BudgetPlannerModal
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        destination={selectedLocation.city || selectedLocation.name}
        onOpenChatWithPrompt={() => setChatModalOpen(true)}
      />

      {/* Trip Planning Dashboard */}
      <TripDashboardModal
        isOpen={tripDashboardOpen}
        onClose={() => setTripDashboardOpen(false)}
        onOpenWorkspace={(trip) => {
          setTripDashboardOpen(false);
          setActiveWorkspaceTrip(trip);
        }}
      />

      {/* Trip Collaborative Workspace */}
      <TripWorkspaceModal
        isOpen={!!activeWorkspaceTrip}
        onClose={() => setActiveWorkspaceTrip(null)}
        trip={activeWorkspaceTrip}
      />

      {/* Travel Reviews & Ratings Modal */}
      <TravelReviewsModal
        isOpen={reviewsModalOpen}
        onClose={() => setReviewsModalOpen(false)}
        initialTargetId={(reviewsDestination || selectedLocation.name).toLowerCase()}
        initialTargetTitle={reviewsDestination || selectedLocation.name}
      />

      {/* Travel Memories & Photo Journal */}
      <TravelMemoriesModal
        isOpen={memoriesModalOpen}
        onClose={() => setMemoriesModalOpen(false)}
      />
    </div>
  );
}

export default App;
