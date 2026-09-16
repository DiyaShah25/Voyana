export type GlobeLocationType = 'city' | 'state' | 'country' | 'region' | 'landmark';

export interface GlobeLocation {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
  type: GlobeLocationType;
}

export interface GlobeRoute {
  from: GlobeLocation;
  to: GlobeLocation;
}

export interface VoyanaGlobeHandle {
  focusOnLocation: (latitude: number, longitude: number, type?: GlobeLocationType) => void;
  setMarker: (location?: GlobeLocation) => void;
  reset: () => void;
  pauseRotation: () => void;
  resumeRotation: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export interface VoyanaGlobeProps {
  selectedLocation?: GlobeLocation;
  routes?: GlobeRoute[];
  autoRotate?: boolean;
  onLocationSelect?: (location: GlobeLocation) => void;
  onGlobeReady?: () => void;
}
