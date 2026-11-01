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
  if (route === 'login' || route === 'signup' || route === 'forgot-password') return <main className="voyana-editorial-shell"><AuthLayout route={route}>{route === 'login' ? <LoginPage /> : route === 'signup' ? <SignupPage /> : <ForgotPasswordPage />}</AuthLayout></main>;
  return <div className="voyana-editorial-shell">
    <Header {...actions} destination={selected ? planning.destination : undefined} canBook={citySelected} canCollaborate={canCollaborate} hasBookings={Boolean(user && bookings.length)} services={services} />
    <div className="workflow-preview-note">Project demo · Test payments only · Prices in INR</div>
    {notice && <div role="status" className="workflow-notice">{notice}<button aria-label="Dismiss notice" onClick={() => setNotice('')}>×</button></div>}
    <section className="editorial-hero" id="top"><div className="hero-container"><div className="hero-copy-column">
      <span className="editorial-eyebrow">LESS PLANNING FRICTION. MORE POSSIBILITY.</span><h1 className="hero-editorial-headline">Find your place.<br /><span className="serif-highlight">Make it a journey.</span></h1>
      <p className="hero-editorial-lede">Start with a city. Explore its stays, flights and transfers, then bring your people into one connected trip.</p>
      <TravelSearch isLoading={resolvingPlace} selectedLocation={selectedLocation} onLocationSelect={selectLocation} />
      <div className="hero-quick-switch"><span className="quick-switch-label">A FEW PLACES TO BEGIN</span><div className="hero-quick-switch-chips">{['Ahmedabad', 'Paris', 'Tokyo', 'Bali'].map(city => <button key={city} className={`hero-chip-btn ${planning.destination === city ? 'active' : ''}`} onClick={() => void selectAndBook(city)}>{city}</button>)}</div></div>
      {selectedLocation && selected && !resolvingPlace && !selectedLocation.name.includes('°') && <div className="hero-destination-telemetry" aria-label="Selected destination"><div className="telemetry-header"><span className="telemetry-pulse-dot" /><span className="telemetry-city">{selectedLocation.name}</span><span className="telemetry-country">{[selectedLocation.state, selectedLocation.country].filter(Boolean).join(', ')}</span></div><dl className="hero-place-details"><div><dt>City</dt><dd>{selectedLocation.city || (selectedLocation.type==='city'?selectedLocation.name:'Not available')}</dd></div><div><dt>State / Region</dt><dd>{selectedLocation.state || 'Not available'}</dd></div><div><dt>Country</dt><dd>{selectedLocation.country || 'Not applicable'}</dd></div></dl><a href={`https://www.openstreetmap.org/?mlat=${selectedLocation.latitude}&mlon=${selectedLocation.longitude}#map=12/${selectedLocation.latitude}/${selectedLocation.longitude}`} target="_blank" rel="noreferrer">View this place on a map ↗</a><small className="place-attribution">Place data © OpenStreetMap contributors · Photon</small></div>}
    </div><div className="hero-globe-column" aria-label="3D Earth Hemisphere"><div className="hero-globe-stage"><VoyanaGlobe onPlaceLookupChange={setResolvingPlace} ref={globe} selectedLocation={selectedLocation} routes={routes} autoRotate={!selected} onLocationSelect={selectLocation} /></div></div></div></section>
    <TravelSuiteHub {...actions} destination={selected ? planning.destination : undefined} hasBooking={canCollaborate} signedIn={isAuthenticated} services={services} />
    <DestinationRail selectedLocationName={selectedLocation?.name || ''} onSelect={selectLocation} />
    <DestinationGrid selectedLocationName={selectedLocation?.name || ''} onSelectDestination={selectLocation} onOpenFlight={destination => void selectAndBook(destination, 'flight')} onOpenHotel={destination => void selectAndBook(destination, 'hotel')} onOpenReviews={destination => void selectAndBook(destination, 'reviews')} onOpenDestinationDetails={setDestinationDetails} />
    <FeaturedJourneys onSelectRoute={(arcs, start) => { selectLocation(start); setRoutes(arcs); }} onOpenWorkspaceWithRoute={(_title, destination) => void selectAndBook(destination)} onOpenJourneyDetails={setJourneyDetails} />
    <Footer canBook={citySelected} canCollaborate={canCollaborate} {...services} />
    <Suspense fallback={<p role="status" className="workflow-notice">Opening your travel tool…</p>}>
      {pendingBooking && user && <BookingModeDialog userId={user.id} destination={planning.destination} onClose={() => setPendingBooking(null)} onGroups={() => { setPendingBooking(null); setModal('trips'); }} onContinue={trip => { const service = pendingBooking; setPendingBooking(null); if (trip) selectPlanningTrip(trip); else selectPlanningDestination(planning.destination, planning.location); void requestService(service, true); }} />}
      {modal === 'flight' && selected && user && <FlightBookingModal isOpen onClose={close} initialDestination={planning.destination} />}
      {modal === 'hotel' && selected && user && <HotelBookingModal isOpen onClose={close} initialDestination={planning.destination} />}
      {modal === 'transport' && selected && user && <TransportBookingModal isOpen onClose={close} defaultDestination={planning.destination} userId={user.id} />}
      {modal === 'bundle' && selected && user && <UnifiedBundleBookingModal isOpen onClose={close} currentUser={userContext} destination={planning.destination} />}
      {modal === 'bookings' && user && <MyBookingsModal userId={user.id} isOpen onClose={close} onOpenFlightModal={actions.onOpenFlight} onOpenHotelModal={actions.onOpenHotel} onOpenTransportModal={actions.onOpenTransport} />}
      {modal === 'chat' && selected && <ChatAssistantModal isOpen onClose={close} destination={planning.destination} initialPrompt={prompt} onOpenBudget={canCollaborate ? actions.onOpenBudget : undefined} onOpenPacking={canCollaborate ? actions.onOpenPacking : undefined} onOpenTrips={canCollaborate ? actions.onOpenTrips : undefined} />}
      {modal === 'budget' && canCollaborate && <BudgetPlannerModal isOpen onClose={close} destination={planning.destination} onOpenChatWithPrompt={text => { setPrompt(text); setModal('chat'); }} />}
      {modal === 'packing' && canCollaborate && <PackingChecklistModal isOpen onClose={close} destination={planning.destination} onOpenChatWithPrompt={text => { setPrompt(text); setModal('chat'); }} />}
      {modal === 'trips' && user && <WorkspaceLobby onClose={close} onOpen={trip => { selectPlanningTrip(trip); setWorkspaceTrip(trip); setModal(null); }} />}
      {workspaceTrip && user && <TripWorkspaceModal onBook={service => { selectPlanningTrip(workspaceTrip); setWorkspaceTrip(null); void requestService(service, true); }} key={workspaceTrip.id} bookingConfirmed={workspaceTrip.hasConfirmedBooking || bookings.some(item => item.tripId === workspaceTrip.id && item.status === 'confirmed' && item.paymentStatus === 'paid')}  isOpen onClose={() => { setWorkspaceTrip(null); if (readRoute() === 'trips' || readRoute() === 'trip-share') window.location.hash = '/'; }} trip={workspaceTrip} onTripChange={trip => { setWorkspaceTrip(trip); selectPlanningTrip(trip); }} currentUser={userContext} />}
      {modal === 'reviews' && selected && <TravelReviewsModal isOpen onClose={close} initialTargetId={planning.destination.toLowerCase()} initialTargetTitle={planning.destination} currentUser={userContext} />}
      {modal === 'memories' && canCollaborate && <TravelMemoriesModal isOpen onClose={close} currentUser={userContext} initialTripId={planning.id} />}
      {modal === 'profile' && user && <ProfileModal isOpen onClose={close} />}
      {modal === 'admin' && isAdmin && <AdminDashboardModal isOpen onClose={close} />}
      {destinationDetails && <DestinationDetailsModal isOpen destination={destinationDetails} onClose={() => setDestinationDetails(null)} onBookFlight={city => void selectAndBook(city, 'flight')} onBookHotel={city => void selectAndBook(city, 'hotel')} onBookTransport={city => void selectAndBook(city, 'transport')} onViewReviews={city => void selectAndBook(city, 'reviews')} onPlanTripInWorkspace={(_title, city) => void selectAndBook(city)} onAskAiGuide={(city, text) => { setPrompt(text); void selectAndBook(city, 'chat'); }} onFocusOnGlobe={city => void selectAndBook(city)} />}
      {journeyDetails && <JourneyDetailsModal isOpen journey={journeyDetails} onClose={() => setJourneyDetails(null)} onPlanInWorkspace={journey => void selectAndBook(journey.stops[0])} onBookBundle={() => void selectAndBook(journeyDetails.stops[0], 'bundle')} onAskAiPlanner={(city, text) => { setPrompt(text); void selectAndBook(city, 'chat'); }} onPreviewOnGlobe={(arcs, start) => { selectLocation(start); setRoutes(arcs); }} />}
    </Suspense>
  </div>;
}
export function App() { return <AuthProvider><MainAppContent /></AuthProvider>; }
export default App;
