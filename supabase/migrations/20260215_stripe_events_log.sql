-- =============================================
-- STRIPE EVENTS LOG (Audit & Retry Queue)
-- Migration: 20260215_stripe_events_log.sql
-- =============================================
-- Logs all Stripe webhook events for auditing, idempotency,
-- and retry of failed events.

CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  retried_at TIMESTAMPTZ
);

-- Unique constraint on event_id for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(event_id);

-- Index for finding unprocessed events (retry queue)
CREATE INDEX IF NOT EXISTS idx_stripe_events_unprocessed 
  ON stripe_events(processed, created_at) 
  WHERE processed = false;

-- Index for lookups by event type
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(event_type);

-- RLS: Only service role can access
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages stripe events" ON stripe_events
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

COMMENT ON TABLE stripe_events IS 
  'Audit log of all Stripe webhook events. Failed events can be retried. event_id is unique to prevent duplicate processing.';
