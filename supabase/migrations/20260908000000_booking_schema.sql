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
