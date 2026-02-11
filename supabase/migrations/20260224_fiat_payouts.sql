-- Migration: Fiat Payouts and Balance Management
-- Date: 2026-02-10

-- 1. Table for real money balances (Fiat)
CREATE TABLE IF NOT EXISTS public.fiat_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT UNIQUE NOT NULL, -- Logical reference to auth.users email
    balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    currency TEXT NOT NULL DEFAULT 'MXN',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Table for fiat transactions
CREATE TABLE IF NOT EXISTS public.fiat_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('tournament_earnings', 'prize_win', 'withdrawal', 'refund')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    description TEXT,
    reference_id TEXT, -- Tournament ID or Payout ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Table for payout requests
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'MXN',
    method TEXT NOT NULL CHECK (method IN ('stripe_connect', 'bank_transfer', 'paypal')),
    method_details JSONB NOT NULL, -- Account info, CLABE, etc.
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Update tournament_payments with fee breakdown
ALTER TABLE public.tournament_payments 
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2) DEFAULT 0;

-- RLS for Fiat Wallets
ALTER TABLE public.fiat_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fiat wallet" ON public.fiat_wallets
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- RLS for Fiat Transactions
ALTER TABLE public.fiat_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fiat transactions" ON public.fiat_transactions
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- RLS for Payout Requests
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payout requests" ON public.payout_requests
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can create own payout requests" ON public.payout_requests
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Function to process fiat earnings securely
CREATE OR REPLACE FUNCTION public.process_fiat_transaction(
    p_user_email TEXT,
    p_amount DECIMAL,
    p_type TEXT,
    p_description TEXT,
    p_reference_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated permissions to update balances
AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
BEGIN
    -- 1. Ensure wallet exists
    INSERT INTO public.fiat_wallets (user_email, balance)
    VALUES (p_user_email, 0.00)
    ON CONFLICT (user_email) DO NOTHING;

    -- 2. Get current balance with row-level lock
    SELECT balance INTO v_current_balance
    FROM public.fiat_wallets
    WHERE user_email = p_user_email
    FOR UPDATE;

    -- 3. Calculate new balance
    v_new_balance := v_current_balance + p_amount;

    -- 4. Check for insufficient funds if it's a withdrawal or negative adjustment
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Saldo insuficiente en billetera fiat.';
    END IF;

    -- 5. Update balance
    UPDATE public.fiat_wallets
    SET 
        balance = v_new_balance,
        updated_at = timezone('utc'::text, now())
    WHERE user_email = p_user_email;

    -- 6. Record transaction
    INSERT INTO public.fiat_transactions (
        user_email,
        amount,
        type,
        description,
        reference_id,
        status
    ) VALUES (
        p_user_email,
        p_amount,
        p_type,
        p_description,
        p_reference_id,
        'completed'
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
