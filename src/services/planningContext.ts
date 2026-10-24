import type { GlobeLocation } from '@/components/Globe/globe.types';
import type { Trip } from './tripService';

export interface PlanningContext {
  id: string;
  bookingMode?: 'solo' | 'group';
  selected?: boolean;
  location?: GlobeLocation;
  destination: string;
  members: string[];
  budgetTarget: number;
  currency: string;
  trip?: Trip;
}

const KEY = 'voyana.planning_context';

export function getPlanningContext(): PlanningContext {
  try {
    const value = localStorage.getItem(KEY);
    if (value) return JSON.parse(value);
  } catch { /* Use a fresh destination workspace when storage is unavailable. */ }
  return { id: 'draft-unselected', selected: false, destination: '', members: ['Me'], budgetTarget: 150000, currency: 'INR' };
}

export function selectPlanningDestination(destination: string, location?: GlobeLocation): PlanningContext {
  const context: PlanningContext = {
    id: `draft-${encodeURIComponent(destination.trim().toLowerCase())}`,
    destination, selected: true, location, members: ['Me'], budgetTarget: 150000, currency: 'INR',
  };
  localStorage.setItem(KEY, JSON.stringify(context));
  window.dispatchEvent(new CustomEvent('voyana:planning-changed', { detail: context }));
  return context;
}

export function selectPlanningTrip(trip: Trip): PlanningContext {
  const context: PlanningContext = {
    id: trip.id, bookingMode: trip.travelMode, destination: trip.destination, selected: Boolean(trip.destination && trip.destination !== 'Destination undecided'),
    location: getPlanningContext().destination === trip.destination ? getPlanningContext().location : undefined,
    members: trip.members?.map(member => member.name) || ['Me'],
    budgetTarget: trip.budgetTarget, currency: trip.currency, trip,
  };
  localStorage.setItem(KEY, JSON.stringify(context));
  window.dispatchEvent(new CustomEvent('voyana:planning-changed', { detail: context }));
  return context;
}
