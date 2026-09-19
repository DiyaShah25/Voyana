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
