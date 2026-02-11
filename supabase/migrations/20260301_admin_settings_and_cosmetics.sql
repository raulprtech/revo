-- Migration: Admin Settings and Cosmetic Management
-- =========================================================

-- 1. Platform Settings (for Pilot Mode)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

INSERT INTO public.platform_settings (key, value) 
VALUES ('burn_master_pilot_mode', '{"enabled": false, "threshold": 0.30}')
ON CONFLICT (key) DO NOTHING;

-- 2. Ensure cosmetic_items has all needed fields
ALTER TABLE public.cosmetic_items ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT -1; -- -1 for unlimited
ALTER TABLE public.cosmetic_items ADD COLUMN IF NOT EXISTS rarity TEXT DEFAULT 'common';
ALTER TABLE public.cosmetic_items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- 3. RLS for cosmetics management
ALTER TABLE public.cosmetic_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage cosmetics" ON public.cosmetic_items FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR auth.jwt() ->> 'email' = 'raul_vrm_2134@hotmail.com'
);
