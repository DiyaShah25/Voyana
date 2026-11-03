import { travelDateFactor } from './pricing.js';
// Shared sample hotel catalog; all prices are INR.
export type RoomType = 'Standard' | 'Deluxe' | 'Executive Suite' | 'Presidential Suite';

export interface HotelAmenity {
  id: string;
  name: string;
  icon: string;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  starRating: number; // 1.0 - 5.0
  reviewScore: number; // e.g. 9.2
  reviewCount: number;
  imageUrl: string;
  galleryImages?: string[];
  contactPhone?: string;
  baseNightlyRate: number; // INR for standard room
  roomRates: Record<RoomType, number>;
  currency: string;
  amenities: string[];
  description: string;
  distanceFromCenter?: string;
}

export interface HotelSearchParams {
  location: string;       // City or location name e.g. Paris
  checkInDate: string;    // YYYY-MM-DD
  checkOutDate: string;   // YYYY-MM-DD
  guests: number;
  rooms: number;
  minRating?: number;
  roomType?: RoomType;
}

export interface GuestDetails {
  fullName: string;
  passportOrId: string;
  contactEmail: string;
  contactPhone: string;
  nationality: string;
  bedPreference: 'king' | 'twin' | 'single' | 'no_preference';
  specialRequests?: string;
}

