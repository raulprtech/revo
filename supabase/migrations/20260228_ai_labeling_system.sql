-- Migration: AI Data Labeling System
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_labeling_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screenshot_url TEXT NOT NULL,
    
    -- AI Suggestions
    predicted_p1_score INTEGER,
    predicted_p2_score INTEGER,
    confidence_score DECIMAL,
    model_version TEXT DEFAULT 'v2.1-caster',
    
    -- Human Labels (Ground Truth)
    labeled_p1_score INTEGER,
    labeled_p2_score INTEGER,
    labeled_by TEXT, -- Admin email
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'labeled', 'rejected')),
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    labeled_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.ai_labeling_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage labeling samples" ON public.ai_labeling_samples
FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' 
    OR auth.jwt() ->> 'email' = 'raul_vrm_2134@hotmail.com'
    OR auth.jwt() ->> 'email' = 'admin@duels.pro'
);

-- Seed some dummy samples for testing the UI
INSERT INTO public.ai_labeling_samples (screenshot_url, predicted_p1_score, predicted_p2_score, confidence_score)
VALUES 
('https://placehold.co/600x400/000000/FFFFFF/png?text=Match+Result+1', 2, 1, 0.64),
('https://placehold.co/600x400/000000/FFFFFF/png?text=Match+Result+2', 3, 0, 0.45),
('https://placehold.co/600x400/000000/FFFFFF/png?text=Match+Result+3', 1, 1, 0.82);
