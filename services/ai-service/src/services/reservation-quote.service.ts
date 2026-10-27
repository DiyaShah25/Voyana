import { z } from "zod";
import { generateMockFlights } from "../catalog/flights.js";
import { generateMockHotels, calculateNights } from "../catalog/hotels.js";
import { generateTransportOptions } from "../catalog/transport.js";
import { destinationKey } from "../utils/destination.js";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => Number.isFinite(Date.parse(value)), "Invalid travel date");
const count = z.number().int().min(1).max(20);
const choiceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("flight"),
    id: z.string(),
    origin: z.string().length(3),
    destination: z.string().length(3),
    date,
    cabin: z.enum(["economy", "premium_economy", "business", "first"]),
    passengers: count,
  }),
  z.object({
    type: z.literal("hotel"),
    id: z.string(),
    checkIn: date,
    checkOut: date,
    roomType: z.enum([
      "Standard",
      "Deluxe",
      "Executive Suite",
      "Presidential Suite",
    ]),
    rooms: count,
    guests: count,
  }),
  z.object({
    type: z.literal("transport"),
    id: z.string(),
    origin: z.string(),
    date,
    passengers: count,
    days: z.number().int().min(1).max(60).optional(),
  }),
]);
const inputSchema = z.object({
  tripId: z.string().optional(),
  travelMode: z.enum(["solo", "group"]).optional(),
  destination: z.string().trim().min(2),
  bookingType: z.enum(["flight", "hotel", "transport", "package"]),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  specialRequests: z.string().optional(),
  flightDetails: z.record(z.unknown()).optional(),
  hotelDetails: z.record(z.unknown()).optional(),
  transportDetails: z.record(z.unknown()).optional(),
  choices: z.array(choiceSchema).min(1).max(3),
});

export function quoteReservation(raw: unknown) {
  const input = inputSchema.parse(raw);
  if (
    input.bookingType !== "package" &&
    (input.choices.length !== 1 || input.choices[0].type !== input.bookingType)
  )
    throw new Error("Choose one matching travel service.");
  if (
    new Set(input.choices.map((choice) => choice.type)).size !==
    input.choices.length
  )
    throw new Error("A bundle can contain each service once.");
  let subtotal = 0;
  let flightDetails = input.flightDetails;
  let hotelDetails = input.hotelDetails;
  let transportDetails = input.transportDetails;
  const items: Array<{
    type: string;
    details: Record<string, unknown>;
    price: number;
  }> = [];
  for (const choice of input.choices) {
    const travelDate = choice.type === "hotel" ? choice.checkIn : choice.date;
    if (travelDate < new Date().toISOString().slice(0, 10))
      throw new Error("Choose a current or future travel date.");
    if (choice.type === "flight") {
      if (choice.origin === choice.destination)
        throw new Error("Departure and arrival airports must differ.");
      const flight = generateMockFlights({
        originCode: choice.origin,
        destinationCode: choice.destination,
        departureDate: choice.date,
        cabinClass: choice.cabin,
        passengers: choice.passengers,
      }).find((item) => item.id === choice.id);
      if (
        !flight ||
        destinationKey(flight.destinationAirport.city) !==
          destinationKey(input.destination) ||
        choice.passengers > flight.seatsAvailable[choice.cabin]
      )
        throw new Error("Flight unavailable for the selected destination.");
      const amount = flight.prices[choice.cabin] * choice.passengers;
      subtotal += amount;
      flightDetails = {
        ...flightDetails,
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        originAirport: flight.originAirport.code,
        destinationAirport: flight.destinationAirport.code,
        originCity: flight.originAirport.city,
        destinationCity: flight.destinationAirport.city,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        cabinClass: choice.cabin,
        passengers: choice.passengers,
      };
      items.push({ type: "flight", details: { flight }, price: amount });
    } else if (choice.type === "hotel") {
      if (
        choice.checkOut <= choice.checkIn ||
        calculateNights(choice.checkIn, choice.checkOut) > 60
      )
        throw new Error("Choose a hotel stay between one and sixty nights.");
      const hotel = generateMockHotels({
        location: input.destination,
        checkInDate: choice.checkIn,
        checkOutDate: choice.checkOut,
        rooms: choice.rooms,
        guests: choice.guests,
      }).find((item) => item.id === choice.id);
      if (
        !hotel ||
        destinationKey(hotel.city) !== destinationKey(input.destination)
      )
        throw new Error("Hotel unavailable for this destination.");
      const amount =
        hotel.roomRates[choice.roomType] *
        calculateNights(choice.checkIn, choice.checkOut) *
        choice.rooms;
      subtotal += amount;
      hotelDetails = {
        ...hotelDetails,
        hotelName: hotel.name,
        city: hotel.city,
        address: hotel.address,
        nightlyRate: hotel.roomRates[choice.roomType],
        roomType: choice.roomType,
        checkInDate: choice.checkIn,
        checkOutDate: choice.checkOut,
        numberOfRooms: choice.rooms,
        numberOfGuests: choice.guests,
      };
      items.push({ type: "hotel", details: { hotel }, price: amount });
    } else {
      const transport = generateTransportOptions(
        choice.origin,
        input.destination,
        choice.date,
        "all",
      ).find((item) => item.id === choice.id);
      if (
        !transport ||
        destinationKey(transport.destinationCity) !==
          destinationKey(input.destination) ||
        choice.passengers > transport.maxPassengers
      )
        throw new Error("Transport unavailable for this destination.");
      const amount =
        transport.basePrice *
        (["train", "bus", "ferry"].includes(transport.transportType)
          ? choice.passengers
          : transport.transportType === "car_rental"
            ? choice.days || 1
            : 1);
      subtotal += amount;
      transportDetails = {
        ...transportDetails,
        providerName: transport.providerName,
        transportType: transport.transportType,
        destinationCity: transport.destinationCity,
        originCity: transport.originCity,
        originLocation: transport.originLocation,
        destinationLocation: transport.destinationLocation,
        scheduledDeparture: transport.scheduledDeparture,
        vehicleClass: transport.vehicleClass,
        rentalDays:
          transport.transportType === "car_rental"
            ? choice.days || 1
            : undefined,
        passengerCount: choice.passengers,
      };
      items.push({ type: "transport", details: { transport }, price: amount });
    }
  }
  const discount =
    input.bookingType === "package"
      ? Math.round(
          subtotal * (items.length >= 3 ? 0.15 : items.length === 2 ? 0.1 : 0),
        )
      : 0;
  const tax =
    input.bookingType === "package"
      ? Math.round((subtotal - discount) * 0.05)
      : 0;
  const totalAmount = subtotal - discount + tax;
  if (!Number.isSafeInteger(totalAmount * 100) || totalAmount <= 0)
    throw new Error("Invalid reservation total.");
  return {
    tripId: input.tripId,
    travelMode: input.travelMode,
    destination: input.destination,
    bookingType: input.bookingType,
    totalAmount,
    currency: "INR",
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    specialRequests: input.specialRequests,
    flightDetails: input.bookingType === "flight" ? flightDetails : undefined,
    hotelDetails: input.bookingType === "hotel" ? hotelDetails : undefined,
    transportDetails:
      input.bookingType === "transport" ? transportDetails : undefined,
    details: input.bookingType === "package" ? { items } : undefined,
    choices: input.choices,
  };
}
