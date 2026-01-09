-- Migration: Add profiles table and participant profile fields
-- Run this in Supabase SQL Editor

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
-- STEP 2: CREATE PROFILES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  nickname VARCHAR(100),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  birth_date DATE,
  gender VARCHAR(50),
  avatar_url TEXT,
  location VARCHAR(255),
  country VARCHAR(100),
  bio TEXT,
  favorite_games TEXT,
  gaming_platforms TEXT,
  discord_username VARCHAR(100),
  twitch_username VARCHAR(100),
  twitter_username VARCHAR(100),
  instagram_username VARCHAR(100),
  youtube_channel VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

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
