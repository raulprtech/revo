-- Migration: Rapid Payouts with Stripe Connect
-- =============================================

-- 1. Extend profiles with Stripe metadata
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payout_setup_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preferred_payout_method TEXT DEFAULT 'bank_transfer' CHECK (preferred_payout_method IN ('bank_transfer', 'conversion_to_coins'));

-- 2. Create Payout Requests table
-- To track withdrawal requests from Duels Cash
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    fee_amount DECIMAL(12, 2) NOT NULL,
    net_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    stripe_payout_id TEXT DEFAULT NULL,
    bank_account_last4 VARCHAR(4) DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_email ON public.payout_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payout_requests(status);

-- 3. RLS for Payout Requests
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payout requests" ON public.payout_requests;
CREATE POLICY "Users can view own payout requests" ON public.payout_requests
    FOR SELECT USING (user_email = auth.jwt() ->> 'email');

-- 4. Secure RPC to request a payout
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
    v_fee DECIMAL(12, 2) := 15.00; -- Fixed fee per payout as requested
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

    v_net := p_amount - v_fee;
    
    IF v_net <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'El monto debe ser superior a la comisión de retiro ($15.00)');
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
        p_user_email, p_amount, v_fee, v_net, 'pending'
    ) RETURNING id INTO v_payout_id;

    -- 3. Record Cash Transaction (Debit)
    INSERT INTO public.cash_transactions (
        user_email, amount, balance_after, type, reference_id, reference_type, description, fee_amount
    ) VALUES (
        p_user_email, -p_amount, v_current_cash - p_amount, 
        'cash_withdrawal', 
        v_payout_id::text, 'payout_request',
        format('Retiro de fondos: -$%s MXN', p_amount),
        v_fee
    );

    RETURN jsonb_build_object('success', true, 'payout_id', v_payout_id, 'net_amount', v_net);
END;
$$;
