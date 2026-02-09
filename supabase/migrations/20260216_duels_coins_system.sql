-- =============================================
-- DUELS COINS SYSTEM
-- Migration: 20260216_duels_coins_system.sql
-- Digital currency for the Duels Esports platform
-- =============================================

-- 1. COIN WALLETS — One per user
CREATE TABLE IF NOT EXISTS public.coin_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0, -- total coins earned ever
  lifetime_spent INTEGER NOT NULL DEFAULT 0,  -- total coins spent ever
  monthly_allowance_claimed_at TIMESTAMPTZ, -- last time monthly allowance was claimed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_wallets_email ON public.coin_wallets(user_email);

ALTER TABLE public.coin_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet" ON public.coin_wallets;
CREATE POLICY "Users can view own wallet" ON public.coin_wallets
  FOR SELECT USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

DROP POLICY IF EXISTS "Service role manages wallets" ON public.coin_wallets;
CREATE POLICY "Service role manages wallets" ON public.coin_wallets
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Allow authenticated users to insert their own wallet
DROP POLICY IF EXISTS "Users can create own wallet" ON public.coin_wallets;
CREATE POLICY "Users can create own wallet" ON public.coin_wallets
  FOR INSERT WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Allow authenticated users to update their own wallet
DROP POLICY IF EXISTS "Users can update own wallet" ON public.coin_wallets;
CREATE POLICY "Users can update own wallet" ON public.coin_wallets
  FOR UPDATE USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

GRANT ALL ON public.coin_wallets TO authenticated;

-- 2. COIN TRANSACTIONS — Audit trail
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  amount INTEGER NOT NULL, -- positive = credit, negative = debit
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    -- Credits
    'monthly_allowance',     -- Monthly free coins
    'play_complete',         -- Completed a tournament
    'play_win_match',        -- Won a match
    'play_win_tournament',   -- Won a tournament
    'organize_success',      -- Organized a successful tournament
    'exploration_reward',    -- Exploration/onboarding quest completed
    'purchase',              -- Bought with real money
    'refund',                -- Refund from failed transaction
    'admin_grant',           -- Admin granted coins
    -- Debits
    'spend_player_cap',      -- Unlock more players in tournament
    'spend_feature_unlock',  -- Unlock premium feature for single event
    'spend_featured_spot',   -- Feature tournament on homepage
    'spend_cosmetic'        -- Buy cosmetic item
  )),
  description TEXT,
  reference_id TEXT, -- optional: tournament_id, item_id, etc.
  reference_type TEXT, -- 'tournament', 'cosmetic', 'exploration', 'purchase'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_tx_email ON public.coin_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_coin_tx_type ON public.coin_transactions(type);
CREATE INDEX IF NOT EXISTS idx_coin_tx_created ON public.coin_transactions(created_at DESC);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.coin_transactions;
CREATE POLICY "Users can view own transactions" ON public.coin_transactions
  FOR SELECT USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

DROP POLICY IF EXISTS "Service role manages transactions" ON public.coin_transactions;
CREATE POLICY "Service role manages transactions" ON public.coin_transactions
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.coin_transactions;
CREATE POLICY "Users can insert own transactions" ON public.coin_transactions
  FOR INSERT WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

GRANT ALL ON public.coin_transactions TO authenticated;

-- 3. COSMETIC ITEMS — Shop catalog
CREATE TABLE IF NOT EXISTS public.cosmetic_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'avatar_collection',  -- DiceBear avatar collections
    'bracket_frame',      -- Bracket frames (golden, neon, animated)
    'victory_effect',     -- Victory animations
    'profile_banner',     -- Profile banners/backgrounds
    'nickname_color',     -- Nickname color schemes
    'booster',            -- Tournament/gameplay boosters
    'emote',              -- Reaction emotes for tournaments
    'tournament_theme'   -- Custom tournament visual themes
  )),
  price INTEGER NOT NULL CHECK (price > 0), -- in Duels coins
  image_preview TEXT,       -- Preview image/URL
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  metadata JSONB DEFAULT '{}', -- category-specific data (styles, colors, etc.)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cosmetic_category ON public.cosmetic_items(category);
CREATE INDEX IF NOT EXISTS idx_cosmetic_active ON public.cosmetic_items(is_active);

