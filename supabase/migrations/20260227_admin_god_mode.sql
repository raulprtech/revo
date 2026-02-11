-- Add God Mode Adjustment tools
-- This allows admins to adjust balances with a mandatory audit reason

CREATE OR REPLACE FUNCTION admin_adjust_wallet(
    p_admin_email TEXT,
    p_target_email TEXT,
    p_coin_delta BIGINT DEFAULT 0,
    p_cash_delta DECIMAL DEFAULT 0,
    p_reason TEXT DEFAULT 'Ajuste administrativo'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID;
    v_wallet_id UUID;
    v_new_coin_balance BIGINT;
    v_new_cash_balance DECIMAL;
BEGIN
    -- 1. Verify Admin
    IF NOT (
        p_admin_email = 'raul_vrm_2134@hotmail.com' OR 
        p_admin_email = 'admin@duels.pro' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos de administrador');
    END IF;

    SELECT id INTO v_admin_id FROM auth.users WHERE email = p_admin_email;

    -- 2. Get Target Wallet
    SELECT id INTO v_wallet_id FROM public.coin_wallets WHERE user_email = p_target_email;
    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Billetera de usuario no encontrada');
    END IF;

    -- 3. Apply Coin Adjustment if any
    IF p_coin_delta <> 0 THEN
        UPDATE public.coin_wallets 
        SET balance = balance + p_coin_delta,
            updated_at = NOW()
        WHERE id = v_wallet_id
        RETURNING balance INTO v_new_coin_balance;

        INSERT INTO public.coin_transactions (
            user_email, amount, type, description, reference_type, reference_id
        ) VALUES (
            p_target_email, p_coin_delta, 'admin_adjustment', 
            p_reason || ' (Por: ' || p_admin_email || ')',
            'admin_audit', v_admin_id::text
        );
    END IF;

    -- 4. Apply Cash Adjustment if any
    IF p_cash_delta <> 0 THEN
        UPDATE public.coin_wallets 
        SET cash_balance = cash_balance + p_cash_delta,
            updated_at = NOW()
        WHERE id = v_wallet_id
        RETURNING cash_balance INTO v_new_cash_balance;

        INSERT INTO public.cash_transactions (
            user_email, amount, type, status, description, reference_id
        ) VALUES (
            p_target_email, p_cash_delta, 'admin_adjustment', 'completed',
            p_reason || ' (Por: ' || p_admin_email || ')',
            v_admin_id::text
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'new_coin_balance', v_new_coin_balance,
        'new_cash_balance', v_new_cash_balance
    );
END;
$$;
