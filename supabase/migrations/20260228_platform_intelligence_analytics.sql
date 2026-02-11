-- Migration: Platform Analytics and Prediction Checkpoints
-- =============================================

-- 1. TRACKING DE TRÁFICO Y ACTIVIDAD (Usuarios Activos y Concurrencia)
CREATE TABLE IF NOT EXISTS public.platform_heartbeat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_users INTEGER DEFAULT 0,
    active_matches INTEGER DEFAULT 0,
    active_tournaments INTEGER DEFAULT 0,
    game_distribution JSONB DEFAULT '{}'::jsonb, -- { "FIFA": 45, "SSB": 22, ... }
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MÉTRICAS DE TRACCIÓN (Cómo se llenan los torneos)
-- Esta tabla alimenta los modelos de predicción de "Time-to-Fill"
CREATE TABLE IF NOT EXISTS public.tournament_velocity_stats (
    tournament_id UUID PRIMARY KEY REFERENCES public.tournaments(id) ON DELETE CASCADE,
    game_key TEXT NOT NULL,
    max_participants INTEGER NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    filled_at TIMESTAMPTZ, -- Cuándo llegó al max_participants
    time_to_fill_seconds INTEGER,
    
    -- Checkpoints de progreso (para graficar curvas de inscripción)
    registration_checkpoints JSONB DEFAULT '[]'::jsonb, -- Array de {timestamp, count}
    
    -- Metadatos para negociación con patrocinadores
    impressions_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    avg_rank_of_participants DECIMAL, -- Nivel competitivo promedio
    conversion_rate DECIMAL -- Vistas vs Inscritos
);

-- 3. INTERACCIONES PRODUCTO/MONETIZACIÓN (Poder de negociación)
CREATE TABLE IF NOT EXISTS public.sponsor_engagement_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id),
    sponsor_name TEXT NOT NULL,
    interaction_type TEXT NOT NULL, -- 'click_logo', 'ad_impression', 'payout_view'
    user_email TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Index for high-freq queries
CREATE INDEX IF NOT EXISTS idx_heartbeat_timestamp ON public.platform_heartbeat(timestamp);
CREATE INDEX IF NOT EXISTS idx_velocity_game ON public.tournament_velocity_stats(game_key);
CREATE INDEX IF NOT EXISTS idx_engagement_sponsor ON public.sponsor_engagement_logs(sponsor_name);

-- RLS
ALTER TABLE public.platform_heartbeat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_velocity_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_engagement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all analytics" ON public.platform_heartbeat FOR ALL USING (
    auth.jwt() ->> 'email' = 'raul_vrm_2134@hotmail.com' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
CREATE POLICY "Admins see all velocity" ON public.tournament_velocity_stats FOR ALL USING (
    auth.jwt() ->> 'email' = 'raul_vrm_2134@hotmail.com' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
CREATE POLICY "Admins see all engagement" ON public.sponsor_engagement_logs FOR ALL USING (
    auth.jwt() ->> 'email' = 'raul_vrm_2134@hotmail.com' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
