-- Migration: AI Shadow Mode Tracking
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_shadow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version TEXT NOT NULL DEFAULT 'v2.1-caster',
    
    match_id TEXT,
    reality_score_p1 INTEGER,
    reality_score_p2 INTEGER,
    
    predicted_score_p1 INTEGER,
    predicted_score_p2 INTEGER,
    
    confidence_score DECIMAL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    error_delta DECIMAL, -- absolute difference between predicted and reality
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_ai_shadow_logs_created_at ON public.ai_shadow_logs(created_at);

-- RLS
ALTER TABLE public.ai_shadow_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view AI logs" ON public.ai_shadow_logs
FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' 
    OR auth.jwt() ->> 'email' = 'raul_vrm_2134@hotmail.com'
    OR auth.jwt() ->> 'email' = 'admin@duels.pro'
);

-- Seed some dummy data for the chart if empty (only for dev visibility)
INSERT INTO public.ai_shadow_logs (reality_score_p1, reality_score_p2, predicted_score_p1, predicted_score_p2, confidence_score, error_delta, created_at)
SELECT 
    (random()*5)::int, (random()*5)::int, 
    (random()*5)::int, (random()*5)::int, 
    0.8 + (random()*0.2), 
    random()*0.5,
    NOW() - (val || ' minutes')::interval
FROM generate_series(1, 50) AS val;
