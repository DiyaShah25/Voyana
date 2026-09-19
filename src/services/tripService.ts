/**
 * VPM-90: Trip Creation & Itinerary Management Engine
 * Assignee: Megha Lalwani (202512054) <lalwani2406@gmail.com>
 * Provides custom trip creation wizards, curated destination templates,
 * multi-collaborator invitations, and auto-generated initial day schedules.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAlert } from './alertService';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------
export type TripVisibility = 'private' | 'shared' | 'public';
export type TripMemberRole = 'owner' | 'editor' | 'viewer';

export interface TripMember {
  id: string;
  tripId: string;
  userId?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: TripMemberRole;
  joinedAt: string;
}

export interface TripActivity {
  id: string;
  tripId: string;
  dayNumber: number;
  activityDate?: string;
  timeSlot?: string;
  title: string;
  locationName?: string;
  description?: string;
  cost?: number;
  category?: string;
  bookingReference?: string;
  orderIndex: number;
  isCompleted?: boolean;
}

export interface Trip {
  id: string;
  ownerId: string;
  title: string;
  destination: string;
  country?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  description?: string;
  coverImage?: string;
  visibility: TripVisibility;
  budgetTarget: number;
  currency: string;
  tags: string[];
  isTemplate?: boolean;
  createdAt: string;
  updatedAt: string;
  members?: TripMember[];
  activities?: TripActivity[];
}

export interface CreateTripInput {
  title: string;
  destination: string;
  country?: string;
  startDate: string;
  endDate: string;
  description?: string;
  coverImage?: string;
  visibility?: TripVisibility;
  budgetTarget?: number;
  currency?: string;
  tags?: string[];
  invitedEmails?: string[];
  travelStyle?: string;
  autoGenerateSchedule?: boolean;
}

// ---------------------------------------------------------------------------
// Supabase Client Setup
// ---------------------------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch {
    supabase = null;
  }
}

// ---------------------------------------------------------------------------
// Mock Store for Offline / Demo Mode
// ---------------------------------------------------------------------------
const TRIPS_STORAGE_KEY = 'voyana.user_trips';

export const CURATED_TEMPLATES: Trip[] = [
  {
    id: 'tpl-paris-01',
    ownerId: 'system',
    title: 'Parisian Dream: 5 Days in Lights & Art',
    destination: 'Paris',
    country: 'France',
    startDate: '2026-10-15',
    endDate: '2026-10-20',
    description: 'Experience the Louvre, Eiffel Tower sunset champagne, Montmartre art walks, and Seine River gourmet dinner cruise.',
    coverImage: 'https://images.pexels.com/photos/14681748/pexels-photo-14681748.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 2400,
    currency: 'USD',
    tags: ['Romantic', 'Art & Culture', 'Gastronomy'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      { id: 'm-01', tripId: 'tpl-paris-01', name: 'Megha Lalwani', email: 'megha@voyana.com', role: 'owner', joinedAt: new Date().toISOString() },
      { id: 'm-02', tripId: 'tpl-paris-01', name: 'Bhavika Sainani', email: 'bhavika@voyana.com', role: 'editor', joinedAt: new Date().toISOString() },
    ],
    activities: [
      { id: 'act-01', tripId: 'tpl-paris-01', dayNumber: 1, timeSlot: '10:00 AM', title: 'Arrival & Check-in at Hotel Ritz', locationName: 'Place Vendôme', category: 'Hotel', cost: 750, orderIndex: 1 },
      { id: 'act-02', tripId: 'tpl-paris-01', dayNumber: 1, timeSlot: '05:30 PM', title: 'Eiffel Tower Sunset Viewing & Champagne', locationName: 'Champ de Mars', category: 'Sightseeing', cost: 65, orderIndex: 2 },
      { id: 'act-03', tripId: 'tpl-paris-01', dayNumber: 2, timeSlot: '09:30 AM', title: 'Louvre Masterpieces Guided Tour', locationName: 'Musée du Louvre', category: 'Culture', cost: 45, orderIndex: 3 },
      { id: 'act-04', tripId: 'tpl-paris-01', dayNumber: 2, timeSlot: '07:00 PM', title: 'Seine River Gourmet Dinner Cruise', locationName: 'Port de la Bourdonnais', category: 'Dining', cost: 120, orderIndex: 4 },
      { id: 'act-05', tripId: 'tpl-paris-01', dayNumber: 3, timeSlot: '11:00 AM', title: 'Montmartre Artists Square & Sacré-Cœur', locationName: 'Montmartre', category: 'Walking Tour', cost: 0, orderIndex: 5 },
    ],
  },
  {
    id: 'tpl-tokyo-02',
    ownerId: 'system',
    title: 'Tokyo Neon & Tradition: 7-Day Sakura Trail',
    destination: 'Tokyo',
    country: 'Japan',
    startDate: '2026-11-01',
    endDate: '2026-11-08',
    description: 'From Shibuya scramble and Akihabara tech culture to Senso-ji Temple and Shinkansen day trip to Kyoto.',
    coverImage: 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 3200,
    currency: 'USD',
    tags: ['Tech & Anime', 'Heritage', 'Culinary'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      { id: 'm-03', tripId: 'tpl-tokyo-02', name: 'Megha Lalwani', email: 'megha@voyana.com', role: 'owner', joinedAt: new Date().toISOString() },
    ],
    activities: [
      { id: 'act-06', tripId: 'tpl-tokyo-02', dayNumber: 1, timeSlot: '06:00 PM', title: 'Shibuya Crossing & Sky Observatory', locationName: 'Shibuya Sky', category: 'Sightseeing', cost: 25, orderIndex: 1 },
      { id: 'act-07', tripId: 'tpl-tokyo-02', dayNumber: 2, timeSlot: '09:00 AM', title: 'Asakusa Senso-ji Temple & Kimono Walk', locationName: 'Asakusa', category: 'Culture', cost: 35, orderIndex: 2 },
      { id: 'act-08', tripId: 'tpl-tokyo-02', dayNumber: 3, timeSlot: '08:00 AM', title: 'Shinkansen Bullet Train to Kyoto', locationName: 'Tokyo Station', category: 'Transport', cost: 160, orderIndex: 3 },
    ],
  },
  {
    id: 'tpl-dubai-03',
    ownerId: 'system',
    title: 'Dubai Luxury Oasis & Desert Safari: 4 Days',
    destination: 'Dubai',
    country: 'United Arab Emirates',
    startDate: '2026-11-20',
    endDate: '2026-11-24',
    description: 'Burj Khalifa observatory, Palm Jumeirah luxury yacht cruise, and sunset dune bashing with Bedouin feast.',
    coverImage: 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 1950,
    currency: 'USD',
    tags: ['Luxury', 'Adventure', 'Architecture'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      { id: 'm-04', tripId: 'tpl-dubai-03', name: 'Megha Lalwani', email: 'megha@voyana.com', role: 'owner', joinedAt: new Date().toISOString() },
    ],
    activities: [
      { id: 'act-09', tripId: 'tpl-dubai-03', dayNumber: 1, timeSlot: '04:00 PM', title: 'Burj Khalifa At the Top (Level 148)', locationName: 'Downtown Dubai', category: 'Sightseeing', cost: 95, orderIndex: 1 },
      { id: 'act-10', tripId: 'tpl-dubai-03', dayNumber: 2, timeSlot: '03:00 PM', title: 'VIP Desert Safari & 4x4 Dune Bashing', locationName: 'Al Marmoom Desert', category: 'Adventure', cost: 85, orderIndex: 2 },
    ],
  },
];

const INITIAL_USER_TRIPS: Trip[] = [
  {
    id: 'trip-user-01',
    ownerId: 'usr-demo-01',
    title: 'Autumn in Paris & Provence',
    destination: 'Paris',
    country: 'France',
    startDate: '2026-10-12',
    endDate: '2026-10-19',
    description: 'Group getaway with friends exploring Parisian cafes, museums, and vineyard day tours.',
    coverImage: 'https://images.pexels.com/photos/14681748/pexels-photo-14681748.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'shared',
    budgetTarget: 3500,
    currency: 'USD',
    tags: ['Friends Trip', 'Sightseeing', 'Autumn'],
    isTemplate: false,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      { id: 'mb-01', tripId: 'trip-user-01', name: 'Megha Lalwani', email: 'megha@voyana.com', role: 'owner', joinedAt: new Date().toISOString() },
      { id: 'mb-02', tripId: 'trip-user-01', name: 'Bhavika Sainani', email: 'bhavika@example.com', role: 'editor', joinedAt: new Date().toISOString() },
      { id: 'mb-03', tripId: 'trip-user-01', name: 'Diya Shah', email: 'diya@voyana.com', role: 'editor', joinedAt: new Date().toISOString() },
      { id: 'mb-04', tripId: 'trip-user-01', name: 'Jagrat Kumar', email: 'jagrat@voyana.com', role: 'viewer', joinedAt: new Date().toISOString() },
    ],
    activities: [
      { id: 'act-p1', tripId: 'trip-user-01', dayNumber: 1, timeSlot: '02:00 PM', title: 'Hotel Check-in & Freshen Up', locationName: 'Hôtel Ritz Paris', category: 'Accommodation', cost: 750, orderIndex: 1 },
      { id: 'act-p2', tripId: 'trip-user-01', dayNumber: 1, timeSlot: '06:00 PM', title: 'Welcome Drinks at Trocadéro', locationName: 'Trocadéro Square', category: 'Social', cost: 60, orderIndex: 2 },
      { id: 'act-p3', tripId: 'trip-user-01', dayNumber: 2, timeSlot: '10:00 AM', title: 'Louvre Guided Group Tour', locationName: 'Musée du Louvre', category: 'Culture', cost: 140, orderIndex: 3 },
      { id: 'act-p4', tripId: 'trip-user-01', dayNumber: 2, timeSlot: '07:30 PM', title: 'Group Dinner at Le Marais', locationName: 'Le Marais Bistro', category: 'Dining', cost: 180, orderIndex: 4 },
      { id: 'act-p5', tripId: 'trip-user-01', dayNumber: 3, timeSlot: '09:00 AM', title: 'Day Trip: Palace of Versailles', locationName: 'Versailles', category: 'Excursion', cost: 90, orderIndex: 5 },
    ],
  },
];

export function getStoredTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(TRIPS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(INITIAL_USER_TRIPS));
      return INITIAL_USER_TRIPS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_USER_TRIPS;
  }
}

export function saveStoredTrips(trips: Trip[]) {
  try {
    localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
  } catch (err) {
    console.error('Failed to save trips in localStorage', err);
  }
}

// ---------------------------------------------------------------------------
// 1. Fetch User Trips (getUserTrips)
// ---------------------------------------------------------------------------
export async function getUserTrips(userId: string = 'usr-demo-01'): Promise<Trip[]> {
  if (supabase) {
    try {
      const { data: trips, error } = await supabase
        .from('trips')
        .select(`
          *,
          trip_members (*),
          trip_activities (*)
        `)
        .eq('is_template', false)
        .order('created_at', { ascending: false });

      if (!error && trips && trips.length > 0) {
        return trips.map((t: any) => ({
          id: t.id,
          ownerId: t.owner_id,
          title: t.title,
          destination: t.destination,
          country: t.country,
          startDate: t.start_date,
          endDate: t.end_date,
          description: t.description,
          coverImage: t.cover_image,
          visibility: t.visibility,
          budgetTarget: Number(t.budget_target || 0),
          currency: t.currency || 'USD',
          tags: t.tags || [],
          isTemplate: t.is_template,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          members: t.trip_members?.map((m: any) => ({
            id: m.id,
            tripId: m.trip_id,
            name: m.name || m.email.split('@')[0],
            email: m.email,
            avatarUrl: m.avatar_url,
            role: m.role,
            joinedAt: m.joined_at,
          })),
          activities: t.trip_activities?.map((a: any) => ({
            id: a.id,
            tripId: a.trip_id,
            dayNumber: a.day_number,
            timeSlot: a.time_slot,
            title: a.title,
            locationName: a.location_name,
            description: a.description,
            cost: Number(a.cost || 0),
            category: a.category,
            orderIndex: a.order_index,
          })),
        }));
      }
    } catch (err) {
      console.warn('[TripService] Supabase query fallback to local store:', err);
    }
  }

  return getStoredTrips();
}

// ---------------------------------------------------------------------------
// 2. Fetch Curated Templates
// ---------------------------------------------------------------------------
export async function getTripTemplates(): Promise<Trip[]> {
  return CURATED_TEMPLATES;
}

// ---------------------------------------------------------------------------
// 3. Create Custom Trip (createTrip)
// ---------------------------------------------------------------------------
export async function createTrip(
  input: CreateTripInput,
  userId: string = 'usr-demo-01',
  ownerName: string = 'Megha Lalwani',
  ownerEmail: string = 'megha@voyana.com'
): Promise<{ success: boolean; trip?: Trip; error?: string }> {
  const newTripId = `trip-${Date.now()}`;
  
  // Build Initial Members
  const initialMembers: TripMember[] = [
    {
      id: `mb-${Date.now()}-1`,
      tripId: newTripId,
      userId,
      name: ownerName,
      email: ownerEmail,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    },
  ];

  if (input.invitedEmails && input.invitedEmails.length > 0) {
    input.invitedEmails.forEach((email, idx) => {
      const clean = email.trim();
      if (clean && clean !== ownerEmail) {
        initialMembers.push({
          id: `mb-${Date.now()}-${idx + 2}`,
          tripId: newTripId,
          name: clean.split('@')[0],
          email: clean,
          role: 'editor',
          joinedAt: new Date().toISOString(),
        });
      }
    });
  }

  // Auto-generate initial activities if requested
  const initialActivities: TripActivity[] = [];
  if (input.autoGenerateSchedule !== false) {
    initialActivities.push(
      {
        id: `act-gen-1`,
        tripId: newTripId,
        dayNumber: 1,
        timeSlot: '02:00 PM',
        title: `Arrival & Hotel Check-in in ${input.destination}`,
        locationName: input.destination,
        category: 'Transport',
        cost: 0,
        orderIndex: 0,
      },
      {
        id: `act-gen-2`,
        tripId: newTripId,
        dayNumber: 1,
        timeSlot: '07:00 PM',
        title: `Welcome Dinner & Local Cuisine Exploration`,
        locationName: `${input.destination} Downtown`,
        category: 'Dining',
        cost: 60,
        orderIndex: 1,
      },
      {
        id: `act-gen-3`,
        tripId: newTripId,
        dayNumber: 2,
        timeSlot: '10:00 AM',
        title: `Historic City Highlights & Sightseeing Tour`,
        locationName: input.destination,
        category: 'Sightseeing',
        cost: 45,
        orderIndex: 0,
      }
    );
  }

  const tags = input.tags || [];
  if (input.travelStyle && !tags.includes(input.travelStyle)) {
    tags.push(input.travelStyle);
  }

  const newTrip: Trip = {
    id: newTripId,
    ownerId: userId,
    title: input.title,
    destination: input.destination,
    country: input.country,
    startDate: input.startDate,
    endDate: input.endDate,
    description: input.description,
    coverImage: input.coverImage || 'https://images.pexels.com/photos/14681748/pexels-photo-14681748.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: input.visibility || 'shared',
    budgetTarget: input.budgetTarget || 2000,
    currency: input.currency || 'USD',
    tags: tags.length > 0 ? tags : ['Custom Trip'],
    isTemplate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: initialMembers,
    activities: initialActivities,
  };

  // 1. Supabase Persistence
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .insert([{
          owner_id: userId.length === 36 ? userId : '00000000-0000-0000-0000-000000000000',
          title: input.title,
          destination: input.destination,
          country: input.country,
          start_date: input.startDate,
          end_date: input.endDate,
          description: input.description,
          cover_image: newTrip.coverImage,
          visibility: newTrip.visibility,
          budget_target: newTrip.budgetTarget,
          currency: newTrip.currency,
          tags: newTrip.tags,
          is_template: false,
        }])
        .select()
        .single();

      if (!error && data) {
        newTrip.id = data.id;
        await supabase.from('trip_members').insert([{
          trip_id: data.id,
          email: ownerEmail,
          name: ownerName,
          role: 'owner',
        }]);
      }
    } catch (err) {
      console.warn('[TripService] Supabase creation error:', err);
    }
  }

  // 2. Local Storage Sync
  const currentTrips = getStoredTrips();
  currentTrips.unshift(newTrip);
  saveStoredTrips(currentTrips);

  // 3. Trigger Alert
  await createAlert({
    user_id: userId,
    booking_id: newTrip.id,
    booking_reference: `TRP-${newTrip.destination.substring(0, 3).toUpperCase()}`,
    booking_type: 'package',
    title: `Trip Workspace Created: ${newTrip.title}`,
    message: `Your trip workspace for ${newTrip.destination} (${newTrip.startDate} to ${newTrip.endDate}) is ready for collaboration.`,
    severity: 'success',
    old_status: 'pending',
    new_status: 'confirmed',
  });

  return { success: true, trip: newTrip };
}

// ---------------------------------------------------------------------------
// 4. Clone Template Trip (cloneTripTemplate)
// ---------------------------------------------------------------------------
export async function cloneTripTemplate(
  templateId: string,
  userId: string = 'usr-demo-01',
  userName: string = 'Megha Lalwani',
  userEmail: string = 'megha@voyana.com'
): Promise<{ success: boolean; trip?: Trip; error?: string }> {
  const template = CURATED_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return { success: false, error: 'Template not found' };

  const newTripId = `trip-cloned-${Date.now()}`;
  const cloned: Trip = {
    ...JSON.parse(JSON.stringify(template)),
    id: newTripId,
    ownerId: userId,
    title: `${template.title} (My Trip)`,
    isTemplate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      {
        id: `mb-clone-${Date.now()}`,
        tripId: newTripId,
        userId,
        name: userName,
        email: userEmail,
        role: 'owner',
        joinedAt: new Date().toISOString(),
      },
    ],
  };

  const list = getStoredTrips();
  list.unshift(cloned);
  saveStoredTrips(list);

  await createAlert({
    user_id: userId,
    booking_id: newTripId,
    booking_reference: `TPL-${template.destination.substring(0, 3).toUpperCase()}`,
    booking_type: 'package',
    title: `Template Cloned: ${template.destination}`,
    message: `Successfully cloned "${template.title}" into your personal workspace with pre-populated itinerary and day schedules.`,
    severity: 'success',
    old_status: 'pending',
    new_status: 'confirmed',
  });

  return { success: true, trip: cloned };
}

// ---------------------------------------------------------------------------
// 5. Add Member to Trip
// ---------------------------------------------------------------------------
export async function addTripMember(
  tripId: string,
  email: string,
  role: TripMemberRole = 'editor',
  name?: string
): Promise<{ success: boolean; member?: TripMember; error?: string }> {
  const list = getStoredTrips();
  const trip = list.find((t) => t.id === tripId);
  if (!trip) return { success: false, error: 'Trip not found' };

  if (!trip.members) trip.members = [];
  const existing = trip.members.find((m) => m.email.toLowerCase() === email.toLowerCase());
  if (existing) return { success: false, error: 'Member already in trip' };

  const newMember: TripMember = {
    id: `mb-${Date.now()}`,
    tripId,
    name: name || email.split('@')[0],
    email,
    role,
    joinedAt: new Date().toISOString(),
  };

  trip.members.push(newMember);
  saveStoredTrips(list);

  return { success: true, member: newMember };
}

// ---------------------------------------------------------------------------
// 6. Delete Trip
// ---------------------------------------------------------------------------
export async function deleteTrip(tripId: string): Promise<{ success: boolean }> {
  const list = getStoredTrips();
  const filtered = list.filter((t) => t.id !== tripId);
  saveStoredTrips(filtered);

  if (supabase) {
    try {
      await supabase.from('trips').delete().eq('id', tripId);
    } catch {}
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// 7. Trip Sharing & Public Invite Links (VPM-4 / VPM-8)
// ---------------------------------------------------------------------------
export function generateShareLink(tripId: string, role: TripMemberRole = 'editor'): string {
  const origin = window.location.origin;
  const token = btoa(`${tripId}:${role}:${Date.now()}`);
  return `${origin}/#trip-share?tripId=${encodeURIComponent(tripId)}&role=${role}&token=${token}`;
}

export async function getPublicTripById(tripId: string): Promise<Trip | undefined> {
  const list = getStoredTrips();
  return list.find((t) => t.id === tripId);
}

export async function updateTripVisibility(
  tripId: string,
  visibility: TripVisibility
): Promise<{ success: boolean; trip?: Trip }> {
  const list = getStoredTrips();
  const target = list.find((t) => t.id === tripId);
  if (!target) return { success: false };

  target.visibility = visibility;
  target.updatedAt = new Date().toISOString();
  saveStoredTrips(list);

  if (supabase) {
    try {
      await supabase.from('trips').update({ visibility }).eq('id', tripId);
    } catch {}
  }

  return { success: true, trip: target };
}

// ---------------------------------------------------------------------------
// 8. Trip Activity Management & Dynamic Builder (VPM-4)
// ---------------------------------------------------------------------------
export async function addTripActivity(
  tripId: string,
  activityInput: Omit<TripActivity, 'id' | 'tripId' | 'orderIndex'>
): Promise<{ success: boolean; activity?: TripActivity; error?: string }> {
  const list = getStoredTrips();
  const trip = list.find((t) => t.id === tripId);
  if (!trip) return { success: false, error: 'Trip not found' };

  if (!trip.activities) trip.activities = [];

  const dayActivities = trip.activities.filter((a) => a.dayNumber === activityInput.dayNumber);
  const nextOrderIndex = dayActivities.length > 0 ? Math.max(...dayActivities.map((a) => a.orderIndex)) + 1 : 0;

  const newActivity: TripActivity = {
    id: `act-${Date.now()}`,
    tripId,
    orderIndex: nextOrderIndex,
    isCompleted: false,
    ...activityInput,
  };

  trip.activities.push(newActivity);
  trip.updatedAt = new Date().toISOString();
  saveStoredTrips(list);

  if (supabase) {
    try {
      await supabase.from('trip_activities').insert({
        id: newActivity.id,
        trip_id: tripId,
        day_number: newActivity.dayNumber,
        activity_date: newActivity.activityDate,
        time_slot: newActivity.timeSlot,
        title: newActivity.title,
        location_name: newActivity.locationName,
        description: newActivity.description,
        cost: newActivity.cost,
        category: newActivity.category,
        booking_reference: newActivity.bookingReference,
        order_index: newActivity.orderIndex,
      });
    } catch {}
  }

  return { success: true, activity: newActivity };
}

export async function updateTripActivity(
  tripId: string,
  activityId: string,
  updates: Partial<Omit<TripActivity, 'id' | 'tripId'>>
): Promise<{ success: boolean; activity?: TripActivity; error?: string }> {
  const list = getStoredTrips();
  const trip = list.find((t) => t.id === tripId);
  if (!trip || !trip.activities) return { success: false, error: 'Trip not found' };

  const act = trip.activities.find((a) => a.id === activityId);
  if (!act) return { success: false, error: 'Activity not found' };

  Object.assign(act, updates);
  trip.updatedAt = new Date().toISOString();
  saveStoredTrips(list);

  return { success: true, activity: act };
}

export async function toggleActivityCompleted(
  tripId: string,
  activityId: string
): Promise<{ success: boolean; isCompleted?: boolean }> {
  const list = getStoredTrips();
  const trip = list.find((t) => t.id === tripId);
  if (!trip || !trip.activities) return { success: false };

  const act = trip.activities.find((a) => a.id === activityId);
  if (!act) return { success: false };

  act.isCompleted = !act.isCompleted;
  trip.updatedAt = new Date().toISOString();
  saveStoredTrips(list);

  return { success: true, isCompleted: act.isCompleted };
}

export async function deleteTripActivity(
  tripId: string,
  activityId: string
): Promise<{ success: boolean; error?: string }> {
  const list = getStoredTrips();
  const trip = list.find((t) => t.id === tripId);
  if (!trip || !trip.activities) return { success: false, error: 'Trip not found' };

  trip.activities = trip.activities.filter((a) => a.id !== activityId);
  trip.updatedAt = new Date().toISOString();
  saveStoredTrips(list);

  if (supabase) {
    try {
      await supabase.from('trip_activities').delete().eq('id', activityId);
    } catch {}
  }

  return { success: true };
}

export async function reorderTripActivities(
  tripId: string,
  dayNumber: number,
  reorderedActivities: TripActivity[]
): Promise<{ success: boolean }> {
  const list = getStoredTrips();
  const trip = list.find((t) => t.id === tripId);
  if (!trip || !trip.activities) return { success: false };

  // Keep other days untouched
  const otherActivities = trip.activities.filter((a) => a.dayNumber !== dayNumber);
  // Re-index updated day
  const updatedDay = reorderedActivities.map((act, idx) => ({
    ...act,
    orderIndex: idx,
    dayNumber,
  }));

  trip.activities = [...otherActivities, ...updatedDay];
  trip.updatedAt = new Date().toISOString();
  saveStoredTrips(list);

  return { success: true };
}

export interface TripBudgetAnalysis {
  budgetTarget: number;
  totalActivitiesCost: number;
  totalExpensesCost: number;
  remainingBudget: number;
  percentUsed: number;
  isOverBudget: boolean;
  categoryBreakdown: Record<string, number>;
}

export function calculateTripBudget(
  budgetTarget: number,
  activities: TripActivity[] = [],
  expensesTotal: number = 0
): TripBudgetAnalysis {
  const totalActivitiesCost = activities.reduce((sum, act) => sum + (act.cost || 0), 0);
  const totalSpent = Math.max(totalActivitiesCost, expensesTotal);
  const remainingBudget = budgetTarget - totalSpent;
  const percentUsed = budgetTarget > 0 ? Math.round((totalSpent / budgetTarget) * 100) : 0;

  const categoryBreakdown: Record<string, number> = {};
  for (const act of activities) {
    const cat = act.category || 'Sightseeing';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (act.cost || 0);
  }

  return {
    budgetTarget,
    totalActivitiesCost,
    totalExpensesCost: expensesTotal,
    remainingBudget,
    percentUsed,
    isOverBudget: remainingBudget < 0,
    categoryBreakdown,
  };
}

