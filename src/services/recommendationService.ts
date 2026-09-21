/**
 * VPM-40: Destination Recommendation Engine
 * Assignee: Jagrat Kumar (202512079)
 * Intelligent destination discovery, multi-criteria filtering, and recommendation scoring.
 */

export interface RecommendedDestination {
  id: string;
  name: string;
  country: string;
  continent: 'Europe' | 'Asia' | 'Americas' | 'Africa' | 'Middle East' | 'Oceania';
  vibe: Array<'Romantic' | 'Adventure' | 'Culinary' | 'Culture' | 'Luxury' | 'Nature' | 'Budget Friendly'>;
  budgetTier: '$' | '$$' | '$$$';
  estimatedDailyCostUsd: number;
  bestMonths: string[];
  matchScore: number; // 0 - 100
  coverImage: string;
  tagline: string;
  description: string;
  topHighlights: string[];
  recommendedDays: number;
  safetyScore: number; // 1-10
}

export const DESTINATION_CATALOG: RecommendedDestination[] = [
  {
    id: 'dest-paris',
    name: 'Paris',
    country: 'France',
    continent: 'Europe',
    vibe: ['Romantic', 'Culture', 'Culinary', 'Luxury'],
    budgetTier: '$$$',
    estimatedDailyCostUsd: 195,
    bestMonths: ['April', 'May', 'September', 'October'],
    matchScore: 98,
    coverImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1000&auto=format&fit=crop&q=80',
    tagline: 'The City of Light, Art, & World-Class Gastronomy',
    description: 'Iconic landmarks, Seine dinner cruises, world-class museums like the Louvre, and charming bohemian cafes in Montmartre.',
    topHighlights: ['Eiffel Tower Sunset', 'Musée du Louvre', 'Montmartre & Sacré-Cœur', 'Seine River Cruise'],
    recommendedDays: 5,
    safetyScore: 9,
  },
  {
    id: 'dest-tokyo',
    name: 'Tokyo',
    country: 'Japan',
    continent: 'Asia',
    vibe: ['Culture', 'Culinary', 'Adventure', 'Luxury'],
    budgetTier: '$$',
    estimatedDailyCostUsd: 160,
    bestMonths: ['March', 'April', 'October', 'November'],
    matchScore: 96,
    coverImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1000&auto=format&fit=crop&q=80',
    tagline: 'Futuristic Innovation Meets Centuries of Tradition',
    description: 'Neon skyscrapers, ancient Shinto shrines, Michelin-starred ramen joints, and electric Akihabara tech culture.',
    topHighlights: ['Shibuya Sky Observatory', 'Senso-ji Temple Asakusa', 'Tsukiji Outer Market', 'Shinjuku Gyoen'],
    recommendedDays: 6,
    safetyScore: 10,
  },
  {
    id: 'dest-bali',
    name: 'Bali',
    country: 'Indonesia',
    continent: 'Asia',
    vibe: ['Nature', 'Romantic', 'Adventure', 'Budget Friendly'],
    budgetTier: '$',
    estimatedDailyCostUsd: 75,
    bestMonths: ['May', 'June', 'July', 'August', 'September'],
    matchScore: 94,
    coverImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1000&auto=format&fit=crop&q=80',
    tagline: 'Island of the Gods, Emerald Rice Terraces & Surf',
    description: 'Lush tropical waterfalls in Ubud, clifftop temples in Uluwatu, vibrant beach clubs, and serene wellness retreats.',
    topHighlights: ['Tegallalang Rice Terraces', 'Uluwatu Sunset Temple', 'Mount Batur Sunrise Trek', 'Nusa Penida Day Trip'],
    recommendedDays: 7,
    safetyScore: 8,
  },
  {
    id: 'dest-rome',
    name: 'Rome',
    country: 'Italy',
    continent: 'Europe',
    vibe: ['Culture', 'Culinary', 'Romantic'],
    budgetTier: '$$',
    estimatedDailyCostUsd: 140,
    bestMonths: ['April', 'May', 'September', 'October', 'November'],
    matchScore: 92,
    coverImage: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1000&auto=format&fit=crop&q=80',
    tagline: 'The Eternal City of Gladiators, Piazzas & Pasta',
    description: 'Walk through 2,000 years of living history with the Colosseum, Vatican Museums, Trevi Fountain, and authentic Trastevere eateries.',
    topHighlights: ['The Colosseum & Forum', 'Vatican City & St. Peter’s', 'Trevi Fountain Coins', 'Trastevere Night Food Tour'],
    recommendedDays: 4,
    safetyScore: 9,
  },
  {
    id: 'dest-dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    continent: 'Middle East',
    vibe: ['Luxury', 'Adventure', 'Culinary'],
    budgetTier: '$$$',
    estimatedDailyCostUsd: 220,
    bestMonths: ['November', 'December', 'January', 'February', 'March'],
    matchScore: 90,
    coverImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1000&auto=format&fit=crop&q=80',
    tagline: 'Glamorous Desert Oasis & Architectural Marvels',
    description: 'World-record skyscrapers, private yacht cruises around Palm Jumeirah, high-speed desert dune safaris, and ultra-luxury shopping.',
    topHighlights: ['Burj Khalifa Observation Deck', 'VIP Desert Safari & BBQ', 'Dubai Mall & Dancing Fountain', 'Dubai Marina Yacht Tour'],
    recommendedDays: 4,
    safetyScore: 10,
  },
  {
    id: 'dest-santorini',
    name: 'Santorini',
    country: 'Greece',
    continent: 'Europe',
    vibe: ['Romantic', 'Luxury', 'Nature'],
    budgetTier: '$$$',
    estimatedDailyCostUsd: 210,
    bestMonths: ['May', 'June', 'September', 'October'],
    matchScore: 95,
    coverImage: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1000&auto=format&fit=crop&q=80',
    tagline: 'Whitewashed Caldera Cliffs & Legendary Aegean Sunsets',
    description: 'Postcard-perfect blue domed churches in Oia, sunset catamaran cruises, cliffside infinity pools, and volcano boat excursions.',
    topHighlights: ['Oia Sunset Viewing', 'Caldera Catamaran Cruise', 'Red & Black Sand Beaches', 'Akrotiri Prehistoric Ruins'],
    recommendedDays: 4,
    safetyScore: 9,
  },
  {
    id: 'dest-swiss-alps',
    name: 'Swiss Alps (Interlaken & Zermatt)',
    country: 'Switzerland',
    continent: 'Europe',
    vibe: ['Nature', 'Adventure', 'Luxury', 'Romantic'],
    budgetTier: '$$$',
    estimatedDailyCostUsd: 240,
    bestMonths: ['December', 'January', 'February', 'July', 'August'],
    matchScore: 93,
    coverImage: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=1000&auto=format&fit=crop&q=80',
    tagline: 'Snowcapped Matterhorn Peaks, Glacial Lakes & Alpine Trains',
    description: 'Scenic cogwheel railway journeys, panoramic mountain hikes, world-class skiing, and Swiss chocolate tastings.',
    topHighlights: ['Jungfraujoch Top of Europe', 'Matterhorn Glacier Paradise', 'Lake Brienz Cruise', 'Lauterbrunnen Valley Waterfalls'],
    recommendedDays: 5,
    safetyScore: 10,
  },
  {
    id: 'dest-barcelona',
    name: 'Barcelona',
    country: 'Spain',
    continent: 'Europe',
    vibe: ['Culture', 'Culinary', 'Budget Friendly', 'Adventure'],
    budgetTier: '$$',
    estimatedDailyCostUsd: 130,
    bestMonths: ['May', 'June', 'September', 'October'],
    matchScore: 91,
    coverImage: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1000&auto=format&fit=crop&q=80',
    tagline: 'Gaudí Architecture, Mediterranean Coast & Tapas Culture',
    description: 'Sagrada Família surrealism, Park Güell mosaics, sunset beach strolls along Barceloneta, and vibrant late-night tapas bars.',
    topHighlights: ['Sagrada Família Basilica', 'Park Güell Mosaic Gardens', 'Gothic Quarter Tapas Crawl', 'Barceloneta Beach Promenade'],
    recommendedDays: 4,
    safetyScore: 8,
  },
];

