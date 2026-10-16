/**
 * Globe Type Definitions
 * Declares interfaces for globe locations, travel routes,
 * globe component ref handle, and props for VoyanaGlobe.
 */

// Location classification on the globe
export type GlobeLocationType = 'city' | 'state' | 'country' | 'region' | 'landmark';

// Geographic point with metadata
export interface GlobeLocation {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
  type: GlobeLocationType;
}

// Travel route between two locations
export interface GlobeRoute {
  from: GlobeLocation;
  to: GlobeLocation;
}

// Imperative handle exposed via React ref
export interface VoyanaGlobeHandle {
  focusOnLocation: (latitude: number, longitude: number, type?: GlobeLocationType) => void;
  setMarker: (location?: GlobeLocation) => void;
  reset: () => void;
  pauseRotation: () => void;
  resumeRotation: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

// Props accepted by the VoyanaGlobe component
export interface VoyanaGlobeProps {
  selectedLocation?: GlobeLocation;
  routes?: GlobeRoute[];
  autoRotate?: boolean;
  onLocationSelect?: (location: GlobeLocation) => void;
  onGlobeReady?: () => void;
}
