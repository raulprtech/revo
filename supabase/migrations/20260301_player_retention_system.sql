-- Migration: Player Intelligence & Retention System
-- Description: AI-driven profiling for churn prevention and engagement optimization.

-- 1. Persona Types Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'player_persona_type') THEN
        CREATE TYPE public.player_persona_type AS ENUM (
            'WHALE',        -- High spenders, high engagement
            'GRINDER',      -- High frequency, low spend
            'CASUAL',       -- Low frequency, low spend
            'PRO',          -- High skill, competitive focus
            'AT_RISK',      -- Decreasing activity, potential churn
            'NEWBIE'        -- Recently joined, needs onboarding
        );
    END IF;
END $$;

-- 2. Player Intelligence Profiles
CREATE TABLE IF NOT EXISTS public.player_intelligence_profiles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    persona_type public.player_persona_type DEFAULT 'NEWBIE',
    churn_risk_score INTEGER CHECK (churn_risk_score >= 0 AND churn_risk_score <= 100) DEFAULT 0,
    engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100) DEFAULT 0,
    skill_rating_estimate INTEGER DEFAULT 1200, -- Internal Elo estimate
    behavioral_summary TEXT,
    recommended_incentive TEXT, -- AI proposed reward (e.g., "50 Coins for FIFA Tournament")
    last_analysis_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.player_intelligence_profiles ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write intelligence profiles
CREATE POLICY "Admins can manage player intelligence"
    ON public.player_intelligence_profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- 3. Trigger to Update Engagement based on activity (Stub)
-- This would be called by our application logic after matches/purchases
CREATE OR REPLACE FUNCTION public.calculate_player_rfm_metrics(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_last_login TIMESTAMPTZ;
    v_freq_30d INTEGER;
    v_total_spend_coins INTEGER;
    v_result JSONB;
BEGIN
    -- Recency
    SELECT last_sign_in_at INTO v_last_login FROM auth.users WHERE id = p_user_id;
    
    -- Frequency (last 30 days matches)
    SELECT COUNT(*) INTO v_freq_30d FROM public.match_rooms 
    WHERE (player_1_email = (SELECT email FROM auth.users WHERE id = p_user_id) 
       OR player_2_email = (SELECT email FROM auth.users WHERE id = p_user_id))
    AND created_at > NOW() - INTERVAL '30 days';

    -- Monetary (Coins spent)
    -- Assuming a coins_transactions table exists from previous phases
    SELECT COALESCE(SUM(amount), 0) INTO v_total_spend_coins 
    FROM public.coin_transactions 
    WHERE user_id = p_user_id AND type = 'burn';

    v_result := jsonb_build_object(
        'days_since_last_login', EXTRACT(DAY FROM (NOW() - v_last_login)),
        'matches_30d', v_freq_30d,
        'coins_spent_total', v_total_spend_coins
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. View for Admin Dashboard
CREATE OR REPLACE VIEW public.admin_retention_overview AS
SELECT 
    p.persona_type,
    COUNT(*) as count,
    AVG(p.churn_risk_score) as avg_churn_risk,
    SUM(CASE WHEN p.churn_risk_score > 70 THEN 1 ELSE 0 END) as at_critical_risk
FROM public.player_intelligence_profiles p
GROUP BY p.persona_type;