export interface HotelBookingResult {
  success: boolean;
  bookingReference?: string;
  bookingId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Seeded Mock Hotel Catalog
// ---------------------------------------------------------------------------
export const SEED_HOTELS: Record<string, Omit<Hotel, 'id'>[]> = {
  Paris: [
    {
      name: 'Hôtel Ritz Paris',
      city: 'Paris',
      country: 'France',
      address: '15 Place Vendôme, 75001 Paris',
      starRating: 5.0,
      reviewScore: 9.8,
      reviewCount: 1420,
      imageUrl: 'https://images.pexels.com/photos/189296/pexels-photo-189296.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+33 1 43 16 30 30',
      baseNightlyRate: 60000,
      roomRates: {
        'Standard': 60000,
        'Deluxe': 84000,
        'Executive Suite': 128000,
        'Presidential Suite': 224000,
      },
      currency: 'INR',
      amenities: ['Free High-Speed WiFi', 'Luxury Spa & Pool', 'Michelin Star Dining', 'Valet Parking', 'Concierge Service', 'Fitness Center'],
      description: 'An iconic palace hotel in the historic heart of Paris, blending timeless French elegance with peerless luxury and hospitality.',
      distanceFromCenter: '0.4 km from city center',
    },
    {
      name: 'Le Meurice - Dorchester Collection',
      city: 'Paris',
      country: 'France',
      address: '228 Rue de Rivoli, 75001 Paris',
      starRating: 5.0,
      reviewScore: 9.6,
      reviewCount: 980,
      imageUrl: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+33 1 44 58 10 10',
      baseNightlyRate: 54400,
      roomRates: {
        'Standard': 54400,
        'Deluxe': 73600,
        'Executive Suite': 116000,
        'Presidential Suite': 200000,
      },
      currency: 'INR',
      amenities: ['Free WiFi', 'Spa Valmont', 'Restaurant le Meurice', 'Bar 228', '24/7 Room Service', 'Pet Friendly'],
      description: 'Overlooking the Tuileries Garden, Le Meurice seamlessly merges 18th-century opulence with contemporary designer flair.',
      distanceFromCenter: '0.6 km from city center',
    },
    {
      name: 'Grand Hôtel du Palais Royal',
      city: 'Paris',
      country: 'France',
      address: '4 Rue de Valois, 75001 Paris',
      starRating: 4.8,
      reviewScore: 9.3,
      reviewCount: 740,
      imageUrl: 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+33 1 42 96 15 35',
      baseNightlyRate: 33600,
      roomRates: {
        'Standard': 33600,
        'Deluxe': 46400,
        'Executive Suite': 71200,
        'Presidential Suite': 120000,
      },
      currency: 'INR',
      amenities: ['Free WiFi', 'Carita Spa & Hammam', 'Lounge Bar', 'Courtyard Terrace', 'Airport Shuttle', 'Boutique Gym'],
      description: 'Steps from the Louvre and Palais Royal gardens, offering a tranquil sanctuary in prime central Paris.',
      distanceFromCenter: '0.8 km from city center',
    },
    {
      name: 'CitizenM Paris Champs-Élysées',
      city: 'Paris',
      country: 'France',
      address: '128 Rue La Boétie, 75008 Paris',
      starRating: 4.2,
      reviewScore: 8.9,
      reviewCount: 2150,
      imageUrl: 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+33 1 86 65 59 10',
      baseNightlyRate: 16800,
      roomRates: {
        'Standard': 16800,
        'Deluxe': 23200,
        'Executive Suite': 36000,
        'Presidential Suite': 62400,
      },
      currency: 'INR',
      amenities: ['Ultra-Fast WiFi', 'Rooftop Bar', 'Mood Lighting Controls', '24/7 CanteenM', 'Self Check-in'],
      description: 'Vibrant boutique hotel with smart XL king rooms, trendy art-filled living spaces, and Eiffel Tower views from the rooftop.',
      distanceFromCenter: '1.8 km from city center',
    },
  ],
  Tokyo: [
    {
      name: 'Aman Tokyo',
      city: 'Tokyo',
      country: 'Japan',
      address: 'The Otemachi Tower, 1-5-6 Otemachi, Chiyoda-ku, Tokyo',
      starRating: 5.0,
      reviewScore: 9.9,
      reviewCount: 1120,
      imageUrl: 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+81 3 5224 3333',
      baseNightlyRate: 68000,
      roomRates: {
        'Standard': 68000,
        'Deluxe': 96000,
        'Executive Suite': 148000,
        'Presidential Suite': 256000,
      },
      currency: 'INR',
      amenities: ['Panoramic City Views', '30m Heated Pool', 'Onsen Hot Spring Bath', 'Traditional Tea Lounge', 'Signature Spa'],
      description: 'An urban sanctuary perched high above Otemachi, blending traditional Japanese washi paper architecture with minimalist serenity.',
      distanceFromCenter: '1.2 km from Tokyo Station',
    },
    {
      name: 'Park Hyatt Tokyo',
      city: 'Tokyo',
      country: 'Japan',
      address: '3-7-1-2 Nishi-Shinjuku, Shinjuku-ku, Tokyo',
      starRating: 5.0,
      reviewScore: 9.5,
      reviewCount: 1840,
      imageUrl: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+81 3 5322 1234',
      baseNightlyRate: 46400,
      roomRates: {
        'Standard': 46400,
        'Deluxe': 63200,
        'Executive Suite': 100000,
        'Presidential Suite': 184000,
      },
      currency: 'INR',
      amenities: ['New York Grill & Bar', 'Sky Gym & Indoor Pool', 'Mt Fuji Views', 'Club On The Park Spa', 'Free WiFi'],
      description: 'Legendary luxury tower in Shinjuku, famous for skyline panoramas, world-class jazz, and serene zen bathrooms.',
      distanceFromCenter: '0.9 km from Shinjuku Station',
    },
    {
      name: 'Hotel Gracery Shinjuku',
      city: 'Tokyo',
      country: 'Japan',
      address: '1-19-1 Kabukicho, Shinjuku-ku, Tokyo',
      starRating: 4.2,
      reviewScore: 8.8,
      reviewCount: 3400,
      imageUrl: 'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+81 3 6833 1111',
      baseNightlyRate: 13200,
      roomRates: {
        'Standard': 13200,
        'Deluxe': 19200,
        'Executive Suite': 30400,
        'Presidential Suite': 49600,
      },
      currency: 'INR',
      amenities: ['Free WiFi', 'Godzilla Terrace View', 'Cafe Terrace Bonjour', 'Concierge', 'Direct Transit Access'],
      description: 'Modern high-rise located in the bustling heart of Kabukicho, featuring comfortable rooms and the iconic Godzilla head.',
      distanceFromCenter: '0.4 km from Shinjuku Station',
    },
  ],
  Dubai: [
    {
      name: 'Burj Al Arab Jumeirah',
      city: 'Dubai',
      country: 'UAE',
      address: 'Jumeirah St, Umm Suqeim 3, Dubai',
      starRating: 5.0,
      reviewScore: 9.9,
      reviewCount: 2200,
      imageUrl: 'https://images.pexels.com/photos/338504/pexels-photo-338504.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+971 4 301 7777',
      baseNightlyRate: 88000,
      roomRates: {
        'Standard': 88000,
        'Deluxe': 132000,
        'Executive Suite': 208000,
        'Presidential Suite': 392000,
      },
      currency: 'INR',
      amenities: ['Private Beach & Cabanas', 'Helipad & Rolls Royce Chauffeur', 'Talise Spa', 'Infinity Pool Terrace', 'Butler Service'],
      description: 'The world-famous sail-shaped beacon of Arabian luxury on its own private island, redefining 7-star indulgence.',
      distanceFromCenter: '12 km from Downtown Dubai',
    },
    {
      name: 'Armani Hotel Dubai',
      city: 'Dubai',
      country: 'UAE',
      address: 'Burj Khalifa, 1 Mohammed bin Rashid Blvd, Downtown Dubai',
      starRating: 5.0,
      reviewScore: 9.4,
      reviewCount: 1650,
      imageUrl: 'https://images.pexels.com/photos/261169/pexels-photo-261169.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+971 4 888 3888',
      baseNightlyRate: 47200,
      roomRates: {
        'Standard': 47200,
        'Deluxe': 67200,
        'Executive Suite': 108000,
        'Presidential Suite': 192000,
      },
      currency: 'INR',
      amenities: ['Direct Dubai Mall Access', 'Armani/Spa', 'Signature Restaurants', 'Dubai Fountain Views', 'Free WiFi'],
      description: 'Designed exclusively by Giorgio Armani inside Burj Khalifa, boasting Italian minimalist finesse and fountain views.',
      distanceFromCenter: '0.1 km from Burj Khalifa',
    },
    {
      name: 'Rove Downtown Dubai',
      city: 'Dubai',
      country: 'UAE',
      address: 'Happiness St, Zabeel 2, Downtown Dubai',
      starRating: 4.3,
      reviewScore: 9.1,
      reviewCount: 4100,
      imageUrl: 'https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+971 4 561 9000',
      baseNightlyRate: 11200,
      roomRates: {
        'Standard': 11200,
        'Deluxe': 15600,
        'Executive Suite': 25600,
        'Presidential Suite': 43200,
      },
      currency: 'INR',
      amenities: ['Outdoor Pool & Burj Views', '24/7 Gym & Laundromat', 'The Daily Restaurant', 'Free High-Speed WiFi', 'Cinema Room'],
      description: 'Contemporary, culture-packed lifestyle hotel right opposite Burj Khalifa, perfect for modern explorers.',
      distanceFromCenter: '0.7 km from Dubai Mall',
    },
  ],
  'New York': [
    {
      name: 'The Plaza Hotel',
      city: 'New York',
      country: 'USA',
      address: '768 5th Ave, New York, NY 10019',
      starRating: 5.0,
      reviewScore: 9.5,
      reviewCount: 2890,
      imageUrl: 'https://images.pexels.com/photos/53464/sheraton-palace-hotel-lobby-architecture-san-francisco-53464.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+1 212-759-3000',
      baseNightlyRate: 57600,
      roomRates: {
        'Standard': 57600,
        'Deluxe': 79200,
        'Executive Suite': 124000,
        'Presidential Suite': 232000,
      },
      currency: 'INR',
      amenities: ['Central Park Views', 'The Palm Court', 'Guerlain Spa', 'Fitness Center by La Palestra', 'Luxury Butler Service'],
      description: 'A timeless Manhattan landmark on Fifth Avenue and Central Park South, celebrated for over a century of legendary hospitality.',
      distanceFromCenter: '0.2 km from Central Park South',
    },
    {
      name: '1 Hotel Brooklyn Bridge',
      city: 'New York',
      country: 'USA',
      address: '60 Furman St, Brooklyn, NY 11201',
      starRating: 4.8,
      reviewScore: 9.2,
      reviewCount: 1450,
      imageUrl: 'https://images.pexels.com/photos/271619/pexels-photo-271619.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+1 833-625-6111',
      baseNightlyRate: 36800,
      roomRates: {
        'Standard': 36800,
        'Deluxe': 51200,
        'Executive Suite': 78400,
        'Presidential Suite': 140000,
      },
      currency: 'INR',
      amenities: ['Rooftop Plunge Pool & Bar', 'Manhattan Skyline Views', 'Bamford Wellness Spa', 'Organic Eateries', 'Eco-Conscious Design'],
      description: 'Waterfront eco-luxury haven offering reclaimed natural materials, native greenery, and spellbinding views of Lower Manhattan.',
      distanceFromCenter: '2.5 km from Wall Street',
    },
    {
      name: 'Arlo Midtown',
      city: 'New York',
      country: 'USA',
      address: '351 W 38th St, New York, NY 10018',
      starRating: 4.3,
      reviewScore: 8.8,
      reviewCount: 3100,
      imageUrl: 'https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+1 212-343-4200',
      baseNightlyRate: 15600,
      roomRates: {
        'Standard': 15600,
        'Deluxe': 22000,
        'Executive Suite': 32800,
        'Presidential Suite': 55200,
      },
      currency: 'INR',
      amenities: ['Rooftop Lounge', 'Co-Working Studio', 'Complimentary Bicycles', 'Fitness Studio with Peloton', 'Nearly 9 Rooftop Bar'],
      description: 'Smart and stylish Midtown retreat steps from Times Square and Hudson Yards, equipped for leisure and work.',
      distanceFromCenter: '0.6 km from Times Square',
    },
  ],
  Ahmedabad: [
    {
      name: 'The House of MG - Heritage Hotel',
      city: 'Ahmedabad',
      country: 'India',
      address: 'Opp. Sidi Saiyyed Mosque, Gheekanta, Lal Darwaja, Ahmedabad, Gujarat 380001',
      starRating: 4.8,
      reviewScore: 9.6,
      reviewCount: 1620,
      imageUrl: 'https://images.pexels.com/photos/2507010/pexels-photo-2507010.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+91 79 2550 6941',
      baseNightlyRate: 9600,
      roomRates: {
        'Standard': 9600,
        'Deluxe': 14000,
        'Executive Suite': 20800,
        'Presidential Suite': 36000,
      },
      currency: 'INR',
      amenities: ['Agashiye Rooftop Gujarati Dining', 'Indoor Lotus Swimming Pool', 'Heritage Walk Tours', 'Tribal Art Gallery', 'Free WiFi'],
      description: 'A stately 20th-century mansion restored into an award-winning heritage boutique hotel opposite the famed Sidi Saiyyed Mosque.',
      distanceFromCenter: '1.0 km from Old City Center',
    },
    {
      name: 'ITC Narmada, a Luxury Collection Hotel',
      city: 'Ahmedabad',
      country: 'India',
      address: 'Judges Bungalow Rd, Vastrapur, Ahmedabad, Gujarat 380015',
      starRating: 5.0,
      reviewScore: 9.7,
      reviewCount: 2050,
      imageUrl: 'https://images.pexels.com/photos/189296/pexels-photo-189296.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+91 79 6966 4000',
      baseNightlyRate: 15200,
      roomRates: {
        'Standard': 15200,
        'Deluxe': 20800,
        'Executive Suite': 32800,
        'Presidential Suite': 62400,
      },
      currency: 'INR',
      amenities: ['Kaya Kalp Royal Spa', 'Peshawri Fine Dining', 'Temperature Controlled Pool', 'Grand Ballroom', 'LEED Platinum Certified'],
      description: 'Architectural marvel inspired by the stepwells of Gujarat, offering regal luxury and world-renowned gastronomy.',
      distanceFromCenter: '4.5 km from Sabarmati Riverfront',
    },
    {
      name: 'Hyatt Regency Ahmedabad',
      city: 'Ahmedabad',
      country: 'India',
      address: '17A Ashram Road, Usmanpura, Ahmedabad, Gujarat 380014',
      starRating: 4.7,
      reviewScore: 9.1,
      reviewCount: 1890,
      imageUrl: 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+91 79 4017 1234',
      baseNightlyRate: 8800,
      roomRates: {
        'Standard': 8800,
        'Deluxe': 12400,
        'Executive Suite': 19200,
        'Presidential Suite': 31200,
      },
      currency: 'INR',
      amenities: ['Sabarmati River Views', 'China House & Tinello', '24-hour Fitness Center', 'Aish Spa', 'Free High-Speed WiFi'],
      description: 'Overlooking the Sabarmati River on Ashram Road, delivering effortless contemporary hospitality in central Ahmedabad.',
      distanceFromCenter: '1.5 km from Sabarmati Ashram',
    },
  ],
  London: [
    {
      name: 'The Savoy',
      city: 'London',
      country: 'UK',
      address: 'Strand, London WC2R 0EZ',
      starRating: 5.0,
      reviewScore: 9.7,
      reviewCount: 3100,
      imageUrl: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+44 20 7836 4343',
      baseNightlyRate: 55200,
      roomRates: {
        'Standard': 55200,
        'Deluxe': 76800,
        'Executive Suite': 120000,
        'Presidential Suite': 216000,
      },
      currency: 'INR',
      amenities: ['Thames River Views', 'Gordon Ramsay Savoy Grill', 'American Bar', 'Beauty & Fitness Centre', 'Savoy Butler Service'],
      description: 'Britain’s first purpose-built luxury hotel on the River Thames, hosting royalty and icons with quintessential British elegance.',
      distanceFromCenter: '0.5 km from Covent Garden',
    },
  ],
  Singapore: [
    {
      name: 'Marina Bay Sands',
      city: 'Singapore',
      country: 'Singapore',
      address: '10 Bayfront Ave, Singapore 018956',
      starRating: 5.0,
      reviewScore: 9.5,
      reviewCount: 5600,
      imageUrl: 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+65 6688 8868',
      baseNightlyRate: 46400,
      roomRates: {
        'Standard': 46400,
        'Deluxe': 65600,
        'Executive Suite': 104000,
        'Presidential Suite': 192000,
      },
      currency: 'INR',
      amenities: ['World Famous Rooftop Infinity Pool', 'SkyPark Observation Deck', 'Banyan Tree Spa', 'Celebrity Chef Dining', 'The Shoppes Mall'],
      description: 'Architectural wonder featuring the world’s largest rooftop infinity pool towering 57 levels above Singapore’s vibrant bay.',
      distanceFromCenter: '1.0 km from Marina Bay',
    },
  ],
  Sydney: [
    {
      name: 'Park Hyatt Sydney',
      city: 'Sydney',
      country: 'Australia',
      address: '7 Hickson Rd, The Rocks NSW 2000',
      starRating: 5.0,
      reviewScore: 9.6,
      reviewCount: 1420,
      imageUrl: 'https://images.pexels.com/photos/338504/pexels-photo-338504.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+61 2 9256 1234',
      baseNightlyRate: 51200,
      roomRates: {
        'Standard': 51200,
        'Deluxe': 71200,
        'Executive Suite': 112000,
        'Presidential Suite': 208000,
      },
      currency: 'INR',
      amenities: ['Unobstructed Opera House Views', 'Rooftop Pool & Deck', 'The Dining Room', 'Spa & Aromatherapy', '24hr Butler'],
      description: 'Located in historic The Rocks right on Sydney Harbour, with uninterrupted views of the Sydney Opera House.',
      distanceFromCenter: '0.4 km from Circular Quay',
    },
  ],
  Rome: [
    {
      name: 'Hotel de Russie, a Rocco Forte Hotel',
      city: 'Rome',
      country: 'Italy',
      address: 'Via del Babuino 9, 00187 Rome',
      starRating: 5.0,
      reviewScore: 9.6,
      reviewCount: 1250,
      imageUrl: 'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+39 06 328881',
      baseNightlyRate: 49600,
      roomRates: {
        'Standard': 49600,
        'Deluxe': 68000,
        'Executive Suite': 108000,
        'Presidential Suite': 192000,
      },
      currency: 'INR',
      amenities: ['Secret Terraced Gardens', 'Stravinskij Bar', 'De Russie Spa & Salt Pool', 'Walking Distance to Spanish Steps'],
      description: 'Luxury hotel between Piazza del Popolo and the Spanish Steps, famed for tranquil secret terraced gardens and Roman chic.',
      distanceFromCenter: '0.3 km from Piazza del Popolo',
    },
  ],
  Bangkok: [
    {
      name: 'Mandarin Oriental Bangkok',
      city: 'Bangkok',
      country: 'Thailand',
      address: '48 Oriental Ave, Khwaeng Bang Rak, Bangkok 10500',
      starRating: 5.0,
      reviewScore: 9.8,
      reviewCount: 2700,
      imageUrl: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+66 2 659 9000',
      baseNightlyRate: 38400,
      roomRates: {
        'Standard': 38400,
        'Deluxe': 54400,
        'Executive Suite': 88000,
        'Presidential Suite': 168000,
      },
      currency: 'INR',
      amenities: ['Chao Phraya River Views', 'The Oriental Spa', 'Le Normandie by Alain Roux', 'Teakwood Shuttle Boats', 'Private Butler'],
      description: 'A legendary grand dame on the banks of the River of Kings, renowned for royal hospitality for nearly 150 years.',
      distanceFromCenter: '3.0 km from Siam Paragon',
    },
  ],
  'Rio de Janeiro': [
    {
      name: 'Belmond Copacabana Palace',
      city: 'Rio de Janeiro',
      country: 'Brazil',
      address: 'Av. Atlântica, 1702 - Copacabana, Rio de Janeiro',
      starRating: 5.0,
      reviewScore: 9.6,
      reviewCount: 1980,
      imageUrl: 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+55 21 2548-7070',
      baseNightlyRate: 36000,
      roomRates: {
        'Standard': 36000,
        'Deluxe': 49600,
        'Executive Suite': 78400,
        'Presidential Suite': 144000,
      },
      currency: 'INR',
      amenities: ['Copacabana Beachfront', 'Historic Semi-Olympic Pool', 'Mee Asian Fine Dining', 'Copacabana Spa', 'Tennis Court'],
      description: 'Art Deco palace reigning over Copacabana beach since 1923, embodying the glamour and infectious rhythm of Rio.',
      distanceFromCenter: 'Direct beachfront access',
    },
  ],
  'New Delhi': [
    {
      name: 'The Imperial New Delhi',
      city: 'New Delhi',
      country: 'India',
      address: 'Janpath, Connaught Place, New Delhi 110001',
      starRating: 5.0,
      reviewScore: 9.6,
      reviewCount: 2200,
      imageUrl: 'https://images.pexels.com/photos/2507010/pexels-photo-2507010.jpeg?auto=compress&cs=tinysrgb&w=800',
      contactPhone: '+91 11 2334 1234',
      baseNightlyRate: 18400,
      roomRates: {
        'Standard': 18400,
        'Deluxe': 25600,
        'Executive Suite': 40800,
        'Presidential Suite': 76000,
      },
      currency: 'INR',
      amenities: ['Imperial Spa & Pool', 'Historic Art Collection', 'Spice Route Restaurant', 'Royal Palm Gardens', 'High Tea at The Atrium'],
      description: 'Legendary heritage hotel near Connaught Place blending Victorian charm and art deco grandeur in lush 8-acre gardens.',
      distanceFromCenter: '0.5 km from Connaught Place',
    },
  ],
};


export function generateMockHotels(params: HotelSearchParams): Hotel[] {
  const locLower = params.location.toLowerCase().trim();

  // Find matching city key
  const matchedKey = Object.keys(SEED_HOTELS).find(
    (k) => k.toLowerCase() === locLower || locLower.includes(k.toLowerCase())
  );

  if (!matchedKey) return [];
  const rawList = SEED_HOTELS[matchedKey];

  return rawList.map((h, idx) => ({
    id: `ht-${matchedKey?.toLowerCase().replace(/\s+/g, '-') || 'city'}-${idx + 1}`,
    ...h,
    imageUrl: `/images/booking/${/resort|beachfront|beach|overwater/i.test(h.name + ' ' + h.description)?'hotel-resort':'hotel-room'}.jpg`,
    baseNightlyRate: Math.round(h.baseNightlyRate * travelDateFactor(params.checkInDate,h.city)/10)*10,
    roomRates: Object.fromEntries(Object.entries(h.roomRates).map(([room,rate])=>[room,Math.round(rate*travelDateFactor(params.checkInDate,h.city)/10)*10])) as Hotel['roomRates'],
  }));
}
export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
}
