-- ============================================================================
-- VOYANA: SUPABASE STORAGE & TRAVEL MEMORIES MIGRATION
-- Replaces Firebase Cloud Storage & Firestore with Supabase Storage + PostgreSQL
-- Project: voyanaDB
-- ============================================================================

-- 1. Create Travel Memories Table
CREATE TABLE IF NOT EXISTS public.trip_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    uploaded_by VARCHAR(150) NOT NULL,
    title VARCHAR(255) NOT NULL,
    location_name VARCHAR(255),
    caption TEXT,
    image_url TEXT NOT NULL,
    media_type VARCHAR(20) DEFAULT 'photo', -- 'photo' | 'video'
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    likes TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_trip_memories_trip_id ON public.trip_memories(trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_memories_date ON public.trip_memories(date DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.trip_memories ENABLE ROW LEVEL SECURITY;

-- 4. Permissive / Public RLS Policies for trip_memories
DROP POLICY IF EXISTS "Allow select trip_memories" ON public.trip_memories;
CREATE POLICY "Allow select trip_memories" ON public.trip_memories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert trip_memories" ON public.trip_memories;
CREATE POLICY "Allow insert trip_memories" ON public.trip_memories
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update trip_memories" ON public.trip_memories;
CREATE POLICY "Allow update trip_memories" ON public.trip_memories
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete trip_memories" ON public.trip_memories;
CREATE POLICY "Allow delete trip_memories" ON public.trip_memories
    FOR DELETE USING (true);

-- 5. Enable Supabase Realtime Replication for Instant Multi-User Updates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'trip_memories'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_memories;
    END IF;
END $$;

-- 6. Storage Buckets Creation (trip-memories & trip-documents)
-- Automatically creates the buckets if they do not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'trip-memories', 
    'trip-memories', 
    true, 
    52428800, -- 50 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'trip-documents', 
    'trip-documents', 
    true, 
    20971520, -- 20 MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 7. Supabase Storage RLS Policies (Allow viewing and uploading media)
DROP POLICY IF EXISTS "Public View trip-memories" ON storage.objects;
CREATE POLICY "Public View trip-memories"
ON storage.objects FOR SELECT
USING ( bucket_id = 'trip-memories' );

DROP POLICY IF EXISTS "Public Upload trip-memories" ON storage.objects;
CREATE POLICY "Public Upload trip-memories"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'trip-memories' );

DROP POLICY IF EXISTS "Public Delete trip-memories" ON storage.objects;
CREATE POLICY "Public Delete trip-memories"
ON storage.objects FOR DELETE
USING ( bucket_id = 'trip-memories' );

DROP POLICY IF EXISTS "Public View trip-documents" ON storage.objects;
CREATE POLICY "Public View trip-documents"
ON storage.objects FOR SELECT
USING ( bucket_id = 'trip-documents' );

DROP POLICY IF EXISTS "Public Upload trip-documents" ON storage.objects;
CREATE POLICY "Public Upload trip-documents"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'trip-documents' );
