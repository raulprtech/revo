-- ============================================================================
-- Migration: Deactivate non-functional cosmetic categories
-- Date: 2026-02-22
-- Description: Soft-deletes items from categories that have no rendering
--              in the app: victory_effect, booster, organizer_booster, emote,
--              tournament_theme. Keeps functional categories: avatar_collection,
--              bracket_frame, profile_banner, nickname_color.
-- ============================================================================

-- Soft-delete all non-functional categories
UPDATE public.cosmetic_items 
SET is_active = false 
WHERE category IN (
  'victory_effect',
  'booster',
  'organizer_booster',
  'emote',
  'tournament_theme'
) AND is_active = true;
