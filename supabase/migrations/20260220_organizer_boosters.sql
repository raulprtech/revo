-- =============================================
-- Migration: Remove unwanted boosters + Add organizer boosters
-- =============================================

-- 1. Soft-delete boosters that no longer exist
UPDATE public.cosmetic_items SET is_active = false
WHERE slug IN (
  'booster_priority_checkin',  -- Check-in VIP
  'booster_analytics',         -- Analista Pro
  'booster_seed_protector',    -- Escudo de Seed
  'booster_rematch',           -- Token de Revancha
  'booster_xp_surge'           -- Oleada de XP
);

-- 2. Update Mega Potenciador to remove Check-in VIP reference
UPDATE public.cosmetic_items
SET description = 'Combo: Doble monedas + Spotlight + Racha de Suerte durante 3 torneos',
    metadata = '{"effect": "mega_combo", "includes": ["coin_multiplier", "profile_highlight", "streak_bonus"], "duration_tournaments": 3, "icon": "🌟", "consumable": true}'
WHERE slug = 'booster_mega_pack';

-- 3. Update the category CHECK constraint BEFORE inserting new categories
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%cosmetic_items_category%'
  ) THEN
    EXECUTE 'ALTER TABLE public.cosmetic_items DROP CONSTRAINT cosmetic_items_category_check';
  END IF;

  EXECUTE $q$ALTER TABLE public.cosmetic_items ADD CONSTRAINT cosmetic_items_category_check
    CHECK (category IN ('avatar_collection','bracket_frame','victory_effect','profile_banner','nickname_color','booster','organizer_booster','emote','tournament_theme'))$q$;
END $$;

-- 4. Insert organizer boosters (Plus features unlocked temporarily)
INSERT INTO public.cosmetic_items (slug, name, description, category, price, rarity, metadata) VALUES
  ('orgboost_station_manager', 'Station Manager Express',
   'Acceso a Station Manager completo para 1 torneo específico',
   'organizer_booster', 200, 'rare',
   '{"effect": "plus_feature_unlock", "feature": "station_manager", "scope": "single_tournament", "icon": "🖥️", "consumable": true}'),

  ('orgboost_prize_pool', 'Prize Pool Temporal',
   'Gestión de premios en dinero real con Stripe para 1 torneo',
   'organizer_booster', 300, 'epic',
   '{"effect": "plus_feature_unlock", "feature": "prize_pool", "scope": "single_tournament", "icon": "💰", "consumable": true}'),

  ('orgboost_analytics', 'Analítica Avanzada 7D',
   'Métricas de retención, rendimiento y exportación CSV por 7 días',
   'organizer_booster', 150, 'rare',
   '{"effect": "plus_feature_unlock", "feature": "advanced_analytics", "scope": "time_limited", "duration_days": 7, "icon": "📊", "consumable": true}'),

  ('orgboost_branding', 'Marca Personalizada',
   'Colores y logos de patrocinadores en el bracket de 1 torneo',
   'organizer_booster', 175, 'rare',
   '{"effect": "plus_feature_unlock", "feature": "custom_branding", "scope": "single_tournament", "icon": "🎨", "consumable": true}'),

  ('orgboost_ai_referee', 'Árbitro IA por Torneo',
   'Validación automática de resultados por IA en 1 torneo',
   'organizer_booster', 250, 'epic',
   '{"effect": "plus_feature_unlock", "feature": "ai_referee", "scope": "single_tournament", "icon": "🤖", "consumable": true}'),

  ('orgboost_plus_weekend', 'Plus por Fin de Semana',
   'Todas las funciones Plus desbloqueadas durante 3 días',
   'organizer_booster', 400, 'epic',
   '{"effect": "plus_feature_unlock", "feature": "all_plus", "scope": "time_limited", "duration_days": 3, "icon": "🚀", "consumable": true}'),

  ('orgboost_full_week', 'Semana Plus Completa',
   'Todas las funciones Plus activas por 7 días: Station Manager, premios, analítica, IA y marca',
   'organizer_booster', 700, 'legendary',
   '{"effect": "plus_feature_unlock", "feature": "all_plus", "scope": "time_limited", "duration_days": 7, "icon": "🌟", "consumable": true}')
ON CONFLICT (slug) DO NOTHING;
