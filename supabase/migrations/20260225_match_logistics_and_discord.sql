-- Migration: Match Room Logistics and Discord Integration
-- =============================================

-- 1. Update tournaments with Discord metadata
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS discord_category_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discord_role_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discord_settings JSONB DEFAULT '{"auto_create": false, "sync_roles": true}'::jsonb;

-- 2. Update profiles with Discord linking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS discord_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discord_username TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discord_linked BOOLEAN DEFAULT false;

-- 3. Create Match Rooms table
CREATE TABLE IF NOT EXISTS public.match_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    match_id TEXT NOT NULL, -- The ID from the bracket_data
    
    player_1_email TEXT NOT NULL,
    player_2_email TEXT NOT NULL,
    
    p1_ready BOOLEAN DEFAULT false,
    p2_ready BOOLEAN DEFAULT false,
    
    host_email TEXT DEFAULT NULL, -- Designated host
    match_code TEXT DEFAULT NULL, -- Lobby code
    
    p1_score INTEGER DEFAULT NULL,
    p2_score INTEGER DEFAULT NULL,
    
    p1_evidence_url TEXT DEFAULT NULL,
    p2_evidence_url TEXT DEFAULT NULL,
    
    recorded_match_url TEXT DEFAULT NULL, -- Link to recorded match (YouTube, Twitch, clips, etc.)
    stream_url TEXT DEFAULT NULL, -- Link to live stream
    stream_announced_at TIMESTAMPTZ DEFAULT NULL, -- To prevent multiple Discord announcements
    
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'dispute', 'finished')),
    
    conflict_resolved_by TEXT DEFAULT NULL, -- Email of the admin/moderator
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for match_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_rooms;

-- 4. RLS Policies for Match Rooms
ALTER TABLE public.match_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their own match rooms" ON public.match_rooms;
CREATE POLICY "Participants can view their own match rooms" ON public.match_rooms
FOR SELECT USING (
    player_1_email = auth.jwt() ->> 'email' OR 
    player_2_email = auth.jwt() ->> 'email' OR
    EXISTS (
        SELECT 1 FROM public.tournaments t 
        WHERE t.id = tournament_id AND t.owner_email = auth.jwt() ->> 'email'
    )
);

DROP POLICY IF EXISTS "Participants can update their own status/score" ON public.match_rooms;
CREATE POLICY "Participants can update their own status/score" ON public.match_rooms
FOR UPDATE USING (
    player_1_email = auth.jwt() ->> 'email' OR 
    player_2_email = auth.jwt() ->> 'email'
);

-- 5. Helper function to designate host
CREATE OR REPLACE FUNCTION public.auto_designate_host() 
RETURNS TRIGGER AS $$
BEGIN
    -- By default, player 1 is the host
    NEW.host_email := NEW.player_1_email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_designate_host ON public.match_rooms;
CREATE TRIGGER trigger_auto_designate_host
    BEFORE INSERT ON public.match_rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_designate_host();
