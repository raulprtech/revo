-- Migration: Ghost Accounts for System Testing
-- Description: Functions to manage test accounts and clean up testing data

-- 1. Function to create a ghost account
CREATE OR REPLACE FUNCTION admin_create_ghost_account(
    p_admin_email TEXT,
    p_nickname TEXT,
    p_initial_coins BIGINT DEFAULT 1000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ghost_id UUID;
    v_ghost_email TEXT;
BEGIN
    -- Security Check
    IF NOT (
        p_admin_email = 'raul_vrm_2134@hotmail.com' OR 
        p_admin_email = 'admin@duels.pro'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only SuperAdmins can create ghost accounts.';
    END IF;

    v_ghost_email := 'ghost_' || replace(lower(p_nickname), ' ', '_') || '_' || floor(random() * 10000) || '@duels.pro';

    -- Note: We only insert into profiles and coin_wallets as test artifacts.
    -- In a real scenario, you'd might need auth.users but for bracket testing, 
    -- profiles + wallets is usually enough for the system to "see" them.
    v_ghost_id := gen_random_uuid();

    INSERT INTO public.profiles (
        id, email, nickname, first_name, last_name, bio, created_at
    ) VALUES (
        v_ghost_id, v_ghost_email, p_nickname, 'Ghost', 'User', 'System Generated Test Account', NOW()
    );

    INSERT INTO public.coin_wallets (
        user_email, balance, updated_at
    ) VALUES (
        v_ghost_email, p_initial_coins, NOW()
    );

    -- Tag as metadata
    UPDATE public.profiles 
    set saved_custom_fields = jsonb_build_object('is_ghost', true)
    WHERE id = v_ghost_id;

    RETURN jsonb_build_object(
        'success', true, 
        'email', v_ghost_email, 
        'id', v_ghost_id
    );
END;
$$;

-- 2. Function to wipe ALL ghost data safely
CREATE OR REPLACE FUNCTION admin_wipe_ghost_data(
    p_admin_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Security Check
    IF NOT (
        p_admin_email = 'raul_vrm_2134@hotmail.com' OR 
        p_admin_email = 'admin@duels.pro'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only SuperAdmins can wipe system data.';
    END IF;

    -- Delete cascade will handle related records if foreign keys are set (wallets, transactions, tournament_participants)
    -- We filter by email domain or metadata
    DELETE FROM public.profiles 
    WHERE email LIKE 'ghost_%@duels.pro' 
    OR (saved_custom_fields->>'is_ghost')::boolean = true;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true, 
        'deleted_records', v_deleted_count
    );
END;
$$;
