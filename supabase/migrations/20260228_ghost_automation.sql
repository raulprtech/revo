-- Migration: Ghost Account Automation
-- Description: Functions to simulate user actions using ghost accounts

-- 1. Function for a ghost to buy a random (or specific) item
CREATE OR REPLACE FUNCTION admin_ghost_buy_item(
    p_admin_email TEXT,
    p_ghost_email TEXT,
    p_item_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item_id UUID;
    v_item_price INTEGER;
    v_wallet_balance INTEGER;
BEGIN
    -- Security Check
    IF NOT (p_admin_email = 'raul_vrm_2134@hotmail.com') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Get item
    IF p_item_slug IS NULL THEN
        SELECT id, price INTO v_item_id, v_item_price 
        FROM public.cosmetic_items 
        WHERE is_active = true 
        ORDER BY random() LIMIT 1;
    ELSE
        SELECT id, price INTO v_item_id, v_item_price 
        FROM public.cosmetic_items 
        WHERE slug = p_item_slug;
    END IF;

    IF v_item_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No items available');
    END IF;

    -- Check balance
    SELECT balance INTO v_wallet_balance FROM public.coin_wallets WHERE user_email = p_ghost_email;
    
    IF v_wallet_balance < v_item_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds');
    END IF;

    -- Transaction
    UPDATE public.coin_wallets 
    SET balance = balance - v_item_price,
        lifetime_spent = lifetime_spent + v_item_price,
        updated_at = NOW()
    WHERE user_email = p_ghost_email;

    INSERT INTO public.user_cosmetics (user_email, item_id, purchased_at)
    VALUES (p_ghost_email, v_item_id, NOW())
    ON CONFLICT (user_email, item_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'item_id', v_item_id, 'price', v_item_price);
END;
$$;

-- 2. Function for a ghost to join a tournament
CREATE OR REPLACE FUNCTION admin_ghost_join_tournament(
    p_admin_email TEXT,
    p_ghost_email TEXT,
    p_tournament_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_nickname TEXT;
BEGIN
    -- Security Check
    IF NOT (p_admin_email = 'raul_vrm_2134@hotmail.com') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT nickname INTO v_nickname FROM public.profiles WHERE email = p_ghost_email;

    INSERT INTO public.participants (tournament_id, email, name, status, created_at)
    VALUES (p_tournament_id, p_ghost_email, v_nickname, 'Aceptado', NOW())
    ON CONFLICT (tournament_id, email) DO NOTHING;

    -- Increment participant count
    UPDATE public.tournaments 
    SET participants = (SELECT count(*) FROM public.participants WHERE tournament_id = p_tournament_id)
    WHERE id = p_tournament_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Function to simulate match reporting
CREATE OR REPLACE FUNCTION admin_ghost_report_score(
    p_admin_email TEXT,
    p_match_room_id UUID,
    p_player_email TEXT,
    p_score INTEGER
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

    UPDATE public.match_rooms 
    SET 
        p1_score = CASE WHEN player_1_email = p_player_email THEN p_score ELSE p1_score END,
        p2_score = CASE WHEN player_2_email = p_player_email THEN p_score ELSE p2_score END,
        status = 'ongoing',
        updated_at = NOW()
    WHERE id = p_match_room_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Function for a ghost to equip their best (or random) item
CREATE OR REPLACE FUNCTION admin_ghost_equip_item(
    p_admin_email TEXT,
    p_ghost_email TEXT,
    p_item_id UUID DEFAULT NULL
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

    -- Unequip current items of the same category (or all for simplicity in ghosts)
    UPDATE public.user_cosmetics 
    SET is_equipped = false 
    WHERE user_email = p_ghost_email;

    -- Equip specific or random owned item
    IF p_item_id IS NULL THEN
        UPDATE public.user_cosmetics 
        SET is_equipped = true 
        WHERE id = (
            SELECT id FROM public.user_cosmetics 
            WHERE user_email = p_ghost_email 
            ORDER BY purchased_at DESC LIMIT 1
        );
    ELSE
        UPDATE public.user_cosmetics 
        SET is_equipped = true 
        WHERE user_email = p_ghost_email AND item_id = p_item_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Function for a ghost to create a tournament
CREATE OR REPLACE FUNCTION admin_ghost_create_tournament(
    p_admin_email TEXT,
    p_ghost_email TEXT,
    p_name TEXT,
    p_game TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tournament_id UUID;
BEGIN
    -- Security Check
    IF NOT (p_admin_email = 'raul_vrm_2134@hotmail.com') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    INSERT INTO public.tournaments (
        name, 
        game, 
        max_participants, 
        start_date, 
        format, 
        registration_type, 
        owner_email
    ) VALUES (
        p_name, 
        p_game, 
        16, 
        NOW() + INTERVAL '1 day', 
        'single-elimination', 
        'public', 
        p_ghost_email
    ) RETURNING id INTO v_tournament_id;

    RETURN jsonb_build_object('success', true, 'tournament_id', v_tournament_id);
END;
$$;

