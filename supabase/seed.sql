-- ==============================================================================
-- Voyana Travel Platform — Supabase PostgreSQL Seed Script
-- Populates authentic, internally consistent initial seed data for local testing
-- and staging environments across bookings, payments, transports, trips, and reviews.
-- ==============================================================================

-- 1. CLEANUP (Idempotent seed preparation)
TRUNCATE TABLE public.travel_reviews CASCADE;
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.bookings CASCADE;
TRUNCATE TABLE public.trips CASCADE;

-- 2. SEED TRIPS (6+ Realistic Multi-Day Trips)
INSERT INTO public.trips (
    id, owner_id, title, destination, country, start_date, end_date, description,
    cover_image, visibility, budget_target, currency, tags, is_template
) VALUES
(
    'a1000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003', -- Alex Morgan
    'Autumn in Paris & Provence',
    'Paris',
    'France',
    '2026-10-12',
    '2026-10-19',
    'Group getaway with friends exploring Parisian cafes, museums, and vineyard day tours.',
    'https://images.pexels.com/photos/14681748/pexels-photo-14681748.jpeg?auto=compress&cs=tinysrgb&w=800',
    'shared',
    3500.00,
    'USD',
    ARRAY['Friends Trip', 'Sightseeing', 'Autumn'],
    false
),
(
    'a1000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000005', -- Bhavika Sainani
    'Swiss Alpine Panoramas & Glacier Peaks: 5 Days',
    'Zurich',
    'Switzerland',
    '2026-11-10',
    '2026-11-15',
    'Majestic peaks, Gornergrat cogwheel train facing the Matterhorn, Glacier Paradise, and luxury alpine spa in Andermatt.',
    'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=800',
    'public',
    3400.00,
    'CHF',
    ARRAY['Alpine & Peaks', 'Luxury Wellness', 'Glacier Scenic'],
    true
),
(
    'a1000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004', -- Diya Shah
    'Eternal Rome: 6 Days of Classical Antiquity & Culinary Heritage',
    'Rome',
    'Italy',
    '2026-10-22',
    '2026-10-28',
    'Walk through 2,000 years of living history: Colosseum underground, Vatican Sistine Chapel, Pantheon, and Trastevere dining.',
    'https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg?auto=compress&cs=tinysrgb&w=800',
    'public',
    2750.00,
    'EUR',
    ARRAY['Classical Antiquity', 'Architecture', 'Italian Cuisine'],
    true
),
(
    'a1000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000006', -- Jagrat Kumar
    'Tokyo Neon & Tradition: 7-Day Sakura Trail',
    'Tokyo',
    'Japan',
    '2026-11-01',
    '2026-11-08',
    'From Shibuya Scramble and Akihabara electric town to Asakusa Senso-ji Temple and Shinkansen bullet train to Kyoto.',
    'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=800',
    'public',
    3200.00,
    'USD',
    ARRAY['Tech & Anime', 'Heritage', 'Culinary'],
    true
),
(
    'a1000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000007', -- Megha Lalwani
    'Bali Island Sanctuaries & Volcano Sunrise: 7 Days',
    'Bali',
    'Indonesia',
    '2026-11-18',
    '2026-11-25',
    'Emerald Tegallalang rice paddies, Mount Batur sunrise caldera trek, sacred water temples, and Uluwatu cliff sunset.',
    'https://images.pexels.com/photos/2166559/pexels-photo-2166559.jpeg?auto=compress&cs=tinysrgb&w=800',
    'public',
    1850.00,
    'USD',
    ARRAY['Wellness & Island', 'Spiritual', 'Volcano Adventure'],
    true
),
(
    'a1000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000008', -- Tirth Gandhi
    'Dubai Futuristic Marvels & Desert Dunes: 4 Days',
    'Dubai',
    'United Arab Emirates',
    '2026-11-20',
    '2026-11-24',
    'Burj Khalifa observatory, Palm Jumeirah luxury yacht cruise, and sunset dune bashing with Bedouin feast.',
    'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=800',
    'public',
    1950.00,
    'USD',
    ARRAY['Luxury', 'Adventure', 'Architecture'],
    true
);

