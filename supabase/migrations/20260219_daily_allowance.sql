-- =============================================
-- Migration: Monthly → Daily allowance + Welcome bonus
-- =============================================

-- 1. Rename column monthly_allowance_claimed_at → daily_allowance_claimed_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coin_wallets' AND column_name = 'monthly_allowance_claimed_at'
  ) THEN
    ALTER TABLE coin_wallets RENAME COLUMN monthly_allowance_claimed_at TO daily_allowance_claimed_at;
  END IF;
END $$;

-- 2. Add the column if it doesn't exist (fresh installs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coin_wallets' AND column_name = 'daily_allowance_claimed_at'
  ) THEN
    ALTER TABLE coin_wallets ADD COLUMN daily_allowance_claimed_at timestamptz;
  END IF;
END $$;

-- 3. Set default balance for new wallets to 50 (welcome bonus)
ALTER TABLE coin_wallets ALTER COLUMN balance SET DEFAULT 50;
ALTER TABLE coin_wallets ALTER COLUMN lifetime_earned SET DEFAULT 50;
