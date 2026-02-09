-- =============================================
-- UNIFIED BADGES & TITLES SYSTEM
-- Migration: 20260218_unify_badges_titles.sql
-- Merges user_titles into user_badges, adds rarity
-- and equip support, removes redundant tables.
-- =============================================

-- ─── STEP 1: Enrich user_badges with new columns ───

-- Add rarity to the badge JSONB? No — we add it as a top-level column
-- so we can query/filter easily.
ALTER TABLE public.user_badges
  ADD COLUMN IF NOT EXISTS rarity TEXT DEFAULT 'common'
    CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'));

ALTER TABLE public.user_badges
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'tournament_prize'
    CHECK (source_type IN ('achievement', 'tournament_prize', 'event_prize', 'admin_grant'));

COMMENT ON COLUMN public.user_badges.rarity IS 'Visual rarity tier for the badge';
COMMENT ON COLUMN public.user_badges.source_type IS 'How the badge was obtained';

-- ─── STEP 2: Assign rarity to existing badges based on badge type ───

UPDATE public.user_badges SET rarity = CASE
  WHEN (badge->>'type') IN ('champion', 'mvp')          THEN 'legendary'
  WHEN (badge->>'type') IN ('runner-up')                 THEN 'epic'
  WHEN (badge->>'type') IN ('third-place', 'top-4')      THEN 'rare'
  ELSE 'common'
END
WHERE rarity = 'common' OR rarity IS NULL;

-- Set source_type for existing badges that come from events
UPDATE public.user_badges SET source_type = 'event_prize'
WHERE event_id IS NOT NULL AND source_type = 'tournament_prize';

-- ─── STEP 3: Migrate user_titles data into user_badges ───

-- Only migrate if user_titles table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_titles') THEN
    INSERT INTO public.user_badges (user_email, badge, tournament_id, tournament_name, position, rarity, source_type, awarded_at)
    SELECT
      ut.user_email,
      jsonb_build_object(
        'id', ut.id::text,
        'type', CASE ut.source_type
          WHEN 'achievement' THEN 'custom'
          WHEN 'tournament_prize' THEN 'champion'
          ELSE 'custom'
        END,
        'name', ut.title->>'name',
        'description', COALESCE(ut.title->>'description', ''),
        'icon', COALESCE(ut.title->>'icon', '🏆'),
        'color', COALESCE(ut.title->>'color', '#FFD700'),
        'isCustom', true
      ),
      ut.tournament_id,
      ut.tournament_name,
      NULL, -- position
      COALESCE(ut.title->>'rarity', 'common'),
      ut.source_type,
      ut.awarded_at
    FROM public.user_titles ut;
  END IF;
END $$;

-- ─── STEP 4: Handle equipped_title → equipped_badge on profiles ───

-- Rename equipped_title to equipped_badge, change FK to user_badges
DO $$
BEGIN
  -- If equipped_title exists, migrate it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'equipped_title'
  ) THEN
    -- Drop the old FK constraint if any
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_equipped_title_fkey;
    -- Rename column
    ALTER TABLE public.profiles RENAME COLUMN equipped_title TO equipped_badge;
  END IF;

  -- If equipped_badge doesn't exist yet (fresh install), add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'equipped_badge'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN equipped_badge UUID;
  END IF;
END $$;

-- Now add the new FK to user_badges (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_equipped_badge_fkey'
    AND table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_equipped_badge_fkey
      FOREIGN KEY (equipped_badge) REFERENCES public.user_badges(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.equipped_badge IS 'The ID of the badge displayed as the user title/flair in their profile.';

-- ─── STEP 5: Drop user_titles table (data already migrated) ───

DROP TABLE IF EXISTS public.user_titles CASCADE;

-- ─── STEP 6: Drop custom_titles from tournaments (badges column already exists) ───

ALTER TABLE public.tournaments DROP COLUMN IF EXISTS custom_titles;

-- ─── STEP 7: Update RLS on user_badges to allow service_role inserts for achievements ───

-- The existing policies allow authenticated INSERT. We keep that and also add service_role.
-- No changes needed — authenticated users can already insert via awardBadge, and
-- achievement-based awards go through the same mechanism.

-- ─── STEP 8: Keep achievement_titles as the catalog of unlockable achievements ───
-- No changes needed — this table is independent and just defines what achievements exist.
-- It's referenced by the application logic, not directly by user_badges.