-- 3. SEED BOOKINGS (15+ across Flights, Hotels, Transports; Status: Confirmed, Pending, Cancelled)
INSERT INTO public.bookings (
    id, user_id, booking_reference, booking_type, status, payment_status, total_amount, currency, payment_reference
) VALUES
-- Confirmed Flights
('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'VOY-FL-881204', 'flight', 'confirmed', 'paid', 842.60, 'USD', 'TXN-20260910-K82M19'),
('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'VOY-FL-185568', 'flight', 'confirmed', 'paid', 784.50, 'USD', 'TXN-20260912-P39Q71'),
('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'VOY-FL-925094', 'flight', 'confirmed', 'paid', 1124.80, 'USD', 'TXN-20260915-Z14L88'),
('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006', 'VOY-FL-585895', 'flight', 'confirmed', 'paid', 1048.20, 'USD', 'TXN-20260918-B99Q12'),
('b0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000007', 'VOY-FL-479112', 'flight', 'confirmed', 'paid', 1340.50, 'USD', 'TXN-20260920-R81L09'),

-- Confirmed Hotels
('b0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', 'VOY-HT-402911', 'hotel', 'confirmed', 'paid', 3840.00, 'EUR', 'TXN-20260922-A10M33'),
('b0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006', 'VOY-HT-819202', 'hotel', 'confirmed', 'paid', 3520.00, 'USD', 'TXN-20260924-E49K20'),
('b0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000004', 'VOY-HT-729103', 'hotel', 'confirmed', 'paid', 2850.00, 'EUR', 'TXN-20260926-H82X91'),
('b0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000005', 'VOY-HT-610294', 'hotel', 'confirmed', 'paid', 4250.00, 'CHF', 'TXN-20260928-V91Q44'),
('b0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000007', 'VOY-HT-519205', 'hotel', 'confirmed', 'paid', 2480.00, 'USD', 'TXN-20260930-T11N55'),

-- Confirmed Ground Transports
('b0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000003', 'VOY-TR-918201', 'transport', 'confirmed', 'paid', 145.00, 'EUR', 'TXN-20261002-L22M66'),
('b0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000006', 'VOY-TR-829102', 'transport', 'confirmed', 'paid', 160.00, 'USD', 'TXN-20261004-W33K77'),
('b0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000005', 'VOY-TR-730193', 'transport', 'confirmed', 'paid', 260.00, 'CHF', 'TXN-20261006-Q44P88'),

-- Pending Bookings
('b0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000003', 'VOY-FL-100201', 'flight', 'pending', 'unpaid', 495.00, 'USD', NULL),
('b0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000005', 'VOY-HT-100202', 'hotel', 'pending', 'unpaid', 850.00, 'EUR', NULL),

-- Cancelled Bookings
('b0000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000004', 'VOY-FL-100301', 'flight', 'cancelled', 'refunded', 620.00, 'USD', 'TXN-20261010-C99R00'),
('b0000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000006', 'VOY-TR-100302', 'transport', 'cancelled', 'refunded', 180.00, 'USD', 'TXN-20261012-D88P11');

-- 4. SEED PAYMENTS (Matching Payment Records)
INSERT INTO public.payments (
    id, booking_id, user_id, amount, currency, status, payment_method, transaction_reference
) VALUES
('p0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 842.60, 'USD', 'completed', 'credit_card', 'TXN-20260910-K82M19'),
('p0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 784.50, 'USD', 'completed', 'apple_pay', 'TXN-20260912-P39Q71'),
('p0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 1124.80, 'USD', 'completed', 'credit_card', 'TXN-20260915-Z14L88'),
('p0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', 3840.00, 'EUR', 'completed', 'credit_card', 'TXN-20260922-A10M33'),
('p0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000005', 4250.00, 'CHF', 'completed', 'credit_card', 'TXN-20260928-V91Q44'),
('p0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000004', 620.00, 'USD', 'refunded', 'credit_card', 'TXN-20261010-C99R00'),
('p0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000006', 180.00, 'USD', 'refunded', 'credit_card', 'TXN-20261012-D88P11');

-- 5. SEED REVIEWS (Verified Traveler Feedback)
INSERT INTO public.travel_reviews (
    id, target_type, target_id, target_title, user_id, user_name, rating,
    title, comment, pros, cons, traveler_type, visit_date, helpful_votes, verified_booking
) VALUES
(
    'rev-paris-01',
    'destination',
    'dst-paris-01',
    'Paris, France',
    'usr-traveler-03',
    'Alex Morgan',
    5.0,
    'Unmatched cultural beauty and world-class dining',
    'Walking along the Seine at sunset and exploring the Louvre galleries was an unforgettable experience. The cafes in Le Marais are a must.',
    ARRAY['Incredible architecture', 'Vibrant cafe culture', 'Walkable historic districts'],
    ARRAY['Popular monuments require advance booking'],
    'Couples',
    'October 2026',
    24,
    true
),
(
    'rev-swiss-02',
    'destination',
    'dst-zermatt-04',
    'Zermatt, Switzerland',
    'usr-bhavika-05',
    'Bhavika Sainani',
    5.0,
    'Pristine alpine grandeur and the iconic Matterhorn',
    'The Gornergrat cogwheel train and the Glacier Paradise cable car provide views that rival anywhere in the world. Exceptional hospitality.',
    ARRAY['Pristine mountain scenery', 'Car-free peaceful village', 'Flawless rail transit'],
    ARRAY['Premium pricing during peak winter season'],
    'Friends',
    'November 2026',
    38,
    true
),
(
    'rev-tokyo-03',
    'destination',
    'dst-tokyo-02',
    'Tokyo, Japan',
    'usr-jagrat-06',
    'Jagrat Kumar',
    4.9,
    'The pinnacle of modern technology and historic serenity',
    'From Shibuya Sky to early morning at Senso-ji temple, Tokyo operates with breathtaking precision, cleanliness, and culinary depth.',
    ARRAY['Impeccable public transport', 'Sublime culinary standards', 'Hyper-safe at all hours'],
    ARRAY['Navigating multi-level underground transit requires care'],
    'Solo',
    'November 2026',
    19,
    true
);

