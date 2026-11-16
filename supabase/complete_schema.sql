-- ==============================================================================
-- Voyana Travel Platform — Database Migration
-- Domain: Booking Services (Flights, Hotels, Transport) & Alert Automation
-- Issue: VPM-28 (Review Database Design)
-- Author: Bhavika Sainani (Backend — Booking Services & Payment Integration)
-- Date: September 2026
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. ENUM TYPES
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE booking_type AS ENUM ('flight', 'hotel', 'transport', 'package');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'delayed', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('unpaid', 'authorized', 'paid', 'refunded', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE flight_cabin_class AS ENUM ('economy', 'premium_economy', 'business', 'first');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transport_type AS ENUM ('train', 'bus', 'private_transfer', 'car_rental', 'ferry');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM ('info', 'success', 'warning', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. CORE BOOKINGS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_reference VARCHAR(20) NOT NULL UNIQUE,
    booking_type booking_type NOT NULL,
    status booking_status NOT NULL DEFAULT 'pending',
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_status payment_status NOT NULL DEFAULT 'unpaid',
    payment_reference VARCHAR(100),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    special_requests TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.bookings IS 'Central booking records binding customer, status, pricing, and payment state.';
COMMENT ON COLUMN public.bookings.booking_reference IS 'Human-readable unique reservation identifier (e.g. VYN-104928).';

-- ==============================================================================
-- 3. FLIGHTS INVENTORY & FLIGHT BOOKINGS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.flights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_number VARCHAR(20) NOT NULL,
    airline VARCHAR(100) NOT NULL,
    airline_code VARCHAR(10) NOT NULL,
    origin_airport VARCHAR(4) NOT NULL,      -- IATA/ICAO code (e.g. JFK, CDG, BOM)
    destination_airport VARCHAR(4) NOT NULL, -- IATA/ICAO code
    origin_city VARCHAR(100) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    departure_time TIMESTAMPTZ NOT NULL,
    arrival_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    terminal VARCHAR(20),
    gate VARCHAR(20),
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.flights IS 'Master catalog of flight schedules and routes.';

CREATE TABLE IF NOT EXISTS public.flight_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    flight_id UUID NOT NULL REFERENCES public.flights(id) ON DELETE RESTRICT,
    passenger_name VARCHAR(150) NOT NULL,
    passport_number VARCHAR(50),
    seat_number VARCHAR(10),
    cabin_class flight_cabin_class NOT NULL DEFAULT 'economy',
    ticket_number VARCHAR(50),
    baggage_allowance_kg INTEGER DEFAULT 20 CHECK (baggage_allowance_kg >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.flight_bookings IS 'Detailed reservation and passenger details for flight segments.';

-- ==============================================================================
-- 4. HOTELS INVENTORY & HOTEL BOOKINGS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    star_rating NUMERIC(2, 1) CHECK (star_rating >= 0 AND star_rating <= 5),
    image_url TEXT,
    contact_phone VARCHAR(50),
    base_nightly_rate NUMERIC(10, 2) NOT NULL CHECK (base_nightly_rate >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.hotels IS 'Master catalog of hotel accommodations and properties.';

CREATE TABLE IF NOT EXISTS public.hotel_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT,
    room_type VARCHAR(100) NOT NULL DEFAULT 'Standard Deluxe',
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    number_of_guests INTEGER NOT NULL DEFAULT 1 CHECK (number_of_guests > 0),
    number_of_rooms INTEGER NOT NULL DEFAULT 1 CHECK (number_of_rooms > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_valid_hotel_dates CHECK (check_out_date > check_in_date)
);

COMMENT ON TABLE public.hotel_bookings IS 'Hotel stay reservations linked to master booking.';

-- ==============================================================================
-- 5. TRANSPORT INVENTORY & TRANSPORT BOOKINGS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.transport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(150) NOT NULL,
    transport_type transport_type NOT NULL,
    origin_location VARCHAR(200) NOT NULL,
    destination_location VARCHAR(200) NOT NULL,
    scheduled_departure TIMESTAMPTZ NOT NULL,
    scheduled_arrival TIMESTAMPTZ,
    vehicle_model VARCHAR(100),
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.transport IS 'Master catalog of ground transport routes (trains, shuttles, car rentals).';

CREATE TABLE IF NOT EXISTS public.transport_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    transport_id UUID NOT NULL REFERENCES public.transport(id) ON DELETE RESTRICT,
    passenger_count INTEGER NOT NULL DEFAULT 1 CHECK (passenger_count > 0),
    pickup_notes TEXT,
    dropoff_notes TEXT,
    license_plate VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.transport_bookings IS 'Detailed ground transport reservations linked to master booking.';

-- ==============================================================================
-- 6. STATUS AUDIT LOG & ALERT NOTIFICATIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.booking_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    old_status booking_status,
    new_status booking_status NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.booking_status_history IS 'Immutable audit trail of all booking status transitions.';

CREATE TABLE IF NOT EXISTS public.booking_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    severity alert_severity NOT NULL DEFAULT 'info',
    old_status booking_status,
    new_status booking_status NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.booking_alerts IS 'User notifications generated on booking state alterations.';

-- ==============================================================================
-- 7. PERFORMANCE INDEXES
-- ==============================================================================

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON public.bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);

-- Subtype join indexes
CREATE INDEX IF NOT EXISTS idx_flight_bookings_booking_id ON public.flight_bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_flight_id ON public.flight_bookings(flight_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_booking_id ON public.hotel_bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_hotel_id ON public.hotel_bookings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_transport_bookings_booking_id ON public.transport_bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_transport_bookings_transport_id ON public.transport_bookings(transport_id);

-- Alerts & audit indexes
CREATE INDEX IF NOT EXISTS idx_booking_alerts_user_id ON public.booking_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_alerts_unread ON public.booking_alerts(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_booking_alerts_created_at ON public.booking_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_booking_id ON public.booking_status_history(booking_id);

-- ==============================================================================
-- 8. AUTOMATION TRIGGERS & FUNCTIONS
-- ==============================================================================

-- 8.1 Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_updated_at();

-- 8.2 Booking status transition handler (Audit log + Alert generation)
CREATE OR REPLACE FUNCTION public.fn_handle_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
    alert_title VARCHAR(200);
    alert_msg TEXT;
    alert_sev alert_severity;
BEGIN
    -- Only trigger if status has genuinely transitioned
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- 1. Insert audit trail record
        INSERT INTO public.booking_status_history (
            booking_id,
            changed_by,
            old_status,
            new_status,
            reason
        ) VALUES (
            NEW.id,
            NEW.user_id,
            OLD.status,
            NEW.status,
            COALESCE(NEW.metadata->>'status_change_reason', 'Status transition triggered')
        );

        -- 2. Determine contextual alert copy and severity
        CASE NEW.status
            WHEN 'confirmed' THEN
                alert_title := 'Booking Confirmed';
                alert_msg   := 'Your reservation ' || NEW.booking_reference || ' has been successfully confirmed. E-tickets are available in your trips tab.';
                alert_sev   := 'success';
            WHEN 'delayed' THEN
                alert_title := 'Schedule Update / Delay';
                alert_msg   := 'Your reservation ' || NEW.booking_reference || ' is experiencing a schedule delay. Please check your updated itinerary.';
                alert_sev   := 'warning';
            WHEN 'cancelled' THEN
                alert_title := 'Booking Cancelled';
                alert_msg   := 'Your reservation ' || NEW.booking_reference || ' has been cancelled. Any applicable refund will be credited to your original payment method.';
                alert_sev   := 'critical';
            WHEN 'completed' THEN
                alert_title := 'Trip Completed';
                alert_msg   := 'Your journey with reservation ' || NEW.booking_reference || ' is complete. Thank you for traveling with Voyana!';
                alert_sev   := 'info';
            ELSE
                alert_title := 'Booking Status Updated';
                alert_msg   := 'Reservation ' || NEW.booking_reference || ' status changed to ' || NEW.status || '.';
                alert_sev   := 'info';
        END CASE;

        -- 3. Insert notification into booking_alerts table
        INSERT INTO public.booking_alerts (
            user_id,
            booking_id,
            title,
            message,
            severity,
            old_status,
            new_status,
            is_read
        ) VALUES (
            NEW.user_id,
            NEW.id,
            alert_title,
            alert_msg,
            alert_sev,
            OLD.status,
            NEW.status,
            FALSE
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_status_change ON public.bookings;
CREATE TRIGGER trg_booking_status_change
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_handle_booking_status_change();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_alerts ENABLE ROW LEVEL SECURITY;

-- Policies are dropped and recreated so this migration can be re-run safely.
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can view flight catalog" ON public.flights;
DROP POLICY IF EXISTS "Anyone can view hotel catalog" ON public.hotels;
DROP POLICY IF EXISTS "Anyone can view transport catalog" ON public.transport;
DROP POLICY IF EXISTS "Users can view their own flight bookings" ON public.flight_bookings;
DROP POLICY IF EXISTS "Users can view their own hotel bookings" ON public.hotel_bookings;
DROP POLICY IF EXISTS "Users can view their own transport bookings" ON public.transport_bookings;
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.booking_alerts;
DROP POLICY IF EXISTS "Users can update their own alert read status" ON public.booking_alerts;
DROP POLICY IF EXISTS "Users can view their own booking status history" ON public.booking_status_history;

-- 9.1 Bookings RLS
CREATE POLICY "Users can view their own bookings"
    ON public.bookings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
    ON public.bookings FOR UPDATE
    USING (auth.uid() = user_id);

-- 9.2 Catalogs (Public / Authenticated read access)
CREATE POLICY "Anyone can view flight catalog"
    ON public.flights FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Anyone can view hotel catalog"
    ON public.hotels FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Anyone can view transport catalog"
    ON public.transport FOR SELECT
    TO public
    USING (true);

-- 9.3 Subtype Bookings RLS (Linked to user's parent booking)
CREATE POLICY "Users can view their own flight bookings"
    ON public.flight_bookings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.id = flight_bookings.booking_id
        AND bookings.user_id = auth.uid()
    ));

CREATE POLICY "Users can view their own hotel bookings"
    ON public.hotel_bookings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.id = hotel_bookings.booking_id
        AND bookings.user_id = auth.uid()
    ));

CREATE POLICY "Users can view their own transport bookings"
    ON public.transport_bookings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.id = transport_bookings.booking_id
        AND bookings.user_id = auth.uid()
    ));

-- 9.4 Booking Alerts RLS
CREATE POLICY "Users can view their own alerts"
    ON public.booking_alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert read status"
    ON public.booking_alerts FOR UPDATE
    USING (auth.uid() = user_id);

-- 9.5 Booking Status History RLS
CREATE POLICY "Users can view their own booking status history"
    ON public.booking_status_history FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.id = booking_status_history.booking_id
        AND bookings.user_id = auth.uid()
    ));

