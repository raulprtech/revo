-- Migration: Automated Platform Tournaments (Burn Engine)
-- =========================================================

-- 1. Table to track Automated Tournament Generation Templates
CREATE TABLE IF NOT EXISTS public.platform_tournament_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_key TEXT NOT NULL,
    title_pattern TEXT NOT NULL, -- e.g., "Flash Tournament: {{game}}"
    entry_fee_coins INTEGER DEFAULT 0,
    prize_pool_coins INTEGER DEFAULT 0,
    prize_pool_cash DECIMAL(12, 2) DEFAULT 0.00,
    rare_item_slug TEXT, -- Reference to cosmetic_items
    max_participants INTEGER DEFAULT 16,
    optimal_time_slot TIME, -- Targeted time
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Audit log for AI-Generated Tournaments
CREATE TABLE IF NOT EXISTS public.ai_generated_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.platform_tournament_templates(id),
    tournament_id UUID REFERENCES public.tournaments(id),
    trigger_reason TEXT, -- e.g., "High retention risk for FIFA Whales detected"
    predicted_engagement DECIMAL(4,2),
    actual_burn_collected INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE public.platform_tournament_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage templates" ON public.platform_tournament_templates FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR auth.jwt() ->> 'email' = 'raul_vrm_2134@hotmail.com'
);
