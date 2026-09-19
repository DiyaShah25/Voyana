-- ==============================================================================
-- Voyana Travel Platform — Database Migration
-- Domain: Transport Booking Services (VPM-213 / Epic VPM-6)
-- Author: Bhavika Sainani (Backend — Booking Services & Payment Integration)
-- Date: September 2026
-- ==============================================================================

-- 1. Ensure Table Structure & Constraints for Transport Catalog
CREATE TABLE IF NOT EXISTS public.transport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(150) NOT NULL,
    transport_type transport_type NOT NULL,
    origin_location VARCHAR(200) NOT NULL,
    destination_location VARCHAR(200) NOT NULL,
    origin_city VARCHAR(100),
    destination_city VARCHAR(100),
    scheduled_departure TIMESTAMPTZ NOT NULL,
    scheduled_arrival TIMESTAMPTZ,
    duration_minutes INTEGER,
    vehicle_model VARCHAR(100),
    vehicle_class VARCHAR(50) DEFAULT 'Standard',
    max_passengers INTEGER DEFAULT 4,
    baggage_capacity INTEGER DEFAULT 2,
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    operator_rating NUMERIC(2, 1) DEFAULT 4.8 CHECK (operator_rating >= 0 AND operator_rating <= 5),
    amenities TEXT[] DEFAULT ARRAY['Air Conditioning', 'Luggage Assistance'],
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.transport IS 'Master catalog of ground transport routes (trains, shuttles, car rentals, transfers).';

-- 2. Performance Indexes for Transport Queries
CREATE INDEX IF NOT EXISTS idx_transport_origin_city ON public.transport(origin_city);
CREATE INDEX IF NOT EXISTS idx_transport_dest_city ON public.transport(destination_city);
CREATE INDEX IF NOT EXISTS idx_transport_type ON public.transport(transport_type);
CREATE INDEX IF NOT EXISTS idx_transport_departure ON public.transport(scheduled_departure);
CREATE INDEX IF NOT EXISTS idx_transport_price ON public.transport(base_price);

