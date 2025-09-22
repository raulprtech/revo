-- Database schema for TournaVerse
-- Run this in Supabase SQL Editor

-- Enable Row Level Security (RLS)
-- Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  game VARCHAR(255) NOT NULL,
  participants INTEGER DEFAULT 0,
  max_participants INTEGER NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  start_time VARCHAR(10),
  format VARCHAR(50) NOT NULL CHECK (format IN ('single-elimination', 'double-elimination', 'swiss')),
  status VARCHAR(50) DEFAULT 'Próximo',
  owner_email VARCHAR(255) NOT NULL,
  image TEXT,
  data_ai_hint VARCHAR(255),
  registration_type VARCHAR(20) NOT NULL CHECK (registration_type IN ('public', 'private')),
  prize_pool VARCHAR(100),
  location VARCHAR(255),
  invited_users JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create participants table
CREATE TABLE IF NOT EXISTS public.participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar TEXT,
  status VARCHAR(20) DEFAULT 'Pendiente' CHECK (status IN ('Aceptado', 'Pendiente', 'Rechazado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(tournament_id, email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS tournaments_owner_email_idx ON public.tournaments(owner_email);
CREATE INDEX IF NOT EXISTS tournaments_registration_type_idx ON public.tournaments(registration_type);
CREATE INDEX IF NOT EXISTS tournaments_created_at_idx ON public.tournaments(created_at);
CREATE INDEX IF NOT EXISTS participants_tournament_id_idx ON public.participants(tournament_id);
CREATE INDEX IF NOT EXISTS participants_email_idx ON public.participants(email);

-- Enable Row Level Security
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournaments
-- Public tournaments are visible to everyone
CREATE POLICY "Public tournaments are viewable by everyone" ON public.tournaments
FOR SELECT USING (registration_type = 'public');

-- Private tournaments are only visible to owner and invited users
CREATE POLICY "Private tournaments viewable by owner and invited users" ON public.tournaments
FOR SELECT USING (
  registration_type = 'private' AND (
    owner_email = auth.jwt() ->> 'email' OR
    auth.jwt() ->> 'email' = ANY(SELECT jsonb_array_elements_text(invited_users))
  )
);

-- Tournament owners can update their own tournaments
CREATE POLICY "Tournament owners can update their tournaments" ON public.tournaments
FOR UPDATE USING (owner_email = auth.jwt() ->> 'email');

-- Tournament owners can delete their own tournaments
CREATE POLICY "Tournament owners can delete their tournaments" ON public.tournaments
FOR DELETE USING (owner_email = auth.jwt() ->> 'email');

-- Anyone can create tournaments (if authenticated)
CREATE POLICY "Authenticated users can create tournaments" ON public.tournaments
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' IS NOT NULL);

-- RLS Policies for participants
-- Participants are visible if the tournament is accessible
CREATE POLICY "Participants viewable if tournament accessible" ON public.participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND (
      t.registration_type = 'public' OR
      t.owner_email = auth.jwt() ->> 'email' OR
      auth.jwt() ->> 'email' = ANY(SELECT jsonb_array_elements_text(t.invited_users))
    )
  )
);

-- Tournament owners can manage participants
CREATE POLICY "Tournament owners can manage participants" ON public.participants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND t.owner_email = auth.jwt() ->> 'email'
  )
);

-- Users can join public tournaments
CREATE POLICY "Users can join public tournaments" ON public.participants
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND t.registration_type = 'public'
  ) AND
  email = auth.jwt() ->> 'email'
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions (adjust as needed based on your Supabase setup)
GRANT ALL ON public.tournaments TO authenticated;
GRANT ALL ON public.participants TO authenticated;
GRANT SELECT ON public.tournaments TO anon;  -- Allow anonymous users to see public tournaments