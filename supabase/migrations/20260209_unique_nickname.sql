-- Migration: Add unique constraint on nickname in profiles table
-- This prevents duplicate nicknames/gamertags across users
-- IDEMPOTENT: Safe to run multiple times

-- Create a unique partial index on nickname (only where nickname is NOT NULL and NOT empty)
-- This allows multiple users to have NULL/empty nicknames but enforces uniqueness for non-empty values
CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_unique_idx
  ON public.profiles (LOWER(nickname))
  WHERE nickname IS NOT NULL AND nickname != '';
