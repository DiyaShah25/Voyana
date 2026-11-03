import {
  routeDistanceKm,
  sampleTransportPrice,
  travelDateFactor,
} from "./pricing.js";
// Shared sample transport catalog; all prices are INR.
export type TransportType =
  | "train"
  | "car_rental"
  | "bus"
  | "private_transfer"
  | "ferry";
export type TransportModeFilter =
  | "all"
  | "train"
  | "car"
  | "car_rental"
  | "bus"
  | "private_transfer"
  | "ferry";
export type TransportBookingStatus =
  | "pending"
  | "confirmed"
  | "delayed"
  | "cancelled"
  | "completed";

export interface TransportItem {
  id: string;
  providerName: string;
  transportType: TransportType;
  originLocation: string;
  destinationLocation: string;
  originCity: string;
  destinationCity: string;
  scheduledDeparture: string; // ISO timestamp
  scheduledArrival?: string; // ISO timestamp
  durationMinutes: number;
  vehicleModel?: string;
  vehicleClass: string;
  maxPassengers: number;
  baggageCapacity: number;
  basePrice: number;
  currency: string;
  operatorRating: number;
  amenities: string[];
  imageUrl?: string;
}

export interface TransportSearchParams {
  origin?: string;
  destination?: string;
  date?: string; // YYYY-MM-DD
  mode?: TransportModeFilter;
  passengers?: number;
}

export interface TransportBookingDetails {
  passengerName: string;
  contactEmail: string;
  contactPhone: string;
  passengerCount: number;
  pickupNotes?: string;
  dropoffNotes?: string;
  driverNotes?: string;
}

export interface TransportBookingRecord {
  id: string;
  bookingReference: string;
  transport: TransportItem;
  details: TransportBookingDetails;
  status: TransportBookingStatus;
  totalAmount: number;
  currency: string;
  createdAt: string;
}

