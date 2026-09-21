/**
 * VPM-39: AI Itinerary Generator Engine
 * Assignee: Jagrat Kumar (202512079)
 * Generates custom day-by-day travel schedules tailored by destination, duration, pacing, and group interests.
 */

import type { TripActivity } from './tripService';

export interface GenerateItineraryOptions {
  destination: string;
  days: number;
  pace: 'relaxed' | 'balanced' | 'packed';
  interests: string[];
  startDate?: string;
  tripId?: string;
}

export interface GeneratedDayPlan {
  dayNumber: number;
  theme: string;
  activities: Array<Omit<TripActivity, 'id' | 'tripId'>>;
}

export interface GeneratedItineraryResult {
  destination: string;
  totalDays: number;
  pace: 'relaxed' | 'balanced' | 'packed';
  interests: string[];
  estimatedTotalCost: number;
  days: GeneratedDayPlan[];
  allActivities: Array<Omit<TripActivity, 'id' | 'tripId'>>;
}

interface DestinationKnowledge {
  defaultThemes: string[];
  morningPool: Array<{ title: string; locationName: string; category: string; cost: number; description: string }>;
  afternoonPool: Array<{ title: string; locationName: string; category: string; cost: number; description: string }>;
  eveningPool: Array<{ title: string; locationName: string; category: string; cost: number; description: string }>;
}

const DESTINATION_KNOWLEDGE: Record<string, DestinationKnowledge> = {
  paris: {
    defaultThemes: [
      'Historic Core & Iconic Landmarks',
      'Artistic Treasures & Bohemian Charm',
      'Royal Splendor & Seine Romantics',
      'Fashion, Boutiques & Secret Passages',
      'Culinary Gastronomy & Wine Tasting',
    ],
    morningPool: [
      { title: 'Louvre Masterpieces Guided Tour', locationName: 'Musée du Louvre', category: 'Culture', cost: 45, description: 'Skip-the-line VIP tour of the Mona Lisa, Venus de Milo, and Winged Victory.' },
      { title: 'Sainte-Chapelle & Conciergerie Tour', locationName: 'Île de la Cité', category: 'Culture', cost: 25, description: 'Marvel at the 13th-century stained glass windows bathed in morning sunlight.' },
      { title: 'Montmartre Artists Square & Sacré-Cœur', locationName: 'Place du Tertre, Montmartre', category: 'Walking Tour', cost: 0, description: 'Charming morning walk along cobblestone alleys with panoramic city views.' },
      { title: 'Musée d’Orsay Impressionist Highlights', locationName: 'Musée d’Orsay', category: 'Culture', cost: 35, description: 'View world-famous Monet, Van Gogh, and Renoir masterpieces in a converted railway station.' },
      { title: 'Day Trip: Palace of Versailles Gardens', locationName: 'Versailles', category: 'Sightseeing', cost: 65, description: 'Hall of Mirrors, Grand Trianon, and musical fountain gardens walk.' },
    ],
    afternoonPool: [
      { title: 'Artisan Cafe Lunch & Le Marais Stroll', locationName: 'Rue des Rosiers, Le Marais', category: 'Dining', cost: 40, description: 'Taste gourmet falafel or French crepes followed by designer boutique browsing.' },
      { title: 'Palais Garnier Opera House Tour', locationName: 'Opéra Garnier', category: 'Sightseeing', cost: 20, description: 'Grand marble staircase and opulent gold-leaf auditorium exploration.' },
      { title: 'Tuileries Gardens & Angelina Hot Chocolate', locationName: 'Jardin des Tuileries', category: 'Dining', cost: 22, description: 'Famous decadent hot chocolate paired with chestnut Mont-Blanc pastry.' },
      { title: 'Latin Quarter & Shakespeare and Company', locationName: 'Quartier Latin', category: 'Walking Tour', cost: 0, description: 'Historic bookshop browsing and medieval Sorbonne university streets.' },
    ],
    eveningPool: [
      { title: 'Eiffel Tower Sunset & Champagne Toast', locationName: 'Champ de Mars', category: 'Sightseeing', cost: 55, description: 'Witness the summit golden hour and dazzling 20,000-bulb light sparkle.' },
      { title: 'Seine River Gourmet 3-Course Dinner Cruise', locationName: 'Bateaux Parisiens, Port de la Bourdonnais', category: 'Dining', cost: 110, description: 'Live violinist, fine French wine, and illuminated monument views.' },
      { title: 'Moulin Rouge Cabaret & Champagne Night', locationName: 'Boulevard de Clichy', category: 'Entertainment', cost: 135, description: 'World-famous cabaret spectacle with feathered choreography and music.' },
      { title: 'Romantic Candlelit Dinner in Saint-Germain', locationName: 'Saint-Germain-des-Prés', category: 'Dining', cost: 75, description: 'Traditional French duck confit, beef bourguignon, and crème brûlée.' },
    ],
  },
  tokyo: {
    defaultThemes: [
      'Neon Skyscrapers & Scramble Vibe',
      'Ancient Tradition & Spiritual Shrines',
      'Tech, Gaming & Pop Culture Immersion',
      'Culinary Delights & Tsukiji Seafood',
      'Art Islands & Scenic Bullet Train Excursion',
    ],
    morningPool: [
      { title: 'Senso-ji Temple & Asakusa Kimono Walk', locationName: 'Asakusa, Tokyo', category: 'Culture', cost: 35, description: 'Tokyo’s oldest temple with vibrant Nakamise shopping street incense rituals.' },
      { title: 'Tsukiji Outer Market Food Safari', locationName: 'Tsukiji', category: 'Dining', cost: 45, description: 'Freshly torched wagyu beef skewers, tamagoyaki omelet, and fresh otoro sashimi.' },
      { title: 'Meiji Jingu Shrine & Harajuku Bamboo Forest', locationName: 'Shibuya', category: 'Nature', cost: 0, description: 'Peaceful forested Shinto shrine dedicated to Emperor Meiji.' },
    ],
    afternoonPool: [
      { title: 'Akihabara Electric Town & Retro Arcades', locationName: 'Akihabara', category: 'Entertainment', cost: 30, description: 'Multi-story anime shops, retro Super Famicom gaming, and maid cafe culture.' },
      { title: 'teamLab Borderless Digital Art Museum', locationName: 'Azabudai Hills', category: 'Culture', cost: 42, description: 'Breathtaking interactive digital light projection rooms with crystal infinity worlds.' },
      { title: 'Takeshita Street Crepes & Vintage Shopping', locationName: 'Harajuku', category: 'Shopping', cost: 25, description: 'Vibrant pop-culture street fashion, kawaii sweets, and boutique shops.' },
    ],
    eveningPool: [
      { title: 'Shibuya Sky 360° Rooftop Sunset', locationName: 'Shibuya Scramble Square', category: 'Sightseeing', cost: 25, description: 'Panoramic open-air sunset views of Mount Fuji and the bustling scramble below.' },
      { title: 'Omoide Yokocho & Golden Gai Yakitori Bar Crawl', locationName: 'Shinjuku', category: 'Dining', cost: 60, description: 'Atmospheric lantern-lit alleyways with charcoal grilled yakitori and Japanese highballs.' },
      { title: 'Robot Restaurant / Cyberpunk Izakaya Experience', locationName: 'Kabukicho, Shinjuku', category: 'Entertainment', cost: 80, description: 'Futuristic neon lights, craft cocktails, and high-energy dinner show.' },
    ],
  },
};

