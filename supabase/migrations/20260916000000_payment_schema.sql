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
