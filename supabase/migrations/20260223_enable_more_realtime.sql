-- Migration: Enable Realtime for Coins and Subscriptions
-- Date: 2026-02-23

-- Add critical tables to Supabase Realtime publication
-- This ensures that useSubscription and useCoins hooks receive instant updates
-- Idempotent check for each table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'coin_wallets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_wallets;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'coin_transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_transactions;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'subscriptions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
  END IF;
END $$;

-- Ensure full row payloads for updates
ALTER TABLE public.coin_wallets REPLICA IDENTITY FULL;
ALTER TABLE public.coin_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;
