-- =============================================
-- LEGACY PLUS TOURNAMENTS (Per-Event Purchase)
-- Migration: 20260214_legacy_pro_tournaments.sql
-- =============================================
-- Adds a one-time "Event Payment" ($299 MXN) that makes a specific tournament
-- permanently Plus ("Legacy"). Once finalized, legacy tournaments cannot be
-- restarted, preserving brackets, stats & photos forever.

-- 1. Add legacy/pro-event columns to tournaments
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS is_legacy_pro BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS legacy_pro_purchased_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS legacy_pro_purchased_by TEXT DEFAULT NULL;

COMMENT ON COLUMN tournaments.is_legacy_pro IS
  'True when this specific tournament was purchased as a one-time Plus event ($299 MXN). Data preserved forever, cannot be restarted once finalized.';
COMMENT ON COLUMN tournaments.legacy_pro_purchased_at IS
  'Timestamp of the Legacy Pro one-time purchase.';
COMMENT ON COLUMN tournaments.legacy_pro_purchased_by IS
  'Email of the user who purchased the Legacy Pro upgrade for this tournament.';

-- 2. Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_tournaments_legacy_pro
  ON tournaments(is_legacy_pro) WHERE is_legacy_pro = TRUE;

-- 3. Update the has_pro_access helper to also consider legacy tournaments
-- (The original function checks user-level subscriptions; tournament-level
--  is checked at application level via is_legacy_pro column.)

-- 4. Helper: check if a tournament has Pro features (via subscription OR legacy purchase)
CREATE OR REPLACE FUNCTION tournament_has_pro(p_tournament_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_legacy BOOLEAN;
  v_owner_email TEXT;
BEGIN
  SELECT is_legacy_pro, owner_email
  INTO v_legacy, v_owner_email
  FROM tournaments
  WHERE id = p_tournament_id;

  -- Tournament itself is legacy pro
  IF v_legacy THEN
    RETURN TRUE;
  END IF;

  -- Owner has an active Pro subscription
  RETURN has_pro_access(v_owner_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