export interface TransportBookingResult {
  success: boolean;
  bookingReference?: string;
  bookingId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Supabase Client Setup (Matching flightService & hotelService)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Seeded Mock Transport Catalog
// ---------------------------------------------------------------------------
export const SEED_TRANSPORTS: TransportItem[] = [
  // Paris
  {
    id: "trp-par-01",
    providerName: "Eurostar International",
    transportType: "train",
    originLocation: "Paris Gare du Nord",
    destinationLocation: "London St Pancras International",
    originCity: "Paris",
    destinationCity: "London",
    scheduledDeparture: "2026-10-05T08:12:00Z",
    scheduledArrival: "2026-10-05T10:30:00Z",
    durationMinutes: 138,
    vehicleModel: "e320 High-Speed Rail",
    vehicleClass: "Standard Premier",
    maxPassengers: 200,
    baggageCapacity: 2,
    basePrice: 11600,
    currency: "INR",
    operatorRating: 4.9,
    amenities: [
      "High-Speed WiFi",
      "Power Sockets",
      "At-Seat Meal Service",
      "Generous Luggage",
    ],
    imageUrl:
      "https://images.pexels.com/photos/163016/railroad-train-tracks-locomotive-163016.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "trp-par-02",
    providerName: "Paris Executive Chauffeur",
    transportType: "private_transfer",
    originLocation: "Charles de Gaulle Airport (CDG)",
    destinationLocation: "Eiffel Tower / Central Paris",
    originCity: "Paris",
    destinationCity: "Paris",
    scheduledDeparture: "2026-10-05T09:30:00Z",
    scheduledArrival: "2026-10-05T10:15:00Z",
    durationMinutes: 45,
    vehicleModel: "Mercedes-Benz E-Class Sedan",
    vehicleClass: "Executive Luxury",
    maxPassengers: 3,
    baggageCapacity: 3,
    basePrice: 7600,
    currency: "INR",
    operatorRating: 4.95,
    amenities: [
      "Flight Tracking",
      "Meet & Greet with Name Sign",
      "Bottled Mineral Water",
      "Free 60m Wait Time",
    ],
    imageUrl:
      "https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "trp-par-03",
    providerName: "Sixt France Luxury Fleet",
    transportType: "car_rental",
    originLocation: "Paris Gare de Lyon Station",
    destinationLocation: "Paris Gare de Lyon Dropoff",
    originCity: "Paris",
    destinationCity: "Paris",
    scheduledDeparture: "2026-10-05T10:00:00Z",
    scheduledArrival: "2026-10-06T10:00:00Z",
    durationMinutes: 1440,
    vehicleModel: "BMW 4 Series Gran Coupé",
    vehicleClass: "Premium Coupe",
    maxPassengers: 4,
    baggageCapacity: 3,
    basePrice: 9600,
    currency: "INR",
    operatorRating: 4.8,
    amenities: [
      "Unlimited Mileage",
      "GPS Navigation Included",
      "Collision Damage Waiver",
      "Full-to-Full Fuel",
    ],
    imageUrl:
      "https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  // Tokyo
  {
    id: "trp-tyo-01",
    providerName: "JR Central Shinkansen",
    transportType: "train",
    originLocation: "Tokyo Station",
    destinationLocation: "Kyoto Station",
    originCity: "Tokyo",
    destinationCity: "Kyoto",
    scheduledDeparture: "2026-10-05T07:30:00Z",
    scheduledArrival: "2026-10-05T09:45:00Z",
    durationMinutes: 135,
    vehicleModel: "N700S Series Bullet Train",
    vehicleClass: "Green Car (First Class)",
    maxPassengers: 150,
    baggageCapacity: 2,
    basePrice: 12800,
    currency: "INR",
    operatorRating: 4.98,
    amenities: [
      "Ultra-Smooth 285 km/h Ride",
      "Quiet Car Experience",
      "Reclining Footrest",
      "Bento Box Cart",
    ],
    imageUrl:
      "https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "trp-tyo-02",
    providerName: "Narita Express (N'EX)",
    transportType: "train",
    originLocation: "Narita International Airport (NRT)",
    destinationLocation: "Shinjuku / Shibuya Station",
    originCity: "Tokyo",
    destinationCity: "Tokyo",
    scheduledDeparture: "2026-10-05T06:30:00Z",
    scheduledArrival: "2026-10-05T07:25:00Z",
    durationMinutes: 55,
    vehicleModel: "E259 Series Express",
    vehicleClass: "Reserved Standard",
    maxPassengers: 180,
    baggageCapacity: 2,
    basePrice: 2560,
    currency: "INR",
    operatorRating: 4.85,
    amenities: [
      "Luggage Lockers with PIN",
      "Direct City Center Line",
      "Free WiFi",
      "Multi-Language Display",
    ],
    imageUrl:
      "https://images.pexels.com/photos/7245258/pexels-photo-7245258.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "trp-tyo-03",
    providerName: "Tokyo VIP Limousine",
    transportType: "private_transfer",
    originLocation: "Haneda Airport (HND)",
    destinationLocation: "Shibuya Crossing / Minato City",
    originCity: "Tokyo",
    destinationCity: "Tokyo",
    scheduledDeparture: "2026-10-05T11:00:00Z",
    scheduledArrival: "2026-10-05T11:35:00Z",
    durationMinutes: 35,
    vehicleModel: "Toyota Alphard Executive Lounge",
    vehicleClass: "VIP Van / MPV",
    maxPassengers: 5,
    baggageCapacity: 5,
    basePrice: 8800,
    currency: "INR",
    operatorRating: 4.96,
    amenities: [
      "Captain Reclining Seats",
      "Privacy Curtains",
      "USB High-Speed Ports",
      "Complimentary Drinks",
    ],
    imageUrl:
      "https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  // Dubai
  {
    id: "trp-dxb-01",
    providerName: "Royal Emirates Limousine",
    transportType: "private_transfer",
    originLocation: "Dubai International Airport (DXB)",
    destinationLocation: "Burj Khalifa / Downtown Dubai",
    originCity: "Dubai",
    destinationCity: "Dubai",
    scheduledDeparture: "2026-10-05T11:00:00Z",
    scheduledArrival: "2026-10-05T11:30:00Z",
    durationMinutes: 30,
    vehicleModel: "Cadillac Escalade Platinum",
    vehicleClass: "VIP Luxury SUV",
    maxPassengers: 5,
    baggageCapacity: 5,
    basePrice: 6800,
    currency: "INR",
    operatorRating: 4.96,
    amenities: [
      "Uniformed Chauffeur",
      "Flight Delay Protection",
      "Chilled Towels & Refreshments",
      "Child Seat Available",
    ],
    imageUrl:
      "https://images.pexels.com/photos/337909/pexels-photo-337909.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "trp-dxb-02",
    providerName: "Arabian Adventures Coach",
    transportType: "bus",
    originLocation: "Dubai Marina Mall",
    destinationLocation: "Al Marmoom Desert Reserve",
    originCity: "Dubai",
    destinationCity: "Dubai Desert",
    scheduledDeparture: "2026-10-05T15:00:00Z",
    scheduledArrival: "2026-10-05T16:00:00Z",
    durationMinutes: 60,
    vehicleModel: "Mercedes Sprinter VIP Coach",
    vehicleClass: "Panoramic Tourism",
    maxPassengers: 16,
    baggageCapacity: 16,
    basePrice: 3200,
    currency: "INR",
    operatorRating: 4.88,
    amenities: [
      "Air Conditioned Coach",
      "English-Speaking Guide",
      "Dune Tour Transfer",
      "Sunset Photo Stop",
    ],
    imageUrl:
      "https://images.pexels.com/photos/681335/pexels-photo-681335.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "trp-dxb-03",
    providerName: "Hertz UAE Luxury",
    transportType: "car_rental",
    originLocation: "Dubai International Airport (DXB)",
    destinationLocation: "Dubai International Airport (DXB)",
    originCity: "Dubai",
    destinationCity: "Dubai",
    scheduledDeparture: "2026-10-05T12:00:00Z",
    scheduledArrival: "2026-10-06T12:00:00Z",
    durationMinutes: 1440,
    vehicleModel: "Porsche Macan GTS",
    vehicleClass: "Luxury Sports SUV",
    maxPassengers: 5,
    baggageCapacity: 4,
    basePrice: 15200,
    currency: "INR",
    operatorRating: 4.92,
    amenities: [
      "Salik Toll Tag Included",
      "Apple CarPlay & Android Auto",
      "Comprehensive Insurance",
      "24/7 Roadside Assistance",
    ],
    imageUrl:
      "https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  // New York
  {
    id: "trp-nyc-01",
    providerName: "NYC Airporter Express",
    transportType: "private_transfer",
    originLocation: "John F. Kennedy Airport (JFK)",
    destinationLocation: "Times Square / Midtown Manhattan",
    originCity: "New York",
    destinationCity: "New York",
    scheduledDeparture: "2026-10-05T14:00:00Z",
    scheduledArrival: "2026-10-05T15:00:00Z",
    durationMinutes: 60,
    vehicleModel: "Chevrolet Suburban Luxury SUV",
    vehicleClass: "Black Car Service",
    maxPassengers: 4,
    baggageCapacity: 4,
    basePrice: 7200,
    currency: "INR",
    operatorRating: 4.82,
    amenities: [
      "Toll & Tip Included",
      "Realtime Curbside Pickup",
      "Phone Chargers",
      "Spacious Cargo Space",
    ],
    imageUrl:
      "https://images.pexels.com/photos/290386/pexels-photo-290386.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "trp-nyc-02",
    providerName: "Amtrak Acela Express",
    transportType: "train",
    originLocation: "New York Penn Station / Moynihan Train Hall",
    destinationLocation: "Washington Union Station",
    originCity: "New York",
    destinationCity: "Washington DC",
    scheduledDeparture: "2026-10-05T09:00:00Z",
    scheduledArrival: "2026-10-05T11:55:00Z",
    durationMinutes: 175,
    vehicleModel: "Acela High-Speed Trainset",
    vehicleClass: "Business Class",
    maxPassengers: 250,
    baggageCapacity: 2,
    basePrice: 10400,
    currency: "INR",
    operatorRating: 4.87,
    amenities: [
      "Complimentary High-Speed WiFi",
      "Quiet Car Available",
      "Café Car Service",
      "Wide Reclining Seats",
    ],
    imageUrl:
      "https://images.pexels.com/photos/176837/pexels-photo-176837.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  // Ahmedabad & India
  {
    id: "trp-amd-01",
    providerName: "Indian Railways IRCTC",
    transportType: "train",
    originLocation: "Ahmedabad Junction (ADI)",
    destinationLocation: "Mumbai Central (MMCT)",
    originCity: "Ahmedabad",
    destinationCity: "Mumbai",
    scheduledDeparture: "2026-10-05T06:10:00Z",
    scheduledArrival: "2026-10-05T11:35:00Z",
    durationMinutes: 325,
    vehicleModel: "Vande Bharat 2.0 Semi-High Speed",
    vehicleClass: "Executive AC Chair Car",
    maxPassengers: 120,
    baggageCapacity: 2,
    basePrice: 2400,
    currency: "INR",
    operatorRating: 4.86,
    amenities: [
      "160 km/h Semi High Speed",
      "Hot Gourmet Meals Included",
      "Rotatable Seats",
      "Bio-Vacuum Toilets",
    ],
    imageUrl:
      "https://images.pexels.com/photos/103123/pexels-photo-103123.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "trp-amd-02",
    providerName: "Gujarat Heritage Cab & Transfers",
    transportType: "private_transfer",
    originLocation: "Sardar Vallabhbhai Patel Airport (AMD)",
    destinationLocation: "Sabarmati Ashram / City Center",
    originCity: "Ahmedabad",
    destinationCity: "Ahmedabad",
    scheduledDeparture: "2026-10-05T10:00:00Z",
    scheduledArrival: "2026-10-05T10:35:00Z",
    durationMinutes: 35,
    vehicleModel: "Toyota Innova Crysta",
    vehicleClass: "AC Premium Sedan/SUV",
    maxPassengers: 5,
    baggageCapacity: 4,
    basePrice: 1760,
    currency: "INR",
    operatorRating: 4.9,
    amenities: [
      "Clean Sanitized Cabin",
      "Luggage Helper",
      "Local Sightseeing Advice",
      "Prepaid Confirmed Fare",
    ],
    imageUrl:
      "https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    id: "trp-amd-03",
    providerName: "Zoomcar Self-Drive Fleet",
    transportType: "car_rental",
    originLocation: "Ahmedabad Airport Pickup Hub",
    destinationLocation: "Ahmedabad Airport Dropoff",
    originCity: "Ahmedabad",
    destinationCity: "Ahmedabad",
    scheduledDeparture: "2026-10-05T09:00:00Z",
    scheduledArrival: "2026-10-06T09:00:00Z",
    durationMinutes: 1440,
    vehicleModel: "Hyundai Creta Automatic",
    vehicleClass: "Compact SUV",
    maxPassengers: 5,
    baggageCapacity: 3,
    basePrice: 3600,
    currency: "INR",
    operatorRating: 4.78,
    amenities: [
      "Keyless App Entry",
      "Fastag Toll Enabled",
      "Zero Security Deposit",
      "24/7 Support",
    ],
    imageUrl:
      "https://images.pexels.com/photos/1149137/pexels-photo-1149137.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
];

// ---------------------------------------------------------------------------
// Helpers & Formatters
// ---------------------------------------------------------------------------
export function getTransportTypeLabel(type: TransportType): string {
  switch (type) {
    case "train":
      return "High-Speed Train";
    case "car_rental":
      return "Car Rental";
    case "private_transfer":
      return "Private Transfer";
    case "bus":
      return "Coach / Shuttle";
    case "ferry":
      return "Ferry & Cruise";
    default:
      return "Transport";
  }
}

export function getTransportIcon(type: TransportType): string {
  switch (type) {
    case "train":
      return "🚆";
    case "car_rental":
      return "🚗";
    case "private_transfer":
      return "🚘";
    case "bus":
      return "🚌";
    case "ferry":
      return "⛴️";
    default:
      return "🚖";
  }
}

export function formatTransportDuration(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440);
    return `${days} ${days === 1 ? "Day" : "Days"} Rental`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function getTransportById(id: string): TransportItem | undefined {
  return generateTransportOptions().find((item) => item.id === id);
}

// ---------------------------------------------------------------------------
// Core Search Function
// ---------------------------------------------------------------------------
export function generateTransportOptions(
  origin?: string,
  destination?: string,
  date?: string,
  mode: TransportModeFilter = "all",
): TransportItem[] {
  const normalizedMode = mode === "car" ? "car_rental" : mode;
  // 2. Offline / Mock filtering
  let results = [
    ...SEED_TRANSPORTS,
    ...SEED_TRANSPORTS.filter(
      (item) =>
        ["train", "bus"].includes(item.transportType) &&
        item.originCity !== item.destinationCity,
    ).map((item) => ({
      ...item,
      id: `${item.id}-return`,
      originCity: item.destinationCity,
      destinationCity: item.originCity,
      originLocation: item.destinationLocation,
      destinationLocation: item.originLocation,
    })),
  ];

  if (origin && origin.trim()) {
    const o = origin.trim().toLowerCase();
    results = results.filter(
      (item) =>
        item.originCity.toLowerCase().includes(o) ||
        item.originLocation.toLowerCase().includes(o) ||
        item.destinationCity.toLowerCase().includes(o) ||
        item.destinationLocation.toLowerCase().includes(o),
    );
  }

  if (destination && destination.trim()) {
    const d = destination.trim().toLowerCase();
    const destMatches = results.filter(
      (item) =>
        item.destinationCity.toLowerCase().includes(d) ||
        item.destinationLocation.toLowerCase().includes(d),
    );
    results = destMatches;
  }

  // Each fallback is a separate service with its own image, vehicle, capacity and price.
  if (origin || destination) {
    const from = origin?.trim() || destination!.trim();
    const to = destination?.trim() || from;
    const variants: Array<{
      type: TransportType;
      name: string;
      model: string;
      className: string;
      capacity: number;
      image: string;
    }> = [
      {
        type: "private_transfer",
        name: "Private cab",
        model: "Premium sedan / SUV",
        className: "Private transfer",
        capacity: 5,
        image: "suv",
      },
      {
        type: "train",
        name: "Intercity rail",
        model: "Reserved-seat train",
        className: "AC reserved seat",
        capacity: 200,
        image: "train",
      },
      {
        type: "bus",
        name: "Intercity coach",
        model: "Air-conditioned coach",
        className: "AC coach seat",
        capacity: 40,
        image: "bus",
      },
      {
        type: "car_rental",
        name: "Self-drive rental",
        model: "Self-drive car",
        className: "Daily rental",
        capacity: 5,
        image: "car",
      },
      {
        type: "ferry",
        name: "Ferry crossing",
        model: "Passenger ferry",
        className: "Reserved passenger seat",
        capacity: 80,
        image: "ferry",
      },
    ];
    const existing = results;
    const generated = variants
      .filter(
        (option) =>
          !existing.some((item) => item.transportType === option.type) &&
          (option.type !== "ferry" ||
            [
              "bali",
              "mumbai",
              "singapore",
              "sydney",
              "new york",
              "dubai",
              "rio de janeiro",
              "paris",
              "amsterdam",
            ].includes(to.toLowerCase())),
      )
      .map((option) => {
        const minutes =
          option.type === "car_rental"
            ? 1440
            : Math.max(
                30,
                Math.round(
                  (routeDistanceKm(from, to) /
                    (option.type === "train"
                      ? 90
                      : option.type === "bus"
                        ? 55
                        : option.type === "ferry"
                          ? 30
                          : 45)) *
                    60,
                ),
              );
        return {
          id: `dyn-trp-${encodeURIComponent(from.toLowerCase())}-${encodeURIComponent(to.toLowerCase())}-${date || "undated"}-${option.type}`,
          providerName: `${to} ${option.name}`,
          transportType: option.type,
          originLocation: `${from} ${option.type === "train" ? "Central Station" : option.type === "bus" ? "Coach Terminal" : option.type === "car_rental" ? "Rental Hub" : "Pickup Point"}`,
          destinationLocation: `${to} ${option.type === "train" ? (from === to ? "Regional Terminal" : "Central Station") : option.type === "bus" ? (from === to ? "City Center" : "Coach Terminal") : "City Center"}`,
          originCity: from,
          destinationCity: to,
          scheduledDeparture: `${date || "2026-01-01"}T09:00:00Z`,
          durationMinutes: minutes,
          vehicleModel: option.model,
          vehicleClass: option.className,
          maxPassengers: option.capacity,
          baggageCapacity: 2,
          basePrice: sampleTransportPrice(option.type, from, to, "", 0),
          currency: "INR",
          operatorRating: 4.5,
          amenities:
            option.type === "car_rental"
              ? ["Daily rental", "Self-drive", "Air conditioning"]
              : ["Reserved booking", "Air conditioning"],
          imageUrl: `/images/booking/${option.image}.jpg`,
        };
      });
    results = [...existing, ...generated];
  }
  if (date)
    results = results.map((item) => ({
      ...item,
      basePrice: Math.max(
        100,
        Math.round(
          (item.basePrice * travelDateFactor(date, item.destinationCity)) / 10,
        ) * 10,
      ),
    }));
  if (normalizedMode !== "all")
    results = results.filter((item) => item.transportType === normalizedMode);
  results = results.map((item) => ({
    ...item,
    imageUrl:
      item.transportType === "train"
        ? "/images/booking/train.jpg"
        : item.transportType === "bus"
          ? "/images/booking/bus.jpg"
          : item.transportType === "ferry"
            ? "/images/booking/ferry.jpg"
            : /Van|MPV|Sprinter|Alphard/i.test(
                  (item.vehicleModel || "") + " " + item.vehicleClass,
                )
              ? "/images/booking/van.svg"
              : /SUV|Innova|Suburban|Macan|Creta|Seltos/i.test(
                    (item.vehicleModel || "") + " " + item.vehicleClass,
                  )
                ? "/images/booking/suv.jpg"
                : "/images/booking/car.jpg",
  }));
  if (date)
    results = results.map((item) => {
      const departure = date + item.scheduledDeparture.slice(10);
      return {
        ...item,
        scheduledDeparture: departure,
        scheduledArrival: new Date(
          Date.parse(departure) + item.durationMinutes * 60000,
        ).toISOString(),
      };
    });
  return results;
}
