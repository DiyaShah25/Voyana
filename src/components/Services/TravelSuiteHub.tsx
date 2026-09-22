import React from 'react';
import {
  Compass,
  Sparkles,
  Briefcase,
  Wallet,
  Star,
  Camera,
  ArrowRight,
  CheckCircle2,
  Users,
  ShieldCheck,
} from 'lucide-react';

interface TravelSuiteHubProps {
  onOpenTrips: () => void;
  onOpenChat: () => void;
  onOpenPacking: () => void;
  onOpenBudget: () => void;
  onOpenReviews: () => void;
  onOpenMemories: () => void;
}

export const TravelSuiteHub: React.FC<TravelSuiteHubProps> = ({
  onOpenTrips,
  onOpenChat,
  onOpenPacking,
  onOpenBudget,
  onOpenReviews,
  onOpenMemories,
}) => {
  return (
    <section className="travel-suite-section" id="suite">
      <div className="section-header-centered">
        <div className="section-eyebrow">
          <ShieldCheck size={14} className="text-emerald-700" />
          <span>INTELLIGENT TRAVEL SUITE</span>
        </div>
        <h2 className="section-title">Engineered for seamless global journeys</h2>
        <p className="section-subtitle">
          Everything required to research, organize, split expenses, pack accurately, and capture memories across any continent.
        </p>
      </div>

      <div className="suite-cards-grid">
        {/* Pillar 1: Collaborative Workspace */}
        <div className="suite-feature-card" onClick={onOpenTrips}>
          <div className="suite-icon-box">
            <Compass size={22} className="text-emerald-700" />
          </div>
          <h3 className="suite-card-title">Collaborative Trip Workspaces</h3>
          <p className="suite-card-desc">
            Build shared itineraries with fellow travelers. Real-time voting on activities, day-by-day scheduling, and interactive maps.
          </p>
          <ul className="suite-card-bullets">
            <li><CheckCircle2 size={13} className="text-emerald-700" /> Real-time multi-member editing</li>
            <li><CheckCircle2 size={13} className="text-emerald-700" /> Day-by-day activity timelines</li>
            <li><CheckCircle2 size={13} className="text-emerald-700" /> Activity voting & consensus</li>
          </ul>
          <button type="button" className="suite-card-cta">
            <span>Open Workspaces</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Pillar 2: Travel Assistant */}
        <div className="suite-feature-card" onClick={onOpenChat}>
          <div className="suite-icon-box">
            <Sparkles size={22} className="text-emerald-700" />
          </div>
          <h3 className="suite-card-title">Travel Assistant & Intelligence</h3>
          <p className="suite-card-desc">
            Destination matching, climate analysis, weather forecasts, and tailored logistical advice directly aligned with your travel dates.
          </p>
          <ul className="suite-card-bullets">
            <li><CheckCircle2 size={13} className="text-emerald-700" /> Seasonal weather forecasting</li>
            <li><CheckCircle2 size={13} className="text-emerald-700" /> Match percentage ratings</li>
            <li><CheckCircle2 size={13} className="text-emerald-700" /> 3-day and 7-day custom itineraries</li>
          </ul>
          <button type="button" className="suite-card-cta">
            <span>Launch Assistant</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Pillar 3: Smart Packing List */}
        <div className="suite-feature-card" onClick={onOpenPacking}>
          <div className="suite-icon-box">
            <Briefcase size={22} className="text-emerald-700" />
          </div>
          <h3 className="suite-card-title">Smart Packing & Gear Sync</h3>
          <p className="suite-card-desc">
            Weather-aware packing checklists with item categorization, traveler assignments, and live group completion tracking.
          </p>
          <ul className="suite-card-bullets">
            <li><CheckCircle2 size={13} className="text-emerald-700" /> Category filtering (Clothing, Tech)</li>
            <li><CheckCircle2 size={13} className="text-emerald-700" /> Individual member gear assignments</li>
            <li><CheckCircle2 size={13} className="text-emerald-700" /> Destination weather recommendations</li>
          </ul>
          <button type="button" className="suite-card-cta">
            <span>View Packing List</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Pillar 4: Multi-Currency Budget Planner */}
        <div className="suite-feature-card" onClick={onOpenBudget}>
          <div className="suite-icon-box">
            <Wallet size={22} className="text-emerald-700" />
          </div>
          <h3 className="suite-card-title">Multi-Currency Budget Planner</h3>
          <p className="suite-card-desc">
            Track expenses across global currencies, split group receipts transparently, set spending caps, and analyze burn rates.
          </p>
          <ul className="suite-card-bullets">
            <li><CheckCircle2 size={13} className="text-emerald-700" /> Real-time exchange conversion</li>
            <li><CheckCircle2 size={13} className="text-emerald-700" /> Categorized expense breakdown</li>
            <li><CheckCircle2 size={13} className="text-emerald-700" /> Equal & custom bill splits</li>
          </ul>
          <button type="button" className="suite-card-cta">
            <span>Plan Trip Budget</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Secondary Highlights: Reviews & Memories */}
      <div className="suite-secondary-banner">
        <div className="secondary-banner-col" onClick={onOpenReviews}>
          <div className="secondary-banner-icon">
            <Star size={18} className="text-amber-600" />
          </div>
          <div>
            <h4 className="secondary-banner-title">Verified Traveler Community Reviews</h4>
            <p className="secondary-banner-desc">
              Unbiased reviews, neighborhood safety ratings, and hidden culinary tips from real travelers.
            </p>
          </div>
          <ArrowRight size={16} className="secondary-banner-arrow" />
        </div>

        <div className="secondary-banner-col" onClick={onOpenMemories}>
          <div className="secondary-banner-icon">
            <Camera size={18} className="text-teal-700" />
          </div>
          <div>
            <h4 className="secondary-banner-title">Geo-Tagged Memories Journal</h4>
            <p className="secondary-banner-desc">
              Organize your photo journals, pinned travel coordinates, and collaborative trip albums.
            </p>
          </div>
          <ArrowRight size={16} className="secondary-banner-arrow" />
        </div>
      </div>
    </section>
  );
};

export default TravelSuiteHub;
