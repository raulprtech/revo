-- Migration: Admin Testing Enhancements
-- Description: Plus status for ghosts/tournaments and feature overrides for alpha/beta testing

-- 1. Add Plus support to Tournaments
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS is_plus BOOLEAN DEFAULT false;

-- 2. Add Feature Overrides to Profiles (for Alpha/Beta testing)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS feature_overrides JSONB DEFAULT '[]'::jsonb;

-- 3. Function to upgrade any User/Ghost to Plus (Internal use)
CREATE OR REPLACE FUNCTION admin_set_user_plus(
    p_admin_email TEXT,
    p_target_email TEXT,
    p_is_plus BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Security Check
    IF NOT (p_admin_email = 'raul_vrm_2134@hotmail.com') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_is_plus THEN
        -- Insert or Update subscription to Plus
        INSERT INTO public.subscriptions (user_email, plan, status, created_at)
        VALUES (p_target_email, 'plus', 'active', NOW())
        ON CONFLICT (user_email) WHERE status IN ('active', 'trialing')
        DO UPDATE SET plan = 'plus', status = 'active', updated_at = NOW();
    ELSE
        UPDATE public.subscriptions 
        SET plan = 'community', updated_at = NOW()
        WHERE user_email = p_target_email;
    END IF;

    RETURN jsonb_build_object('success', true, 'email', p_target_email, 'plan', CASE WHEN p_is_plus THEN 'plus' ELSE 'community' END);
END;
$$;

-- 4. Function to upgrade Tournament to Plus
CREATE OR REPLACE FUNCTION admin_set_tournament_plus(
    p_admin_email TEXT,
    p_tournament_id UUID,
    p_is_plus BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Security Check
    IF NOT (p_admin_email = 'raul_vrm_2134@hotmail.com') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.tournaments 
    SET is_plus = p_is_plus, updated_at = NOW()
    WHERE id = p_tournament_id;

    RETURN jsonb_build_object('success', true, 'tournament_id', p_tournament_id, 'is_plus', p_is_plus);
END;
$$;

-- 5. Function to manage Selective Feature Overrides
CREATE OR REPLACE FUNCTION admin_set_feature_override(
    p_admin_email TEXT,
    p_target_email TEXT,
    p_features JSONB -- Expecting array of strings like ["ai_arbitration", "custom_branding"]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Security Check
    IF NOT (p_admin_email = 'raul_vrm_2134@hotmail.com') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.profiles 
    SET feature_overrides = p_features, updated_at = NOW()
    WHERE email = p_target_email;

    RETURN jsonb_build_object('success', true, 'email', p_target_email, 'features', p_features);
END;
$$;
