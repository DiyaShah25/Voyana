/**
 * Trip Creation & Itinerary Management Engine
 * Provides custom trip creation wizards, curated destination templates,
 * multi-collaborator invitations, and auto-generated initial day schedules.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAlert } from './alertService';
import { apiRequest } from './apiClient';

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
      { id: 'm-01', tripId: 'tpl-paris-01', name: 'Alex Morgan', email: 'traveler@voyana.com', role: 'owner', joinedAt: new Date().toISOString() },
      { id: 'm-02', tripId: 'tpl-paris-01', name: 'Diya Shah', email: 'diya@voyana.com', role: 'editor', joinedAt: new Date().toISOString() },
      { id: 'm-03', tripId: 'tpl-paris-01', name: 'Bhavika Sainani', email: 'bhavika@voyana.com', role: 'viewer', joinedAt: new Date().toISOString() },
    ],
    activities: [
      { id: 'act-01', tripId: 'tpl-paris-01', dayNumber: 1, timeSlot: '11:30 AM', title: 'Arrival & Private Chauffeur to Place Vendôme', locationName: 'Place Vendôme', category: 'Transport', cost: 135, orderIndex: 1 },
      { id: 'act-02', tripId: 'tpl-paris-01', dayNumber: 1, timeSlot: '05:30 PM', title: 'Eiffel Tower Sunset Viewing & Champagne at Le Jules Verne', locationName: 'Champ de Mars', category: 'Sightseeing', cost: 65, orderIndex: 2 },
      { id: 'act-03', tripId: 'tpl-paris-01', dayNumber: 2, timeSlot: '09:30 AM', title: 'Musée du Louvre Priority Skip-the-Line & Mona Lisa', locationName: 'Musée du Louvre', category: 'Culture', cost: 46.80, orderIndex: 3 },
      { id: 'act-04', tripId: 'tpl-paris-01', dayNumber: 2, timeSlot: '07:30 PM', title: 'Bateaux Parisiens Gourmet 3-Course Seine Dinner Cruise', locationName: 'Port de la Bourdonnais', category: 'Dining', cost: 120, orderIndex: 4 },
      { id: 'act-05', tripId: 'tpl-paris-01', dayNumber: 3, timeSlot: '10:30 AM', title: 'Montmartre Artists Square & Sacré-Cœur Stroll', locationName: 'Montmartre', category: 'Walking Tour', cost: 0, orderIndex: 5 },
      { id: 'act-06', tripId: 'tpl-paris-01', dayNumber: 3, timeSlot: '03:30 PM', title: 'Angelina Paris Afternoon Tea & African Hot Chocolate', locationName: '226 Rue de Rivoli', category: 'Dining', cost: 31.40, orderIndex: 6 },
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
    description: 'From Shibuya Scramble and Akihabara electric town to Asakusa Senso-ji Temple and Shinkansen bullet train to Kyoto.',
    coverImage: 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 3200,
    currency: 'USD',
    tags: ['Tech & Anime', 'Heritage', 'Culinary'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      { id: 'm-04', tripId: 'tpl-tokyo-02', name: 'Jagrat Kumar', email: 'jagrat@voyana.com', role: 'owner', joinedAt: new Date().toISOString() },
      { id: 'm-05', tripId: 'tpl-tokyo-02', name: 'Elena Rostova', email: 'organizer@voyana.com', role: 'editor', joinedAt: new Date().toISOString() },
    ],
    activities: [
      { id: 'act-08', tripId: 'tpl-tokyo-02', dayNumber: 1, timeSlot: '05:30 PM', title: 'Shibuya Sky 360 Observatory at Twilight', locationName: 'Shibuya Scramble Square', category: 'Sightseeing', cost: 28, orderIndex: 1 },
      { id: 'act-09', tripId: 'tpl-tokyo-02', dayNumber: 2, timeSlot: '09:00 AM', title: 'Asakusa Senso-ji Temple & Traditional Kimono Stroll', locationName: 'Asakusa', category: 'Culture', cost: 36.50, orderIndex: 2 },
      { id: 'act-10', tripId: 'tpl-tokyo-02', dayNumber: 2, timeSlot: '01:30 PM', title: 'Tsukiji Outer Market Fresh Nigiri Tasting Walk', locationName: 'Tsukiji Outer Market', category: 'Dining', cost: 32, orderIndex: 3 },
      { id: 'act-11', tripId: 'tpl-tokyo-02', dayNumber: 3, timeSlot: '08:00 AM', title: 'Shinkansen Nozomi Bullet Train to Kyoto', locationName: 'Tokyo Station', category: 'Transport', cost: 162.40, orderIndex: 4 },
      { id: 'act-12', tripId: 'tpl-tokyo-02', dayNumber: 4, timeSlot: '11:00 AM', title: 'TeamLab Planets Immersive Digital Art Museum', locationName: 'Toyosu', category: 'Art & Tech', cost: 45, orderIndex: 5 },
    ],
  },
  {
    id: 'tpl-rome-03',
    ownerId: 'system',
    title: 'Eternal Rome: 6 Days of Classical Antiquity & Culinary Heritage',
    destination: 'Rome',
    country: 'Italy',
    startDate: '2026-10-22',
    endDate: '2026-10-28',
    description: 'Walk through 2,000 years of living history: Colosseum underground, Vatican Sistine Chapel, Pantheon, and Trastevere dining.',
    coverImage: 'https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 2750,
    currency: 'USD',
    tags: ['Classical Antiquity', 'Architecture', 'Italian Cuisine'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      { id: 'm-06', tripId: 'tpl-rome-03', name: 'Diya Shah', email: 'diya@voyana.com', role: 'owner', joinedAt: new Date().toISOString() },
    ],
    activities: [
      { id: 'act-13', tripId: 'tpl-rome-03', dayNumber: 1, timeSlot: '09:30 AM', title: 'Colosseum Gladiator Arena & Roman Forum Underground Tour', locationName: 'Piazza del Colosseo', category: 'Culture', cost: 48.50, orderIndex: 1 },
      { id: 'act-14', tripId: 'tpl-rome-03', dayNumber: 2, timeSlot: '08:00 AM', title: 'Vatican Museums, Sistine Chapel & St. Peter VIP Early Access', locationName: 'Vatican City', category: 'Culture', cost: 54, orderIndex: 2 },
      { id: 'act-15', tripId: 'tpl-rome-03', dayNumber: 2, timeSlot: '07:30 PM', title: 'Trastevere Sunset Food & Wine Tasting with Sommelier', locationName: 'Trastevere', category: 'Dining', cost: 68.50, orderIndex: 3 },
      { id: 'act-16', tripId: 'tpl-rome-03', dayNumber: 3, timeSlot: '03:00 PM', title: 'Borghese Gallery Masterpieces & Gardens', locationName: 'Piazzale Scipione Borghese', category: 'Art', cost: 22, orderIndex: 4 },
    ],
  },
  {
    id: 'tpl-swiss-04',
    ownerId: 'system',
    title: 'Swiss Alpine Panoramas & Glacier Peaks: 5 Days',
    destination: 'Zurich',
    country: 'Switzerland',
    startDate: '2026-11-10',
    endDate: '2026-11-15',
    description: 'Majestic peaks, Gornergrat cogwheel train facing the Matterhorn, Glacier Paradise, and luxury alpine spa in Andermatt.',
    coverImage: 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 3400,
    currency: 'USD',
    tags: ['Alpine & Peaks', 'Luxury Wellness', 'Glacier Scenic'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      { id: 'm-07', tripId: 'tpl-swiss-04', name: 'Bhavika Sainani', email: 'bhavika@voyana.com', role: 'owner', joinedAt: new Date().toISOString() },
    ],
    activities: [
      { id: 'act-18', tripId: 'tpl-swiss-04', dayNumber: 1, timeSlot: '10:00 AM', title: 'Scenic Swiss Rail from Zurich to Andermatt Swiss Alps', locationName: 'Zurich HB', category: 'Transport', cost: 74, orderIndex: 1 },
      { id: 'act-19', tripId: 'tpl-swiss-04', dayNumber: 2, timeSlot: '09:00 AM', title: 'Gornergrat Cogwheel Mountain Railway to Matterhorn Viewpoint', locationName: 'Zermatt', category: 'Sightseeing', cost: 98, orderIndex: 2 },
      { id: 'act-20', tripId: 'tpl-swiss-04', dayNumber: 3, timeSlot: '10:30 AM', title: 'Matterhorn Glacier Paradise Highest Cable Car in Europe (3,883m)', locationName: 'Zermatt Bergbahnen', category: 'Adventure', cost: 124, orderIndex: 3 },
    ],
  },
  {
    id: 'tpl-bali-05',
    ownerId: 'system',
    title: 'Bali Island Sanctuaries & Volcano Sunrise: 7 Days',
    destination: 'Bali',
    country: 'Indonesia',
    startDate: '2026-11-18',
    endDate: '2026-11-25',
    description: 'Emerald Tegallalang rice paddies, Mount Batur sunrise caldera trek, sacred water temples, and Uluwatu cliff sunset.',
    coverImage: 'https://images.pexels.com/photos/2166559/pexels-photo-2166559.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 1850,
    currency: 'USD',
    tags: ['Wellness & Island', 'Spiritual', 'Volcano Adventure'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      { id: 'm-08', tripId: 'tpl-bali-05', name: 'Alex Morgan', email: 'traveler@voyana.com', role: 'owner', joinedAt: new Date().toISOString() },
    ],
    activities: [
      { id: 'act-22', tripId: 'tpl-bali-05', dayNumber: 1, timeSlot: '08:30 AM', title: 'Tegallalang Terraced Rice Field Walk & Giant Jungle Swing', locationName: 'Ubud', category: 'Nature', cost: 22, orderIndex: 1 },
      { id: 'act-23', tripId: 'tpl-bali-05', dayNumber: 2, timeSlot: '03:30 AM', title: 'Mount Batur Sunrise Volcano Guided Hike & Geothermal Breakfast', locationName: 'Kintamani', category: 'Adventure', cost: 48, orderIndex: 2 },
      { id: 'act-24', tripId: 'tpl-bali-05', dayNumber: 3, timeSlot: '05:00 PM', title: 'Uluwatu Sunset Sea Temple & Sacred Kecak Fire Dance', locationName: 'Pecatu', category: 'Culture', cost: 35, orderIndex: 3 },
    ],
  },
  {
    id: 'tpl-santorini-06',
    ownerId: 'system',
    title: 'Santorini Aegean Caldera & Sunset Catamaran: 5 Days',
    destination: 'Santorini',
    country: 'Greece',
    startDate: '2026-10-25',
    endDate: '2026-10-30',
    description: 'Perched in Oia above cobalt Aegean waters: private catamaran sailing, volcanic hot springs, and Greek wine tastings.',
    coverImage: 'https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 2900,
    currency: 'USD',
    tags: ['Coastal Escapes', 'Sailing', 'Cycladic Architecture'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      { id: 'm-09', tripId: 'tpl-santorini-06', name: 'Elena Rostova', email: 'organizer@voyana.com', role: 'owner', joinedAt: new Date().toISOString() },
    ],
    activities: [
      { id: 'act-26', tripId: 'tpl-santorini-06', dayNumber: 1, timeSlot: '02:00 PM', title: 'Semi-Private Luxury Catamaran Caldera Sailing with Barbecue', locationName: 'Amoudi Bay', category: 'Sailing', cost: 145, orderIndex: 1 },
      { id: 'act-27', tripId: 'tpl-santorini-06', dayNumber: 2, timeSlot: '10:00 AM', title: 'Akrotiri Prehistoric Bronze Age City & Red Beach Excursion', locationName: 'Akrotiri', category: 'Culture', cost: 42, orderIndex: 2 },
      { id: 'act-28', tripId: 'tpl-santorini-06', dayNumber: 3, timeSlot: '05:30 PM', title: 'Santo Wines Caldera Cliffside Sunset Tasting Flight', locationName: 'Pyrgos Kallistis', category: 'Dining', cost: 65, orderIndex: 3 },
    ],
  },
  {
    id: 'tpl-dubai-07',
    ownerId: 'system',
    title: 'Dubai Futuristic Marvels & Desert Dunes: 4 Days',
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
    members: [{ id: 'm-08', tripId: 'tpl-dubai-07', name: 'Fatima Al-Maktoum', email: 'fatima.m@voyana.com', role: 'owner', joinedAt: new Date().toISOString() }],
    activities: [
      { id: 'act-29', tripId: 'tpl-dubai-07', dayNumber: 1, timeSlot: '04:00 PM', title: 'Burj Khalifa At the Top (Level 148 Lounge)', locationName: 'Downtown Dubai', category: 'Sightseeing', cost: 115, orderIndex: 1 },
      { id: 'act-30', tripId: 'tpl-dubai-07', dayNumber: 2, timeSlot: '03:00 PM', title: 'VIP Desert Safari & 4x4 Red Dune Bashing with BBQ Dinner', locationName: 'Al Marmoom Desert', category: 'Adventure', cost: 88.50, orderIndex: 2 },
    ],
  },
  {
    id: 'tpl-reykjavik-08',
    ownerId: 'system',
    title: 'Icelandic Aurora & Glacial Wonders: 6 Days',
    destination: 'Reykjavik',
    country: 'Iceland',
    startDate: '2026-11-15',
    endDate: '2026-11-21',
    description: 'Blue Lagoon geothermal waters, Gullfoss waterfall super-jeep tour, Jokulsarlon glacial iceberg lagoon, and aurora hunts.',
    coverImage: 'https://images.pexels.com/photos/1009136/pexels-photo-1009136.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 3100,
    currency: 'EUR',
    tags: ['Alpine & Aurora', 'Glaciers', 'Geothermal'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [{ id: 'm-09', tripId: 'tpl-reykjavik-08', name: 'Lars Lindqvist', email: 'lars.l@voyana.com', role: 'owner', joinedAt: new Date().toISOString() }],
    activities: [
      { id: 'act-31', tripId: 'tpl-reykjavik-08', dayNumber: 1, timeSlot: '02:00 PM', title: 'Blue Lagoon Premium Geothermal Bath & Silica Mask', locationName: 'Grindavík', category: 'Wellness', cost: 98, orderIndex: 1 },
      { id: 'act-32', tripId: 'tpl-reykjavik-08', dayNumber: 2, timeSlot: '08:30 AM', title: 'Golden Circle, Thingvellir & Gullfoss Super-Jeep Tour', locationName: 'Golden Circle', category: 'Adventure', cost: 135, orderIndex: 2 },
    ],
  },
  {
    id: 'tpl-capetown-09',
    ownerId: 'system',
    title: 'Cape Peninsula & Table Mountain Explorer: 5 Days',
    destination: 'Cape Town',
    country: 'South Africa',
    startDate: '2026-12-05',
    endDate: '2026-12-10',
    description: 'Table Mountain revolving cableway, Boulders Beach African penguins, Cape Point collision of two oceans, and wine tram.',
    coverImage: 'https://images.pexels.com/photos/259447/pexels-photo-259447.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 2200,
    currency: 'USD',
    tags: ['Ocean & Peaks', 'Wildlife', 'Coastal Scenery'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [{ id: 'm-10', tripId: 'tpl-capetown-09', name: 'Liam Gallagher', email: 'liam.g@voyana.com', role: 'owner', joinedAt: new Date().toISOString() }],
    activities: [
      { id: 'act-33', tripId: 'tpl-capetown-09', dayNumber: 1, timeSlot: '09:00 AM', title: 'Table Mountain Aerial Cableway & Summit Ridge Hike', locationName: 'Table Mountain', category: 'Sightseeing', cost: 32, orderIndex: 1 },
      { id: 'act-34', tripId: 'tpl-capetown-09', dayNumber: 2, timeSlot: '10:00 AM', title: 'Boulders Beach African Penguin Colony & Cape Point Tour', locationName: 'Simon’s Town', category: 'Wildlife', cost: 45, orderIndex: 2 },
    ],
  },
  {
    id: 'tpl-kyoto-10',
    ownerId: 'system',
    title: 'Kyoto Zen Shrines, Bamboo Groves & Tea Ceremonies: 5 Days',
    destination: 'Kyoto',
    country: 'Japan',
    startDate: '2026-11-04',
    endDate: '2026-11-09',
    description: 'Fushimi Inari 1,000 vermilion torii gates, Arashiyama bamboo forest rickshaw tour, Kinkaku-ji golden pavilion, and Uji matcha.',
    coverImage: 'https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 2600,
    currency: 'USD',
    tags: ['Zen & Nature', 'Heritage', 'Tea Culture'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [{ id: 'm-11', tripId: 'tpl-kyoto-10', name: 'Kenji Sato', email: 'kenji.sato@voyana.com', role: 'owner', joinedAt: new Date().toISOString() }],
    activities: [
      { id: 'act-35', tripId: 'tpl-kyoto-10', dayNumber: 1, timeSlot: '07:00 AM', title: 'Fushimi Inari Early Morning Torii Walk & Mountain Summit', locationName: 'Fushimi Ward', category: 'Culture', cost: 0, orderIndex: 1 },
      { id: 'act-36', tripId: 'tpl-kyoto-10', dayNumber: 2, timeSlot: '10:00 AM', title: 'Arashiyama Bamboo Grove & Tenryu-ji Zen Garden Stroll', locationName: 'Arashiyama', category: 'Nature', cost: 18, orderIndex: 2 },
    ],
  },
  {
    id: 'tpl-newyork-11',
    ownerId: 'system',
    title: 'Manhattan Skyline, Broadway & Art Institutions: 5 Days',
    destination: 'New York',
    country: 'United States',
    startDate: '2026-10-18',
    endDate: '2026-10-23',
    description: 'Summit One Vanderbilt glass observatory, Central Park foliage walk, Met Fifth Avenue, and Broadway Hamilton show.',
    coverImage: 'https://images.pexels.com/photos/802024/pexels-photo-802024.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 2800,
    currency: 'USD',
    tags: ['Urban & Modern', 'Broadway', 'Art & Culture'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [{ id: 'm-12', tripId: 'tpl-newyork-11', name: 'Diya Shah', email: 'diya@voyana.com', role: 'owner', joinedAt: new Date().toISOString() }],
    activities: [
      { id: 'act-37', tripId: 'tpl-newyork-11', dayNumber: 1, timeSlot: '04:30 PM', title: 'Summit One Vanderbilt Twilight Immersive Glass Floor', locationName: 'Grand Central', category: 'Sightseeing', cost: 42, orderIndex: 1 },
      { id: 'act-38', tripId: 'tpl-newyork-11', dayNumber: 2, timeSlot: '07:30 PM', title: 'Broadway Musical Evening (Orchestra Center Seating)', locationName: 'Times Square', category: 'Entertainment', cost: 195, orderIndex: 2 },
    ],
  },
  {
    id: 'tpl-barcelona-12',
    ownerId: 'system',
    title: 'Gaudí Masterpieces, Gothic Quarter & Tapas: 5 Days',
    destination: 'Barcelona',
    country: 'Spain',
    startDate: '2026-11-08',
    endDate: '2026-11-13',
    description: 'Basílica de la Sagrada Família tower elevator, Park Güell mosaics, El Born tapas crawl, and sunset sailing on the Mediterranean.',
    coverImage: 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 2300,
    currency: 'EUR',
    tags: ['Architecture', 'Gastronomy', 'Mediterranean Coast'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [{ id: 'm-13', tripId: 'tpl-barcelona-12', name: 'Elena Rostova', email: 'organizer@voyana.com', role: 'owner', joinedAt: new Date().toISOString() }],
    activities: [
      { id: 'act-39', tripId: 'tpl-barcelona-12', dayNumber: 1, timeSlot: '10:00 AM', title: 'Sagrada Família Fast Track & Nativity Tower Panoramic Climb', locationName: 'Eixample', category: 'Culture', cost: 36, orderIndex: 1 },
      { id: 'act-40', tripId: 'tpl-barcelona-12', dayNumber: 2, timeSlot: '06:00 PM', title: 'El Born & Gothic Quarter Artisan Tapas & Cava Walking Tour', locationName: 'Gothic Quarter', category: 'Dining', cost: 65, orderIndex: 2 },
    ],
  },
  {
    id: 'tpl-london-13',
    ownerId: 'system',
    title: 'Royal Heritage, West End & Thames Landmarks: 5 Days',
    destination: 'London',
    country: 'United Kingdom',
    startDate: '2026-10-28',
    endDate: '2026-11-02',
    description: 'Tower of London Crown Jewels, British Museum antiquity galleries, Westminster Abbey, and West End theatre evening.',
    coverImage: 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 2650,
    currency: 'GBP',
    tags: ['Royal Heritage', 'Theatre', 'Historic Britain'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [{ id: 'm-14', tripId: 'tpl-london-13', name: 'Charlotte Wright', email: 'charlotte.w@voyana.com', role: 'owner', joinedAt: new Date().toISOString() }],
    activities: [
      { id: 'act-41', tripId: 'tpl-london-13', dayNumber: 1, timeSlot: '10:00 AM', title: 'Tower of London Early Entry & Crown Jewels Exhibition', locationName: 'Tower Hill', category: 'Culture', cost: 34, orderIndex: 1 },
      { id: 'act-42', tripId: 'tpl-london-13', dayNumber: 2, timeSlot: '07:30 PM', title: 'West End Theatre Stalls Evening Performance', locationName: 'Covent Garden', category: 'Entertainment', cost: 95, orderIndex: 2 },
    ],
  },
  {
    id: 'tpl-cairo-14',
    ownerId: 'system',
    title: 'Pyramids of Giza, Nile River & Antiquities: 5 Days',
    destination: 'Cairo',
    country: 'Egypt',
    startDate: '2026-11-22',
    endDate: '2026-11-27',
    description: 'The Great Pyramids of Giza, Great Sphinx, Grand Egyptian Museum King Tut treasures, and sunset private felucca on the Nile.',
    coverImage: 'https://images.pexels.com/photos/71241/pexels-photo-71241.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 1750,
    currency: 'USD',
    tags: ['Ancient Wonders', 'Nile Cruise', 'Archaeology'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [{ id: 'm-15', tripId: 'tpl-cairo-14', name: 'Anya Sharma', email: 'anya.sharma@voyana.com', role: 'owner', joinedAt: new Date().toISOString() }],
    activities: [
      { id: 'act-43', tripId: 'tpl-cairo-14', dayNumber: 1, timeSlot: '08:30 AM', title: 'Great Pyramids of Giza & Sphinx Private Egyptologist Tour', locationName: 'Giza Plateau', category: 'Culture', cost: 55, orderIndex: 1 },
      { id: 'act-44', tripId: 'tpl-cairo-14', dayNumber: 2, timeSlot: '05:00 PM', title: 'Traditional Nile Wooden Felucca Sunset Sailing', locationName: 'Zamalek', category: 'Sailing', cost: 25, orderIndex: 2 },
    ],
  },
  {
    id: 'tpl-amalfi-15',
    ownerId: 'system',
    title: 'Amalfi Cliffside Villages & Capri Coastal Cruise: 5 Days',
    destination: 'Amalfi',
    country: 'Italy',
    startDate: '2026-10-14',
    endDate: '2026-10-19',
    description: 'Pastel cliffside villas in Positano, Path of the Gods panoramic hike, Ravello gardens, and private gozzo boat around Capri.',
    coverImage: 'https://images.pexels.com/photos/2087391/pexels-photo-2087391.jpeg?auto=compress&cs=tinysrgb&w=800',
    visibility: 'public',
    budgetTarget: 3100,
    currency: 'EUR',
    tags: ['Coastal Escapes', 'Italian Riviera', 'Sailing'],
    isTemplate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [{ id: 'm-16', tripId: 'tpl-amalfi-15', name: 'Marco Bellini', email: 'marco.bellini@voyana.com', role: 'owner', joinedAt: new Date().toISOString() }],
    activities: [
      { id: 'act-45', tripId: 'tpl-amalfi-15', dayNumber: 1, timeSlot: '10:00 AM', title: 'Private Gozzo Boat Coastal Excursion around Capri Faraglioni', locationName: 'Marina Grande Capri', category: 'Sailing', cost: 175, orderIndex: 1 },
      { id: 'act-46', tripId: 'tpl-amalfi-15', dayNumber: 2, timeSlot: '08:00 AM', title: 'Sentiero degli Dei (Path of the Gods) Guided Ridge Trek', locationName: 'Bomerano', category: 'Adventure', cost: 40, orderIndex: 2 },
    ],
  },
];

const INITIAL_USER_TRIPS: Trip[] = [
  {
    id: 'trip-user-01',
    ownerId: 'usr-traveler-03',
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
      { id: 'mb-01', tripId: 'trip-user-01', name: 'Alex Morgan', email: 'traveler@voyana.com', role: 'owner', joinedAt: new Date().toISOString() },
      { id: 'mb-02', tripId: 'trip-user-01', name: 'Diya Shah', email: 'diya@voyana.com', role: 'editor', joinedAt: new Date().toISOString() },
      { id: 'mb-03', tripId: 'trip-user-01', name: 'Bhavika Sainani', email: 'bhavika@voyana.com', role: 'editor', joinedAt: new Date().toISOString() },
      { id: 'mb-04', tripId: 'trip-user-01', name: 'Jagrat Kumar', email: 'jagrat@voyana.com', role: 'viewer', joinedAt: new Date().toISOString() },
    ],
    activities: [
      { id: 'act-p1', tripId: 'trip-user-01', dayNumber: 1, timeSlot: '02:00 PM', title: 'Hotel Check-in & Welcome Espresso', locationName: 'Hôtel Ritz Paris', category: 'Accommodation', cost: 1280, orderIndex: 1 },
      { id: 'act-p2', tripId: 'trip-user-01', dayNumber: 1, timeSlot: '06:00 PM', title: 'Welcome Drinks at Trocadéro', locationName: 'Trocadéro Square', category: 'Social', cost: 60, orderIndex: 2 },
      { id: 'act-p3', tripId: 'trip-user-01', dayNumber: 2, timeSlot: '10:00 AM', title: 'Louvre Guided Group Tour', locationName: 'Musée du Louvre', category: 'Culture', cost: 140.40, orderIndex: 3 },
      { id: 'act-p4', tripId: 'trip-user-01', dayNumber: 2, timeSlot: '07:30 PM', title: 'Group Dinner at Le Comptoir du Relais', locationName: 'Le Marais Bistro', category: 'Dining', cost: 168.50, orderIndex: 4 },
      { id: 'act-p5', tripId: 'trip-user-01', dayNumber: 3, timeSlot: '09:00 AM', title: 'Day Trip: Palace of Versailles', locationName: 'Versailles', category: 'Excursion', cost: 58.20, orderIndex: 5 },
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
  // 1. Fetch from shared MongoDB Atlas backend
  try {
    const apiRes = await apiRequest<{ ok: boolean; trips: Trip[] }>('/api/trips');
    if (apiRes.ok && apiRes.data?.trips) {
      saveStoredTrips(apiRes.data.trips);
      return apiRes.data.trips;
    }
  } catch {
    // Fall through to other data sources
  }

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
  try {
    const apiRes = await apiRequest<{ ok: boolean; trips: Trip[] }>('/api/trips?templateOnly=true');
    if (apiRes.ok && apiRes.data?.trips && apiRes.data.trips.length > 0) {
      return apiRes.data.trips;
    }
  } catch {}
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

  // 1. Shared MongoDB Atlas Backend Persistence
  try {
    const apiRes = await apiRequest<{ ok: boolean; trip: Trip }>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(newTrip),
    });
    if (apiRes.ok && apiRes.data?.trip) {
      newTrip.id = apiRes.data.trip.id;
    }
  } catch (apiErr) {
    console.warn('[TripService] MongoDB Atlas sync error:', apiErr);
  }

  // 2. Supabase Persistence
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

  // Shared MongoDB Atlas Backend deletion
  try {
    await apiRequest(`/api/trips/${encodeURIComponent(tripId)}`, { method: 'DELETE' });
  } catch {}

  if (supabase) {
    try {
      await supabase.from('trips').delete().eq('id', tripId);
    } catch {}
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// 7. Trip Sharing & Public Invite Links
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
// 8. Trip Activity Management & Dynamic Builder
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

  // Shared MongoDB Atlas Backend activity insert
  try {
    await apiRequest(`/api/trips/${encodeURIComponent(tripId)}/activities`, {
      method: 'POST',
      body: JSON.stringify(newActivity),
    });
  } catch {}

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

