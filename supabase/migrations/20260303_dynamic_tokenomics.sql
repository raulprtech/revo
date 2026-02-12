-- Migration: Add dynamic platform settings and subscription plans
-- Date: 2026-03-03

-- 1. Platform Settings Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial values
INSERT INTO public.platform_settings (key, value) VALUES
('withdrawal_fees', '{"fixed": 15.00, "percentage": 3.00}'),
('coins_spreads', '{"standard_percent": 10.00, "pro_percent": 5.00}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT,
    price DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'MXN',
    billing_period TEXT NOT NULL, -- 'monthly', 'yearly', 'free', 'one-time'
    badge TEXT,
    highlights TEXT[], -- Array of strings
    metadata JSONB DEFAULT '{}'::jsonb, -- Store discounts and custom configs
    cta_text TEXT,
    cta_variant TEXT DEFAULT 'default',
    is_popular BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial plans from plans.ts
INSERT INTO public.subscription_plans (id, name, tagline, price, billing_period, badge, highlights, cta_text, cta_variant, order_index) VALUES
('community', 'Community', 'Para comunidades online y organizadores amateur', 0.00, 'free', '🏛️', ARRAY['Torneos y jugadores ilimitados', 'Todos los formatos', 'Páginas de evento básicas', 'Reporte de scores manual'], 'Empezar Gratis', 'outline', 0),
('plus_monthly', 'Organizer Plus', 'Gestión profesional para venues y organizadores', 199.00, 'monthly', '⚡', ARRAY['TODO lo de Community', 'Station Manager avanzado', 'Premios en dinero real (Stripe)', 'Validación de scores por IA', 'Personalización de marca avanzada'], 'Comenzar Prueba Plus', 'default', 1),
('plus_yearly', 'Organizer Plus Anual', 'Ahorra ~20% con facturación anual', 1899.00, 'yearly', '⚡', ARRAY['Todo de Plus mensual', 'Equivalente a $158/mes', 'Ahorro de $489 al año', 'Un solo pago anual'], 'Suscribirse Anual', 'default', 2),
('legacy_plus', 'Pago por Evento', 'Plus permanente para un torneo específico', 299.00, 'one-time', '🏛️', ARRAY['Torneo Plus para siempre (Legacy)', 'Brackets y estadísticas intactas', 'Acceso permanente a datos', 'El torneo no puede reiniciarse'], 'Comprar para este torneo', 'outline', 3)
ON CONFLICT (id) DO NOTHING;

-- 3. Plan Features Table
CREATE TABLE IF NOT EXISTS public.plan_features_full (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    availability JSONB NOT NULL, -- e.g. {"community": "limited", "plus": "included"}
    order_index INTEGER DEFAULT 0
);

-- RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features_full ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can view platform settings" ON public.platform_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view plans" ON public.subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view features" ON public.plan_features_full;
CREATE POLICY "Anyone can view features" ON public.plan_features_full FOR SELECT USING (true);

-- Admins can update
DROP POLICY IF EXISTS "Admins can update settings" ON public.platform_settings;
CREATE POLICY "Admins can update settings" ON public.platform_settings FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id = auth.uid() OR email = auth.jwt() ->> 'email') 
            AND is_admin = true
        )
    );

DROP POLICY IF EXISTS "Admins can update plans" ON public.subscription_plans;
CREATE POLICY "Admins can update plans" ON public.subscription_plans FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id = auth.uid() OR email = auth.jwt() ->> 'email') 
            AND is_admin = true
        )
    );

DROP POLICY IF EXISTS "Admins can update features" ON public.plan_features_full;
CREATE POLICY "Admins can update features" ON public.plan_features_full FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id = auth.uid() OR email = auth.jwt() ->> 'email') 
            AND is_admin = true
        )
    );

