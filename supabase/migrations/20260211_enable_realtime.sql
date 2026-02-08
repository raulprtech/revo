-- Enable Supabase Realtime on tournaments and participants tables.
-- This allows clients to subscribe to INSERT, UPDATE, DELETE events
-- via Supabase Realtime channels.

-- Add tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;

-- Set REPLICA IDENTITY to FULL so that UPDATE/DELETE payloads
-- include the full row (not just the primary key).
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;
ALTER TABLE public.participants REPLICA IDENTITY FULL;