-- ==============================================================================
-- 10. REALTIME PUBLICATION SETUP
-- ==============================================================================

-- Enable realtime streaming for booking records and alerts
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_alerts;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
-- ==============================================================================
-- Voyana Travel Platform — Database Migration
-- Domain: Expense & Payment Integration (VPM-68 / Epic VPM-7)
-- Author: Bhavika Sainani (Backend — Booking Services & Payment Integration)
-- Date: September 2026
-- ==============================================================================

-- 1. Ensure idempotent columns on bookings
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('unpaid', 'authorized', 'paid', 'refunded', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS payment_status payment_status NOT NULL DEFAULT 'unpaid';

ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);

-- ==============================================================================
-- 2. PAYMENTS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50) NOT NULL, -- e.g. 'credit_card', 'apple_pay', 'google_pay', 'paypal'
    transaction_reference VARCHAR(100) NOT NULL UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payments IS 'Ledger of all payment transactions and gateway authorizations bound to master bookings.';
COMMENT ON COLUMN public.payments.transaction_reference IS 'Unique human-readable transaction identifier (e.g. TXN-20260916-A8F9K2).';

-- ==============================================================================
-- 3. PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_ref ON public.payments(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- ==============================================================================
-- 4. AUTOMATION TRIGGERS
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_updated_at();

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies are dropped and recreated so this migration can be re-run safely.
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;

CREATE POLICY "Users can view their own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments"
    ON public.payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments"
    ON public.payments FOR UPDATE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 6. REALTIME PUBLICATION
-- ==============================================================================

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
-- ==============================================================================
-- Voyana Travel Platform — Database Migration
-- Domain: Transport Booking Services (VPM-213 / Epic VPM-6)
-- Author: Bhavika Sainani (Backend — Booking Services & Payment Integration)
-- Date: September 2026
-- ==============================================================================

-- 1. Ensure ENUM type exists (booking schema normally creates it first)
DO $$ BEGIN
    CREATE TYPE transport_type AS ENUM ('train', 'bus', 'private_transfer', 'car_rental', 'ferry');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Ensure Table Structure & Constraints for Transport Catalog
-- The booking schema (20260908000000) already creates a minimal public.transport
-- table, so CREATE TABLE IF NOT EXISTS is a no-op on an existing database.
CREATE TABLE IF NOT EXISTS public.transport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(150) NOT NULL,
    transport_type transport_type NOT NULL,
    origin_location VARCHAR(200) NOT NULL,
    destination_location VARCHAR(200) NOT NULL,
    scheduled_departure TIMESTAMPTZ NOT NULL,
    scheduled_arrival TIMESTAMPTZ,
    vehicle_model VARCHAR(100),
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extend the catalog with the richer columns this domain needs.
ALTER TABLE public.transport
    ADD COLUMN IF NOT EXISTS origin_city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS destination_city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS vehicle_class VARCHAR(50) DEFAULT 'Standard',
    ADD COLUMN IF NOT EXISTS max_passengers INTEGER DEFAULT 4,
    ADD COLUMN IF NOT EXISTS baggage_capacity INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS operator_rating NUMERIC(2, 1) DEFAULT 4.8
        CHECK (operator_rating >= 0 AND operator_rating <= 5),
    ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT ARRAY['Air Conditioning', 'Luggage Assistance'],
    ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON TABLE public.transport IS 'Master catalog of ground transport routes (trains, shuttles, car rentals, transfers).';

-- 3. Performance Indexes for Transport Queries
CREATE INDEX IF NOT EXISTS idx_transport_origin_city ON public.transport(origin_city);
CREATE INDEX IF NOT EXISTS idx_transport_dest_city ON public.transport(destination_city);
CREATE INDEX IF NOT EXISTS idx_transport_type ON public.transport(transport_type);
CREATE INDEX IF NOT EXISTS idx_transport_departure ON public.transport(scheduled_departure);
CREATE INDEX IF NOT EXISTS idx_transport_price ON public.transport(base_price);

-- 4. Seed Comprehensive Transport Catalog (idempotent: skipped when already seeded)
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM public.transport) THEN
    RETURN;