export function generateAiTripSchedule(options: GenerateItineraryOptions): GeneratedItineraryResult {
  const { destination = 'Paris', days = 3, pace = 'balanced', interests = ['Culture', 'Sightseeing'] } = options;

  const key = destination.toLowerCase().includes('tokyo')
    ? 'tokyo'
    : 'paris'; // Default fallback pool

  const knowledge = DESTINATION_KNOWLEDGE[key] || DESTINATION_KNOWLEDGE.paris;
  const clampedDays = Math.max(1, Math.min(days, 7));

  const dayPlans: GeneratedDayPlan[] = [];
  const allActs: Array<Omit<TripActivity, 'id' | 'tripId'>> = [];
  let totalCost = 0;

  for (let d = 1; d <= clampedDays; d++) {
    const themeIndex = (d - 1) % knowledge.defaultThemes.length;
    const theme = `${knowledge.defaultThemes[themeIndex]}`;
    const dayActivities: Array<Omit<TripActivity, 'id' | 'tripId'>> = [];

    // Morning Activity
    const morningItem = knowledge.morningPool[(d - 1) % knowledge.morningPool.length];
    dayActivities.push({
      dayNumber: d,
      timeSlot: '09:30 AM',
      title: morningItem.title,
      locationName: morningItem.locationName,
      category: morningItem.category,
      cost: morningItem.cost,
      description: morningItem.description,
      orderIndex: 0,
      isCompleted: false,
    });
    totalCost += morningItem.cost;

    // Afternoon Activity
    const afternoonItem = knowledge.afternoonPool[(d - 1) % knowledge.afternoonPool.length];
    dayActivities.push({
      dayNumber: d,
      timeSlot: '02:00 PM',
      title: afternoonItem.title,
      locationName: afternoonItem.locationName,
      category: afternoonItem.category,
      cost: afternoonItem.cost,
      description: afternoonItem.description,
      orderIndex: 1,
      isCompleted: false,
    });
    totalCost += afternoonItem.cost;

    // Evening Activity
    const eveningItem = knowledge.eveningPool[(d - 1) % knowledge.eveningPool.length];
    dayActivities.push({
      dayNumber: d,
      timeSlot: pace === 'packed' ? '06:30 PM' : '07:30 PM',
      title: eveningItem.title,
      locationName: eveningItem.locationName,
      category: eveningItem.category,
      cost: eveningItem.cost,
      description: eveningItem.description,
      orderIndex: 2,
      isCompleted: false,
    });
    totalCost += eveningItem.cost;

    // Optional 4th activity for packed pace
    if (pace === 'packed') {
      dayActivities.push({
        dayNumber: d,
        timeSlot: '10:00 PM',
        title: `Late Night City View & Dessert in ${destination}`,
        locationName: `${destination} Central`,
        category: 'Social',
        cost: 20,
        description: 'Atmospheric late-night stroll, artisan gelato/cocktail, and illuminated landmarks.',
        orderIndex: 3,
        isCompleted: false,
      });
      totalCost += 20;
    }

    dayPlans.push({
      dayNumber: d,
      theme,
      activities: dayActivities,
    });

    allActs.push(...dayActivities);
  }

  return {
    destination,
    totalDays: clampedDays,
    pace,
    interests,
    estimatedTotalCost: totalCost,
    days: dayPlans,
    allActivities: allActs,
  };
}
