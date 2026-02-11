-- Migration: Automated Burn Events (Epic Campaigns)
-- =========================================================

-- 1. Track AI-Generated "Economic Campaigns" (Events)
CREATE TABLE IF NOT EXISTS public.ai_generated_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    strategy_reasoning TEXT,
    target_burn_goal INTEGER,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Link tournaments to campaigns
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.ai_generated_campaigns(id) ON DELETE SET NULL;

-- 3. Update AI log to include campaigns
ALTER TABLE public.ai_generated_events_log ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.ai_generated_campaigns(id);

-- 4. RLS
ALTER TABLE public.ai_generated_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaigns" ON public.ai_generated_campaigns FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR auth.jwt() ->> 'email' = 'raul_vrm_2134@hotmail.com'
);
