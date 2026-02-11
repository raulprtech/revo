-- Migration: Burn Performance Views for Intelligence Dashboard
-- =========================================================

-- 1. View to track ROI of AI-Generated Events/Tournaments
CREATE OR REPLACE VIEW public.burn_master_performance AS
SELECT 
    l.id as log_id,
    l.trigger_reason,
    l.predicted_engagement,
    l.actual_burn_collected,
    t.name as tournament_name,
    t.game,
    c.name as campaign_name,
    c.target_burn_goal,
    l.created_at as executed_at
FROM public.ai_generated_events_log l
JOIN public.tournaments t ON l.tournament_id = t.id
LEFT JOIN public.ai_generated_campaigns c ON l.campaign_id = c.id;

-- 2. Aggregate stats for the dashboard
CREATE OR REPLACE VIEW public.burn_efficiency_stats AS
SELECT 
    game,
    COUNT(*) as total_events,
    SUM(actual_burn_collected) as total_burned,
    AVG(predicted_engagement) as avg_prediction_accuracy
FROM public.burn_master_performance
GROUP BY game;

-- 3. RLS (Read-only for admins)
ALTER VIEW public.burn_master_performance OWNER TO postgres;
ALTER VIEW public.burn_efficiency_stats OWNER TO postgres;