END IF;

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

END $$;
-- ==============================================================================
-- Voyana Travel Platform — Database Migration
-- Domain: Trip Planning (VPM-4) & Collaboration Workspace (VPM-8)
-- Author: Megha Lalwani (Backend — Trip Management & Collaboration)
-- Date: September 2026
-- ==============================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE trip_visibility AS ENUM ('private', 'shared', 'public');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trip_member_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TRIPS TABLE
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    destination VARCHAR(150) NOT NULL,
    country VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    cover_image TEXT,
    visibility trip_visibility NOT NULL DEFAULT 'shared',
    budget_target NUMERIC(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_trip_dates CHECK (end_date >= start_date)
);

COMMENT ON TABLE public.trips IS 'Core trips table storing title, destinations, dates, and budget targets.';

-- 4. TRIP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.trip_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(150),
    avatar_url TEXT,
    role trip_member_role NOT NULL DEFAULT 'editor',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_trip_member UNIQUE (trip_id, email)
);

COMMENT ON TABLE public.trip_members IS 'Collaborators assigned to a trip workspace with role permissions.';

-- 5. TRIP ACTIVITIES / ITINERARY
CREATE TABLE IF NOT EXISTS public.trip_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL DEFAULT 1,
    activity_date DATE,
    time_slot VARCHAR(20), -- e.g. "09:00 AM", "Afternoon"
    title VARCHAR(250) NOT NULL,
    location_name VARCHAR(250),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    description TEXT,
    cost NUMERIC(10, 2) DEFAULT 0,
    category VARCHAR(50) DEFAULT 'Sightseeing',
    booking_reference VARCHAR(50),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TRIP CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.trip_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_name VARCHAR(150) NOT NULL,
    sender_avatar TEXT,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'activity_log', 'poll_share', 'image'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TRIP TASKS / SHARED CHECKLIST
