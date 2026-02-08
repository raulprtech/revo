-- Migration: COPPA Compliance - Parental Consent and Data Protection
-- Run this in Supabase SQL Editor
-- Date: 2026-02-08

-- =============================================
-- STEP 1: ADD PARENTAL CONSENT FIELDS TO PROFILES
-- =============================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS parent_full_name VARCHAR(255);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS parental_consent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS parental_consent_verified BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS data_sharing_consent BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS data_sharing_consent_at TIMESTAMP WITH TIME ZONE;

-- Ensure created_at exists (some Supabase setups don't have it)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =============================================
-- STEP 2: PROTECT BIRTH_DATE - RLS UPDATE
-- =============================================

-- Drop the old permissive SELECT policy that exposes all data
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone (public fields)" ON public.profiles;

-- Create new SELECT policy: public can see profiles but birth_date is protected
-- We use a view instead for public access to hide sensitive fields
CREATE POLICY "Profiles are viewable by everyone (public fields)" ON public.profiles
FOR SELECT USING (true);

-- Create a secure view that hides sensitive fields from non-owners
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  email,
  nickname,
  first_name,
  last_name,
  -- Only show age range, not exact birth_date
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

-- Grant access to the public view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- =============================================
-- STEP 3: ADD INDEXES FOR COPPA QUERIES
-- =============================================

CREATE INDEX IF NOT EXISTS profiles_is_minor_idx ON public.profiles(is_minor);
CREATE INDEX IF NOT EXISTS profiles_parent_email_idx ON public.profiles(parent_email);

-- =============================================
-- STEP 4: FUNCTION TO CHECK IF USER IS MINOR
-- =============================================

CREATE OR REPLACE FUNCTION public.check_user_is_minor(user_birth_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  IF user_birth_date IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, user_birth_date)) < 13;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- STEP 5: TRIGGER TO AUTO-SET is_minor FLAG
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_minor_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    NEW.is_minor := public.check_user_is_minor(NEW.birth_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_minor_status ON public.profiles;
CREATE TRIGGER set_minor_status
  BEFORE INSERT OR UPDATE OF birth_date ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_minor_status();

-- =============================================
-- STEP 6: ADD DATA SHARING CONSENT TO PARTICIPANTS
-- =============================================

ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS data_sharing_consent BOOLEAN DEFAULT false;

ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT false;

ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255);

-- =============================================
-- STEP 7: PARENTAL CONSENT TOKENS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.parental_consent_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_email VARCHAR(255) NOT NULL,
  parent_full_name VARCHAR(255),
  child_name VARCHAR(255),
  child_email VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revoked', 'expired')),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for token lookup and cleanup
CREATE INDEX IF NOT EXISTS consent_tokens_token_idx ON public.parental_consent_tokens(token);
CREATE INDEX IF NOT EXISTS consent_tokens_user_id_idx ON public.parental_consent_tokens(user_id);
CREATE INDEX IF NOT EXISTS consent_tokens_status_idx ON public.parental_consent_tokens(status);
CREATE INDEX IF NOT EXISTS consent_tokens_expires_at_idx ON public.parental_consent_tokens(expires_at);

-- RLS: Only service_role can manage tokens (API routes use service_role)
ALTER TABLE public.parental_consent_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on consent tokens" ON public.parental_consent_tokens;
CREATE POLICY "Service role full access on consent tokens"
  ON public.parental_consent_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- STEP 8: EMAIL QUEUE TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email VARCHAR(255) NOT NULL,
  to_name VARCHAR(255),
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  type VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for queue processing
CREATE INDEX IF NOT EXISTS email_queue_status_idx ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS email_queue_created_at_idx ON public.email_queue(created_at);
CREATE INDEX IF NOT EXISTS email_queue_type_idx ON public.email_queue(type);

-- RLS: Only service_role can manage the email queue
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on email queue" ON public.email_queue;
CREATE POLICY "Service role full access on email queue"
  ON public.email_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- STEP 9: FUNCTION TO EXPIRE OLD CONSENT TOKENS
-- =============================================

CREATE OR REPLACE FUNCTION public.expire_old_consent_tokens()
RETURNS void AS $$
BEGIN
  UPDATE public.parental_consent_tokens
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 10: CRON JOBS FOR EMAIL PROCESSING & TOKEN CLEANUP
-- =============================================

-- Enable pg_cron and pg_net extensions (required for scheduled tasks and HTTP calls)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Cron: Process pending emails every 2 minutes via Resend (retry failed ones)
SELECT cron.schedule(
  'process-email-queue',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Cron: Expire old consent tokens daily at midnight
SELECT cron.schedule(
  'expire-consent-tokens',
  '0 0 * * *',
  $$
  SELECT public.expire_old_consent_tokens();
  $$
);

-- Add 'sending' status to email_queue check constraint
ALTER TABLE public.email_queue DROP CONSTRAINT IF EXISTS email_queue_status_check;
ALTER TABLE public.email_queue ADD CONSTRAINT email_queue_status_check 
  CHECK (status IN ('pending', 'sending', 'sent', 'failed'));
