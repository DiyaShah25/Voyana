import React from 'react';
import {
  Plane,
  Building2,
  Car,
  Layers,
  Compass,
  Briefcase,
  Wallet,
  Star,
  Camera,
  Sparkles,
  BookmarkCheck,
} from 'lucide-react';

interface QuickServicesBarProps {
  onOpenFlight: () => void;
  onOpenHotel: () => void;
  onOpenTransport: () => void;
  onOpenBundle: () => void;
  onOpenTrips: () => void;
  onOpenPacking: () => void;
  onOpenBudget: () => void;
  onOpenReviews: () => void;
  onOpenMemories: () => void;
  onOpenChat: () => void;
  onOpenMyBookings: () => void;
}

export const QuickServicesBar: React.FC<QuickServicesBarProps> = ({
  onOpenFlight,
  onOpenHotel,
  onOpenTransport,
  onOpenBundle,
  onOpenTrips,
  onOpenPacking,
  onOpenBudget,
  onOpenReviews,
  onOpenMemories,
  onOpenChat,
  onOpenMyBookings,
}) => {
  const services = [
    { label: 'Flights', icon: Plane, action: onOpenFlight, highlight: false },
    { label: 'Hotels', icon: Building2, action: onOpenHotel, highlight: false },
    { label: 'Transport', icon: Car, action: onOpenTransport, highlight: false },
    { label: 'Bundles', icon: Layers, action: onOpenBundle, highlight: false },
    { label: 'Workspace', icon: Compass, action: onOpenTrips, highlight: true },
    { label: 'Packing', icon: Briefcase, action: onOpenPacking, highlight: false },
    { label: 'Budget', icon: Wallet, action: onOpenBudget, highlight: false },
    { label: 'Reviews', icon: Star, action: onOpenReviews, highlight: false },
    { label: 'Memories', icon: Camera, action: onOpenMemories, highlight: false },
    { label: 'Assistant', icon: Sparkles, action: onOpenChat, highlight: true },
    { label: 'Bookings', icon: BookmarkCheck, action: onOpenMyBookings, highlight: false },
  ];

  return (
    <div className="quick-services-wrapper">
      <div className="quick-services-bar">
        {services.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className={`service-chip-btn ${item.highlight ? 'accent-chip' : ''}`}
              onClick={item.action}
              aria-label={`Open ${item.label}`}
            >
              <Icon size={15} className="service-chip-icon" />
              <span className="service-chip-text">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickServicesBar;
