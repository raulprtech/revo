-- =============================================
-- SUBSCRIPTIONS & PLAN MANAGEMENT
-- Migration: 20260213_subscriptions_and_plans.sql
-- =============================================

-- 1. Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'community' CHECK (plan IN ('community', 'plus')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by email and stripe IDs
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_email ON subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

-- Ensure one active subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active_user 
  ON subscriptions(user_email) 
  WHERE status IN ('active', 'trialing');

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Only service role can insert/update (via webhooks)
CREATE POLICY "Service role manages subscriptions" ON subscriptions
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');


-- 2. Add entry_fee fields to tournaments table
ALTER TABLE tournaments 
  ADD COLUMN IF NOT EXISTS entry_fee DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entry_fee_currency TEXT DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS stripe_payment_link TEXT,
  ADD COLUMN IF NOT EXISTS collected_fees DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prize_pool_percentage JSONB DEFAULT NULL;
  -- prize_pool_percentage example: [{"position": "1", "percentage": 50}, {"position": "2", "percentage": 30}, {"position": "3", "percentage": 20}]


-- 3. Add branding fields to tournaments table
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS bracket_primary_color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bracket_secondary_color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sponsor_logos JSONB DEFAULT '[]';
  -- sponsor_logos example: [{"name": "Red Bull", "logo": "https://...", "url": "https://..."}]


-- 4. Payment records for entry fees
CREATE TABLE IF NOT EXISTS tournament_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  stripe_payment_intent_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_tournament ON tournament_payments(tournament_id);
CREATE INDEX IF NOT EXISTS idx_payments_participant ON tournament_payments(participant_email);

ALTER TABLE tournament_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON tournament_payments
  FOR SELECT USING (participant_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Organizers can view tournament payments" ON tournament_payments
  FOR SELECT USING (
    tournament_id IN (
      SELECT id FROM tournaments 
      WHERE owner_email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );


-- 5. Helper function: Get user plan
CREATE OR REPLACE FUNCTION get_user_plan(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_plan TEXT;
BEGIN
  SELECT plan INTO v_plan
  FROM subscriptions
  WHERE user_email = p_email
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > NOW())
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_plan, 'community');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Function to check if user has Plus features
CREATE OR REPLACE FUNCTION has_pro_access(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_plan(p_email) = 'plus';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