-- 4. Dynamic Payout Function Update
DROP FUNCTION IF EXISTS public.request_cash_payout(text, numeric);
CREATE OR REPLACE FUNCTION public.request_cash_payout(
    p_user_email TEXT,
    p_amount DECIMAL(12, 2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_cash DECIMAL(12, 2);
    v_fees_config JSONB;
    v_fixed_fee DECIMAL(12, 2);
    v_percent_fee DECIMAL(12, 2);
    v_total_fee DECIMAL(12, 2);
    v_net DECIMAL(12, 2);
    v_payout_id UUID;
BEGIN
    -- Get current cash
    SELECT cash_balance INTO v_current_cash
    FROM public.coin_wallets
    WHERE user_email = p_user_email
    FOR UPDATE;

    IF v_current_cash < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Saldo de Cash insuficiente');
    END IF;

    IF p_amount < 50.00 THEN
        RETURN jsonb_build_object('success', false, 'error', 'El monto mínimo de retiro es $50.00 MXN');
    END IF;

    -- Get dynamic fees from settings
    SELECT value INTO v_fees_config FROM public.platform_settings WHERE key = 'withdrawal_fees';
    
    -- Fallback to hardcoded if not found
    v_fixed_fee := COALESCE((v_fees_config->>'fixed')::DECIMAL, 15.00);
    v_percent_fee := COALESCE((v_fees_config->>'percentage')::DECIMAL, 3.00);

    -- Check for subscriber discounts (Applying withdrawal_discount to the percentage fee)
    DECLARE
        v_user_plan TEXT;
        v_plan_metadata JSONB;
        v_withdrawal_discount DECIMAL(12, 2);
    BEGIN
        SELECT plan INTO v_user_plan FROM public.subscriptions 
        WHERE user_email = p_user_email AND status IN ('active', 'trialing') 
        LIMIT 1;

        IF v_user_plan IS NOT NULL THEN
            SELECT metadata INTO v_plan_metadata FROM public.subscription_plans 
            WHERE id = v_user_plan OR id ILIKE v_user_plan || '_%' 
            LIMIT 1;

            v_withdrawal_discount := COALESCE((v_plan_metadata->>'withdrawal_discount')::DECIMAL, 0);
            v_percent_fee := GREATEST(0, v_percent_fee - v_withdrawal_discount);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Simply ignore if table doesn't exist yet
    END;

    v_total_fee := v_fixed_fee + (p_amount * (v_percent_fee / 100.0));
    v_net := p_amount - v_total_fee;
    
    IF v_net <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', format('El monto debe ser superior a la comisión total de retiro ($%s)', v_total_fee));
    END IF;

    -- 1. Deduct Cash
    UPDATE public.coin_wallets
    SET 
        cash_balance = cash_balance - p_amount,
        lifetime_cash_withdrawn = lifetime_cash_withdrawn + p_amount,
        updated_at = NOW()
    WHERE user_email = p_user_email;

    -- 2. Create Payout Request
    INSERT INTO public.payout_requests (
        user_email, amount, fee_amount, net_amount, status
    ) VALUES (
        p_user_email, p_amount, v_total_fee, v_net, 'pending'
    ) RETURNING id INTO v_payout_id;

    -- 3. Record Cash Transaction (Debit)
    INSERT INTO public.cash_transactions (
        user_email, amount, balance_after, type, reference_id, reference_type, description, fee_amount
    ) VALUES (
        p_user_email, -p_amount, v_current_cash - p_amount, 
        'cash_withdrawal', 
        v_payout_id::text, 'payout_request',
        format('Retiro de fondos (Comisión $%s): -$%s MXN', v_total_fee, p_amount),
        v_total_fee
    );

    RETURN jsonb_build_object('success', true, 'payout_id', v_payout_id, 'net_amount', v_net);
END;
$$;

-- 5. Admin RPC functions (SECURITY DEFINER to bypass RLS)

DROP FUNCTION IF EXISTS public.admin_upsert_plan(text, text, text, numeric, text, text, text, text[], jsonb, text, text, boolean, integer);
CREATE OR REPLACE FUNCTION public.admin_upsert_plan(
    p_id TEXT,
    p_name TEXT,
    p_tagline TEXT,
    p_price DECIMAL(12, 2),
    p_currency TEXT DEFAULT 'MXN',
    p_billing_period TEXT DEFAULT 'monthly',
    p_badge TEXT DEFAULT '🏷️',
    p_highlights TEXT[] DEFAULT ARRAY['Beneficio 1'],
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_cta_text TEXT DEFAULT 'Suscribirse',
    p_cta_variant TEXT DEFAULT 'default',
    p_is_popular BOOLEAN DEFAULT false,
    p_order_index INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN := false;
    v_email TEXT;
BEGIN
    -- Get caller email from JWT
    v_email := auth.jwt() ->> 'email';

    -- Check admin by profile table
    SELECT true INTO v_is_admin FROM public.profiles
    WHERE (id = auth.uid() OR email = v_email) AND is_admin = true
    LIMIT 1;

    -- Fallback: hardcoded admin emails (same as middleware)
    IF NOT COALESCE(v_is_admin, false) THEN
        IF v_email IN ('raul_vrm_2134@hotmail.com', 'admin@duels.pro') THEN
            v_is_admin := true;
        END IF;
    END IF;

    IF NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos de administrador');
    END IF;

    INSERT INTO public.subscription_plans (id, name, tagline, price, currency, billing_period, badge, highlights, metadata, cta_text, cta_variant, is_popular, order_index, updated_at)
    VALUES (p_id, p_name, p_tagline, p_price, p_currency, p_billing_period, p_badge, p_highlights, p_metadata, p_cta_text, p_cta_variant, p_is_popular, p_order_index, NOW())
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        tagline = EXCLUDED.tagline,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        billing_period = EXCLUDED.billing_period,
        badge = EXCLUDED.badge,
        highlights = EXCLUDED.highlights,
        metadata = EXCLUDED.metadata,
        cta_text = EXCLUDED.cta_text,
        cta_variant = EXCLUDED.cta_variant,
        is_popular = EXCLUDED.is_popular,
        order_index = EXCLUDED.order_index,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true);
END;
$$;

DROP FUNCTION IF EXISTS public.admin_delete_plan(text);
CREATE OR REPLACE FUNCTION public.admin_delete_plan(p_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN := false;
    v_email TEXT;
BEGIN
    v_email := auth.jwt() ->> 'email';

    SELECT true INTO v_is_admin FROM public.profiles
    WHERE (id = auth.uid() OR email = v_email) AND is_admin = true
    LIMIT 1;

    IF NOT COALESCE(v_is_admin, false) THEN
        IF v_email IN ('raul_vrm_2134@hotmail.com', 'admin@duels.pro') THEN
            v_is_admin := true;
        END IF;
    END IF;

    IF NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos de administrador');
    END IF;

    DELETE FROM public.subscription_plans WHERE id = p_id;
    RETURN jsonb_build_object('success', true);
END;
$$;

DROP FUNCTION IF EXISTS public.admin_upsert_setting(text, jsonb);
CREATE OR REPLACE FUNCTION public.admin_upsert_setting(p_key TEXT, p_value JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN := false;
    v_email TEXT;
BEGIN
    v_email := auth.jwt() ->> 'email';

    SELECT true INTO v_is_admin FROM public.profiles
    WHERE (id = auth.uid() OR email = v_email) AND is_admin = true
    LIMIT 1;

    IF NOT COALESCE(v_is_admin, false) THEN
        IF v_email IN ('raul_vrm_2134@hotmail.com', 'admin@duels.pro') THEN
            v_is_admin := true;
        END IF;
    END IF;

    IF NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos de administrador');
    END IF;

    INSERT INTO public.platform_settings (key, value, updated_at)
    VALUES (p_key, p_value, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    RETURN jsonb_build_object('success', true);
END;
$$;
