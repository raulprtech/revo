-- =============================================
-- TITLES AS ACHIEVEMENTS SYSTEM
-- Migration: 20260217_titles_system.sql
-- System for earnable and custom-awarded titles.
-- =============================================

-- 0. Remove titles from cosmetic shop (they are now earned, not bought)
DELETE FROM public.cosmetic_items WHERE category = 'title';

-- Update CHECK constraint to no longer allow 'title'
ALTER TABLE public.cosmetic_items DROP CONSTRAINT IF EXISTS cosmetic_items_category_check;
ALTER TABLE public.cosmetic_items ADD CONSTRAINT cosmetic_items_category_check
  CHECK (category IN ('avatar_collection', 'bracket_frame', 'victory_effect', 'profile_banner', 'nickname_color', 'booster', 'emote', 'tournament_theme'));

-- 1. Add custom_titles to tournaments table
-- Allows organizers to define custom titles as prizes.
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS custom_titles JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tournaments.custom_titles IS 'JSON array of custom Title objects to be awarded to participants based on position.';


-- 2. Create user_titles table
-- Stores all titles a user has earned, both predefined and custom.
CREATE TABLE IF NOT EXISTS public.user_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  title JSONB NOT NULL, -- The full title object: { name, description, icon, color, rarity, etc. }
  source_type TEXT NOT NULL CHECK (source_type IN ('achievement', 'tournament_prize', 'admin_grant')),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  tournament_name TEXT,
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_titles_email ON public.user_titles(user_email);
COMMENT ON TABLE public.user_titles IS 'Stores titles that have been awarded to users, either through achievements or as tournament prizes.';


-- 3. Enable RLS for user_titles
ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_titles_select_policy" ON public.user_titles;
CREATE POLICY "user_titles_select_policy" ON public.user_titles
  FOR SELECT USING (true); -- Titles are public achievements.

DROP POLICY IF EXISTS "user_titles_insert_policy" ON public.user_titles;
CREATE POLICY "user_titles_insert_policy" ON public.user_titles
  FOR INSERT WITH CHECK (
    -- Users can't grant titles to themselves directly.
    -- Must be done via trusted functions or service roles.
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

DROP POLICY IF EXISTS "user_titles_delete_policy" ON public.user_titles;
CREATE POLICY "user_titles_delete_policy" ON public.user_titles
  FOR DELETE USING (
    -- Allow service role to delete
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    -- Allow tournament owners to delete titles from their tournaments
    OR EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE public.tournaments.id = public.user_titles.tournament_id
      AND public.tournaments.owner_email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );


-- 4. Update profiles table to reference the new user_titles table
-- First, drop the old text column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'equipped_title' AND udt_name = 'text'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN equipped_title TO old_equipped_title;
    ALTER TABLE public.profiles ADD COLUMN equipped_title UUID REFERENCES public.user_titles(id) ON DELETE SET NULL;
    -- You might want to run a script to migrate old text slugs to new UUIDs if needed
    ALTER TABLE public.profiles DROP COLUMN old_equipped_title;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'equipped_title'
  ) THEN
     ALTER TABLE public.profiles ADD COLUMN equipped_title UUID REFERENCES public.user_titles(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.equipped_title IS 'The ID of the equipped title from the user_titles table.';

-- 5. Predefined, platform-wide titles (achievements)
CREATE TABLE IF NOT EXISTS public.achievement_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title JSONB NOT NULL, -- { name, description, icon, color, rarity }
    achievement_type TEXT NOT NULL UNIQUE, -- e.g., 'JOIN_10_TOURNAMENTS'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.achievement_titles IS 'Defines platform-wide titles that can be earned by completing specific achievements.';

-- Seed some initial achievement titles
INSERT INTO public.achievement_titles (slug, achievement_type, title) VALUES
  ('rookie', 'JOIN_FIRST_TOURNAMENT', '{"name": "Novato", "description": "Participó en su primer torneo.", "icon": "🌱", "color": "#A0A0A0", "rarity": "common"}'),
  ('warrior', 'PLAY_10_MATCHES', '{"name": "Guerrero", "description": "Ha competido en 10 partidas.", "icon": "⚔️", "color": "#CD7F32", "rarity": "common"}'),
  ('tactician', 'WIN_5_MATCHES', '{"name": "Estratega", "description": "Ha ganado 5 partidas.", "icon": "🧠", "color": "#4169E1", "rarity": "rare"}'),
  ('architect', 'CREATE_5_TOURNAMENTS', '{"name": "Arquitecto", "description": "Ha organizado 5 torneos.", "icon": "🏗️", "color": "#00CED1", "rarity": "rare"}'),
  ('veteran', 'JOIN_25_TOURNAMENTS', '{"name": "Veterano", "description": "Ha participado en 25 torneos.", "icon": "🌟", "color": "#C0C0C0", "rarity": "epic"}'),
  ('legend', 'WIN_10_TOURNAMENTS', '{"name": "Leyenda", "description": "Ha ganado 10 torneos.", "icon": "⭐", "color": "#FFD700", "rarity": "legendary"}')
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS
ALTER TABLE public.achievement_titles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "achievement_titles_select_policy" ON public.achievement_titles;
CREATE POLICY "achievement_titles_select_policy" ON public.achievement_titles
  FOR SELECT USING (is_active = true);