ALTER TABLE public.cosmetic_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active cosmetics" ON public.cosmetic_items;
CREATE POLICY "Everyone can view active cosmetics" ON public.cosmetic_items
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role manages cosmetics" ON public.cosmetic_items;
CREATE POLICY "Service role manages cosmetics" ON public.cosmetic_items
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

GRANT SELECT ON public.cosmetic_items TO authenticated;
GRANT SELECT ON public.cosmetic_items TO anon;

-- 4. USER COSMETICS — Owned items
CREATE TABLE IF NOT EXISTS public.user_cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES public.cosmetic_items(id) ON DELETE CASCADE,
  is_equipped BOOLEAN DEFAULT false,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cosmetics_email ON public.user_cosmetics(user_email);
CREATE INDEX IF NOT EXISTS idx_user_cosmetics_equipped ON public.user_cosmetics(user_email, is_equipped) WHERE is_equipped = true;

ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cosmetics" ON public.user_cosmetics;
CREATE POLICY "Users can view own cosmetics" ON public.user_cosmetics
  FOR SELECT USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

DROP POLICY IF EXISTS "Users can insert own cosmetics" ON public.user_cosmetics;
CREATE POLICY "Users can insert own cosmetics" ON public.user_cosmetics
  FOR INSERT WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

DROP POLICY IF EXISTS "Users can update own cosmetics" ON public.user_cosmetics;
CREATE POLICY "Users can update own cosmetics" ON public.user_cosmetics
  FOR UPDATE USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

DROP POLICY IF EXISTS "Service role manages user cosmetics" ON public.user_cosmetics;
CREATE POLICY "Service role manages user cosmetics" ON public.user_cosmetics
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Public read: anyone can see another user's equipped cosmetics
DROP POLICY IF EXISTS "Equipped cosmetics are public" ON public.user_cosmetics;
CREATE POLICY "Equipped cosmetics are public" ON public.user_cosmetics
  FOR SELECT USING (is_equipped = true);

GRANT ALL ON public.user_cosmetics TO authenticated;
GRANT SELECT ON public.user_cosmetics TO anon;

-- 5. EXPLORATION QUESTS — Onboarding reward system
CREATE TABLE IF NOT EXISTS public.exploration_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎯', -- Emoji icon
  reward_amount INTEGER NOT NULL CHECK (reward_amount > 0),
  category TEXT NOT NULL CHECK (category IN (
    'onboarding',     -- First-time setup
    'social',         -- Social features
    'competitive',    -- Playing/competing
    'organizing',     -- Organizing events
    'discovery'       -- Exploring platform features
  )),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  -- Validation: what must be true for the quest to be "complete"
  validation_type TEXT NOT NULL CHECK (validation_type IN (
    'profile_complete',      -- User completed their profile
    'first_tournament_join', -- Joined first tournament
    'first_tournament_create', -- Created first tournament
    'first_match_played',    -- Played first match
    'avatar_uploaded',       -- Uploaded a custom avatar
    'social_linked',         -- Linked a social account
    'event_visited',         -- Visited an event page
    'bracket_viewed',        -- Viewed a tournament bracket
    'first_badge_earned',    -- Earned first badge
    'five_tournaments_joined', -- Joined 5 tournaments
    'first_cosmetic_bought', -- Bought first cosmetic
    'share_tournament',      -- Shared a tournament
    'manual'                 -- Manual trigger (admin)
  )),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.exploration_quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active quests" ON public.exploration_quests;
CREATE POLICY "Everyone can view active quests" ON public.exploration_quests
  FOR SELECT USING (is_active = true);

GRANT SELECT ON public.exploration_quests TO authenticated;
GRANT SELECT ON public.exploration_quests TO anon;