CREATE TABLE IF NOT EXISTS public.trip_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    title VARCHAR(250) NOT NULL,
    description TEXT,
    assigned_to VARCHAR(150),
    assigned_email VARCHAR(255),
    due_date DATE,
    status task_status NOT NULL DEFAULT 'todo',
    category VARCHAR(50) DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TRIP POLLS & VOTES
CREATE TABLE IF NOT EXISTS public.trip_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    question VARCHAR(300) NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, text, vote_count }
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trip_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.trip_polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    voter_name VARCHAR(150) NOT NULL,
    selected_option_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_poll_vote UNIQUE (poll_id, user_id)
);

-- 9. TRIP DOCUMENTS REPOSITORY
CREATE TABLE IF NOT EXISTS public.trip_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    uploader_name VARCHAR(150) NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- 'flight_ticket', 'hotel_voucher', 'visa', 'passport', 'other'
    file_url TEXT,
    file_size_kb INTEGER DEFAULT 0,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_trips_owner_id ON public.trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON public.trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON public.trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_activities_trip_id ON public.trip_activities(trip_id, day_number);
CREATE INDEX IF NOT EXISTS idx_trip_chat_trip_id ON public.trip_chat_messages(trip_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_trip_tasks_trip_id ON public.trip_tasks(trip_id, status);
CREATE INDEX IF NOT EXISTS idx_trip_polls_trip_id ON public.trip_polls(trip_id);

-- 11. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_documents ENABLE ROW LEVEL SECURITY;

-- Policies are dropped and recreated so this migration can be re-run safely.
DROP POLICY IF EXISTS "Users can view trips they own or belong to" ON public.trips;
DROP POLICY IF EXISTS "Users can create their own trips" ON public.trips;
DROP POLICY IF EXISTS "Owners and editors can update trips" ON public.trips;

CREATE POLICY "Users can view trips they own or belong to"
    ON public.trips FOR SELECT
    USING (
        auth.uid() = owner_id OR
        EXISTS (SELECT 1 FROM public.trip_members WHERE trip_members.trip_id = trips.id AND trip_members.user_id = auth.uid()) OR
        visibility = 'public'
    );

CREATE POLICY "Users can create their own trips"
    ON public.trips FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and editors can update trips"
    ON public.trips FOR UPDATE
    USING (
        auth.uid() = owner_id OR
        EXISTS (SELECT 1 FROM public.trip_members WHERE trip_members.trip_id = trips.id AND trip_members.user_id = auth.uid() AND role IN ('owner', 'editor'))
    );

-- 12. SEED CURATED TRIP TEMPLATES
-- owner_id has a foreign key to auth.users, so templates are attributed to the
-- earliest existing user. Seeding is skipped when templates already exist or
-- when no user has signed up yet (safe to re-run after the first signup).
DO $$
DECLARE
    template_owner UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM public.trips WHERE is_template) THEN
        RETURN;
    END IF;

    SELECT id INTO template_owner FROM auth.users ORDER BY created_at LIMIT 1;
    IF template_owner IS NULL THEN
        RAISE NOTICE 'Skipping trip template seed: auth.users is empty. Re-run this file after creating a user.';
        RETURN;
    END IF;

    INSERT INTO public.trips (
        owner_id, title, destination, country, start_date, end_date,
        description, cover_image, visibility, budget_target, tags, is_template
    ) VALUES
    (
        template_owner,
        'Parisian Dream: 5 Days in Lights & Art',
        'Paris', 'France',
        CURRENT_DATE + 14, CURRENT_DATE + 19,
        'Experience the Louvre, Eiffel Tower sunset champagne, Montmartre art walks, and Seine River gourmet dinner.',
        'https://images.pexels.com/photos/14681748/pexels-photo-14681748.jpeg?auto=compress&cs=tinysrgb&w=800',
        'public', 2400.00,
        ARRAY['Romantic', 'Art & Culture', 'Gastronomy', 'Classic'],
        TRUE
    ),
    (
        template_owner,
        'Tokyo Neon & Tradition: 7-Day Sakura Trail',
        'Tokyo', 'Japan',
        CURRENT_DATE + 30, CURRENT_DATE + 37,
        'From Shibuya scramble and Akihabara tech culture to Senso-ji Temple and Shinkansen day trip to Kyoto.',
        'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=800',
        'public', 3200.00,
        ARRAY['Nightlife', 'Anime & Tech', 'Heritage', 'Culinary'],
        TRUE
    ),
    (
        template_owner,
        'Dubai Luxury Oasis & Desert Safari: 4 Days',
        'Dubai', 'United Arab Emirates',
        CURRENT_DATE + 45, CURRENT_DATE + 49,
        'Burj Khalifa observatory, Palm Jumeirah luxury yacht cruise, and sunset dune bashing with Bedouin feast.',
        'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=800',
        'public', 1950.00,
        ARRAY['Luxury', 'Adventure', 'Shopping', 'Architecture'],
        TRUE
    );
END $$;
-- ============================================================================
-- VPM-122: Travel Reviews & Ratings Schema Migration
-- Assignee: Manav Vyas <manavvyas2004@gmail.com>
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.travel_reviews (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('destination', 'hotel', 'flight', 'transport', 'activity', 'trip')),
  target_id TEXT NOT NULL,
  target_title TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
  category_ratings JSONB DEFAULT '{"cleanliness": 5, "service": 5, "valueForMoney": 5, "location": 5, "safety": 5}'::jsonb,
  title TEXT NOT NULL,
  comment TEXT NOT NULL,
  pros TEXT[] DEFAULT '{}'::text[],
  cons TEXT[] DEFAULT '{}'::text[],
  traveler_type TEXT DEFAULT 'Solo' CHECK (traveler_type IN ('Solo', 'Couples', 'Family', 'Friends', 'Business')),
  visit_date TEXT,
  photos TEXT[] DEFAULT '{}'::text[],
  helpful_votes INT DEFAULT 0,
  voted_users TEXT[] DEFAULT '{}'::text[],
  verified_booking BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_travel_reviews_target ON public.travel_reviews(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_travel_reviews_user ON public.travel_reviews(user_id);