export interface RecommendationFilterOptions {
  vibe?: string;
  budgetTier?: string;
  continent?: string;
  searchQuery?: string;
}

export function getRecommendedDestinations(filters?: RecommendationFilterOptions): RecommendedDestination[] {
  let list = [...DESTINATION_CATALOG];

  if (filters?.continent && filters.continent !== 'all') {
    list = list.filter((d) => d.continent.toLowerCase() === filters.continent?.toLowerCase());
  }

  if (filters?.budgetTier && filters.budgetTier !== 'all') {
    list = list.filter((d) => d.budgetTier === filters.budgetTier);
  }

  if (filters?.vibe && filters.vibe !== 'all') {
    list = list.filter((d) => d.vibe.some((v) => v.toLowerCase() === filters.vibe?.toLowerCase()));
  }

  if (filters?.searchQuery?.trim()) {
    const q = filters.searchQuery.toLowerCase();
    list = list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q) ||
        d.tagline.toLowerCase().includes(q) ||
        d.topHighlights.some((h) => h.toLowerCase().includes(q))
    );
  }

  // Sort by match score descending
  return list.sort((a, b) => b.matchScore - a.matchScore);
}

export function getDestinationDetails(destinationIdOrName: string): RecommendedDestination | undefined {
  const q = destinationIdOrName.toLowerCase();
  return DESTINATION_CATALOG.find(
    (d) => d.id === q || d.name.toLowerCase() === q || d.country.toLowerCase() === q
  );
}
