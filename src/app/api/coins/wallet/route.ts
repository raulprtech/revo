import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/coins/wallet — Get current user wallet
 * POST /api/coins/wallet — Perform wallet operations
 *   Body: { action: 'claim_daily' | 'reward' | 'spend', ... }
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

async function getUserEmail(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const supabase = getServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.email || null;
}

export async function GET(request: NextRequest) {
  try {
    const email = await getUserEmail(request);
    if (!email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = getServiceClient();

    // Get or create wallet
    let { data: wallet } = await supabase
      .from('coin_wallets')
      .select('*')
      .eq('user_email', email)
      .maybeSingle();

    if (!wallet) {
      const welcomeBonus = 50;
      const { data: newWallet } = await supabase
        .from('coin_wallets')
        .insert({ user_email: email, balance: welcomeBonus, lifetime_earned: welcomeBonus })
        .select()
        .single();
      wallet = newWallet;

      // Record welcome bonus transaction
      if (newWallet) {
        await supabase.from('coin_transactions').insert({
          user_email: email,
          amount: welcomeBonus,
          balance_after: welcomeBonus,
          type: 'welcome_bonus',
          description: `¡Bienvenido! +${welcomeBonus} Duels Coins de regalo`,
        });
      }
    }

    // Check daily allowance availability
    let dailyAvailable = true;
    if (wallet?.daily_allowance_claimed_at) {
      const lastClaim = new Date(wallet.daily_allowance_claimed_at);
      const now = new Date();
      dailyAvailable =
        lastClaim.getFullYear() !== now.getFullYear() ||
        lastClaim.getMonth() !== now.getMonth() ||
        lastClaim.getDate() !== now.getDate();
    }

    return NextResponse.json({ wallet, dailyAvailable });
  } catch (err) {
    console.error('Wallet GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const email = await getUserEmail(request);
    if (!email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const supabase = getServiceClient();

    // Get or create wallet
    let { data: wallet } = await supabase
      .from('coin_wallets')
      .select('*')
      .eq('user_email', email)
      .maybeSingle();

    if (!wallet) {
      const welcomeBonus = 50;
      const { data: newWallet } = await supabase
        .from('coin_wallets')
        .insert({ user_email: email, balance: welcomeBonus, lifetime_earned: welcomeBonus })
        .select()
        .single();
      wallet = newWallet;

      if (newWallet) {
        await supabase.from('coin_transactions').insert({
          user_email: email,
          amount: welcomeBonus,
          balance_after: welcomeBonus,
          type: 'welcome_bonus',
          description: `¡Bienvenido! +${welcomeBonus} Duels Coins de regalo`,
        });
      }
    }

    if (!wallet) {
      return NextResponse.json({ error: 'No se pudo crear la billetera' }, { status: 500 });
    }

    switch (action) {
      case 'claim_daily': {
        // Check eligibility
        if (wallet.daily_allowance_claimed_at) {
          const lastClaim = new Date(wallet.daily_allowance_claimed_at);
          const now = new Date();
          if (
            lastClaim.getFullYear() === now.getFullYear() &&
            lastClaim.getMonth() === now.getMonth() &&
            lastClaim.getDate() === now.getDate()
          ) {
            return NextResponse.json({ error: 'Ya reclamaste tus monedas de hoy' }, { status: 400 });
          }
        }

        const amount = 10;
        const newBalance = wallet.balance + amount;

        await supabase
          .from('coin_wallets')
          .update({
            balance: newBalance,
            lifetime_earned: wallet.lifetime_earned + amount,
            daily_allowance_claimed_at: new Date().toISOString(),
          })
          .eq('user_email', email);

        await supabase.from('coin_transactions').insert({
          user_email: email,
          amount,
          balance_after: newBalance,
          type: 'daily_allowance',
          description: `Coins del Día: +${amount} monedas`,
        });

        return NextResponse.json({
          success: true,
          balance: newBalance,
          message: `¡Has recibido ${amount} Duels Coins!`,
        });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (err) {
    console.error('Wallet POST error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