-- 6. USER QUEST PROGRESS — Track completed quests
CREATE TABLE IF NOT EXISTS public.user_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  quest_id UUID NOT NULL REFERENCES public.exploration_quests(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  reward_claimed BOOLEAN DEFAULT false,
  reward_claimed_at TIMESTAMPTZ,
  UNIQUE(user_email, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_progress_email ON public.user_quest_progress(user_email);

ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress" ON public.user_quest_progress;
CREATE POLICY "Users can view own progress" ON public.user_quest_progress
  FOR SELECT USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_quest_progress;
CREATE POLICY "Users can insert own progress" ON public.user_quest_progress
  FOR INSERT WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_quest_progress;
CREATE POLICY "Users can update own progress" ON public.user_quest_progress
  FOR UPDATE USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

GRANT ALL ON public.user_quest_progress TO authenticated;

-- 7. COIN PURCHASE PACKAGES — Real money packages
CREATE TABLE IF NOT EXISTS public.coin_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  coin_amount INTEGER NOT NULL,
  bonus_amount INTEGER DEFAULT 0, -- Extra coins as bonus
  price_mxn DECIMAL(10,2) NOT NULL,
  stripe_price_id TEXT, -- Stripe price ID for checkout
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rename column if table was created with old name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'coin_packages' AND column_name = 'price_usd'
  ) THEN
    ALTER TABLE public.coin_packages RENAME COLUMN price_usd TO price_mxn;
  END IF;
END $$;

ALTER TABLE public.coin_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active packages" ON public.coin_packages;
CREATE POLICY "Everyone can view active packages" ON public.coin_packages
  FOR SELECT USING (is_active = true);

GRANT SELECT ON public.coin_packages TO authenticated;
GRANT SELECT ON public.coin_packages TO anon;

-- 8. TOURNAMENT COIN UNLOCKS — Track per-tournament coin spending
CREATE TABLE IF NOT EXISTS public.tournament_coin_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  unlock_type TEXT NOT NULL CHECK (unlock_type IN (
    'player_cap_64',      -- Unlock 33-64 players
    'player_cap_128',     -- Unlock 65-128 players
    'player_cap_256',     -- Unlock 129-256 players
    'station_manager',    -- Activate Station Manager
    'ai_referee',         -- Activate AI Referee
    'featured_spot'       -- Feature on homepage
  )),
  cost INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, unlock_type)
);

CREATE INDEX IF NOT EXISTS idx_tournament_unlocks ON public.tournament_coin_unlocks(tournament_id);

ALTER TABLE public.tournament_coin_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own unlocks" ON public.tournament_coin_unlocks;
CREATE POLICY "Users can view own unlocks" ON public.tournament_coin_unlocks
  FOR SELECT USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

DROP POLICY IF EXISTS "Users can insert own unlocks" ON public.tournament_coin_unlocks;
CREATE POLICY "Users can insert own unlocks" ON public.tournament_coin_unlocks
  FOR INSERT WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

