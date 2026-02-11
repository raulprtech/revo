-- Migration: Security Hardening, RPC for Coins and Privacy Refinement
-- Date: 2026-02-23

-- =============================================
-- 1. HARDEN COIN SYSTEM (Recomendación 1)
-- =============================================

-- Hardening types for coin_transactions
ALTER TABLE public.coin_transactions DROP CONSTRAINT IF EXISTS coin_transactions_type_check;
ALTER TABLE public.coin_transactions ADD CONSTRAINT coin_transactions_type_check CHECK (type IN (
    -- Credits
    'daily_allowance',
    'monthly_allowance', -- Legacy support
    'welcome_bonus',
    'play_complete',
    'play_win_match',
    'play_win_tournament',
    'organize_success',
    'exploration_reward',
    'purchase',
    'refund',
    'admin_grant',
    -- Debits
    'spend_player_cap',
    'spend_feature_unlock',
    'spend_featured_spot',
    'spend_cosmetic',
    'spend_avatar',
    'spend_bracket_frame',
    'spend_victory_effect',
    'spend_profile_banner',
    'spend_nickname_color',
    'spend_booster',
    'spend_organizer_booster',
    'spend_emote',
    'spend_tournament_theme'
));

-- coin_wallets: Users should NOT be able to update their balance directly
ALTER TABLE public.coin_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own wallet" ON public.coin_wallets;
-- Now only service_role can update balance directly. 
-- Users can still SELECT their own wallet.

-- coin_transactions: Users should NOT be able to insert transactions directly
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.coin_transactions;
-- Only service_role or the RPC (defined below) can insert transactions.

-- =============================================
-- 2. CREATE SECURE RPC FOR COINS (Recomendación 2)
-- =============================================

CREATE OR REPLACE FUNCTION public.process_coin_transaction(
  p_user_email TEXT,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with creator privileges (bypass RLS for update)
AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_result JSONB;
BEGIN
  -- 1. Get or create wallet (idempotent)
  INSERT INTO public.coin_wallets (user_email, balance, lifetime_earned)
  VALUES (p_user_email, 0, 0)
  ON CONFLICT (user_email) DO NOTHING;

  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM public.coin_wallets
  WHERE user_email = p_user_email
  FOR UPDATE; -- Lock row for atomic update

  v_new_balance := v_current_balance + p_amount;

  -- 2. Check for sufficient funds if debit
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;

  -- 3. Update wallet
  UPDATE public.coin_wallets
  SET 
    balance = v_new_balance,
    lifetime_earned = CASE WHEN p_amount > 0 THEN lifetime_earned + p_amount ELSE lifetime_earned END,
    lifetime_spent = CASE WHEN p_amount < 0 THEN lifetime_spent + ABS(p_amount) ELSE lifetime_spent END,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  -- 4. Record transaction
  INSERT INTO public.coin_transactions (
    user_email, 
    amount, 
    balance_after, 
    type, 
    description, 
    reference_id, 
    reference_type
  )
  VALUES (
    p_user_email, 
    p_amount, 
    v_new_balance, 
    p_type, 
    p_description, 
    p_reference_id, 
    p_reference_type
  );

  RETURN jsonb_build_object(
    'success', true, 
    'new_balance', v_new_balance,
    'transaction_id', (SELECT id FROM public.coin_transactions WHERE user_email = p_user_email ORDER BY created_at DESC LIMIT 1)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.process_coin_transaction TO authenticated;

-- =============================================
-- 3. REFINE PUBLIC PROFILES (Recomendación 3)
-- =============================================

-- Drop the view first because CREATE OR REPLACE VIEW cannot remove columns
DROP VIEW IF EXISTS public.profiles_public;

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  -- email, -- REMOVED for privacy
  nickname,
  -- first_name, -- REMOVED for privacy
  -- last_name, -- REMOVED for privacy
  CASE 
    WHEN birth_date IS NOT NULL THEN 
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))::INTEGER
    ELSE NULL
  END AS age,
  gender,
  avatar_url,
  location,
  country,
  bio,
  favorite_games,
  gaming_platforms,
  discord_username,
  twitch_username,
  twitter_username,
  instagram_username,
  youtube_channel,
  is_minor,
  created_at,
  updated_at
FROM public.profiles;

-- Redefine permissions
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;
