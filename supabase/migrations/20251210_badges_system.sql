-- Migration: Add badges column to tournaments and events tables
-- This migration adds support for custom badges/medals that can be awarded to participants

-- Add badges column to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

-- Add badges column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

-- Create a table to store awarded badges for users (for profile display)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  badge JSONB NOT NULL, -- The badge object with all its properties
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  tournament_name TEXT,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  event_name TEXT,
  game TEXT,
  position TEXT, -- Position achieved: '1', '2', '3', 'top-8', etc.
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by user email
CREATE INDEX IF NOT EXISTS idx_user_badges_email ON user_badges(user_email);

-- Create index for faster lookups by tournament
CREATE INDEX IF NOT EXISTS idx_user_badges_tournament ON user_badges(tournament_id);

-- Create index for faster lookups by event
CREATE INDEX IF NOT EXISTS idx_user_badges_event ON user_badges(event_id);

-- Enable RLS on user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view badges (they are public achievements)
CREATE POLICY "user_badges_select_policy" ON user_badges
  FOR SELECT USING (true);

-- Policy: Only authenticated users can insert badges (typically through tournament completion)
CREATE POLICY "user_badges_insert_policy" ON user_badges
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only the tournament/event owner or the badge recipient can update
CREATE POLICY "user_badges_update_policy" ON user_badges
  FOR UPDATE USING (
    auth.jwt() ->> 'email' = user_email
    OR EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = user_badges.tournament_id 
      AND tournaments.owner_email = auth.jwt() ->> 'email'
    )
    OR EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = user_badges.event_id 
      AND events.owner_email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Only tournament/event owners can delete badges
CREATE POLICY "user_badges_delete_policy" ON user_badges
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = user_badges.tournament_id 
      AND tournaments.owner_email = auth.jwt() ->> 'email'
    )
    OR EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = user_badges.event_id 
      AND events.owner_email = auth.jwt() ->> 'email'
    )
  );

-- Add comment describing the badges column
COMMENT ON COLUMN tournaments.badges IS 'JSON array of BadgeTemplate objects that define badges to be awarded to participants';
COMMENT ON COLUMN events.badges IS 'JSON array of BadgeTemplate objects that define badges to be awarded to event participants';
COMMENT ON TABLE user_badges IS 'Stores badges that have been awarded to users from tournaments and events';