DROP POLICY IF EXISTS "Tournament owners can view unlocks" ON public.tournament_coin_unlocks;
CREATE POLICY "Tournament owners can view unlocks" ON public.tournament_coin_unlocks
  FOR SELECT USING (
    tournament_id IN (
      SELECT id FROM tournaments 
      WHERE owner_email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

GRANT ALL ON public.tournament_coin_unlocks TO authenticated;

-- =============================================
-- SEED DATA: Exploration Quests
-- =============================================

INSERT INTO public.exploration_quests (slug, title, description, icon, reward_amount, category, validation_type, sort_order) VALUES
  ('complete_profile', 'Completa tu Perfil', 'Rellena tu nombre, nickname y foto de perfil', '👤', 50, 'onboarding', 'profile_complete', 1),
  ('upload_avatar', 'Sube tu Avatar', 'Personaliza tu imagen de perfil con una foto o avatar', '📸', 30, 'onboarding', 'avatar_uploaded', 2),
  ('link_social', 'Conecta tus Redes', 'Vincula al menos una red social (Discord, Twitch, etc.)', '🔗', 30, 'social', 'social_linked', 3),
  ('join_first_tournament', 'Primer Torneo', 'Inscríbete en tu primer torneo', '🎮', 75, 'competitive', 'first_tournament_join', 4),
  ('play_first_match', 'Primera Partida', 'Juega tu primera partida en un torneo', '⚔️', 50, 'competitive', 'first_match_played', 5),
  ('create_first_tournament', 'Organizador Novato', 'Crea tu primer torneo en la plataforma', '🏆', 100, 'organizing', 'first_tournament_create', 6),
  ('visit_event', 'Explorador de Eventos', 'Visita la página de un evento', '🗺️', 20, 'discovery', 'event_visited', 7),
  ('view_bracket', 'Analista de Llaves', 'Consulta la llave de un torneo', '📊', 20, 'discovery', 'bracket_viewed', 8),
  ('earn_first_badge', 'Primer Medallón', 'Obtén tu primera insignia en un torneo', '🏅', 50, 'competitive', 'first_badge_earned', 9),
  ('join_five_tournaments', 'Veterano', 'Participa en 5 torneos diferentes', '🌟', 150, 'competitive', 'five_tournaments_joined', 10),
  ('buy_first_cosmetic', 'Fashionista', 'Compra tu primer artículo cosmético en la tienda', '🛍️', 25, 'discovery', 'first_cosmetic_bought', 11),
  ('share_tournament', 'Embajador', 'Comparte un torneo en redes sociales', '📢', 30, 'social', 'share_tournament', 12)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- SEED DATA: Cosmetic Items
-- =============================================

-- Avatar Collections (DiceBear styles NOT already in use: initials, thumbs, fun-emoji, glass)
INSERT INTO public.cosmetic_items (slug, name, description, category, price, rarity, metadata) VALUES
  -- Adventurer collection
  ('avatar_adventurer', 'Aventureros', 'Personajes con espíritu explorador y audaz', 'avatar_collection', 150, 'common',
   '{"dicebear_style": "adventurer", "seeds": ["warrior", "mage", "rogue", "paladin", "ranger", "druid", "bard", "monk", "sorcerer", "cleric", "berserker", "alchemist"]}'),
  -- Bottts collection (robots)
  ('avatar_bottts', 'Robots', 'Avatares de robots futuristas y mecánicos', 'avatar_collection', 200, 'rare',
   '{"dicebear_style": "bottts", "seeds": ["circuit", "spark", "bolt", "gear", "steel", "chrome", "neon", "quantum", "cyber", "byte", "pixel", "data"]}'),
  -- Lorelei collection (anime)
  ('avatar_lorelei', 'Anime Heroes', 'Personajes estilo anime con estética manga', 'avatar_collection', 250, 'rare',
   '{"dicebear_style": "lorelei", "seeds": ["sakura", "ryuu", "hoshi", "kaze", "hikari", "tsuki", "yume", "sora", "akira", "rein", "mizu", "kumo"]}'),
  -- Pixel Art collection
  ('avatar_pixel_art', 'Pixel Heroes', 'Avatares retro en pixel art de 8-bit', 'avatar_collection', 200, 'rare',
   '{"dicebear_style": "pixel-art", "seeds": ["hero1", "hero2", "hero3", "hero4", "hero5", "hero6", "hero7", "hero8", "hero9", "hero10", "hero11", "hero12"]}'),
  -- Notionists collection
  ('avatar_notionists', 'Notionistas', 'Avatares minimalistas y elegantes estilo Notion', 'avatar_collection', 150, 'common',
   '{"dicebear_style": "notionists", "seeds": ["creative", "coder", "artist", "gamer", "builder", "dreamer", "thinker", "maker", "leader", "explorer", "scholar", "rebel"]}'),
  -- Big Ears collection
  ('avatar_big_ears', 'Big Ears', 'Personajes adorables con orejas grandes y expresivas', 'avatar_collection', 175, 'common',
   '{"dicebear_style": "big-ears", "seeds": ["sunny", "cloud", "star", "moon", "rain", "snow", "fire", "leaf", "wave", "stone", "wind", "light"]}'),
  -- Micah collection
  ('avatar_micah', 'Modernos', 'Ilustraciones modernas y estilizadas', 'avatar_collection', 300, 'epic',
   '{"dicebear_style": "micah", "seeds": ["alpha", "beta", "gamma", "delta", "sigma", "omega", "zeta", "theta", "lambda", "nova", "zenith", "apex"]}'),
  -- Personas collection
  ('avatar_personas', 'Personas', 'Retratos diversos con estilo profesional', 'avatar_collection', 350, 'epic',
   '{"dicebear_style": "personas", "seeds": ["ace", "blaze", "crush", "drift", "echo", "flash", "ghost", "hawk", "ice", "jade", "knight", "legend"]}'),

  -- Bracket Frames
  ('frame_golden', 'Marco Dorado', 'Un elegante borde dorado para destacar en la llave', 'bracket_frame', 100, 'common',
   '{"border_color": "#FFD700", "border_style": "solid", "border_width": 3, "glow": false}'),
  ('frame_neon_blue', 'Neón Azul', 'Borde luminoso en tono azul eléctrico', 'bracket_frame', 150, 'rare',
   '{"border_color": "#00D4FF", "border_style": "solid", "border_width": 2, "glow": true, "glow_color": "#00D4FF"}'),
  ('frame_neon_pink', 'Neón Rosa', 'Borde luminoso en tono rosa vibrante', 'bracket_frame', 150, 'rare',
   '{"border_color": "#FF00E5", "border_style": "solid", "border_width": 2, "glow": true, "glow_color": "#FF00E5"}'),
  ('frame_fire', 'Marco de Fuego', 'Borde animado con efecto de llamas', 'bracket_frame', 300, 'epic',
   '{"border_color": "#FF4500", "border_style": "animated", "animation": "fire", "glow": true, "glow_color": "#FF6B00"}'),
  ('frame_ice', 'Marco de Hielo', 'Borde animado con efecto de escarcha', 'bracket_frame', 300, 'epic',
   '{"border_color": "#00BFFF", "border_style": "animated", "animation": "ice", "glow": true, "glow_color": "#87CEEB"}'),
  ('frame_legendary', 'Marco Legendario', 'El máximo prestigio: borde arcoíris animado', 'bracket_frame', 500, 'legendary',
   '{"border_style": "animated", "animation": "rainbow", "glow": true, "gradient": ["#FF0000","#FF7F00","#FFFF00","#00FF00","#0000FF","#8B00FF"]}'),

  -- Victory Effects
  ('victory_confetti', 'Confeti', 'Lluvia de confeti al avanzar de ronda', 'victory_effect', 75, 'common',
   '{"animation": "confetti", "duration": 2000}'),
  ('victory_lightning', 'Relámpago', 'Efecto de rayo al ganar una partida', 'victory_effect', 150, 'rare',
   '{"animation": "lightning", "duration": 1500, "color": "#FFD700"}'),
  ('victory_explosion', 'Explosión', 'Explosión de partículas al conseguir la victoria', 'victory_effect', 200, 'rare',
   '{"animation": "explosion", "duration": 2000, "colors": ["#FF4500", "#FF6347", "#FFD700"]}'),
  ('victory_dragon', 'Dragón', 'Un dragón aparece celebrando tu victoria', 'victory_effect', 400, 'epic',
   '{"animation": "dragon", "duration": 3000}'),
  ('victory_supernova', 'Supernova', 'Explosión estelar legendaria', 'victory_effect', 600, 'legendary',
   '{"animation": "supernova", "duration": 3500, "colors": ["#8B00FF","#FF00FF","#00BFFF","#FFD700"]}'),

  -- Profile Banners
  ('banner_digital_grid', 'Grid Digital', 'Fondo con patrón de grid cyberpunk', 'profile_banner', 80, 'common',
   '{"gradient": ["#0f0c29", "#302b63", "#24243e"], "pattern": "grid"}'),
  ('banner_fire_gradient', 'Fuego Vivo', 'Gradiente de tonos cálidos y ardientes', 'profile_banner', 80, 'common',
   '{"gradient": ["#f12711", "#f5af19"], "pattern": "none"}'),
  ('banner_ocean_wave', 'Ola Marina', 'Gradiente de azules oceánicos', 'profile_banner', 100, 'rare',
   '{"gradient": ["#0052D4", "#65C7F7", "#9CECFB"], "pattern": "waves"}'),
  ('banner_aurora', 'Aurora Boreal', 'Colores de aurora boreal animados', 'profile_banner', 200, 'epic',
   '{"gradient": ["#00C9FF","#92FE9D","#F0F","#00C9FF"], "pattern": "aurora", "animated": true}'),
  ('banner_galaxy', 'Galaxia', 'Fondo de galaxia con estrellas', 'profile_banner', 350, 'legendary',
   '{"gradient": ["#0c0d13","#1a1a2e","#16213e","#0f3460"], "pattern": "stars", "animated": true}'),

  -- Nickname Colors
  ('nick_gold', 'Nombre Dorado', 'Tu nickname brilla en dorado', 'nickname_color', 100, 'common',
   '{"color": "#FFD700", "gradient": false}'),
  ('nick_ruby', 'Nombre Rubí', 'Tu nickname en rojo intenso', 'nickname_color', 100, 'common',
   '{"color": "#E0115F", "gradient": false}'),
  ('nick_emerald', 'Nombre Esmeralda', 'Tu nickname en verde esmeralda', 'nickname_color', 100, 'common',
   '{"color": "#50C878", "gradient": false}'),
  ('nick_gradient_fire', 'Nombre en Llamas', 'Gradiente de fuego para tu nickname', 'nickname_color', 200, 'rare',
   '{"gradient": true, "colors": ["#FF4500", "#FF8C00", "#FFD700"]}'),
  ('nick_gradient_ice', 'Nombre Glacial', 'Gradiente helado para tu nickname', 'nickname_color', 200, 'rare',
   '{"gradient": true, "colors": ["#00BFFF", "#87CEEB", "#E0FFFF"]}'),
  ('nick_rainbow', 'Nombre Arcoíris', 'Tu nickname con todos los colores', 'nickname_color', 400, 'legendary',
   '{"gradient": true, "animated": true, "colors": ["#FF0000","#FF7F00","#FFFF00","#00FF00","#0000FF","#8B00FF"]}')
ON CONFLICT (slug) DO NOTHING;

-- Boosters / Potenciadores
INSERT INTO public.cosmetic_items (slug, name, description, category, price, rarity, metadata) VALUES
  ('booster_double_coins', 'Doble Monedas', 'Gana el doble de monedas durante tus próximos 3 torneos', 'booster', 120, 'rare',
   '{"effect": "coin_multiplier", "multiplier": 2, "duration_tournaments": 3, "icon": "⚡", "consumable": true}'),
  ('booster_lucky_streak', 'Racha de Suerte', 'Bonus de +50% monedas por cada victoria consecutiva (máx 5 victorias)', 'booster', 200, 'epic',
   '{"effect": "streak_bonus", "bonus_percent": 50, "max_streak": 5, "icon": "🍀", "consumable": true}'),
  ('booster_spotlight', 'Spotlight', 'Tu perfil aparece destacado en las listas de participantes por 7 días', 'booster', 150, 'rare',
   '{"effect": "profile_highlight", "duration_days": 7, "highlight_color": "#FFD700", "icon": "💡", "consumable": true}'),
  ('booster_priority_checkin', 'Check-in VIP', 'Acceso prioritario al check-in del torneo (primero en la cola)', 'booster', 80, 'common',
   '{"effect": "priority_checkin", "icon": "🎟️", "consumable": true}'),
  ('booster_analytics', 'Analista Pro', 'Acceso a estadísticas avanzadas del torneo por 30 días', 'booster', 250, 'epic',
   '{"effect": "advanced_analytics", "duration_days": 30, "icon": "📊", "consumable": true}'),
  ('booster_seed_protector', 'Escudo de Seed', 'Mantén tu posición en el bracket sin randomizar', 'booster', 175, 'rare',
   '{"effect": "seed_protection", "icon": "🛡️", "consumable": true}'),
  ('booster_rematch', 'Token de Revancha', 'Solicita una revancha después de perder una partida (1 uso)', 'booster', 300, 'epic',
   '{"effect": "rematch_token", "uses": 1, "icon": "🔄", "consumable": true}'),
  ('booster_xp_surge', 'Oleada de XP', 'Gana el triple de XP durante 24 horas', 'booster', 100, 'common',
   '{"effect": "xp_multiplier", "multiplier": 3, "duration_hours": 24, "icon": "🚀", "consumable": true}'),
  ('booster_mega_pack', 'Mega Potenciador', 'Combo: Doble monedas + Spotlight + Check-in VIP durante 3 torneos', 'booster', 500, 'legendary',
   '{"effect": "mega_combo", "includes": ["coin_multiplier", "profile_highlight", "priority_checkin"], "duration_tournaments": 3, "icon": "🌟", "consumable": true}')
ON CONFLICT (slug) DO NOTHING;

-- Emotes / Reacciones
INSERT INTO public.cosmetic_items (slug, name, description, category, price, rarity, metadata) VALUES
  ('emote_gg', 'GG', 'El clásico "Good Game" para felicitar a tu rival', 'emote', 50, 'common',
   '{"emoji": "🤝", "text": "GG", "animation": "fade_in"}'),
  ('emote_fire', 'En Llamas', 'Muestra que estás on fire después de una victoria', 'emote', 50, 'common',
   '{"emoji": "🔥", "text": "ON FIRE", "animation": "shake"}'),
  ('emote_ez', 'EZ', 'Para esas victorias fáciles (cuidado con el BM)', 'emote', 75, 'common',
   '{"emoji": "😎", "text": "EZ", "animation": "bounce"}'),
  ('emote_clutch', 'Clutch', 'Celebra una remontada épica', 'emote', 100, 'rare',
   '{"emoji": "💪", "text": "CLUTCH", "animation": "pulse"}'),
  ('emote_rage', 'Rage Quit', 'Expresa tu frustración (con estilo)', 'emote', 100, 'rare',
   '{"emoji": "😤", "text": "RAGE", "animation": "shake_intense"}'),
  ('emote_respect', 'Respeto', 'Muestra respeto absoluto por tu oponente', 'emote', 75, 'common',
   '{"emoji": "🫡", "text": "RESPECT", "animation": "glow"}'),
  ('emote_trophy', 'Campeón', 'El emote definitivo para el ganador del torneo', 'emote', 200, 'epic',
   '{"emoji": "🏆", "text": "CHAMPION", "animation": "fireworks"}'),
  ('emote_mind_blown', 'Mind Blown', 'Para esas jugadas que vuelan la cabeza', 'emote', 150, 'rare',
   '{"emoji": "🫨", "text": "INSANE", "animation": "explode"}'),
  ('emote_goat', 'G.O.A.T.', 'El emote legendario: Greatest Of All Time', 'emote', 400, 'legendary',
   '{"emoji": "🐐", "text": "G.O.A.T.", "animation": "rainbow_glow"}')
ON CONFLICT (slug) DO NOTHING;

-- Tournament Themes / Temas de Torneo
INSERT INTO public.cosmetic_items (slug, name, description, category, price, rarity, metadata) VALUES
  ('theme_cyberpunk', 'Cyberpunk', 'Tema futurista con neones y estética cyber', 'tournament_theme', 200, 'rare',
   '{"primary_color": "#00FFD4", "secondary_color": "#FF0080", "bg_gradient": ["#0a0a0a", "#1a0a2e"], "font_style": "futuristic", "icon": "🌃"}'),
  ('theme_retro_arcade', 'Retro Arcade', 'Nostalgia pura: pixel art y colores neón 80s', 'tournament_theme', 175, 'rare',
   '{"primary_color": "#39FF14", "secondary_color": "#FF6EC7", "bg_gradient": ["#000000", "#1a1a2e"], "font_style": "pixel", "icon": "🕹️"}'),
  ('theme_samurai', 'Samurái', 'Elegancia japonesa con detalles de tinta sumi-e', 'tournament_theme', 250, 'epic',
   '{"primary_color": "#C41E3A", "secondary_color": "#FFD700", "bg_gradient": ["#0d0d0d", "#1a0a0a"], "font_style": "brush", "icon": "⚔️"}'),
  ('theme_ice_kingdom', 'Reino de Hielo', 'Escarcha y cristales en un mundo glacial', 'tournament_theme', 200, 'rare',
   '{"primary_color": "#87CEEB", "secondary_color": "#E0FFFF", "bg_gradient": ["#0a1628", "#1a3a5c"], "font_style": "elegant", "icon": "❄️"}'),
  ('theme_dragon_forge', 'Forja del Dragón', 'Lava, fuego y escamas de dragón', 'tournament_theme', 300, 'epic',
   '{"primary_color": "#FF4500", "secondary_color": "#FFD700", "bg_gradient": ["#1a0000", "#3d0c02"], "font_style": "medieval", "icon": "🐉"}'),
  ('theme_galaxy', 'Galaxia', 'Estrellas, nebulosas y el cosmos profundo', 'tournament_theme', 350, 'epic',
   '{"primary_color": "#9B59B6", "secondary_color": "#3498DB", "bg_gradient": ["#0c0d13", "#1a1a2e", "#16213e"], "font_style": "space", "icon": "🌌"}'),
  ('theme_neon_nights', 'Neon Nights', 'La ciudad de noche nunca duerme', 'tournament_theme', 175, 'rare',
   '{"primary_color": "#FF00FF", "secondary_color": "#00FFFF", "bg_gradient": ["#0a0a1a", "#1a0a2e"], "font_style": "neon", "icon": "🌆"}'),
  ('theme_world_championship', 'Campeonato Mundial', 'El tema definitivo para finales y grandes eventos', 'tournament_theme', 600, 'legendary',
   '{"primary_color": "#FFD700", "secondary_color": "#C0C0C0", "bg_gradient": ["#0a0a0a", "#1a1a1a", "#2d2d2d"], "font_style": "championship", "icon": "🌍", "confetti": true}')
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- SEED DATA: Coin Packages (Purchase with real money)
-- =============================================

INSERT INTO public.coin_packages (slug, name, description, coin_amount, bonus_amount, price_mxn, is_featured) VALUES
  ('handful', 'Puñado', 'Unas monedas para empezar', 100, 0, 19.00, false),
  ('pouch', 'Bolsa Pequeña', 'Para un capricho rápido', 500, 25, 89.00, false),
  ('chest', 'Cofre', 'El favorito de la comunidad', 1200, 200, 179.00, true),
  ('treasure', 'Tesoro', 'Para jugadores serios', 2500, 500, 349.00, false),
  ('dragon_hoard', 'Tesoro del Dragón', 'La mejor relación calidad-precio', 5500, 1500, 699.00, true),
  ('legendary_vault', 'Bóveda Legendaria', 'Para los verdaderos legends', 12000, 4000, 1399.00, false)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- Add cosmetic fields to profiles table
-- =============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_bracket_frame TEXT;    -- cosmetic slug
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_victory_effect TEXT;    -- cosmetic slug
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_profile_banner TEXT;    -- cosmetic slug
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_nickname_color TEXT;    -- cosmetic slug
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_avatar_collection TEXT; -- cosmetic slug
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_emote_pack JSONB DEFAULT '[]'; -- array of emote slugs

-- =============================================
-- Trigger: update updated_at on coin_wallets
-- =============================================
DROP TRIGGER IF EXISTS handle_coin_wallets_updated_at ON public.coin_wallets;
CREATE TRIGGER handle_coin_wallets_updated_at
  BEFORE UPDATE ON public.coin_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- Enable Realtime for coin wallets
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'coin_wallets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_wallets;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_quest_progress'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_quest_progress;
  END IF;
END $$;

