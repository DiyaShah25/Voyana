import { Plane, Building2, Car, Users, Wallet, Briefcase, Sparkles, Star, Camera, ArrowUpRight, Check } from 'lucide-react';

interface Props {
  destination?: string; hasBooking: boolean; signedIn: boolean;
  services: { flights: boolean; hotels: boolean; transport: boolean; bundles: boolean };
  onOpenFlight: () => void; onOpenHotel: () => void; onOpenTransport: () => void; onOpenBundle: () => void;
  onOpenTrips: () => void; onOpenChat: () => void; onOpenPacking: () => void; onOpenBudget: () => void;
  onOpenReviews: () => void; onOpenMemories: () => void;
}
export default function TravelSuiteHub(props: Props) {
  const { destination, hasBooking, services } = props;
  const cards = destination ? [
    ...(services.flights ? [{ title: 'Flights', text: `Choose your departure airport. Every flight arrives in ${destination}.`, icon: Plane, action: props.onOpenFlight, label: `Book flights to ${destination}` }] : []),
    ...(services.hotels ? [{ title: 'Stay somewhere lovely', text: `Browse the sample hotel collection in ${destination}.`, icon: Building2, action: props.onOpenHotel, label: `Find hotels in ${destination}` }] : []),
    ...(services.transport ? [{ title: 'Arrive with a plan', text: `Transfers and ground transport for ${destination}.`, icon: Car, action: props.onOpenTransport, label: `Find transport in ${destination}` }] : []),
    ...(hasBooking ? [{ title: 'Your people, one workspace', text: 'Invite your group, arrange activities, vote on ideas and keep the conversation together.', icon: Users, action: props.onOpenTrips, label: 'Open trip workspace' }, { title: 'Every expense, accounted for', text: 'Your confirmed bookings are already in the ledger. Add your group and split costs clearly.', icon: Wallet, action: props.onOpenBudget, label: 'Split trip expenses' }, { title: 'Ready when you are', text: 'Keep a separate packing list for this trip and assign shared items to your group.', icon: Briefcase, action: props.onOpenPacking, label: 'Open packing checklist' }] : []),
  ] : [];
  return <section className="workflow-suite" id="suite" aria-label="Destination booking and trip tools">
    <div className="workflow-section-heading"><div><span className="editorial-eyebrow">{destination ? 'YOUR NEXT CHAPTER' : 'ONE CONNECTED JOURNEY'}</span><h2>{destination ? `Make it ${destination}.` : 'Choose a place. We will connect the rest.'}</h2></div><p>{hasBooking ? 'Your reservation is confirmed. Your workspace and shared expenses are ready.' : 'Choose your destination first. Open a workspace anytime to discuss ideas with your group. Expense tools unlock after booking.'}</p></div>
    <button className="workflow-signin" onClick={props.onOpenTrips}>Plan together · Open workspace</button>
    <ol className="workflow-steps" aria-label="Trip progress">{['Choose a destination', 'Confirm a booking', 'Plan with your people'].map((label, index) => <li key={label} className={(index === 0 && destination || index > 0 && hasBooking) ? 'complete' : ''}><span>{index === 0 && destination || index > 0 && hasBooking ? <Check size={14} /> : index + 1}</span>{label}</li>)}</ol>
    {cards.length > 0 && <div className="workflow-card-grid">{cards.map(card => <article className="workflow-service-card" key={card.title}><card.icon size={24} /><h3>{card.title}</h3><p>{card.text}</p><button onClick={card.action}>{card.label}<ArrowUpRight size={16} /></button></article>)}</div>}
    {destination && <div className="workflow-extra-tools"><button onClick={props.onOpenChat}><Sparkles size={17} /> Ask VoyaBot about {destination}</button><button onClick={props.onOpenReviews}><Star size={17} /> Destination reviews</button>{services.bundles && <button onClick={props.onOpenBundle}>Compare a travel bundle <ArrowUpRight size={17} /></button>}{hasBooking && <button onClick={props.onOpenMemories}><Camera size={17} /> Trip memories</button>}</div>}
    {destination && !hasBooking && !props.signedIn && <p className="workflow-hint">You can explore freely. <a href="#/login">Sign in</a> when you are ready to make a demo reservation.</p>}
  </section>;
}
