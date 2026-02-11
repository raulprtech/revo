-- Migration: Dual Wallet System (Cash & Coins)
-- =============================================

-- 1. Extend coin_wallets with Cash balance
-- Duels Cash (Saldo Retirable) vs Duels Coins (Saldo de Uso)
ALTER TABLE public.coin_wallets 
ADD COLUMN IF NOT EXISTS cash_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (cash_balance >= 0),
ADD COLUMN IF NOT EXISTS lifetime_cash_earned DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS lifetime_cash_withdrawn DECIMAL(12, 2) NOT NULL DEFAULT 0.00;

-- 2. Create Cash Transactions table
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL, -- positive = credit, negative = debit
    balance_after DECIMAL(12, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'prize_payout',       -- Winner of tournament
        'organizer_earnings',  -- Organizer net profit
        'cash_withdrawal',     -- Withdrawal to bank
        'conversion_to_coins', -- Converting cash to coins (Option B)
        'admin_adjustment'     -- Manual correction
    )),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    description TEXT,
    reference_id TEXT, -- tournament_id, withdrawal_id, etc.
    reference_type TEXT, -- 'tournament', 'withdrawal'
    fee_amount DECIMAL(12, 2) DEFAULT 0.00, -- Processing fee (fixed or %)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_tx_email ON public.cash_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_cash_tx_created ON public.cash_transactions(created_at DESC);

-- 3. RLS for Cash Transactions
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cash transactions" ON public.cash_transactions;
CREATE POLICY "Users can view own cash transactions" ON public.cash_transactions
    FOR SELECT USING (user_email = auth.jwt() ->> 'email');

-- 4. Secure RPC for Cash-to-Coins Conversion (Option B)
-- Requirement: $1 MXN = 5 Coins + 10% Bonus (Aligned with 100 Coins = $20 MXN)
CREATE OR REPLACE FUNCTION public.convert_cash_to_coins(
    p_user_email TEXT,
    p_cash_amount DECIMAL(12, 2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_cash DECIMAL(12, 2);
    v_coin_amount INTEGER;
    v_bonus_multiplier DECIMAL := 1.10; -- 10% Extra
    v_exchange_rate INTEGER := 5; -- 1 MXN = 5 Coins (Base: 100 DC = $20 MXN)
    v_res_coins JSONB;
BEGIN
    -- Get current cash
    SELECT cash_balance INTO v_current_cash
    FROM public.coin_wallets
    WHERE user_email = p_user_email
    FOR UPDATE;

    IF v_current_cash < p_cash_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Saldo de Cash insuficiente');
    END IF;

    -- Calculate coins: amount * rate * bonus
    v_coin_amount := floor(p_cash_amount * v_exchange_rate * v_bonus_multiplier);

    -- 1. Deduct Cash
    UPDATE public.coin_wallets
    SET 
        cash_balance = cash_balance - p_cash_amount,
        updated_at = NOW()
    WHERE user_email = p_user_email;

    -- 2. Record Cash Transaction
    INSERT INTO public.cash_transactions (
        user_email, amount, balance_after, type, description
    ) VALUES (
        p_user_email, -p_cash_amount, v_current_cash - p_cash_amount, 
        'conversion_to_coins', 
        format('Conversión de $%s MXN a %s Coins (+10%% Bonus)', p_cash_amount, v_coin_amount)
    );

    -- 3. Add Coins using the existing secure RPC
    SELECT public.process_coin_transaction(
        p_user_email, 
        v_coin_amount, 
        'purchase', -- Use 'purchase' as base type
        format('Reinversión de premio: +%s coins', v_coin_amount),
        NULL, NULL
    ) INTO v_res_coins;

    RETURN jsonb_build_object(
        'success', true, 
        'coins_added', v_coin_amount,
        'cash_deducted', p_cash_amount
    );
END;
$$;

-- 5. Secure RPC for Cash Payout (Prize/Organizer)
CREATE OR REPLACE FUNCTION public.payout_cash_reward(
    p_user_email TEXT,
    p_amount DECIMAL(12, 2),
    p_type TEXT, -- 'prize_payout' or 'organizer_earnings'
    p_ref_id TEXT,
    p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance DECIMAL(12, 2);
BEGIN
    UPDATE public.coin_wallets
    SET 
        cash_balance = cash_balance + p_amount,
        lifetime_cash_earned = lifetime_cash_earned + p_amount,
        updated_at = NOW()
    WHERE user_email = p_user_email
    RETURNING cash_balance INTO v_new_balance;

    INSERT INTO public.cash_transactions (
        user_email, amount, balance_after, type, reference_id, reference_type, description
    ) VALUES (
        p_user_email, p_amount, v_new_balance, p_type, p_ref_id, 'tournament', p_description
    );

    RETURN jsonb_build_object('success', true, 'new_cash_balance', v_new_balance);
END;
$$;