-- 3. Seed Comprehensive Transport Catalog
INSERT INTO public.transport (
    provider_name, transport_type, origin_location, destination_location,
    origin_city, destination_city, scheduled_departure, scheduled_arrival,
    duration_minutes, vehicle_model, vehicle_class, max_passengers, baggage_capacity,
    base_price, currency, operator_rating, amenities, image_url
) VALUES
-- Paris <-> London Eurostar
(
    'Eurostar International', 'train', 'Paris Gare du Nord', 'London St Pancras International',
    'Paris', 'London', NOW() + INTERVAL '1 day 08 hours', NOW() + INTERVAL '1 day 10 hours 18 minutes',
    138, 'e320 High-Speed Rail', 'Standard Premier', 200, 2,
    145.00, 'USD', 4.9,
    ARRAY['High-Speed WiFi', 'Power Sockets', 'At-Seat Meal Service', 'Generous Luggage'],
    'https://images.pexels.com/photos/163016/railroad-train-tracks-locomotive-163016.jpeg?auto=compress&cs=tinysrgb&w=800'
),
-- Paris CDG Airport Transfer
(
    'Paris Executive Chauffeur', 'private_transfer', 'Paris Charles de Gaulle Airport (CDG)', 'Eiffel Tower / Central Paris',
    'Paris', 'Paris', NOW() + INTERVAL '1 day 09 hours', NOW() + INTERVAL '1 day 09 hours 45 minutes',
    45, 'Mercedes-Benz E-Class Sedan', 'Executive Luxury', 3, 3,
    95.00, 'USD', 4.95,
    ARRAY['Flight Tracking', 'Meet & Greet with Name Sign', 'Bottled Mineral Water', 'Free 60m Wait Time'],
    'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800'
),
-- Paris Luxury Car Rental
(
    'Sixt France Luxury Fleet', 'car_rental', 'Paris Gare de Lyon', 'Paris Gare de Lyon Dropoff',
    'Paris', 'Paris', NOW() + INTERVAL '1 day 10 hours', NOW() + INTERVAL '2 days 10 hours',
    1440, 'BMW 4 Series Gran Coupé', 'Premium Coupe', 4, 3,
    120.00, 'USD', 4.8,
    ARRAY['Unlimited Mileage', 'GPS Navigation Included', 'Collision Damage Waiver', 'Full-to-Full Fuel'],
    'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800'
),
-- Tokyo Shinkansen (Tokyo to Kyoto)
(
    'JR Central Shinkansen', 'train', 'Tokyo Station', 'Kyoto Station',
    'Tokyo', 'Kyoto', NOW() + INTERVAL '1 day 07 hours', NOW() + INTERVAL '1 day 09 hours 15 minutes',
    135, 'N700S Series Bullet Train', 'Green Car (First Class)', 150, 2,
    160.00, 'USD', 4.98,
    ARRAY['Ultra-Smooth 285 km/h Ride', 'Quiet Car Experience', 'Reclining Footrest', 'Bento Box Cart'],
    'https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg?auto=compress&cs=tinysrgb&w=800'
),
-- Tokyo Narita Airport Express
(
    'Narita Express (N''EX)', 'train', 'Narita International Airport (NRT)', 'Shinjuku Station, Tokyo',
    'Tokyo', 'Tokyo', NOW() + INTERVAL '1 day 06 hours 30 minutes', NOW() + INTERVAL '1 day 07 hours 25 minutes',
    55, 'E259 Series Express', 'Reserved Standard', 180, 2,
    32.00, 'USD', 4.85,
    ARRAY['Luggage Lockers with PIN', 'Direct City Center Line', 'Free WiFi', 'Multi-Language Display'],
    'https://images.pexels.com/photos/7245258/pexels-photo-7245258.jpeg?auto=compress&cs=tinysrgb&w=800'
),
-- Dubai Airport VIP Transfer
(
    'Royal Emirates Limousine', 'private_transfer', 'Dubai International Airport (DXB)', 'Burj Khalifa / Downtown Dubai',
    'Dubai', 'Dubai', NOW() + INTERVAL '1 day 11 hours', NOW() + INTERVAL '1 day 11 hours 30 minutes',
    30, 'Cadillac Escalade Platinum', 'VIP Luxury SUV', 5, 5,
    85.00, 'USD', 4.96,
    ARRAY['Uniformed Chauffeur', 'Flight Delay Protection', 'Chilled Towels & Refreshments', 'Child Seat Available'],
    'https://images.pexels.com/photos/337909/pexels-photo-337909.jpeg?auto=compress&cs=tinysrgb&w=800'
),
-- Dubai Desert Safari Shuttle
(
    'Arabian Adventures Coach', 'bus', 'Dubai Marina Mall', 'Al Marmoom Desert Reserve',
    'Dubai', 'Dubai Desert', NOW() + INTERVAL '1 day 15 hours', NOW() + INTERVAL '1 day 16 hours',
    60, 'Mercedes Sprinter VIP Coach', 'Panoramic Tourism', 16, 16,
    40.00, 'USD', 4.88,
    ARRAY['Air Conditioned Coach', 'English-Speaking Guide', 'Dune Tour Transfer', 'Sunset Photo Stop'],
    'https://images.pexels.com/photos/681335/pexels-photo-681335.jpeg?auto=compress&cs=tinysrgb&w=800'
),
-- New York JFK Airport Transfer
(
    'NYC Airporter Express', 'private_transfer', 'John F. Kennedy Airport (JFK)', 'Times Square / Midtown Manhattan',
    'New York', 'New York', NOW() + INTERVAL '1 day 14 hours', NOW() + INTERVAL '1 day 15 hours',
    60, 'Chevrolet Suburban Luxury SUV', 'Black Car Service', 4, 4,
    90.00, 'USD', 4.82,
    ARRAY['Toll & Tip Included', 'Realtime Curbside Pickup', 'Phone Chargers', 'Spacious Cargo Space'],
    'https://images.pexels.com/photos/290386/pexels-photo-290386.jpeg?auto=compress&cs=tinysrgb&w=800'
),
-- Ahmedabad to Mumbai Vande Bharat Express
(
    'Indian Railways IRCTC', 'train', 'Ahmedabad Junction (ADI)', 'Mumbai Central (MMCT)',
    'Ahmedabad', 'Mumbai', NOW() + INTERVAL '1 day 06 hours 10 minutes', NOW() + INTERVAL '1 day 11 hours 35 minutes',
    325, 'Vande Bharat 2.0 Semi-High Speed', 'Executive AC Chair Car', 120, 2,
    30.00, 'USD', 4.86,
    ARRAY['160 km/h Semi High Speed', 'Hot Gourmet Meals Included', 'Rotatable Seats', 'Bio-Vacuum Toilets'],
    'https://images.pexels.com/photos/103123/pexels-photo-103123.jpeg?auto=compress&cs=tinysrgb&w=800'
),
-- Ahmedabad Airport City Taxi
(
    'Gujarat Heritage Cab & Transfers', 'private_transfer', 'Sardar Vallabhbhai Patel Airport (AMD)', 'Sabarmati Ashram / City Center',
    'Ahmedabad', 'Ahmedabad', NOW() + INTERVAL '1 day 10 hours', NOW() + INTERVAL '1 day 10 hours 35 minutes',
    35, 'Toyota Innova Crysta', 'AC Premium Sedan/SUV', 5, 4,
    22.00, 'USD', 4.9,
    ARRAY['Clean Sanitized Cabin', 'Luggage Helper', 'Local Sightseeing Advice', 'Prepaid Confirmed Fare'],
    'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=800'
)
ON CONFLICT DO NOTHING;
