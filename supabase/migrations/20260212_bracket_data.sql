-- Migration: Add bracket_data column to tournaments for spectator mode
-- This persists bracket state (seedings, scores, winners) so spectators can view live brackets
-- =============================================

-- Add bracket_data JSONB column to tournaments
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS bracket_data JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.tournaments.bracket_data IS 
'Persisted bracket state: { seededPlayers: [{name, avatar}], rounds: [{name, matches: [{id, top, bottom, winner, bracket, station}], bracket}] }';
