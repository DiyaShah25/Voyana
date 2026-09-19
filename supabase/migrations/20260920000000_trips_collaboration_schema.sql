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
INSERT INTO public.trips (
    owner_id, title, destination, country, start_date, end_date,
    description, cover_image, visibility, budget_target, tags, is_template
) VALUES
(
    '00000000-0000-0000-0000-000000000000',
    'Parisian Dream: 5 Days in Lights & Art',
    'Paris', 'France',
    CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '19 days',
    'Experience the Louvre, Eiffel Tower sunset champagne, Montmartre art walks, and Seine River gourmet dinner.',
    'https://images.pexels.com/photos/14681748/pexels-photo-14681748.jpeg?auto=compress&cs=tinysrgb&w=800',
    'public', 2400.00,
    ARRAY['Romantic', 'Art & Culture', 'Gastronomy', 'Classic'],
    TRUE
),
(
    '00000000-0000-0000-0000-000000000000',
    'Tokyo Neon & Tradition: 7-Day Sakura Trail',
    'Tokyo', 'Japan',
    CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '37 days',
    'From Shibuya scramble and Akihabara tech culture to Senso-ji Temple and Shinkansen day trip to Kyoto.',
    'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=800',
    'public', 3200.00,
    ARRAY['Nightlife', 'Anime & Tech', 'Heritage', 'Culinary'],
    TRUE
),
(
    '00000000-0000-0000-0000-000000000000',
    'Dubai Luxury Oasis & Desert Safari: 4 Days',
    'Dubai', 'United Arab Emirates',
    CURRENT_DATE + INTERVAL '45 days', CURRENT_DATE + INTERVAL '49 days',
    'Burj Khalifa observatory, Palm Jumeirah luxury yacht cruise, and sunset dune bashing with Bedouin feast.',
    'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=800',
    'public', 1950.00,
    ARRAY['Luxury', 'Adventure', 'Shopping', 'Architecture'],
    TRUE
)
ON CONFLICT DO NOTHING;
