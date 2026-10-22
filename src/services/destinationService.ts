/**
 * Destination Service
 * Fetches curated global travel destinations and coordinates from MongoDB Atlas
 * with transparent fallback to local cached definitions.
 */

import { apiRequest } from './apiClient';
import type { DestinationItem } from '@/components/Destinations/DestinationCard';

export const LOCAL_DESTINATIONS_KEY = 'voyana_destinations_cache';

/**
 * Fetches all curated destinations from MongoDB Atlas backend.
 * Falls back to local cached array or provided fallback on network errors.
 */
export async function getDestinations(fallbackList: DestinationItem[] = []): Promise<DestinationItem[]> {
  try {
    const res = await apiRequest<{ ok: boolean; count: number; destinations: DestinationItem[] }>(
      '/api/destinations'
    );

    if (res.ok && res.data?.destinations && res.data.destinations.length > 0) {
      try {
        localStorage.setItem(LOCAL_DESTINATIONS_KEY, JSON.stringify(res.data.destinations));
      } catch {}
      return res.data.destinations;
    }
  } catch (err) {
    console.warn('[DestinationService] Failed to fetch destinations from MongoDB Atlas, using fallback:', err);
  }

  // Fallback to localStorage or default
  try {
    const cached = localStorage.getItem(LOCAL_DESTINATIONS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  return fallbackList;
}

/**
 * Fetches destinations filtered by geographical region from MongoDB Atlas.
 */
export async function getDestinationsByRegion(region: string, fallbackList: DestinationItem[] = []): Promise<DestinationItem[]> {
  try {
    const query = region && region.toLowerCase() !== 'all' ? `?region=${encodeURIComponent(region)}` : '';
    const res = await apiRequest<{ ok: boolean; count: number; destinations: DestinationItem[] }>(
      `/api/destinations${query}`
    );

    if (res.ok && res.data?.destinations && res.data.destinations.length > 0) {
      return res.data.destinations;
    }
  } catch (err) {
    console.warn(`[DestinationService] Failed to fetch region ${region} from MongoDB Atlas:`, err);
  }

  if (region === 'All') return fallbackList;
  return fallbackList.filter((d) => d.region === region);
}
