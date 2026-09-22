import React from 'react';
import { Compass, Globe2, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="voyana-footer">
      <div className="footer-top">
        <div className="footer-brand-col">
          <div className="footer-logo">
            <div className="brand-logo-mark small">
              <Compass size={16} strokeWidth={2.4} />
            </div>
            <span className="brand-name">VOYANA</span>
          </div>
          <p className="footer-tagline">
            Intelligent travel discovery and collaborative expedition planning designed for intentional explorers, global travelers, and curious minds.
          </p>
          <div className="footer-trust-badge">
            <ShieldCheck size={16} className="text-emerald-700" />
            <span>Real-time Geographic Coordinates & Verified Data</span>
          </div>
        </div>

        <div className="footer-links-grid">
          <div className="footer-col">
            <h4 className="footer-heading">Discovery</h4>
            <ul className="footer-list">
              <li><a href="#top">3D Interactive Earth</a></li>
              <li><a href="#destinations">Curated Destinations</a></li>
              <li><a href="#journeys">Featured Expeditions</a></li>
              <li><a href="#suite">Travel Intelligence Hub</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Services</h4>
            <ul className="footer-list">
              <li><a href="#bookings">Global Flight Search</a></li>
              <li><a href="#bookings">Boutique & Luxury Stays</a></li>
              <li><a href="#bookings">Ground Transfers</a></li>
              <li><a href="#bookings">Unified Bundles</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Smart Tools</h4>
            <ul className="footer-list">
              <li><a href="#suite">AI Travel Co-pilot</a></li>
              <li><a href="#suite">Smart Packing Sync</a></li>
              <li><a href="#suite">Multi-Currency Budget</a></li>
              <li><a href="#suite">Collaborative Workspaces</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Company & Trust</h4>
            <ul className="footer-list">
              <li><a href="#privacy">Privacy & Data Security</a></li>
              <li><a href="#terms">Terms of Expedition</a></li>
              <li><a href="#reviews">Verified Traveler Ratings</a></li>
              <li><a href="#support">Global Support Center</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-left">
          <span>&copy; {new Date().getFullYear()} Voyana Global Travel Technologies. All rights reserved.</span>
          <span className="footer-credit">
            Crafted for seamless world exploration <Heart size={12} className="inline text-rose-500 fill-rose-500 mx-1" />
          </span>
        </div>
        <div className="footer-bottom-right">
          <div className="footer-selector">
            <Globe2 size={14} />
            <span>Global (EN) &bull; USD ($)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
