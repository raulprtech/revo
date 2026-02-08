-- Migration: Add profiles table and participant profile fields
-- Run this in Supabase SQL Editor
-- IDEMPOTENT: Safe to run multiple times

-- =============================================
-- STEP 1: ADD COLUMNS TO PARTICIPANTS TABLE
-- =============================================

ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS birth_date DATE;

ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS gender VARCHAR(50);

-- =============================================
-- STEP 2: CREATE PROFILES TABLE (if not exists)
-- =============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add all columns individually (safe if table already exists with partial columns)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_games TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gaming_platforms TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_username VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitch_username VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_username VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_channel VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- Add unique constraint on email if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_email_key' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
  END IF;
END $$;

-- =============================================
-- STEP 3: ENABLE RLS AND CREATE POLICIES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Create index
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
