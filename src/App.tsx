import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { GlobeLocation, GlobeRoute, VoyanaGlobeHandle } from '@/components/Globe/globe.types';
import VoyanaGlobe from '@/components/Globe/VoyanaGlobe';
import { Header } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TravelSearch from '@/components/Search/TravelSearch';
import DestinationRail from '@/components/Destinations/DestinationRail';
import DestinationGrid from '@/components/Destinations/DestinationGrid';
import TravelSuiteHub from '@/components/Services/TravelSuiteHub';
import FeaturedJourneys, { type FeaturedJourney } from '@/components/Journeys/FeaturedJourneys';
import type { DestinationItem } from '@/components/Destinations/DestinationCard';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import AuthLayout from '@/pages/AuthLayout';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import { getPlanningContext, selectPlanningDestination, selectPlanningTrip } from '@/services/planningContext';
import { getUserBookings, type UnifiedBooking } from '@/services/bookingService';
import { getPublicTripById, type Trip } from '@/services/tripService';
import { matchesDestination } from '@/services/destinationPolicy';
import { resolveLocation } from '@/services/locationService';
import { resolveAirportCode } from '@/services/flightService';
import { generateMockHotels } from '@/services/hotelService';

const FlightBookingModal = lazy(() => import('@/components/Booking/FlightBookingModal'));
const HotelBookingModal = lazy(() => import('@/components/Booking/HotelBookingModal'));
const TransportBookingModal = lazy(() => import('@/components/Booking/TransportBookingModal'));
const UnifiedBundleBookingModal = lazy(() => import('@/components/Booking/UnifiedBundleBookingModal'));
const MyBookingsModal = lazy(() => import('@/components/Booking/MyBookingsModal'));
const ChatAssistantModal = lazy(() => import('@/components/Chat/ChatAssistantModal'));
const BudgetPlannerModal = lazy(() => import('@/components/Budget/BudgetPlannerModal'));
const PackingChecklistModal = lazy(() => import('@/components/Packing/PackingChecklistModal'));
const BookingModeDialog = lazy(() => import('@/components/Booking/BookingModeDialog'));
const WorkspaceLobby = lazy(() => import('@/components/Trips/WorkspaceLobby'));
const TripWorkspaceModal = lazy(() => import('@/components/Trips/TripWorkspaceModal'));
const TravelReviewsModal = lazy(() => import('@/components/Reviews/TravelReviewsModal'));
const TravelMemoriesModal = lazy(() => import('@/components/Memories/TravelMemoriesModal'));
const ProfileModal = lazy(() => import('@/pages/ProfileModal'));
const AdminDashboardModal = lazy(() => import('@/pages/AdminDashboardModal'));
const DestinationDetailsModal = lazy(() => import('@/components/Destinations/DestinationDetailsModal'));
const JourneyDetailsModal = lazy(() => import('@/components/Journeys/JourneyDetailsModal'));
type Modal = 'flight' | 'hotel' | 'transport' | 'bundle' | 'bookings' | 'chat' | 'budget' | 'packing' | 'trips' | 'reviews' | 'memories' | 'profile' | 'admin';
const postBookingTools: Modal[] = [ 'budget', 'packing', 'memories'];
const readRoute = () => window.location.hash.replace(/^#\/?/, '').split('?')[0];

function MainAppContent() {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const userId = user?.id;
  const userEmail = user?.email;
  const [route, setRoute] = useState(readRoute);
  const [planning, setPlanning] = useState(getPlanningContext);
  const [selectedLocation, setSelectedLocation] = useState<GlobeLocation | undefined>(() => getPlanningContext().location);
  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
  const [sharedTrip, setSharedTrip] = useState<Trip | null>(null);
  const [workspaceTrip, setWorkspaceTrip] = useState<Trip | null>(null);
  const [pendingBooking, setPendingBooking] = useState<Modal | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [resolvingPlace, setResolvingPlace] = useState(false);
  const [notice, setNotice] = useState('');
  const [prompt, setPrompt] = useState<string>();
  const [routes, setRoutes] = useState<GlobeRoute[]>([]);
  const [destinationDetails, setDestinationDetails] = useState<DestinationItem | null>(null);
  const [journeyDetails, setJourneyDetails] = useState<FeaturedJourney | null>(null);
  const globe = useRef<VoyanaGlobeHandle>(null);
  const selected = Boolean(planning.selected && planning.destination && !planning.destination.includes('°') && planning.destination !== 'Finding place…');
  const confirmed = bookings.find(booking => booking.status === 'confirmed' && booking.paymentStatus === 'paid' && booking.tripId && (!planning.trip || booking.tripId === planning.trip.id) && matchesDestination(planning.destination, booking.destination || ''));
  const canCollaborate = Boolean(user && (planning.trip?.hasConfirmedBooking || confirmed || (sharedTrip?.hasConfirmedBooking && sharedTrip.id === planning.id)));
  const citySelected = selected && !resolvingPlace && selectedLocation?.bookable !== false && !['country', 'state'].includes(selectedLocation?.type || 'city');
  const services = {
    flights: citySelected && Boolean(resolveAirportCode(planning.destination)),
    hotels: citySelected && generateMockHotels({ location: planning.destination, checkInDate: '', checkOutDate: '', guests: 1, rooms: 1 }).length > 0,
    transport: citySelected,
    bundles: false,
  };
  services.bundles = services.flights && services.hotels && services.transport;

  useEffect(() => {
    const hash = () => setRoute(readRoute());
    const context = () => { const current = getPlanningContext(); setPlanning(current); if (current.location) setSelectedLocation(current.location); };
    window.addEventListener('hashchange', hash);
    window.addEventListener('voyana:planning-changed', context);
    return () => { window.removeEventListener('hashchange', hash); window.removeEventListener('voyana:planning-changed', context); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBookings([]);
    setSharedTrip(null);
    setWorkspaceTrip(null);
    setModal(null);
    const current = getPlanningContext();
    if (current.trip && !current.trip.members?.some(member => member.userId === userId || member.email === userEmail)) {
      selectPlanningDestination(current.destination, current.location);
    }
    const refresh = async () => { if (userId) { const result = await getUserBookings(userId); if (!cancelled) setBookings(result); } };
    void refresh();
    window.addEventListener('voyana:booking-changed', refresh);
    return () => { cancelled = true; window.removeEventListener('voyana:booking-changed', refresh); };
  }, [userId, userEmail]);

  useEffect(() => {
    let cancelled = false;
    if (confirmed?.tripId && planning.trip?.id !== confirmed.tripId) {
      void getPublicTripById(confirmed.tripId).then(trip => { if (trip && !cancelled) selectPlanningTrip(trip); });
    }
    return () => { cancelled = true; };
  }, [confirmed?.tripId, planning.trip?.id]);

  const selectLocation = (location: GlobeLocation) => {
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return;
    setSelectedLocation(location);
    selectPlanningDestination(location.name, location);
    setRoutes([]);
    setSharedTrip(null);
    setWorkspaceTrip(null);
    setModal(null);
    setNotice('');
  };

  const close = () => { setModal(null); setPrompt(undefined); if (['flight', 'hotel', 'transport', 'bundle', 'bookings', 'chat', 'budget', 'packing', 'trips', 'reviews', 'memories', 'profile', 'admin'].includes(readRoute())) window.location.hash = '/'; };
  const requestService = async (name: Modal, modeChosen = false) => {
    const current = getPlanningContext();
    setDestinationDetails(null); setJourneyDetails(null);
    if (name === 'admin' && !isAdmin) { setNotice('Administrator access is required.'); return; }
    if (['trips', 'profile', 'flight', 'hotel', 'transport', 'bundle', 'bookings', ...postBookingTools].includes(name) && !isAuthenticated) { window.location.hash = '/login'; return; }
    if (!['trips', 'profile', 'admin', 'bookings'].includes(name) && (!current.selected || !current.destination)) { setNotice('Choose a destination in the search bar or on the globe first.'); return; }
    if (['flight','hotel','transport','bundle'].includes(name) && !modeChosen) { setPendingBooking(name); return; }
    const booking = bookings.find(item => item.status === 'confirmed' && item.paymentStatus === 'paid' && item.tripId && matchesDestination(current.destination, item.destination || ''));
    const sharedAccess = Boolean(current.trip?.hasConfirmedBooking || (sharedTrip?.hasConfirmedBooking && sharedTrip.id === current.id));
    if (postBookingTools.includes(name) && !booking && !sharedAccess) { setNotice(`Confirm a booking for ${current.destination} to unlock its workspace and expense tools.`); return; }
    if (postBookingTools.includes(name) && booking?.tripId && current.id !== booking.tripId) {
      const bookedTrip = await getPublicTripById(booking.tripId);
      if (!bookedTrip) { setNotice('Your booking workspace could not be loaded.'); return; }
      selectPlanningTrip(bookedTrip);
    }
    if (name === 'memories') { const trip = getPlanningContext().trip; if(trip) { setWorkspaceTrip(trip); setModal(null); } else setNotice('Open the trip workspace to create your AI travel memories.'); return; }
    if (name === 'trips') { setWorkspaceTrip(null); setNotice(''); setModal('trips'); return; }
    if (name === 'flight' && !resolveAirportCode(current.destination)) { setNotice('No supported airport for this destination. Choose a nearby city.'); return; }
    setNotice(''); setModal(name);
  };

  const serviceRequest = useRef(requestService);
  serviceRequest.current = requestService;

  useEffect(() => {
    if (loading) return;
    if (route === 'trip-share') {
      const id = new URLSearchParams(window.location.hash.split('?')[1]).get('tripId');
      if (!userId) { window.location.hash = '/login'; return; }
      if (id) void getPublicTripById(id).then(async trip => {
        if (!trip) { setNotice('This invitation is unavailable or your account is not a member.'); return; }
        const location = await resolveLocation(trip.destination);
        if (location) setSelectedLocation(location);
        selectPlanningTrip(trip); setSharedTrip(trip); setWorkspaceTrip(trip);
      });
    } else if (['flight', 'hotel', 'transport', 'bundle', 'bookings', 'chat', 'budget', 'packing', 'trips', 'reviews', 'memories', 'profile', 'admin'].includes(route)) {
      void serviceRequest.current(route as Modal);
    }
  }, [route, loading, userId]);

  const selectAndBook = async (destination: string, service?: Modal) => {
    const location = await resolveLocation(destination.split('→')[0].trim());
    if (!location) { setNotice('We could not locate this destination. Try a more specific city name.'); return; }
    selectLocation(location);
    if (service) void requestService(service);
    else { setNotice(`Destination selected: ${location.name}. Choose a reservation below to begin your trip.`); document.getElementById('suite')?.scrollIntoView({ behavior: 'smooth' }); }
  };
  const userContext = { id: user?.id || '', name: user?.name || '', email: user?.email || '' };
  const actions = {
    onOpenTrips: () => void requestService('trips'), onOpenMyBookings: () => void requestService('bookings'),
    onOpenChat: () => void requestService('chat'), onOpenFlight: () => void requestService('flight'),
    onOpenHotel: () => void requestService('hotel'), onOpenTransport: () => void requestService('transport'),
    onOpenBundle: () => void requestService('bundle'), onOpenPacking: () => void requestService('packing'),
    onOpenBudget: () => void requestService('budget'), onOpenReviews: () => void requestService('reviews'),
    onOpenMemories: () => void requestService('memories'), onOpenProfile: () => void requestService('profile'), onOpenAdmin: () => void requestService('admin'),
  };

  // Launch Trip Workspace initialized for a destination
  const handlePlanTripInWorkspace = (title: string, destination: string, description?: string) => {
    const newTrip: Trip = {
      id: `trip-plan-${Date.now()}`,
      title,
      destination,
      country: 'Global Destination',
      startDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 21).toISOString().split('T')[0],
      description: description || `Curated itinerary, logistics, and collaborative schedule for exploring ${destination}.`,
      coverImage:
        selectedDestinationForModal?.image ||
        'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&h=650&w=940&q=80',
      budgetTarget: 3500,
      currency: 'USD',
      visibility: 'shared',
      ownerId: activeUserContext.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [
        {
          id: `mem-${activeUserContext.id}`,
          tripId: `trip-plan-${Date.now()}`,
          userId: activeUserContext.id,
          name: activeUserContext.name,
          email: activeUserContext.email,
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      ],
      activities: [
        {
          id: `act-${Date.now()}-1`,
          tripId: `trip-plan-${Date.now()}`,
          dayNumber: 1,
          timeSlot: 'morning',
          title: `Arrival & Check-in at ${destination}`,
          description: `Transfer from airport, hotel check-in, orientation walk and welcome dinner.`,
          locationName: destination,
          orderIndex: 0,
          isCompleted: false,
          category: 'sightseeing',
        },
        {
          id: `act-${Date.now()}-2`,
          tripId: `trip-plan-${Date.now()}`,
          dayNumber: 2,
          timeSlot: 'afternoon',
          title: `Cultural Highlights & Landmarks`,
          description: `Guided exploration of historical quarters, local markets, and scenic viewpoints.`,
          locationName: destination,
          orderIndex: 1,
          isCompleted: false,
          category: 'sightseeing',
        },
      ],
      tags: ['Voyana Curated', destination],
    };

    setSelectedDestinationForModal(null);
    setActiveWorkspaceTrip(newTrip);
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
        selectedLocationName={selectedDestination.name}
        onSelectDestination={handleSelectLocation}
        onOpenFlight={(dest: string) => { setFlightModalDestination(dest); setFlightModalOpen(true); }}
        onOpenHotel={(dest: string) => { setHotelModalDestination(dest); setHotelModalOpen(true); }}
        onOpenReviews={(dest: string) => { setReviewsDestination(dest); setReviewsModalOpen(true); }}
        onOpenDestinationDetails={(dest) => setSelectedDestinationForModal(dest)}
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
        onOpenTrips={() => setTripDashboardOpen(true)}
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

      {/* Destination Card Full Details & Instant Actions Modal */}
      <DestinationDetailsModal
        isOpen={!!selectedDestinationForModal}
        onClose={() => setSelectedDestinationForModal(null)}
        destination={selectedDestinationForModal}
        onBookFlight={(city) => {
          setSelectedDestinationForModal(null);
          setFlightModalDestination(city);
          setFlightModalOpen(true);
        }}
        onBookHotel={(city) => {
          setSelectedDestinationForModal(null);
          setHotelModalDestination(city);
          setHotelModalOpen(true);
        }}
        onBookTransport={(city) => {
          setSelectedDestinationForModal(null);
          setTransportModalDestination(city);
          setTransportModalOpen(true);
        }}
        onViewReviews={(city) => {
          setSelectedDestinationForModal(null);
          setReviewsDestination(city);
          setReviewsModalOpen(true);
        }}
        onPlanTripInWorkspace={(title, dest) => {
          handlePlanTripInWorkspace(title, dest);
        }}
        onAskAiGuide={(city, prompt) => {
          setSelectedDestinationForModal(null);
          setChatInitialPrompt(
            prompt ||
              `I am planning an expedition to ${city}. What are the essential highlights, climate tips, top neighborhoods, and recommended local customs?`
          );
          setChatModalOpen(true);
        }}
        onFocusOnGlobe={() => {
          if (selectedDestinationForModal) {
            handleSelectLocation({
              name: selectedDestinationForModal.name,
              city: selectedDestinationForModal.name,
              country: selectedDestinationForModal.country,
              latitude: selectedDestinationForModal.coordinates.latitude,
              longitude: selectedDestinationForModal.coordinates.longitude,
              type: 'city',
              style: selectedDestinationForModal.style,
            });
            document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <MainAppContent />
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;
