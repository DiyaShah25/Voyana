import { useState } from 'react';
import { Compass, Menu, X, LogOut, User, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AlertsPanel from '@/components/Alerts/AlertsPanel';

interface HeaderProps {
  destination?: string;
  canBook?: boolean;
  canCollaborate?: boolean;
  hasBookings?: boolean;
  services?: { flights: boolean; hotels: boolean; transport: boolean; bundles: boolean };
  onOpenTrips: () => void; onOpenMyBookings: () => void; onOpenChat: () => void;
  onOpenFlight: () => void; onOpenHotel: () => void; onOpenTransport: () => void; onOpenBundle: () => void;
  onOpenPacking: () => void; onOpenBudget: () => void; onOpenReviews: () => void; onOpenMemories: () => void;
  onOpenProfile: () => void; onOpenAdmin: () => void;
}

export function Header(props: HeaderProps) {
  const { user, isAuthenticated, isAdmin, signOut } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const act = (callback: () => void) => { setExpanded(false); callback(); };
  return <header className="architectural-header workflow-header">
    <div className="workflow-nav-shell">
      <a href="#top" className="arch-brand-lockup" aria-label="Voyana Home"><Compass size={29} /><span className="arch-brand-titles"><span className="arch-brand-wordmark">VOYANA</span><span className="arch-brand-tagline">trip pe aana</span></span></a>
      <button className="workflow-menu-toggle" aria-label="Toggle navigation menu" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? <X /> : <Menu />}</button>
      <nav className={`workflow-nav-links ${expanded ? 'expanded' : ''}`} aria-label="Main navigation">
        <a href="#destinations" onClick={() => setExpanded(false)}>Explore</a>
        {props.canBook && <details className="workflow-nav-menu"><summary>Book {props.destination}</summary><div>
          {props.services?.flights && <button onClick={() => act(props.onOpenFlight)}>Flights</button>}
          {props.services?.hotels && <button onClick={() => act(props.onOpenHotel)}>Hotels & stays</button>}
          {props.services?.transport && <button onClick={() => act(props.onOpenTransport)}>Ground transport</button>}
          {props.services?.bundles && <button onClick={() => act(props.onOpenBundle)}>Travel bundle</button>}
        </div></details>}
        {props.hasBookings && <button onClick={() => act(props.onOpenMyBookings)}>My bookings</button>}
        <button onClick={() => act(props.onOpenTrips)}>Workspace</button>
        {props.canCollaborate && <><button onClick={() => act(props.onOpenBudget)}>Split expenses</button><button onClick={() => act(props.onOpenPacking)}>Packing</button><button onClick={() => act(props.onOpenMemories)}>Memories</button></>}
        <button onClick={() => act(props.onOpenChat)} aria-label="Open AI Travel Assistant"><Sparkles size={15} /> VoyaBot</button>
        {isAdmin && <button onClick={() => act(props.onOpenAdmin)}><Shield size={15} /> Admin</button>}
        {isAuthenticated ? <><AlertsPanel /><button onClick={() => act(props.onOpenProfile)}><User size={15} />{user?.name.split(' ')[0]}<span className="workflow-role">{user?.role}</span></button><button aria-label="Sign out" title="Sign out" onClick={() => act(signOut)}><LogOut size={16} /></button></> : <a className="workflow-signin" href="#/login">Sign in</a>}
      </nav>
    </div>
  </header>;
}
